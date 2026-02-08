# Architecture Patterns

**Domain:** Feature integration into existing React Native / Expo Android app
**Researched:** 2026-02-08

## Overview

This document specifies how four features -- i18n (IT/EN toggle), logo integration, configurable cards-per-session, and the bottom-sheet preview bugfix -- integrate into the existing Lumio Android app architecture. Each feature is analyzed for: what new components/files are needed, what existing files are modified, data flow changes, and integration points.

The existing app uses: React Context (AuthContext, ThemeContext), AsyncStorage for preferences, react-navigation (not expo-router), WebView-based card rendering, and a custom bottom-sheet Modal. No Redux, Zustand, or TanStack Query.

---

## Feature 1: Internationalization (i18n) -- IT/EN Toggle

### Recommended Architecture

Use `i18next` + `react-i18next` + `expo-localization` because this is the dominant pattern in the React Native / Expo ecosystem. `expo-localization` detects the device locale; `i18next` manages translation strings and language switching; `react-i18next` provides the `useTranslation` hook for components.

**Confidence:** HIGH -- this is the standard approach across Expo starter kits, official Expo docs, and community guides.

### New Files

| File | Purpose |
|------|---------|
| `apps/android/i18n/index.ts` | i18next initialization, language detector, fallback config |
| `apps/android/i18n/locales/en.json` | English translation strings |
| `apps/android/i18n/locales/it.json` | Italian translation strings |

### New Context: LanguageProvider (NOT needed)

Do NOT create a LanguageContext. `react-i18next` already provides `I18nextProvider` and the `useTranslation()` hook, which internally manage reactive language state. Adding a custom context would be redundant.

### Provider Placement

No wrapper component needed if using the `initReactI18next` plugin (which registers i18next as a React module internally). The initialization file is imported as a side-effect in `App.tsx`, the same pattern already used for Supabase:

```
App.tsx
  import './i18n';          <-- NEW side-effect import (must be before component tree)
  import './lib/supabase';  <-- existing side-effect import
  GestureHandlerRootView
    SafeAreaProvider
      AuthProvider           <-- LoginScreen can already use useTranslation()
        ThemeProvider
          NavigationContainer
            ...
```

### Data Flow

```
1. App boot -> i18n/index.ts initializes i18next with initReactI18next plugin
2. expo-localization detects device locale
3. AsyncStorage checked for persisted language override (@lumio/language)
4. If override exists, use it; else use device locale (fallback: 'en')
5. User changes language in SettingsScreen -> i18n.changeLanguage('it')
6. i18next notifies react-i18next subscribers
7. All components using useTranslation() re-render with new strings
8. Selected language persisted to AsyncStorage
```

### Integration Points -- Modified Files

| File | Change |
|------|--------|
| `App.tsx` | Add `import './i18n'` as first import (side-effect init) |
| `screens/SettingsScreen.tsx` | Add "Language" section with IT/EN radio buttons (same UI pattern as existing theme toggle). Replace all 9 hardcoded strings with `t('key')`. |
| `screens/LoginScreen.tsx` | Replace `"Your flashcards, supercharged"`, `"Sign in with Google"`, config warning with `t()` calls |
| `screens/DashboardScreen.tsx` | Replace `"Repositories"`, `"Cards"`, `"Last Studied"`, `"Start Study Session"`, `"No Repositories Yet"`, subtitle, `"Go to Repositories"`, time-ago strings with `t()` |
| `screens/ReposScreen.tsx` | Replace toast messages (`"Failed to load repositories"`, `"Repository added"`, `"Repository deleted"`, etc.), Alert titles/messages, button labels |
| `screens/StudyScreen.tsx` | Replace `"Study"`, `"Review"`, `"Skip"`, `"Skipping..."`, `"Next Card"`, `"Finish"`, `"Loading cards..."`, `"Loading question..."`, `"No cards available"`, `"Ready to study"`, `"cards available"`, `"Start"`, `"Session Complete"`, `"Back to Dashboard"`, `"Prev Card"`, `"Back to Current Card"`, `"End Session?"`, `"Your progress will be saved."`, `"Continue Studying"`, `"Card skipped"` |
| `screens/StudySummaryScreen.tsx` | Replace `"Session Complete!"`, `"Score"`, `"Correct"`, `"Incorrect"`, `"Skipped"`, `"Time"`, `"Return to Dashboard"` |
| `components/AddRepoForm.tsx` | Replace `"Repository URL is required"`, `"Enter a valid GitHub repository URL"`, `"Cancel"`, `"Submit with Token"`, PAT label, placeholder |
| `components/study/ExplanationPanel.tsx` | Replace any hardcoded labels |
| `navigation/MainNavigator.tsx` | Replace `title: 'Repositories'` with translated string |

### Translation Key Structure

```json
{
  "common": {
    "cancel": "Cancel",
    "delete": "Delete",
    "loading": "Loading..."
  },
  "login": {
    "tagline": "Your flashcards, supercharged",
    "signInGoogle": "Sign in with Google",
    "googleNotConfigured": "Google Sign-In not configured.\nSet EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID"
  },
  "dashboard": {
    "repositories": "Repositories",
    "cards": "Cards",
    "lastStudied": "Last Studied",
    "notYet": "Not yet",
    "justNow": "Just now",
    "minutesAgo": "{{count}}m ago",
    "hoursAgo": "{{count}}h ago",
    "daysAgo": "{{count}}d ago",
    "startStudy": "Start Study Session",
    "noReposTitle": "No Repositories Yet",
    "noReposSubtitle": "Add a repository to start studying. Your flashcards will appear here once a repo is synced.",
    "goToRepos": "Go to Repositories"
  },
  "settings": {
    "signedInAs": "Signed in as",
    "appearance": "Appearance",
    "language": "Language",
    "study": "Study",
    "cardsPerSession": "Cards per session",
    "allCards": "All",
    "system": "System",
    "light": "Light",
    "dark": "Dark",
    "italian": "Italiano",
    "english": "English",
    "logout": "Log out"
  },
  "study": {
    "title": "Study",
    "review": "Review",
    "skip": "Skip",
    "skipping": "Skipping...",
    "nextCard": "Next Card",
    "prevCard": "Prev Card",
    "finish": "Finish",
    "start": "Start",
    "loadingCards": "Loading cards...",
    "loadingQuestion": "Loading question...",
    "noCards": "No cards available",
    "noCardsSubtitle": "Questions are being prepared. Try again in a few minutes.",
    "readyTitle": "Ready to study",
    "cardsAvailable": "{{count}} cards available",
    "sessionComplete": "Session Complete",
    "backToDashboard": "Back to Dashboard",
    "backToCurrent": "Back to Current Card",
    "endSession": "End Session?",
    "progressSaved": "Your progress will be saved.",
    "continueStudying": "Continue Studying",
    "cardSkipped": "Card skipped"
  },
  "summary": {
    "title": "Session Complete!",
    "score": "Score",
    "correct": "Correct",
    "incorrect": "Incorrect",
    "skipped": "Skipped",
    "time": "Time",
    "returnDashboard": "Return to Dashboard"
  },
  "repos": {
    "title": "Repositories",
    "urlRequired": "Repository URL is required",
    "invalidUrl": "Enter a valid GitHub repository URL",
    "submitWithToken": "Submit with Token",
    "patLabel": "This repository appears to be private. Enter a Personal Access Token:",
    "addSuccess": "Repository added",
    "addSuccessDetail": "Syncing cards from repository...",
    "addFailed": "Failed to add repository",
    "loadFailed": "Failed to load repositories",
    "deleteTitle": "Delete Repository",
    "deleteConfirm": "Are you sure you want to delete \"{{name}}\"? All associated cards will also be removed.",
    "deleteSuccess": "Repository deleted",
    "deleteSuccessDetail": "\"{{name}}\" has been removed.",
    "deleteFailed": "Failed to delete repository",
    "privateRepo": "Private repository?",
    "privateRepoDetail": "Enter a Personal Access Token to add this repo.",
    "emptyTitle": "No repositories yet",
    "emptySubtitle": "Add a GitHub repository URL above to start importing study cards."
  }
}
```

### Persistence Strategy

Use the same `AsyncStorage` pattern as theme preference, integrated into the i18next language detector plugin:

```typescript
// In i18n/index.ts
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import en from './locales/en.json';
import it from './locales/it.json';

const LANGUAGE_STORAGE_KEY = '@lumio/language';

const languageDetector = {
  type: 'languageDetector' as const,
  async: true,
  detect: async (callback: (lng: string) => void) => {
    const stored = await AsyncStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored) return callback(stored);
    const locale = getLocales()[0]?.languageCode || 'en';
    callback(locale === 'it' ? 'it' : 'en'); // Only support it/en
  },
  cacheUserLanguage: async (lng: string) => {
    await AsyncStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
  },
};

i18n
  .use(languageDetector)
  .use(initReactI18next)
  .init({
    resources: { en: { translation: en }, it: { translation: it } },
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
  });

export default i18n;
```

### Dependencies to Install

```bash
pnpm --filter @lumio/android add i18next react-i18next expo-localization
```

`expo-localization` is compatible with Expo SDK 54. No native rebuild required.

### Anti-Patterns to Avoid

- Do NOT create a separate `useLanguage()` hook wrapping `useTranslation()` -- it adds unnecessary indirection.
- Do NOT put translation files in `packages/shared` -- they are UI-specific.
- Do NOT use string concatenation for dynamic translations -- use i18next interpolation syntax: `t('repos.deleteConfirm', { name })`.

---

## Feature 2: Logo Integration

### Recommended Architecture

Convert SVG logo to a React Native component using `SvgXml` from `react-native-svg`. The project already uses Expo SDK 54 which bundles `react-native-svg`. Render the logo inline as a React component rather than as a PNG image.

**Confidence:** HIGH -- `react-native-svg` is included with Expo SDK 54.

### Approach: SvgXml Component (NOT svg-transformer)

Use `SvgXml` from `react-native-svg` because:
1. The SVGs are simple (1.3KB each) -- inlining as string constants is trivial
2. Avoids Metro config changes (`react-native-svg-transformer` requires modifying `metro.config.js`)
3. No dev client rebuild needed
4. The logo is only used in 1-2 places (LoginScreen, possibly header)

### New Files

| File | Purpose |
|------|---------|
| `apps/android/components/LumioLogo.tsx` | SVG logo component with configurable `size` prop |

### Component Design

```typescript
// components/LumioLogo.tsx
import React from 'react';
import { SvgXml } from 'react-native-svg';

// Inline logo.svg content (without the signature line for in-app use)
const logoSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400">
  <path d="M 200 200 L 200 100 A 100 100 0 0 1 286.6 250 Z" fill="#FFA726"/>
  <path d="M 200 200 L 286.6 250 A 100 100 0 0 1 113.4 250 Z" fill="#FF7061"/>
  <path d="M 200 200 L 113.4 250 A 100 100 0 0 1 200 100 Z" fill="#9C68D4"/>
  <rect x="115" y="-12" width="85" height="24" rx="6" fill="#FFA726" transform="translate(200, 200) rotate(-90)"/>
  <rect x="115" y="-12" width="85" height="24" rx="6" fill="#FF7061" transform="translate(200, 200) rotate(30)"/>
  <rect x="115" y="-12" width="85" height="24" rx="6" fill="#9C68D4" transform="translate(200, 200) rotate(150)"/>
</svg>`;

interface LumioLogoProps {
  size?: number;
}

export function LumioLogo({ size = 120 }: LumioLogoProps) {
  return <SvgXml xml={logoSvg} width={size} height={size} />;
}
```

### Integration Points -- Modified Files

| File | Change |
|------|--------|
| `screens/LoginScreen.tsx` | Replace `<Text style={styles.logo}>Lumio</Text>` (line 54) with `<LumioLogo size={120} />`. Keep "Lumio" as a separate text element below the logo icon (now translatable). |

### Data Flow

None -- pure presentational component with no state or side effects.

### Dependencies

`react-native-svg` ships with Expo SDK 54. If not in direct dependencies, add explicitly:
```bash
pnpm --filter @lumio/android add react-native-svg
```

---

## Feature 3: Configurable Cards-per-Session

### Recommended Architecture

Add a `cardsPerSession` setting following the same AsyncStorage pattern as theme preference (`lib/theme.ts`). The `useStudySession` hook reads this value to limit cards loaded.

### New Files

| File | Purpose |
|------|---------|
| `apps/android/lib/studySettings.ts` | Load/save study preferences (cards per session) from AsyncStorage |

### Settings Data Model

```typescript
// lib/studySettings.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const STUDY_SETTINGS_KEY = '@lumio/study-settings';

export type CardsPerSession = 5 | 10 | 15 | 20 | 0; // 0 = all

export interface StudySettings {
  cardsPerSession: CardsPerSession;
}

const DEFAULT_SETTINGS: StudySettings = {
  cardsPerSession: 10,
};

export async function loadStudySettings(): Promise<StudySettings> {
  try {
    const stored = await AsyncStorage.getItem(STUDY_SETTINGS_KEY);
    if (stored) return { ...DEFAULT_SETTINGS, ...JSON.parse(stored) };
    return DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function saveStudySettings(settings: Partial<StudySettings>): Promise<void> {
  const current = await loadStudySettings();
  const merged = { ...current, ...settings };
  await AsyncStorage.setItem(STUDY_SETTINGS_KEY, JSON.stringify(merged));
}
```

### Integration Points -- Modified Files

| File | Change | Details |
|------|--------|---------|
| `hooks/useStudySession.ts` | Accept `maxCards` parameter | Signature: `useStudySession(maxCards: number = 0)`. In `loadInitialData`, after filtering with Deck, shuffle and slice to `maxCards` if > 0. |
| `screens/StudyScreen.tsx` | Load settings on mount, pass to hook | `useState` for `maxCards`, load via `loadStudySettings()` in `useEffect`, pass to `useStudySession(maxCards)`. |
| `screens/SettingsScreen.tsx` | Add "Study" section | Radio buttons for 5/10/15/20/All, same UI pattern as theme radio buttons. |

### Data Flow

```
1. SettingsScreen: User selects cards-per-session -> saveStudySettings()
2. StudyScreen mount -> loadStudySettings() -> get cardsPerSession
3. Pass to useStudySession(cardsPerSession)
4. useStudySession.loadInitialData():
   a. Fetch all available cards
   b. Filter with Deck (.lumioignore)
   c. Shuffle the filtered array (Fisher-Yates)
   d. Slice to cardsPerSession (if > 0)
   e. Set session state with sliced cards
5. Progress bar and completion based on sliced count
```

### Hook Modification Detail

Key change to `useStudySession.ts`:

```typescript
// BEFORE (line 60):
export function useStudySession(): UseStudySessionReturn {

// AFTER:
export function useStudySession(maxCards: number = 0): UseStudySessionReturn {
  // ... inside loadInitialData, after filteredCards is populated ...

  // NEW: Limit cards if maxCards > 0
  let sessionCards = filteredCards;
  if (maxCards > 0 && filteredCards.length > maxCards) {
    // Fisher-Yates shuffle then take first N
    const shuffled = [...filteredCards];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    sessionCards = shuffled.slice(0, maxCards);
  }

  // Use sessionCards instead of filteredCards in setSession
```

### Why NOT a Context

Cards-per-session is read once at session start. It does not need to be reactive during a session. Using AsyncStorage directly (same as theme preference in `lib/theme.ts`) keeps the architecture simple and consistent.

---

## Feature 4: Bottom-Sheet Card Preview Bugfix

### Root Cause Analysis

The bug: content appears cut off at the top (first lines missing) in CardPreviewModal.

**Architecture of the affected component chain:**

```
CardPreviewModal (Modal transparent, slide animation)
  Pressable (backdrop, tap-to-close)
  View (bottom sheet, position: absolute, bottom: 0, maxHeight: 80%)
    View (drag handle: paddingTop: 10, paddingBottom: 4)
    View (header: paddingVertical: 12, borderBottomWidth: 1)
    ScrollView (flex: 1)
      CardContentView (WebView, scrollEnabled: false, dynamic height via postMessage)
```

**The problem has two causes:**

**Cause 1: Race condition in height measurement.** The WebView's JavaScript measures `document.documentElement.scrollHeight` after a 100ms `setTimeout` (line 223-228 of `cardHtml.ts`). But CDN resources (KaTeX CSS/fonts, highlight.js theme CSS, marked.js) may not have loaded in 100ms. The height is measured before content is fully rendered, resulting in an underestimated height. When resources finish loading and content expands, the WebView's actual content is taller than `webViewHeight`, but `scrollEnabled=false` prevents internal scrolling. The parent ScrollView may have already scrolled or laid out based on the incorrect smaller height.

**Cause 2: Initial height flash and ScrollView layout shift.** `CardContentView` starts with `webViewHeight = 300` (line 36 of CardContentView.tsx). When the actual height arrives (could be 600+), the ScrollView's content suddenly grows. On Android, this can cause the ScrollView to maintain its current scroll offset rather than resetting to top, making the beginning of content appear "cut off" above the visible area.

### Recommended Fix Architecture

**Three-part fix:**

#### Part A: Improve height measurement timing and reliability (cardHtml.ts)

Replace the single `setTimeout(reportHeight, 100)` with a multi-report strategy:

```javascript
function reportHeight() {
  var height = Math.max(
    document.body.scrollHeight,
    document.body.offsetHeight,
    document.documentElement.scrollHeight
  );
  if (height > 0 && window.ReactNativeWebView) {
    window.ReactNativeWebView.postMessage(
      JSON.stringify({ type: 'height', value: height })
    );
  }
}

// Report after initial render
setTimeout(reportHeight, 150);

// Report after fonts/CSS load (KaTeX web fonts)
if (document.fonts && document.fonts.ready) {
  document.fonts.ready.then(function() {
    setTimeout(reportHeight, 50);
  });
}

// Report when all CDN resources finish loading
window.addEventListener('load', function() {
  setTimeout(reportHeight, 100);
});

// Watch for DOM mutations (KaTeX rendering inserts new elements)
var observer = new MutationObserver(function() {
  setTimeout(reportHeight, 50);
});
observer.observe(document.getElementById('content'), {
  childList: true, subtree: true
});
// Auto-disconnect after 5 seconds to prevent leaks
setTimeout(function() { observer.disconnect(); }, 5000);
```

#### Part B: Fix initial opacity flash (CardContentView.tsx)

Show the WebView only after the first valid height is received:

```typescript
const [webViewHeight, setWebViewHeight] = useState(300);
const [isReady, setIsReady] = useState(false); // NEW

const handleMessage = useCallback((event: WebViewMessageEvent) => {
  try {
    const data = JSON.parse(event.nativeEvent.data);
    if (data.type === 'height' && typeof data.value === 'number' && data.value > 0) {
      setWebViewHeight(data.value);
      if (!isReady) setIsReady(true); // NEW: reveal on first measurement
    }
  } catch { /* ignore */ }
}, [isReady]);

// Style change: opacity 0 until ready
<WebView
  style={[{ height: webViewHeight, opacity: isReady ? 0.99 : 0 }, style]}
  ...
/>
```

#### Part C: Reset ScrollView position on card change (CardPreviewModal.tsx)

```typescript
const scrollViewRef = useRef<ScrollView>(null);

// Reset scroll position when card changes
useEffect(() => {
  if (visible && card) {
    scrollViewRef.current?.scrollTo({ y: 0, animated: false });
  }
}, [visible, card]);

// Add ref and contentContainerStyle fix
<ScrollView
  ref={scrollViewRef}
  style={styles.scrollView}
  contentContainerStyle={[styles.scrollContent, { flexGrow: 1 }]} // flexGrow fix
  showsVerticalScrollIndicator={true}
>
```

### Modified Files

| File | Change |
|------|--------|
| `lib/cardHtml.ts` | Replace single `setTimeout(reportHeight, 100)` at line 223-228 with multi-report strategy (MutationObserver + fonts.ready + window.load) |
| `components/study/CardContentView.tsx` | Add `isReady` state, start with `opacity: 0`, reveal after first height message |
| `components/study/CardPreviewModal.tsx` | Add `useRef` on ScrollView, reset scroll on card change, add `flexGrow: 1` to `contentContainerStyle` |

### Data Flow (Fixed)

```
1. Modal opens, card prop set
2. CardContentView renders WebView with opacity: 0, initial height: 300
3. WebView loads HTML, CDN resources begin loading
4. MutationObserver fires as marked.js/KaTeX renders -> reportHeight()
5. First valid height received -> setWebViewHeight(actualHeight), opacity -> 0.99
6. ScrollView.scrollTo({ y: 0 }) resets position
7. document.fonts.ready fires (KaTeX fonts) -> reportHeight() updates height
8. window.load fires -> final reportHeight() confirms final height
9. Each height update keeps ScrollView at y: 0 via effect
```

---

## Complete Change Map

### New Files (4)

| File | Feature | Lines (est.) |
|------|---------|-------------|
| `apps/android/i18n/index.ts` | i18n | ~40 |
| `apps/android/i18n/locales/en.json` | i18n | ~80 |
| `apps/android/i18n/locales/it.json` | i18n | ~80 |
| `apps/android/components/LumioLogo.tsx` | Logo | ~25 |
| `apps/android/lib/studySettings.ts` | Study settings | ~35 |

### Modified Files (13)

| File | Feature(s) | Nature of Change |
|------|-----------|------------------|
| `App.tsx` | i18n | Add 1 import line |
| `screens/SettingsScreen.tsx` | i18n, study settings | Add language section, study section, replace strings with `t()` |
| `screens/LoginScreen.tsx` | i18n, logo | Replace text logo with SVG component, replace strings with `t()` |
| `screens/DashboardScreen.tsx` | i18n | Replace ~12 strings with `t()` |
| `screens/ReposScreen.tsx` | i18n | Replace ~14 strings with `t()` |
| `screens/StudyScreen.tsx` | i18n, study settings | Replace ~18 strings with `t()`, load settings on mount |
| `screens/StudySummaryScreen.tsx` | i18n | Replace ~7 strings with `t()` |
| `components/AddRepoForm.tsx` | i18n | Replace ~6 strings with `t()` |
| `navigation/MainNavigator.tsx` | i18n | Replace tab header title |
| `hooks/useStudySession.ts` | Study settings | Add `maxCards` parameter, shuffle + slice logic |
| `lib/cardHtml.ts` | Bugfix | Replace height measurement with multi-report strategy |
| `components/study/CardContentView.tsx` | Bugfix | Add `isReady` state, opacity transition |
| `components/study/CardPreviewModal.tsx` | Bugfix | Add ScrollView ref, scroll reset, flexGrow fix |

---

## Build Order (Dependency-Based)

The features have minimal interdependencies. Build order optimizes for: fix bugs first, then add infrastructure, then i18n last (touches the most files).

### Phase 1: Bottom-sheet bugfix (0 dependencies on other features)

1. `lib/cardHtml.ts` -- multi-report height strategy
2. `components/study/CardContentView.tsx` -- opacity transition
3. `components/study/CardPreviewModal.tsx` -- ScrollView fixes

**Rationale:** Bugfix improving existing functionality. No new files (only modifications), no new dependencies. Smallest blast radius. Delivers user-visible improvement immediately.

### Phase 2: Logo integration (0 dependencies)

1. Verify `react-native-svg` availability (or add to dependencies)
2. Create `components/LumioLogo.tsx`
3. Modify `screens/LoginScreen.tsx` to use LumioLogo

**Rationale:** Single new component, single modified screen. Quick win. Should be done before i18n modifies LoginScreen.

### Phase 3: Configurable cards-per-session (0 dependencies)

1. Create `lib/studySettings.ts`
2. Modify `hooks/useStudySession.ts` to accept `maxCards`
3. Modify `screens/StudyScreen.tsx` to load settings and pass to hook
4. Modify `screens/SettingsScreen.tsx` to add study section

**Rationale:** Introduces settings infrastructure. Building this before i18n means SettingsScreen gets its new sections first, then i18n simply translates the final strings.

### Phase 4: i18n (logically last -- touches all screens)

1. Install `i18next`, `react-i18next`, `expo-localization`
2. Create `i18n/index.ts`, `i18n/locales/en.json`, `i18n/locales/it.json`
3. Add `import './i18n'` to `App.tsx`
4. Modify ALL screens and components with `t()` calls
5. Add language section to `SettingsScreen.tsx`

**Rationale:** Touches every screen and most components. Doing it last means all other modifications (logo, settings, bugfix) are already in place, avoiding merge conflicts and double-editing.

### Phase 5: Dynamic version display (trivial, independent)

1. Modify `screens/SettingsScreen.tsx`: replace hardcoded `"Lumio v1.0.0"` with `getVersionString()` from `@lumio/shared`

**Rationale:** Single-line change, can be folded into any phase.

---

## Patterns to Follow

### Pattern 1: Side-Effect Module Initialization

**What:** Import a module purely for its side effects (initialization code runs on import).
**When:** Global singletons that must be initialized before any component renders.
**Already used at:** `App.tsx` line 1: `import './lib/supabase';`
**Apply to:** i18n initialization: `import './i18n';`

### Pattern 2: AsyncStorage Load/Save Functions

**What:** Standalone `load` and `save` async functions for preferences, co-located in a lib file.
**When:** Simple key-value settings read once on mount (not reactive across the app).
**Already used at:** `lib/theme.ts` with `loadThemePreference()` / `saveThemePreference()`
**Apply to:** `lib/studySettings.ts` with `loadStudySettings()` / `saveStudySettings()`

### Pattern 3: Radio Button Setting Group

**What:** Array of option objects rendered as `TouchableOpacity` rows with checkmark indicator.
**When:** Adding a new setting with finite options.
**Already used at:** `SettingsScreen.tsx` lines 20-24 (`themeOptions`) and lines 64-93.
**Apply to:** Language options (IT/EN) and cards-per-session options (5/10/15/20/All).

## Anti-Patterns to Avoid

### Anti-Pattern 1: Creating a New Context for Each Feature

**What:** Adding LocaleContext, StudySettingsContext, etc.
**Why bad:** The app already has 2 contexts (Auth, Theme). i18next provides its own reactive state. Study settings are read once per session. Adding contexts causes unnecessary re-renders.
**Instead:** Side-effect import for i18n. AsyncStorage read-on-mount for study settings.

### Anti-Pattern 2: SVG Transformer for 1-2 Logo Files

**What:** Adding `react-native-svg-transformer` and modifying Metro config.
**Why bad:** Requires Metro config changes, potential monorepo resolution issues, all for 1.3KB of SVG.
**Instead:** Use `SvgXml` from `react-native-svg` with inline SVG string constant.

### Anti-Pattern 3: Flat Translation Key Namespace

**What:** `{ loginTagline: "...", dashboardCards: "...", settingsLogout: "..." }`
**Why bad:** Ambiguous keys, no namespace isolation, hard to find/maintain.
**Instead:** Nested namespaces matching screen names: `login.tagline`, `dashboard.cards`, `settings.logout`.

---

## Sources

- [Expo Localization docs](https://docs.expo.dev/versions/latest/sdk/localization/) -- HIGH confidence
- [React Native / Expo Starter i18n guide](https://starter.obytes.com/guides/internationalization/) -- MEDIUM confidence
- [Phrase: React Native i18n with Expo and i18next](https://phrase.com/blog/posts/react-native-i18n-with-expo-and-i18next-part-1/) -- MEDIUM confidence
- [react-native-webview issue #3715](https://github.com/react-native-webview/react-native-webview/issues/3715) -- HIGH confidence (direct issue report with confirmed workaround)
- [react-native-svg Expo docs](https://docs.expo.dev/versions/latest/sdk/svg/) -- HIGH confidence
- Codebase analysis of all 6 screens, 8 components, 3 hooks, 2 contexts, 4 lib files, navigation structure -- HIGH confidence
