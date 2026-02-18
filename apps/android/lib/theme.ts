import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';

const THEME_STORAGE_KEY = '@lumio/theme-preference';

/**
 * User's theme preference.
 * - 'system': Follow device dark mode setting
 * - 'light': Always use light theme
 * - 'dark': Always use dark theme
 */
export type ThemePreference = 'system' | 'light' | 'dark';

/**
 * Light color palette for the app.
 */
export const lightColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#333333',
  textSecondary: '#6B7280',
  primary: '#3B82F6',
  primaryLight: '#DBEAFE',
  danger: '#ef4444',
  dangerLight: '#FEE2E2',
  warning: '#f59e0b',
  warningLight: '#FEF3C7',
  border: '#e5e7eb',
  card: '#ffffff',
};

/**
 * Dark color palette for the app.
 */
export const darkColors: Colors = {
  background: '#111827',
  surface: '#1f2937',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  primary: '#60a5fa',
  primaryLight: '#1e3a5f',
  danger: '#f87171',
  dangerLight: '#7f1d1d',
  warning: '#fbbf24',
  warningLight: '#78350f',
  border: '#374151',
  card: '#1f2937',
};

/**
 * Color palette type derived from lightColors shape.
 */
export type Colors = typeof lightColors;

/**
 * Load the user's theme preference from persistent storage.
 * Returns 'system' if no preference is stored.
 */
export async function loadThemePreference(): Promise<ThemePreference> {
  try {
    const stored = await AsyncStorage.getItem(THEME_STORAGE_KEY);
    if (stored === 'light' || stored === 'dark' || stored === 'system') {
      return stored;
    }
    return 'system';
  } catch {
    return 'system';
  }
}

/**
 * Save the user's theme preference to persistent storage.
 * Also updates the system appearance override so native components match.
 */
export async function saveThemePreference(pref: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_STORAGE_KEY, pref);
  // Update native appearance override
  Appearance.setColorScheme(pref === 'system' ? null : pref);
}
