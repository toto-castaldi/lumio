import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  loadThemePreference,
  saveThemePreference,
  applyThemeToDOM,
  nextThemePreference,
} from '../theme';

describe('theme', () => {
  beforeEach(() => {
    localStorage.clear();
    document.documentElement.classList.remove('dark');
    // Provide a default matchMedia mock (jsdom does not implement it)
    window.matchMedia = vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      dispatchEvent: vi.fn(),
    }));
  });

  describe('loadThemePreference', () => {
    it('returns stored value when valid', () => {
      localStorage.setItem('lumio-theme', 'dark');
      expect(loadThemePreference()).toBe('dark');
    });

    it('returns stored value for light', () => {
      localStorage.setItem('lumio-theme', 'light');
      expect(loadThemePreference()).toBe('light');
    });

    it('returns stored value for system', () => {
      localStorage.setItem('lumio-theme', 'system');
      expect(loadThemePreference()).toBe('system');
    });

    it('defaults to system when nothing stored', () => {
      expect(loadThemePreference()).toBe('system');
    });

    it('defaults to system when invalid value stored', () => {
      localStorage.setItem('lumio-theme', 'invalid');
      expect(loadThemePreference()).toBe('system');
    });
  });

  describe('saveThemePreference', () => {
    it('writes to localStorage', () => {
      saveThemePreference('dark');
      expect(localStorage.getItem('lumio-theme')).toBe('dark');
    });
  });

  describe('nextThemePreference', () => {
    it('cycles system -> light', () => {
      expect(nextThemePreference('system')).toBe('light');
    });

    it('cycles light -> dark', () => {
      expect(nextThemePreference('light')).toBe('dark');
    });

    it('cycles dark -> system', () => {
      expect(nextThemePreference('dark')).toBe('system');
    });
  });

  describe('applyThemeToDOM', () => {
    it('adds .dark class when preference is dark', () => {
      applyThemeToDOM('dark');
      expect(document.documentElement.classList.contains('dark')).toBe(true);
    });

    it('removes .dark class when preference is light', () => {
      document.documentElement.classList.add('dark');
      applyThemeToDOM('light');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('checks matchMedia for system preference', () => {
      // jsdom defaults matchMedia to not matching (light), so system should not add .dark
      applyThemeToDOM('system');
      expect(document.documentElement.classList.contains('dark')).toBe(false);
    });

    it('adds .dark when system prefers dark', () => {
      // Override matchMedia to report dark preference
      const originalMatchMedia = window.matchMedia;
      window.matchMedia = vi.fn().mockImplementation((query: string) => ({
        matches: query === '(prefers-color-scheme: dark)',
        media: query,
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
        onchange: null,
        addListener: vi.fn(),
        removeListener: vi.fn(),
        dispatchEvent: vi.fn(),
      }));

      applyThemeToDOM('system');
      expect(document.documentElement.classList.contains('dark')).toBe(true);

      window.matchMedia = originalMatchMedia;
    });
  });
});
