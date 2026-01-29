# Stack Research: React Native Android for Lumio

**Domain:** Native Android app (React Native/Expo) for study flashcards
**Researched:** 2026-01-29
**Confidence:** HIGH (verified with official documentation and recent sources)

---

## Executive Summary

For migrating Lumio from PWA to native Android, use **Expo SDK 54** with the **New Architecture** enabled. This provides the best developer experience with managed workflows while supporting all required features: Google OAuth, Supabase integration, rich markdown/LaTeX rendering, and streamlined APK distribution via EAS Build.

The recommended stack prioritizes:
1. **Familiarity** - Mirrors existing PWA stack where possible (React 19, TypeScript, Zustand, TanStack Query)
2. **Native quality** - True native components, not WebView wrappers
3. **Maintainability** - Expo managed workflow reduces native code maintenance
4. **Distribution simplicity** - EAS Build handles APK signing and distribution

---

## Recommended Stack

### Core Technologies

| Technology | Version | Purpose | Why Recommended | Confidence |
|------------|---------|---------|-----------------|------------|
| Expo SDK | 54.0.0 | App framework | Managed workflow, New Architecture default, excellent DX. SDK 54 uses React Native 0.81 and React 19.1. Enables EAS Build for distribution without managing native toolchains | HIGH |
| React Native | 0.81 | UI runtime | Bundled with Expo SDK 54. New Architecture enabled by default (75%+ of SDK 52+ projects use it) | HIGH |
| React | 19.1.0 | UI library | Bundled with Expo SDK 54. Same version as current PWA enables code sharing via @lumio/core | HIGH |
| TypeScript | 5.x | Type safety | Same version as current monorepo. Full type support in Expo and React Navigation | HIGH |
| Expo Router | 4.x | Navigation | File-based routing (like Next.js), built on React Navigation 7. Automatic deep linking, typed routes, lazy bundling. New Expo projects use it by default | HIGH |

### State Management & Data Fetching

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| TanStack Query | 5.x | Server state | Same as PWA. Handles Supabase data fetching, caching, background refetch. 80% less boilerplate than manual solutions | HIGH |
| Zustand | 5.0.x | Client state | Same as PWA. Lightweight (2.9kb), works with React Native, simpler than Redux. Combine with TanStack Query for complete state solution | HIGH |

### UI & Styling

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| NativeWind | 4.x | Styling | Tailwind CSS for React Native. Familiar syntax from PWA, compiles to native styles (not runtime). ~400k weekly downloads, mature ecosystem | HIGH |
| Tailwind CSS | 3.4.x | CSS framework | NativeWind 4 requires Tailwind 3.x. Same utility classes as PWA | HIGH |
| React Native Reanimated | 3.17.x | Animations | Required by NativeWind. Smooth 60fps animations, gesture handling | HIGH |

### Markdown & LaTeX Rendering

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| react-native-markdown-display | 7.x | Markdown rendering | Native components (not WebView). 100% CommonMark compatible. Supports custom renderers, markdown-it plugins. Most mature RN markdown solution | MEDIUM |
| react-native-math-view | 3.x | LaTeX (non-WebView) | Native SVG rendering for math. No WebView overhead. Integrates with markdown-display via custom rules | MEDIUM |
| react-native-syntax-highlighter | 2.x | Code blocks | Works with markdown-display. Uses Prism/Highlight.js AST with native Text components | MEDIUM |

**Alternative for LaTeX (WebView-based):**

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @caporeista/reactnative-math-latex | 2.x | KaTeX via WebView | If react-native-math-view has rendering issues with complex formulas. More reliable but slower |

### Authentication

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| @react-native-google-signin/google-signin | 16.x | Google OAuth | Official solution, supports Expo with config plugin. Works with Supabase Auth. Supports New Architecture | HIGH |
| @supabase/supabase-js | 2.x | Supabase client | Same as PWA. Full compatibility with existing backend | HIGH |
| expo-secure-store | 14.x | Token storage | Encrypted storage using iOS Keychain / Android Keystore. Required for secure auth token persistence | HIGH |

### Storage & Offline

| Library | Version | Purpose | Why Recommended | Confidence |
|---------|---------|---------|-----------------|------------|
| expo-secure-store | 14.x | Sensitive data | Encrypted key-value store. Use for auth tokens, API keys | HIGH |
| expo-sqlite | 15.x | Local database | SQLite with SQLCipher encryption option. SDK 52+ includes kv-store API as AsyncStorage replacement | HIGH |
| @react-native-async-storage/async-storage | 2.x | Non-sensitive data | Simple key-value for preferences. Use expo-sqlite/kv-store as drop-in replacement for better performance | MEDIUM |

### Build & Distribution

| Tool | Version | Purpose | Why Recommended | Confidence |
|------|---------|---------|-----------------|------------|
| EAS Build | latest | Build service | Cloud builds without local Android SDK. Handles signing, generates APK or AAB. Free tier available | HIGH |
| EAS Submit | latest | Store publishing | Optional: Direct upload to Play Store. Not needed for direct APK distribution | HIGH |
| eas.json | - | Build config | Define "preview" profile with `buildType: "apk"` for direct distribution, "production" for AAB/Play Store | HIGH |

### Development Tools

| Tool | Purpose | Notes |
|------|---------|-------|
| Expo Go | Development testing | For UI development only. Google Sign-In requires dev build |
| expo-dev-client | Dev builds | Required for native modules like Google Sign-In |
| expo-doctor | Dependency validation | Checks New Architecture compatibility |
| Flipper | Debugging | React Native debugger with network inspector |

---

## Installation

```bash
# Create new Expo project with SDK 54
npx create-expo-app@latest lumio-android --template blank-typescript

# Or add to existing monorepo
cd apps && npx create-expo-app@latest android --template blank-typescript

# Install core dependencies
npx expo install expo-router expo-secure-store expo-sqlite

# State management (same as PWA)
npm install zustand @tanstack/react-query

# Supabase
npm install @supabase/supabase-js

# NativeWind (Tailwind for RN)
npm install nativewind react-native-reanimated react-native-safe-area-context
npm install -D tailwindcss@^3.4.17

# Google Sign-In
npx expo install @react-native-google-signin/google-signin

# Markdown rendering
npm install react-native-markdown-display react-native-math-view react-native-syntax-highlighter

# WebView (for complex LaTeX fallback)
npx expo install react-native-webview
```

---

## Alternatives Considered

| Recommended | Alternative | When to Use Alternative |
|-------------|-------------|-------------------------|
| Expo SDK 54 (managed) | Bare React Native | Need custom native modules not supported by Expo. Lumio does not need this |
| Expo Router | React Navigation 7 | Complex navigation patterns that fight file-based routing. Expo Router is built on RN7, so can drop down if needed |
| NativeWind 4 | Tamagui | Building for web simultaneously with advanced theming. Lumio already has web app, so stick with familiar Tailwind |
| NativeWind 4 | StyleSheet API | Maximum performance for simple apps. NativeWind compiles away, so minimal overhead |
| Zustand | Redux Toolkit | Large team with Redux experience, need Redux DevTools. Zustand is simpler for Lumio's scope |
| Zustand | Jotai | Prefer atomic state model. Zustand's store model matches existing PWA code |
| TanStack Query | SWR | Simpler API, fewer features. TanStack Query has better Supabase integration patterns |
| expo-sqlite/kv-store | AsyncStorage | Legacy code. kv-store is drop-in replacement with better performance |
| EAS Build | Local builds | Need to build offline or avoid cloud service. Requires Android Studio setup |

---

## What NOT to Use

| Avoid | Why | Use Instead |
|-------|-----|-------------|
| Expo Go for testing auth | Google Sign-In requires native module config. Expo Go is generic sandbox | expo-dev-client (development builds) |
| AsyncStorage for tokens | Unencrypted, insecure for sensitive data | expo-secure-store |
| react-native-render-html | Heavy WebView-based, poor performance for frequent renders | react-native-markdown-display |
| expo-google-sign-in | Deprecated since SDK 36 | @react-native-google-signin/google-signin |
| Redux (standalone) | Overkill for Lumio's state needs, more boilerplate | Zustand + TanStack Query |
| NativeWind v5 | Requires Tailwind v4.1+, still maturing. Breaking changes from v4 | NativeWind v4 with Tailwind 3.x |
| React Navigation (standalone) | Extra setup work. Expo Router provides same functionality with file-based convenience | Expo Router |

---

## Stack Patterns by Use Case

### If complex LaTeX rendering is critical:
- Use `@caporeista/reactnative-math-latex` (WebView-based) instead of `react-native-math-view`
- Accept slight performance hit for reliability
- Wrap in React.memo to minimize re-renders

### If offline-first is required:
- Add `expo-sqlite` for local card cache
- Use TanStack Query's offline persistence
- Implement sync queue for study progress

### If Play Store distribution is needed:
- Change eas.json to `buildType: "aab"` for production
- Add `eas submit` to CI pipeline
- Configure Play Store credentials in EAS

---

## Version Compatibility Matrix

| Package | Compatible With | Notes |
|---------|-----------------|-------|
| Expo SDK 54 | React Native 0.81, React 19.1 | New Architecture default |
| NativeWind 4.x | Tailwind 3.4.x, Expo SDK 52+ | Metro config required |
| @react-native-google-signin 16.x | Expo SDK 53+, compileSdkVersion 35+ | SDK 52 needs expo-build-properties |
| expo-router 4.x | React Navigation 7.x | Uses RN7 under the hood |
| TanStack Query 5.x | React 18+, React Native 0.72+ | Works with Zustand |
| Zustand 5.x | React 18+ | Uses useSyncExternalStore |

---

## Configuration Examples

### eas.json (APK for direct distribution)
```json
{
  "cli": {
    "version": ">= 10.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal"
    },
    "preview": {
      "android": {
        "buildType": "apk"
      },
      "distribution": "internal"
    },
    "production": {
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

### app.json (Google Sign-In config)
```json
{
  "expo": {
    "plugins": [
      [
        "@react-native-google-signin/google-signin",
        {
          "iosUrlScheme": "com.googleusercontent.apps.YOUR_CLIENT_ID"
        }
      ]
    ]
  }
}
```

### metro.config.js (NativeWind)
```javascript
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: "./global.css" });
```

### tailwind.config.js
```javascript
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}"
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
}
```

---

## Supabase Integration Notes

### Auth Storage Configuration
```typescript
import { createClient } from '@supabase/supabase-js';
import * as SecureStore from 'expo-secure-store';

const ExpoSecureStoreAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: ExpoSecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Important for React Native
    },
  }
);
```

### Google Sign-In with Supabase
```typescript
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from './supabase';

GoogleSignin.configure({
  webClientId: 'YOUR_WEB_CLIENT_ID', // From Google Cloud Console
});

export async function signInWithGoogle() {
  await GoogleSignin.hasPlayServices();
  const userInfo = await GoogleSignin.signIn();

  if (userInfo.data?.idToken) {
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: userInfo.data.idToken,
    });
    return { data, error };
  }
  throw new Error('No ID token');
}
```

---

## Markdown Rendering Architecture

Recommend creating a shared rendering config in `@lumio/core` that works for both PWA and native:

```
packages/core/src/markdown/
  index.ts          # Platform-agnostic types and config
  web.ts            # Web-specific (react-markdown + rehype)
  native.ts         # Native-specific (react-native-markdown-display)
```

### Native Implementation Pattern
```typescript
// packages/core/src/markdown/native.ts
import Markdown from 'react-native-markdown-display';
import MathView from 'react-native-math-view';
import SyntaxHighlighter from 'react-native-syntax-highlighter';

const rules = {
  math_inline: (node) => <MathView math={node.content} />,
  math_block: (node) => <MathView math={node.content} style={{ marginVertical: 16 }} />,
  code_block: (node) => (
    <SyntaxHighlighter language={node.language}>
      {node.content}
    </SyntaxHighlighter>
  ),
};

export const MarkdownRenderer = ({ content }) => (
  <Markdown rules={rules}>{content}</Markdown>
);
```

---

## Sources

### Official Documentation (HIGH confidence)
- [Expo SDK 54 Reference](https://docs.expo.dev/versions/latest/) - SDK version and React Native compatibility
- [Expo New Architecture Guide](https://docs.expo.dev/guides/new-architecture/) - New Architecture adoption stats
- [Expo Router Introduction](https://docs.expo.dev/router/introduction/) - File-based routing features
- [Supabase Expo Tutorial](https://supabase.com/docs/guides/auth/quickstarts/with-expo-react-native-social-auth) - Google OAuth integration
- [EAS Build APK Guide](https://docs.expo.dev/build-reference/apk/) - APK generation configuration
- [React Navigation 7 Getting Started](https://reactnavigation.org/docs/getting-started/) - Version and dependencies

### WebSearch Findings (MEDIUM confidence, verified)
- [React Native Wrapped 2025](https://www.callstack.com/blog/react-native-wrapped-2025-a-month-by-month-recap-of-the-year) - Ecosystem trends
- [React State Management 2025](https://www.developerway.com/posts/react-state-management-2025) - Zustand + TanStack Query recommendation
- [NativeWind Installation](https://www.nativewind.dev/docs/getting-started/installation) - Version 4 setup
- [LogRocket UI Libraries 2026](https://blog.logrocket.com/best-react-native-ui-component-libraries/) - NativeWind adoption stats
- [React Native Google Sign-In](https://react-native-google-signin.github.io/docs/expo) - Expo configuration

### Package Repositories (HIGH confidence)
- [Zustand npm](https://www.npmjs.com/package/zustand) - Version 5.0.10
- [@react-native-google-signin v16.1.1](https://github.com/react-native-google-signin/google-signin) - Latest release
- [react-native-markdown-display](https://www.npmjs.com/package/react-native-markdown-display) - Features and compatibility
- [react-native-math-view](https://github.com/ShaMan123/react-native-math-view) - Native LaTeX rendering

---

*Stack research for: Lumio React Native Android migration*
*Researched: 2026-01-29*
