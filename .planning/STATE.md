# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** Phase 3 - Core Screens (Complete)

## Current Position

Phase: 3 of 5 (Core Screens)
Plan: 5 of 5 complete
Status: Phase complete (including gap closure)
Last activity: 2026-02-07 — Completed 03-05-PLAN.md (UAT gap closure: Dashboard nav + PAT usability)

Progress: [████████████████████] 100% (11/11 plans through Phase 3.5)

## Performance Metrics

**Velocity:**
- Total plans completed: 11
- Average duration: 3.1 min
- Total execution time: 34 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2 | 7 min | 3.5 min |
| 02-auth-navigation | 4 | 11 min | 2.75 min |
| 03-core-screens | 5 | 16 min | 3.2 min |

**Recent Trend:**
- Last 5 plans: 03-01 (4 min), 03-02 (4 min), 03-03 (2 min), 03-04 (3 min), 03-05 (3 min)
- Trend: Stable at ~3 min per plan

*Updated after each plan completion*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.
Recent decisions affecting current work:

- **NAV-01:** Use react-navigation directly instead of expo-router (monorepo incompatibility)
- **CLEAN-03:** Reuse @lumio/core as-is (platform-agnostic types and utilities)
- **Package naming:** @lumio/android for workspace consistency
- **Secure storage:** LargeSecureStore pattern (AES-256 keys in SecureStore, encrypted data in AsyncStorage)
- **Env validation:** Fail-fast at module load if Supabase credentials missing
- **AUTH-01:** SecureStore adapter replaces AsyncStorage for encrypted Supabase auth token storage
- **AUTH-02:** Google Sign-In uses webClientId (not Android client ID) for Supabase signInWithIdToken compatibility
- **AUTH-03:** Cancelled sign-in returns silently (no error toast) per CONTEXT discretion
- **AUTH-04:** signOut does not require confirmation (immediate action per CONTEXT)
- **NAV-02:** AppNavigator directly renders navigator components (no conditional routes)
- **NAV-03:** Study button integrated in DashboardScreen (FAB overlay removed for better UX)
- **NAV-04:** Icons-only tab bar (tabBarShowLabel: false)
- **PKG-01:** Android package name is `com.toto_castaldi.lumio` (underscore required, hyphens not allowed)
- **CORE-01:** @lumio/core singleton replaces standalone supabase client via side-effect import pattern
- **THEME-01:** ThemeProvider inside AuthProvider, wrapping NavigationContainer
- **DASH-01:** getUserStats() from @lumio/core for repo/card counts, direct Supabase query for lastStudied
- **DASH-02:** Dark mode iconBgColor variants for purple and amber stat cards
- **DARK-01:** Google brand colors kept hardcoded in LoginScreen per brand guidelines
- **DARK-02:** White text on colored backgrounds (logout, offline banner) for contrast in both themes
- **PAT-01:** PAT input uses plain text (no secureTextEntry) since PATs are paste-and-submit tokens

### Pending Todos

None yet.

### Blockers/Concerns

- expo-router incompatible with pnpm monorepo (resolved: using react-navigation)
- Minor peer dependency warnings for @types/react-dom (non-blocking)

## Session Continuity

Last session: 2026-02-07
Stopped at: Completed 03-05-PLAN.md (UAT gap closure) - Phase 3 fully complete
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-02-07*
