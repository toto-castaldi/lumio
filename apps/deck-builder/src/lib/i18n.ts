import { I18n } from 'i18n-js';
import en from '../i18n/en';
import it from '../i18n/it';

export type AppLocale = 'en' | 'it';

const LOCALE_KEY = 'lumio-locale';

export const i18n = new I18n({ en, it });
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

export function loadLocale(): AppLocale {
  const stored = localStorage.getItem(LOCALE_KEY);
  if (stored === 'en' || stored === 'it') return stored;
  return 'en';
}

export function saveLocale(locale: AppLocale): void {
  localStorage.setItem(LOCALE_KEY, locale);
}
