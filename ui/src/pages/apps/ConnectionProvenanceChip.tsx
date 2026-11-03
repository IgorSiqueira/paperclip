import { Blocks } from "lucide-react";
import { cn } from "@/lib/utils";
import { t } from "@/i18n";

export function ConnectionProvenanceChip({
  connection,
  className,
}: {
  connection: {
    config?: Record<string, unknown> | null;
    credentialSource?: string;
    externalCredential?: { connectorUid?: string } | null;
  } | null | undefined;
  className?: string;
}) {
  const chipClass = cn(
    "inline-flex items-center gap-1 rounded-full border border-border bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground",
    className,
  );
  if (connection?.credentialSource === "vercel_connect") {
    const connectorUid = connection.externalCredential?.connectorUid;
    return (
      <span
        className={chipClass}
        title={connectorUid ? t("Credentials managed by Vercel Connect ({{connectorUid}})", { connectorUid }) : t("Credentials managed by Vercel Connect")}
      >
        <Blocks className="h-3 w-3" />
        {t("via Vercel Connect")}
      </span>
    );
  }

  return null;
}
