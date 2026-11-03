import fs from "node:fs";
import path from "node:path";
import {
  type AstNode,
  UI_SRC,
  isExcludedFile,
  cleanJsxText,
  collectTranslationKeys,
  decodeJsxEntities,
  hasUnknownEntity,
  isNode,
  lineIndex,
  lineOf,
  listSourceFiles,
  looksLikeText,
  countLetters,
  stripPlaceholders,
  parseSource,
  placeholderName,
  relativeFile,
  unwrapExpression,
  walk,
} from "./i18n-lib";

const DISPLAY_ATTRIBUTES = new Set([
  "placeholder", "title", "aria-label", "ariaLabel", "alt", "label", "description", "message", "emptyMessage",
  "searchPlaceholder", "hint", "help", "helperText", "tooltip", "subtitle", "heading", "footnote", "eyebrow", "body",
  "noneLabel", "allLabel", "emptyLabel", "badgeLabel", "triggerLabel", "copiedLabel", "loadingMessage", "confirmLabel",
  "cancelLabel", "disabledHint", "detail", "reason", "mobileTitle", "inviteMessage", "error", "runLabel",
  "expiresInLabel", "composerDisabledReason", "emptyTitle", "emptyDescription", "successMessage", "errorMessage",
  "submitLabel", "actionLabel", "caption", "summary", "action", "markdown", "shortLabel", "buttonLabel",
  "addLabel", "removeLabel", "saveLabel", "closeLabel", "retryLabel", "primaryLabel", "secondaryLabel", "ctaLabel",
  "fallbackLabel", "fallbackText", "emptyText", "loadingText", "helpText", "infoText", "warningText",
]);

const LENIENT_ATTRIBUTES = new Set([
  "label", "badgeLabel", "aria-label", "ariaLabel", "alt", "description", "message", "hint", "help", "subtitle",
  "heading", "emptyMessage", "noneLabel", "allLabel", "emptyLabel", "triggerLabel", "copiedLabel", "shortLabel",
]);

const DISPLAY_FUNCTION_NAME = /(label|title|text|message|description|summary|caption|hint|heading|tooltip|placeholder|copy|wording|reason|explanation)s?$/i;
const NON_DISPLAY_FUNCTION_NAME = /^(build|make|create|serialize|encode|compose|to[A-Z]|parse|normalize|resolve[A-Z]\w*(Key|Id|Path|Url|Slug)$)/;
const NON_DISPLAY_VARIABLE_NAME = /^(id|key|keys|slug|path|href|url|command|cmd|value|values|query|params|route|type|kind|status|mode|variant|className|classes|testId|name|names|field|fields|token|secret|prefix|suffix|separator|delimiter|locale|lang|code)$/i;

const OBJECT_KEYS = new Set([
  "label", "title", "description", "body", "placeholder", "message", "emptyMessage", "hint", "help", "helperText", "tooltip",
  "subtitle", "heading", "caption", "summary", "detail", "emptyLabel", "noneLabel", "allLabel", "buttonLabel",
  "actionLabel", "confirmLabel", "cancelLabel", "shortLabel", "badgeLabel", "searchPlaceholder", "emptyTitle",
  "emptyDescription", "loadingMessage", "successMessage", "errorMessage", "footnote", "eyebrow",
]);

const PAYLOAD_MARKERS = new Set([
  "companyId", "issueId", "agentId", "projectId", "goalId", "assigneeAgentId", "assigneeUserId", "priority",
  "content", "markdown", "instructions", "prompt", "format", "method", "url", "headers", "payload",
  "params", "query", "adapterType", "adapterConfig", "runtimeConfig", "metadata", "visibility", "workMode",
  "originKind", "parentId", "documentKey", "skillId", "routineId", "secretId", "environmentId",
]);

const PAYLOAD_CONTAINER_KEYS = new Set([
  "body", "payload", "data", "input", "variables", "params", "metadata", "config", "adapterConfig", "runtimeConfig",
  "request", "json", "fields", "document", "documents", "initialDocuments",
]);

const SKIP_CALLEE = /(^|\.)(mutate|mutateAsync|fetch|request|create\w*|update\w*|post\w*|put|patch|delete\w*|remove\w*|send\w*|save\w*|submit\w*|upload\w*|stringify|useState|useReducer|useRef|navigate|setSearchParams|URLSearchParams|console|log|warn|debug|info|captureException|captureMessage|assert\w*|expect|invariant)$/;

const CODE_ELEMENTS = new Set(["code", "pre", "kbd", "samp", "var", "script", "style", "Trans"]);
const COMPLEX_EXPRESSIONS = new Set([
  "JSXElement", "JSXFragment", "ArrowFunctionExpression", "FunctionExpression", "ObjectExpression", "ArrayExpression",
  "TemplateLiteral", "ClassExpression", "AssignmentExpression", "SequenceExpression", "AwaitExpression", "YieldExpression",
  "ConditionalExpression", "LogicalExpression", "BinaryExpression",
]);

const HARD_COMPLEX_EXPRESSIONS = new Set([...COMPLEX_EXPRESSIONS].filter((type) => !["ConditionalExpression", "LogicalExpression", "BinaryExpression"].includes(type)));

const TS_EXCLUDED_PATTERNS = [
  /[\\/]fixtures[\\/]/,
  /\.fixtures?\.ts$/,
  /-fixtures?\.ts$/,
  /[\\/]plugins[\\/]/,
  /(prompt|instructions?)[^\\/]*\.ts$/,
  /worker\.ts$/,
  /[\\/]main\.ts$/,
  /vite-env\.d\.ts$/,
  /[\\/]lib[\\/]vite-[^\\/]*\.ts$/,
  /aggregator-app-setup\.ts$/,
  /task-chat-states\.ts$/,
];
const TS_NON_DISPLAY_NAME = /(protocol|command|cmd|path|url|href|key|keys|id|ids|slug|route|query|sql|pattern|regex|selector|class|classes|className|style|styles|env|arg|args|token|secret|prompt|instruction|instructions|template|format|mime|type|types|kind|kinds|status|statuses|mode|modes|code|codes|icon|icons|color|colors|tone|tones|variant|variants|hash|sign|encode|storage|sort|compare|rank|score|order|index|position|offset|width|height|size|count|value|values|default|defaults|option|options|param|params|field|fields|name|names|prefix|suffix|separator|delimiter|locale|lang|version|versions|scope|scopes|tag|tags|event|events|action|actions|method|methods|header|headers|endpoint|endpoints|host|hosts|port|ports|domain|domains|email|emails|phone|number|numbers|date|dates|time|times|duration|durations|interval|intervals|cron|schedule|timezone|test|tests|spec|specs|fixture|fixtures|mock|mocks|stub|stubs)$/i;
const LABEL_MAP_NAME = /(label|title|copy|text|message|description|hint|caption|heading|summary|tooltip|placeholder|wording|explanation|string|noun|verb|phrase|effect|note|blurb|subtitle|detail)s?$/i;

type TextContext = { prose: boolean; sentence?: boolean; multiWord?: boolean };

function sentenceLike(text: string): boolean {
  const trimmed = text.trim();
  if (/^[A-Z0-9_./-]{2,}$/.test(trimmed) && !/\s/.test(trimmed)) return false;
  if (/^\{\{/.test(trimmed)) return true;
  return /^[A-Z\u00C0-\u00DC“"'(\[]/.test(trimmed);
}

function passesContext(text: string, context: TextContext): boolean {
  if (context.sentence && !sentenceLike(text)) return false;
  if (context.multiWord && !/\s/.test(stripPlaceholders(text).trim())) return false;
  return true;
}

type Edit = { start: number; end: number; replacement: string; keys: string[] };
type Skipped = { file: string; line: number; text: string; reason: string };
type Occurrence = { file: string; line: number; kind: string };

type Options = { apply: boolean; objects: boolean; vars: boolean; returns: boolean; ts: boolean; skipKeys: Set<string>; only: string | null; files: string[]; report: string; inventory: string; revert: string | null; revertExcluded: boolean };

function parseArguments(argv: string[]): Options {
  const options: Options = { apply: false, objects: false, vars: false, returns: false, ts: false, skipKeys: new Set<string>(), only: null, files: [], report: "", inventory: "", revert: null, revertExcluded: false };
  for (const argument of argv) {
    if (argument === "--apply") options.apply = true;
    else if (argument === "--objects") options.objects = true;
    else if (argument === "--vars") options.vars = true;
    else if (argument === "--returns") options.returns = true;
    else if (argument === "--ts") options.ts = true;
    else if (argument.startsWith("--skip-keys=")) options.skipKeys = new Set(JSON.parse(fs.readFileSync(argument.slice("--skip-keys=".length), "utf8")) as string[]);
    else if (argument.startsWith("--revert=")) options.revert = argument.slice("--revert=".length);
    else if (argument === "--revert-excluded") options.revertExcluded = true;
    else if (argument.startsWith("--only=")) options.only = argument.slice("--only=".length);
    else if (argument.startsWith("--report=")) options.report = argument.slice("--report=".length);
    else if (argument.startsWith("--inventory=")) options.inventory = argument.slice("--inventory=".length);
    else options.files.push(path.resolve(argument));
  }
  return options;
}

function jsxElementName(element: AstNode): string {
  const opening = element.openingElement as AstNode;
  const name = opening.name as AstNode;
  if (name.type === "JSXIdentifier") return name.name as string;
  if (name.type === "JSXMemberExpression") return `${jsxMemberName(name)}`;
  if (name.type === "JSXNamespacedName") return `${(name.namespace as AstNode).name}:${(name.name as AstNode).name}`;
  return "";
}

function jsxMemberName(node: AstNode): string {
  if (node.type === "JSXIdentifier") return node.name as string;
  if (node.type === "JSXMemberExpression") return `${jsxMemberName(node.object as AstNode)}.${(node.property as AstNode).name}`;
  return "";
}

function attributeName(attribute: AstNode): string {
  const name = attribute.name as AstNode;
  if (name.type === "JSXIdentifier") return name.name as string;
  if (name.type === "JSXNamespacedName") return `${(name.namespace as AstNode).name}:${(name.name as AstNode).name}`;
  return "";
}

function propertyKeyName(property: AstNode): string | null {
  if (property.computed) return null;
  const key = property.key as AstNode;
  if (key.type === "Identifier") return key.name as string;
  if (key.type === "Literal" && typeof key.value === "string") return key.value;
  return null;
}

function collectPatternNames(pattern: AstNode | null | undefined, into: Set<string>): void {
  if (!pattern || !isNode(pattern)) return;
  switch (pattern.type) {
    case "Identifier":
      into.add(pattern.name as string);
      return;
    case "ObjectPattern":
      for (const property of pattern.properties as AstNode[]) {
        if (property.type === "RestElement") collectPatternNames(property.argument as AstNode, into);
        else collectPatternNames(property.value as AstNode, into);
      }
      return;
    case "ArrayPattern":
      for (const element of pattern.elements as (AstNode | null)[]) collectPatternNames(element, into);
      return;
    case "AssignmentPattern":
      collectPatternNames(pattern.left as AstNode, into);
      return;
    case "RestElement":
      collectPatternNames(pattern.argument as AstNode, into);
      return;
    default:
      return;
  }
}

function collectBindings(program: AstNode): Set<string> {
  const names = new Set<string>();
  walk(program, (node) => {
    switch (node.type) {
      case "VariableDeclarator":
        collectPatternNames(node.id as AstNode, names);
        break;
      case "FunctionDeclaration":
      case "FunctionExpression":
      case "ArrowFunctionExpression":
        if (node.id) collectPatternNames(node.id as AstNode, names);
        for (const parameter of node.params as AstNode[]) collectPatternNames(parameter, names);
        break;
      case "CatchClause":
        collectPatternNames(node.param as AstNode, names);
        break;
      case "ImportSpecifier":
      case "ImportDefaultSpecifier":
      case "ImportNamespaceSpecifier":
        collectPatternNames(node.local as AstNode, names);
        break;
      case "ClassDeclaration":
        if (node.id) collectPatternNames(node.id as AstNode, names);
        break;
      default:
        break;
    }
  });
  return names;
}

function isTranslationCall(node: AstNode): boolean {
  const callee = unwrapExpression(node.callee as AstNode);
  if (callee.type === "Identifier") return callee.name === "t" || callee.name === "translate";
  if (callee.type === "MemberExpression" && !callee.computed) {
    const property = callee.property as AstNode;
    const object = unwrapExpression(callee.object as AstNode);
    return property.type === "Identifier" && property.name === "t" && object.type === "Identifier" && object.name === "i18n";
  }
  return false;
}

function calleeText(node: AstNode, source: string): string {
  return source.slice((node.callee as AstNode).start, (node.callee as AstNode).end);
}

function isConsoleCall(node: AstNode, source: string): boolean {
  return /^console\./.test(calleeText(node, source));
}

class FileRewriter {
  readonly edits: Edit[] = [];
  readonly skipped: Skipped[] = [];
  readonly occurrences = new Map<string, Occurrence[]>();
  private readonly lines: number[];
  private readonly jsxReferences = new Set<string>();
  private readonly isTs: boolean;
  tName = "t";

  constructor(
    readonly file: string,
    readonly source: string,
    readonly program: AstNode,
    readonly options: Options,
  ) {
    this.lines = lineIndex(source);
    this.isTs = file.endsWith(".ts");
  }

  line(offset: number): number {
    return lineOf(this.lines, offset);
  }

  skip(offset: number, text: string, reason: string): void {
    this.skipped.push({ file: relativeFile(this.file), line: this.line(offset), text, reason });
  }

  record(key: string, offset: number, kind: string): void {
    const list = this.occurrences.get(key) ?? [];
    list.push({ file: relativeFile(this.file), line: this.line(offset), kind });
    this.occurrences.set(key, list);
  }

  call(key: string, pairs: string[] = []): string {
    const options = pairs.length > 0 ? `, { ${pairs.join(", ")} }` : "";
    return `${this.tName}(${JSON.stringify(key)}${options})`;
  }

  run(): void {
    const bindings = collectBindings(this.program);
    const existing = this.findI18nImport();
    if (existing.localT) this.tName = existing.localT;
    else if (bindings.has("t")) this.tName = "translate";
    if (this.options.vars) this.collectJsxReferences();
    walk(this.program, (node, parents) => this.visit(node, parents));
    if (this.edits.length === 0) return;
    if (!existing.localT) this.addImport(existing.declaration);
  }

  private findI18nImport(): { declaration: AstNode | null; localT: string | null } {
    for (const statement of this.program.body as AstNode[]) {
      if (statement.type !== "ImportDeclaration") continue;
      if ((statement.source as AstNode).value !== "@/i18n") continue;
      for (const specifier of statement.specifiers as AstNode[]) {
        if (specifier.type !== "ImportSpecifier") continue;
        const imported = specifier.imported as AstNode;
        const importedName = imported.type === "Identifier" ? (imported.name as string) : (imported.value as string);
        if (importedName === "t") return { declaration: statement, localT: (specifier.local as AstNode).name as string };
      }
      return { declaration: statement, localT: null };
    }
    return { declaration: null, localT: null };
  }

  private addImport(declaration: AstNode | null): void {
    const specifier = this.tName === "t" ? "t" : `t as ${this.tName}`;
    if (declaration) {
      const specifiers = declaration.specifiers as AstNode[];
      const last = specifiers[specifiers.length - 1];
      if (last && last.type === "ImportSpecifier") {
        this.edits.push({ start: last.end, end: last.end, replacement: `, ${specifier}`, keys: [] });
        return;
      }
    }
    let position = 0;
    for (const statement of this.program.body as AstNode[]) {
      if (statement.type === "ImportDeclaration") position = statement.end;
    }
    const statement = `import { ${specifier} } from "@/i18n";`;
    const replacement = position === 0 ? `${statement}\n` : `\n${statement}`;
    this.edits.push({ start: position, end: position, replacement, keys: [] });
  }

  private collectJsxReferences(): void {
    const collect = (expression: AstNode) => {
      const node = unwrapExpression(expression);
      if (node.type === "Identifier") this.jsxReferences.add(node.name as string);
      else if (node.type === "ConditionalExpression") {
        collect(node.consequent as AstNode);
        collect(node.alternate as AstNode);
      } else if (node.type === "LogicalExpression") {
        collect(node.left as AstNode);
        collect(node.right as AstNode);
      }
    };
    walk(this.program, (node, parents) => {
      if (node.type === "JSXExpressionContainer") {
        const parent = parents[parents.length - 1];
        if (parent && (parent.type === "JSXElement" || parent.type === "JSXFragment")) collect(node.expression as AstNode);
        else if (parent && parent.type === "JSXAttribute" && DISPLAY_ATTRIBUTES.has(attributeName(parent))) collect(node.expression as AstNode);
      }
    });
  }

  private enclosingFunctionName(parents: AstNode[]): string | null {
    for (let index = parents.length - 1; index >= 0; index--) {
      const node = parents[index];
      if (node.type !== "FunctionDeclaration" && node.type !== "FunctionExpression" && node.type !== "ArrowFunctionExpression") continue;
      if (node.id && (node.id as AstNode).type === "Identifier") return (node.id as AstNode).name as string;
      const owner = parents[index - 1];
      if (owner?.type === "VariableDeclarator" && (owner.id as AstNode).type === "Identifier") return (owner.id as AstNode).name as string;
      if (owner?.type === "Property" || owner?.type === "MethodDefinition") return propertyKeyName(owner);
      return null;
    }
    return null;
  }

  private isDisplayFunctionName(name: string | null): boolean {
    return Boolean(name) && DISPLAY_FUNCTION_NAME.test(name as string) && !NON_DISPLAY_FUNCTION_NAME.test(name as string);
  }

  private isRelaxedReturnFunction(name: string | null): boolean {
    if (!name) return true;
    return !NON_DISPLAY_FUNCTION_NAME.test(name) && !TS_NON_DISPLAY_NAME.test(name);
  }

  private enclosingVariableName(parents: AstNode[]): string | null {
    for (let index = parents.length - 1; index >= 0; index--) {
      const node = parents[index];
      if (node.type === "VariableDeclarator" && (node.id as AstNode).type === "Identifier") return (node.id as AstNode).name as string;
      if (node.type === "FunctionDeclaration" || node.type === "FunctionExpression" || node.type === "ArrowFunctionExpression") return null;
    }
    return null;
  }

  private visit(node: AstNode, parents: AstNode[]): boolean | void {
    if (this.isTs && node.type === "VariableDeclarator") {
      const id = node.id as AstNode;
      if (id.type === "Identifier" && node.init) {
        const name = id.name as string;
        const init = unwrapExpression(node.init as AstNode);
        if (["Literal", "TemplateLiteral", "ConditionalExpression", "LogicalExpression", "BinaryExpression"].includes(init.type)) {
          if (this.isDisplayFunctionName(name) && !NON_DISPLAY_VARIABLE_NAME.test(name)) {
            this.extract(init, { prose: false, sentence: true }, `ts-var:${name}`);
            return;
          }
          if (!TS_NON_DISPLAY_NAME.test(name) && !NON_DISPLAY_VARIABLE_NAME.test(name)) {
            this.extract(init, { prose: false, sentence: true, multiWord: true }, `ts-var:${name}`);
            return;
          }
          return;
        }
      }
      return;
    }
    if (this.options.vars && node.type === "VariableDeclarator") {
      const id = node.id as AstNode;
      if (id.type === "Identifier" && node.init && this.jsxReferences.has(id.name as string) && !NON_DISPLAY_VARIABLE_NAME.test(id.name as string)) {
        this.extract(node.init as AstNode, { prose: false }, `var:${id.name}`);
      }
      return;
    }
    if (this.options.vars && node.type === "AssignmentExpression" && node.operator === "=") {
      const left = node.left as AstNode;
      if (left.type === "Identifier" && this.jsxReferences.has(left.name as string) && !NON_DISPLAY_VARIABLE_NAME.test(left.name as string)) {
        this.extract(node.right as AstNode, { prose: false }, `assign:${left.name}`);
      }
      return;
    }
    if (this.options.returns && node.type === "ReturnStatement" && node.argument) {
      const name = this.enclosingFunctionName(parents);
      if (this.isDisplayFunctionName(name)) this.extract(node.argument as AstNode, { prose: false }, `return:${name}`);
      else if (this.options.ts && this.isRelaxedReturnFunction(name)) this.extract(node.argument as AstNode, { prose: false, sentence: true }, `ts-return:${name}`);
      return;
    }
    if (this.options.returns && node.type === "ArrowFunctionExpression" && node.expression) {
      const name = this.enclosingFunctionName([...parents, node]);
      if (this.isDisplayFunctionName(name)) this.extract(node.body as AstNode, { prose: false }, `return:${name}`);
      else if (this.options.ts && this.isRelaxedReturnFunction(name)) this.extract(node.body as AstNode, { prose: false, sentence: true }, `ts-return:${name}`);
      return;
    }
    if (this.options.ts && node.type === "AssignmentPattern") {
      const left = node.left as AstNode;
      if (left.type === "Identifier" && this.isDisplayFunctionName(left.name as string) && !NON_DISPLAY_VARIABLE_NAME.test(left.name as string)) {
        this.extract(node.right as AstNode, { prose: false }, `default:${left.name}`);
      }
      return;
    }
    if (node.type === "CallExpression") {
      if (isTranslationCall(node) || isConsoleCall(node, this.source)) return false;
      return;
    }
    if (node.type === "JSXElement" && CODE_ELEMENTS.has(jsxElementName(node))) return false;
    if (node.type === "JSXText") {
      this.handleJsxText(node, parents);
      return;
    }
    if (node.type === "JSXAttribute") {
      this.handleAttribute(node);
      return;
    }
    if (node.type === "JSXExpressionContainer") {
      const parent = parents[parents.length - 1];
      if (parent && (parent.type === "JSXElement" || parent.type === "JSXFragment")) {
        this.extract(node.expression as AstNode, { prose: true }, "child");
      }
      return;
    }
    if (this.options.objects && node.type === "Property") {
      this.handleProperty(node, parents);
    }
  }

  private handleJsxText(node: AstNode, parents: AstNode[]): void {
    const raw = node.value as string;
    const cleaned = cleanJsxText(raw);
    const core = cleaned.trim();
    if (countLetters(core) < 2) return;
    if (hasUnknownEntity(core)) {
      this.skip(node.start, core, "unknown-entity");
      return;
    }
    const text = decodeJsxEntities(core);
    if (!looksLikeText(text, { prose: true })) {
      this.skip(node.start, text, "not-text");
      return;
    }
    const parent = parents[parents.length - 1];
    const siblings = (parent?.children as AstNode[] | undefined) ?? [];
    const hasExpressionSibling = siblings.some((sibling) => sibling.type === "JSXExpressionContainer"
      && (sibling.expression as AstNode).type !== "Literal");
    if (hasExpressionSibling) this.skip(node.start, text, "note:fragment-beside-expression");
    const prefix = raw.match(/^\s*/)?.[0] ?? "";
    const suffix = raw.match(/\s*$/)?.[0] ?? "";
    this.edits.push({ start: node.start + prefix.length, end: node.end - suffix.length, replacement: `{${this.call(text)}}`, keys: [text] });
    this.record(text, node.start, "jsx-text");
  }

  private handleAttribute(attribute: AstNode): void {
    const name = attributeName(attribute);
    if (!DISPLAY_ATTRIBUTES.has(name)) return;
    const value = attribute.value as AstNode | null;
    if (!value) return;
    if (value.type === "Literal" && typeof value.value === "string") {
      const raw = value.value;
      if (countLetters(raw) < 2) return;
      if (hasUnknownEntity(raw)) {
        this.skip(value.start, raw, "unknown-entity");
        return;
      }
      const text = decodeJsxEntities(raw);
      if (!looksLikeText(text, { prose: LENIENT_ATTRIBUTES.has(name) })) {
        this.skip(value.start, text, `attr-not-text:${name}`);
        return;
      }
      if (this.options.skipKeys.has(text)) {
        this.skip(value.start, text, "skip-list");
        return;
      }
      this.edits.push({ start: value.start, end: value.end, replacement: `{${this.call(text)}}`, keys: [text] });
      this.record(text, value.start, `attr:${name}`);
      return;
    }
    if (value.type === "JSXExpressionContainer") {
      this.extract(value.expression as AstNode, { prose: LENIENT_ATTRIBUTES.has(name) }, `attr:${name}`);
    }
  }

  private handleProperty(property: AstNode, parents: AstNode[]): void {
    if (property.kind !== "init" || property.method || property.shorthand) return;
    const name = propertyKeyName(property);
    if (!name) return;
    const generic = !OBJECT_KEYS.has(name);
    if (generic && !this.options.ts) return;
    if (generic && !this.isTs) {
      const owner = this.enclosingVariableName(parents);
      if (!owner || !LABEL_MAP_NAME.test(owner)) return;
    }
    if (generic && (TS_NON_DISPLAY_NAME.test(name) || PAYLOAD_MARKERS.has(name) || PAYLOAD_CONTAINER_KEYS.has(name))) return;
    const value = unwrapExpression(property.value as AstNode);
    if (!["Literal", "TemplateLiteral", "ConditionalExpression", "LogicalExpression", "BinaryExpression"].includes(value.type)) return;
    const object = parents[parents.length - 1];
    if (!object || object.type !== "ObjectExpression") return;
    const siblingKeys = (object.properties as AstNode[])
      .map((sibling) => (sibling.type === "Property" ? propertyKeyName(sibling) : null))
      .filter((key): key is string => key !== null);
    const literalText = value.type === "Literal" && typeof value.value === "string" ? value.value : this.source.slice(value.start, value.end);
    if (siblingKeys.some((key) => PAYLOAD_MARKERS.has(key))) {
      this.skip(value.start, literalText, `object-payload-marker:${name}`);
      return;
    }
    for (let index = parents.length - 1; index >= 0; index--) {
      const ancestor = parents[index];
      if (ancestor.type === "Property") {
        const key = propertyKeyName(ancestor);
        if (key && PAYLOAD_CONTAINER_KEYS.has(key)) {
          this.skip(value.start, literalText, `object-payload-container:${key}`);
          return;
        }
      }
      if (ancestor.type === "CallExpression") {
        const callee = calleeText(ancestor, this.source);
        if (SKIP_CALLEE.test(callee)) {
          this.skip(value.start, literalText, `object-call:${callee}`);
          return;
        }
        break;
      }
      if (ancestor.type === "JSXElement" || ancestor.type === "JSXAttribute" || ancestor.type === "ReturnStatement" || ancestor.type === "VariableDeclarator") break;
    }
    if (generic) {
      const owner = this.enclosingVariableName(parents);
      const labelMap = Boolean(owner && LABEL_MAP_NAME.test(owner));
      this.extract(property.value as AstNode, { prose: false, sentence: true, multiWord: !labelMap }, `ts-object:${name}`);
      return;
    }
    this.extract(property.value as AstNode, { prose: false }, `object:${name}`);
  }

  private extract(expression: AstNode, context: TextContext, kind: string): void {
    const node = unwrapExpression(expression);
    switch (node.type) {
      case "Literal":
        if (typeof node.value === "string") this.emitLiteral(node, node.value, context, kind);
        return;
      case "TemplateLiteral":
        this.emitTemplate(node, context, kind);
        return;
      case "ConditionalExpression":
        this.extract(node.consequent as AstNode, context, kind);
        this.extract(node.alternate as AstNode, context, kind);
        return;
      case "LogicalExpression":
        this.extract(node.left as AstNode, context, kind);
        this.extract(node.right as AstNode, context, kind);
        return;
      case "BinaryExpression":
        if (node.operator === "+") this.emitConcat(node, context, kind);
        return;
      default:
        return;
    }
  }

  private emitLiteral(node: AstNode, text: string, context: TextContext, kind: string): void {
    if (countLetters(text) < 2) return;
    if (!looksLikeText(text, context) || !passesContext(text, context)) {
      this.skip(node.start, text, `literal-not-text:${kind}`);
      return;
    }
    if (this.options.skipKeys.has(text)) {
      this.skip(node.start, text, "skip-list");
      return;
    }
    this.edits.push({ start: node.start, end: node.end, replacement: this.call(text), keys: [text] });
    this.record(text, node.start, kind);
  }

  private emitTemplate(node: AstNode, context: TextContext, kind: string): void {
    const quasis = node.quasis as AstNode[];
    const expressions = node.expressions as AstNode[];
    const cooked = quasis.map((quasi) => (quasi.value as { cooked: string | null }).cooked);
    if (cooked.some((part) => part === null)) return;
    if (countLetters(cooked.join("")) < 2) return;
    const parts: Array<string | AstNode> = [];
    cooked.forEach((part, index) => {
      if (part) parts.push(part as string);
      if (index < expressions.length) parts.push(expressions[index]);
    });
    this.emitParts(node, parts, context, kind, "template");
  }

  private emitConcat(node: AstNode, context: TextContext, kind: string): void {
    const operands: AstNode[] = [];
    const flatten = (current: AstNode) => {
      const target = unwrapExpression(current);
      if (target.type === "BinaryExpression" && target.operator === "+") {
        flatten(target.left as AstNode);
        flatten(target.right as AstNode);
      } else {
        operands.push(target);
      }
    };
    flatten(node);
    const literalText = operands
      .filter((operand) => operand.type === "Literal" && typeof operand.value === "string")
      .map((operand) => operand.value as string)
      .join("");
    if (countLetters(literalText) < 2) return;
    const parts: Array<string | AstNode> = operands.map((operand) =>
      operand.type === "Literal" && typeof operand.value === "string" ? operand.value : operand,
    );
    if (parts.some((part) => typeof part !== "string" && (part as AstNode).type === "Literal")) {
      this.skip(node.start, this.source.slice(node.start, node.end), "complex-concat");
      return;
    }
    this.emitParts(node, parts, context, kind, "concat");
  }

  private emitParts(node: AstNode, parts: Array<string | AstNode>, context: TextContext, kind: string, shape: "template" | "concat"): void {
    type Branch = { text: string | null; expression: AstNode | null };
    type Slot = { test: string; branches: [Branch, Branch] };
    const used = new Set<string>();
    const names = new Map<AstNode, string>();
    const slots = new Map<AstNode, Slot>();
    const branchOf = (expression: AstNode): Branch | null => {
      const target = unwrapExpression(expression);
      if (target.type === "Literal" && typeof target.value === "string") return { text: target.value, expression: null };
      if (HARD_COMPLEX_EXPRESSIONS.has(target.type) || target.type === "ConditionalExpression") return null;
      return { text: null, expression };
    };
    for (const part of parts) {
      if (typeof part === "string") continue;
      const target = unwrapExpression(part);
      if (target.type === "ConditionalExpression") {
        const consequent = branchOf(target.consequent as AstNode);
        const alternate = branchOf(target.alternate as AstNode);
        if (consequent && alternate && (consequent.text !== null || alternate.text !== null)) {
          const test = target.test as AstNode;
          slots.set(part, { test: this.source.slice(test.start, test.end), branches: [consequent, alternate] });
          continue;
        }
      }
      if (HARD_COMPLEX_EXPRESSIONS.has(target.type)) {
        this.skip(node.start, this.source.slice(node.start, node.end), `complex-${shape}`);
        return;
      }
    }
    if (slots.size > 2) {
      this.skip(node.start, this.source.slice(node.start, node.end), `complex-${shape}`);
      return;
    }
    const nameFor = (expression: AstNode): string => {
      let name = names.get(expression);
      if (!name) {
        name = placeholderName(expression, used);
        names.set(expression, name);
      }
      return name;
    };
    const pairFor = (expression: AstNode): string => {
      const name = nameFor(expression);
      const text = this.source.slice(expression.start, expression.end);
      return text === name ? name : `${name}: ${text}`;
    };
    const slotList = [...slots.entries()];
    const keys: string[] = [];
    const build = (choices: number[]): string => {
      let key = "";
      const pairs: string[] = [];
      for (const part of parts) {
        if (typeof part === "string") {
          key += part;
          continue;
        }
        const slot = slots.get(part);
        if (slot) {
          const branch = slot.branches[choices[slotList.findIndex(([expression]) => expression === part)]];
          if (branch.text !== null) key += branch.text;
          else {
            key += `{{${nameFor(branch.expression as AstNode)}}}`;
            pairs.push(pairFor(branch.expression as AstNode));
          }
          continue;
        }
        key += `{{${nameFor(part)}}}`;
        pairs.push(pairFor(part));
      }
      keys.push(key);
      return this.call(key, [...new Set(pairs)]);
    };
    const expand = (index: number, choices: number[]): string => {
      if (index === slotList.length) return build(choices);
      const [, slot] = slotList[index];
      return `(${slot.test} ? ${expand(index + 1, [...choices, 0])} : ${expand(index + 1, [...choices, 1])})`;
    };
    const replacement = expand(0, []);
    for (const key of keys) {
      if (!looksLikeText(key, context) || !passesContext(key, context) || countLetters(stripPlaceholders(key)) < 2) {
        this.skip(node.start, key, `${shape}-not-text:${kind}`);
        return;
      }
      if (this.options.skipKeys.has(key)) {
        this.skip(node.start, key, "skip-list");
        return;
      }
    }
    this.edits.push({ start: node.start, end: node.end, replacement, keys });
    for (const key of keys) this.record(key, node.start, kind);
  }

  output(): string {
    const sorted = [...this.edits].sort((left, right) => left.start - right.start || left.end - right.end);
    const accepted: Edit[] = [];
    let cursor = -1;
    for (const edit of sorted) {
      if (edit.start < cursor) {
        this.skip(edit.start, edit.replacement, "overlapping-edit");
        continue;
      }
      accepted.push(edit);
      cursor = Math.max(cursor, edit.end);
    }
    let result = this.source;
    for (const edit of accepted.reverse()) {
      result = result.slice(0, edit.start) + edit.replacement + result.slice(edit.end);
    }
    return result;
  }
}

function revertTranslations(file: string, source: string, program: AstNode, keys: Set<string> | null): { output: string; reverted: number } {
  const edits: Edit[] = [];
  let remaining = 0;
  walk(program, (node, parents) => {
    if (node.type !== "CallExpression" || !isTranslationCall(node)) return;
    const args = node.arguments as AstNode[];
    const first = args[0] ? unwrapExpression(args[0]) : null;
    const key = first && first.type === "Literal" && typeof first.value === "string" ? first.value : null;
    if (key === null || args.length !== 1 || (keys && !keys.has(key))) {
      remaining += 1;
      return false;
    }
    const literal = JSON.stringify(key);
    const parent = parents[parents.length - 1];
    const grandparent = parents[parents.length - 2];
    if (parent?.type === "JSXExpressionContainer" && grandparent?.type === "JSXAttribute" && !/[\n"]/.test(key)) {
      edits.push({ start: parent.start, end: parent.end, replacement: literal, keys: [] });
    } else {
      edits.push({ start: node.start, end: node.end, replacement: literal, keys: [] });
    }
    return false;
  });
  if (edits.length === 0) return { output: source, reverted: 0 };
  if (remaining === 0) {
    for (const statement of program.body as AstNode[]) {
      if (statement.type !== "ImportDeclaration" || (statement.source as AstNode).value !== "@/i18n") continue;
      const specifiers = statement.specifiers as AstNode[];
      const onlyT = specifiers.length === 1 && specifiers[0].type === "ImportSpecifier"
        && ((specifiers[0].imported as AstNode).name === "t");
      if (onlyT) {
        const end = source[statement.end] === "\n" ? statement.end + 1 : statement.end;
        edits.push({ start: statement.start, end, replacement: "", keys: [] });
      }
    }
  }
  let output = source;
  for (const edit of edits.sort((left, right) => right.start - left.start)) {
    output = output.slice(0, edit.start) + edit.replacement + output.slice(edit.end);
  }
  return { output, reverted: edits.length };
}

function runRevert(options: Options): void {
  const keys = options.revert ? new Set(JSON.parse(fs.readFileSync(options.revert, "utf8")) as string[]) : null;
  const excluded: string[] = [];
  if (options.revertExcluded) {
    const visit = (directory: string) => {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const full = path.join(directory, entry.name);
        if (entry.isDirectory()) visit(full);
        else if (/\.tsx?$/.test(full) && isExcludedFile(full) && !/\.(test|stories)\.tsx?$/.test(full)) excluded.push(full);
      }
    };
    visit(UI_SRC);
  }
  const targets = [...(keys ? listSourceFiles() : []), ...excluded];
  let files = 0;
  let reverted = 0;
  for (const file of targets) {
    const source = fs.readFileSync(file, "utf8");
    if (!/\b(t|translate)\(/.test(source)) continue;
    const program = parseSource(file, source);
    const result = revertTranslations(file, source, program, excluded.includes(file) ? null : keys);
    if (result.reverted === 0) continue;
    files += 1;
    reverted += result.reverted;
    if (options.apply) fs.writeFileSync(file, result.output);
  }
  console.log(JSON.stringify({ revertedFiles: files, revertedCalls: reverted, applied: options.apply }, null, 2));
}

function main(): void {
  const options = parseArguments(process.argv.slice(2));
  if (options.revert || options.revertExcluded) {
    runRevert(options);
    return;
  }
  const files = options.files.length > 0
    ? options.files
    : listSourceFiles(UI_SRC, options.ts ? [".tsx", ".ts"] : [".tsx"]).filter((file) => !file.endsWith(".ts") || !TS_EXCLUDED_PATTERNS.some((pattern) => pattern.test(file)));
  const selected = options.only ? files.filter((file) => file.includes(options.only as string)) : files;
  const inventory = new Map<string, { count: number; occurrences: Occurrence[] }>();
  const skipped: Skipped[] = [];
  const existingKeys = new Set<string>();
  let changedFiles = 0;
  let editCount = 0;
  for (const file of selected) {
    const source = fs.readFileSync(file, "utf8");
    let program: AstNode;
    try {
      program = parseSource(file, source);
    } catch (error) {
      skipped.push({ file: relativeFile(file), line: 0, text: String(error), reason: "parse-error" });
      continue;
    }
    for (const key of collectTranslationKeys(program, source).keys()) existingKeys.add(key);
    const rewriter = new FileRewriter(file, source, program, options);
    rewriter.run();
    skipped.push(...rewriter.skipped);
    if (rewriter.edits.length === 0) continue;
    const output = rewriter.output();
    skipped.push(...rewriter.skipped.filter((entry) => entry.reason === "overlapping-edit" && !skipped.includes(entry)));
    for (const [key, occurrences] of rewriter.occurrences) {
      const entry = inventory.get(key) ?? { count: 0, occurrences: [] };
      entry.count += occurrences.length;
      entry.occurrences.push(...occurrences.slice(0, 3));
      inventory.set(key, entry);
    }
    changedFiles += 1;
    editCount += rewriter.edits.length;
    if (options.apply && output !== source) fs.writeFileSync(file, output);
  }
  const reasons = new Map<string, number>();
  for (const entry of skipped) reasons.set(entry.reason, (reasons.get(entry.reason) ?? 0) + 1);
  const summary = {
    files: selected.length,
    changedFiles,
    edits: editCount,
    uniqueKeys: inventory.size,
    alreadyTranslatedKeys: existingKeys.size,
    applied: options.apply,
    skippedByReason: Object.fromEntries([...reasons.entries()].sort((left, right) => right[1] - left[1])),
  };
  if (options.report) {
    fs.writeFileSync(options.report, `${JSON.stringify({ summary, skipped }, null, 2)}\n`);
  }
  if (options.inventory) {
    const keys = [...inventory.entries()].sort((left, right) => right[1].count - left[1].count || left[0].localeCompare(right[0]));
    fs.writeFileSync(options.inventory, `${JSON.stringify(Object.fromEntries(keys), null, 2)}\n`);
  }
  console.log(JSON.stringify(summary, null, 2));
}

main();
