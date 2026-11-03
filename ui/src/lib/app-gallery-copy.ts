import { t } from "@/i18n";
/**
 * Prosumer copy for the Apps surface (PAP-10856).
 *
 * The P1a gallery manifest carries developer-flavoured taglines and credential
 * labels (e.g. "Connect Zapier-hosted MCP actions", "Zapier MCP token"). Those
 * strings would fail the vocabulary gate from PAP-10827 — no "MCP", "server",
 * "profile", "policy", "gateway", or "transport" anywhere on this surface. So
 * the UI never renders the raw manifest copy directly: it looks up plain copy
 * here, and `sanitizeProsumerCopy` is a final backstop for any free-text we do
 * surface (app names, fallback taglines).
 */

/** Words that must never appear in prosumer-facing copy on the Apps surface. */
const BANNED_WORDS = [
  "mcp",
  "server",
  "profile",
  "policy",
  "gateway",
  "transport",
  "stdio",
  "endpoint",
];

const BANNED_RE = new RegExp(`\\b(${BANNED_WORDS.join("|")})s?\\b`, "gi");

/**
 * Strip banned vocabulary from a free-text string as a last-resort backstop.
 * Prefer curated copy below; this only protects against manifest text we can't
 * fully control (e.g. a newly added gallery app with no curated entry yet).
 */
export function sanitizeProsumerCopy(text: string): string {
  return text
    .replace(BANNED_RE, "")
    .replace(/\s{2,}/g, " ")
    .replace(/\s+([.,])/g, "$1")
    .trim();
}

export interface AppCopy {
  /** Two short lines for the gallery card (M2). */
  tagline: string;
  /** Single line for the connect step header (M3b). */
  short: string;
}

/**
 * Curated prosumer copy keyed by gallery key. Taken from the M-series wires
 * (https://happy-grove-jzyc.here.now/). Apps without an entry fall back to a
 * generic, gate-safe line.
 */
const APP_COPY: Record<string, AppCopy> = {
  zapier: {
    tagline: t("Reach 9,000+ apps your team already uses."),
    short: t("Reach 9,000+ apps from your agents."),
  },
  github: {
    tagline: t("Read code and pull requests, comment on issues."),
    short: t("Read code and pull requests, comment on issues."),
  },
  slack: {
    tagline: t("Send and read messages in your team's channels."),
    short: t("Send and read messages in your channels."),
  },
  notion: {
    tagline: t("Read and update pages in your workspace."),
    short: t("Read and update pages in your workspace."),
  },
  railway: {
    tagline: t("Inspect services, read logs, and manage deployments."),
    short: t("Connect Railway for deployments, logs, and container access."),
  },
  posthog: {
    tagline: t("Explore product usage, errors, flags, and experiments."),
    short: t("Sign in with PostHog. Project pinning and access controls are optional."),
  },
  ditto: {
    tagline: t("Reuse approved product copy and follow your style guide."),
    short: t("Sign in with Ditto. API keys are optional."),
  },
  gauge: {
    tagline: t("Track your brand in AI answers and run content workflows."),
    short: t("Sign in with Gauge and pick an organization. API keys are optional."),
  },
  neon: {
    tagline: t("Manage Postgres projects, branches, and queries."),
    short: t("Sign in with Neon. Project pinning and read-only mode are optional."),
  },
  superagent: {
    tagline: t("Review security findings and run red-team checks."),
    short: t("Connect with a Superagent API key. Billable and destructive tools stay under action policies."),
  },
  linear: {
    tagline: t("Create, update and read tickets."),
    short: t("Create, update and read tickets."),
  },
  "google-sheets": {
    tagline: t("Read and update selected spreadsheets."),
    short: t("Read spreadsheets or update the files you choose."),
  },
  gmail: {
    tagline: t("Read mail and create drafts for your review."),
    short: t("Read mail and create drafts for your review."),
  },
  "google-drive": {
    tagline: t("Find, read, and create files in Drive."),
    short: t("Find, read, and create files in Drive."),
  },
  "google-docs": {
    tagline: t("Read and update documents."),
    short: t("Read and update documents."),
  },
  "google-slides": {
    tagline: t("Read and update presentations."),
    short: t("Read and update presentations."),
  },
  "google-calendar": {
    tagline: t("Review calendars and manage events."),
    short: t("Review calendars and manage events."),
  },
  "google-chat": {
    tagline: t("Read conversations and send messages."),
    short: t("Read conversations and send messages."),
  },
  "google-people": {
    tagline: t("Look up contacts and people in your directory."),
    short: t("Look up contacts and people in your directory."),
  },
  "google-workspace-search": {
    tagline: t("Search across your Google workspace."),
    short: t("Search across your Google workspace."),
  },
  hubspot: {
    tagline: t("Look up contacts and update deal stages."),
    short: t("Look up contacts and update deal stages."),
  },
  intercom: {
    tagline: t("Read and reply to customer conversations."),
    short: t("Read and reply to customer conversations."),
  },
  figma: {
    tagline: t("Read files and post comments on frames."),
    short: t("Read files and post comments on frames."),
  },
  stripe: {
    tagline: t("Read customers, invoices, and payouts."),
    short: t("Read customers, invoices, and payouts."),
  },
  context7: {
    tagline: t("Look up up-to-date docs for your libraries."),
    short: t("Look up up-to-date docs for your libraries."),
  },
};

const GENERIC: AppCopy = {
  tagline: t("Give your agents access to this app."),
  short: t("Give your agents access to this app."),
};

/** Curated, gate-safe copy for a gallery app. */
export function appCopyFor(key: string, fallbackTagline?: string | null): AppCopy {
  const curated = APP_COPY[key];
  if (curated) return curated;
  if (fallbackTagline) {
    const cleaned = sanitizeProsumerCopy(fallbackTagline);
    if (cleaned) return { tagline: cleaned, short: cleaned };
  }
  return GENERIC;
}

/**
 * Label for a single credential field on the key-paste step (M3b). The raw
 * manifest label can contain banned vocab ("Zapier MCP token"), so for the
 * common single-field case we present "Your {App} key" per the wires; multi-
 * field apps fall back to a sanitized version of the manifest label.
 */
export function credentialFieldLabel(
  appName: string,
  rawLabel: string,
  fieldCount: number,
): string {
  if (/^Paste your\b/.test(rawLabel)) return sanitizeProsumerCopy(rawLabel);
  if (fieldCount <= 1) return t("Your {{appName}} key", { appName });
  const cleaned = sanitizeProsumerCopy(rawLabel);
  return cleaned || t("Your {{appName}} key", { appName });
}
