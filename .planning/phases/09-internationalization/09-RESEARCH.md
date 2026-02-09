# Phase 9: Internationalization - Research

**Researched:** 2026-02-09
**Domain:** React Native i18n with i18n-js, Expo, AsyncStorage persistence
**Confidence:** HIGH

## Summary

Phase 9 adds Italian/English language switching to the Lumio Android app. The codebase currently has all UI strings hardcoded in English across 13 screen/component files. The prior decision locks **i18n-js** (not react-i18next) as the translation library due to Expo recommendation, smaller bundle size (15kb vs 45kb), and sufficiency for 2 locales.

The implementation follows the established project pattern: a `lib/` module for persistence logic, a `contexts/` provider for reactive state, and a `hooks/` convenience re-export. i18n-js v4 provides an `onChange` event and `version` property that enable React re-renders when locale changes. The total string extraction scope is approximately 80-90 strings across all screens, components, toasts, alerts, and navigation labels.

**Primary recommendation:** Create an `I18nContext` mirroring the ThemeContext/StudySettingsContext pattern. Store the i18n-js instance as a module singleton, expose `locale` and `setLocale` via context, and use `i18n.t()` calls throughout all components. Persist the locale preference in AsyncStorage under `@lumio/locale`.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| i18n-js | 4.5.x | Translation runtime (translate, pluralize, interpolate) | Prior decision v1.2, Expo recommended, 15kb, sufficient for 2 locales |
| @react-native-async-storage/async-storage | 2.2.0 | Persist locale preference | Already in project, used by Theme and StudySettings |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-localization | latest | Detect device locale for initial default (DEFERRED -- I18N-06) | NOT needed for v1.2 scope -- default to English |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| i18n-js | react-i18next | Richer ecosystem, hooks built-in, but 45kb, over-engineered for 2 locales -- decision locked |
| i18n-js | lingui | Compile-time extraction, but heavier setup for simple use case |
| JSON files | Crowdin/Lokalise | Out of scope per REQUIREMENTS.md -- 2 languages, ~84 strings, single developer |

**Installation:**
```bash
cd apps/android && pnpm add i18n-js
```

Note: `expo-localization` is NOT needed for this phase since I18N-06 (auto-detect device locale) is deferred. The default language will be English unless the user explicitly switches.

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
  lib/
    i18n.ts              # i18n-js singleton instance + AsyncStorage persistence
  i18n/
    en.ts                # English translations object
    it.ts                # Italian translations object
    index.ts             # Re-exports both, type definition for translation keys
  contexts/
    I18nContext.tsx       # I18nProvider + useI18n hook (mirrors ThemeContext pattern)
  hooks/
    useI18n.ts           # Convenience re-export from contexts/I18nContext
```

### Pattern 1: I18n Singleton Module (lib/i18n.ts)
**What:** Module-level i18n-js instance with AsyncStorage load/save, mirroring lib/theme.ts
**When to use:** Always -- single source of truth for translations

```typescript
// apps/android/lib/i18n.ts
import { I18n } from 'i18n-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import en from '../i18n/en';
import it from '../i18n/it';

const LOCALE_STORAGE_KEY = '@lumio/locale';

export type AppLocale = 'en' | 'it';

export const i18n = new I18n({ en, it });
i18n.defaultLocale = 'en';
i18n.enableFallback = true;

export async function loadLocale(): Promise<AppLocale> {
  try {
    const stored = await AsyncStorage.getItem(LOCALE_STORAGE_KEY);
    if (stored === 'en' || stored === 'it') return stored;
    return 'en';
  } catch {
    return 'en';
  }
}

export async function saveLocale(locale: AppLocale): Promise<void> {
  await AsyncStorage.setItem(LOCALE_STORAGE_KEY, locale);
}
```

### Pattern 2: I18nContext Provider (mirrors ThemeContext exactly)
**What:** React context that loads persisted locale on mount and triggers re-renders on change
**When to use:** Wrap the app tree so all components react to locale changes

```typescript
// apps/android/contexts/I18nContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { i18n, loadLocale, saveLocale, type AppLocale } from '../lib/i18n';

interface I18nContextType {
  locale: AppLocale;
  setLocale: (locale: AppLocale) => void;
  t: typeof i18n.t;
}

const I18nContext = createContext<I18nContextType | null>(null);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<AppLocale>('en');

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
    (scope: string, options?: Record<string, unknown>) => i18n.t(scope, options),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [locale] // Re-create t when locale changes so consumers re-render
  );

  return (
    <I18nContext.Provider value={{ locale, setLocale, t }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n(): I18nContextType {
  const context = useContext(I18nContext);
  if (!context) throw new Error('useI18n must be used within I18nProvider');
  return context;
}
```

### Pattern 3: Translation File Structure
**What:** Typed translation objects with nested keys
**When to use:** Organize translations by screen/feature

```typescript
// apps/android/i18n/en.ts
const en = {
  common: {
    cancel: 'Cancel',
    delete: 'Delete',
    back: 'Back',
    start: 'Start',
    unknownUser: 'Unknown user',
    unknownError: 'Unknown error',
  },
  login: {
    tagline: 'Your flashcards, supercharged',
    signInWithGoogle: 'Sign in with Google',
    googleNotConfigured: 'Google Sign-In not configured.\nSet EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID',
  },
  dashboard: {
    repositories: 'Repositories',
    cards: 'Cards',
    lastStudied: 'Last Studied',
    notYet: 'Not yet',
    justNow: 'Just now',
    startStudySession: 'Start Study Session',
    emptyTitle: 'No Repositories Yet',
    emptySubtitle: 'Add a repository to start studying. Your flashcards will appear here once a repo is synced.',
    goToRepos: 'Go to Repositories',
  },
  // ... etc per screen
} as const;

export default en;
export type TranslationKeys = typeof en;
```

### Pattern 4: Provider Placement in App.tsx
**What:** Nest I18nProvider alongside existing providers
**When to use:** App.tsx only

```typescript
// I18nProvider wraps the tree but is inside AuthProvider (translations don't need auth)
<AuthProvider>
  <ThemeProvider>
    <I18nProvider>
      <StudySettingsProvider>
        <NavigationContainer>
          ...
        </NavigationContainer>
      </StudySettingsProvider>
    </I18nProvider>
  </ThemeProvider>
</AuthProvider>
```

### Pattern 5: String Interpolation in Translations
**What:** Dynamic values in translated strings using i18n-js `%{variable}` syntax
**When to use:** Strings that contain dynamic data (counts, names, etc.)

```typescript
// In translation file:
{
  study: {
    studyingXofY: 'Studying %{limit} of %{total} cards',
    cardsAvailable: '%{count} cards available',
  },
  repos: {
    deleteConfirmTitle: 'Delete Repository',
    deleteConfirmBody: 'Are you sure you want to delete "%{name}"? All associated cards will also be removed.',
  },
}

// In component:
t('study.studyingXofY', { limit: effectiveLimit, total: session.cards.length })
t('repos.deleteConfirmBody', { name: repoName })
```

### Anti-Patterns to Avoid
- **Importing i18n singleton directly in components:** Always use the `useI18n()` hook. Direct `i18n.t()` calls bypass React re-rendering -- the component will not update when locale changes.
- **Translating card content or quiz questions:** I18N-04 explicitly requires card content and AI-generated questions to remain in their original language. Only UI chrome gets translated.
- **Lazy-loading translations for 2 locales:** With only ~84 strings per locale, both fit easily in memory. No need for dynamic imports.
- **Using template literals for translated strings:** `t('hello') + ' ' + t('world')` breaks for languages with different word order. Use interpolation: `t('greeting', { name })`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Translation lookup with fallbacks | Custom key-value map with fallback logic | i18n-js `I18n` class with `enableFallback` | Handles nested keys, pluralization, interpolation, missing keys |
| Locale persistence | Custom file-based storage | AsyncStorage (already in project) | Consistent with ThemeContext and StudySettingsContext patterns |
| Pluralization rules | Custom count-based if/else | i18n-js built-in pluralization with `zero`/`one`/`other` | Handles language-specific rules (Italian has different plural forms) |
| Re-render on locale change | Manual event emitter | React Context + useState (locale as dependency) | Mirrors existing ThemeContext pattern, reliable re-render cascade |

**Key insight:** i18n-js v4 handles the hard parts (interpolation, pluralization, fallback chains, missing translation strategies). The project only needs to wire it into the existing Context pattern.

## Common Pitfalls

### Pitfall 1: Components Don't Re-render on Locale Change
**What goes wrong:** Strings stay in old language after switching
**Why it happens:** Components call `i18n.t()` directly instead of through context, or `t` function reference is not recreated when locale changes
**How to avoid:** Always use `useI18n().t()` hook. The `t` function must be recreated (via `useCallback` with `[locale]` dependency) so React detects the change. Every component consuming `t` will re-render because the context value changed.
**Warning signs:** Switching language in Settings works for Settings screen but not for other screens

### Pitfall 2: Alert.alert Strings Are Not Reactive
**What goes wrong:** `Alert.alert()` calls capture strings at call time -- they use whatever locale was active when the alert was triggered, which is correct. But the *definition* of alert title/body strings (if pre-defined) can become stale.
**Why it happens:** Alert.alert is imperative, not declarative
**How to avoid:** Call `t()` inside the handler function that triggers the alert, not in a pre-defined constant. Example: `Alert.alert(t('repos.deleteConfirmTitle'), ...)` inside the onPress handler.

### Pitfall 3: Toast Messages Not Updating
**What goes wrong:** Toast strings from `react-native-toast-message` show old language
**Why it happens:** Same as alerts -- toast calls are imperative, strings are captured at call time
**How to avoid:** Call `t()` at the moment the Toast.show() is invoked, inside the async handler. This is already correct behavior since toasts are fired in response to user actions.

### Pitfall 4: Navigation Tab Labels
**What goes wrong:** Tab bar labels and header titles don't update on language change
**Why it happens:** React Navigation caches screen options. Static `title: 'Repositories'` strings don't re-evaluate.
**How to avoid:** Current app uses `tabBarShowLabel: false` (icons only, no labels). Header titles: Dashboard uses a logo image (no text), Repos uses `title: 'Repositories'`, Settings uses route name. Use `options` as a function or dynamic `headerTitle` to pick up locale changes. Alternatively, since this app only has 2 text headers, they can use `useLayoutEffect` with `navigation.setOptions()`.

### Pitfall 5: Missing Translations in One Language
**What goes wrong:** Some strings show `[missing "x.y" translation]` in Italian
**Why it happens:** Forgot to add the Italian translation for a new key
**How to avoid:** Type the translation objects using `TranslationKeys` type. Make the Italian file satisfy the same type shape as English. TypeScript will catch missing keys at build time.

### Pitfall 6: Strings Defined Outside Components
**What goes wrong:** `const themeOptions = [{ label: 'System' }, ...]` defined at module level never re-evaluates
**Why it happens:** Module-level constants are evaluated once at import time
**How to avoid:** Move string-bearing arrays inside the component function body, or use a function that accepts `t` and returns the array. In SettingsScreen, `themeOptions` and `studyOptions` must be defined inside the component (or as a function) to use `t()`.

## Comprehensive String Inventory

All hardcoded UI strings that need extraction, organized by file:

### Screens

**LoginScreen.tsx** (~5 strings)
- "Your flashcards, supercharged" (tagline)
- "Sign in with Google" (button)
- "Google Sign-In not configured..." (dev warning)
- "Sign in failed" (error fallback)
- "Lumio logo" (accessibility label)

**DashboardScreen.tsx** (~10 strings)
- "Not yet", "Just now", "Xm ago", "Xh ago", "Xd ago" (relative time -- BUT I18N-05 is deferred, keep English format)
- "Repositories" (stat label)
- "Cards" (stat label)
- "Last Studied" (stat label)
- "Start Study Session" (button)
- "No Repositories Yet" (empty title)
- "Add a repository to start studying..." (empty subtitle)
- "Go to Repositories" (empty CTA)

**ReposScreen.tsx** (~10 strings via toasts/alerts)
- "Failed to load repositories" (toast)
- "Repository added" (toast)
- "Syncing cards from repository..." (toast)
- "Private repository?" (toast)
- "Enter a Personal Access Token to add this repo." (toast)
- "Failed to add repository" (toast)
- "Delete Repository" (alert title)
- "Are you sure you want to delete '%{name}'?..." (alert body)
- "Cancel" (alert button)
- "Delete" (alert button)
- "Repository deleted" (toast)
- "Failed to delete repository" (toast)
- "No repositories yet" (empty title)
- "Add a GitHub repository URL above..." (empty subtitle)

**StudyScreen.tsx** (~15 strings)
- "Review" / "Study" (header title)
- "Skip" / "Skipping..." (skip button)
- "Card skipped" (toast)
- "Loading cards..." (loading state)
- "No cards available" (no cards title)
- "Questions are being prepared. Try again in a few minutes." (no cards subtitle)
- "Back to Dashboard" (button)
- "Ready to study" (ready title)
- "Studying X of Y cards" / "X cards available" (ready subtitle)
- "Start" (ready button)
- "Loading question..." (loading state)
- "End Session?" (alert title)
- "Your progress will be saved." (alert body)
- "Continue Studying" (alert button)
- "End Session" (alert button)
- "Prev Card" (button)
- "Next Card" / "Finish" (button)
- "Back to Current Card" (review button)
- "Session Complete" (completed title)
- "You studied all available cards" (completed subtitle)

**StudySummaryScreen.tsx** (~8 strings)
- "Session Complete!" (title)
- "Score" (label)
- "Correct" (stat)
- "Incorrect" (stat)
- "Skipped" (stat)
- "Time" (stat)
- "Return to Dashboard" (button)

**SettingsScreen.tsx** (~12 strings)
- "Signed in as" (label)
- "Unknown user" (fallback)
- "Appearance" (section header)
- "System" / "Light" / "Dark" (theme options)
- "Study" (section header)
- "10 cards" / "20 cards" / "50 cards" / "All cards" (study options)
- "Log out" (button)
- "Version copied" (toast)
- NEW: "Language" (section header for i18n setting)
- NEW: "English" / "Italiano" (language options)

### Components

**AddRepoForm.tsx** (~5 strings)
- "Repository URL is required" (validation)
- "Enter a valid GitHub repository URL" (validation)
- "This repository appears to be private..." (PAT label)
- "Cancel" (button)
- "Submit with Token" (button)

**EmptyState.tsx** (0 -- all strings passed via props)

**OfflineBanner.tsx** (~1 string)
- "No internet connection"

**RepoListItem.tsx** (~1 string)
- "Delete" (swipe action)

**ExplanationPanel.tsx** (~4 strings)
- "Correct!" / "Incorrect" (result text)
- "Was this question helpful?" (vote label)
- "Yes" / "No" (vote buttons)

**CardPreviewModal.tsx** (~2 strings)
- "Card Content" (fallback title)
- "No card content to display" (empty state)

**ProgressBar.tsx** (0 -- only shows numbers)

**Navigation (MainNavigator.tsx)** (~2 strings)
- "Repositories" (Repos tab header title)
- "Settings" (Settings tab header title -- uses route name)

**Total estimated: ~80-85 unique translatable strings**

## Settings Screen Language Selector Design

The language selector should follow the exact same visual pattern as the existing Appearance and Study sections in SettingsScreen:

```typescript
type LanguageOption = {
  value: AppLocale;
  label: string; // Display name in the language itself (not translated)
  icon: React.ComponentProps<typeof Ionicons>['name'];
};

// Language names should be in their own language (autonyms) -- NOT translated
const languageOptions: LanguageOption[] = [
  { value: 'en', label: 'English', icon: 'language-outline' },
  { value: 'it', label: 'Italiano', icon: 'language-outline' },
];
```

**Important:** Language display names use autonyms (the language's own name for itself). "Italiano" stays "Italiano" regardless of the current UI language. This is standard UX practice so users can always find their language.

## Code Examples

### Using t() in a Component
```typescript
import { useI18n } from '../hooks/useI18n';

export function DashboardScreen() {
  const { t } = useI18n();
  // ...
  return (
    <Text>{t('dashboard.startStudySession')}</Text>
  );
}
```

### Using t() in Alert.alert (Imperative)
```typescript
const { t } = useI18n();

const handleDeleteRepo = (id: string, name: string) => {
  Alert.alert(
    t('repos.deleteConfirmTitle'),
    t('repos.deleteConfirmBody', { name }),
    [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: ... },
    ],
  );
};
```

### Using t() in Toast.show (Imperative)
```typescript
Toast.show({
  type: 'success',
  text1: t('repos.repoAdded'),
  text2: t('repos.syncingCards'),
});
```

### Module-Level Arrays That Need t() (SettingsScreen Pattern)
```typescript
// BEFORE (broken -- evaluated once at module level):
const themeOptions = [{ label: 'System' }, ...];

// AFTER (correct -- evaluated inside component with current locale):
export function SettingsScreen() {
  const { t } = useI18n();

  const themeOptions = [
    { value: 'system', label: t('settings.system'), icon: 'phone-portrait-outline' },
    { value: 'light', label: t('settings.light'), icon: 'sunny-outline' },
    { value: 'dark', label: t('settings.dark'), icon: 'moon-outline' },
  ];
  // ...
}
```

### Translation Type Safety
```typescript
// apps/android/i18n/en.ts
const en = { /* ... */ } as const;
export default en;
export type Translations = typeof en;

// apps/android/i18n/it.ts
import type { Translations } from './en';
const it: Translations = { /* TypeScript enforces all keys present */ };
export default it;
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| i18n-js v3 (global mutable) | i18n-js v4 (class instance, onChange events) | 2022 | v4 is instance-based with proper event system |
| react-native-i18n | i18n-js + expo-localization | 2020 | react-native-i18n is deprecated, i18n-js is maintained |
| Manual re-render forcing | Context + locale state dependency | Current | Standard React pattern, no hacks needed |

**Deprecated/outdated:**
- `react-native-i18n` by AlexanderZaytsev: archived, use i18n-js directly
- i18n-js v3 global API: v4 uses `new I18n()` class constructor

## Open Questions

1. **Relative Time Formatting**
   - What we know: I18N-05 (language-aware date formatting like "2 ore fa") is deferred
   - What's unclear: Should `formatLastStudied()` in DashboardScreen remain English-only for now, or should we translate the simple suffixes ("m ago", "h ago", "d ago") as part of I18N-03?
   - Recommendation: Translate the simple relative time suffixes as part of this phase since they are UI strings visible to the user. This is NOT full locale-aware date formatting (I18N-05) -- it is simple string translation of "ago", "Just now", etc. Keep the same minute/hour/day logic, just translate the labels.

2. **ConnectionTest Component**
   - What we know: Has hardcoded strings ("Supabase Connection", "Connecting...", etc.)
   - What's unclear: Is this a developer-only debug component or user-facing?
   - Recommendation: Skip translating ConnectionTest -- it appears to be a dev/debug component not shown in normal user flow. It is not imported in any screen or navigator.

## Sources

### Primary (HIGH confidence)
- [Expo Localization Guide](https://docs.expo.dev/guides/localization/) - Official Expo docs on i18n-js setup
- [i18n-js GitHub (fnando/i18n)](https://github.com/fnando/i18n) - v4 API: I18n class, onChange, interpolation, pluralization
- [i18n-js npm](https://www.npmjs.com/package/i18n-js) - v4.5.2 (latest as of 2026-02-09)
- Codebase analysis: All 13 screen/component files read and strings inventoried

### Secondary (MEDIUM confidence)
- [Expo Localization SDK](https://docs.expo.dev/versions/latest/sdk/localization/) - getLocales() API for device locale detection (deferred feature)
- Multiple Medium articles on i18n-js + AsyncStorage + Context pattern verified against Expo docs

### Tertiary (LOW confidence)
- None -- all findings verified against official sources or codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - i18n-js is a locked prior decision, v4.5.x verified on npm, API verified from GitHub source
- Architecture: HIGH - mirrors existing ThemeContext/StudySettingsContext pattern exactly, verified from codebase
- Pitfalls: HIGH - re-render issues verified from i18n-js onChange API docs and React context patterns
- String inventory: HIGH - every screen and component file was read and strings catalogued

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (stable domain, i18n-js v4 is mature)
