import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

export function AiConnectionLegacyNotice({
  onAdopt,
  readOnly = false,
}: {
  onAdopt: () => void;
  readOnly?: boolean;
}) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border p-4">
      <h3 className="text-sm font-semibold">
        {t("Existing authentication — not managed by Connections")}
      </h3>
      <p className="text-sm text-muted-foreground">
        {t("This agent keeps its current authentication until you choose and test a managed connection. Confirm the account and who may use it before adopting.")}
      </p>
      {!readOnly && (
        <Button variant="outline" className="self-start" onClick={onAdopt}>
          {t("Choose a managed connection")}
        </Button>
      )}
    </div>
  );
}
