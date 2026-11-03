import type { DeploymentExposure, DeploymentMode } from "@paperclipai/shared";
import { Badge } from "@/components/ui/badge";
import { t } from "@/i18n";

export function ModeBadge({
  deploymentMode,
  deploymentExposure,
}: {
  deploymentMode?: DeploymentMode;
  deploymentExposure?: DeploymentExposure;
}) {
  if (!deploymentMode) return null;

  const label =
    deploymentMode === "local_trusted"
      ? t("Local trusted")
      : t("Authenticated {{deploymentExposure}}", { deploymentExposure: deploymentExposure ?? "private" });

  return <Badge variant="outline">{label}</Badge>;
}
