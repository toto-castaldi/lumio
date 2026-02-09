import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  i18n,
  loadLocale,
  saveLocale,
  type AppLocale,
} from '../lib/i18n';

interface I18nContextType {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: (scope: string, options?: Record<string, unknown>) => string;
}

const I18nContext = createContext<I18nContextType | null>(null);

interface I18nProviderProps {
  children: ReactNode;
}

/**
 * I18nProvider manages locale state and provides translation function.
 *
 * - Loads persisted locale preference from AsyncStorage on mount
 * - Exposes locale, setLocale, and t() to children via context
 * - t() is recreated when locale changes so consumers re-render
 */
export function I18nProvider({ children }: I18nProviderProps) {
  const [locale, setLocaleState] = useState<AppLocale>('en');

  // Load persisted locale on mount
  useEffect(() => {
    loadLocale().then((stored) => {
      setLocaleState(stored);
      i18n.locale = stored;
    });
  }, []);

  const setLocale = useCallback((newLocale: AppLocale) => {
    setLocaleState(newLocale);
    i18n.locale = newLocale;
    saveLocale(newLocale);
  }, []);

  const t = useCallback(
    (scope: string, options?: Record<string, unknown>) =>
      i18n.t(scope, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale], // Re-create t when locale changes so consumers re-render
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

/**
 * Hook to access i18n context.
 * Must be used within an I18nProvider.
 *
 * @returns locale, setLocale, t
 * @throws Error if used outside of I18nProvider
 */
export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);

  if (!context) {
    throw new Error('useI18n must be used within an I18nProvider');
  }

  return context;
}
