'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Locale, translate, defaultLocale } from '@/lib/i18n';

type I18nContextType = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: string) => string;
};

const LOCALE_STORAGE_KEY = 'locale';
const VALID_LOCALES: Locale[] = ['zh-CN', 'en-US'];

function getStoredLocale(): Locale {
  try {
    const stored = localStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored && VALID_LOCALES.includes(stored as Locale)) return stored as Locale;
    const detected = navigator.language?.startsWith('zh') ? 'zh-CN' : 'en-US';
    localStorage.setItem(LOCALE_STORAGE_KEY, detected);
    return detected;
  } catch {
    return defaultLocale;
  }
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  // Always start with defaultLocale to match server-rendered HTML (avoids hydration mismatch).
  // useEffect updates to the real locale immediately after mount.
  const [locale, setLocaleState] = useState<Locale>(defaultLocale);

  /* eslint-disable react-hooks/set-state-in-effect -- Hydration from localStorage must happen in effect */
  useEffect(() => {
    setLocaleState(getStoredLocale());
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  const setLocale = (newLocale: Locale) => {
    setLocaleState(newLocale);
    localStorage.setItem(LOCALE_STORAGE_KEY, newLocale);
  };

  const t = (key: string): string => translate(locale, key);

  return <I18nContext.Provider value={{ locale, setLocale, t }}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}
