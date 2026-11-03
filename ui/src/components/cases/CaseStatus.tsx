import type { CaseStatus as CaseStatusValue } from "@/api/cases";
import { StatusBadge } from "@/components/StatusBadge";
import { t } from "@/i18n";

export const CASE_STATUS_LABELS: Record<CaseStatusValue, string> = {
  draft: t("Draft"),
  in_progress: t("In progress"),
  in_review: t("In review"),
  approved: t("Approved"),
  done: t("Done"),
  cancelled: t("Cancelled"),
};

export function CaseStatus({ status, className }: { status: CaseStatusValue; className?: string }) {
  return <StatusBadge status={status} label={CASE_STATUS_LABELS[status]} className={className} />;
}
