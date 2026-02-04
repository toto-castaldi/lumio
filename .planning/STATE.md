# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-01-29)

**Core value:** Gli utenti studiano concetti tramite quiz generati dall'AI — il contenuto viene dai repository Git, le domande vengono generate e pre-cachate dal sistema.
**Current focus:** Phase 2 - Auth & Navigation

## Current Position

Phase: 2 of 5 (Auth & Navigation)
Plan: 4 of 4 complete
Status: Phase complete
Last activity: 2026-02-04 — Completed 02-04-PLAN.md (Screen components)

Progress: [██████████] 100% (4/4 plans in Phase 2)

## Performance Metrics

**Velocity:**
- Total plans completed: 6
- Average duration: 3 min
- Total execution time: 18 min

**By Phase:**

| Phase | Plans | Total | Avg/Plan |
|-------|-------|-------|----------|
| 01-foundation | 2 | 7 min | 3.5 min |
| 02-auth-navigation | 4 | 11 min | 2.75 min |

**Recent Trend:**
- Last 5 plans: 01-02 (3 min), 02-01 (3 min), 02-02 (2 min), 02-03 (3 min), 02-04 (3 min)
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

### Pending Todos

None yet.

### Blockers/Concerns

- expo-router incompatible with pnpm monorepo (resolved: using react-navigation)
- Minor peer dependency warnings for @types/react-dom (non-blocking)

## Session Continuity

Last session: 2026-02-04T17:11:07Z
Stopped at: Completed 02-03-PLAN.md (Navigation structure with auth routing)
Resume file: None

---
*State initialized: 2026-01-29*
*Last updated: 2026-02-04T17:11:07Z*
