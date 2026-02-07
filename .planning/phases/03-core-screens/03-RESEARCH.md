# Phase 3: Core Screens - Research

**Researched:** 2026-02-07
**Domain:** React Native Dashboard, Repository Management, Dark Mode (Expo + React Navigation)
**Confidence:** HIGH

## Summary

This phase implements the core UI screens for the Lumio Android app: a Dashboard with study statistics and a prominent Study CTA, a Repository management screen with add/remove functionality, and dark mode support with in-app toggle. The app already has placeholder screens from Phase 2 (`DashboardScreen.tsx`, `ReposScreen.tsx`, `SettingsScreen.tsx`) using React Navigation bottom tabs with `StyleSheet.create()` for styling.

The `@lumio/core` package provides all the API functions needed (`getUserStats`, `getUserRepositories`, `addRepository`, `deleteRepository`, `getRepositoryCards`) but is NOT currently integrated into the Android app. The Android app has its own standalone Supabase client in `lib/supabase.ts`. A key integration task is initializing `@lumio/core`'s singleton with the SecureStore adapter so all core functions work.

**Primary recommendation:** Integrate `@lumio/core` into the Android app for API calls, use `react-native-gesture-handler` Swipeable for swipe-to-delete, `react-native-toast-message` for toast notifications, and React Native's `Appearance.setColorScheme()` for dark mode (avoiding NativeWind since the existing codebase uses plain StyleSheet).

## Standard Stack

The established libraries/tools for this domain:

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `react-native` | 0.81.5 | Core framework | FlatList, RefreshControl, Appearance API built-in |
| `@react-navigation/bottom-tabs` | ^7.12.0 | Tab navigation | Already configured in MainNavigator |
| `@supabase/supabase-js` | ^2.45.0 | Backend client | Already used for auth |
| `expo-secure-store` | ^15.0.8 | Secure storage | Already used for auth tokens |
| `@react-native-async-storage/async-storage` | 2.2.0 | General storage | Already installed, use for theme preference persistence |
| `@expo/vector-icons` | ^15.0.3 | Icons | Ionicons already used throughout |

### New Dependencies Required
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@lumio/core` | workspace:* | API functions | All data fetching (stats, repos, cards) |
| `react-native-gesture-handler` | ^2.x | Swipe gestures | Swipe-to-delete on repo list items |
| `react-native-toast-message` | ^2.x | Toast notifications | Success/error feedback for add/remove repo |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `react-native-gesture-handler` Swipeable | Built-in PanResponder | PanResponder is lower-level, more code, harder to get right; gesture-handler is the standard for RN and is a peer dep of react-navigation anyway |
| `react-native-toast-message` | ToastAndroid (built-in) | ToastAndroid is Android-only and not customizable; toast-message works cross-platform with custom styling |
| NativeWind | Continue with StyleSheet | NativeWind is NOT installed; existing Phase 2 code uses StyleSheet.create() exclusively; switching now would require rewriting all existing screens |
| `Appearance.setColorScheme()` + StyleSheet | NativeWind dark: classes | NativeWind dark mode is cleaner but requires full migration; Appearance API works with existing StyleSheet approach |

**Installation:**
```bash
pnpm --filter @lumio/android add @lumio/core@workspace:* react-native-gesture-handler react-native-toast-message
```

**Note:** `react-native-gesture-handler` requires a development build (NOT Expo Go). This aligns with Phase 2 which already requires a dev build for `@react-native-google-signin/google-signin`.

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
├── App.tsx                    # Root (add Toast component, theme provider)
├── lib/
│   ├── supabase.ts            # Keep as-is for auth (SecureStore adapter)
│   ├── core.ts                # NEW: Initialize @lumio/core singleton
│   └── theme.ts               # NEW: Theme colors and dark mode utilities
├── contexts/
│   ├── AuthContext.tsx         # Existing (no changes)
│   └── ThemeContext.tsx        # NEW: Dark mode state + toggle
├── navigation/
│   ├── AppNavigator.tsx        # Existing (wrap with ThemeContext)
│   ├── AuthNavigator.tsx       # Existing
│   └── MainNavigator.tsx       # Existing (update colors for dark mode)
├── screens/
│   ├── LoginScreen.tsx         # Existing (add dark mode styles)
│   ├── DashboardScreen.tsx     # REWRITE: Stats cards + Study CTA + pull-to-refresh
│   ├── ReposScreen.tsx         # REWRITE: Repo list + add form + swipe-to-delete
│   └── SettingsScreen.tsx      # ENHANCE: Add dark mode toggle
├── components/
│   ├── OfflineBanner.tsx       # Existing (add dark mode styles)
│   ├── StudyFAB.tsx            # Existing (unused per NAV-03 decision)
│   ├── StatCard.tsx            # NEW: Reusable stat tile component
│   ├── RepoListItem.tsx        # NEW: Swipeable repo row
│   ├── AddRepoForm.tsx         # NEW: URL input + PAT detection
│   └── EmptyState.tsx          # NEW: Reusable empty state component
└── hooks/
    └── useTheme.ts             # NEW: Hook for accessing theme colors
```

### Pattern 1: @lumio/core Integration with SecureStore
**What:** Initialize the @lumio/core Supabase singleton with the same SecureStore adapter used for auth
**When to use:** At app startup, before any API calls
**Example:**
```typescript
// lib/core.ts
import { createSupabaseClient, type StorageAdapter } from '@lumio/core';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase credentials');
}

const SecureStoreAdapter: StorageAdapter = {
  getItem: (key: string) => SecureStore.getItemAsync(key),
  setItem: (key: string, value: string) => SecureStore.setItemAsync(key, value),
  removeItem: (key: string) => SecureStore.deleteItemAsync(key),
};

// Initialize @lumio/core singleton - call once at app startup
export const supabase = createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  storage: SecureStoreAdapter,
});
```

**CRITICAL:** This creates a SECOND Supabase client (the existing `lib/supabase.ts` creates one too). Both use SecureStore so they share the same persisted session. The options are:
1. Replace `lib/supabase.ts` with `lib/core.ts` and update AuthContext imports - RECOMMENDED
2. Keep both (risk of session desync) - NOT RECOMMENDED

Recommendation: Replace `lib/supabase.ts` with `@lumio/core`'s client. Update AuthContext to import `getSupabaseClient` from `@lumio/core`.

### Pattern 2: Dark Mode with Appearance API + StyleSheet
**What:** Use React Native's `Appearance.setColorScheme()` for system override, with theme colors defined in a central theme file
**When to use:** Throughout the app for all color references
**Example:**
```typescript
// lib/theme.ts
import { Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';

const THEME_KEY = '@lumio/theme-preference';

export type ThemePreference = 'system' | 'light' | 'dark';

export const lightColors = {
  background: '#f5f5f5',
  surface: '#ffffff',
  text: '#333333',
  textSecondary: '#6B7280',
  primary: '#3B82F6',
  danger: '#ef4444',
  border: '#e5e7eb',
};

export const darkColors = {
  background: '#111827',
  surface: '#1f2937',
  text: '#f9fafb',
  textSecondary: '#9ca3af',
  primary: '#60a5fa',
  danger: '#f87171',
  border: '#374151',
};

export async function loadThemePreference(): Promise<ThemePreference> {
  const stored = await AsyncStorage.getItem(THEME_KEY);
  return (stored as ThemePreference) || 'system';
}

export async function saveThemePreference(pref: ThemePreference): Promise<void> {
  await AsyncStorage.setItem(THEME_KEY, pref);
  // Apply to native layer
  Appearance.setColorScheme(pref === 'system' ? null : pref);
}
```

```typescript
// contexts/ThemeContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import { useColorScheme } from 'react-native';
import { lightColors, darkColors, loadThemePreference, saveThemePreference, type ThemePreference } from '../lib/theme';

interface ThemeContextType {
  colors: typeof lightColors;
  isDark: boolean;
  preference: ThemePreference;
  setPreference: (pref: ThemePreference) => Promise<void>;
}

const ThemeContext = createContext<ThemeContextType | null>(null);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [preference, setPreferenceState] = useState<ThemePreference>('system');

  useEffect(() => {
    loadThemePreference().then(setPreferenceState);
  }, []);

  const isDark = preference === 'system'
    ? systemScheme === 'dark'
    : preference === 'dark';

  const colors = isDark ? darkColors : lightColors;

  const setPreference = async (pref: ThemePreference) => {
    setPreferenceState(pref);
    await saveThemePreference(pref);
  };

  return (
    <ThemeContext.Provider value={{ colors, isDark, preference, setPreference }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be inside ThemeProvider');
  return ctx;
}
```

### Pattern 3: FlatList with Pull-to-Refresh
**What:** Use FlatList's built-in `onRefresh` and `refreshing` props
**When to use:** Dashboard stats and Repository list screens
**Example:**
```typescript
// Source: React Native official docs
<FlatList
  data={repositories}
  renderItem={({ item }) => <RepoListItem repo={item} />}
  keyExtractor={(item) => item.id}
  onRefresh={handleRefresh}
  refreshing={isRefreshing}
  ListEmptyComponent={<EmptyState />}
/>
```

### Pattern 4: Swipeable List Items for Delete
**What:** Use react-native-gesture-handler's Swipeable for swipe-to-reveal delete action
**When to use:** Repository list items
**Example:**
```typescript
// Source: react-native-gesture-handler docs (Context7)
import Swipeable from 'react-native-gesture-handler/Swipeable';

function RepoListItem({ repo, onDelete }: Props) {
  const renderRightActions = () => (
    <TouchableOpacity
      style={{ backgroundColor: '#ef4444', justifyContent: 'center', paddingHorizontal: 20 }}
      onPress={() => onDelete(repo.id, repo.name)}
    >
      <Text style={{ color: '#fff', fontWeight: '600' }}>Delete</Text>
    </TouchableOpacity>
  );

  return (
    <Swipeable renderRightActions={renderRightActions} overshootRight={false}>
      <View style={styles.repoItem}>
        {/* repo content */}
      </View>
    </Swipeable>
  );
}
```

### Pattern 5: Add Repository Flow (Single Input + Auto-Detection)
**What:** Single URL input that auto-detects public/private repos; prompts for PAT when public validation fails
**When to use:** Add repository form on ReposScreen
**Flow:**
1. User enters GitHub URL
2. App calls `addRepository({ url })` (public attempt)
3. If success: show toast, add to list
4. If fails with auth error: show PAT input field (expandable section)
5. User enters PAT, app calls `addRepository({ url, isPrivate: true, accessToken: pat })`
6. Success/error shown via toast

### Pattern 6: Toast Notifications
**What:** Imperative toast API for success/error feedback
**When to use:** After add/remove repository operations, and for network errors
**Example:**
```typescript
// Source: react-native-toast-message docs (Context7)
import Toast from 'react-native-toast-message';

// In App.tsx root
<Toast />

// In any component
Toast.show({
  type: 'success',
  text1: 'Repository added',
  text2: 'Cards will sync automatically',
  position: 'bottom',
});

Toast.show({
  type: 'error',
  text1: 'Failed to add repository',
  text2: 'Invalid GitHub URL',
  position: 'bottom',
});
```

### Anti-Patterns to Avoid
- **Multiple Supabase clients:** Do NOT keep both `lib/supabase.ts` and `@lumio/core` creating separate clients. They will compete for session storage. Replace with single @lumio/core singleton.
- **Inline colors everywhere:** Do NOT hardcode color values in each screen. Centralize in `theme.ts` and use `useTheme()` hook so dark mode works globally.
- **Fetching in render:** Do NOT call API functions directly in render. Use `useEffect` + state, or extract into custom hooks.
- **Missing error boundaries:** API calls can fail (network, auth expired). Always wrap in try/catch with user-visible feedback.

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Swipe-to-delete | Custom PanResponder with Animated | `react-native-gesture-handler` Swipeable | Edge cases: velocity thresholds, spring animations, overshoot prevention, nested scroll conflicts |
| Toast notifications | Custom positioned View with timeouts | `react-native-toast-message` | Handles keyboard avoidance, stacking, animations, gesture dismiss, bottom offset |
| Pull-to-refresh | Custom scroll detection | FlatList `onRefresh`/`refreshing` props | Built-in, native RefreshControl, proper spinner |
| Repository API calls | Direct fetch to Supabase Edge Functions | `@lumio/core` exported functions | Already handles auth token, error mapping, type safety |
| Confirmation dialog | Custom modal | React Native `Alert.alert()` | Native platform dialog, accessible, no extra dependency |
| Dark mode detection | Manual Appearance listener | `useColorScheme()` hook | React hook that auto-updates on system change |

**Key insight:** The `@lumio/core` package already contains ALL the API functions needed for this phase. The web app and PWA mobile app both use them successfully. Re-implementing API calls in the Android app would be wasteful and error-prone.

## Common Pitfalls

### Pitfall 1: Dual Supabase Clients
**What goes wrong:** Two Supabase clients both using SecureStore for auth persistence. Token refresh on one client not reflected in the other. Possible auth state desync.
**Why it happens:** Phase 2 created `lib/supabase.ts` standalone. Phase 3 needs `@lumio/core` which has its own client singleton.
**How to avoid:** Replace `lib/supabase.ts` with `@lumio/core`'s `createSupabaseClient`. Update `AuthContext.tsx` to use `getSupabaseClient()` from `@lumio/core`.
**Warning signs:** Auth errors after successful login, inconsistent session state between screens.

### Pitfall 2: Missing GestureHandlerRootView
**What goes wrong:** Swipeable components don't respond to gestures, or the app crashes.
**Why it happens:** `react-native-gesture-handler` requires `GestureHandlerRootView` wrapping the app root.
**How to avoid:** Add `<GestureHandlerRootView style={{ flex: 1 }}>` as the outermost wrapper in `App.tsx`.
**Warning signs:** Swipe gestures not detected, "Cannot determine the root view" errors.

### Pitfall 3: Dark Mode Color Inconsistency
**What goes wrong:** Some elements use hardcoded light colors, creating a jarring experience in dark mode.
**Why it happens:** Phase 2 screens use hardcoded color values in StyleSheet.create() (e.g., `backgroundColor: '#f5f5f5'`, `color: '#333333'`).
**How to avoid:** Extract ALL colors to a theme object. Use `useTheme()` hook in every screen. Apply colors dynamically: `{ backgroundColor: colors.background }`.
**Warning signs:** White backgrounds in dark mode, invisible text against dark backgrounds.

### Pitfall 4: Navigation Header Dark Mode
**What goes wrong:** Tab bar and navigation headers stay light-colored in dark mode.
**Why it happens:** React Navigation's `screenOptions` are set statically in `MainNavigator.tsx`.
**How to avoid:** Use `useTheme()` inside the navigator component to set `headerStyle`, `tabBarStyle`, `tabBarActiveTintColor` dynamically based on theme.
**Warning signs:** Light blue header bar in dark mode.

### Pitfall 5: Study Button Disabled State Without Loading
**What goes wrong:** Study button shows as disabled before stats load, with no explanation.
**Why it happens:** `cardCount` starts as 0 (default), so button appears disabled immediately.
**How to avoid:** Track loading state separately. While loading, show a loading indicator on the button. After loading, if cardCount === 0, disable with explanatory message below.
**Warning signs:** Users confused about why they can't study.

### Pitfall 6: Stale Repository List After Add/Delete
**What goes wrong:** User adds a repo but it doesn't appear in the list.
**Why it happens:** No refresh trigger after add/delete operations.
**How to avoid:** After successful add/delete, either re-fetch the list or optimistically update local state. The web app uses Supabase Realtime for this, but for the native app, a simple re-fetch after mutation is sufficient.
**Warning signs:** Need to manually pull-to-refresh to see changes.

### Pitfall 7: "Last Studied" Timestamp Not Available
**What goes wrong:** Context specifies "last study timestamp" as a dashboard stat, but `getUserStats()` only returns `repositoryCount` and `cardCount`.
**Why it happens:** Backend constraint says "Backend remains unchanged" for this phase.
**How to avoid:** Show "last studied" as "--" or "Not yet" placeholder. Alternatively, query `study_sessions` table directly via Supabase client (SELECT MAX(started_at) WHERE user_id = auth.uid()). This is a client-side read query, not a backend change.
**Warning signs:** Empty or undefined stat card.

## Code Examples

Verified patterns from official sources:

### Dashboard Stat Card Component
```typescript
// components/StatCard.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';

interface StatCardProps {
  icon: keyof typeof Ionicons.glyphMap;
  iconColor: string;
  iconBgColor: string;
  label: string;
  value: string | number;
  subtitle?: string;
  isLoading?: boolean;
}

export function StatCard({ icon, iconColor, iconBgColor, label, value, subtitle, isLoading }: StatCardProps) {
  const { colors } = useTheme();

  return (
    <View style={[styles.card, { backgroundColor: colors.surface }]}>
      <View style={[styles.iconContainer, { backgroundColor: iconBgColor }]}>
        <Ionicons name={icon} size={20} color={iconColor} />
      </View>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      {isLoading ? (
        <View style={[styles.skeleton, { backgroundColor: colors.border }]} />
      ) : (
        <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
      )}
      {subtitle && (
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>{subtitle}</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  label: { fontSize: 13, fontWeight: '500' },
  value: { fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  subtitle: { fontSize: 11, marginTop: 2 },
  skeleton: { width: 40, height: 28, borderRadius: 4, marginTop: 4 },
});
```

### Confirmation Dialog (Built-in Alert)
```typescript
// Source: React Native Alert API
import { Alert } from 'react-native';

function confirmDeleteRepo(repoName: string, onConfirm: () => void) {
  Alert.alert(
    'Delete Repository?',
    `Are you sure you want to remove "${repoName}"? All associated cards will be removed.`,
    [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ],
  );
}
```

### Add Repository with Auto-Detection Flow
```typescript
// Simplified flow for add repo
import { addRepository } from '@lumio/core';
import Toast from 'react-native-toast-message';

async function handleAddRepo(url: string, accessToken?: string) {
  try {
    await addRepository({
      url: url.trim(),
      isPrivate: !!accessToken,
      accessToken: accessToken?.trim(),
    });
    Toast.show({ type: 'success', text1: 'Repository added' });
    // Refresh list
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Failed to add';
    // If error suggests auth required, show PAT input
    if (message.includes('404') || message.includes('Not Found')) {
      // Prompt for PAT - repo might be private
      setShowPatInput(true);
    } else {
      Toast.show({ type: 'error', text1: 'Error', text2: message });
    }
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| NativeWind for styling | Plain StyleSheet | Phase 2 (2026-02) | Context mentions NativeWind but Phase 2 established StyleSheet pattern; do NOT switch mid-project |
| Separate Supabase client per app | Shared `@lumio/core` singleton | Phase 1 design, not yet integrated in Android | Must integrate now; web and PWA already use it |
| `Swipeout` library | `react-native-gesture-handler` Swipeable | 2024+ | Swipeout is unmaintained; gesture-handler is actively maintained by Software Mansion |
| Custom toast views | `react-native-toast-message` | Mature library | 92.8 benchmark score, imperative API, no gesture-handler dependency |
| React Navigation v6 | React Navigation v7 | Already using v7 | v7 is installed; use its theming system for dark mode |

**Deprecated/outdated:**
- `react-native-swipeout`: Unmaintained, use `react-native-gesture-handler` Swipeable instead
- `react-native-elements` Toast: Package is heavyweight; prefer dedicated toast library
- Expo Go compatibility: Not relevant since Phase 2 already requires development build

## Open Questions

Things that couldn't be fully resolved:

1. **"Last Studied" timestamp data source**
   - What we know: `getUserStats()` returns only `repositoryCount` and `cardCount`. The `user_cards` table has `last_studied_at` and `study_sessions` has `started_at`. Both are accessible via Supabase client query.
   - What's unclear: Whether querying `study_sessions` directly is acceptable under "backend remains unchanged" (it's a client-side read, not a backend change).
   - Recommendation: Query `study_sessions` directly via Supabase client: `SELECT MAX(started_at) FROM study_sessions WHERE user_id = auth.uid()`. This is a read-only client query, not a backend change. If this feels like scope creep, show "Not yet" as placeholder.

2. **@lumio/core client replacement vs. coexistence**
   - What we know: Both `lib/supabase.ts` and `@lumio/core` create Supabase clients with SecureStore. Having two clients risks session desync.
   - What's unclear: Whether AuthContext's Google Sign-In flow (which uses `supabase.auth.signInWithIdToken`) will work the same with @lumio/core's client (which uses `flowType: 'pkce'`).
   - Recommendation: Replace `lib/supabase.ts` with `@lumio/core` initialization. The PKCE flow type in @lumio/core should not affect the `signInWithIdToken` method, which bypasses OAuth flows entirely. Test this during implementation.

3. **react-native-gesture-handler build integration**
   - What we know: The package requires a development build and may need `GestureHandlerRootView` wrapping.
   - What's unclear: Whether Expo SDK 54 + React Native 0.81.5 have any compatibility issues with the latest gesture-handler.
   - Recommendation: Install `react-native-gesture-handler` (it is a standard peer dependency of react-navigation). Add `GestureHandlerRootView` to `App.tsx`. Rebuild the dev client.

## Sources

### Primary (HIGH confidence)
- React Native official docs (Context7 `/websites/reactnative_dev`) - FlatList onRefresh, Appearance.setColorScheme(), useColorScheme
- react-native-gesture-handler (Context7 `/software-mansion/react-native-gesture-handler`) - Swipeable component API and examples
- react-native-toast-message (Context7 `/calintamas/react-native-toast-message`) - Setup, imperative API, custom layouts
- NativeWind (Context7 `/websites/nativewind_dev`) - Dark mode API (documented but NOT used; confirms Appearance API is the underlying mechanism)
- Codebase analysis: `apps/android/` (all screens, navigation, auth), `packages/core/src/` (all API functions), `packages/shared/src/types/` (TypeScript interfaces)

### Secondary (MEDIUM confidence)
- Web app RepositoriesPage.tsx - Reference implementation for add/delete repo flow, confirmation dialog, toast notifications
- PWA mobile DashboardPage.tsx - Reference implementation for stats display, study button disabled state
- PWA mobile RepositoriesPage.tsx - Reference for repo list display, card counts per repo

### Tertiary (LOW confidence)
- WebSearch for toast libraries and swipe-to-delete alternatives - Used for discovery, verified with Context7

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries verified via Context7 and official docs; existing codebase analyzed
- Architecture: HIGH - Patterns directly derived from existing Phase 2 code and working web/PWA implementations
- Pitfalls: HIGH - Identified from actual codebase analysis (dual clients, hardcoded colors, missing data)
- @lumio/core integration: MEDIUM - Client replacement approach is sound but needs testing with signInWithIdToken flow

**Research date:** 2026-02-07
**Valid until:** 2026-03-09 (30 days - stable domain, mature libraries)
