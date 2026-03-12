import { createContext, useContext, useState, useCallback, useMemo, type ReactNode } from 'react';
import { type AppLocale, i18n, loadLocale, saveLocale } from '../lib/i18n';

interface I18nContextType {
  locale: AppLocale;
  t: (key: string, options?: Record<string, unknown>) => string;
  setLocale: (locale: AppLocale) => void;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>(loadLocale);

  // Set i18n locale on init
  i18n.locale = locale;

  const setLocale = useCallback((newLocale: AppLocale) => {
    i18n.locale = newLocale;
    saveLocale(newLocale);
    setLocaleState(newLocale);
  }, []);

  const t = useCallback((key: string, options?: Record<string, unknown>) => {
    return i18n.t(key, options);
  }, [locale]); // eslint-disable-line react-hooks/exhaustive-deps

  const value = useMemo<I18nContextType>(() => ({
    locale,
    t,
    setLocale,
  }), [locale, t, setLocale]);

  return (
    <I18nContext.Provider value={value}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }
  return context;
}
