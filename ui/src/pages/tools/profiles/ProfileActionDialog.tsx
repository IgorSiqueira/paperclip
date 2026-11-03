import { AlertTriangle } from "lucide-react";
import type { ToolProfileWithDetails } from "@paperclipai/shared";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { t } from "@/i18n";

export type ProfileActionDialogKind = "archive" | "delete" | "restore";

export function ProfileActionDialog({
  kind,
  profile,
  pending,
  onClose,
  onArchive,
  onRestore,
  onDelete,
}: {
  kind: ProfileActionDialogKind | null;
  profile: ToolProfileWithDetails | null;
  pending: boolean;
  onClose: () => void;
  onArchive: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  if (!kind || !profile) return null;

  const defaultDeleteBlocked = kind === "delete" && profile.summary.isCompanyDefault;
  const copy = {
    archive: {
      title: t("Archive profile"),
      body: (profile.summary.appliesToAgentCount === 1 ? t("This profile stops applying to {{appliesToAgentCount}} agent. You can restore it later.", { appliesToAgentCount: profile.summary.appliesToAgentCount }) : t("This profile stops applying to {{appliesToAgentCount}} agents. You can restore it later.", { appliesToAgentCount: profile.summary.appliesToAgentCount })),
      confirm: t("Archive"),
      action: onArchive,
    },
    restore: {
      title: t("Restore profile"),
      body: t("This profile will be active again and can be assigned to agents."),
      confirm: t("Restore"),
      action: onRestore,
    },
    delete: {
      title: t("Delete profile"),
      body: defaultDeleteBlocked
        ? t("This profile is the organization default. Reassign the organization default to another profile before deleting it.")
        : (profile.summary.assignmentCount === 1 ? t("This permanently deletes the profile and removes {{assignmentCount}} assignment.", { assignmentCount: profile.summary.assignmentCount }) : t("This permanently deletes the profile and removes {{assignmentCount}} assignments.", { assignmentCount: profile.summary.assignmentCount })),
      confirm: t("Delete"),
      action: onDelete,
    },
  }[kind];

  return (
    <Dialog open onOpenChange={(next) => !next && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{copy.title}</DialogTitle>
          <DialogDescription>{copy.body}</DialogDescription>
        </DialogHeader>
        {defaultDeleteBlocked ? (
          <div className="flex gap-3 rounded-lg border border-destructive/40 bg-destructive/5 px-3 py-2 text-sm text-destructive">
            <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{t("Choose another access profile and make it the organization default first.")}</span>
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="ghost" onClick={onClose}>{t("Cancel")}</Button>
          <Button
            variant={kind === "delete" ? "destructive" : "default"}
            disabled={pending || defaultDeleteBlocked}
            onClick={copy.action}
          >
            {copy.confirm}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
