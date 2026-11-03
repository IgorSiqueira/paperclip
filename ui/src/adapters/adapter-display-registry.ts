/**
 * Single source of truth for adapter display metadata.
 *
 * Built-in adapters have entries in `adapterDisplayMap`. External (plugin)
 * adapters get sensible defaults derived from their type string via
 * `getAdapterDisplay()`.
 */
import type { ComponentType } from "react";
import { agentHarnessType } from "@paperclipai/shared";
import {
  Bot,
  Code,
  Gem,
  Moon,
  MousePointer2,
  Sparkles,
  Terminal,
  Cpu,
} from "lucide-react";
import { OpenCodeLogoIcon } from "@/components/OpenCodeLogoIcon";
import { pendingAgentSetupDisplayAdapter } from "@/lib/agent-setup-choice";
import { t } from "@/i18n";

// ---------------------------------------------------------------------------
// Type suffix parsing
// ---------------------------------------------------------------------------

// Suffixes stripped from type ids when deriving a human-readable label for
// unknown (plugin) adapter types. "_local" is a legacy qualifier from before
// first-class Environments and is never displayed; "_gateway" is re-appended
// as " (gateway)" to disambiguate gateway variants. Known adapters in
// `adapterDisplayMap` have final labels and never get a derived suffix.
const STRIPPED_TYPE_SUFFIXES = ["_local", "_gateway"] as const;

const DISPLAY_SUFFIXES: Record<string, string> = {
  _gateway: "gateway",
};

function getTypeSuffix(type: string): string | null {
  for (const [suffix, mode] of Object.entries(DISPLAY_SUFFIXES)) {
    if (type.endsWith(suffix)) return mode;
  }
  return null;
}

function withSuffix(label: string, suffix: string | null): string {
  return suffix ? `${label} (${suffix})` : label;
}

// ---------------------------------------------------------------------------
// Display metadata per adapter type
// ---------------------------------------------------------------------------

export interface AdapterDisplayInfo {
  label: string;
  description: string;
  icon: ComponentType<{ className?: string }>;
  recommended?: boolean;
  comingSoon?: boolean;
  disabledLabel?: string;
  experimental?: boolean;
  hideFromVisualSelection?: boolean;
}

const adapterDisplayMap: Record<string, AdapterDisplayInfo> = {
  antigravity_runtime: { label: t("Google Antigravity"), description: t("Antigravity through Paperclip Runner"), icon: Gem, hideFromVisualSelection: true },
  copilot_runtime: { label: t("GitHub Copilot"), description: t("Copilot through Paperclip Runner"), icon: Code, hideFromVisualSelection: true },
  kimi_runtime: { label: t("Kimi Code (Runner)"), description: t("Kimi Code through Paperclip Runner"), icon: Moon, hideFromVisualSelection: true },
  acpx_local: {
    label: t("ACPX (retired)"),
    description: t("Retired standalone ACPX adapter"),
    icon: Bot,
    comingSoon: true,
    disabledLabel: t("Use Claude Code or Codex with the ACP engine"),
    hideFromVisualSelection: true,
  },
  claude_local: {
    label: t("Claude Code"),
    description: t("Claude Code CLI harness"),
    icon: Sparkles,
    recommended: true,
  },
  codex_local: {
    label: t("Codex"),
    description: t("Codex CLI harness"),
    icon: Code,
    recommended: true,
  },
  paperclip_runner: {
    label: t("Paperclip Runner"),
    description: t("Experimental Rust runner with a Codex provider"),
    icon: Cpu,
    experimental: true,
  },
  gemini_local: {
    label: t("Gemini CLI"),
    description: t("Gemini CLI harness"),
    icon: Gem,
  },
  grok_local: {
    label: t("Grok Build"),
    description: t("Grok Build harness"),
    icon: Bot,
  },
  kimi_local: {
    label: t("Kimi Code"),
    description: t("Kimi Code CLI harness"),
    icon: Moon,
  },
  hermes_gateway: {
    label: t("Hermes Gateway"),
    description: t("Remote Hermes API server"),
    icon: Bot,
    hideFromVisualSelection: true,
  },
  hermes_local: {
    label: t("Hermes"),
    description: t("Hermes harness"),
    icon: Bot,
  },
  opencode_local: {
    label: t("OpenCode"),
    description: t("OpenCode multi-provider harness"),
    icon: OpenCodeLogoIcon,
  },
  pi_local: {
    label: t("Pi"),
    description: t("Pi harness"),
    icon: Terminal,
  },
  cursor: {
    label: t("Cursor"),
    description: t("Cursor CLI harness"),
    icon: MousePointer2,
  },
  // Display-only choice: persisted as paperclip_runner with provider openai_dot.
  grok_bot: { label: t("Grok Bot"), experimental: true, icon: Bot, description: t("An existing external Bot in Grok") },
  openai_dot: {
    label: t("OpenAI Dot"),
    description: t("Your Dot in ChatGPT"),
    icon: Bot,
    experimental: true,
  },
  muse: {
    label: t("Muse — Personal agent"),
    description: t("Your personal Muse at muse.ai"),
    icon: Bot,
    experimental: true,
  },
  cursor_cloud: {
    label: t("Cursor Cloud"),
    description: t("Managed remote Cursor agent"),
    icon: MousePointer2,
  },
  openclaw_gateway: {
    label: t("OpenClaw Gateway"),
    description: t("External gateway adapter"),
    icon: Bot,
    comingSoon: true,
    disabledLabel: t("Invite external agents from the add-agent modal"),
    hideFromVisualSelection: true,
  },
  process: {
    label: t("Process"),
    description: t("Internal process adapter"),
    icon: Cpu,
    comingSoon: true,
  },
  http: {
    label: t("HTTP"),
    description: t("Internal HTTP adapter"),
    icon: Cpu,
    comingSoon: true,
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function humanizeType(type: string): string {
  // Strip known type suffixes so "droid_local" → "Droid", not "Droid Local"
  let base = type;
  for (const suffix of STRIPPED_TYPE_SUFFIXES) {
    if (base.endsWith(suffix)) {
      base = base.slice(0, -suffix.length);
      break;
    }
  }
  return base.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function getAdapterLabel(type: string): string {
  // Known labels are final — only unknown (plugin) types get a derived
  // suffix, so labels like "OpenClaw Gateway" don't become
  // "OpenClaw Gateway (gateway)".
  const known = adapterDisplayMap[type];
  if (known) return known.label;
  return withSuffix(humanizeType(type), getTypeSuffix(type));
}

export function getAdapterLabels(): Record<string, string> {
  const labels: Record<string, string> = {};
  for (const [type, info] of Object.entries(adapterDisplayMap)) {
    labels[type] = info.label;
  }
  return labels;
}

export function getAdapterDisplay(type: string): AdapterDisplayInfo {
  const known = adapterDisplayMap[type];
  if (known) return known;

  const suffix = getTypeSuffix(type);
  const label = withSuffix(humanizeType(type), suffix);
  return {
    label,
    description: suffix ? t("External {{suffix}} adapter", { suffix }) : t("External adapter"),
    icon: Cpu,
  };
}

export function agentDisplayAdapterType(agent: { adapterType: string; adapterConfig: Record<string, unknown>; pauseReason?: unknown; metadata?: unknown }): string {
  const pendingSetup = pendingAgentSetupDisplayAdapter(agent);
  if (pendingSetup) return pendingSetup;
  if (agent.adapterType !== "paperclip_runner") return agent.adapterType;
  if (agent.adapterConfig.provider === "openai_dot" || agent.adapterConfig.provider === "grok_bot" || agent.adapterConfig.provider === "muse") {
    return agent.adapterConfig.provider;
  }
  const harness = agentHarnessType(agent.adapterType, agent.adapterConfig);
  return ["codex_local", "claude_local", "opencode_local", "pi_local", "antigravity_runtime"].includes(harness) ? harness : agent.adapterType;
}

export function isKnownAdapterType(type: string): boolean {
  return type in adapterDisplayMap;
}
