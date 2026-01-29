# Architecture Research: React Native Android App

**Domain:** React Native mobile application (Android-only)
**Researched:** 2026-01-29
**Confidence:** HIGH (verified with official docs and current best practices)

## Standard Architecture

### System Overview

```
+------------------------------------------------------------------+
|                       REACT NATIVE APP                            |
|------------------------------------------------------------------|
|                         SCREENS                                   |
|  +----------+  +----------+  +----------+  +----------+          |
|  |  Login   |  |Dashboard |  |  Repos   |  |  Study   |          |
|  +----+-----+  +----+-----+  +----+-----+  +----+-----+          |
|       |             |             |             |                 |
|-------+-------------+-------------+-------------+-----------------|
|                       NAVIGATION                                  |
|  +----------------------------------------------------------+    |
|  |              Expo Router (file-based)                     |    |
|  +----------------------------------------------------------+    |
|------------------------------------------------------------------|
|                       STATE LAYER                                 |
|  +------------------+  +--------------------+                     |
|  | TanStack Query   |  |     Zustand        |                     |
|  | (server state)   |  |  (client state)    |                     |
|  +--------+---------+  +---------+----------+                     |
|           |                      |                                |
|------------------------------------------------------------------|
|                       API LAYER                                   |
|  +----------------------------------------------------------+    |
|  |                 @lumio/core (shared)                      |    |
|  |   - createSupabaseClient()                                |    |
|  |   - signInWithGoogle(), signOut()                         |    |
|  |   - getUserRepositories(), getStudyCards()                |    |
|  |   - generateQuiz(), validateAnswer()                      |    |
|  +----------------------------------------------------------+    |
+------------------------------------------------------------------+
           |                    |                    |
           v                    v                    v
+-------------------+  +------------------+  +------------------+
|   Supabase Auth   |  | Supabase DB/RLS  |  |  Edge Functions  |
|   (Google OAuth)  |  |   (PostgreSQL)   |  |   (LLM proxy)    |
+-------------------+  +------------------+  +------------------+
```

### Component Responsibilities

| Component | Responsibility | Typical Implementation |
|-----------|----------------|------------------------|
| Screens | UI + user interactions | React components in `app/` directory |
| Navigation | Route management, deep links | Expo Router (file-based routing) |
| TanStack Query | Server data fetching, caching | `useQuery`, `useMutation` hooks |
| Zustand | Client-only state (UI state, preferences) | Small stores for specific concerns |
| @lumio/core | Supabase client, business logic | Shared package (already exists) |
| Auth Context | Session management, auth state | React Context wrapping Supabase auth |

## Recommended Project Structure

```
apps/native/                       # New React Native app
├── app/                           # Expo Router screens (file-based routing)
│   ├── _layout.tsx               # Root layout (providers, auth wrapper)
│   ├── index.tsx                 # Home redirect
│   ├── login.tsx                 # Login screen
│   ├── (auth)/                   # Auth group (protected routes)
│   │   ├── _layout.tsx           # Protected layout wrapper
│   │   ├── dashboard.tsx         # Dashboard screen
│   │   ├── repositories.tsx      # Repositories list
│   │   ├── study.tsx             # Study session
│   │   └── card/[id].tsx         # Card preview (dynamic route)
│   └── auth/
│       └── callback.tsx          # OAuth callback handler
│
├── src/
│   ├── components/               # Shared UI components
│   │   ├── ui/                   # Base UI atoms (Button, Card, etc.)
│   │   ├── CardPreview.tsx       # Card markdown rendering
│   │   ├── QuizQuestion.tsx      # Quiz UI component
│   │   └── StatsCard.tsx         # Statistics display
│   │
│   ├── hooks/                    # Custom hooks
│   │   ├── useAuth.ts            # Auth state hook
│   │   ├── useRepositories.ts    # TanStack Query wrapper
│   │   ├── useStudySession.ts    # Study flow state
│   │   └── useQuiz.ts            # Quiz generation/validation
│   │
│   ├── stores/                   # Zustand stores (client state)
│   │   ├── uiStore.ts            # UI preferences, theme
│   │   └── studyStore.ts         # Current study session state
│   │
│   ├── providers/                # React context providers
│   │   ├── AuthProvider.tsx      # Auth context
│   │   └── QueryProvider.tsx     # TanStack Query setup
│   │
│   ├── lib/                      # Utilities
│   │   ├── supabase.ts           # Supabase client init (uses @lumio/core)
│   │   └── storage.ts            # AsyncStorage adapter
│   │
│   └── types/                    # App-specific types
│       └── navigation.ts         # Route type definitions
│
├── assets/                       # Images, fonts
├── app.json                      # Expo config
├── babel.config.js               # Babel + NativeWind
├── tailwind.config.js            # Tailwind configuration
├── nativewind-env.d.ts           # NativeWind TypeScript support
├── metro.config.js               # Metro bundler config
└── package.json
```

### Structure Rationale

- **app/:** Expo Router convention. File names become routes automatically. Groups with `()` allow shared layouts without affecting URL.
- **src/components/:** Reusable UI components. Atomic design lite - ui/ for primitives, feature components at root.
- **src/hooks/:** Custom hooks that encapsulate TanStack Query calls and business logic. One hook per feature area.
- **src/stores/:** Zustand stores for client-only state. Keep minimal - most state should be in TanStack Query.
- **src/providers/:** Context providers. Auth wraps entire app, Query provider at root.
- **src/lib/:** Framework setup and utilities. Supabase initialization happens here.

## Architectural Patterns

### Pattern 1: File-Based Routing with Expo Router

**What:** Routes are defined by file system structure in `app/` directory.
**When to use:** Default for all Expo projects. Automatically provides deep linking.
**Trade-offs:** Less flexible than programmatic routing, but much simpler setup.

**Example:**
```typescript
// app/(auth)/_layout.tsx - Protected route wrapper
import { Redirect, Slot } from 'expo-router';
import { useAuth } from '@/hooks/useAuth';

export default function AuthLayout() {
  const { user, isLoading } = useAuth();

  if (isLoading) return <LoadingScreen />;
  if (!user) return <Redirect href="/login" />;

  return <Slot />;
}
```

### Pattern 2: TanStack Query for Server State

**What:** All API calls go through TanStack Query hooks. Handles caching, refetching, loading/error states.
**When to use:** Any data that comes from Supabase (repositories, cards, stats, quiz).
**Trade-offs:** Additional abstraction layer, but eliminates manual cache management.

**Example:**
```typescript
// src/hooks/useRepositories.ts
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getUserRepositories, addRepository, deleteRepository } from '@lumio/core';

export function useRepositories() {
  return useQuery({
    queryKey: ['repositories'],
    queryFn: getUserRepositories,
  });
}

export function useAddRepository() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (url: string) => addRepository(url),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['repositories'] });
    },
  });
}
```

### Pattern 3: Zustand for Client State

**What:** Lightweight store for UI-only state that needs to persist across screens.
**When to use:** Theme preference, study session progress, UI toggles. NOT for server data.
**Trade-offs:** Very simple API, but easy to overuse. Keep stores small and focused.

**Example:**
```typescript
// src/stores/studyStore.ts
import { create } from 'zustand';

interface StudyState {
  currentCardIndex: number;
  selectedAnswer: string | null;
  setSelectedAnswer: (answer: string | null) => void;
  nextCard: () => void;
  reset: () => void;
}

export const useStudyStore = create<StudyState>((set) => ({
  currentCardIndex: 0,
  selectedAnswer: null,
  setSelectedAnswer: (answer) => set({ selectedAnswer: answer }),
  nextCard: () => set((state) => ({
    currentCardIndex: state.currentCardIndex + 1,
    selectedAnswer: null
  })),
  reset: () => set({ currentCardIndex: 0, selectedAnswer: null }),
}));
```

### Pattern 4: Auth Context with Supabase

**What:** React Context that wraps Supabase auth, provides user state and auth methods.
**When to use:** App-wide auth state. Use @lumio/core functions internally.
**Trade-offs:** Context re-renders all consumers on change, but auth changes are rare.

**Example:**
```typescript
// src/providers/AuthProvider.tsx
import { createContext, useContext, useEffect, useState } from 'react';
import {
  createSupabaseClient,
  onAuthStateChange,
  signInWithGoogle as coreSignIn,
  signOut as coreSignOut,
  type AuthUser
} from '@lumio/core';
import AsyncStorage from '@react-native-async-storage/async-storage';

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Initialize Supabase with AsyncStorage
    createSupabaseClient(
      process.env.EXPO_PUBLIC_SUPABASE_URL!,
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!,
      { storage: AsyncStorage }
    );

    // Subscribe to auth changes
    const { data: { subscription } } = onAuthStateChange(setUser);
    setIsLoading(false);

    return () => subscription.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, isLoading, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
```

## Data Flow

### Request Flow

```
[User taps "Study"]
    |
    v
[StudyScreen] --> useStudyCards() hook
    |
    v
[TanStack Query] --> getStudyCards() from @lumio/core
    |
    v
[@lumio/core] --> Supabase client
    |
    v
[Supabase] --> PostgreSQL + RLS
    |
    v
[Response] --> TanStack Query cache
    |
    v
[Re-render] <-- useStudyCards() returns data
```

### State Management

```
+----------------+     +-----------------+     +----------------+
| Server State   |     | Client State    |     | Local State    |
| (TanStack)     |     | (Zustand)       |     | (useState)     |
+----------------+     +-----------------+     +----------------+
| - Repositories |     | - Current card  |     | - Form inputs  |
| - Cards        |     |   index         |     | - Modal open   |
| - User stats   |     | - Selected      |     | - Loading UI   |
| - Quiz data    |     |   answer        |     |                |
| - API keys     |     | - Theme pref    |     |                |
+----------------+     +-----------------+     +----------------+
        |                      |                      |
        +----------------------+----------------------+
                               |
                         [Components]
```

### Key Data Flows

1. **Authentication Flow:** User taps login -> Expo AuthSession opens Google OAuth -> callback URL handled by Expo Router -> Supabase session stored in AsyncStorage -> AuthContext updates -> protected routes become accessible.

2. **Study Session Flow:** User taps "Study" -> TanStack Query fetches cards -> Zustand store tracks current card index -> quiz generated via Edge Function -> answer validated -> SM-2 algorithm updates card schedule -> TanStack cache invalidated.

3. **Repository Sync:** Cards are synced via Docora webhooks (server-side). Client only reads. TanStack Query handles cache invalidation on focus/reconnect.

## Build Order (Dependencies)

### Phase 1: Foundation (must be first)
1. **Expo project setup** - `npx create-expo-app` with TypeScript
2. **Monorepo integration** - Add to pnpm workspace, configure path aliases
3. **@lumio/core dependency** - Verify shared package works with React Native
4. **NativeWind setup** - Tailwind CSS for React Native styling

### Phase 2: Core Infrastructure
5. **AsyncStorage adapter** - For Supabase session persistence
6. **Supabase client initialization** - Using @lumio/core with AsyncStorage
7. **TanStack Query provider** - Query client setup
8. **Auth provider** - Context wrapping Supabase auth

### Phase 3: Navigation
9. **Expo Router setup** - File-based routing structure
10. **Protected routes** - Auth layout wrapper
11. **OAuth callback handling** - Deep link for Google OAuth

### Phase 4: Screens
12. **Login screen** - Google OAuth button
13. **Dashboard screen** - Stats + study button
14. **Repositories screen** - List view
15. **Study screen** - Quiz flow
16. **Card preview** - Markdown rendering

### Dependency Graph

```
[Expo Project]
      |
      v
[Monorepo Integration] --> [@lumio/core available]
      |
      v
[NativeWind] --> [Styling available]
      |
      v
[AsyncStorage + Supabase Client]
      |
      +---> [Auth Provider]
      |           |
      v           v
[TanStack Query] [Expo Router]
      |           |
      +-----+-----+
            |
            v
      [Screens can be built]
```

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| Single user | Current architecture is sufficient. AsyncStorage for sessions. |
| 100+ cards | Consider pagination in card list, lazy loading in study. |
| Offline use | Add TanStack Query persistence, sync queue for study progress. |
| Multiple repos | Already supported via current Supabase schema. |

### Scaling Priorities

1. **First bottleneck:** Markdown rendering performance with many cards. Mitigation: virtualized list (FlashList), memoized rendering.
2. **Second bottleneck:** Initial load time with large card sets. Mitigation: pagination, prefetching next cards.

## Anti-Patterns

### Anti-Pattern 1: Mixing Server and Client State

**What people do:** Store fetched data in Zustand instead of TanStack Query.
**Why it's wrong:** Lose automatic caching, refetching, and cache invalidation. Manual sync bugs.
**Do this instead:** TanStack Query for ALL server data. Zustand only for client-only state (UI preferences, session progress).

### Anti-Pattern 2: Direct Supabase Calls in Components

**What people do:** Import Supabase client directly in screen components.
**Why it's wrong:** Bypasses @lumio/core abstractions, duplicates logic, harder to test.
**Do this instead:** Always use @lumio/core functions. Wrap them in custom hooks for React integration.

### Anti-Pattern 3: Giant Context Providers

**What people do:** Put everything (auth, theme, study state, etc.) in one context.
**Why it's wrong:** Any state change re-renders entire app. Performance degradation.
**Do this instead:** Separate contexts by concern. Use Zustand for high-frequency updates. TanStack Query for server state.

### Anti-Pattern 4: Inline Styles Instead of NativeWind

**What people do:** Use `style={{ marginTop: 10 }}` or StyleSheet.create everywhere.
**Why it's wrong:** Inconsistent with existing Tailwind codebase, harder to maintain.
**Do this instead:** Use NativeWind className props. Same Tailwind classes as web/PWA.

## Integration Points

### External Services

| Service | Integration Pattern | Notes |
|---------|---------------------|-------|
| Supabase Auth | AsyncStorage + PKCE flow | Google OAuth via Expo AuthSession |
| Supabase DB | @lumio/core functions | Same API as PWA |
| Edge Functions | @lumio/core functions | Quiz generation, validation |
| Sentry | @sentry/react-native | Separate DSN from web |

### Internal Boundaries

| Boundary | Communication | Notes |
|----------|---------------|-------|
| Screens <-> Hooks | React hooks | One hook per feature |
| Hooks <-> @lumio/core | Function calls | Shared business logic |
| @lumio/core <-> Supabase | Supabase JS client | AsyncStorage for persistence |
| Screens <-> Stores | Zustand hooks | Client state only |

### Reusable from Existing Codebase

| Module | Reusability | Notes |
|--------|-------------|-------|
| @lumio/core | 100% | All Supabase functions work as-is |
| @lumio/shared | 100% | Types, constants fully compatible |
| Tailwind config | ~90% | Same design tokens, minor RN adjustments |
| Auth flow logic | 80% | Same pattern, different OAuth handler |
| Component logic | 60% | Same patterns, different UI primitives |
| UI components | 0% | Must rebuild with React Native components |

## Sources

- [Expo Router Introduction](https://docs.expo.dev/router/introduction/) - File-based routing documentation
- [React Native Project Structure - Expo Starter](https://starter.obytes.com/getting-started/project-structure/) - Recommended folder organization
- [React State Management in 2025](https://www.developerway.com/posts/react-state-management-2025) - TanStack Query + Zustand patterns
- [Supabase Auth with React Native](https://supabase.com/docs/guides/auth/quickstarts/react-native) - Official integration guide
- [NativeWind Documentation](https://www.nativewind.dev/) - Tailwind CSS for React Native
- [Expo vs Bare React Native](https://www.godeltech.com/blog/expo-vs-bare-react-native-in-2025/) - Framework comparison

---
*Architecture research for: React Native Android App (Lumio)*
*Researched: 2026-01-29*
