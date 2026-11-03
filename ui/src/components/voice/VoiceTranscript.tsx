import type { VoiceTranscriptEntry } from "@/lib/voice-transcript";
import { t } from "@/i18n";

export interface VoiceTranscriptProps {
  entries: readonly VoiceTranscriptEntry[];
  agentName: string;
  unavailable?: boolean;
}

/** Announcements belong to the session controller, once per final segment. */
export function VoiceTranscript({ entries, agentName, unavailable = false }: VoiceTranscriptProps) {
  if (unavailable) return <p className="text-sm text-muted-foreground">{t("The transcript is unavailable. Your task history is still available.")}</p>;
  if (!entries.length) return <p className="text-sm text-muted-foreground">{t("Your conversation will appear here.")}</p>;
  return (
    <ol aria-label={t("Conversation transcript")} aria-live="off" className="flex min-w-0 flex-col gap-4">
      {entries.map((entry) => (
        <li key={entry.id} className="flex min-w-0 flex-col gap-1">
          <span className="text-xs font-medium text-muted-foreground break-words">
            {entry.source === "user" ? t("You") : entry.source === "application" ? t("Paperclip") : agentName}
            {!entry.final && !entry.interrupted && <span> {t("· Speaking")}</span>}
            {entry.interrupted && <span> {t("· Interrupted")}</span>}
          </span>
          <p className="whitespace-pre-wrap break-words text-sm">{entry.text}</p>
        </li>
      ))}
    </ol>
  );
}
