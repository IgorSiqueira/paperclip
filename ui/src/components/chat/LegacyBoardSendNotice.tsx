import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { t } from "@/i18n";

export function LegacyBoardSendNotice({ onDiscard }: { onDiscard: () => void }) {
  return <AlertDialog>
    <AlertDialogTrigger asChild>
      <Button size="sm" variant="outline">{t("Discard saved delivery record")}</Button>
    </AlertDialogTrigger>
    <AlertDialogContent>
      <AlertDialogHeader>
        <AlertDialogTitle>{t("Discard saved delivery record?")}</AlertDialogTitle>
        <AlertDialogDescription>
          {t("First check Activity. Discarding this browser record does not cancel an update that was already accepted. It lets you start a new update.")}
        </AlertDialogDescription>
      </AlertDialogHeader>
      <AlertDialogFooter>
        <AlertDialogCancel>{t("Keep record")}</AlertDialogCancel>
        <AlertDialogAction onClick={onDiscard}>{t("Discard record")}</AlertDialogAction>
      </AlertDialogFooter>
    </AlertDialogContent>
  </AlertDialog>;
}
