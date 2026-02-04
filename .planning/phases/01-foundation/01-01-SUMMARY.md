---
phase: 01-foundation
plan: 01
subsystem: infra
tags: [expo, react-native, nativewind, tailwind, typescript, monorepo]

# Dependency graph
requires: []
provides:
  - Expo SDK 54 project in apps/android
  - NativeWind 4.x styling infrastructure
  - Workspace link to @lumio/core
  - Build tooling (babel, metro, tailwind configs)
affects: [01-02, 01-03, 02-auth]

# Tech tracking
tech-stack:
  added:
    - expo@54.0.33
    - nativewind@4.2.1
    - tailwindcss@3.4.17
    - react-native-reanimated@4.2.1
    - expo-router@6.0.23
    - expo-secure-store@15.0.8
    - aes-js@3.1.2
    - react-native-get-random-values@2.0.0
  patterns:
    - Dynamic Expo config via app.config.ts
    - NativeWind v4 with Tailwind v3.4
    - Workspace dependency linking for @lumio/core

key-files:
  created:
    - apps/android/package.json
    - apps/android/app.config.ts
    - apps/android/babel.config.js
    - apps/android/metro.config.js
    - apps/android/tailwind.config.js
    - apps/android/global.css
    - apps/android/nativewind-env.d.ts
    - apps/android/env.d.ts
    - .planning/phases/01-foundation/DECISIONS.md
  modified:
    - apps/android/tsconfig.json
    - apps/android/assets/icon.png
    - apps/android/assets/splash.png
    - apps/android/assets/adaptive-icon.png

key-decisions:
  - "CLEAN-03: Reuse @lumio/core as-is (platform-agnostic)"
  - "Android-only naming: apps/android instead of apps/native"
  - "NativeWind v4 with Tailwind v3.4.x compatibility"

patterns-established:
  - "Dynamic Expo config with app.config.ts instead of static app.json"
  - "NativeWind v4 babel preset with jsxImportSource"
  - "Workspace dependency via workspace:* protocol"

# Metrics
duration: 4min
completed: 2026-02-03
---

# Phase 1 Plan 01: Expo Project Setup Summary

**Expo SDK 54 project with NativeWind v4 styling, workspace-linked to @lumio/core for shared types and utilities**

## Performance

- **Duration:** 4 min
- **Started:** 2026-02-03T16:20:44Z
- **Completed:** 2026-02-03T16:25:17Z
- **Tasks:** 4
- **Files modified:** 13

## Accomplishments
- Created Expo SDK 54 project at apps/android with TypeScript
- Configured NativeWind v4 with proper babel/metro/tailwind integration
- Linked @lumio/core via pnpm workspace dependency
- Created placeholder assets (icon, splash, adaptive-icon)
- Documented CLEAN-03 decision for @lumio/core reuse

## Task Commits

**Note:** Per CLAUDE.md project rules, git operations are reserved for the developer. All changes are staged but not committed.

1. **Task 1: Create Expo project and install dependencies** - Not committed (developer action)
2. **Task 2: Configure Expo and build tooling** - Not committed (developer action)
3. **Task 3: Create placeholder assets and verify setup** - Not committed (developer action)
4. **Task 4: Document @lumio/core reuse decision (CLEAN-03)** - Not committed (developer action)

## Files Created/Modified
- `apps/android/package.json` - Expo project manifest with all dependencies
- `apps/android/app.config.ts` - Dynamic Expo config with bundle ID com.totocastaldi.lumio
- `apps/android/babel.config.js` - Babel config with NativeWind preset
- `apps/android/metro.config.js` - Metro bundler config with withNativeWind
- `apps/android/tailwind.config.js` - Tailwind CSS config with nativewind/preset
- `apps/android/global.css` - Tailwind directives (@tailwind base/components/utilities)
- `apps/android/nativewind-env.d.ts` - NativeWind type declarations
- `apps/android/env.d.ts` - Environment variable type declarations
- `apps/android/tsconfig.json` - TypeScript config with bundler resolution
- `apps/android/assets/icon.png` - App icon placeholder (1024x1024)
- `apps/android/assets/splash.png` - Splash screen placeholder (1284x2778)
- `apps/android/assets/adaptive-icon.png` - Android adaptive icon placeholder
- `.planning/phases/01-foundation/DECISIONS.md` - CLEAN-03 decision documentation

## Decisions Made
- **CLEAN-03: @lumio/core reuse** - Reuse existing core package as-is since it's platform-agnostic (types and pure utilities). Android app uses workspace link and will use createSupabaseClient with platform-specific storage adapter.
- **Package naming** - Used @lumio/android for workspace package name consistency.
- **Tailwind version** - Pinned to v3.4.x as NativeWind v4 requires Tailwind v3, not v4.

## Deviations from Plan
None - plan executed exactly as written.

## Issues Encountered
- Minor peer dependency warnings for react-dom versions - these are non-blocking and expected in Expo projects with web support enabled.

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- Expo project ready for Supabase client integration (Plan 01-02)
- NativeWind configured and ready for UI components
- @lumio/core linked and available for import
- Build tooling verified (TypeScript compiles, Tailwind processes CSS)

---
*Phase: 01-foundation*
*Completed: 2026-02-03*
