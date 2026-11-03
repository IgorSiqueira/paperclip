/**
 * Provider-neutral tool vocabulary shared by live status, transcript rows,
 * and canonical provider activity. Exact semantic tools get purpose-specific
 * copy; ACP kinds and normalized name prefixes cover future adapters.
 */
import {
  BookOpen,
  Brain,
  ChevronsLeftRightEllipsis,
  CircleHelp,
  Clock3,
  FilePenLine,
  Image,
  ListChecks,
  MessageSquareReply,
  Network,
  Search,
  SearchCode,
  ShieldCheck,
  Terminal,
  Wrench,
} from "lucide-react";
import type { ComponentType, SVGProps } from "react";
import { McpIcon } from "./McpIcon";
import { t } from "@/i18n";

/** Lucide icons and hand-rolled SVGs (the MCP logo) share this shape. */
export type ToolIcon = ComponentType<SVGProps<SVGSVGElement>>;

export type ToolFamily =
  | "terminal"
  | "grep"
  | "search"
  | "read"
  | "edit"
  | "web"
  | "plan"
  | "question"
  | "agent"
  | "safety"
  | "image"
  | "wait"
  | "mcp"
  | "other";

export interface ToolTaxonomyEntry {
  family: ToolFamily;
  icon: ToolIcon;
  /** Progressive verb for the status pill, without the trailing ellipsis. */
  verbLabel: string;
}

export type ToolClassificationConfidence = "exact" | "kind" | "inferred" | "fallback" | "unnamed";

export interface ToolActivityPresentationInput {
  name?: string | null;
  transport?: string | null;
  namespace?: string | null;
  /** ACP kind or canonical operation. */
  operation?: string | null;
  target?: string | null;
  progress?: string | null;
}

export interface ToolSummaryGroup {
  key: string;
  singular: string;
  plural: string;
}

export interface ToolActivityPresentation {
  icon: ToolIcon;
  family: ToolFamily;
  runningLabel: string;
  completedLabel: string;
  failedLabel: string;
  interruptedLabel: string;
  displayName: string;
  sourceLabel?: string;
  technicalName?: string;
  confidence: ToolClassificationConfidence;
  summaryGroup: ToolSummaryGroup;
}

/** ACPX's placeholder title must never displace real lifecycle identity. */
const GENERIC_TOOL_NAMES = new Set(["tool", "tool call", "tool_call", "acp_tool"]);

export function isGenericToolName(name: string | undefined | null): boolean {
  const raw = (name ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s*\((?:pending|in[_ -]?progress|completed|failed|cancelled|canceled)\)$/, "");
  return !raw || GENERIC_TOOL_NAMES.has(raw);
}

interface McpIdentity {
  namespace: string;
  name: string;
}

export function mcpToolIdentity(name: string): McpIdentity | null {
  const doubleUnderscore = name.match(/^mcp__(.+?)__(.+)$/i);
  if (doubleUnderscore) return { namespace: doubleUnderscore[1], name: doubleUnderscore[2] };
  const dotted = name.match(/^mcp\.([^.]+)\.(.+)$/i);
  return dotted ? { namespace: dotted[1], name: dotted[2] } : null;
}

function identifierWords(value: string): string[] {
  return value
    .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
    .replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .trim()
    .toLowerCase()
    .split(/\s+/)
    .filter(Boolean);
}

function sentenceCase(words: readonly string[]): string {
  if (words.length === 0) return "";
  const text = words.map((word) => {
    if (["api", "id", "lsp", "mcp", "pr", "url"].includes(word)) return word.toUpperCase();
    return word;
  }).join(" ");
  return text.charAt(0).toUpperCase() + text.slice(1);
}

export function humanizeToolName(name: string | undefined | null): string {
  const raw = (name ?? "").trim();
  if (isGenericToolName(raw)) return "Unnamed tool";
  const mcp = mcpToolIdentity(raw);
  return sentenceCase(identifierWords(mcp?.name ?? raw));
}

/** Humanized MCP tool segment for both mcp__server__tool and mcp.server.tool. */
export function mcpToolSegment(name: string): string | null {
  const identity = mcpToolIdentity(name);
  return identity ? humanizeToolName(identity.name) : null;
}

type Action =
  | "read" | "list" | "search" | "fetch" | "open" | "update" | "create"
  | "delete" | "move" | "run" | "request" | "post" | "start" | "stop"
  | "wait" | "finish" | "block" | "think" | "switch" | "other";

interface ExactAction {
  action: Action;
  running?: string;
  completed?: string;
  group?: ToolSummaryGroup;
  family?: ToolFamily;
}

const group = (key: string, singular: string, plural: string): ToolSummaryGroup => ({ key, singular, plural });

const EXACT_ACTIONS: Record<string, ExactAction> = {
  bash: { action: "run" },
  terminal: { action: "run" },
  shell: { action: "run" },
  command: { action: "run" },
  run: { action: "run" },
  execute: { action: "run" },
  exec_command: { action: "run" },
  apply_patch: { action: "update", running: t("Applying a patch"), completed: t("Applied a patch") },
  read: { action: "read", running: t("Reading a file"), completed: t("Read a file") },
  write: { action: "update", running: t("Writing a file"), completed: t("Wrote a file") },
  edit: { action: "update", running: t("Editing a file"), completed: t("Edited a file") },
  notebook_read: { action: "read", running: t("Reading a notebook"), completed: t("Read a notebook") },
  notebook_edit: { action: "update", running: t("Editing a notebook"), completed: t("Edited a notebook") },
  glob: { action: "search", running: t("Searching files"), completed: t("Searched files") },
  grep: { action: "search", running: t("Searching file contents"), completed: t("Searched file contents"), family: "grep" },
  tool_search: { action: "search", running: t("Searching available tools"), completed: t("Searched available tools"), group: group("tool_search", "tool search", "tool searches") },
  web_search: { action: "search", running: t("Searching the web"), completed: t("Searched the web"), family: "web" },
  web_fetch: { action: "fetch", running: t("Fetching a web page"), completed: t("Fetched a web page"), family: "web" },
  todo_write: { action: "update", running: t("Updating the task list"), completed: t("Updated the task list"), family: "plan", group: group("task_operation", "task operation", "task operations") },
  task_create: { action: "create", running: t("Creating a task"), completed: t("Created a task"), family: "plan", group: group("task_operation", "task operation", "task operations") },
  task_update: { action: "update", running: t("Updating a task"), completed: t("Updated a task"), family: "plan", group: group("task_operation", "task operation", "task operations") },
  task_list: { action: "list", running: t("Listing tasks"), completed: t("Listed tasks"), family: "plan", group: group("task_operation", "task operation", "task operations") },
  task_get: { action: "read", running: t("Reading a task"), completed: t("Read a task"), family: "plan", group: group("task_operation", "task operation", "task operations") },
  enter_plan_mode: { action: "switch", running: t("Entering plan mode"), completed: t("Entered plan mode"), family: "plan" },
  exit_plan_mode: { action: "switch", running: t("Leaving plan mode"), completed: t("Left plan mode"), family: "plan" },
  skill: { action: "read", running: t("Loading a skill"), completed: t("Loaded a skill") },
  ask_user_question: { action: "request", running: t("Requesting input"), completed: t("Requested input"), family: "question" },
  request_human_input: { action: "request", running: t("Requesting input"), completed: t("Requested input"), family: "question", group: group("task_operation", "task operation", "task operations") },
  agent: { action: "start", running: t("Starting a subagent"), completed: t("Started a subagent"), family: "agent" },
  task: { action: "start", running: t("Starting a subagent"), completed: t("Started a subagent"), family: "agent" },
  task_output: { action: "read", running: t("Checking subagent progress"), completed: t("Checked subagent progress"), family: "agent" },
  task_stop: { action: "stop", running: t("Stopping a subagent"), completed: t("Stopped a subagent"), family: "agent" },
  send_message: { action: "post", running: t("Messaging a subagent"), completed: t("Messaged a subagent"), family: "agent" },
  spawn_agent: { action: "start", running: t("Starting a subagent"), completed: t("Started a subagent"), family: "agent" },
  wait_agent: { action: "wait", running: t("Checking subagent progress"), completed: t("Checked subagent progress"), family: "agent" },
  wait_threads: { action: "wait", running: t("Checking task progress"), completed: t("Checked task progress"), family: "agent" },
  interrupt_agent: { action: "stop", running: t("Interrupting a subagent"), completed: t("Interrupted a subagent"), family: "agent" },
  report_findings: { action: "post", running: t("Reporting findings"), completed: t("Reported findings"), family: "safety" },
  guardian_review: { action: "think", running: t("Reviewing safety"), completed: t("Reviewed safety"), family: "safety" },
  lsp: { action: "read", running: t("Inspecting code intelligence"), completed: t("Inspected code intelligence") },
  compact_conversation: { action: "think", running: t("Compacting context"), completed: t("Compacted context") },
  image_generation: { action: "create", running: t("Generating an image"), completed: t("Generated an image"), family: "image" },
  view_image: { action: "read", running: t("Viewing an image"), completed: t("Viewed an image"), family: "image" },
  multi_tool_use_parallel: { action: "run", running: t("Running tools in parallel"), completed: t("Ran tools in parallel") },
  get_task_context: { action: "read", running: t("Reading task context"), completed: t("Read task context") },
  get_task_history: { action: "read", running: t("Reading task history"), completed: t("Read task history") },
  list_documents: { action: "list", running: t("Listing documents"), completed: t("Listed documents") },
  read_document: { action: "read", running: t("Reading a document"), completed: t("Read a document") },
  list_document_revisions: { action: "list", running: t("Listing document revisions"), completed: t("Listed document revisions") },
  report_progress: { action: "post", running: t("Reporting progress"), completed: t("Reported progress") },
  answer_status_question: { action: "post", running: t("Answering a status question"), completed: t("Answered a status question") },
  write_document: { action: "update", running: t("Writing a document"), completed: t("Wrote a document") },
  register_deliverable: { action: "create", running: t("Registering a deliverable"), completed: t("Registered a deliverable") },
  finish_task: { action: "finish", running: t("Reporting completion"), completed: t("Reported completion") },
  paperclip_finish: { action: "finish", running: t("Reporting completion"), completed: t("Reported completion") },
  block_task: { action: "block", running: t("Reporting a blocker"), completed: t("Reported a blocker") },
  paperclip_block: { action: "block", running: t("Reporting a blocker"), completed: t("Reported a blocker") },
  request_review: { action: "request", running: t("Requesting review"), completed: t("Requested review") },
  list_agents: { action: "list", running: t("Listing agents"), completed: t("Listed agents") },
  get_agent: { action: "read", running: t("Reading agent details"), completed: t("Read agent details") },
  search_tasks: { action: "search", running: t("Searching tasks"), completed: t("Searched tasks") },
  list_approvals: { action: "list", running: t("Listing approvals"), completed: t("Listed approvals") },
  get_approval: { action: "read", running: t("Reading an approval"), completed: t("Read an approval") },
  get_approval_context: { action: "read", running: t("Reading approval context"), completed: t("Read approval context") },
  get_workspace_runtime: { action: "read", running: t("Reading workspace status"), completed: t("Read workspace status") },
  control_workspace_service: { action: "run", running: t("Controlling a workspace service"), completed: t("Controlled a workspace service") },
  set_dependencies: { action: "update", running: t("Updating task dependencies"), completed: t("Updated task dependencies") },
  set_task_title: { action: "update", running: t("Naming the task"), completed: t("Named the task") },
  create_task: { action: "create", running: t("Creating a task"), completed: t("Created a task") },
  request_approval: { action: "request", running: t("Requesting approval"), completed: t("Requested approval") },
  decide_approval: { action: "update", running: t("Deciding an approval"), completed: t("Decided an approval") },
  comment_on_approval: { action: "post", running: t("Commenting on an approval"), completed: t("Commented on an approval") },
  schedule_wake: { action: "create", running: t("Scheduling a wake-up"), completed: t("Scheduled a wake-up"), family: "wait" },
  generic_api_request: { action: "request", running: t("Calling the Paperclip API"), completed: t("Called the Paperclip API") },
};

const ACTION_PREFIXES: Record<Action, readonly string[]> = {
  read: ["get", "read", "inspect", "view"],
  list: ["list", "glob"],
  search: ["find", "search", "grep", "query", "lookup"],
  fetch: ["fetch", "browse"],
  open: ["open"],
  update: ["write", "edit", "update", "set", "patch", "upsert", "sync"],
  create: ["create", "add", "register", "upload"],
  delete: ["delete", "remove"],
  move: ["move", "rename"],
  run: ["run", "execute", "bash", "shell", "command"],
  request: ["request", "ask", "prompt"],
  post: ["send", "message", "comment", "report", "answer"],
  start: ["start", "spawn", "delegate"],
  stop: ["stop", "cancel", "interrupt"],
  wait: ["wait", "sleep", "poll"],
  finish: ["finish", "complete"],
  block: ["block"],
  think: ["think", "reason", "compact", "review"],
  switch: ["switch", "enter", "exit"],
  other: [],
};

const OPERATION_ACTIONS: Record<string, Action> = {
  read: "read",
  edit: "update",
  delete: "delete",
  move: "move",
  search: "search",
  list: "list",
  execute: "run",
  think: "think",
  fetch: "fetch",
  switch_mode: "switch",
};

function normalizedKey(name: string): string {
  return identifierWords(name).join("_");
}

function inferredAction(words: readonly string[]): Action | null {
  const first = words[0];
  if (!first) return null;
  for (const [action, prefixes] of Object.entries(ACTION_PREFIXES) as Array<[Action, readonly string[]]>) {
    if (prefixes.includes(first)) return action;
  }
  return null;
}

function actionFamily(action: Action): ToolFamily {
  if (action === "run") return "terminal";
  if (action === "read" || action === "list") return "read";
  if (action === "search") return "search";
  if (action === "fetch" || action === "open") return "web";
  if (["update", "create", "delete", "move"].includes(action)) return "edit";
  if (action === "request") return "question";
  if (action === "start" || action === "stop") return "agent";
  if (action === "wait") return "wait";
  return "other";
}

const FAMILY_ICONS: Record<ToolFamily, ToolIcon> = {
  terminal: Terminal,
  grep: SearchCode,
  search: Search,
  read: BookOpen,
  edit: FilePenLine,
  web: ChevronsLeftRightEllipsis,
  plan: ListChecks,
  question: CircleHelp,
  agent: Network,
  safety: ShieldCheck,
  image: Image,
  wait: Clock3,
  mcp: McpIcon,
  other: Wrench,
};

function actionCopy(action: Action, object: string | undefined): { running: string; completed: string } {
  const suffix = object ? ` ${object}` : "";
  switch (action) {
    case "read": return { running: `Reading${suffix || " data"}`, completed: `Read${suffix || " data"}` };
    case "list": return { running: `Listing${suffix || " items"}`, completed: `Listed${suffix || " items"}` };
    case "search": return { running: `Searching${suffix || ""}`, completed: `Searched${suffix || ""}` };
    case "fetch": return { running: `Fetching${suffix || " data"}`, completed: `Fetched${suffix || " data"}` };
    case "open": return { running: `Opening${suffix || " an item"}`, completed: `Opened${suffix || " an item"}` };
    case "update": return { running: `Updating${suffix || " data"}`, completed: `Updated${suffix || " data"}` };
    case "create": return { running: `Creating${suffix || " an item"}`, completed: `Created${suffix || " an item"}` };
    case "delete": return { running: `Deleting${suffix || " an item"}`, completed: `Deleted${suffix || " an item"}` };
    case "move": return { running: `Moving${suffix || " an item"}`, completed: `Moved${suffix || " an item"}` };
    case "run": return { running: t("Running a command"), completed: t("Ran a command") };
    case "request": return { running: `Requesting${suffix || " input"}`, completed: `Requested${suffix || " input"}` };
    case "post": return { running: `Posting${suffix || " an update"}`, completed: `Posted${suffix || " an update"}` };
    case "start": return { running: `Starting${suffix || " an operation"}`, completed: `Started${suffix || " an operation"}` };
    case "stop": return { running: `Stopping${suffix || " an operation"}`, completed: `Stopped${suffix || " an operation"}` };
    case "wait": return { running: "Waiting", completed: t("Finished waiting") };
    case "finish": return { running: t("Reporting completion"), completed: t("Reported completion") };
    case "block": return { running: t("Reporting a blocker"), completed: t("Reported a blocker") };
    case "think": return { running: "Thinking", completed: t("Finished thinking") };
    case "switch": return { running: `Switching${suffix || " mode"}`, completed: `Switched${suffix || " mode"}` };
    case "other": return { running: "Running", completed: "Ran" };
  }
}

function defaultSummaryGroup(action: Action): ToolSummaryGroup {
  switch (action) {
    case "run": return group("command", "command", "commands");
    case "read":
    case "list": return group("read", "read", "reads");
    case "search": return group("search", "search", "searches");
    case "update":
    case "create":
    case "delete":
    case "move": return group("file_change", "file change", "file changes");
    case "start":
    case "stop": return group("delegation", "delegation", "delegations");
    case "wait": return group("wait", "wait", "waits");
    default: return group("tool_action", "tool action", "tool actions");
  }
}

function paperclipSummaryGroup(action: Action): ToolSummaryGroup {
  if (action === "read" || action === "list") return group("paperclip_read", "Paperclip read", "Paperclip reads");
  return group("task_operation", "task operation", "task operations");
}

/**
 * Resolve one tool into status-specific copy and iconography. Precedence is:
 * exact aliases, canonical ACP operation/kind, normalized verb, then a named
 * fallback. MCP remains visible as the source icon without losing semantics.
 */
export function toolActivityPresentation(input: ToolActivityPresentationInput): ToolActivityPresentation {
  const rawName = (input.name ?? "").trim();
  const parsedMcp = mcpToolIdentity(rawName);
  const namespace = (input.namespace ?? parsedMcp?.namespace ?? "").trim();
  // The name itself is authoritative for historical ACPX records that were
  // persisted as builtin before MCP transport normalization existed.
  const transport = (parsedMcp ? "mcp" : input.transport ?? "builtin").toLowerCase();
  const semanticName = (parsedMcp?.name ?? rawName).trim();
  const words = identifierWords(semanticName);
  const key = normalizedKey(semanticName);
  const exact = EXACT_ACTIONS[key];
  const operationAction = OPERATION_ACTIONS[(input.operation ?? "").trim().toLowerCase()];
  const inferred = inferredAction(words);
  const action = exact?.action ?? operationAction ?? inferred ?? "other";
  const confidence: ToolClassificationConfidence = exact
    ? "exact"
    : operationAction
      ? "kind"
      : inferred
        ? "inferred"
        : isGenericToolName(semanticName)
          ? "unnamed"
          : "fallback";
  const displayName = isGenericToolName(semanticName) ? "Unnamed tool" : humanizeToolName(semanticName);
  const identifierLikeName = /^[A-Za-z][A-Za-z0-9_.:-]*$/.test(semanticName);
  const objectWords = inferred && identifierLikeName && words.length > 1 ? words.slice(1) : [];
  const object = objectWords.length ? sentenceCase(objectWords).replace(/^./, (letter) => letter.toLowerCase()) : undefined;
  const copy = exact?.running && exact.completed
    ? { running: exact.running, completed: exact.completed }
    : action === "other"
      ? isGenericToolName(semanticName)
        ? { running: t("Running an unnamed tool"), completed: t("Ran an unnamed tool") }
        : { running: t("Running {{displayName}}", { displayName }), completed: t("Ran {{displayName}}", { displayName }) }
      : actionCopy(action, exact ? undefined : object);
  const semanticFamily = exact?.family ?? actionFamily(action);
  const family = transport === "mcp" ? "mcp" : semanticFamily;
  const sourceLabel = namespace
    ? humanizeToolName(namespace)
    : transport === "mcp"
      ? "MCP"
      : undefined;
  const summaryGroup = namespace.toLowerCase() === "paperclip"
    ? paperclipSummaryGroup(action)
    : exact?.group ?? defaultSummaryGroup(action);

  return {
    icon: FAMILY_ICONS[family],
    family,
    runningLabel: copy.running,
    completedLabel: copy.completed,
    failedLabel: t("{{completed}} · failed", { completed: copy.completed }),
    interruptedLabel: t("{{running}} · stopped", { running: copy.running }),
    displayName,
    sourceLabel,
    technicalName: rawName || undefined,
    confidence,
    summaryGroup,
  };
}

/** Compact compatibility mapping used by legacy tool rows and live pills. */
export function toolTaxonomy(name: string | undefined | null): ToolTaxonomyEntry {
  const presentation = toolActivityPresentation({ name });
  return {
    family: presentation.family,
    icon: presentation.icon,
    verbLabel: presentation.runningLabel,
  };
}

/** Icons for tool-free informative statuses. */
export function statusLabelIcon(label: string | undefined | null): ToolIcon | null {
  const raw = (label ?? "").trim().toLowerCase();
  if (raw === "thinking") return Brain;
  if (raw === "responding" || raw.startsWith("responding (")) return MessageSquareReply;
  return null;
}
