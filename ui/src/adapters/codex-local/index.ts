import type { UIAdapterModule } from "../types";
import { parseCodexStdoutLine } from "@paperclipai/adapter-codex-local/ui";
import { CodexLocalConfigFields, buildCodexRunnerConfig } from "./config-fields";
import { t } from "@/i18n";

export const codexLocalUIAdapter: UIAdapterModule = {
  type: "codex_local",
  label: t("Codex"),
  parseStdoutLine: parseCodexStdoutLine,
  ConfigFields: CodexLocalConfigFields,
  buildAdapterConfig: buildCodexRunnerConfig,
};
