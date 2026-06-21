/**
 * Format a date as a localized "x ago" label. Pass the `time` namespace
 * translator from next-intl (getTranslations("time") or useTranslations("time")).
 */
type TimeTranslator = (key: string, values?: Record<string, number>) => string;

export function relativeTime(date: Date | string, t: TimeTranslator): string {
  const m = Math.round((Date.now() - new Date(date).getTime()) / 60000);
  if (m < 1) return t("justNow");
  if (m < 60) return t("minutesAgo", { m });
  const h = Math.round(m / 60);
  if (h < 24) return t("hoursAgo", { h });
  return t("daysAgo", { d: Math.round(h / 24) });
}
