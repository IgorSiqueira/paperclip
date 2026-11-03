import { Languages } from "lucide-react";

import { NativeSelect } from "@/components/ui/select";
import { currentLocale, t } from "@/i18n";
import { AVAILABLE_LOCALES, LOCALE_LABELS, isAvailableLocale, writeStoredLocale } from "@/i18n/locales";
import { cn } from "@/lib/utils";

export function applyLocaleSelection(locale: string): boolean {
  if (!isAvailableLocale(locale) || locale === currentLocale()) return false;
  if (!writeStoredLocale(locale)) return false;
  window.location.reload();
  return true;
}

interface LanguageSelectProps {
  id?: string;
  className?: string;
}

export function LanguageSelect({ id, className }: LanguageSelectProps) {
  return (
    <NativeSelect
      id={id}
      className={cn("w-auto", className)}
      value={currentLocale()}
      aria-label={t("Language")}
      onChange={(event) => applyLocaleSelection(event.target.value)}
    >
      {AVAILABLE_LOCALES.map((locale) => (
        <option key={locale} value={locale}>
          {LOCALE_LABELS[locale]}
        </option>
      ))}
    </NativeSelect>
  );
}

type LanguageMenuRowVariant = "menu-action" | "compact-menu-action";

export function LanguageMenuRow({ variant = "compact-menu-action" }: { variant?: LanguageMenuRowVariant }) {
  if (variant === "menu-action") {
    return (
      <div className="flex w-full items-start gap-3 rounded-xl px-3 py-3 text-left">
        <span className="mt-0.5 rounded-lg border border-border bg-background/70 p-2 text-muted-foreground">
          <Languages className="size-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-medium text-foreground">{t("Language")}</span>
          <span className="block text-xs text-muted-foreground">{t("Choose the interface language.")}</span>
          <LanguageSelect className="mt-2 py-1 text-xs" />
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-(--profile-popover-row-height) w-full items-center gap-(--profile-popover-row-gap) rounded-lg px-2.5 text-left text-(length:--text-compact) font-medium leading-(--profile-popover-label-line-height) text-foreground">
      <span className="flex size-5 shrink-0 items-center justify-center text-muted-foreground">
        <Languages className="size-4" />
      </span>
      <span className="min-w-0 flex-1 truncate">{t("Language")}</span>
      <LanguageSelect className="py-0.5 text-(length:--text-compact)" />
    </div>
  );
}
