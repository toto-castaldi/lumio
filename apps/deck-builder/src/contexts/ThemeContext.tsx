import { createContext, useContext, useState, useEffect, useCallback, useMemo, type ReactNode } from 'react';
import {
  type ThemePreference,
  loadThemePreference,
  saveThemePreference,
  applyThemeToDOM,
  nextThemePreference,
} from '../lib/theme';

interface ThemeContextType {
  preference: ThemePreference;
  isDark: boolean;
  toggleTheme: () => void;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

function computeIsDark(pref: ThemePreference): boolean {
  return pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [preference, setPreference] = useState<ThemePreference>(loadThemePreference);
  const [isDark, setIsDark] = useState(() => computeIsDark(preference));

  // Apply theme to DOM whenever preference changes
  useEffect(() => {
    applyThemeToDOM(preference);
    setIsDark(computeIsDark(preference));
  }, [preference]);

  // Listen to system preference changes when mode is 'system'
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = () => {
      if (preference === 'system') {
        applyThemeToDOM('system');
        setIsDark(computeIsDark('system'));
      }
    };
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, [preference]);

  const toggleTheme = useCallback(() => {
    const next = nextThemePreference(preference);
    saveThemePreference(next);
    setPreference(next);
  }, [preference]);

  const value = useMemo<ThemeContextType>(() => ({
    preference,
    isDark,
    toggleTheme,
  }), [preference, isDark, toggleTheme]);

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextType {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
