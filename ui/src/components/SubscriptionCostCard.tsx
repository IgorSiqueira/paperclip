import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { SUBSCRIPTION_CURRENCIES, centsToUsd, usdToCents, type SubscriptionAccountReport, type SubscriptionCostReport, type SubscriptionUsage } from "@paperclipai/shared";
import { subscriptionsApi } from "../api/subscriptions";
import { formatCents, formatDateTime, formatTokens, providerDisplayName } from "../lib/utils";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Card } from "./ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "./ui/dialog";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { t } from "@/i18n";

export function subscriptionMoney(cents: string, currency: string) {
  return currency === "USD" ? formatCents(Number(cents))
    : new Intl.NumberFormat(undefined, { style: "currency", currency, currencyDisplay: "code" }).format(Number(cents) / 100);
}

export function SubscriptionTokenUsage({ usage }: { usage: SubscriptionUsage }) {
  return <span className="font-mono text-xs text-muted-foreground">
    {formatTokens(usage.inputTokens + usage.cachedInputTokens)} {t("in ·")} {formatTokens(usage.outputTokens)} {t("out")}
    {usage.cachedInputTokens > 0 && <span className="block">{formatTokens(usage.cachedInputTokens)} {t("input cached")}</span>}
  </span>;
}

function SubscriptionEditor({ account, accounts, companyId, onDone }: {
  account: SubscriptionAccountReport; accounts: SubscriptionAccountReport[]; companyId: string; onDone: () => void;
}) {
  const [plan, setPlan] = useState(account.price.plan);
  const [amount, setAmount] = useState(account.price.amountCents == null ? "" : centsToUsd(account.price.amountCents).replace(/\.?0+$/, ""));
  const [currency, setCurrency] = useState(account.price.currency);
  const [cadence, setCadence] = useState(account.price.cadence);
  const [status, setStatus] = useState(account.price.status);
  const [targetId, setTargetId] = useState("");
  const save = useMutation({ mutationFn: () => subscriptionsApi.update(companyId, account.id, {
    expectedRevision: account.price.revision, plan, amountCents: amount.trim() ? usdToCents(amount.trim()) : null,
    currency: currency as typeof SUBSCRIPTION_CURRENCIES[number], cadence, status,
  }), onSuccess: onDone });
  const link = useMutation({ mutationFn: () => subscriptionsApi.link(companyId, account.id, targetId, account.price.revision,
    accounts.find(row => row.id === targetId)!.price.revision), onSuccess: onDone });
  const targets = accounts.filter(row => row.id !== account.id && row.provider === account.provider && row.canEdit);
  const busy = save.isPending || link.isPending;
  const selectClass = "h-9 rounded-md border border-input bg-background px-3 text-sm";
  return <div className="space-y-5">
    <form className="space-y-4" onSubmit={event => { event.preventDefault(); save.mutate(); }}>
      <div className="space-y-2"><Label htmlFor="subscription-plan">{t("Plan")}</Label><Input id="subscription-plan" value={plan} onChange={event => setPlan(event.target.value)} required maxLength={100} /></div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2"><Label htmlFor="subscription-price">{t("Price per billing period")}</Label><Input id="subscription-price" type="number" min="0" step="any" value={amount} placeholder={t("Unknown")} onChange={event => setAmount(event.target.value)} /></div>
        <div className="space-y-2"><Label htmlFor="subscription-currency">{t("Currency")}</Label><select id="subscription-currency" className={selectClass} value={currency} onChange={event => setCurrency(event.target.value)}>{SUBSCRIPTION_CURRENCIES.map(code => <option key={code}>{code}</option>)}</select></div>
        <div className="space-y-2"><Label htmlFor="subscription-cadence">{t("Billed")}</Label><select id="subscription-cadence" className={selectClass} value={cadence} onChange={event => setCadence(event.target.value as typeof cadence)}><option value="month">{t("Monthly")}</option><option value="year">{t("Annually")}</option></select></div>
        <div className="space-y-2"><Label htmlFor="subscription-status">{t("Tracking")}</Label><select id="subscription-status" className={selectClass} value={status} onChange={event => setStatus(event.target.value as typeof status)}><option value="active">{t("Active")}</option><option value="ended">{t("Subscription ended")}</option><option value="excluded">{t("Exclude from this organization")}</option></select></div>
      </div>
      <p className="text-xs text-muted-foreground">{t("Enter the full amount for one account or seat. Annual prices are divided by 12. Changes apply from now. Ending tracking here does not cancel your provider subscription.")}</p>
      {save.error && <p role="alert" className="text-sm text-destructive">{t("Could not save this price. Check the amount, or reopen the account if another person updated it.")}</p>}
      <div className="flex items-center justify-between"><Button type="button" variant="ghost" disabled={busy} onClick={onDone}>{t("Cancel")}</Button><Button type="submit" disabled={busy}>{save.isPending ? t("Saving…") : t("Save price")}</Button></div>
    </form>
    {targets.length > 0 && <div className="space-y-2 border-t border-border pt-4">
      <Label htmlFor="subscription-link">{t("Same subscription as another account?")}</Label>
      <select id="subscription-link" className={selectClass} value={targetId} onChange={event => setTargetId(event.target.value)}><option value="">{t("Choose an account")}</option>{targets.map(row => <option key={row.id} value={row.id}>{row.name} · {row.price.plan}</option>)}</select>
      <p className="text-xs text-muted-foreground">{t("Linking counts these accounts once, combines their Paperclip usage, and keeps the selected account’s price. Only link the same subscription or paid seat.")}</p>
      {link.error && <p role="alert" className="text-sm text-destructive">{t("Could not link these accounts. Reopen their details and try again.")}</p>}
      <Button type="button" variant="outline" disabled={!targetId || busy} onClick={() => link.mutate()}>{t("Link accounts")}</Button>
    </div>}
  </div>;
}

export function SubscriptionCostCard({ companyId, report, error, onChanged }: {
  companyId: string; report?: SubscriptionCostReport; error?: unknown; onChanged: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<SubscriptionAccountReport | null>(null);
  const closeEditor = () => { setEditing(null); onChanged(); };
  const known = report?.monthlyTotals.length;
  const estimatedCount = report?.monthlyTotals.reduce((sum, total) => sum + total.estimatedCount, 0) ?? 0;
  return <>
    <Card className="block p-4">
      <div className="text-(length:--text-micro) uppercase tracking-(--tracking-eyebrow) text-muted-foreground">{t("Subscriptions")}</div>
      <div className="mt-2 font-mono text-2xl font-semibold tabular-nums">
        {known ? report!.monthlyTotals.map(total => <div key={total.currency}>{subscriptionMoney(total.amountCents, total.currency)}<span className="text-sm font-normal">/month</span></div>) : report && report.activeCount === 0 && report.accounts.length > 0 ? "$0.00/month" : "—"}
      </div>
      <div className="mt-1 space-y-1 text-xs text-muted-foreground">
        {report ? <>
          {estimatedCount > 0 && <div><Badge variant="outline" className="font-normal text-muted-foreground">{estimatedCount < report.activeCount - report.unknownPriceCount ? t("Partially estimated") : t("Estimated")}</Badge></div>}
          {report.unknownPriceCount > 0 && !!known && <div>{t("Known monthly subtotal")}</div>}
          <div>{report.accounts.length === 0 ? t("No visible subscriptions") : <>{report.activeCount} {t("active")} {report.activeCount === 1 ? t("subscription") : t("subscriptions")}{report.unknownPriceCount > 0 && (report.unknownPriceCount === 1 ? t(" · {{unknownPriceCount}} price unknown", { unknownPriceCount: report.unknownPriceCount }) : t(" · {{unknownPriceCount}} prices unknown", { unknownPriceCount: report.unknownPriceCount }))}</>}</div>
          {report.accounts.length > 0 && <div>{t("Monthly fees for accounts visible to you")}</div>}
          {report.unidentifiedAccountCount > 0 && <div>{report.unidentifiedAccountCount} {t("unconfirmed")} {report.unidentifiedAccountCount === 1 ? t("account identity") : t("account identities")}</div>}
          <SubscriptionTokenUsage usage={report.subscription} />
        </> : error ? <div>{t("Subscription data is unavailable.")}</div> : <div>{t("Loading subscriptions…")}</div>}
        {report && error ? <div>{t("Showing last loaded subscription data.")}</div> : null}
      </div>
      <Button variant="link" size="sm" className="h-auto p-0" onClick={() => setOpen(true)} disabled={!report}>{t("View details")}</Button>
    </Card>
    <Dialog open={open} onOpenChange={value => { setOpen(value); if (!value) setEditing(null); }}>
      <DialogContent className="max-h-(--sz-80vh) overflow-y-auto sm:max-w-3xl">
        <DialogHeader><DialogTitle>{editing ? t("Subscription price") : t("Subscriptions")}</DialogTitle><DialogDescription>{t("Current monthly costs for accounts visible to you. Token totals cover company work in the selected period.")}</DialogDescription></DialogHeader>
        {editing ? <SubscriptionEditor key={editing.id} companyId={companyId} account={editing} accounts={report?.accounts ?? []} onDone={closeEditor} /> : <div className="space-y-4">
          {report?.accounts.length === 0 && <p className="text-sm text-muted-foreground">{t("No subscriptions are visible to you yet. Connect an AI account or run an agent with a connected subscription.")}</p>}
          {report?.accounts.map(account => <div key={account.id} className="space-y-2 border-b border-border pb-4 last:border-0">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div><div className="font-medium">{account.name}</div><div className="text-xs text-muted-foreground">{account.shared ? t("Shared") : account.ownerName ?? (account.ownerUserId ? t("Account owner") : t("Personal accounts"))} · {providerDisplayName(account.provider)} · {account.price.plan}</div></div>
              <div className="text-right"><div className="font-mono">{account.price.status !== "active" ? account.price.status === "ended" ? t("Ended") : t("Excluded") : account.price.monthlyCents == null ? t("Price unknown") : t("{{subscriptionMoney}}/month", { subscriptionMoney: subscriptionMoney(account.price.monthlyCents, account.price.currency) })}</div><div className="text-xs text-muted-foreground">{account.price.source === "catalog" ? t("Estimated · before tax") : account.price.source === "user" ? t("User supplied") : ""}{account.price.cadence === "year" ? t(" · annual payment ÷ 12") : ""}</div></div>
            </div>
            <SubscriptionTokenUsage usage={account.usage} />
            {Number(account.usage.costCents) > 0 && <div className="text-xs text-muted-foreground">{formatCents(Number(account.usage.costCents))} {t("recorded usage charges in selected period, separate from the subscription fee.")}</div>}
            {account.agents.length > 0 && <div className="text-xs text-muted-foreground">{t("Used by")} {account.agents.map(agent => agent.name).join(", ")}</div>}
            {!account.identityVerified && <p className="text-xs text-muted-foreground">{t("Account identity is unconfirmed. Link duplicates if these connections use the same subscription.")}</p>}
            {account.observedAt && <div className="text-xs text-muted-foreground">{t("Plan checked")} {formatDateTime(account.observedAt)}{account.refreshStatus === "unavailable" ? t(" · latest check unavailable") : ""}</div>}
            {account.refreshStatus === "unavailable" && !account.observedAt && <p className="text-xs text-muted-foreground">{t("The provider did not make plan details available. You can enter the price yourself.")}</p>}
            {account.canEdit && <div><Button variant="outline" size="sm" onClick={() => setEditing(account)}>{t("Edit price")}</Button></div>}
          </div>)}
          {!!report?.unattributedSubscription.eventCount && <p className="text-xs text-muted-foreground">{t("Some subscription usage has no recorded account. It is included in the subscription token total.")}</p>}
          <p className="text-xs text-muted-foreground">{t("Monthly fees cover the whole account, including use outside Paperclip. They are separate from recorded charges and agent budgets. Currencies are totaled separately.")}</p>
        </div>}
      </DialogContent>
    </Dialog>
  </>;
}
