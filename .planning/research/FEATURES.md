# Feature Landscape

**Domain:** i18n, logo/branding, configurable study sessions, bottom-sheet bugfix, dynamic versioning for React Native (Expo) study flashcard app
**Researched:** 2026-02-08

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| i18n: IT/EN toggle in Settings | App has Italian PRD and Italian developer. Target audience includes Italian students. Currently all-English UI feels exclusionary for the primary audience. | Medium | ~82 user-facing strings across 16 files. Pattern mirrors existing theme toggle (AsyncStorage persistence, context provider, Settings radio group). |
| Logo on Login screen | LoginScreen currently says `<Text>Lumio</Text>` with a comment "Logo placeholder - will be replaced with actual logo." Missing logo makes the app feel unfinished. | Low | SVG files exist at repo root (`logo.svg`, `logo-circle.svg`). Need PNG conversion or `react-native-svg`. |
| Dynamic version display | Settings screen hardcodes `Lumio v1.0.0` while the actual release is v1.1.4. Version exists in `@lumio/shared` (`packages/shared/src/version.ts`) with `getVersionString()` but the Android app does not import it. | Low | One-line import change. |
| Bottom-sheet preview bugfix | Card preview content is reported cut off at the top. WebView inside ScrollView inside bottom-sheet Modal has known Android rendering issues with height calculation. | Low-Medium | Root cause is likely the WebView height reporting via `postMessage` with a 100ms timeout that fires before CDN resources (KaTeX, highlight.js) finish loading. |

## Differentiators

Features that set the product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| Configurable cards-per-session | Users with large card decks get exhausted studying ALL cards. A configurable limit (e.g., 10, 20, 50, All) lets users control session length. Standard in Anki, Quizlet, and every major flashcard app. | Low | `useStudySession` currently loads all filtered cards and picks random unseen ones. Adding a `maxCards` parameter to cap session length is straightforward. Persist in AsyncStorage alongside theme/language. |
| Logo on Dashboard header | Brand reinforcement in the primary screen. Small logo icon in navigation header. | Low | Reuse same logo asset from Login screen. |
| Session length display before starting | Show "X cards available, study Y" before starting, where Y is the configured limit. Helps user set expectations. | Low | Already shows "X cards available" in the ready state. Add the limit display. |
| Language-aware date formatting | Once i18n is in place, "2 hours ago" should become "2 ore fa" in Italian. | Low | Use `Intl.RelativeTimeFormat` (available in Hermes) or i18next formatting plugins. Affects `formatLastStudied()` in DashboardScreen and `formatDuration()` in StudySummaryScreen. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Auto-detect device locale on first launch | Only two languages (IT/EN). Auto-detection adds edge cases (system set to French, Spanish, etc.). Users who want Italian will toggle it explicitly. | Default to English. Provide clear IT/EN toggle in Settings. |
| Per-screen language switching | Over-engineered for a 2-language app. | Single global toggle that applies everywhere instantly. |
| Full localization infrastructure (Crowdin, Lokalise) | Only 2 languages, ~82 strings, single developer. Translation management platforms are overkill. | JSON files (`en.json`, `it.json`) in a `locales/` folder. Developer maintains both directly. |
| Animated logo / splash screen customization | Complexity with native module rebuilds. Expo splash screen works fine as-is with current `splash-icon.png`. | Static logo on Login screen only. Keep existing splash assets. |
| Cards-per-session as a slider | Continuous values (1-500) create decision paralysis. Nobody wants exactly 37 cards. | Preset options: 10, 20, 50, All. Simple radio buttons matching the existing theme toggle pattern. |
| RTL language support | No RTL languages planned. Adding RTL support adds complexity to every layout component. | Only support LTR languages (IT, EN). |
| AI-translated card content | Card content is educational material that must remain in its original language. Translating quiz questions changes the learning context. | Only translate UI chrome (buttons, labels, navigation). Card content and AI-generated questions stay as-authored. |
| react-native-svg for logo rendering | Adds native dependency requiring `prebuild --clean` and APK reinstall. Known event handling issues in Expo SDK 54. | Convert SVG to PNG at multiple densities. Use standard `<Image>` component. |

## Feature Dependencies

```
i18n Context Provider
  |-> i18n toggle in Settings (requires provider wrapping app)
  |-> All screen string extraction (requires provider available)
  |-> Language-aware date formatting (requires current locale)

Logo SVG-to-PNG asset preparation
  |-> Logo on Login screen (requires renderable PNG asset)
  |-> Logo on Dashboard header (same asset, smaller size)

Cards-per-session setting
  |-> AsyncStorage persistence (same pattern as theme/language)
  |-> useStudySession hook modification (accepts maxCards param)
  |-> Settings UI for session length (new settings section)
  |-> "Study Y of X" display on ready screen (requires setting value)

Bottom-sheet bugfix
  |-> No dependencies. Self-contained fix in CardPreviewModal + CardContentView.

Dynamic version
  |-> No dependencies. Import from @lumio/shared already available in monorepo.
```

## Detailed Feature Specifications

### 1. i18n: IT/EN Language Toggle

**Current state:** All ~82 user-facing strings are hardcoded in English across 16 `.tsx` files. The app's PRD is written in Italian and the developer is Italian, but the UI is English-only.

**Expected behavior:**
- Settings screen gets a new "Language" section (below Appearance, above Logout) with two options: English, Italiano
- Toggle persists to AsyncStorage (key: `@lumio/language`)
- On app launch, load persisted language; default to `en` if none stored
- All UI strings update immediately on toggle (no app restart required)
- Card content, question text, and explanations are NOT translated (they come from AI/repos)
- Navigation headers, screen titles, buttons, empty states, toasts, and alerts all translate

**Implementation pattern:** Mirror the existing ThemeContext/ThemeProvider architecture:
1. `lib/i18n.ts` - translation JSON objects for EN/IT, i18n initialization, AsyncStorage persistence helpers
2. `contexts/I18nContext.tsx` - provider with `locale` state, `setLocale()`, `t()` helper
3. `hooks/useI18n.ts` - convenience hook returning `{ t, locale, setLocale }`
4. String extraction across all screens and components

**String count estimate by screen:**

| Screen/Component | Approx. Strings | Notes |
|-----------------|-----------------|-------|
| LoginScreen | 4 | tagline, button label, error, config warning |
| DashboardScreen | 10 | stat labels, empty state, CTA, relative time |
| ReposScreen | 12 | form labels, validation errors, toasts, empty state, delete alert |
| SettingsScreen | 10 | section headers, theme options, language options, logout button, version |
| StudyScreen | 15 | all states (loading, ready, no_cards, studying, completed), navigation buttons, header titles |
| StudySummaryScreen | 8 | title, stat labels, button, duration format |
| Components | 12 | EmptyState, AddRepoForm, ExplanationPanel, RepoListItem, CardPreviewModal |
| Navigation | 5 | tab screen titles, header titles |
| Toasts/Alerts | 8 | success/error/info messages |
| **Total** | **~84** | Conservative estimate; actual count may vary by 5-10 |

**Library recommendation:** `i18next` + `react-i18next` because:
- Most popular React Native i18n library (HIGH confidence, verified via Expo docs and npm download stats)
- Built-in React hooks (`useTranslation`) that fit the app's existing hooks-based architecture
- Language detector plugins for AsyncStorage persistence (`i18next-react-native-async-storage`)
- String interpolation for dynamic values (`{{count}} cards available`)
- The app already uses the same React context + hooks pattern extensively (ThemeContext, AuthContext)
- Alternative `i18n-js` (recommended by Expo official docs) is simpler but lacks hooks integration and has a less active ecosystem

**Confidence:** HIGH - well-established pattern, i18next is the dominant React i18n library

### 2. Logo/Branding Integration

**Current state:** LoginScreen renders `<Text style={[styles.logo, { color: colors.primary }]}>Lumio</Text>` as a text placeholder. SVG logo files exist at repo root:
- `logo.svg` (400x400, transparent background, tri-color pie chart with 3 rays + signature line)
- `logo-circle.svg` (400x400, white circle background variant)
- Brand colors: Amber `#FFA726`, Coral `#FF7061`, Violet `#9C68D4`

**Expected behavior:**
- Login screen: Replace text "Lumio" with the actual logo image (~120x120 px) with "Lumio" text below it as the app name
- Logo should work on both light and dark backgrounds

**Implementation approach -- PNG conversion (recommended):**

| Approach | Pros | Cons | Verdict |
|----------|------|------|---------|
| Convert SVG to PNG assets | No new dependencies, standard `<Image>` component, works on all devices | Loses vector quality at different densities, need @1x/@2x/@3x variants | **Use this** |
| `react-native-svg` + `SvgXml` | Renders SVG directly, vector quality | New native dependency requiring `prebuild --clean` + APK reinstall. Known SDK 54 press event regressions. | Avoid |
| `expo-image` with SVG | Modern image component | May not render complex SVG paths with transforms correctly | Not recommended |

**Why `logo-circle.svg` as source:** The white circle background variant works on both light and dark backgrounds. The transparent variant (`logo.svg`) has a dark signature line (`stroke="#282828"`) that disappears on dark mode.

**Asset preparation steps:**
1. Export `logo-circle.svg` to PNG at 120px, 240px, 360px
2. Place as `assets/logo.png`, `assets/logo@2x.png`, `assets/logo@3x.png`
3. Use `<Image source={require('../assets/logo.png')} style={{ width: 120, height: 120 }} />`

**Confidence:** HIGH - PNG images in React Native are trivial and universally supported

### 3. Configurable Cards-Per-Session

**Current state:** `useStudySession` hook loads ALL filtered cards from all repositories via `getStudyCardsWithQuestions()`, then presents them in random order via `selectRandomCard()`. Session ends when `loadNextQuestion()` returns null (all cards seen). For users with large decks (100+ cards), sessions become exhaustingly long.

**Expected behavior:**
- Settings screen gets a new "Study" section with session length options
- Options: 10, 20, 50, All (matching standard flashcard app patterns)
- Default: All (preserves current behavior, no breaking change)
- Setting persists to AsyncStorage (key: `@lumio/cards-per-session`)
- Study "ready" screen shows "X cards available, studying Y" when limit is set
- Progress bar adjusts to show progress against the limit, not total deck size
- Session completes when limit is reached OR all cards are seen (whichever comes first)

**Key changes in `useStudySession.ts`:**

Current completion logic:
```
const totalCards = session.cards.length;
const seenCount = seenCardIds.current.size;
const cardsRemaining = Math.max(0, totalCards - seenCount);
const progress = totalCards > 0 ? seenCount / totalCards : 0;
```

New completion logic:
```
const effectiveTotal = maxCards > 0 ? Math.min(maxCards, totalCards) : totalCards;
const cardsRemaining = Math.max(0, effectiveTotal - seenCount);
const progress = effectiveTotal > 0 ? seenCount / effectiveTotal : 0;
```

Also add an early completion check in `loadNextQuestion()`:
```
if (seenCardIds.current.size >= effectiveTotal) return null; // triggers 'completed' state
```

**Settings UI:** New "Study" section in SettingsScreen using the identical radio-button pattern as the Appearance section. Options array:
```typescript
const sessionLengthOptions = [
  { value: 10, label: '10 cards' },  // or t('settings.tenCards')
  { value: 20, label: '20 cards' },
  { value: 50, label: '50 cards' },
  { value: 0,  label: 'All cards' }, // 0 means no limit
];
```

**Confidence:** HIGH - straightforward state management, mirrors existing patterns, no external dependencies

### 4. Bottom-Sheet Card Preview Bugfix

**Current state:** `CardPreviewModal` renders a bottom-sheet (80% screen height via `maxHeight: SCREEN_HEIGHT * 0.8`) using React Native `Modal` with `transparent` mode. Inside: drag handle, header, ScrollView wrapping `CardContentView` (WebView with `scrollEnabled={false}`). Users report content cut off at the top.

**Probable root causes (ordered by likelihood):**

1. **WebView height calculation race condition (MOST LIKELY):** In `cardHtml.ts`, content height is reported via a single `setTimeout(() => postMessage({type:'height', value: scrollHeight}), 100)`. KaTeX CSS, highlight.js JS, and marked.js are loaded from CDN. On anything but the fastest connections, these resources have not loaded at 100ms, meaning the height report reflects unstyled/partially-rendered content. The WebView gets sized too small, and content overflows into the clipped area.

2. **ScrollView + WebView nesting on Android:** `CardContentView` sets `scrollEnabled={false}` on the WebView. The parent ScrollView controls scrolling. But if the WebView's reported height is wrong (cause #1), the ScrollView's content is shorter than expected. Content that renders after the height report appears but is clipped at the WebView's fixed height boundary.

3. **Handle/header padding displacement:** The drag handle row adds `paddingTop: 10` + `paddingBottom: 4` (14px) and the header adds `paddingVertical: 12` (24px) + `borderBottomWidth: 1`. These 39px are outside the ScrollView but inside the sheet, reducing available content space. If the WebView calculates its height based on the full sheet height, the top 39px of content would be pushed behind the header.

**Recommended fix approach (simplest first):**

**Option A - Remove ScrollView, enable WebView scrolling (simplest):**
Remove the `ScrollView` wrapper entirely. Set `scrollEnabled={true}` on the WebView. Let the WebView handle its own scrolling. The bottom-sheet's `maxHeight: 0.8 * screenHeight` already constrains size. This eliminates the nested-scroll problem completely.

**Option B - Fix height reporting (if Option A creates other issues):**
In `cardHtml.ts`, replace the single `setTimeout(100)` with progressive height reports:
```javascript
function reportHeight() {
  var h = document.documentElement.scrollHeight;
  window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: h }));
}
setTimeout(reportHeight, 100);
setTimeout(reportHeight, 500);
setTimeout(reportHeight, 1500);
// Also observe DOM changes
new MutationObserver(reportHeight).observe(document.body, { childList: true, subtree: true });
```

In `CardContentView`, update `handleMessage` to always take the maximum reported height:
```typescript
const handleMessage = useCallback((event) => {
  const data = JSON.parse(event.nativeEvent.data);
  if (data.type === 'height' && data.value > 0) {
    setWebViewHeight(prev => Math.max(prev, data.value));
  }
}, []);
```

**Confidence:** MEDIUM - root cause is inferred from code analysis, not confirmed with runtime debugging. The WebView height race condition is the most common cause of this symptom in production React Native apps using WebView + CDN resources.

### 5. Dynamic Version Display

**Current state:** SettingsScreen line 111 hardcodes `Lumio v1.0.0`. The actual version is v1.1.4, managed by `packages/shared/src/version.ts` with auto-release CI that bumps on every `feat:` or `fix:` commit.

**Expected behavior:** Settings screen displays the actual version from `@lumio/shared`.

**Implementation:**
```typescript
// In SettingsScreen.tsx
import { getVersionString } from '@lumio/shared';

// Replace: <Text>Lumio v1.0.0</Text>
// With:    <Text>Lumio {getVersionString()}</Text>
// Renders: "Lumio v1.1.4"
```

**Prerequisite:** Verify `@lumio/shared` is resolvable from the Android app. The app already uses `@lumio/core` (workspace dependency), and `@lumio/shared` is in the same monorepo. The Metro config includes `packages/core/node_modules` in `nodeModulesPaths` for transitive dependencies, so `@lumio/shared` should be accessible. If not, add it as an explicit dependency in `apps/android/package.json`.

**Confidence:** HIGH - trivial one-line change, infrastructure already fully built

## MVP Recommendation

Prioritize by dependency order and effort-to-impact ratio:

1. **Dynamic version display** - 5-minute fix, zero risk, immediately visible improvement
2. **Logo on Login screen** (PNG conversion) - Low effort, high visual polish, no new native dependencies
3. **Bottom-sheet preview bugfix** - Bug fix with clear user impact. Try Option A (remove ScrollView) first
4. **Configurable cards-per-session** - Medium effort, high user value. Mirrors existing settings patterns exactly
5. **i18n IT/EN toggle** - Highest effort (~84 strings across 16 files). Do LAST because it touches every screen and benefits from all other UI changes being finalized first (avoids translating strings that will change during other feature work)

Defer to follow-up:
- **Logo on Dashboard header:** Nice-to-have, not essential. Add after Login logo works.
- **Language-aware date formatting:** Add as enhancement after i18n core works. Can use `Intl.RelativeTimeFormat` which Hermes supports.

## Sources

- [Expo Localization Guide](https://docs.expo.dev/guides/localization/) - Official recommendation for i18n (HIGH confidence)
- [react-i18next documentation](https://react.i18next.com/) - Hooks-based i18n for React/RN (HIGH confidence)
- [i18next AsyncStorage persistence pattern](https://medium.com/@lasithherath00/implementing-react-native-i18n-and-language-selection-with-asyncstorage-b24ae59e788e) - Language persistence (MEDIUM confidence)
- [react-native-svg Expo docs](https://docs.expo.dev/versions/latest/sdk/svg/) - SVG rendering options, SDK 54 issues noted (HIGH confidence)
- [Expo Constants / App versions](https://docs.expo.dev/build-reference/app-versions/) - Version management in Expo (HIGH confidence)
- [WebView + bottom-sheet Android issues](https://github.com/gorhom/react-native-bottom-sheet/issues/499) - Known WebView interaction problems (HIGH confidence)
- [WebView autoheight content cutoff](https://github.com/iou90/react-native-autoheight-webview/issues/179) - Height calculation race conditions (MEDIUM confidence)
- Codebase analysis: All feature specs verified against actual source files in `apps/android/` (HIGH confidence)
