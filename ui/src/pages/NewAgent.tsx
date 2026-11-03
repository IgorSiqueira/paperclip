import { useEffect } from "react";
import { useBreadcrumbs } from "../context/BreadcrumbContext";
import { NewAgentSetup } from "../components/new-agent/NewAgentSetup";
import { t } from "@/i18n";

export function NewAgent() {
  const { setBreadcrumbs } = useBreadcrumbs();
  useEffect(() => {
    setBreadcrumbs([
      { label: t("Agents"), href: "/agents" },
      { label: t("New agent") },
    ]);
  }, [setBreadcrumbs]);
  return <NewAgentSetup />;
}
