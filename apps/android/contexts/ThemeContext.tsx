import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { useColorScheme } from 'react-native';
import {
  lightColors,
  darkColors,
  loadThemePreference,
  saveThemePreference,
  type ThemePreference,
  type Colors,
} from '../lib/theme';

interface ThemeContextType {
  isDark: boolean;
  colors: Colors;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

interface ThemeProviderProps {
  children: ReactNode;
}

/**
 * ThemeProvider manages light/dark theme state.
 *
 * - Loads persisted preference from AsyncStorage on mount
 * - Responds to system color scheme changes when preference is 'system'
 * - Provides current colors, isDark flag, and setPreference to children
 */
export function ThemeProvider({ children }: ThemeProviderProps) {
  const [preference, setPreferenceState] = useState<ThemePreference>('system');
  const systemScheme = useColorScheme();

  // Load persisted preference on mount
  useEffect(() => {
    loadThemePreference().then((stored) => {
      setPreferenceState(stored);
    });
  }, []);

  const isDark =
    preference === 'system'
      ? systemScheme === 'dark'
      : preference === 'dark';

  const colors = isDark ? darkColors : lightColors;

  const setPreference = useCallback((pref: ThemePreference) => {
    setPreferenceState(pref);
    saveThemePreference(pref);
  }, []);

  const value: ThemeContextType = {
    isDark,
    colors,
    preference,
    setPreference,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

/**
 * Hook to access theme context.
 * Must be used within a ThemeProvider.
 *
 * @returns isDark, colors, preference, setPreference
 * @throws Error if used outside of ThemeProvider
 */
export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }

  return context;
}
