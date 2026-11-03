import ptBR from "./locales/pt-BR.json";

export const DEFAULT_LOCALE = "en";
export const LOCALE_STORAGE_KEY = "paperclip.locale";
export const AVAILABLE_LOCALES = ["en", "pt-BR"] as const;

export type AvailableLocale = (typeof AVAILABLE_LOCALES)[number];
export type LocaleMessages = Record<string, string>;

export const LOCALE_LABELS: Record<AvailableLocale, string> = {
  en: "English",
  "pt-BR": "Português (Brasil)",
};

export const localeMessages: Partial<Record<AvailableLocale, LocaleMessages>> = {
  "pt-BR": ptBR as LocaleMessages,
};

export function isAvailableLocale(value: unknown): value is AvailableLocale {
  return typeof value === "string" && (AVAILABLE_LOCALES as readonly string[]).includes(value);
}

export function matchLocale(languages: readonly string[]): AvailableLocale | null {
  for (const language of languages) {
    const normalized = language.trim().toLowerCase();
    if (!normalized) continue;
    const exact = AVAILABLE_LOCALES.find((locale) => locale.toLowerCase() === normalized);
    if (exact) return exact;
    const base = normalized.split("-")[0];
    const related = AVAILABLE_LOCALES.find((locale) => locale.toLowerCase().split("-")[0] === base);
    if (related) return related;
  }
  return null;
}

function isTestEnvironment(): boolean {
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process?.env;
  return Boolean(env?.VITEST);
}

export function readStoredLocale(): AvailableLocale | null {
  if (typeof window === "undefined") return null;
  try {
    const stored = window.localStorage.getItem(LOCALE_STORAGE_KEY);
    return isAvailableLocale(stored) ? stored : null;
  } catch {
    return null;
  }
}

export function writeStoredLocale(locale: AvailableLocale): boolean {
  try {
    window.localStorage.setItem(LOCALE_STORAGE_KEY, locale);
    return true;
  } catch {
    return false;
  }
}

export function browserLanguages(): readonly string[] {
  if (typeof navigator === "undefined") return [];
  if (navigator.languages && navigator.languages.length > 0) return navigator.languages;
  return navigator.language ? [navigator.language] : [];
}

export function resolveInitialLocale(): AvailableLocale {
  if (isTestEnvironment()) return DEFAULT_LOCALE;
  const stored = readStoredLocale();
  if (stored) return stored;
  return matchLocale(browserLanguages()) ?? DEFAULT_LOCALE;
}
