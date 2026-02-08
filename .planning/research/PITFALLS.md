# Domain Pitfalls

**Domain:** Adding i18n, SVG branding, configurable study sessions, bottom-sheet bugfix, and dynamic versioning to existing React Native/Expo Android app
**Researched:** 2026-02-09

---

## Critical Pitfalls

Mistakes that cause rewrites or major issues.

### Pitfall 1: WebView Height Measurement Fires Before CDN Resources Load

**What goes wrong:** The current `cardHtml.ts` reports height via `setTimeout(fn, 100)` after rendering (line 222-228). This 100ms delay races against CDN-loaded KaTeX CSS (~230KB), highlight.js CSS/JS (~40KB), and marked.js. On slow connections, these resources are not yet loaded when `document.documentElement.scrollHeight` executes, producing an incorrect height. Content gets cut off, and on Android specifically, the reported `scrollHeight` can also be inflated initially and then shrink as layout stabilizes, causing visual jumps.

**Why it happens:** The `setTimeout(100)` is a guess, not event-driven. CDN resources may take 200-500ms+ to load on mobile networks. The height is measured once and never re-measured, even as CSS changes the layout after load.

**Consequences:** Content visually cut off in the CardPreviewModal bottom sheet. The reported bug ("content cut off at top") is a direct symptom: the WebView height is set wrong, and the ScrollView clips incorrectly. The combination of `androidLayerType="hardware"` and `opacity: 0.99` (rendering workaround in `CardContentView.tsx` line 58) adds further layout unpredictability.

**Prevention:**
- Replace `setTimeout(100)` with a `ResizeObserver` on the content div, or use `load` events on `<link>` and `<script>` elements to wait for all CDN resources before measuring.
- Use a `MutationObserver` as a fallback for older Android WebView versions lacking `ResizeObserver`.
- Send multiple height updates (debounced) rather than a single one-shot measurement.
- Example pattern:
  ```javascript
  Promise.all([
    new Promise(r => document.fonts.ready.then(r)),
    ...Array.from(document.querySelectorAll('link[rel=stylesheet]')).map(
      link => new Promise(r => { link.onload = r; link.onerror = r; })
    ),
  ]).then(() => {
    var height = document.documentElement.scrollHeight;
    window.ReactNativeWebView.postMessage(JSON.stringify({ type: 'height', value: height }));
  });
  // Also observe for dynamic changes
  new ResizeObserver(() => {
    clearTimeout(window._ht);
    window._ht = setTimeout(() => {
      window.ReactNativeWebView.postMessage(
        JSON.stringify({ type: 'height', value: document.documentElement.scrollHeight })
      );
    }, 50);
  }).observe(document.getElementById('content'));
  ```

**Detection:** Content is cut off in CardPreviewModal; different card content lengths show inconsistent clipping. Testing on throttled network makes it dramatically worse.

**Confidence:** HIGH -- verified by reading `cardHtml.ts` (line 222-228) and corroborated by [react-native-webview issue #3715](https://github.com/react-native-webview/react-native-webview/issues/3715) and [issue #1395](https://github.com/react-native-webview/react-native-webview/issues/1395).

---

### Pitfall 2: ScrollView + WebView(scrollEnabled=false) Gesture Conflict on Android

**What goes wrong:** The `CardPreviewModal` wraps a `CardContentView` (WebView with `scrollEnabled={false}`) inside a `ScrollView`. On Android, even with `scrollEnabled={false}`, the WebView's internal gesture handling intercepts touch events, causing the parent ScrollView to stop scrolling entirely after the user interacts with the WebView area.

**Why it happens:** Android's native `WebView` has its own touch event pipeline separate from React Native's gesture system. Setting `scrollEnabled={false}` on the RN side does not fully disable the native WebView's gesture interception. When a user touches inside the WebView area, Android's WebView consumes `ACTION_MOVE` events before they bubble to the parent ScrollView.

**Consequences:** Users cannot scroll the card preview content on Android after touching inside the rendered card area. This makes the feature appear broken for any card with content taller than the visible area.

**Prevention:**
- Set `nestedScrollEnabled={false}` on the WebView explicitly.
- Add `pointerEvents="none"` to a View wrapper around the WebView since card previews are read-only, allowing all touch events to pass through to the parent ScrollView.
- As a more robust alternative, replace the ScrollView/WebView pattern with a single WebView that handles its own scrolling internally (remove outer ScrollView, set `scrollEnabled={true}` on WebView). The header/close button can be positioned absolutely above it.

**Detection:** On a physical Android device (not emulator), try scrolling a card preview where content is taller than the bottom sheet. After touching inside the WebView area, the ScrollView will freeze.

**Confidence:** HIGH -- documented in the project's own MEMORY.md ("Swipe gestures conflict with ScrollView inside child components") and confirmed by [react-native-webview issue #2565](https://github.com/react-native-webview/react-native-webview/issues/2565).

---

### Pitfall 3: i18n Retrofit Missing Strings (Incomplete Extraction)

**What goes wrong:** When retrofitting i18n into an app with all hardcoded English strings, developers find and translate the obvious JSX strings but miss: `Alert.alert()` titles/bodies, Toast messages, error messages in catch blocks, strings passed as props to reusable components (like `EmptyState`'s `title`/`subtitle`/`actionLabel`), template literals with embedded values (e.g., `` `${diffMinutes}m ago` ``), and navigation header titles.

**Why it happens:** Automated extraction tools only find `t('key')` calls. During a retrofit, the process is manual. Without a systematic screen-by-screen audit, strings get missed. The Lumio codebase has approximately 55+ user-visible string literals across 11 files (6 screens + 5 components), plus strings in `formatLastStudied()` and `formatDuration()` helper functions.

**Consequences:** A partially-translated app is worse than an untranslated one. Users will see a mix of English and Italian, creating a jarring experience. Strings in Alerts and Toasts are particularly easy to miss because they are inline in handler functions rather than in JSX.

**Prevention:**
- Create a complete inventory before starting. Here is the exhaustive list for Lumio:
  - **`DashboardScreen.tsx`**: "Not yet", "Just now", `${n}m ago`, `${n}h ago`, `${n}d ago`, "No Repositories Yet", "Add a repository to start studying...", "Go to Repositories", "Repositories", "Cards", "Last Studied", "Start Study Session"
  - **`StudyScreen.tsx`**: "End Session?", "Your progress will be saved.", "Continue Studying", "End Session", "Card skipped", "Study", "Review", "Loading cards...", "No cards available", "Questions are being prepared. Try again in a few minutes.", "Back to Dashboard", "Ready to study", `${n} cards available`, "Start", "Loading question...", "Prev Card", "Next Card", "Finish", "Back to Current Card", "Skip", "Skipping...", "Session Complete", "You studied all available cards"
  - **`LoginScreen.tsx`**: "Lumio", "Your flashcards, supercharged", "Sign in with Google", "Sign in failed", "Google Sign-In not configured."
  - **`StudySummaryScreen.tsx`**: "Session Complete!", "Score", "Correct", "Incorrect", "Skipped", "Time", "Return to Dashboard", `${n}m ${n}s`, `${n}s`
  - **`SettingsScreen.tsx`**: "Signed in as", "Unknown user", "Appearance", "System", "Light", "Dark", "Log out", "Lumio v1.0.0"
  - **`ReposScreen.tsx`**: Various repo-related strings (titles, empty states, form labels)
  - **`CardPreviewModal.tsx`**: "Card Content", "No card content to display"
  - **`EmptyState.tsx`**: Receives strings as props -- callers must translate
  - **`AddRepoForm.tsx`**: Form labels and validation messages
- Use `eslint-plugin-i18next` or a custom ESLint rule to flag untranslated string literals in JSX.
- Do a final pass by switching to Italian and testing every screen including error paths and empty states.

**Detection:** Switch app to Italian and methodically navigate every screen, trigger every Alert/Toast, and exercise every empty/error state. Any English text is a missed string.

**Confidence:** HIGH -- directly verified by reading all source files.

---

### Pitfall 4: process.env in @lumio/shared Being Undefined at Runtime

**What goes wrong:** The `@lumio/shared` package uses `process.env.BUILD_NUMBER`, `process.env.COMMIT_SHA`, and `process.env.BUILD_DATE` in `version.ts` (lines 16-17). These will be `undefined` at runtime in the React Native app because: (1) Expo only inlines `EXPO_PUBLIC_*` variables, and (2) inlining does not apply to code in `node_modules` or pre-compiled packages.

**Why it happens:** `@lumio/shared` is compiled by `tsup` into `dist/index.js` before consumption. By the time Metro bundles the Android app, the `process.env.BUILD_NUMBER` references are literal `process.env` lookups, not Expo-inlined constants. Expo/Metro only replaces `process.env.EXPO_PUBLIC_*` in source files it compiles directly, not pre-compiled packages.

**Consequences:** `getFullVersionString()` returns `v1.1.4 (dev-local)` even in production. The version constant (`VERSION = "1.1.4"`) works because it is a literal string, but build metadata always shows fallback values.

**Prevention:**
- For the version display in SettingsScreen, import `VERSION` or `getVersionString()` from `@lumio/core` (which re-exports from `@lumio/shared`). The version constant works correctly because it is a literal.
- Do NOT rely on `BUILD_INFO.buildNumber`, `BUILD_INFO.gitSha`, or `BUILD_INFO.buildDate` in the Android app.
- If build metadata is needed, use `expo-constants` (`Constants.expoConfig.version`) or `EXPO_PUBLIC_*` environment variables in the app's own code.
- When replacing the hardcoded `"Lumio v1.0.0"` in `SettingsScreen.tsx` (line 111), use: `import { getVersionString } from '@lumio/core';` which returns `"v1.1.4"`.

**Detection:** Call `getFullVersionString()` in the running app and check if build number and git SHA show as "dev" and "local".

**Confidence:** HIGH -- verified by reading `version.ts`, `tsup` build config, and [Expo environment variables documentation](https://docs.expo.dev/guides/environment-variables/).

---

## Moderate Pitfalls

### Pitfall 5: SVG Metro Transformer Conflicting with Existing Metro Config

**What goes wrong:** Adding `react-native-svg-transformer` requires modifying `metro.config.js` to change `babelTransformerPath` and move "svg" from `assetExts` to `sourceExts`. The existing `metro.config.js` already has custom config for the monorepo (`watchFolders`, `nodeModulesPaths`, `disableHierarchicalLookup`). Incorrectly merging these configurations breaks either SVG imports or monorepo package resolution.

**Prevention:**
- Merge into the existing config rather than replacing it. The SVG changes go into `config.transformer` and `config.resolver`, which must be spread with existing settings:
  ```javascript
  // Add to existing metro.config.js AFTER the current resolver config
  config.transformer = {
    ...config.transformer,
    babelTransformerPath: require.resolve("react-native-svg-transformer/expo"),
  };
  config.resolver = {
    ...config.resolver,
    assetExts: config.resolver.assetExts.filter(ext => ext !== "svg"),
    sourceExts: [...config.resolver.sourceExts, "svg"],
  };
  ```
- The existing config uses `getDefaultConfig` from `expo/metro-config` which is compatible with `react-native-svg-transformer/expo`.
- Test that `@lumio/core` imports still resolve correctly after the change.
- Add TypeScript declaration for `.svg` imports (see Pitfall 12).

**Confidence:** HIGH -- verified the existing `metro.config.js` structure and [react-native-svg-transformer Expo setup](https://github.com/kristerkari/react-native-svg-transformer).

---

### Pitfall 6: SVG Press Events Broken on Expo SDK 54

**What goes wrong:** If the logo SVG has interactive elements (pressable areas, links), they will not work on Expo SDK 54 with react-native-svg. There is a known regression where press events are only detected for the last rendered SVG element, and absolutely-positioned SVGs lose all press handling.

**Prevention:**
- For a static logo, this is a non-issue -- static SVG rendering works fine.
- Do NOT make the logo SVG pressable. If the logo needs to be tappable, wrap it in a `TouchableOpacity` or `Pressable` rather than using SVG's `onPress` prop.
- Track [react-native-svg issue #2784](https://github.com/software-mansion/react-native-svg/issues/2784) and [#2796](https://github.com/software-mansion/react-native-svg/issues/2796) for fixes.

**Confidence:** HIGH -- confirmed by GitHub issues specifically mentioning Expo SDK 54.

---

### Pitfall 7: i18n Language Preference Loading Race Condition

**What goes wrong:** The i18next `languageDetector` plugin reads from AsyncStorage on app startup. AsyncStorage is async, but i18next initialization is sync. If the language preference has not loaded when the first screen renders, the app briefly flashes in the wrong language (typically the fallback) before switching.

**Prevention:**
- Use a "loading" state in the i18n provider that blocks rendering until the stored language is loaded, matching the existing `ThemeProvider` pattern.
- Since Lumio only supports EN/IT toggle (not auto-detecting device locale), skip the `languageDetector` plugin. Load the preference from AsyncStorage in a context provider and call `i18n.changeLanguage()` imperatively:
  ```typescript
  // Follow ThemeProvider pattern (ThemeContext.tsx lines 44-48)
  useEffect(() => {
    loadLanguagePreference().then((lang) => {
      i18n.changeLanguage(lang);
      setReady(true);
    });
  }, []);
  ```
- The existing `ThemeContext.tsx` already demonstrates this exact async-load-before-render pattern.

**Detection:** Set language to Italian, kill the app, reopen. Watch for a brief flash of English text before Italian loads.

**Confidence:** MEDIUM -- based on documented async nature of AsyncStorage and standard i18next patterns; ThemeProvider shows the correct pattern already in use.

---

### Pitfall 8: Separate AsyncStorage Keys vs. Single Settings Object

**What goes wrong:** The current codebase stores theme under `@lumio/theme-preference`. Adding i18n and cards-per-session means either: (A) two more separate keys with 3+ independent reads on startup, or (B) migrating to a single settings object, risking data loss during migration.

**Prevention:**
- Use separate keys. Three small AsyncStorage reads in parallel via `Promise.all` are fast enough and avoid migration complexity:
  ```typescript
  const [theme, language, cardsPerSession] = await Promise.all([
    loadThemePreference(),
    loadLanguagePreference(),
    loadCardsPerSession(),
  ]);
  ```
- Use consistent naming: `@lumio/theme-preference`, `@lumio/language-preference`, `@lumio/cards-per-session`.
- Do NOT use a single JSON blob. If the JSON gets corrupted (partial write, app crash), all settings are lost. Individual keys provide fault isolation.

**Detection:** Verify changing one setting does not affect others. Verify app startup time with all three settings stored.

**Confidence:** HIGH -- based on AsyncStorage best practices and the existing codebase pattern.

---

### Pitfall 9: i18n Interpolation Breaking with Dynamic Format Functions

**What goes wrong:** `formatLastStudied()` in `DashboardScreen.tsx` returns strings like `` `${diffMinutes}m ago` ``. `formatDuration()` returns `` `${minutes}m ${seconds}s` ``. Simply wrapping these in `t()` does not work because the variable parts need to be interpolation parameters, and different languages structure these differently (Italian: "5 minuti fa" vs English: "5m ago").

**Prevention:**
- Use i18next interpolation for all dynamic strings:
  ```json
  // en.json
  { "time.minutesAgo": "{{count}}m ago", "time.justNow": "Just now" }
  // it.json
  { "time.minutesAgo": "{{count}} min fa", "time.justNow": "Adesso" }
  ```
- If pluralization is needed later (Italian: "1 ora fa" vs "2 ore fa"), use i18next's plural support with `_one`/`_other` suffixes.
- Audit all functions that construct strings with embedded numbers.

**Detection:** Check translations make grammatical sense in Italian. Template literal strings with embedded values always need interpolation params.

**Confidence:** HIGH -- directly observed `formatLastStudied()` and `formatDuration()` in source code.

---

### Pitfall 10: Cards-Per-Session Config Using Stale Closure or Wrong Limit Point

**What goes wrong:** Adding a "cards per session" setting requires modifying `useStudySession` to stop after N cards. A naive implementation either: (A) limits the initial `cards` array (breaking random selection since fewer cards means less variety), or (B) checks the count in `handleNext` but uses a stale closure of the config value.

**Prevention:**
- Add the limit check in `handleNext` by comparing `session.answeredCards.length + session.skippedCount` against the maximum:
  ```typescript
  const totalSeen = session.answeredCards.length + session.skippedCount;
  if (totalSeen >= maxCardsPerSession) {
    setSession(prev => ({ ...prev, state: 'completed' }));
    return;
  }
  ```
- Load cards-per-session once at session start (from SettingsContext), store in a `useRef` to avoid stale closures.
- Use `Infinity` as default if no preference is set, preserving backward compatibility.
- Do NOT filter the initial `cards` array -- the session needs all cards for random selection.

**Detection:** Set cards-per-session to 3, start a session with 10+ cards. Verify session completes after exactly 3 cards (answered + skipped).

**Confidence:** HIGH -- directly observed the `useStudySession` hook and its `handleNext` closure patterns.

---

## Minor Pitfalls

### Pitfall 11: WebView react-native-webview v13.13.2+ ScrollView Rendering Regression

**What goes wrong:** react-native-webview v13.13.2 introduced a regression where WebViews wrapped in ScrollView may not render on Android with React Native 0.77+. The project uses v13.16.0 with RN 0.81.5.

**Prevention:**
- Ensure the parent ScrollView has `contentContainerStyle={{ flexGrow: 1 }}` (current code has this).
- If blank rendering occurs, pin to v13.12.5 as a temporary workaround.
- Monitor [react-native-webview issue #3715](https://github.com/react-native-webview/react-native-webview/issues/3715).

**Confidence:** MEDIUM -- potentially affected version but may not manifest depending on exact conditions.

---

### Pitfall 12: Missing TypeScript Declarations for SVG Imports

**What goes wrong:** After setting up `react-native-svg-transformer`, importing SVG files with `import Logo from './logo.svg'` produces a TypeScript error: "Cannot find module './logo.svg'". The app runs but TypeScript errors clutter CI and IDE.

**Prevention:**
- Create `apps/android/declarations.d.ts`:
  ```typescript
  declare module '*.svg' {
    import React from 'react';
    import { SvgProps } from 'react-native-svg';
    const content: React.FC<SvgProps>;
    export default content;
  }
  ```
- Ensure `tsconfig.json` includes this declaration file.

**Confidence:** HIGH -- standard requirement documented in react-native-svg-transformer README.

---

### Pitfall 13: StatusBar Style Not Adapting to Theme

**What goes wrong:** The current `App.tsx` hard-codes `<StatusBar style="light" />` (line 22). This is a pre-existing bug: the status bar is always light regardless of theme preference. When adding settings, this becomes more visible as users interact more with Settings.

**Prevention:**
- Change to `<StatusBar style={isDark ? 'light' : 'dark'} />` and move it inside `ThemeProvider` where `isDark` is available. Fix as part of the settings screen updates.

**Confidence:** HIGH -- directly observed in `App.tsx` line 22.

---

### Pitfall 14: Bottom Sheet Height Cached from Static Dimensions.get()

**What goes wrong:** `CardPreviewModal` calculates `SCREEN_HEIGHT = Dimensions.get('window').height` at module load time (line 130). If window dimensions change (keyboard visible when module first imported, screen rotation, split-screen mode), the bottom sheet `maxHeight` (80% of screen) will be wrong.

**Prevention:**
- Use `useWindowDimensions()` hook instead of `Dimensions.get()` at module scope:
  ```typescript
  const { height: screenHeight } = useWindowDimensions();
  // Then in style: maxHeight: screenHeight * 0.8
  ```

**Detection:** Open the app in split-screen mode or rotate the device. The bottom sheet will have incorrect height.

**Confidence:** HIGH -- directly observed in `CardPreviewModal.tsx` line 130.

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Bottom-sheet bugfix (WebView height) | Pitfall 1: Height measured before CDN loads | Use ResizeObserver + resource load events instead of setTimeout(100) |
| Bottom-sheet bugfix (scroll) | Pitfall 2: ScrollView freezes after WebView touch | Use pointerEvents="none" wrapper since content is read-only |
| Bottom-sheet bugfix (dimensions) | Pitfall 14: Static Dimensions.get at module scope | Replace with useWindowDimensions() hook |
| i18n: String extraction | Pitfall 3: Incomplete extraction, ~55 strings across 11 files | Use provided exhaustive file-by-file inventory |
| i18n: Interpolated strings | Pitfall 9: Template literals need i18next interpolation params | Convert formatLastStudied/formatDuration to use t() with params |
| i18n: Initialization | Pitfall 7: Flash of wrong language on startup | Follow existing ThemeProvider pattern for async load |
| i18n: Settings persistence | Pitfall 8: Separate keys vs single settings object | Use separate keys, parallel load via Promise.all |
| Dynamic version | Pitfall 4: process.env undefined in pre-built shared package | Import VERSION constant (not BUILD_INFO) from @lumio/core |
| SVG logo setup | Pitfall 5: Metro config merge breaks monorepo resolution | Merge carefully into existing config, test @lumio/core imports |
| SVG press events | Pitfall 6: SDK 54 regression for interactive SVGs | Use Pressable wrapper, not SVG onPress prop |
| Cards-per-session | Pitfall 10: Stale closure or wrong limit point in useStudySession | Count answered+skipped in handleNext, store limit in ref |
| WebView rendering | Pitfall 11: v13.13.2+ regression on Android | Ensure flexGrow: 1 on ScrollView container |
| SVG TypeScript | Pitfall 12: Missing module declarations | Add declarations.d.ts for *.svg |
| StatusBar | Pitfall 13: Fixed to "light" regardless of theme | Fix when updating SettingsScreen |

---

## Sources

- [react-native-webview issue #3715: WebView v13.13.2 cannot render with ScrollView on Android](https://github.com/react-native-webview/react-native-webview/issues/3715) -- HIGH confidence
- [react-native-webview issue #1395: Android gives wrong content height](https://github.com/react-native-webview/react-native-webview/issues/1395) -- HIGH confidence
- [react-native-webview issue #2565: ScrollView not working after WebView pressed on Android](https://github.com/react-native-webview/react-native-webview/issues/2565) -- HIGH confidence
- [react-native-svg issue #2784: SVG onPress broken in Expo SDK 54](https://github.com/software-mansion/react-native-svg/issues/2784) -- HIGH confidence
- [react-native-svg issue #2796: Path onPress not triggered since Expo 54](https://github.com/software-mansion/react-native-svg/issues/2796) -- HIGH confidence
- [react-native-svg-transformer README: Expo Metro config setup](https://github.com/kristerkari/react-native-svg-transformer) -- HIGH confidence
- [Expo: Environment Variables docs](https://docs.expo.dev/guides/environment-variables/) -- HIGH confidence
- [Expo: Monorepo guide](https://docs.expo.dev/guides/monorepos/) -- HIGH confidence
- [react-i18next documentation](https://react.i18next.com/) -- HIGH confidence
- [Expo Localization SDK docs](https://docs.expo.dev/versions/latest/sdk/localization/) -- HIGH confidence
- Lumio codebase direct inspection: `CardPreviewModal.tsx`, `CardContentView.tsx`, `cardHtml.ts`, `ThemeContext.tsx`, `SettingsScreen.tsx`, `StudyScreen.tsx`, `useStudySession.ts`, `DashboardScreen.tsx`, `LoginScreen.tsx`, `StudySummaryScreen.tsx`, `version.ts`, `metro.config.js`, `App.tsx` -- PRIMARY source

---
*Pitfalls research for: Lumio v1.2 milestone (i18n, branding, configurable sessions, bottom-sheet bugfix, dynamic versioning)*
*Researched: 2026-02-09*
