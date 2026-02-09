# Phase 8: Configurable Study Sessions - Research

**Researched:** 2026-02-09
**Domain:** React Native local settings persistence + study session flow modification
**Confidence:** HIGH

## Summary

Phase 8 adds a "cards per session" setting that persists via AsyncStorage and limits how many cards the study session presents. The codebase already has all the building blocks: AsyncStorage is in the dependency tree (v2.2.0), the ThemeContext/theme.ts pattern demonstrates the exact load/save/context flow to replicate, and the `useStudySession` hook has a clear data pipeline where a card limit can be injected.

The implementation touches three layers: (1) a new "Study" section in SettingsScreen with radio-button presets (10/20/50/All), (2) a persistence module mirroring `lib/theme.ts`, and (3) modification of `useStudySession` to accept a card limit and terminate the session when reached. No new dependencies are needed. No database changes are required -- this is purely a client-side preference.

**Primary recommendation:** Follow the existing ThemeContext pattern exactly -- create a `lib/studySettings.ts` with load/save functions, a context/hook to expose the value, and wire it into the existing `useStudySession` hook and SettingsScreen.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@react-native-async-storage/async-storage` | 2.2.0 | Persist cards-per-session preference | Already in project, used for theme preference |
| React Context API | (built-in) | Share setting across components | Already used for theme (ThemeContext) |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-toast-message` | ^2.3.3 | Feedback on setting change | Already in project, optional |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AsyncStorage | Supabase `user_study_preferences` table | Server-side persistence syncs across devices, but the old table was already dropped (migration `20260105000003`). Overkill for a single local preference. Could be added later if multi-device sync matters. |
| AsyncStorage | MMKV (`react-native-mmkv`) | ~30x faster, synchronous API, but requires native rebuild. AsyncStorage is already in the project and sufficient for a single key read on mount. |
| React Context | Zustand / Jotai | Lightweight state managers, but adding a dependency for one boolean-ish setting is unnecessary when Context pattern is already established. |

**Installation:**
```bash
# No new dependencies needed -- everything is already installed
```

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
  lib/
    theme.ts              # EXISTING: load/saveThemePreference pattern
    studySettings.ts      # NEW: load/saveCardsPerSession (mirror theme.ts)
  contexts/
    ThemeContext.tsx       # EXISTING: context + provider + hook pattern
    StudySettingsContext.tsx  # NEW: context + provider + hook (mirror ThemeContext)
  hooks/
    useTheme.ts           # EXISTING: re-export from context
    useStudySettings.ts   # NEW: re-export from context
    useStudySession.ts    # MODIFY: accept cardsPerSession param
  screens/
    SettingsScreen.tsx     # MODIFY: add "Study" section with radio buttons
    StudyScreen.tsx        # MODIFY: show "studying Y of X" on ready screen
```

### Pattern 1: Settings Persistence (mirror theme.ts exactly)
**What:** AsyncStorage load/save with typed constants
**When to use:** Any time a user preference needs to persist across app restarts
**Example:**
```typescript
// lib/studySettings.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const CARDS_PER_SESSION_KEY = '@lumio/cards-per-session';

export type CardsPerSession = 10 | 20 | 50 | 'all';

export async function loadCardsPerSession(): Promise<CardsPerSession> {
  try {
    const stored = await AsyncStorage.getItem(CARDS_PER_SESSION_KEY);
    if (stored === '10' || stored === '20' || stored === '50') {
      return Number(stored) as 10 | 20 | 50;
    }
    if (stored === 'all') return 'all';
    return 'all'; // default: backward compatible
  } catch {
    return 'all';
  }
}

export async function saveCardsPerSession(value: CardsPerSession): Promise<void> {
  await AsyncStorage.setItem(CARDS_PER_SESSION_KEY, String(value));
}
```
Source: Existing pattern in `apps/android/lib/theme.ts` lines 1-75

### Pattern 2: Context Provider (mirror ThemeContext.tsx exactly)
**What:** React Context wrapping a persisted setting with load on mount
**When to use:** When a setting must be accessible from multiple screens/hooks
**Example:**
```typescript
// contexts/StudySettingsContext.tsx
import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { loadCardsPerSession, saveCardsPerSession, type CardsPerSession } from '../lib/studySettings';

interface StudySettingsContextType {
  cardsPerSession: CardsPerSession;
  setCardsPerSession: (value: CardsPerSession) => void;
}

const StudySettingsContext = createContext<StudySettingsContextType | null>(null);

export function StudySettingsProvider({ children }: { children: ReactNode }) {
  const [cardsPerSession, setCardsPerSessionState] = useState<CardsPerSession>('all');

  useEffect(() => {
    loadCardsPerSession().then(setCardsPerSessionState);
  }, []);

  const setCardsPerSession = useCallback((value: CardsPerSession) => {
    setCardsPerSessionState(value);
    saveCardsPerSession(value);
  }, []);

  return (
    <StudySettingsContext.Provider value={{ cardsPerSession, setCardsPerSession }}>
      {children}
    </StudySettingsContext.Provider>
  );
}

export function useStudySettings(): StudySettingsContextType {
  const context = useContext(StudySettingsContext);
  if (!context) throw new Error('useStudySettings must be used within StudySettingsProvider');
  return context;
}
```
Source: Existing pattern in `apps/android/contexts/ThemeContext.tsx` lines 1-89

### Pattern 3: Session Limiting in useStudySession
**What:** The hook already tracks `seenCardIds` and computes `cardsRemaining`. The limit can be applied by comparing `seenCount` against the configured limit instead of `totalCards`.
**When to use:** When the session needs to end after N cards instead of all cards.
**Key insight:** The current completion logic is:
```typescript
// Current: session ends when selectRandomCard returns null (all seen)
const unseenCards = cards.filter(c => !seenCardIds.current.has(c.id));
if (unseenCards.length === 0) return null;
```
The modification adds a second termination condition:
```typescript
// Modified: also end when limit reached
const effectiveLimit = cardsPerSession === 'all' ? cards.length : cardsPerSession;
if (seenCardIds.current.size >= effectiveLimit) return null;
```
Source: `apps/android/hooks/useStudySession.ts` lines 141-146, 316-319

### Pattern 4: Radio Button Settings UI (mirror Appearance section)
**What:** The SettingsScreen already has a radio-button group pattern for theme selection with icon + label + checkmark.
**When to use:** Exact same pattern for cards-per-session options.
**Key insight:** The existing `themeOptions` array and rendering loop (lines 22-107 in SettingsScreen.tsx) can be duplicated for study options.

### Anti-Patterns to Avoid
- **Don't store in Supabase:** The `user_study_preferences` table was intentionally dropped in migration `20260105000003`. This is a local-only preference. No database migration needed.
- **Don't use a slider:** Explicitly out of scope per REQUIREMENTS.md: "Slider for cards-per-session: Decision paralysis -- use preset radio buttons (10/20/50/All)"
- **Don't create a new navigation screen for settings:** The preference belongs in the existing SettingsScreen, not a separate "Study Settings" screen.
- **Don't modify the card fetching layer:** All cards should still be fetched from the server. The limit is applied client-side after filtering, before presenting.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Persistent key-value storage | Custom file-based storage | AsyncStorage (already installed) | Battle-tested, already in use for theme |
| Cross-component state sharing | Prop drilling through navigation | React Context (already used) | Theme pattern proves it works |
| Radio button group | Custom toggle components | TouchableOpacity with checkmark (existing pattern) | SettingsScreen already has this exact UI |

**Key insight:** This entire feature is a clone of the existing theme preference system. Every building block exists. The risk is in over-engineering, not under-engineering.

## Common Pitfalls

### Pitfall 1: Limit Applied to Wrong Count
**What goes wrong:** The limit is compared against `answeredCards.length` instead of `seenCardIds.size`, causing skipped cards to not count toward the limit.
**Why it happens:** The hook tracks both answered and seen/skipped cards separately.
**How to avoid:** Use `seenCardIds.current.size` (which includes skipped cards) as the counter against the limit. This matches user expectation: "I want to study 20 cards" means 20 cards presented, not 20 cards correctly answered.
**Warning signs:** Setting limit to 10 but session keeps going past 10 when skipping.

### Pitfall 2: Progress Bar Shows Wrong Total
**What goes wrong:** Progress bar shows "5/200" (all available cards) instead of "5/20" (configured session limit).
**Why it happens:** The ProgressBar receives `session.cards.length` as the total, which is all available cards.
**How to avoid:** Compute `effectiveTotal = cardsPerSession === 'all' ? session.cards.length : Math.min(cardsPerSession, session.cards.length)` and pass that to ProgressBar.
**Warning signs:** Progress bar barely moves because the denominator is too large.

### Pitfall 3: Ready Screen Says Wrong Count
**What goes wrong:** Ready screen says "200 cards available" but user configured 20 per session.
**Why it happens:** The ready screen currently shows `session.cards.length` directly (StudyScreen.tsx line 238).
**How to avoid:** Show "Studying 20 of 200 cards" format matching requirement STUDY-02.
**Warning signs:** User confusion about whether the setting took effect.

### Pitfall 4: Context Provider Not Wrapped
**What goes wrong:** `useStudySettings()` throws because the provider isn't in the component tree.
**Why it happens:** Forgetting to add `StudySettingsProvider` to the App root alongside `ThemeProvider`.
**How to avoid:** Add the provider in the same location as ThemeProvider (likely in App.tsx or the auth-gated section).
**Warning signs:** Runtime crash on Settings or Study screen.

### Pitfall 5: Session Limit vs Available Cards Mismatch
**What goes wrong:** User sets limit to 50 but only 12 cards have questions. Session ends at 12, which is correct but could confuse the user.
**Why it happens:** The limit is a ceiling, not a guarantee.
**How to avoid:** The ready screen should show `min(limit, availableCards)` as the planned study count. E.g., "Studying 12 of 12 cards" when limit is 50 but only 12 are available.
**Warning signs:** User sets 50, gets 12, thinks the app is broken.

## Code Examples

### Existing Theme Persistence Pattern (reference implementation)
```typescript
// Source: apps/android/lib/theme.ts (lines 1-75)
// Key storage key pattern: '@lumio/theme-preference'
// Load with fallback to default on error
// Save with immediate write-through
```

### Existing Settings UI Pattern (reference implementation)
```typescript
// Source: apps/android/screens/SettingsScreen.tsx (lines 22-107)
// Array of options with value/label/icon
// Map to TouchableOpacity rows with checkmark indicator
// Section header ("Appearance") pattern
```

### Study Session Completion Check (modification point)
```typescript
// Source: apps/android/hooks/useStudySession.ts (lines 141-146)
// selectRandomCard filters by seenCardIds
// Returns null when no unseen cards remain
// This is where the limit check should be added
```

### Ready Screen Text (modification point)
```typescript
// Source: apps/android/screens/StudyScreen.tsx (lines 229-256)
// renderReady() shows "{cards.length} cards available"
// Should change to "Studying Y of X cards"
```

### Provider Mounting Location
```typescript
// Source: apps/android/App.tsx (lines 12-29)
// Current hierarchy:
//   GestureHandlerRootView > SafeAreaProvider > AuthProvider > ThemeProvider > NavigationContainer
// Add StudySettingsProvider inside ThemeProvider, wrapping NavigationContainer:
//   ThemeProvider > StudySettingsProvider > NavigationContainer
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Server-side `user_study_preferences` table | Dropped in Phase 10 (migration `20260105000003`) | 2026-01-05 | Study preferences no longer in DB; local storage is the path |
| AsyncStorage only | MMKV gaining adoption | 2024+ | MMKV is faster but requires native rebuild; AsyncStorage is fine for this use case |

**Deprecated/outdated:**
- `user_study_preferences` table: Dropped. Do not recreate. Local AsyncStorage is sufficient.

## Open Questions

1. **RESOLVED: Where is App.tsx / provider mounting?**
   - **Answer:** `apps/android/App.tsx` (line 12-29). Provider hierarchy is:
     `GestureHandlerRootView > SafeAreaProvider > AuthProvider > ThemeProvider > NavigationContainer > AppNavigator`
   - **Action:** Mount `StudySettingsProvider` inside `ThemeProvider`, wrapping `NavigationContainer`. This mirrors the existing nesting pattern and makes the study settings available to all screens including the modal Study screen.

2. **Should useStudySession accept cardsPerSession as a parameter or read from context directly?**
   - What we know: The hook currently takes no parameters. It could either read from context internally or accept a prop.
   - What's unclear: Which is cleaner architecturally.
   - Recommendation: Accept as a parameter. This keeps the hook pure (no hidden context dependency) and makes it testable. The StudyScreen reads from context and passes to the hook.

3. **RESOLVED: Should the setting affect the card fetching or just the session termination?**
   - **Answer:** Limit locally (client-side) after fetch. All cards are still fetched from the server, Deck-filtered, then the session limit controls how many are presented. This preserves random selection diversity across the full card pool.

## Sources

### Primary (HIGH confidence)
- `/react-native-async-storage/async-storage` (Context7) - API: getItem, setItem, usage patterns
- `apps/android/lib/theme.ts` - Exact persistence pattern to replicate
- `apps/android/contexts/ThemeContext.tsx` - Exact context/provider pattern to replicate
- `apps/android/screens/SettingsScreen.tsx` - Exact radio-button UI pattern to replicate
- `apps/android/hooks/useStudySession.ts` - Study flow, completion logic, seen tracking
- `apps/android/screens/StudyScreen.tsx` - Ready screen, progress bar, rendering flow
- `apps/android/components/study/ProgressBar.tsx` - Current progress display
- `.planning/REQUIREMENTS.md` - STUDY-01, STUDY-02, STUDY-03 definitions; "no slider" decision
- `supabase/migrations/20260105000003_drop_user_study_preferences.sql` - Confirms server-side preferences removed

### Secondary (MEDIUM confidence)
- `apps/android/package.json` - Confirms AsyncStorage v2.2.0 already installed

### Tertiary (LOW confidence)
- None. All findings verified against codebase.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - No new dependencies, everything already installed and in use
- Architecture: HIGH - Directly mirrors existing ThemeContext pattern with proven track record
- Pitfalls: HIGH - Identified from reading actual code paths and data flow

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (stable -- no external dependencies to track)
