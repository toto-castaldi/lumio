export type ThemePreference = 'system' | 'light' | 'dark';

const THEME_KEY = 'lumio-theme';

export function loadThemePreference(): ThemePreference {
  const stored = localStorage.getItem(THEME_KEY);
  if (stored === 'light' || stored === 'dark' || stored === 'system') return stored;
  return 'system';
}

export function saveThemePreference(pref: ThemePreference): void {
  localStorage.setItem(THEME_KEY, pref);
}

export function applyThemeToDOM(pref: ThemePreference): void {
  const isDark = pref === 'dark' ||
    (pref === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  document.documentElement.classList.toggle('dark', isDark);
}

/** Cycle: system -> light -> dark -> system */
export function nextThemePreference(current: ThemePreference): ThemePreference {
  const cycle: ThemePreference[] = ['system', 'light', 'dark'];
  const idx = cycle.indexOf(current);
  return cycle[(idx + 1) % cycle.length];
}
