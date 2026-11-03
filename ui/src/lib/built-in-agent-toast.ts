import type { ToastInput } from "@/context/ToastContext";
import { t } from "@/i18n";

export interface BuiltInAgentPausedToastOptions {
  /** Display name of the paused built-in agent, e.g. "Briefs Agent". */
  displayName: string;
  /** Deep link to the agent page (from `agentUrl(agent)`). */
  agentHref: string;
  /** Noun for the feature item, e.g. "brief". */
  featureNoun?: string;
}

/**
 * Build the "use-while-paused" toast payload (ux-spec §5 / D9).
 *
 * `ToastAction` supports a single `href` link only, so v1 carries one
 * "View agent" link and Resume happens on the agent page. Deduped so repeated
 * feature actions don't stack duplicate toasts.
 */
export function buildBuiltInAgentPausedToast(options: BuiltInAgentPausedToastOptions): ToastInput {
  const noun = options.featureNoun ?? "item";
  return {
    dedupeKey: `built-in-agent-paused:${options.displayName}`,
    title: t("{{displayName}} is paused", { displayName: options.displayName }),
    body: t("Resume the agent to generate this {{noun}}.", { noun }),
    tone: "warn",
    action: { label: t("View agent"), href: options.agentHref },
  };
}
