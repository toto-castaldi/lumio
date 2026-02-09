import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../i18n/en';
import it from '../i18n/it';

const LOCALE_STORAGE_KEY = '@lumio/locale';

/**
 * Supported app locales.
 * - 'en': English (default)
 * - 'it': Italian
 */
export type AppLocale = 'en' | 'it';

/**
 * Module-level i18n-js singleton.
 * Configured with EN and IT translations, English default, fallback enabled.
 */
export const i18n = new I18n({ en, it });
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

/**
 * Load the user's locale preference from persistent storage.
 * Returns 'en' if no preference is stored.
 */
export async function loadLocale(): Promise<AppLocale> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'it') {
      return stored;
    }
    return 'en';
  } catch {
    return 'en';
  }
}

/**
 * Save the user's locale preference to persistent storage.
 */
export async function saveLocale(locale: AppLocale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
}
