# Phase 1: Foundation - Context

**Gathered:** 2026-01-29
**Status:** Ready for planning

<domain>
## Phase Boundary

Set up the Expo SDK 54 project within the monorepo, integrate Supabase client, and configure NativeWind styling. The app must launch on Android, connect to Supabase, and render Tailwind classes. This is infrastructure work — no user-facing features yet.

</domain>

<decisions>
## Implementation Decisions

### Monorepo structure
- New app lives in `apps/android` (platform-specific naming for Android-only)
- Reuse `@lumio/core` as-is — the package is platform-agnostic (types and pure utilities)
- Development is independent from existing PWAs — no shared dev scripts, no interference
- PWAs continue working during Phase 1-4, removal happens in Phase 5

### Expo project config
- App name: `Lumio`
- Bundle ID: `com.totocastaldi.lumio`
- Minimum Android version: Android 12 (API 31)
- Navigation: Expo Router (file-based routing)

### Supabase integration
- Auth storage: `expo-secure-store` (encrypted Keychain/Keystore for tokens)

### Claude's Discretion
- Environment variables pattern (expo-constants vs react-native-dotenv)
- TypeScript types generation approach (verify what exists in @lumio/core)
- Connection test query for Phase 1 verification
- Splash screen and app icon placeholder assets

</decisions>

<specifics>
## Specific Ideas

- Future iOS support considered — chose @lumio/core reuse to keep code shareable
- Android 12+ only — targeting recent devices, avoiding legacy edge cases

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 01-foundation*
*Context gathered: 2026-01-29*
