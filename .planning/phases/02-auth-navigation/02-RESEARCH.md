# Phase 2: Auth & Navigation - Research

**Researched:** 2026-02-04
**Domain:** React Native Authentication + Navigation (Google OAuth, Supabase, Tab Navigation)
**Confidence:** HIGH

## Summary

This phase implements Google OAuth authentication for the Android app using `@react-native-google-signin/google-signin` combined with Supabase's `signInWithIdToken` method for native auth. The app uses react-navigation's bottom tabs with a custom FAB overlay for the Study action. Session persistence leverages `expo-secure-store` through a custom storage adapter for Supabase.

**Key insight:** Native Google Sign-In provides better UX than web-based OAuth (no browser redirect). Supabase's `signInWithIdToken` method enables this by accepting the Google ID token directly, creating a seamless native authentication flow.

**Primary recommendation:** Use `@react-native-google-signin/google-signin` + Supabase `signInWithIdToken` for auth, `expo-secure-store` for token storage, and a custom tab bar component with absolute-positioned FAB for navigation.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-native-google-signin/google-signin` | ^13.0.0 | Native Google Sign-In | Official Google SDK wrapper, supports signInWithIdToken flow |
| `expo-secure-store` | ~14.0.0 | Secure token storage | iOS Keychain + Android Keystore encryption, Expo-maintained |
| `@react-navigation/bottom-tabs` | ^7.x | Tab navigation | Already installed, official react-navigation solution |
| `@react-native-community/netinfo` | ^11.x | Network status detection | Standard solution for offline detection |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@expo/vector-icons` | (bundled) | Tab icons | Icons-only tab bar (already available via Expo) |
| `react-native-paper` | ^5.x | FAB component | Optional - provides pre-built FAB with animations |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `@react-native-google-signin/google-signin` | `expo-auth-session` + web OAuth | Less native UX, browser redirect required, more complex PKCE flow |
| `expo-secure-store` | `react-native-keychain` | expo-secure-store is Expo-native, simpler API, sufficient for tokens |
| Custom FAB | `react-native-paper` FAB | Paper FAB adds dependency; custom gives full control over positioning |

**Installation:**
```bash
pnpm --filter @lumio/android add @react-native-google-signin/google-signin expo-secure-store @react-native-community/netinfo
```

**Note:** Development build required - `@react-native-google-signin/google-signin` does NOT work in Expo Go.

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
├── App.tsx                    # Root with AuthProvider and NavigationContainer
├── lib/
│   ├── supabase.ts            # Supabase client with SecureStore adapter
│   └── auth.ts                # Native Google Sign-In helpers
├── contexts/
│   └── AuthContext.tsx        # Auth state management
├── navigation/
│   ├── AppNavigator.tsx       # Root navigator (auth vs main)
│   ├── AuthNavigator.tsx      # Login screen stack
│   └── MainNavigator.tsx      # Tab navigator + FAB overlay
├── screens/
│   ├── LoginScreen.tsx        # Google sign-in button
│   ├── DashboardScreen.tsx    # Dashboard tab
│   ├── ReposScreen.tsx        # Repos tab
│   └── SettingsScreen.tsx     # Settings tab with logout
└── components/
    ├── OfflineBanner.tsx      # Network status indicator
    └── StudyFAB.tsx           # Floating action button
```

### Pattern 1: Native Google Sign-In with Supabase signInWithIdToken
**What:** Use native Google SDK to get ID token, then exchange with Supabase for session
**When to use:** All native mobile authentication with Google
**Example:**
```typescript
// Source: https://supabase.com/docs/guides/auth/social-login/auth-google
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';

// Configure once at app startup
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  offlineAccess: true,
});

async function signInWithGoogle() {
  try {
    await GoogleSignin.hasPlayServices();
    const response = await GoogleSignin.signIn();

    if (response.type === 'success' && response.data.idToken) {
      const { data, error } = await supabase.auth.signInWithIdToken({
        provider: 'google',
        token: response.data.idToken,
      });

      if (error) throw error;
      return data;
    }
  } catch (error: any) {
    if (error.code === statusCodes.SIGN_IN_CANCELLED) {
      // User cancelled - silent return
      return null;
    }
    throw error;
  }
}
```

### Pattern 2: Supabase Client with SecureStore Adapter
**What:** Custom storage adapter for Supabase that uses expo-secure-store
**When to use:** React Native apps requiring secure token persistence
**Example:**
```typescript
// Source: https://docs.expo.dev/versions/latest/sdk/securestore/
import * as SecureStore from 'expo-secure-store';
import { createClient } from '@supabase/supabase-js';

const SecureStoreAdapter = {
  getItem: async (key: string) => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string) => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string) => {
    await SecureStore.deleteItemAsync(key);
  },
};

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL!,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      storage: SecureStoreAdapter,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false, // Important for native
    },
  }
);
```

### Pattern 3: Custom Tab Bar with FAB Overlay
**What:** Icons-only tab bar with floating study button positioned above
**When to use:** When FAB should be accessible from all tabs
**Example:**
```typescript
// Source: https://reactnavigation.org/docs/bottom-tab-navigator/
import { View, TouchableOpacity, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

const Tab = createBottomTabNavigator();

function CustomTabBar({ state, descriptors, navigation }) {
  return (
    <View style={styles.container}>
      {/* FAB positioned above tabs */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('Study')}
      >
        <Ionicons name="play" size={24} color="#fff" />
      </TouchableOpacity>

      {/* Tab bar */}
      <View style={styles.tabBar}>
        {state.routes.map((route, index) => {
          const isFocused = state.index === index;
          // ... render tab icons
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { position: 'relative' },
  fab: {
    position: 'absolute',
    bottom: 70, // Above tab bar
    alignSelf: 'center',
    backgroundColor: '#3B82F6',
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#fff',
    height: 60,
    borderTopWidth: 1,
    borderTopColor: '#e5e5e5',
  },
});
```

### Pattern 4: Network Status Banner
**What:** Banner that appears when device goes offline
**When to use:** Show at top of screen when network unavailable
**Example:**
```typescript
// Source: https://github.com/react-native-netinfo/react-native-netinfo
import { useEffect, useState } from 'react';
import { View, Text, StyleSheet, Animated } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

export function OfflineBanner() {
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsOffline(!state.isConnected);
    });
    return () => unsubscribe();
  }, []);

  if (!isOffline) return null;

  return (
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#f97316',
    padding: 8,
    alignItems: 'center',
  },
  text: {
    color: '#fff',
    fontWeight: '500',
  },
});
```

### Anti-Patterns to Avoid
- **Using AsyncStorage for tokens:** AsyncStorage is unencrypted - always use SecureStore for sensitive data
- **Browser-based OAuth in native app:** Avoid `signInWithOAuth` with redirect URLs; use native `signInWithIdToken` instead
- **FAB inside individual screens:** Place FAB in navigator, not each screen - avoids duplication and position inconsistency
- **Blocking UI during auth check:** Show loading state, not blank screen, while verifying session

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Token encryption | Custom AES encryption | expo-secure-store | Uses platform Keychain/Keystore, tested, maintained |
| OAuth flow | Custom WebView flow | @react-native-google-signin + signInWithIdToken | Handles edge cases, nonce validation, token refresh |
| Network detection | Polling with fetch | @react-native-community/netinfo | Native APIs, battery efficient, handles all edge cases |
| Tab bar with badges | Custom View implementation | react-navigation tabBarBadge | Built-in, handles animations and accessibility |

**Key insight:** Native mobile auth has many edge cases (Play Services unavailable, user cancellation, token expiry, biometric changes). Using established libraries avoids weeks of debugging.

## Common Pitfalls

### Pitfall 1: Expo Go Incompatibility
**What goes wrong:** App crashes or shows "Invariant Violation" when using @react-native-google-signin in Expo Go
**Why it happens:** Native modules require a development build; Expo Go doesn't include Google Sign-In SDK
**How to avoid:** Create development build with EAS Build or local Expo prebuild
**Warning signs:** "Native module cannot be null" errors

### Pitfall 2: Missing Web Client ID
**What goes wrong:** Google Sign-In works but Supabase rejects the token
**Why it happens:** Supabase needs the web client ID to verify tokens, not the Android/iOS client IDs
**How to avoid:** Configure Google Cloud OAuth with Web Application client, use that ID in `GoogleSignin.configure({ webClientId })`
**Warning signs:** "Invalid token" or "Token audience mismatch" errors from Supabase

### Pitfall 3: SecureStore Size Limits
**What goes wrong:** Token storage fails silently or throws on iOS
**Why it happens:** iOS Keychain historically rejected values >2048 bytes
**How to avoid:** Supabase tokens are typically ~1KB, but if storing additional data, implement LargeSecureStore pattern (encrypt with SecureStore key, store in AsyncStorage)
**Warning signs:** Tokens not persisting across app restarts on iOS

### Pitfall 4: Session Not Restoring on App Restart
**What goes wrong:** User has to log in again after closing app
**Why it happens:** Custom storage adapter not correctly implementing async interface, or `persistSession: false`
**How to avoid:** Ensure storage adapter methods return Promises, set `persistSession: true`
**Warning signs:** Session exists in memory but not after app restart

### Pitfall 5: FAB Touch Events Not Working
**What goes wrong:** FAB is visible but taps don't register
**Why it happens:** Tab bar View overlapping FAB, or zIndex issues on Android
**How to avoid:** Use `pointerEvents="box-none"` on container, ensure FAB has higher elevation
**Warning signs:** FAB animates on press (visual feedback) but onPress never fires

### Pitfall 6: Google Sign-In Cancelled Error Handling
**What goes wrong:** App shows error dialog when user cancels login
**Why it happens:** User cancellation throws an error with code `statusCodes.SIGN_IN_CANCELLED`
**How to avoid:** Catch this specific error code and return silently without showing error UI
**Warning signs:** "Sign in cancelled" toasts appearing when user taps back

## Code Examples

Verified patterns from official sources:

### Complete Auth Context for React Native
```typescript
// Source: Supabase + expo-secure-store patterns
import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { supabase } from '../lib/supabase';
import type { User, Session } from '@supabase/supabase-js';

type AuthState = 'loading' | 'logged_out' | 'ready';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  state: AuthState;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    // Configure Google Sign-In
    GoogleSignin.configure({
      webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
      offlineAccess: true,
    });

    // Check existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setState(session ? 'ready' : 'logged_out');
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setState(session ? 'ready' : 'logged_out');
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = async () => {
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();

      if (response.type === 'success' && response.data.idToken) {
        const { error } = await supabase.auth.signInWithIdToken({
          provider: 'google',
          token: response.data.idToken,
        });
        if (error) throw error;
      }
    } catch (error: any) {
      if (error.code === statusCodes.SIGN_IN_CANCELLED) {
        return; // User cancelled, silent return
      }
      if (error.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
        throw new Error('Google Play Services not available');
      }
      throw error;
    }
  };

  const signOut = async () => {
    await GoogleSignin.signOut();
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, session, state, signInWithGoogle, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error('useAuth must be used within AuthProvider');
  return context;
}
```

### Icons-Only Tab Navigator
```typescript
// Source: https://reactnavigation.org/docs/bottom-tab-navigator/
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import Ionicons from '@expo/vector-icons/Ionicons';

const Tab = createBottomTabNavigator();

function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        tabBarShowLabel: false, // Icons only
        tabBarIcon: ({ focused, color, size }) => {
          let iconName: keyof typeof Ionicons.glyphMap;

          switch (route.name) {
            case 'Dashboard':
              iconName = focused ? 'home' : 'home-outline';
              break;
            case 'Repos':
              iconName = focused ? 'folder' : 'folder-outline';
              break;
            case 'Settings':
              iconName = focused ? 'settings' : 'settings-outline';
              break;
            default:
              iconName = 'help-outline';
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
        tabBarActiveTintColor: '#3B82F6',
        tabBarInactiveTintColor: '#6B7280',
        headerShown: true,
      })}
    >
      <Tab.Screen name="Dashboard" component={DashboardScreen} />
      <Tab.Screen name="Repos" component={ReposScreen} />
      <Tab.Screen name="Settings" component={SettingsScreen} />
    </Tab.Navigator>
  );
}
```

### Login Screen with Google Button
```typescript
// Source: Login patterns + Lumio design specs
import { View, Text, Image, StyleSheet, ActivityIndicator } from 'react-native';
import { GoogleSigninButton } from '@react-native-google-signin/google-signin';
import { useAuth } from '../contexts/AuthContext';
import { useState } from 'react';

export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || 'Sign in failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Image source={require('../assets/logo.svg')} style={styles.logo} />
      <Text style={styles.tagline}>Your flashcards, supercharged</Text>

      {error && <Text style={styles.error}>{error}</Text>}

      {isLoading ? (
        <ActivityIndicator size="large" color="#3B82F6" />
      ) : (
        <GoogleSigninButton
          size={GoogleSigninButton.Size.Wide}
          color={GoogleSigninButton.Color.Dark}
          onPress={handleSignIn}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 24,
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 16,
  },
  tagline: {
    fontSize: 18,
    color: '#6B7280',
    marginBottom: 48,
  },
  error: {
    color: '#ef4444',
    marginBottom: 16,
    textAlign: 'center',
  },
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| WebView OAuth redirects | Native signInWithIdToken | Supabase v2.39.7 (2024) | Better UX, no browser popup |
| AsyncStorage for tokens | expo-secure-store | Always recommended | Required for security |
| expo-router in monorepo | react-navigation directly | 2025 (monorepo issues) | Already decided in NAV-01 |
| @react-native-google-signin v10 | v13+ | 2025 | New API, better TypeScript support |

**Deprecated/outdated:**
- `signInWithOAuth` for native mobile: Use `signInWithIdToken` instead for native flows
- Storing tokens in AsyncStorage: Use SecureStore for any sensitive data
- expo-router in pnpm monorepo: Known compatibility issues (NAV-01)

## Open Questions

Things that couldn't be fully resolved:

1. **Tab Badge Implementation Details**
   - What we know: react-navigation supports `tabBarBadge` prop
   - What's unclear: Backend doesn't yet have "new cards available" endpoint
   - Recommendation: Stub badge infrastructure now, implement data fetching in Phase 3

2. **LargeSecureStore Necessity**
   - What we know: iOS historically had 2KB limit, Supabase tokens ~1KB
   - What's unclear: Whether current iOS versions have this limit
   - Recommendation: Start with plain SecureStore, implement LargeSecureStore only if storage fails

3. **Google Cloud Console Configuration for Android**
   - What we know: Need Web Client ID for Supabase, Android Client ID for app
   - What's unclear: Whether existing Google Cloud project has Android OAuth client configured
   - Recommendation: Document setup steps in plan, verify during implementation

## Sources

### Primary (HIGH confidence)
- [Supabase Docs - Google OAuth React Native](https://supabase.com/docs/guides/auth/social-login/auth-google?platform=react-native) - signInWithIdToken pattern
- [React Navigation Docs](https://reactnavigation.org/docs/bottom-tab-navigator/) - Tab navigator, custom tab bar
- [Expo SecureStore Docs](https://docs.expo.dev/versions/latest/sdk/securestore/) - API, platform behavior, limitations
- Context7: `/react-navigation/react-navigation.github.io` - FAB with tabs pattern
- Context7: `/sbaiahmed1/react-native-google-auth` - GoogleSignin configuration

### Secondary (MEDIUM confidence)
- [Supabase Blog - Native Mobile Auth](https://supabase.com/blog/native-mobile-auth) - signInWithIdToken background
- [NetInfo GitHub](https://github.com/react-native-netinfo/react-native-netinfo) - Network detection API
- [React Native Security Docs](https://reactnative.dev/docs/security) - Token storage guidance

### Tertiary (LOW confidence)
- Web search results for FAB positioning patterns - Multiple implementations vary
- Community discussions on expo-secure-store size limits - Anecdotal, needs testing

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Libraries are well-documented and widely used
- Architecture: HIGH - Patterns from official docs and existing codebase
- Pitfalls: HIGH - Common issues well-documented in GitHub issues and Stack Overflow

**Research date:** 2026-02-04
**Valid until:** 2026-03-04 (30 days - stable domain)
