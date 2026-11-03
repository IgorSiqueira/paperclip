import { useQuery } from "@tanstack/react-query";
import { grokBotApi } from "@/api/grokBot";
import { Link } from "@/lib/router";
import { t } from "@/i18n";
/** Reports observed Paperclip activity; this is not a provider availability indicator. */
export function GrokBotWorkSummary({ companyId, agentId }: { companyId: string; agentId: string }) {
  const state = useQuery({ queryKey: ["grok-binding", companyId, agentId], queryFn: ({ signal }) => grokBotApi.connection(companyId, agentId, signal), retry: false, refetchInterval: 10000 });
  const data = state.data, binding = data?.binding, routine = binding?.routine;
  return <div className="space-y-2 text-sm">
    {state.error && <p role="alert" className="text-destructive">{t("Connection status could not be refreshed.")} {state.error.message}</p>}
    <p>{data?.recoveryNeeded ? t("Recovery needed") : binding?.assignment?.status === "offered" ? t("Awaiting acknowledgement") : binding?.assignment ? t("Working in Grok Bot") : routine?.verified ? t("No active Paperclip work session") : t("Connection setup incomplete")}</p>
    {data?.currentTask && <Link className="underline" to={`/issues/${data.currentTask.id}`}>{data.currentTask.identifier}: {data.currentTask.title}</Link>}
    <p className="text-muted-foreground">{t("Queued tasks:")} {data?.queuedTaskCount ?? t("Checking…")}</p>
    <p className="text-muted-foreground">{t("Last contact:")} {routine?.lastContactAt ? new Date(routine.lastContactAt).toLocaleString() : t("Not observed")}</p>
    <p className="text-xs text-muted-foreground">{t("Shows Paperclip-reported activity. Open the Grok Bot desktop app to inspect the Bot’s complete activity.")}</p>
  </div>;
}
