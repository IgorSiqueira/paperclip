import { InlineBanner } from "@/components/InlineBanner";
import { webhookUrlWarningReason } from "@/lib/webhook-url-warning";
import { t } from "@/i18n";

const warnings = {
  loopback: {
    title: t("Other apps can’t reach this localhost URL"),
    message: t("This address points back to the machine sending the request. Services such as GitHub can’t use it to reach Paperclip on your computer."),
  },
  private: {
    title: t("This webhook URL appears to be private"),
    message: t("Only senders with access to this network can reach this address. Apps on the public internet, such as GitHub, usually can’t deliver webhooks here."),
  },
  tailscale: {
    title: t("This Tailscale URL may not be public"),
    message: t("Tailscale Serve is private to your tailnet, even with HTTPS. Apps outside your tailnet need Tailscale Funnel or another public HTTPS address. If Funnel is already enabled for this URL, you can continue."),
  },
  https: {
    title: t("Use HTTPS for webhooks from other apps"),
    message: t("This URL uses HTTP. Many apps require HTTPS, and HTTP does not encrypt webhook credentials or payloads."),
  },
  invalid: {
    title: t("Check the webhook URL"),
    message: t("This is not a valid HTTP or HTTPS URL. Your sending app needs a complete address it can reach."),
  },
};

export function WebhookUrlWarning({ url }: { url: string }) {
  const reason = webhookUrlWarningReason(url);
  if (!reason) return null;
  const warning = warnings[reason];
  return <InlineBanner tone="warning" title={warning.title}>
    <div className="space-y-2">
      <p>{warning.message}</p>
      <p>{t("You can continue for local or private-network use. For public senders, use a publicly reachable HTTPS URL.")}</p>
      <a className="underline underline-offset-4" href="https://docs.paperclip.ing/reference/deploy/https/" target="_blank" rel="noopener noreferrer">{t("Learn how to set up HTTPS and public access")}</a>
    </div>
  </InlineBanner>;
}
