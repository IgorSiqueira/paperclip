import { t } from "@/i18n";
const MINUTE = 60;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;

export function timeAgo(date: Date | string): string {
  const now = Date.now();
  const then = new Date(date).getTime();
  const seconds = Math.round((now - then) / 1000);

  if (seconds < MINUTE) return t("just now");
  if (seconds < HOUR) {
    const m = Math.floor(seconds / MINUTE);
    return t("{{m}}m ago", { m });
  }
  if (seconds < DAY) {
    const h = Math.floor(seconds / HOUR);
    return t("{{h}}h ago", { h });
  }
  if (seconds < WEEK) {
    const d = Math.floor(seconds / DAY);
    return t("{{d}}d ago", { d });
  }
  if (seconds < MONTH) {
    const w = Math.floor(seconds / WEEK);
    return t("{{w}}w ago", { w });
  }
  const mo = Math.floor(seconds / MONTH);
  return t("{{mo}}mo ago", { mo });
}
