import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { t } from "@/i18n";

interface ShortcutEntry {
  keys: string[];
  label: string;
  /** Render keys as a simultaneous chord (joined with "+") rather than a
   *  "then" sequence. */
  combo?: boolean;
}

interface ShortcutSection {
  title: string;
  shortcuts: ShortcutEntry[];
}

const sections: ShortcutSection[] = [
  {
    title: t("Inbox"),
    shortcuts: [
      { keys: ["j"], label: t("Move down") },
      { keys: ["↓"], label: t("Move down") },
      { keys: ["k"], label: t("Move up") },
      { keys: ["↑"], label: t("Move up") },
      { keys: ["←"], label: t("Collapse selected group") },
      { keys: ["→"], label: t("Expand selected group") },
      { keys: ["Enter"], label: t("Open selected item") },
      { keys: ["a"], label: t("Archive item") },
      { keys: ["y"], label: t("Archive item") },
      { keys: ["r"], label: t("Mark as read") },
      { keys: ["U"], label: t("Mark as unread") },
    ],
  },
  {
    title: t("Task detail"),
    shortcuts: [
      { keys: ["y"], label: t("Quick-archive back to inbox") },
      { keys: ["g", "i"], label: t("Go to inbox") },
      { keys: ["g", "c"], label: t("Focus comment composer") },
    ],
  },
  {
    title: t("Decisions"),
    shortcuts: [
      { keys: ["j"], label: t("Move down") },
      { keys: ["↓"], label: t("Move down") },
      { keys: ["k"], label: t("Move up") },
      { keys: ["↑"], label: t("Move up") },
      { keys: ["Enter"], label: t("Open or close selected decision") },
      { keys: ["x"], label: t("Dismiss selected decision") },
    ],
  },
  {
    title: t("Global"),
    shortcuts: [
      { keys: ["/"], label: t("Search current page or quick search") },
      { keys: ["c"], label: t("New task") },
      { keys: ["["], label: t("Toggle sidebar") },
      { keys: ["]"], label: t("Toggle panel") },
      { keys: ["?"], label: t("Show keyboard shortcuts") },
    ],
  },
];

function KeyCap({ children }: { children: string }) {
  return (
    <kbd className="inline-flex h-6 min-w-6 items-center justify-center rounded border border-border bg-muted px-1.5 font-mono text-xs font-medium text-foreground shadow-(--shadow-extract-10)">
      {children}
    </kbd>
  );
}

export function KeyboardShortcutsCheatsheetContent() {
  return (
    <>
      <div className="divide-y divide-border border-t border-border">
        {sections.map((section) => (
          <div key={section.title} className="px-5 py-3">
            <h3 className="mb-2 text-(length:--text-micro) font-semibold uppercase tracking-wider text-muted-foreground">
              {section.title}
            </h3>
            <div className="space-y-1.5">
              {section.shortcuts.map((shortcut) => (
                <div
                  key={shortcut.label + shortcut.keys.join()}
                  className="flex items-center justify-between gap-4"
                >
                  <span className="text-sm text-foreground/90">{shortcut.label}</span>
                  <div className="flex items-center gap-1">
                    {shortcut.keys.map((key, i) => (
                      <span key={key} className="flex items-center gap-1">
                        {i > 0 && (
                          <span className="text-xs text-muted-foreground">
                            {shortcut.combo ? "+" : t("then")}
                          </span>
                        )}
                        <KeyCap>{key}</KeyCap>
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
      <div className="border-t border-border px-5 py-3">
        <p className="text-xs text-muted-foreground">
          {t("Press")} <KeyCap>{t("Esc")}</KeyCap> {t("to close · Shortcuts are disabled in text fields")}
        </p>
      </div>
    </>
  );
}

export function KeyboardShortcutsCheatsheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md gap-0 p-0 overflow-hidden" showCloseButton={false}>
        <DialogHeader className="px-5 pt-5 pb-3">
          <DialogTitle className="text-base">{t("Keyboard shortcuts")}</DialogTitle>
        </DialogHeader>
        <KeyboardShortcutsCheatsheetContent />
      </DialogContent>
    </Dialog>
  );
}
