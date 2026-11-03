import i18n, { type TOptions } from "i18next";
import { initReactI18next, useTranslation as useReactI18nextTranslation } from "react-i18next";

import { AVAILABLE_LOCALES, DEFAULT_LOCALE, localeMessages, resolveInitialLocale, type AvailableLocale } from "./locales";

const initialLocale = resolveInitialLocale();

void i18n
  .use(initReactI18next)
  .init({
    resources: Object.fromEntries(
      Object.entries(localeMessages).map(([locale, messages]) => [locale, { translation: messages }]),
    ),
    lng: initialLocale,
    fallbackLng: DEFAULT_LOCALE,
    supportedLngs: [...AVAILABLE_LOCALES],
    defaultNS: "translation",
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    returnNull: false,
    returnObjects: false,
    initAsync: false,
  })
  .catch((error: unknown) => {
    console.error("Failed to initialize i18next", error);
  });

if (typeof document !== "undefined") {
  document.documentElement.lang = initialLocale;
}

export function currentLocale(): AvailableLocale {
  return initialLocale;
}

export function t(key: string, options: TOptions = {}) {
  return i18n.t(key, options);
}

export const useTranslation = useReactI18nextTranslation;
export { i18n };
