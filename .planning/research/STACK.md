# Technology Stack: Phase 5 Additions

**Project:** Lumio Android - i18n, Logo, Configurable Sessions, Bottom-Sheet Fix
**Researched:** 2026-02-08
**Scope:** NEW libraries and changes only. Existing stack (Expo 54, RN 0.81, etc.) is validated and not re-researched.

---

## Recommended Stack Additions

### i18n (Italian/English Toggle)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| expo-localization | ~17.0.x | Device locale detection | Expo's official module. Provides `getLocales()` and `useLocales()` for detecting device language. Install via `npx expo install expo-localization` to get the SDK 54-compatible version. No native rebuild required -- it is an Expo module with config plugin auto-linking. |
| i18n-js | ^4.5.2 | Translation engine | Expo's officially recommended i18n library (per [Expo Localization Guide](https://docs.expo.dev/guides/localization/)). Lightweight (~15kb), zero native dependencies, built-in fallback logic, pluralization via `make-plural`. Already uses `.mjs` exports but Expo SDK 54 Metro config includes `mjs` in `sourceExts` by default -- verified locally, no metro.config.js changes needed. |

**Why i18n-js over react-i18next:** For a 2-locale app (IT/EN) with ~50-100 string keys, i18n-js is the right weight class. react-i18next adds ~45kb, namespace loading, context API wrapping, and React Suspense integration -- all unnecessary complexity for a simple locale toggle. i18n-js is what Expo officially documents. Use it.

**Why NOT react-intl:** Designed for ICU message format workflows with extraction tools. Overkill for two languages in a mobile app.

**Confidence:** HIGH -- verified with Expo official documentation and local Metro config check.

### SVG Logo Rendering

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| react-native-svg | (Expo-managed) | Render SVG logo on LoginScreen | Install via `npx expo install react-native-svg` to get the SDK 54-compatible version. Provides `SvgXml` component that accepts raw SVG XML strings -- perfect for the existing `logo.svg` and `logo-circle.svg` at repo root. The SVGs use standard `<path>`, `<rect>`, `<line>` elements that react-native-svg handles well. **Requires native rebuild** (prebuild + gradlew + adb install) since it includes native modules. |

**Integration approach:** Convert the existing SVG file content to a TypeScript constant string, render via `<SvgXml xml={logoSvg} width={120} height={120} />`. This avoids needing a Metro SVG transformer, keeps the build simple, and allows easy dark-mode color overrides by string-replacing fill values before passing to SvgXml.

**Why NOT react-native-svg-transformer:** Adds a Metro transformer that converts `.svg` imports to React components at build time. Adds build complexity and requires metro.config.js changes. For 2 static SVG assets, `SvgXml` with string constants is simpler and has zero config overhead.

**Why NOT expo-image or Image component:** Expo's Image component cannot render local SVGs natively. SVGs must be rendered via react-native-svg or converted to PNG first. SVG keeps sharpness at any size and allows dynamic color theming.

**Confidence:** HIGH -- react-native-svg is Expo's official SVG solution, SvgXml API verified via [Expo SVG docs](https://docs.expo.dev/versions/latest/sdk/svg/) and [react-native-svg USAGE.md](https://github.com/software-mansion/react-native-svg/blob/main/USAGE.md).

### Settings Persistence (Cards-per-Session, Language Preference)

| Technology | Version | Purpose | Why |
|------------|---------|---------|-----|
| @react-native-async-storage/async-storage | 2.2.0 (already installed) | Persist user settings | Already in the project and used by ThemeContext for theme preference. Same pattern extends naturally to language preference and cards-per-session count. No new dependency needed. |

**No new library required.** The existing `AsyncStorage` pattern in `lib/theme.ts` (load/save with typed keys) is the right approach for simple key-value settings. Create a parallel `lib/settings.ts` with the same pattern:

```typescript
// Pattern from existing lib/theme.ts -- extend, don't add new deps
const LANGUAGE_KEY = '@lumio/language';
const CARDS_PER_SESSION_KEY = '@lumio/cards-per-session';

export type Language = 'en' | 'it';
export const DEFAULT_CARDS_PER_SESSION = 10; // or whatever the current implicit default is
```

**Why NOT expo-sqlite/kv-store:** The original STACK.md recommended it as an AsyncStorage replacement, but AsyncStorage is already installed, working, and has an established pattern in the codebase. Swapping storage engines mid-project for 2 new keys adds risk for zero benefit. If the app grows to 20+ settings, revisit.

**Why NOT Zustand or a state management library for settings:** The existing pattern uses React Context (ThemeContext) with AsyncStorage. Adding a Zustand store just for settings would create two state management patterns. Stay consistent with what exists.

**Confidence:** HIGH -- using already-installed library with proven pattern.

---

## No New Libraries Needed

### Bottom-Sheet Scroll Fix

**No new dependency.** The `CardPreviewModal` uses a custom bottom-sheet implementation (React Native `Modal` + `ScrollView` + `CardContentView` which wraps `WebView`). The scroll bug is a known Android issue with `WebView` inside `ScrollView` inside `Modal`.

The fix is code-level, not library-level:

1. **WebView `scrollEnabled={false}` is already set** in `CardContentView.tsx` (line 59). The WebView reports its content height via `postMessage` and sizes itself accordingly. This is the correct pattern.

2. **The real issue:** The `ScrollView` wrapping the `WebView` in `CardPreviewModal.tsx` (line 110-124) may not scroll properly on Android because the WebView's height reporting can race with ScrollView layout. The fix involves:
   - Adding `nestedScrollEnabled={true}` to the ScrollView
   - Ensuring the WebView height is fully resolved before ScrollView attempts to measure content
   - Consider wrapping content in a `View` with `onLayout` to force remeasure

3. **If `nestedScrollEnabled` alone doesn't fix it:** The `opacity: 0.99` hack on the WebView (line 58 of `CardContentView.tsx`) forces hardware acceleration on Android, which is good. But adding `overScrollMode="never"` to the ScrollView can help prevent gesture conflicts.

**Why NOT @gorhom/bottom-sheet:** It is a well-maintained library (v5, Reanimated + GestureHandler based), but the app already has a working custom bottom-sheet Modal pattern. Replacing it with @gorhom/bottom-sheet would require adding `react-native-reanimated` as a dependency (which is NOT currently installed despite the original STACK.md suggesting it), updating the Babel config, and doing a native rebuild. For one scroll bug, this is too much churn.

**Confidence:** HIGH -- WebView-in-ScrollView scroll issues on Android are well-documented and fixable with props.

### Dynamic Version Display

**No new dependency.** `@lumio/shared` already exports `VERSION`, `getVersionString()`, and `getFullVersionString()`. The `SettingsScreen.tsx` currently hardcodes `"Lumio v1.0.0"` (line 112). Fix is a one-line import change:

```typescript
import { getVersionString } from '@lumio/shared';
// Then use: {`Lumio ${getVersionString()}`}
```

**Confidence:** HIGH -- the code already exists in `packages/shared/src/version.ts`.

---

## Installation Summary

```bash
# New dependencies (run from monorepo root)
cd /home/toto/scm-projects/lumio

# i18n libraries (no native rebuild needed for these)
pnpm --filter @lumio/android exec -- npx expo install expo-localization
pnpm --filter @lumio/android add i18n-js

# SVG rendering (REQUIRES native rebuild)
pnpm --filter @lumio/android exec -- npx expo install react-native-svg
```

### Post-Install: Native Rebuild Required

Because `react-native-svg` includes native modules:

```bash
cd apps/android
npx expo prebuild --platform android --clean
cd android && ./gradlew assembleDebug
adb install -r app/build/outputs/apk/debug/app-debug.apk
```

`expo-localization` and `i18n-js` do NOT require a native rebuild -- they work with the existing dev client.

---

## Metro Configuration

**No changes needed.** Verified locally that Expo SDK 54's default Metro config already includes `mjs` in `sourceExts`:

```
sourceExts: ["ts","tsx","mjs","js","jsx","json","cjs","scss","sass","css"]
```

The existing `metro.config.js` at `apps/android/metro.config.js` extends the default config for monorepo support. No modifications required for i18n-js or react-native-svg.

---

## Alternatives Considered

| Category | Recommended | Alternative | Why Not |
|----------|-------------|-------------|---------|
| i18n engine | i18n-js | react-i18next | Overkill for 2 locales. 3x larger bundle. Expo docs recommend i18n-js. |
| i18n engine | i18n-js | Lingui | Metro transformer setup, message extraction workflow -- too heavy for IT/EN toggle |
| Locale detection | expo-localization | react-native-localize | expo-localization is the Expo ecosystem answer. react-native-localize is for bare RN. |
| SVG rendering | react-native-svg (SvgXml) | react-native-svg-transformer | Transformer adds metro config complexity for 2 SVG files. SvgXml is simpler. |
| SVG rendering | react-native-svg (SvgXml) | Convert SVG to PNG | Loses resolution independence and dynamic dark-mode color swaps |
| Settings storage | AsyncStorage (existing) | expo-sqlite/kv-store | Existing pattern works. Don't swap storage for 2 new keys. |
| Settings storage | AsyncStorage (existing) | Zustand persist | Would introduce second state management pattern. ThemeContext pattern is consistent. |
| Bottom-sheet | Custom Modal (existing) | @gorhom/bottom-sheet | Requires react-native-reanimated (not installed), native rebuild, Babel config changes. Over-engineered for one scroll fix. |

---

## Integration Points

### i18n Architecture

Create a centralized i18n module that mirrors the ThemeContext pattern:

```
apps/android/
  lib/i18n.ts              # i18n instance, translations, init
  contexts/I18nContext.tsx  # Provider + useI18n hook
  hooks/useI18n.ts         # Re-export convenience
  locales/
    en.ts                  # English strings
    it.ts                  # Italian strings
```

The i18n provider should:
1. Load saved language preference from AsyncStorage on mount
2. Fall back to device locale via `getLocales()[0].languageCode`
3. Fall back to `'en'` if device locale is neither `'en'` nor `'it'`
4. Provide `t()` function and `setLanguage()` to children

### Settings Architecture

Extend the existing pattern in `lib/theme.ts` to a broader `lib/settings.ts`:

```
apps/android/
  lib/settings.ts           # load/save for all settings (cardsPerSession, language)
  contexts/SettingsContext.tsx  # OR extend ThemeContext to AppSettingsContext
```

Key decision: either create a separate SettingsContext or fold language + cardsPerSession into the existing ThemeContext (renaming it to AppSettingsContext). The latter reduces provider nesting. Recommend the fold approach.

### Logo Integration

```
apps/android/
  assets/logo.ts            # SVG XML string constants (copied from repo root SVGs)
  components/LumioLogo.tsx   # Wrapper component with size/color props
```

The LoginScreen currently shows `<Text style={styles.logo}>Lumio</Text>` (line 54). Replace with the `LumioLogo` component.

### Screens Needing i18n String Extraction

| Screen/Component | Estimated Strings | Priority |
|-----------------|-------------------|----------|
| LoginScreen.tsx | 4 (tagline, sign in, errors) | HIGH |
| DashboardScreen.tsx | 8 (stats labels, CTA, empty state) | HIGH |
| StudyScreen.tsx | 15 (states, buttons, alerts) | HIGH |
| SettingsScreen.tsx | 8 (section headers, options, version) | HIGH |
| StudySummaryScreen.tsx | 6 (results labels) | MEDIUM |
| ReposScreen.tsx | 5 (headers, empty state) | MEDIUM |
| Components (shared) | 10 (EmptyState, OfflineBanner, etc.) | MEDIUM |
| **Total** | **~56 strings** | |

---

## What NOT to Add

| Avoid | Why |
|-------|-----|
| react-native-reanimated | Not needed for any Phase 5 feature. Only add if/when gesture animations become a requirement. |
| NativeWind / Tailwind | Project uses StyleSheet API throughout. Introducing NativeWind now would create two styling patterns. |
| Zustand | Settings are simple key-value pairs. Context + AsyncStorage pattern is already established. |
| @gorhom/bottom-sheet | Custom Modal pattern works. Fix the scroll bug, don't replace the component. |
| react-native-svg-transformer | Metro transformer overhead for 2 SVG files is not justified. |
| Any translation management platform (Crowdin, Lokalise) | 2 locales, ~56 strings. A `locales/en.ts` and `locales/it.ts` file pair is sufficient. |

---

## Version Compatibility Matrix

| Package | Compatible With | Requires Native Rebuild | Notes |
|---------|-----------------|------------------------|-------|
| expo-localization ~17.0.x | Expo SDK 54 | No | Expo module, auto-linked via config plugin |
| i18n-js ^4.5.2 | Any JS runtime | No | Pure JavaScript, no native code |
| react-native-svg (Expo-managed) | Expo SDK 54 | YES | Native rendering engine, must rebuild APK |
| @react-native-async-storage 2.2.0 | Already installed | No | No change |
| @lumio/shared (VERSION) | Already available | No | Import change only |

---

## Sources

### Official Documentation (HIGH confidence)
- [Expo Localization Guide](https://docs.expo.dev/guides/localization/) -- Recommends expo-localization + i18n-js
- [Expo Localization API](https://docs.expo.dev/versions/latest/sdk/localization/) -- getLocales(), useLocales() API
- [Expo SVG Documentation](https://docs.expo.dev/versions/latest/sdk/svg/) -- react-native-svg installation and usage
- [react-native-svg USAGE.md](https://github.com/software-mansion/react-native-svg/blob/main/USAGE.md) -- SvgXml component API

### Verified Locally (HIGH confidence)
- Expo SDK 54 Metro default `sourceExts` includes `mjs` -- confirmed via `getDefaultConfig()` output
- AsyncStorage 2.2.0 already installed and used by ThemeContext
- `@lumio/shared` exports `VERSION`, `getVersionString()`, `getFullVersionString()`
- `logo.svg` and `logo-circle.svg` use standard SVG elements compatible with react-native-svg
- `CardPreviewModal.tsx` uses custom Modal+ScrollView pattern, WebView has `scrollEnabled={false}`
- `metro.config.js` already configured for monorepo, no changes needed

### WebSearch (MEDIUM confidence, verified against official docs)
- [i18n-js npm](https://www.npmjs.com/package/i18n-js) -- v4.5.2, actively maintained
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) -- React Native 0.81, React 19.1
- [WebView scroll issues](https://github.com/react-native-webview/react-native-webview/issues/22) -- nestedScrollEnabled fix pattern

---

*Stack research for: Lumio Phase 5 -- i18n, Logo, Configurable Sessions, Bottom-Sheet Fix*
*Researched: 2026-02-08*
