import type { ReactNode } from "react";
import type { ProviderFailure } from "@paperclipai/shared";
import { InlineBanner } from "./InlineBanner";
import { t } from "@/i18n";

const labels: Record<ProviderFailure["category"], string> = {
  rate_limit: t("Rate limit reached"), quota_exhausted: t("Usage allowance exhausted"),
  authentication: t("Authentication failed"), permission: t("Access denied"),
  model_unavailable: t("Model unavailable"), invalid_request: t("Request rejected"),
  overloaded: t("Provider at capacity"), timeout: t("Provider timed out"), unknown: t("Provider error"),
};

export function ProviderFailureNotice({ failure, actions, children, className }: {
  failure: ProviderFailure; actions?: ReactNode; children?: ReactNode; className?: string;
}) {
  const provider = ({ anthropic: "Claude", openai: "OpenAI" } as Record<string, string>)[failure.provider] ?? failure.provider;
  return (
    <InlineBanner tone="danger" title={`${provider}: ${labels[failure.category]}`} actions={actions} className={className}>
      <div className="flex flex-col gap-2">
        <p className="whitespace-pre-wrap break-words">{failure.message}</p>
        <p className="text-xs text-muted-foreground">
          {failure.phase === "startup" ? t("Failed before work started") : t("Failed during work")}
          {failure.httpStatus ? t(" · HTTP {{httpStatus}}", { httpStatus: failure.httpStatus }) : ""}
          {failure.providerCode ? ` · ${failure.providerCode}` : ""}
        </p>
        {failure.requestId && <p className="font-mono text-xs text-muted-foreground">{t("Request:")} {failure.requestId}</p>}
        {children}
      </div>
    </InlineBanner>
  );
}
