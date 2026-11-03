import fs from "node:fs";
import path from "node:path";
import { parseSync } from "oxc-parser";

export type AstNode = { type: string; start: number; end: number; [key: string]: unknown };

export const UI_SRC = path.resolve(process.cwd(), "ui/src");

const EXCLUDED_PATTERNS = [
  /\.test\.tsx?$/,
  /\.stories\.tsx?$/,
  /\.d\.ts$/,
  /[\\/]__tests__[\\/]/,
  /[\\/]fixtures[\\/]/,
  /[\\/]artifact-directions[\\/]/,
  /[\\/]components[\\/]design-sandbox[\\/]/,
  /[\\/]components[\\/]icons[\\/]/,
  /[\\/]pages[\\/](DesignGuide|DesignSandboxTasks|IssueChatLongThreadPerf|TaskChatLab)\.tsx$/,
  /UxLab\.tsx$/,
  /Lab\.tsx$/,
  /\.test-support\.tsx?$/,
  /-preview-main\.tsx$/,
  /[\\/]i18n[\\/]/,
  /[\\/]storybook[\\/]/,
];

export function isExcludedFile(file: string): boolean {
  return EXCLUDED_PATTERNS.some((pattern) => pattern.test(file));
}

export function listSourceFiles(root = UI_SRC, extensions = [".tsx"]): string[] {
  const files: string[] = [];
  const visit = (directory: string) => {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const full = path.join(directory, entry.name);
      if (entry.isDirectory()) {
        if (entry.name === "node_modules") continue;
        visit(full);
        continue;
      }
      if (!extensions.some((extension) => full.endsWith(extension))) continue;
      if (isExcludedFile(full)) continue;
      files.push(full);
    }
  };
  visit(root);
  return files.sort();
}

export function parseSource(file: string, source: string): AstNode {
  const result = parseSync(file, source, { sourceType: "module" });
  if (result.errors.length > 0) {
    throw new Error(`${file}: ${result.errors.map((error) => error.message).join("; ")}`);
  }
  return result.program as unknown as AstNode;
}

const SKIP_KEYS = new Set([
  "type", "start", "end", "range", "loc", "typeAnnotation", "typeParameters", "typeArguments",
  "returnType", "superTypeArguments", "implements", "decorators",
]);
const TS_EXPRESSION_WRAPPERS = new Set([
  "TSAsExpression", "TSSatisfiesExpression", "TSNonNullExpression", "TSTypeAssertion", "TSInstantiationExpression",
]);

export function isNode(value: unknown): value is AstNode {
  return Boolean(value) && typeof value === "object" && typeof (value as AstNode).type === "string";
}

export type Visitor = (node: AstNode, parents: AstNode[]) => boolean | void;

export function walk(node: unknown, visit: Visitor, parents: AstNode[] = []): void {
  if (!isNode(node)) return;
  if (node.type.startsWith("TS") && !TS_EXPRESSION_WRAPPERS.has(node.type)) return;
  if (visit(node, parents) === false) return;
  parents.push(node);
  for (const key of Object.keys(node)) {
    if (SKIP_KEYS.has(key)) continue;
    const value = node[key];
    if (Array.isArray(value)) {
      for (const child of value) walk(child, visit, parents);
    } else if (isNode(value)) {
      walk(value, visit, parents);
    }
  }
  parents.pop();
}

export function unwrapExpression(node: AstNode): AstNode {
  let current = node;
  while (
    current.type === "ParenthesizedExpression"
    || TS_EXPRESSION_WRAPPERS.has(current.type)
    || current.type === "ChainExpression"
  ) {
    current = current.expression as AstNode;
  }
  return current;
}

const NAMED_ENTITIES: Record<string, string> = {
  amp: "&", lt: "<", gt: ">", quot: '"', apos: "'", nbsp: " ",
  rarr: "→", larr: "←", uarr: "↑", darr: "↓", harr: "↔", rArr: "⇒", lArr: "⇐",
  mdash: "—", ndash: "–", hellip: "…", middot: "·", times: "×", copy: "©", reg: "®", trade: "™",
  bull: "•", laquo: "«", raquo: "»", ldquo: "“", rdquo: "”", lsquo: "‘", rsquo: "’",
  deg: "°", euro: "€", pound: "£", yen: "¥", cent: "¢", sect: "§", para: "¶", plusmn: "±", divide: "÷",
  ne: "≠", le: "≤", ge: "≥", infin: "∞", check: "✓", ensp: " ", emsp: " ", thinsp: " ",
  zwnj: "‌", zwj: "‍", shy: "­", prime: "′", Prime: "″", frac12: "½", micro: "µ",
};

export function hasUnknownEntity(text: string): boolean {
  for (const match of text.matchAll(/&([a-zA-Z][a-zA-Z0-9]*);/g)) {
    if (!(match[1] in NAMED_ENTITIES)) return true;
  }
  return false;
}

export function decodeJsxEntities(text: string): string {
  return text.replace(/&(#x[0-9a-fA-F]+|#[0-9]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body[0] === "#") {
      const code = body[1] === "x" || body[1] === "X" ? parseInt(body.slice(2), 16) : parseInt(body.slice(1), 10);
      return Number.isFinite(code) ? String.fromCodePoint(code) : whole;
    }
    return NAMED_ENTITIES[body] ?? whole;
  });
}

export function cleanJsxText(raw: string): string {
  const lines = raw.split(/\r\n|\n|\r/);
  let lastNonEmptyLine = 0;
  for (let index = 0; index < lines.length; index++) {
    if (/[^ \t]/.test(lines[index])) lastNonEmptyLine = index;
  }
  let text = "";
  for (let index = 0; index < lines.length; index++) {
    const isFirstLine = index === 0;
    const isLastLine = index === lines.length - 1;
    const isLastNonEmptyLine = index === lastNonEmptyLine;
    let trimmed = lines[index].replace(/\t/g, " ");
    if (!isFirstLine) trimmed = trimmed.replace(/^ +/, "");
    if (!isLastLine) trimmed = trimmed.replace(/ +$/, "");
    if (trimmed) {
      if (!isLastNonEmptyLine) trimmed += " ";
      text += trimmed;
    }
  }
  return text;
}

export function countLetters(text: string): number {
  return (text.match(/\p{L}/gu) ?? []).length;
}

export function stripPlaceholders(text: string): string {
  return text.replace(/\{\{[^}]*\}\}/g, "");
}

export type TextContext = { prose: boolean };

export function looksLikeText(text: string, context: TextContext): boolean {
  const stripped = stripPlaceholders(text);
  if (countLetters(stripped) < 2) return false;
  if (/^(https?:|mailto:|tel:|data:|\/|\.\.?\/|#|@|\$|--|~)/.test(text)) return false;
  if (looksLikeCodeTokens(text)) return false;
  if (/^[\w.+-]+@[\w-]+(\.[\w-]+)+$/.test(text)) return false;
  if (context.prose) return true;
  if (/\s/.test(text)) return true;
  if (/^[a-z][a-z0-9_.:/-]*$/.test(text)) return false;
  if (/^[a-z]+[A-Z][A-Za-z0-9]*$/.test(text)) return false;
  if (/[{}<>=;\\]/.test(text)) return false;
  if (/^[\w.-]+\.(tsx?|jsx?|mjs|cjs|json|md|mdx|ya?ml|css|png|svg|jpe?g|gif|txt|sh|zip|pdf)$/i.test(text)) return false;
  return true;
}

export function looksLikeCodeTokens(text: string): boolean {
  const tokens = text.trim().split(/\s+/);
  if (tokens.length < 2) return false;
  if (tokens.some((token) => /\p{Lu}/u.test(token))) return false;
  const codeLike = tokens.filter((token) => /[-:/()\\.]/.test(token)).length;
  return codeLike * 2 >= tokens.length;
}

export function placeholderName(expression: AstNode, used: Set<string>): string {
  const target = unwrapExpression(expression);
  if (target.type === "BinaryExpression" || target.type === "LogicalExpression") return placeholderName(target.left as AstNode, used);
  if (target.type === "UnaryExpression") return placeholderName(target.argument as AstNode, used);
  if (target.type === "ConditionalExpression") {
    const consequent = unwrapExpression(target.consequent as AstNode);
    return placeholderName(consequent.type === "Literal" ? (target.alternate as AstNode) : consequent, used);
  }
  let base = "value";
  if (target.type === "Identifier") {
    base = target.name as string;
  } else if (target.type === "MemberExpression") {
    const property = target.property as AstNode;
    const object = unwrapExpression(target.object as AstNode);
    if (!target.computed && property.type === "Identifier") base = property.name as string;
    else if (object.type === "Identifier") base = object.name as string;
  } else if (target.type === "CallExpression") {
    const callee = unwrapExpression(target.callee as AstNode);
    if (callee.type === "Identifier") base = callee.name as string;
    else if (callee.type === "MemberExpression" && !callee.computed && (callee.property as AstNode).type === "Identifier") {
      base = (callee.property as AstNode).name as string;
    }
  }
  base = base.replace(/[^A-Za-z0-9_]/g, "") || "value";
  if (/^[0-9]/.test(base)) base = `value${base}`;
  let name = base;
  let suffix = 2;
  while (used.has(name)) {
    name = `${base}${suffix}`;
    suffix += 1;
  }
  used.add(name);
  return name;
}

export function lineIndex(source: string): number[] {
  const starts = [0];
  for (let index = 0; index < source.length; index++) {
    if (source.charCodeAt(index) === 10) starts.push(index + 1);
  }
  return starts;
}

export function lineOf(starts: number[], offset: number): number {
  let low = 0;
  let high = starts.length - 1;
  while (low < high) {
    const middle = (low + high + 1) >> 1;
    if (starts[middle] <= offset) low = middle;
    else high = middle - 1;
  }
  return low + 1;
}

export function relativeFile(file: string): string {
  return path.relative(process.cwd(), file).split(path.sep).join("/");
}

export function collectTranslationKeys(program: AstNode, source: string): Map<string, number[]> {
  const keys = new Map<string, number[]>();
  walk(program, (node) => {
    if (node.type !== "CallExpression") return;
    const callee = unwrapExpression(node.callee as AstNode);
    const isTranslate = (callee.type === "Identifier" && (callee.name === "t" || callee.name === "translate"))
      || (callee.type === "MemberExpression" && !callee.computed
        && (callee.property as AstNode).type === "Identifier" && (callee.property as AstNode).name === "t");
    if (!isTranslate) return;
    const first = (node.arguments as AstNode[])[0];
    if (!first) return;
    const argument = unwrapExpression(first);
    let key: string | null = null;
    if (argument.type === "Literal" && typeof argument.value === "string") key = argument.value;
    else if (argument.type === "TemplateLiteral" && (argument.expressions as AstNode[]).length === 0) {
      key = ((argument.quasis as AstNode[])[0].value as { cooked: string | null }).cooked;
    }
    if (key === null) return;
    const positions = keys.get(key) ?? [];
    positions.push(node.start);
    keys.set(key, positions);
  });
  return keys;
}
