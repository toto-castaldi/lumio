# Phase 1: Foundation - Research

**Researched:** 2026-02-03
**Domain:** Expo SDK 54, React Native, NativeWind, Supabase integration, Monorepo
**Confidence:** HIGH

## Summary

This research investigates the technical requirements for setting up an Expo SDK 54 project within the existing Lumio pnpm monorepo. The phase involves creating a new Android-only native app in `apps/android`, integrating with the existing `@lumio/core` package for Supabase client and types, and configuring NativeWind for Tailwind CSS styling.

The existing monorepo is already well-configured for Expo compatibility with `node-linker=hoisted` in `.npmrc` and the standard `pnpm-workspace.yaml` structure. The `@lumio/core` package provides a platform-agnostic Supabase client with a `StorageAdapter` interface that allows custom storage implementations, making it ideal for integration with `expo-secure-store`.

Key findings indicate that Expo SDK 54 includes React Native 0.81 and React 19.1, requires the New Architecture (legacy architecture is deprecated), and works with NativeWind v4.2.0+ for Tailwind CSS styling. For secure token storage, the recommended pattern is a `LargeSecureStore` class that combines `expo-secure-store` (for AES-256 encryption keys) with AsyncStorage (for encrypted session data).

**Primary recommendation:** Create `apps/android` using `npx create-expo-app@latest`, configure NativeWind v4 with Reanimated v4 compatibility, and implement a `LargeSecureStore` adapter to integrate with the existing `@lumio/core` Supabase client.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| expo | ~54.0.0 | App development framework | Official React Native framework, first-class monorepo support |
| react-native | 0.81.x | Mobile UI framework | Bundled with Expo SDK 54, includes React 19.1 |
| expo-router | ~4.0.0 | File-based navigation | Built on React Navigation, official Expo routing solution |
| nativewind | ^4.2.0 | Tailwind CSS for React Native | Standard Tailwind solution, Reanimated v4 compatible |
| @supabase/supabase-js | ^2.45.0 | Backend client | Already in @lumio/core, platform-agnostic |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| expo-secure-store | ~14.0.0 | Secure key storage | Store AES-256 encryption keys for session data |
| @react-native-async-storage/async-storage | ^2.1.0 | Async key-value storage | Store encrypted session data |
| aes-js | ^3.1.2 | AES encryption | Encrypt session tokens exceeding 2048 bytes |
| react-native-get-random-values | ^1.11.0 | Crypto polyfill | Generate secure encryption keys |
| react-native-reanimated | ~4.1.1 | Animations | Required by NativeWind v4, bundled with SDK 54 |
| react-native-safe-area-context | ~5.4.0 | Safe area handling | Required by NativeWind, handles notches/edges |
| expo-build-properties | ~0.14.0 | Native build config | Set minSdkVersion to 31 (Android 12) |
| @expo/vector-icons | ~14.0.0 | Icon library | Tab bar icons, bundled with Expo |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| expo-secure-store | expo-sqlite/localStorage | Simpler but less secure, no hardware-backed encryption |
| NativeWind | Tamagui, styled-components | NativeWind matches existing web Tailwind classes |
| Expo Router | React Navigation directly | Expo Router is built on React Navigation, adds file-based routing |

**Installation:**
```bash
# Create Expo app in monorepo
cd apps
npx create-expo-app@latest android --template blank-typescript

# Install core dependencies
cd android
npx expo install expo-router expo-secure-store @react-native-async-storage/async-storage expo-build-properties

# Install NativeWind stack
npm install nativewind react-native-reanimated react-native-safe-area-context
npm install --dev tailwindcss@^3.4.17 prettier-plugin-tailwindcss@^0.5.11

# Install encryption dependencies for LargeSecureStore
npm install aes-js react-native-get-random-values
npm install --dev @types/aes-js

# Link to monorepo packages
# Add to package.json: "@lumio/core": "workspace:*"
```

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
├── app/                      # Expo Router routes
│   ├── _layout.tsx           # Root layout (imports global.css)
│   ├── index.tsx             # Entry redirect to (tabs)
│   └── (tabs)/               # Tab navigation group
│       ├── _layout.tsx       # Tab layout configuration
│       ├── index.tsx         # Dashboard tab
│       ├── repository.tsx    # Repository tab
│       └── settings.tsx      # Settings tab
├── components/               # Reusable UI components
├── lib/                      # Utilities and adapters
│   ├── supabase.ts           # Supabase client initialization
│   └── storage.ts            # LargeSecureStore implementation
├── global.css                # Tailwind directives
├── tailwind.config.js        # NativeWind preset config
├── metro.config.js           # Metro with NativeWind
├── babel.config.js           # Babel with NativeWind preset
├── app.config.ts             # Dynamic Expo config
├── nativewind-env.d.ts       # TypeScript types for NativeWind
└── package.json
```

### Pattern 1: LargeSecureStore for Supabase Sessions
**What:** Hybrid storage pattern that encrypts session data with AES-256, storing the key in SecureStore and encrypted data in AsyncStorage.
**When to use:** Always for Supabase auth tokens in React Native (tokens exceed SecureStore's 2048-byte limit).
**Example:**
```typescript
// Source: https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/getting-started/tutorials/with-expo-react-native.mdx
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SecureStore from 'expo-secure-store';
import * as aesjs from 'aes-js';
import 'react-native-get-random-values';

class LargeSecureStore {
  private async _encrypt(key: string, value: string) {
    const encryptionKey = crypto.getRandomValues(new Uint8Array(256 / 8));
    const cipher = new aesjs.ModeOfOperation.ctr(encryptionKey, new aesjs.Counter(1));
    const encryptedBytes = cipher.encrypt(aesjs.utils.utf8.toBytes(value));
    await SecureStore.setItemAsync(key, aesjs.utils.hex.fromBytes(encryptionKey));
    return aesjs.utils.hex.fromBytes(encryptedBytes);
  }

  private async _decrypt(key: string, value: string) {
    const encryptionKeyHex = await SecureStore.getItemAsync(key);
    if (!encryptionKeyHex) return encryptionKeyHex;
    const cipher = new aesjs.ModeOfOperation.ctr(
      aesjs.utils.hex.toBytes(encryptionKeyHex),
      new aesjs.Counter(1)
    );
    const decryptedBytes = cipher.decrypt(aesjs.utils.hex.toBytes(value));
    return aesjs.utils.utf8.fromBytes(decryptedBytes);
  }

  async getItem(key: string) {
    const encrypted = await AsyncStorage.getItem(key);
    if (!encrypted) return encrypted;
    return await this._decrypt(key, encrypted);
  }

  async removeItem(key: string) {
    await AsyncStorage.removeItem(key);
    await SecureStore.deleteItemAsync(key);
  }

  async setItem(key: string, value: string) {
    const encrypted = await this._encrypt(key, value);
    await AsyncStorage.setItem(key, encrypted);
  }
}
```

### Pattern 2: Integrating with @lumio/core
**What:** Use the existing `createSupabaseClient` with custom storage adapter.
**When to use:** Initialize Supabase client in the Android app.
**Example:**
```typescript
// Source: Existing @lumio/core/src/supabase/client.ts
import { createSupabaseClient } from '@lumio/core';
import { LargeSecureStore } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  storage: new LargeSecureStore(),
});
```

### Pattern 3: Expo Router Tab Layout
**What:** File-based tab navigation with bottom tab bar.
**When to use:** Main app navigation structure.
**Example:**
```typescript
// Source: https://docs.expo.dev/router/advanced/tabs/
// app/(tabs)/_layout.tsx
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Dashboard',
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="home" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="repository"
        options={{
          title: 'Repository',
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="book" color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          tabBarIcon: ({ color }) => (
            <FontAwesome size={28} name="cog" color={color} />
          ),
        }}
      />
    </Tabs>
  );
}
```

### Pattern 4: NativeWind Configuration
**What:** Complete NativeWind v4 setup for Expo SDK 54.
**When to use:** Tailwind CSS styling in React Native.
**Example:**
```javascript
// babel.config.js
// Source: https://www.nativewind.dev/docs/getting-started/installation
module.exports = function (api) {
  api.cache(true);
  return {
    presets: [
      ['babel-preset-expo', { jsxImportSource: 'nativewind' }],
      'nativewind/babel'
    ],
  };
};

// metro.config.js
const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require('nativewind/metro');

const config = getDefaultConfig(__dirname);

module.exports = withNativeWind(config, { input: './global.css' });

// tailwind.config.js
/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./components/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {},
  },
  plugins: [],
};

// global.css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

### Anti-Patterns to Avoid
- **Storing raw tokens in AsyncStorage:** Tokens are unencrypted; use LargeSecureStore pattern instead
- **Using Tailwind v4 with NativeWind v4:** NativeWind v4 requires Tailwind v3.4.x
- **Applying text colors to View components:** Colors don't cascade in React Native; apply to Text directly
- **Using both worklets and reanimated plugins:** Reanimated v4 includes worklets internally
- **Conditional styles without explicit fallbacks:** Always declare both light and dark mode variants

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Session token encryption | Custom encryption | LargeSecureStore pattern | AES-256 CTR mode, handles 2048-byte SecureStore limit |
| Navigation routing | Manual navigation state | Expo Router | File-based routing, deep linking, typed routes |
| Safe area insets | Manual padding calculations | react-native-safe-area-context | Handles notches, dynamic island, edge-to-edge |
| Tailwind in RN | StyleSheet with Tailwind-like names | NativeWind | Actual Tailwind compilation, matches web classes |
| Android build config | Manual gradle editing | expo-build-properties | Config plugin, survives prebuild |

**Key insight:** Expo SDK 54 has built-in solutions for most platform concerns. The ecosystem has matured to the point where custom solutions introduce maintenance burden without benefits.

## Common Pitfalls

### Pitfall 1: SecureStore 2048-byte Limit
**What goes wrong:** App crashes or silently fails when storing Supabase JWT tokens directly in expo-secure-store.
**Why it happens:** Supabase JWTs with user metadata regularly exceed 2048 bytes; SecureStore throws an error.
**How to avoid:** Always use the LargeSecureStore hybrid pattern that stores encryption keys in SecureStore and encrypted data in AsyncStorage.
**Warning signs:** "Provided value to SecureStore is larger than 2048 bytes" error.

### Pitfall 2: NativeWind Styles Not Applying
**What goes wrong:** Tailwind classes render with no visual effect.
**Why it happens:** Missing babel.config.js jsxImportSource, metro.config.js withNativeWind wrapper, or global.css import.
**How to avoid:**
1. Clear cache: `npx expo start --clear`
2. Verify Tailwind compiles: `npx tailwindcss --input ./global.css --output output.css`
3. Use `verifyInstallation()` from NativeWind in development
**Warning signs:** Components render but without styling, no errors in console.

### Pitfall 3: View Color Cascade Assumption
**What goes wrong:** Text color classes on parent View don't affect child Text.
**Why it happens:** React Native's View component doesn't accept color styles; colors don't cascade like CSS.
**How to avoid:** Apply color classes directly to Text components, not parent Views.
**Warning signs:** Text appears in default color despite parent having `text-*` class.

### Pitfall 4: pnpm Isolated Dependencies
**What goes wrong:** Native build errors, missing dependencies, symlink resolution failures.
**Why it happens:** pnpm's default isolated installation mode conflicts with React Native's module resolution.
**How to avoid:** Ensure `.npmrc` has `node-linker=hoisted` (already configured in this monorepo).
**Warning signs:** "Cannot find module" errors during native builds.

### Pitfall 5: Missing expo-build-properties After Prebuild
**What goes wrong:** minSdkVersion reverts to default (24) instead of configured value (31).
**Why it happens:** expo-build-properties only works with `npx expo prebuild`; configuration ignored in some edge cases.
**How to avoid:** Always run `npx expo prebuild --clean` after changing build properties; verify in `android/build.gradle`.
**Warning signs:** Build errors about API level mismatch.

### Pitfall 6: Reanimated Plugin Duplication
**What goes wrong:** Build fails with duplicate symbol errors.
**Why it happens:** Adding both `react-native-worklets` and `react-native-reanimated/plugin` to babel config.
**How to avoid:** Reanimated v4 includes worklets internally; do not add separate worklets plugin.
**Warning signs:** "duplicate symbol" or "already declared" errors during build.

## Code Examples

Verified patterns from official sources:

### Environment Variables Setup
```typescript
// app.config.ts
// Source: https://docs.expo.dev/guides/environment-variables/
import { ExpoConfig, ConfigContext } from 'expo/config';

export default ({ config }: ConfigContext): ExpoConfig => ({
  ...config,
  name: 'Lumio',
  slug: 'lumio',
  version: '1.0.0',
  orientation: 'portrait',
  icon: './assets/icon.png',
  splash: {
    image: './assets/splash.png',
    resizeMode: 'contain',
    backgroundColor: '#ffffff'
  },
  android: {
    package: 'com.totocastaldi.lumio',
    adaptiveIcon: {
      foregroundImage: './assets/adaptive-icon.png',
      backgroundColor: '#ffffff'
    }
  },
  plugins: [
    'expo-router',
    'expo-secure-store',
    ['expo-build-properties', {
      android: {
        minSdkVersion: 31,
        compileSdkVersion: 35,
        targetSdkVersion: 35,
      }
    }]
  ],
  extra: {
    router: {
      origin: false
    }
  },
  scheme: 'lumio'
});
```

### Root Layout with NativeWind
```typescript
// app/_layout.tsx
// Source: https://docs.expo.dev/router/introduction/
import './global.css';
import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
    </Stack>
  );
}
```

### Connection Test Component
```typescript
// components/ConnectionTest.tsx
// Verify Supabase connection for Phase 1 success criteria
import { useEffect, useState } from 'react';
import { Text, View } from 'react-native';
import { getSupabaseClient } from '@lumio/core';

export function ConnectionTest() {
  const [status, setStatus] = useState<'loading' | 'connected' | 'error'>('loading');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function testConnection() {
      try {
        const supabase = getSupabaseClient();
        // Simple query to verify connection
        const { error } = await supabase.from('platform_config').select('provider').limit(1);
        if (error) throw error;
        setStatus('connected');
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    }
    testConnection();
  }, []);

  return (
    <View className="p-4">
      <Text className="text-lg font-bold">Supabase Connection</Text>
      <Text className={status === 'connected' ? 'text-green-600' : status === 'error' ? 'text-red-600' : 'text-gray-600'}>
        Status: {status}
      </Text>
      {error && <Text className="text-red-500 text-sm">{error}</Text>}
    </View>
  );
}
```

### TypeScript Types for Environment Variables
```typescript
// nativewind-env.d.ts
/// <reference types="nativewind/types" />

// env.d.ts
declare global {
  namespace NodeJS {
    interface ProcessEnv {
      EXPO_PUBLIC_SUPABASE_URL: string;
      EXPO_PUBLIC_SUPABASE_ANON_KEY: string;
    }
  }
}

export {};
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Legacy Architecture | New Architecture (default) | SDK 54 | Final SDK with legacy support; removal in 0.82 |
| JSC JavaScript engine | Hermes (default) | SDK 54 | JSC removed from React Native 0.81 |
| Manual Metro config for monorepos | Auto-detected | SDK 52+ | No manual Metro workspace config needed |
| AsyncStorage for tokens | LargeSecureStore pattern | Best practice | Hardware-backed encryption for sensitive data |
| Reanimated v3 | Reanimated v4 | SDK 54 | New Architecture only, includes worklets |
| NativeWind v2 | NativeWind v4 | 2025 | Better Reanimated compatibility, simpler config |
| expo-file-system/next | expo-file-system (stable) | SDK 54 | Update imports from /next to default |

**Deprecated/outdated:**
- **JSC engine:** Removed from React Native 0.81; use Hermes (default) or community-maintained JSC
- **Legacy Architecture:** Code freeze in 0.80, removal planned for 0.82
- **statusBar in app.json:** No longer supported in root or Android config sections in SDK 54
- **react-native-dotenv:** Deprecated; use Expo's built-in `EXPO_PUBLIC_` environment variables

## Open Questions

Things that couldn't be fully resolved:

1. **expo-build-properties reliability for minSdkVersion**
   - What we know: Some users report minSdkVersion not applying correctly in SDK 53+
   - What's unclear: Whether this is fixed in SDK 54 or still requires workarounds
   - Recommendation: Verify after prebuild by checking `android/build.gradle`; if issue persists, manual gradle edit may be needed

2. **Splash screen and app icon placeholders**
   - What we know: Expo requires these assets for build
   - What's unclear: Best placeholder dimensions for Android adaptive icons
   - Recommendation: Use 1024x1024 for icon, 1284x2778 for splash; can be simple colored rectangles initially

## Sources

### Primary (HIGH confidence)
- [Expo SDK 54 Changelog](https://expo.dev/changelog/sdk-54) - SDK version, React Native 0.81, breaking changes
- [Expo Environment Variables](https://docs.expo.dev/guides/environment-variables/) - EXPO_PUBLIC_ pattern
- [Expo Router Documentation](https://docs.expo.dev/router/introduction/) - File-based routing
- [Expo Router Tabs](https://docs.expo.dev/router/advanced/tabs/) - Tab navigation setup
- [NativeWind Installation](https://www.nativewind.dev/docs/getting-started/installation) - Complete setup guide
- [NativeWind Troubleshooting](https://www.nativewind.dev/docs/getting-started/troubleshooting) - Common issues
- [Expo Monorepos](https://docs.expo.dev/guides/monorepos/) - pnpm workspace configuration
- [expo-build-properties](https://docs.expo.dev/versions/latest/sdk/build-properties/) - Native build configuration

### Secondary (MEDIUM confidence)
- [Supabase with Expo Tutorial](https://github.com/supabase/supabase/blob/master/apps/docs/content/guides/getting-started/tutorials/with-expo-react-native.mdx) - LargeSecureStore pattern
- [Supabase Expo Guide](https://supabase.com/docs/guides/getting-started/tutorials/with-expo-react-native?auth-store=secure-store) - SecureStore integration

### Tertiary (LOW confidence)
- [Medium: NativeWind SDK 54 Issues](https://medium.com/@matthitachi/nativewind-styling-not-working-with-expo-sdk-54-54488c07c20d) - Version compatibility notes
- [GitHub Issue: minSdkVersion](https://github.com/expo/expo/issues/36675) - Known expo-build-properties issues

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Versions verified from official Expo SDK 54 release notes
- Architecture: HIGH - Patterns from official Expo and NativeWind documentation
- Pitfalls: HIGH - Documented in official troubleshooting guides

**Research date:** 2026-02-03
**Valid until:** 2026-03-03 (30 days - stable technologies, well-documented)
