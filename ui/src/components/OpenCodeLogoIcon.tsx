import { cn } from "../lib/utils";
import { t } from "@/i18n";

interface OpenCodeLogoIconProps {
  className?: string;
}

export function OpenCodeLogoIcon({ className }: OpenCodeLogoIconProps) {
  return (
    <>
      <img
        src="/brands/opencode-logo-light-square.svg"
        alt={t("OpenCode")}
        className={cn("dark:hidden", className)}
      />
      <img
        src="/brands/opencode-logo-dark-square.svg"
        alt={t("OpenCode")}
        className={cn("hidden dark:block", className)}
      />
    </>
  );
}
