# Project Research Summary

**Project:** Lumio v2.1 Email Auth
**Domain:** Email/password authentication with OTP verification, password reset, and account linking for existing React Native/Expo Android app
**Researched:** 2026-02-27
**Confidence:** HIGH

## Executive Summary

Lumio v2.1 adds email/password authentication alongside the existing Google OAuth flow in a React Native (Expo) Android app backed by Supabase. The research is strongly convergent across all four files: no new npm packages are required for auth itself, all needed Supabase Auth methods exist in the installed `@supabase/supabase-js@2.89.0`, and one new pure-JS package (`expo-auth-session`) is needed only for deep link URL parsing utilities. The recommended approach is OTP-based email verification and password reset — 6-digit codes entered in-app — rather than deep-link-based email confirmation. This avoids the well-documented Android deep link reliability problems with email clients, keeps users in the app throughout the flow, and requires only custom email templates in Supabase.

The work is primarily integration: wiring Supabase Auth methods already present in the SDK, updating `supabase/config.toml` (enable email confirmations, enable manual linking), creating OTP email templates, adding 4 new screens (SignUp, VerifyEmail, ForgotPassword, ResetPassword), modifying LoginScreen and SettingsScreen, and extending AuthContext with new methods. The DB trigger `handle_new_user()` must be updated to handle email/password signups that carry no OAuth metadata — this is the first thing to fix, before any other work. The architecture follows the established pattern: all auth state lives in a single `AuthContext`, screens are React Navigation native stack screens, and the Supabase client singleton from `@lumio/core` is used throughout.

The top risks are concrete and addressable: (1) the `handle_new_user` trigger assumes Google OAuth metadata — fixable with a migration; (2) the `signOut` method unconditionally calls `GoogleSignin.signOut()` — crashes for email-only users, fixable with a try-catch; (3) duplicate email signup detection — Supabase returns an obfuscated success response, not an error, requiring the empty `identities` array check in the signup handler; and (4) the SecureStore 2048-byte limit — must measure current JWT size before shipping dual-identity account linking. All risks are documented with prevention strategies and recovery costs.

## Key Findings

### Recommended Stack

No new authentication dependencies are needed. The installed `@supabase/supabase-js@2.89.0` exposes every required method: `signUp`, `signInWithPassword`, `verifyOtp`, `resetPasswordForEmail`, `updateUser`, `linkIdentity`, `getUserIdentities`, and `unlinkIdentity`. The single new package is `expo-auth-session` (pure JS, no native rebuild) for `makeRedirectUri()` and `QueryParams.getQueryParams()` used in the deep link URL parser. The OTP approach means deep link handling is needed only for the `PASSWORD_RECOVERY` auth event, not for primary verification flows.

**Core technologies:**
- `@supabase/supabase-js@2.89.0`: All auth API calls — already installed, no upgrade needed
- `expo-auth-session`: Deep link URL parsing utilities — new addition, pure JS, no native rebuild required
- `expo-linking@~8.0.11`: Deep link listener in App.tsx — already installed, not yet used in code
- `expo-secure-store@15.0.8`: Session token persistence — already used; monitor for 2048-byte limit with dual identities
- `@react-native-google-signin/google-signin@16.1.1`: Native Google Sign-In for account linking — already installed, unchanged
- `supabase/config.toml`: Two flags to enable — `enable_confirmations = true`, `enable_manual_linking = true`
- Custom email templates in `supabase/templates/`: OTP-based (`{{ .Token }}`) for confirmation and recovery

See `/home/toto/scm-projects/lumio/.planning/research/STACK.md` for full configuration details and API code samples.

### Expected Features

The feature set is well-scoped. Key design decisions confirmed by research: Google button stays prominent at top of LoginScreen, email form appears below an "oppure" separator, no "confirm password" field (show/hide toggle instead), and OTP for all email verification flows throughout.

**Must have (table stakes):**
- Email + password signup with OTP email verification — foundational; blocks account linking without it
- Email + password login — complement to signup; LoginScreen layout change with "or" separator
- Password reset via OTP (ForgotPassword + ResetPassword screens) — 75% of users drop off without this
- Password visibility toggle — show/hide eye icon; proven conversion impact; single TextInput, no "confirm" field
- Inline form validation with error messages — email format, minimum password length (6 chars)
- Loading states on all auth operations — already patterned in existing Google sign-in button; replicate
- Bilingual strings (EN/IT) for all new screens — app is already bilingual; approximately 30 new i18n keys

**Should have (differentiators):**
- Account linking: add password to Google-only account — uses `updateUser({ password })`; low complexity
- Account linking: add Google to email-only account — uses `linkIdentity()`; medium complexity; browser flow caveat
- Connected accounts display in Settings — shows which auth methods are linked via `getUserIdentities()`
- Auto-login after email verification and password reset — `verifyOtp()` returns session; no re-login required
- Pre-filled email on ForgotPassword screen — pass email as nav param from LoginScreen
- Resend email with 60-second cooldown — mandatory given Supabase's built-in rate limit

**Defer to later milestone:**
- Identity unlinking — deferred due to edge case complexity (last identity guard, unconfirmed email identity)
- Change password (standalone screen) — users can use "forgot password" as workaround
- Phone/SMS auth, Magic link, additional social providers, biometrics, MFA — explicitly out of scope
- Custom SMTP for production — needed before public release but not a blocker for development phases

See `/home/toto/scm-projects/lumio/.planning/research/FEATURES.md` for screen layouts, i18n key lists, edge case behaviors, and the MVP recommendation.

### Architecture Approach

The architecture integrates cleanly into the existing React Navigation + AuthContext + Supabase singleton pattern. No new architectural patterns are introduced. The single AuthContext is extended (not duplicated) with new methods. Four new screens join the AuthNavigator stack for the logged-out flow. One new screen (ResetPasswordScreen) lives in the root authenticated stack, conditionally rendered when `passwordRecoveryPending` is true — this is the critical architectural insight: password recovery creates a valid Supabase session, so the user is in `state='ready'` when they need to set a new password. A centralized deep link handler in App.tsx using `Linking.useURL()` bridges email links to app sessions via a new `lib/deepLink.ts` utility.

**Major components:**
1. `AuthContext` (modified) — extends existing interface with `signUpWithEmail`, `signInWithEmail`, `resetPassword`, `updatePassword`, `linkGoogleIdentity`, `passwordRecoveryPending` state, `clearPasswordRecovery`. The `onAuthStateChange` handler detects `PASSWORD_RECOVERY` events. The `signOut` method wraps `GoogleSignin.signOut()` in try-catch.
2. `AuthNavigator` (modified) — extends from `Login` only to `Login | SignUp | ForgotPassword | EmailVerification` stack.
3. `AppNavigator` (modified) — adds `ResetPassword` screen to root authenticated stack, conditionally rendered on `passwordRecoveryPending`.
4. `packages/core/src/supabase/auth.ts` (modified) — adds `signUpWithEmail`, `signInWithEmail`, `resetPasswordForEmail` exports alongside existing `signInWithGoogle`.
5. `lib/deepLink.ts` (new) — `createSessionFromUrl()` utility: parses deep link URL params and calls `supabase.auth.setSession()`. Required because `detectSessionInUrl: false` is already set in the Supabase client config.
6. `handle_new_user()` DB trigger (migration) — updated to use `split_part(email, '@', 1)` as `display_name` fallback when `full_name` is absent from OAuth metadata.
7. 4 new screen files: `SignUpScreen`, `VerifyEmailScreen`, `ForgotPasswordScreen`, `ResetPasswordScreen`.
8. `supabase/templates/` — new directory with OTP email templates for confirmation and recovery.

See `/home/toto/scm-projects/lumio/.planning/research/ARCHITECTURE.md` for component specs, navigation tree, data flow diagrams, and build order.

### Critical Pitfalls

1. **`handle_new_user` trigger breaks for email signups** — reads `raw_user_meta_data->>'full_name'` which is NULL for email/password users. Results in NULL `display_name` in `public.users` and broken Settings UI. Fix: migration updating trigger with `COALESCE(full_name, name, split_part(email, '@', 1))` fallback. Must happen before any email auth work.

2. **`signOut` crashes for email-only users** — `AuthContext.signOut()` unconditionally calls `GoogleSignin.signOut()`. Email-only users have no Google session; this throws and leaves the user stuck. Fix: wrap `GoogleSignin.signOut()` in try-catch or guard with `GoogleSignin.getCurrentUser()` check. Must be done in the AuthContext refactoring phase.

3. **Duplicate email signup returns obfuscated success, not an error** — Supabase intentionally hides "email already registered" to prevent enumeration. A user with an existing Google account gets a fake success response and waits forever for a verification email that never arrives. Fix: check `data.user.identities.length === 0` after `signUp()` to detect duplicates. This check must be in the signup handler from day one.

4. **Deep link-based email verification is unreliable on Android** — Custom scheme links from email clients frequently open the browser instead of the app, and the codebase has zero deep link handling infrastructure. Fix: use OTP-based verification throughout (6-digit codes in-app). A minimal deep link handler is still needed for the PASSWORD_RECOVERY event but is not the primary verification mechanism.

5. **SecureStore 2048-byte limit with dual-identity sessions** — JWTs grow when multiple identities are linked. If the JWT exceeds 2048 bytes, SecureStore silently fails and sessions are not persisted. Fix: measure `JSON.stringify(session).length` before shipping account linking. If over 1500 bytes, switch to MMKV + SecureStore key pattern before proceeding to account linking phase.

6. **`linkIdentity()` uses browser OAuth, not native SDK** — When an email user wants to link Google, `linkIdentity()` opens a browser-based PKCE flow rather than the native `@react-native-google-signin` dialog. This is a different UX within the same app. Fix: test both approaches; consider relying on Supabase's automatic same-email merging as the primary path instead. Defer unlinking entirely.

See `/home/toto/scm-projects/lumio/.planning/research/PITFALLS.md` for all 13 pitfalls with recovery strategies and a "Looks Done But Isn't" checklist.

## Implications for Roadmap

Based on combined research, the dependency chain is clear: database migration first, then AuthContext foundation, then screens, then account linking last. This order is driven by: (a) the DB trigger failure blocks all email signups silently; (b) screens depend on AuthContext methods existing at compile time; (c) account linking depends on both auth methods working independently; (d) production validation requires stable local flows first.

### Phase 1: Foundation and Configuration

**Rationale:** Multiple pre-conditions must be true before any email auth code can work. These are configuration changes with no UI surface — low risk, high necessity. Skipping them causes silent failures in all subsequent phases.
**Delivers:** Supabase `config.toml` updated (`enable_confirmations = true`, `enable_manual_linking = true`), OTP email templates created in `supabase/templates/`, `expo-auth-session` installed, SecureStore JWT size measured and documented.
**Avoids:** Pitfall 6 (SecureStore limit — must measure before account linking), Pitfall 7 (config mismatch local/prod), Pitfall 10 (wrong email templates showing links not OTP codes).
**Research flag:** None — config options are fully documented. Measure JWT size as a gate for account linking phase.

### Phase 2: Database Migration

**Rationale:** The `handle_new_user` trigger must be fixed before any email signup is tested. A broken trigger silently creates users with NULL `display_name`, poisoning test data and obscuring whether the auth flow itself works.
**Delivers:** Updated `handle_new_user()` trigger in a new migration with `COALESCE(full_name, name, split_part(email, '@', 1))` fallback. All future email signup users get a non-null `display_name`.
**Avoids:** Pitfall 1 (NULL display_name for email users, broken Settings UI).
**Research flag:** None — migration pattern is straightforward; PITFALLS.md has the exact SQL needed.

### Phase 3: AuthContext Refactoring

**Rationale:** All new screens depend on auth methods existing in AuthContext. The `signOut` crash fix is a prerequisite for any email-only user testing. The `PASSWORD_RECOVERY` handler is a prerequisite for the password reset flow. This phase has no visible UI but is the critical dependency foundation.
**Delivers:** Extended `AuthContextType` interface with all new methods, `passwordRecoveryPending` state, fixed `signOut`, updated `onAuthStateChange` event handling, new exports in `packages/core/src/supabase/auth.ts`, i18n keys for all new screens (EN + IT, approximately 30 keys), `lib/deepLink.ts` utility.
**Avoids:** Pitfall 2 (signOut crash for email users), Pitfall 4 (PASSWORD_RECOVERY event not handled), Pitfall 9 (TypeScript interface cascade across consumers).
**Research flag:** None — all method signatures are documented in STACK.md with code samples.

### Phase 4: Email Signup and Verification

**Rationale:** With foundation, DB, and AuthContext in place, the first user-visible feature is email registration. This is the highest-value new flow and should be the first thing testable end-to-end.
**Delivers:** `SignUpScreen` with email + password form, `VerifyEmailScreen` with OTP input, complete signup-to-verification flow, Inbucket testing confirmed working locally.
**Uses:** `auth.signUp`, `auth.verifyOtp({ type: 'email' })`.
**Avoids:** Pitfall 2 (empty identities check for duplicate email detection), Pitfall 3 (OTP instead of deep links), Pitfall 11 (LoginScreen layout — add Sign Up link), Pitfall 12 (password strength validation).

### Phase 5: Email Login and Password Reset

**Rationale:** Email login and password reset are bundled because they share the LoginScreen layout change ("Forgot password?" link originates there) and the reset flow's final step (new password screen) requires the same `passwordRecoveryPending` state infrastructure built in Phase 3.
**Delivers:** Modified `LoginScreen` (Google button + "oppure" separator + email form), `ForgotPasswordScreen`, `ResetPasswordScreen`, complete login and password reset flows tested end-to-end.
**Uses:** `auth.signInWithPassword`, `auth.resetPasswordForEmail`, `auth.verifyOtp({ type: 'recovery' })`, `auth.updateUser({ password })`.
**Avoids:** Pitfall 4 (OTP-based reset avoids PASSWORD_RECOVERY routing complexity), Pitfall 11 (login layout restructuring with KeyboardAvoidingView).

### Phase 6: Account Linking in Settings

**Rationale:** Account linking is the most complex feature with the most edge cases. It is last because it depends on both Google OAuth (existing) and email auth (new) working correctly and independently. Unlinking is explicitly deferred to avoid the guard complexity (last identity, unconfirmed email identity edge cases).
**Delivers:** "Connected Accounts" section in `SettingsScreen` showing linked identities, "Add password" flow for Google-only users (`updateUser`), "Link Google account" flow for email-only users (tested browser vs. auto-linking), SecureStore JWT size gate validated.
**Avoids:** Pitfall 5 (account linking failure modes — add-only, no unlinking in v2.1), Pitfall 6 (SecureStore limit — already measured in Phase 1).
**Research flag:** NEEDS research spike on `linkIdentity()` browser-based flow vs. native SDK vs. automatic same-email merging. See Gaps section below.

### Phase 7: Production Validation

**Rationale:** Local development uses Inbucket for email and lenient config. Production has stricter settings, rate limits, and different SMTP behavior. End-to-end testing against production Supabase must happen before any public-facing release.
**Delivers:** Production Supabase Dashboard configured (email confirmations enabled, manual linking enabled, redirect URLs added, OTP email templates deployed), all flows tested end-to-end against production.
**Avoids:** Pitfall 7 (local/production config mismatch), Pitfall 13 (SMTP rate limits — configure custom SMTP if needed).

### Phase Ordering Rationale

- Foundation (Phase 1) and DB migration (Phase 2) before everything: config and trigger failures are silent and would corrupt all subsequent testing. Cannot skip.
- AuthContext (Phase 3) before screens: screens have compile-time TypeScript dependencies on auth methods in the context interface.
- Email signup (Phase 4) before email login (Phase 5): signup creates accounts that login can use. Verification flow must work before login is meaningful for email users.
- Account linking (Phase 6) last: it is a differentiator, not table stakes; has the most edge cases; depends on both auth methods working correctly and independently.
- Production validation (Phase 7) last: burn Supabase email rate limits only after local flows are proven solid.

### Research Flags

Phases with well-documented patterns (skip research-phase):
- **Phase 1 (Foundation/Config):** Supabase config.toml options fully documented and verified. Inbucket testing is standard. No research needed.
- **Phase 2 (DB Migration):** Single trigger update. Pattern is clear from codebase inspection. SQL is provided in PITFALLS.md.
- **Phase 3 (AuthContext):** Standard React context extension. All method signatures documented in STACK.md with code samples.
- **Phase 4 (Email Signup):** OTP flow fully documented in STACK.md, FEATURES.md, and ARCHITECTURE.md. Standard patterns.
- **Phase 5 (Email Login + Reset):** Well-documented Supabase flows. OTP approach avoids the only tricky part (deep link recovery routing).

Phases likely needing deeper research during planning:
- **Phase 6 (Account Linking):** `linkIdentity()` with native Android — the API is designed for browser PKCE redirect, not native SDK. The ID token approach via `@react-native-google-signin` may or may not work with `linkIdentity`. Needs a code spike before implementation. Fallback: rely on Supabase automatic same-email merging as the primary linking mechanism.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All methods verified in official Supabase JS API docs. Only gap: `linkIdentity` with native Android ID token is MEDIUM. |
| Features | HIGH | Feature scope is tight and well-defined. Layout specs, i18n keys, edge cases, and MVP recommendation are documented. |
| Architecture | HIGH | Follows established codebase patterns. Component boundaries clear from direct codebase analysis. Only MEDIUM area: `linkIdentity` native behavior. |
| Pitfalls | HIGH | 6 critical pitfalls identified via direct codebase inspection. All have concrete prevention steps. Recovery costs documented. |

**Overall confidence:** HIGH

### Gaps to Address

- **`linkIdentity()` with native Google ID token vs. browser redirect (Phase 6):** The `linkIdentity()` API is designed for browser PKCE redirect flows. For native Android with `@react-native-google-signin`, it is unclear whether passing the native ID token works. Test during Phase 6 planning spike. Fallback plan: use Supabase's automatic email-based linking (user signs in with Google using same email, identities auto-merge). Do not block Phase 4 or 5 on this resolution.

- **SecureStore JWT size for dual-identity users (gate for Phase 6):** Must measure `JSON.stringify(session).length` for a Google-only user in Phase 1. If over 1500 bytes, implement MMKV + SecureStore key pattern before Phase 6. This is a hard gate — shipping dual-identity account linking without this check risks silent session loss on app restart.

- **Automatic linking interaction with manual linking:** When `enable_manual_linking = true`, verify that automatic same-email linking still functions. Supabase docs suggest both coexist, but confirm locally in Phase 1 configuration testing.

- **Production SMTP rate limits:** Supabase built-in SMTP is limited to approximately 2-4 emails/hour in production. For a single developer this is acceptable; for any real user base, configure a custom SMTP provider (Resend, Postmark, SendGrid) as part of Phase 7. Not a blocker for development phases.

- **Change password (standalone flow):** Not included in v2.1. Users can use "forgot password" as a workaround. Consider for a future milestone.

## Sources

### Primary (HIGH confidence)
- Lumio codebase direct inspection — `AuthContext.tsx`, `auth.ts`, `client.ts`, `config.toml`, `app.json`, `LoginScreen.tsx`, `SettingsScreen.tsx`, `AuthNavigator.tsx`, `lib/supabase.ts`, `package.json`, `supabase/migrations/20241230000003_auth_trigger.sql`
- [Supabase JS auth.signUp()](https://supabase.com/docs/reference/javascript/auth-signup) — signUp method and identities array behavior
- [Supabase JS auth.signInWithPassword()](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) — email login
- [Supabase JS auth.verifyOtp()](https://supabase.com/docs/reference/javascript/auth-verifyotp) — OTP verification, type: email and recovery
- [Supabase JS auth.resetPasswordForEmail()](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) — password reset
- [Supabase JS auth.updateUser()](https://supabase.com/docs/reference/javascript/auth-updateuser) — set password, update user metadata
- [Supabase JS auth.linkIdentity()](https://supabase.com/docs/reference/javascript/auth-linkidentity) — identity linking
- [Supabase JS auth.onAuthStateChange()](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) — PASSWORD_RECOVERY event
- [Supabase Auth Identity Linking Guide](https://supabase.com/docs/guides/auth/auth-identity-linking) — automatic vs. manual linking
- [Supabase Email Templates Guide](https://supabase.com/docs/guides/auth/auth-email-templates) — `{{ .Token }}` OTP variable
- [Supabase CLI Config Reference](https://supabase.com/docs/guides/local-development/cli/config) — config.toml options
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) — Expo deep link setup, createSessionFromUrl pattern
- [Supabase Password-Based Auth Guide](https://supabase.com/docs/guides/auth/passwords) — signup, reset, update flows
- GitHub Discussion #22214 (Supabase) — enable_manual_linking in local development
- GitHub Discussion #10754 (Supabase) — deep link fragment parsing issues in React Native (confirmed OTP recommendation)
- GitHub Discussion #7632 (Supabase) — signUp duplicate email obfuscated response behavior
- auth-js Issue #513 (Supabase) — signUp not returning error on duplicate email

### Secondary (MEDIUM confidence)
- GitHub Discussion #12324 (Supabase) — password reset with React Native
- GitHub Discussion #37737 (Supabase) — ghost password issue in password reset
- GitHub Discussion #25976 (Supabase) — linkIdentity in React Native
- GitHub Issue #1591 (supabase-js) — linkIdentityWithIdToken support shipped Nov 2025; API surface needs verification at build time
- GitHub Issue #1645 (supabase/auth) — linkIdentity does not work natively in React Native (uses browser flow)
- dev.to: "Why I ditched deep linking for token-based password reset in Supabase" — OTP approach rationale for mobile
- Login & Signup UX Guide 2025 (authgear.com) — password field UX patterns, show/hide toggle conversion impact

### Tertiary (LOW confidence)
- None — all major decisions are backed by HIGH or MEDIUM confidence sources.

---
*Research completed: 2026-02-27*
*Ready for roadmap: yes*
