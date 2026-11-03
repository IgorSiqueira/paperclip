import {
  AlertTriangle,
  BookOpen,
  Bot,
  Box,
  Clock3,
  Database,
  FileCheck2,
  FilePenLine,
  FileText,
  GitBranch,
  Info,
  ListChecks,
  PackageCheck,
  Search,
  ShieldCheck,
  TerminalSquare,
  Users,
} from "lucide-react";
import type {
  TaskChatMaterializedResourceItem,
  TaskChatProtocolItem,
  TaskChatProviderActivityItem,
  TaskChatWorkspaceChangeItem,
  TaskChatWorkspaceFileItem,
} from "./task-chat-model";
import {
  humanizeToolName,
  isGenericToolName,
  mcpToolIdentity,
  toolActivityPresentation,
  type ToolIcon,
} from "./tool-taxonomy";
import { t } from "@/i18n";

export interface TaskChatActivityPresentation {
  icon: ToolIcon;
  runningLabel: string;
  completedLabel: string;
  failedLabel?: string;
  interruptedLabel?: string;
  detail?: string;
}

export function providerNoticeSeverity(item: TaskChatProviderActivityItem): "info" | "warning" | "error" {
  const severity = item.details.find((entry) => entry.label === "Severity")?.value;
  if (item.status === "failed" || severity === "error") return "error";
  return severity === "info" ? "info" : "warning";
}

function providerDetail(item: TaskChatProviderActivityItem, ...labels: string[]): string | undefined {
  return item.details.find((entry) => labels.includes(entry.label))?.value;
}

function meaningfulToolDetail(value: string | undefined): string | undefined {
  if (!value || isGenericToolName(value) || /^tool(?:\s+|_)call\b/i.test(value)) return undefined;
  return value;
}

export function providerActivityPresentation(item: TaskChatProviderActivityItem): TaskChatActivityPresentation {
  const detail = item.summary
    ?? providerDetail(item, "Query", "URL", "Target", "Name", "Reference", "Reason", "Summary");
  switch (item.family) {
    case "research": {
      const action = providerDetail(item, "Action")?.toLowerCase();
      if (action === "open_page") {
        return { icon: Search, runningLabel: t("Opening a web page"), completedLabel: t("Opened a web page"), failedLabel: t("Couldn’t open the web page"), interruptedLabel: t("Stopped opening the web page"), detail };
      }
      if (action === "find_in_page") {
        return { icon: Search, runningLabel: t("Searching the page"), completedLabel: t("Searched the page"), failedLabel: t("Page search failed"), interruptedLabel: t("Page search stopped"), detail };
      }
      return { icon: Search, runningLabel: t("Searching the web"), completedLabel: t("Searched the web"), failedLabel: t("Web search failed"), interruptedLabel: t("Web search stopped"), detail };
    }
    case "tool_execution": {
      const name = providerDetail(item, "Name");
      const target = providerDetail(item, "Target");
      const progress = providerDetail(item, "Progress");
      const tool = toolActivityPresentation({
        name,
        transport: providerDetail(item, "Transport"),
        namespace: providerDetail(item, "Namespace"),
        operation: providerDetail(item, "Operation"),
        target,
        progress,
      });
      const boundedActivity = meaningfulToolDetail(item.summary)
        ?? meaningfulToolDetail(progress)
        ?? meaningfulToolDetail(target);
      const activityIsIdentity = Boolean(
        boundedActivity && name && humanizeToolName(boundedActivity) === humanizeToolName(name),
      );
      const technicalName = name ? mcpToolIdentity(name)?.name ?? name : tool.displayName;
      const source = tool.sourceLabel
        ? `${tool.sourceLabel} · ${technicalName}`
        : name && !isGenericToolName(name) && humanizeToolName(name) !== tool.runningLabel.replace(/^Running /, "")
          ? name
          : undefined;
      return {
        icon: tool.icon,
        runningLabel: tool.runningLabel,
        completedLabel: tool.completedLabel,
        failedLabel: tool.failedLabel,
        interruptedLabel: tool.interruptedLabel,
        detail: [activityIsIdentity ? undefined : boundedActivity, source].filter(Boolean).join(" · ") || undefined,
      };
    }
    case "plan":
      return { icon: ListChecks, runningLabel: t("Updating the plan"), completedLabel: t("Updated the plan"), failedLabel: t("Plan update failed"), interruptedLabel: t("Plan update stopped"), detail };
    case "delegation": {
      const action = providerDetail(item, "Action")?.toLowerCase();
      if (action === "message") return { icon: Users, runningLabel: t("Messaging a subagent"), completedLabel: t("Messaged a subagent"), failedLabel: t("Subagent message failed"), interruptedLabel: t("Subagent message stopped"), detail };
      if (action === "resume") return { icon: Users, runningLabel: t("Resuming a subagent"), completedLabel: t("Resumed a subagent"), failedLabel: t("Couldn’t resume the subagent"), interruptedLabel: t("Subagent resume stopped"), detail };
      if (action === "close") return { icon: Users, runningLabel: t("Closing a subagent"), completedLabel: t("Closed a subagent"), failedLabel: t("Couldn’t close the subagent"), interruptedLabel: t("Subagent close stopped"), detail };
      if (action === "wait") return { icon: Users, runningLabel: t("Waiting for subagents"), completedLabel: t("Finished waiting for subagents"), failedLabel: t("Subagent wait failed"), interruptedLabel: t("Stopped waiting for subagents"), detail };
      return { icon: Users, runningLabel: t("Starting a subagent"), completedLabel: t("Started a subagent"), failedLabel: t("Subagent start failed"), interruptedLabel: t("Subagent start stopped"), detail };
    }
    case "model_identity":
      return item.eventType === "model.route.changed"
        ? { icon: Bot, runningLabel: t("Switching models"), completedLabel: t("Switched models"), failedLabel: t("Model switch failed"), interruptedLabel: t("Model switch stopped"), detail }
        : { icon: Bot, runningLabel: t("Verifying the model"), completedLabel: t("Verified the model"), failedLabel: t("Model verification failed"), interruptedLabel: t("Model verification stopped"), detail };
    case "context":
      return { icon: Database, runningLabel: t("Compacting context"), completedLabel: t("Compacted context"), failedLabel: t("Context compaction failed"), interruptedLabel: t("Context compaction stopped"), detail };
    case "artifact": {
      const viewed = item.eventType === "artifact.viewed";
      return viewed
        ? { icon: Box, runningLabel: t("Viewing an artifact"), completedLabel: t("Viewed an artifact"), failedLabel: t("Couldn’t view the artifact"), interruptedLabel: t("Artifact view stopped"), detail }
        : { icon: Box, runningLabel: t("Generating an artifact"), completedLabel: t("Generated an artifact"), failedLabel: t("Artifact generation failed"), interruptedLabel: t("Artifact generation stopped"), detail };
    }
    case "review": {
      const state = providerDetail(item, "State")?.toLowerCase();
      return state === "exited"
        ? { icon: FileCheck2, runningLabel: t("Leaving review mode"), completedLabel: t("Left review mode"), failedLabel: t("Couldn’t leave review mode"), interruptedLabel: t("Review-mode change stopped"), detail }
        : { icon: FileCheck2, runningLabel: t("Entering review mode"), completedLabel: t("Entered review mode"), failedLabel: t("Couldn’t enter review mode"), interruptedLabel: t("Review-mode change stopped"), detail };
    }
    case "hook":
      return { icon: GitBranch, runningLabel: t("Running a hook"), completedLabel: t("Ran a hook"), failedLabel: t("Hook failed"), interruptedLabel: t("Hook stopped"), detail };
    case "memory":
      return { icon: BookOpen, runningLabel: t("Checking memory"), completedLabel: t("Referenced memory"), failedLabel: t("Memory lookup failed"), interruptedLabel: t("Memory lookup stopped"), detail };
    case "safety":
      return { icon: ShieldCheck, runningLabel: t("Reviewing safety"), completedLabel: t("Reviewed safety"), failedLabel: t("Safety review failed"), interruptedLabel: t("Safety review stopped"), detail };
    case "terminal":
      return { icon: TerminalSquare, runningLabel: t("Sending terminal input"), completedLabel: t("Sent terminal input"), failedLabel: t("Terminal input failed"), interruptedLabel: t("Terminal input stopped"), detail };
    case "wait":
      return { icon: Clock3, runningLabel: "Waiting", completedLabel: t("Finished waiting"), failedLabel: t("Wait failed"), interruptedLabel: t("Wait stopped"), detail };
    case "provider_notice":
      return { icon: providerNoticeSeverity(item) === "info" ? Info : AlertTriangle, runningLabel: t("Provider notice"), completedLabel: t("Provider notice"), failedLabel: t("Provider error"), interruptedLabel: t("Provider notice"), detail };
  }
}

function workspaceChangePresentation(item: TaskChatWorkspaceChangeItem): TaskChatActivityPresentation {
  const count = item.totals.files || item.files.length;
  const detail = count > 0 ? `${count} ${count === 1 ? "file" : "files"}` : undefined;
  return { icon: FilePenLine, runningLabel: t("Editing files"), completedLabel: t("Edited files"), detail };
}

function workspaceFilePresentation(item: TaskChatWorkspaceFileItem): TaskChatActivityPresentation {
  return {
    icon: FileText,
    runningLabel: t("Referencing a file"),
    completedLabel: t("Referenced a file"),
    detail: item.line == null ? item.path : `${item.path}:${item.line}`,
  };
}

function resourcePresentation(item: TaskChatMaterializedResourceItem): TaskChatActivityPresentation {
  return {
    icon: item.resourceKind === "document" ? FileText : PackageCheck,
    runningLabel: t("Saving a resource"),
    completedLabel: item.resourceKind === "document" ? t("Added a document") : t("Added a deliverable"),
    detail: item.title,
  };
}

export function protocolActivityPresentation(item: TaskChatProtocolItem): TaskChatActivityPresentation | null {
  switch (item.surface) {
    case "provider_activity": return providerActivityPresentation(item);
    case "workspace_change": return workspaceChangePresentation(item);
    case "workspace_file": return workspaceFilePresentation(item);
    case "resource": return resourcePresentation(item);
    case "runtime_request":
    case "run_result":
    case "run_terminal":
      return null;
  }
}

export function protocolActivityIsRunning(item: TaskChatProtocolItem): boolean {
  if (item.surface === "provider_activity") return item.status === "running";
  if (item.surface === "workspace_change") return !item.complete;
  return false;
}

export function protocolActivityLabel(item: TaskChatProtocolItem, presentation: TaskChatActivityPresentation): string {
  if (item.surface !== "provider_activity") {
    return protocolActivityIsRunning(item) ? presentation.runningLabel : presentation.completedLabel;
  }
  if (item.status === "failed") return presentation.failedLabel ?? t("{{completedLabel}} · failed", { completedLabel: presentation.completedLabel });
  if (item.status === "interrupted") return presentation.interruptedLabel ?? t("{{completedLabel}} · interrupted", { completedLabel: presentation.completedLabel });
  return item.status === "running" ? presentation.runningLabel : presentation.completedLabel;
}
