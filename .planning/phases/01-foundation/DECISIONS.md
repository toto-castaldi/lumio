# Phase 1 Decisions

## NAV-01: react-navigation vs expo-router

**Decision:** Use `react-navigation` directly instead of `expo-router`

**Context:**
expo-router caused persistent runtime error on Android:
```
java.lang.String cannot be cast to java.lang.Boolean
```
at native view creation level (setProperty, createViewInstance).

**Troubleshooting attempted:**
- Disabled newArchEnabled
- Removed edgeToEdgeEnabled/predictiveBackGestureEnabled
- Configured metro.config.js for monorepo
- Isolated node_modules with `.npmrc` (node-linker=isolated)
- None of these resolved the issue

**Root cause:** expo-router incompatibility with pnpm monorepo hoisted dependencies.

**Solution:**
- Use `@react-navigation/native` + `@react-navigation/bottom-tabs` directly
- Standard entry point (`index.ts` + `App.tsx`) instead of `expo-router/entry`
- Remove expo-router from plugins in app.json

**Implications:**
- No file-based routing (manual route definition required)
- Simpler setup, fewer abstraction layers
- Better compatibility with monorepo structure

**Date:** 2026-02-04
**Status:** Implemented

---

## CLEAN-03: @lumio/core Reuse vs Unification

**Decision:** Reuse `@lumio/core` as-is

**Rationale:**
- The package is platform-agnostic (types and pure utilities)
- Contains `createSupabaseClient` factory usable by any platform
- No React Native-specific code needed in core
- Future iOS support benefits from shared core

**Implementation:**
- Android app depends on `@lumio/core` via workspace link
- Uses `createSupabaseClient` from core with platform-specific storage adapter
- No modifications to @lumio/core required

**Date:** Decided during Phase 1 discuss-phase (2026-01-29)
**Status:** Implemented
