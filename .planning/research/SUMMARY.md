# Project Research Summary

**Project:** Lumio Android v1.2 - i18n, Branding, Configurable Sessions, Bug Fixes
**Domain:** React Native/Expo mobile app enhancement - internationalization retrofit, UI polish, user settings
**Researched:** 2026-02-09
**Confidence:** HIGH

## Executive Summary

This phase enhances an existing React Native flashcard study app with internationalization (Italian/English toggle), branding polish (SVG logo integration), configurable study session lengths, a critical bottom-sheet scroll bugfix, and dynamic version display. The app is built on Expo SDK 54 with React Native 0.81 in a monorepo architecture, using AsyncStorage for preferences and a custom WebView-based card renderer.

The recommended approach is conservative: use Expo's officially endorsed i18n solution (expo-localization + i18n-js), avoid adding new native dependencies where possible (convert SVG to PNG for logo, fix WebView bugs with configuration rather than library replacement), and extend existing patterns (AsyncStorage + Context for settings, matching the theme preference pattern). The most significant work is the i18n retrofit affecting 82+ strings across 16 files, which requires systematic extraction to avoid partial translation issues.

The key risk is the bottom-sheet WebView height calculation bug, which is caused by CDN resource loading timing — KaTeX and highlight.js CSS/fonts may not be loaded within the current 100ms timeout, producing incorrect height measurements. The fix requires event-driven height reporting (ResizeObserver + resource load events) rather than time-based guessing. Secondary risks include incomplete i18n string extraction and SVG-to-component integration complexity if using react-native-svg (mitigated by converting to PNG instead).

## Key Findings

### Recommended Stack

The research validates adding only 3 new dependencies: `expo-localization` (device locale detection), `i18n-js` (translation engine), and optionally `react-native-svg` IF using inline SVG components. However, the PNG conversion approach for the logo eliminates the native rebuild requirement.

**Core technologies:**
- **expo-localization ~17.0.x**: Device locale detection — Expo's official module, auto-linked via config plugin, no native rebuild
- **i18n-js ^4.5.2**: Translation engine — Expo officially recommends this over react-i18next for simple 2-locale apps (15kb vs 45kb), zero native code
- **@react-native-async-storage/async-storage 2.2.0**: Settings persistence — Already installed and used by ThemeContext, extends naturally to language and cards-per-session
- **@lumio/shared VERSION constant**: Dynamic version display — Already available in monorepo, import-only change

**What NOT to add:**
- react-native-svg (requires native rebuild) — use PNG conversion instead
- react-i18next (45kb, overkill for 2 locales)
- @gorhom/bottom-sheet (requires react-native-reanimated not currently installed) — fix existing custom Modal pattern
- Zustand or state management (creates inconsistency with existing Context pattern)

### Expected Features

**Must have (table stakes):**
- **IT/EN language toggle in Settings** — Italian target audience, app feels incomplete with English-only UI
- **Logo on Login screen** — Currently text placeholder with TODO comment, makes app feel unfinished
- **Dynamic version display** — SettingsScreen hardcodes "v1.0.0" while actual version is v1.1.4
- **Bottom-sheet card preview bugfix** — Content reported cut off at top, affects core study workflow

**Should have (competitive):**
- **Configurable cards-per-session** — Users with large decks (100+ cards) get exhausted; limit to 10/20/50/All is standard in Anki/Quizlet
- **Session length display before starting** — Show "Study 20 of 150 cards available" for user expectation setting
- **Language-aware date formatting** — "2 hours ago" becomes "2 ore fa" in Italian (defer to v1.3)

**Defer (v2+):**
- Logo on Dashboard header (nice-to-have brand reinforcement)
- Auto-detect device locale on first launch (unnecessary with explicit toggle)
- AI-translated card content (educational material must remain as-authored)

### Architecture Approach

The architecture extends existing patterns rather than introducing new ones. i18n uses side-effect initialization (import './i18n' in App.tsx, matching the existing import './lib/supabase' pattern). Language and cards-per-session settings follow the AsyncStorage load/save pattern from lib/theme.ts. The logo becomes either a PNG Image component (simplest) or an inline SVG via SvgXml (requires native rebuild). The bottom-sheet bug is fixed by improving the WebView height measurement timing in cardHtml.ts and resetting ScrollView position on card change.

**Major components:**
1. **i18n module (i18n/index.ts + locales/)** — Side-effect initialization with i18n-js, language detector, fallback config. 82+ strings extracted across 16 files organized into namespaces (login, dashboard, study, settings, repos, summary, common).
2. **Settings persistence (lib/studySettings.ts)** — AsyncStorage wrapper for cards-per-session preference (5/10/15/20/All), mirrors existing lib/theme.ts pattern. SettingsScreen gets new "Study" section with radio buttons matching theme toggle UI.
3. **Logo component (components/LumioLogo.tsx OR assets/logo.png)** — Either PNG conversion (no new deps) or SvgXml wrapper (requires react-native-svg + native rebuild). LoginScreen replaces text with image.
4. **WebView height fix (lib/cardHtml.ts)** — Replace setTimeout(100) with ResizeObserver + document.fonts.ready + window.addEventListener('load') for event-driven height reporting. CardContentView adds opacity transition to prevent flash. CardPreviewModal resets ScrollView.scrollTo({y:0}) on card change.

### Critical Pitfalls

1. **WebView height measured before CDN resources load** — Current 100ms timeout races with KaTeX CSS (~230KB) and highlight.js loading. Fix: Use ResizeObserver + resource load events + MutationObserver fallback. Send multiple debounced height updates rather than one-shot measurement. Impact: Directly causes reported "content cut off at top" bug.

2. **ScrollView + WebView gesture conflict on Android** — Even with scrollEnabled={false}, WebView intercepts touch events, freezing parent ScrollView after user touches rendered card area. Fix: Add pointerEvents="none" to WebView wrapper (content is read-only), or remove outer ScrollView entirely and let WebView handle its own scrolling. Impact: Makes card preview unusable on Android.

3. **i18n retrofit missing strings (incomplete extraction)** — With 82+ strings across 16 files, manual extraction misses: Alert.alert() titles/bodies, Toast messages, error messages in catch blocks, props to EmptyState component, template literals (formatLastStudied, formatDuration), navigation titles. Fix: Use provided exhaustive file-by-file inventory. Test by switching to Italian and navigating every screen including error states. Impact: Partial translation creates jarring user experience.

4. **process.env undefined in @lumio/shared at runtime** — VERSION constant works (literal string), but BUILD_INFO.buildNumber/gitSha/buildDate use process.env which is undefined in pre-compiled packages (Expo only inlines EXPO_PUBLIC_* in source files, not node_modules). Fix: Import VERSION or getVersionString() only, not getFullVersionString(). Impact: Version display works, but build metadata always shows dev-local fallback.

5. **SVG Metro transformer conflicts with monorepo config** — Adding react-native-svg-transformer requires modifying metro.config.js which already has custom watchFolders/nodeModulesPaths for monorepo. Incorrect merge breaks @lumio/core imports. Fix: Spread existing config into transformer/resolver changes. Alternative: Use PNG conversion to avoid Metro changes entirely.

## Implications for Roadmap

Based on research, suggested phase structure ordered by: dependencies, risk mitigation, and effort-to-impact ratio.

### Phase 1: Quick Wins (Bugfix + Version Display)
**Rationale:** Fix broken functionality before adding features. Both are low-effort, high-visibility improvements with zero new dependencies.
**Delivers:**
- Bottom-sheet card preview scrolls correctly
- Settings displays actual version (v1.1.4 instead of hardcoded v1.0.0)
**Addresses:** Table stakes (bugfix), polish (version)
**Avoids:** Pitfall 1 (WebView height timing), Pitfall 2 (gesture conflict)
**Estimated effort:** 4-6 hours

### Phase 2: Logo Integration
**Rationale:** Visual polish with single new component, no new native dependencies if using PNG. Should happen before i18n modifies LoginScreen.
**Delivers:**
- Logo replaces text placeholder on LoginScreen
- Optional: Logo in Dashboard header
**Uses:** PNG conversion (no stack changes) OR react-native-svg (requires native rebuild)
**Addresses:** Table stakes (logo)
**Avoids:** Pitfall 5 (Metro config conflicts if using transformer), Pitfall 6 (SDK 54 press event regression)
**Estimated effort:** 2-4 hours (PNG) or 6-8 hours (SVG component)

### Phase 3: Configurable Study Sessions
**Rationale:** Establishes settings infrastructure. Building before i18n means SettingsScreen gets new sections first, then i18n translates final strings (avoids double-editing).
**Delivers:**
- Cards-per-session setting (5/10/15/20/All) in SettingsScreen
- useStudySession hook respects limit
- "Study X of Y" display on ready screen
**Uses:** AsyncStorage (existing), lib/studySettings.ts (new, mirrors lib/theme.ts)
**Implements:** Settings persistence pattern
**Addresses:** Competitive feature (configurable sessions)
**Avoids:** Pitfall 10 (stale closure in useStudySession)
**Estimated effort:** 8-10 hours

### Phase 4: Internationalization (IT/EN Toggle)
**Rationale:** Highest effort (82+ strings across 16 files). Do LAST because it touches every screen — other features finalized first prevents re-translating modified strings.
**Delivers:**
- Language toggle in SettingsScreen (Italian/English)
- All UI strings translated (Login, Dashboard, Study, Summary, Settings, Repos screens + components)
- AsyncStorage persistence
- Language-aware relative time formatting
**Uses:** expo-localization, i18n-js
**Implements:** i18n context with side-effect init pattern
**Addresses:** Table stakes (IT/EN toggle)
**Avoids:** Pitfall 3 (incomplete extraction via systematic file inventory), Pitfall 7 (loading flash via async init), Pitfall 9 (template literals need interpolation params)
**Estimated effort:** 16-20 hours

### Phase Ordering Rationale

- **Bugfix first (Phase 1)**: Broken functionality affects current users. No new code patterns to learn, minimal risk.
- **Logo second (Phase 2)**: Quick visual improvement. If using PNG, zero dependencies. If using SVG, isolates native rebuild risk before other work.
- **Settings third (Phase 3)**: Establishes patterns that i18n will extend (new SettingsScreen sections). useStudySession modification isolated from i18n string extraction.
- **i18n last (Phase 4)**: Touches every file. Doing it after other phases means only one pass of string extraction per file. Reduces merge conflicts and double-work.

Dependency chain:
```
Phase 1 (Bugfix) → No dependencies
Phase 2 (Logo) → No dependencies
Phase 3 (Study settings) → No dependencies on 1 or 2, but SettingsScreen changes
Phase 4 (i18n) → Depends on Phases 1-3 being finalized (translates final strings)
```

### Research Flags

Phases with standard patterns (skip research-phase):
- **Phase 1 (Bugfix):** Well-documented WebView height measurement patterns, project already uses WebView extensively
- **Phase 2 (Logo):** PNG conversion is trivial, SVG integration documented in Expo SDK 54 docs
- **Phase 3 (Settings):** Mirrors existing ThemeContext/AsyncStorage pattern exactly
- **Phase 4 (i18n):** Expo officially documents expo-localization + i18n-js, standard retrofit process

No phases need deeper research. All patterns are either already in the codebase (settings persistence, side-effect init) or well-documented in official Expo/React Native docs (i18n, SVG, WebView).

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All recommendations verified against Expo SDK 54 docs. i18n-js is Expo's official recommendation. Versions confirmed compatible. |
| Features | HIGH | All features verified against existing codebase. String count estimated by direct file inspection. Pitfall risks identified in actual source code. |
| Architecture | HIGH | All patterns mirror existing code (ThemeContext, AsyncStorage, side-effect init). Integration points verified in 13 existing files. |
| Pitfalls | HIGH | Critical pitfalls (WebView height, gesture conflict) confirmed via GitHub issues with exact symptoms. i18n extraction inventory complete. |

**Overall confidence:** HIGH

### Gaps to Address

- **PNG vs SVG logo decision**: Research provides both paths. PNG is simpler (no native rebuild), SVG is more flexible (dynamic theming). Decision should be made in Phase 2 planning based on designer preference.
- **Language-aware date formatting complexity**: Research notes it as a "should-have" but defers implementation approach. If included in Phase 4, use i18next interpolation with relative time params. If complexity is too high, defer to v1.3.
- **Bottom-sheet fix validation**: The height measurement fix uses ResizeObserver which may not be available in older Android WebView versions (pre-2020). If compatibility issues arise, fallback to MutationObserver + window.load events as documented in PITFALLS.md.

## Sources

### Primary (HIGH confidence)
- **Codebase inspection** — All 13 modified files, 4 new files, hooks, contexts, lib patterns verified directly in /home/toto/scm-projects/lumio
- [Expo Localization Guide](https://docs.expo.dev/guides/localization/) — Official i18n recommendation (expo-localization + i18n-js)
- [Expo Localization API](https://docs.expo.dev/versions/latest/sdk/localization/) — getLocales(), useLocales() API
- [Expo SVG Documentation](https://docs.expo.dev/versions/latest/sdk/svg/) — react-native-svg installation and SvgXml usage
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/) — EXPO_PUBLIC_* inlining behavior
- [react-native-webview issue #3715](https://github.com/react-native-webview/react-native-webview/issues/3715) — Height calculation race with ScrollView
- [react-native-webview issue #1395](https://github.com/react-native-webview/react-native-webview/issues/1395) — Android wrong content height
- [react-native-webview issue #2565](https://github.com/react-native-webview/react-native-webview/issues/2565) — ScrollView freezes after WebView press
- [react-native-svg issue #2784](https://github.com/software-mansion/react-native-svg/issues/2784) — SDK 54 onPress regression
- [react-native-svg issue #2796](https://github.com/software-mansion/react-native-svg/issues/2796) — Path press not triggered Expo 54

### Secondary (MEDIUM confidence)
- [i18n-js npm](https://www.npmjs.com/package/i18n-js) — v4.5.2 actively maintained
- [react-native-svg USAGE.md](https://github.com/software-mansion/react-native-svg/blob/main/USAGE.md) — SvgXml component API
- [react-native-svg-transformer README](https://github.com/kristerkari/react-native-svg-transformer) — Metro config setup
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) — React Native 0.81, React 19.1
- [Phrase: React Native i18n with Expo and i18next](https://phrase.com/blog/posts/react-native-i18n-with-expo-and-i18next-part-1/) — Alternative i18n approach (not used)
- [React Native / Expo Starter i18n guide](https://starter.obytes.com/guides/internationalization/) — Community patterns

### Tertiary (LOW confidence)
- [Medium: i18n AsyncStorage persistence](https://medium.com/@lasithherath00/implementing-react-native-i18n-and-language-selection-with-asyncstorage-b24ae59e788e) — Language detector pattern

---
*Research completed: 2026-02-09*
*Ready for roadmap: yes*
