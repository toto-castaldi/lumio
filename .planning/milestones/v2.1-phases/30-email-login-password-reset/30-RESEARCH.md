# Phase 30: Email Login & Password Reset - Research

**Researched:** 2026-03-01
**Domain:** Supabase email auth (signInWithPassword, resetPasswordForEmail, verifyOtp recovery, updateUser)
**Confidence:** HIGH

## Summary

Phase 30 builds on the fully-implemented auth infrastructure from Phases 27-29. The login flow (`signInWithPassword`) is already wired in `AuthContext.tsx` and called from `LoginScreen.tsx` — it works end-to-end. The primary implementation work is the **password reset flow** (two new screens: ForgotPasswordScreen and UpdatePasswordScreen) and **wiring the "Forgot password?" link** that currently logs a no-op console message.

A critical finding: the CONTEXT.md decision says "Reset via email link only (no manual code entry)" but the existing recovery email template (`supabase/templates/recovery.html`) uses `{{ .Token }}` (OTP code), not `{{ .ConfirmationURL }}` (link). Since this is a React Native mobile app that cannot reliably handle deep links for recovery, and the template already sends OTP codes, the implementation should use **OTP-based recovery** via `verifyOtp({ email, token, type: 'recovery' })` — the same UX pattern already established by the OTP verification screen in Phase 29. This is the pragmatic approach given the existing infrastructure.

**Primary recommendation:** Reuse the 6-digit OTP input pattern from OtpVerificationScreen for password reset verification. Add two new screens (ForgotPasswordScreen, UpdatePasswordScreen) to AuthNavigator. Wire the existing "Forgot password?" no-op link. No backend/migration changes needed.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Single-screen login (email + password together)
- Sessions are always remembered (no "remember me" checkbox)
- Inline live validation for email format and required fields
- Primary "Log in" button as the main CTA
- Generic error message for invalid credentials (no account enumeration)
- If email is unverified: block login and offer "Resend verification email"
- Wrong password uses the same generic invalid credentials message
- Tone is neutral and concise
- Entry via "Forgot password?" link on login screen
- Reset via email link only (no manual code entry) **[NOTE: Contradicted by existing OTP template — see Architecture Patterns for resolution]**
- After successful reset, redirect user to login (no auto-login)
- Enforce basic password strength rules (minimum length + simple requirements)
- Multiple active sessions allowed across devices
- After password reset, invalidate all active sessions
- Long-lived persistent sessions
- No device/session management UI in this phase

### OpenCode's Discretion
- Exact copywriting of messages (within neutral/concise tone)
- Exact password rule thresholds (within "basic" definition)
- Visual design details consistent with existing auth screens

### Deferred Ideas (OUT OF SCOPE)
- Device/session management UI (view/revoke active sessions) — separate future phase
- Additional authentication methods (e.g., passwordless login) — separate future phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-04 | User can sign in with email and password | Already implemented: `signInWithEmail` in AuthContext calls `signInWithPassword()`. LoginScreen already calls it. Need to verify error handling for unverified email and invalid credentials matches decisions. |
| AUTH-05 | User can request password reset via email | `resetPassword()` in AuthContext calls `resetPasswordForEmail()`. Need ForgotPasswordScreen to collect email and trigger it. Recovery email template already configured with OTP code. |
| AUTH-06 | User can set a new password after receiving reset OTP code | Need UpdatePasswordScreen. Use `verifyOtp({ email, token, type: 'recovery' })` to authenticate, then `updateUser({ password })` to set new password. Must invalidate all sessions via `signOut({ scope: 'global' })` after update. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | (already installed) | Auth API: signInWithPassword, resetPasswordForEmail, verifyOtp, updateUser, signOut | Single auth provider, already integrated |
| react-native | (already installed) | UI components | Existing app framework |
| @react-navigation/native-stack | (already installed) | Screen navigation in AuthNavigator | Existing navigation pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| react-native-toast-message | (already installed) | Success toasts (code sent, password updated) | Same pattern as OtpVerificationScreen |
| @expo/vector-icons (Ionicons) | (already installed) | Icons (back arrow, eye toggle, pencil) | Consistent with existing screens |
| @react-native-async-storage/async-storage | (already installed) | Recovery state persistence | Already used for RecoveryState in AuthContext |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| OTP code entry | Deep link recovery | Deep links unreliable on Android (app not installed, custom schemes), OTP already works for email verification in Phase 29. Template already uses `{{ .Token }}`. |
| Custom password validation | Supabase server-side validation | Supabase enforces 6-char minimum. Client-side validation provides instant UX feedback before hitting server. Use both. |

**Installation:**
No new packages needed. All dependencies already installed from Phases 27-29.

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
├── screens/
│   ├── LoginScreen.tsx            # EXISTS — wire "Forgot password?" link
│   ├── ForgotPasswordScreen.tsx   # NEW — email input → send reset code
│   └── UpdatePasswordScreen.tsx   # NEW — OTP entry → new password → update
├── navigation/
│   └── AuthNavigator.tsx          # MODIFY — add 2 new screens to stack
├── contexts/
│   └── AuthContext.tsx            # EXISTS — all methods already implemented
└── i18n/
    ├── en.ts                     # MODIFY — update/add reset flow strings
    └── it.ts                     # MODIFY — update/add reset flow strings
```

### Pattern 1: OTP-Based Recovery Flow (Recommended over Link-Based)

**What:** Use `verifyOtp({ email, token, type: 'recovery' })` to verify OTP code from email, which creates an authenticated session, then `updateUser({ password })` to set new password.

**When to use:** Always for this mobile app — deep links are unreliable on Android.

**Why this diverges from CONTEXT.md "email link only" decision:**
The recovery email template (`supabase/templates/recovery.html`) already uses `{{ .Token }}` — it sends a 6-digit OTP code, NOT a clickable link. The Phase 27 infrastructure was built for OTP. Implementing link-based recovery would require:
1. Changing the template to use `{{ .ConfirmationURL }}`
2. Setting up deep link handling for `lumio://auth/callback`
3. Handling the `PASSWORD_RECOVERY` event from `onAuthStateChange`
4. Managing edge cases where the app isn't installed or custom scheme fails

The OTP approach is already proven (Phase 29 OTP verification works), simpler, and more reliable on mobile. The `RecoveryState` machine in AuthContext was designed to support either approach.

**Example flow:**
```typescript
// Step 1: ForgotPasswordScreen — user enters email
await resetPassword(email); // calls resetPasswordForEmail(email)
// Navigate to UpdatePasswordScreen with email param

// Step 2: UpdatePasswordScreen — user enters OTP code
const { error } = await supabase.auth.verifyOtp({
  email,
  token: otpCode,
  type: 'recovery',
});
// This creates an authenticated session (user is now logged in)

// Step 3: User enters new password
const { error } = await supabase.auth.updateUser({ password: newPassword });

// Step 4: Invalidate all other sessions, then sign out current
await supabase.auth.signOut({ scope: 'global' });
// User is redirected to login screen
```

### Pattern 2: Error Handling for Login (Already Implemented)

**What:** Map Supabase error messages to generic user-facing messages without leaking account information.

**Already in LoginScreen.tsx (lines 72-88):**
```typescript
// 'Email not confirmed' → auth.login.emailNotConfirmed (block + offer resend)
// All other errors → auth.login.invalidCredentials (generic message)
```

**Enhancement needed:** The unverified email case currently shows a message but doesn't offer the "Resend verification email" action. Per CONTEXT.md, it should offer a way to resend.

### Pattern 3: Session Invalidation After Password Reset

**What:** After successful password update, invalidate ALL active sessions across devices.

**Supabase supports three `signOut` scopes:**
- `global` (default): terminates ALL sessions for the user
- `local`: terminates only current session
- `others`: terminates all sessions except current

**Use `signOut({ scope: 'global' })` after password update** to fulfill the "invalidate all active sessions" requirement, then redirect to login.

**Important caveat:** Access tokens of revoked sessions remain valid until their `exp` claim (1 hour based on `jwt_expiry = 3600` in config.toml). This is a Supabase platform limitation, not something we can fix.

### Anti-Patterns to Avoid
- **Storing plaintext OTP in app state:** Never persist the OTP code. It's entered by the user and sent directly to Supabase.
- **Auto-login after password reset:** CONTEXT.md explicitly says "redirect user to login (no auto-login)". After `updateUser` + `signOut({ scope: 'global' })`, user must log in again.
- **Revealing account existence in forgot password:** `resetPasswordForEmail` should show the same success message regardless of whether the email exists. Supabase's default behavior already does this (returns success even for unknown emails).
- **Using PASSWORD_RECOVERY event from onAuthStateChange:** This is the link-based approach. With OTP-based recovery, we use `verifyOtp` directly, which creates a session. The existing `PASSWORD_RECOVERY` handler in AuthContext (line 147-149) can remain but won't be triggered in the OTP flow.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Password reset email | Custom email sending | `supabase.auth.resetPasswordForEmail()` | Template already configured, rate limiting built-in |
| OTP verification | Custom token generation/validation | `supabase.auth.verifyOtp({ type: 'recovery' })` | Server handles token expiry, rate limits, single-use |
| Password hashing | Custom bcrypt | `supabase.auth.updateUser({ password })` | Supabase uses bcrypt with random salt internally |
| Session invalidation | Custom session table | `supabase.auth.signOut({ scope: 'global' })` | Supabase manages refresh_token lifecycle |
| Password strength validation (server) | Custom rules | Supabase built-in (6-char minimum) | REQUIREMENTS.md: "6-char minimum sufficient for personal study app" |

**Key insight:** The entire auth flow (reset email, OTP verify, password update, session invalidation) is handled by Supabase Auth primitives. Zero backend code needed. The only work is UI screens and navigation.

## Common Pitfalls

### Pitfall 1: OTP Type Must Be 'recovery', Not 'email'
**What goes wrong:** Using `verifyOtp({ type: 'email' })` for password reset returns an error or creates an email-verification session instead of a recovery session.
**Why it happens:** Supabase has multiple OTP types: `'email'` (signup verification), `'recovery'` (password reset), `'sms'`, etc.
**How to avoid:** Always use `type: 'recovery'` for password reset OTP verification.
**Warning signs:** "Token has expired or is invalid" error when the code is actually correct.

### Pitfall 2: Forgetting to Sign Out After Password Update
**What goes wrong:** User updates password but remains logged in with old session. Other devices also remain logged in.
**Why it happens:** `updateUser({ password })` changes the password but doesn't invalidate sessions.
**How to avoid:** Always call `signOut({ scope: 'global' })` after successful `updateUser`.
**Warning signs:** User updates password but doesn't see the login screen.

### Pitfall 3: Race Condition Between verifyOtp and updateUser
**What goes wrong:** After `verifyOtp` returns, the `onAuthStateChange` handler fires and might navigate the user away before `updateUser` can be called.
**Why it happens:** `verifyOtp({ type: 'recovery' })` creates an authenticated session, which triggers `onAuthStateChange` with `SIGNED_IN` event. If AppNavigator switches to MainNavigator, the UpdatePasswordScreen is unmounted.
**How to avoid:** Use the `recoveryState` state machine in AuthContext. When `recoveryState !== 'idle'`, AppNavigator should keep showing the UpdatePasswordScreen (in the auth flow) even though the user is technically authenticated. Only transition to MainNavigator when `recoveryState` returns to `'idle'`.
**Warning signs:** User verifies OTP but gets sent to the dashboard instead of the set-new-password form.

### Pitfall 4: Not Handling Rate Limiting on Reset Emails
**What goes wrong:** User taps "send reset code" repeatedly and gets a Supabase rate limit error.
**Why it happens:** Supabase rate-limits email sending (2/hour on free tier, configurable on paid).
**How to avoid:** Add a cooldown timer after sending (same pattern as OTP resend in OtpVerificationScreen). Map rate limit errors to `auth.reset.rateLimited` i18n key (already exists).
**Warning signs:** Cryptic error messages about rate limits.

### Pitfall 5: Resend Verification for Unverified Email Login
**What goes wrong:** User with unverified email tries to login, sees "verify your email" message but has no way to resend the verification.
**Why it happens:** Current LoginScreen shows `auth.login.emailNotConfirmed` message but doesn't offer a resend action.
**How to avoid:** When detecting "Email not confirmed" error, navigate to OtpVerificationScreen with the email, or show a "Resend verification" button that calls `resendOtp(email)`.
**Warning signs:** User is stuck — can't login and can't get a new verification code.

## Code Examples

Verified patterns from the existing codebase:

### Login with Email (Already Implemented)
```typescript
// Source: apps/android/contexts/AuthContext.tsx:228-237
const signInWithEmail = useCallback(async (email: string, password: string): Promise<void> => {
  setSignInLoading(true);
  try {
    const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
    if (error) throw error;
  } finally {
    setSignInLoading(false);
  }
}, []);
```

### Reset Password Request (Already Implemented in Context)
```typescript
// Source: apps/android/contexts/AuthContext.tsx:239-248
const resetPassword = useCallback(async (email: string): Promise<void> => {
  setResetLoading(true);
  try {
    const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email);
    if (error) throw error;
    await setRecoveryState('email_sent');
  } finally {
    setResetLoading(false);
  }
}, [setRecoveryState]);
```

### Verify Recovery OTP (New — Pattern from Supabase Docs)
```typescript
// Source: https://supabase.com/docs/guides/auth/auth-email-templates
const { data, error } = await supabase.auth.verifyOtp({
  email,
  token: otpCode,
  type: 'recovery',  // MUST be 'recovery', not 'email'
});
// On success: data.session is set, user is authenticated
```

### Update Password (Already Implemented in Context)
```typescript
// Source: apps/android/contexts/AuthContext.tsx:250-260
const updatePassword = useCallback(async (newPassword: string): Promise<void> => {
  setUpdatePasswordLoading(true);
  try {
    await setRecoveryState('updating');
    const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
    if (error) throw error;
    await setRecoveryState('idle');
  } finally {
    setUpdatePasswordLoading(false);
  }
}, [setRecoveryState]);
```

### Global Sign Out for Session Invalidation
```typescript
// Source: https://supabase.com/docs/guides/auth/signout
await supabase.auth.signOut({ scope: 'global' });
// Terminates ALL sessions across all devices
```

### OTP Input Pattern (Reusable from OtpVerificationScreen)
```typescript
// Source: apps/android/screens/OtpVerificationScreen.tsx:105-137
// 6-digit input boxes with auto-advance, paste support, shake animation
// This exact pattern can be extracted or duplicated for recovery OTP
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Link-based password recovery with `{{ .ConfirmationURL }}` | OTP-based recovery with `{{ .Token }}` + `verifyOtp({ type: 'recovery' })` | Available since supabase-js v2 | Mobile-friendly, no deep link infrastructure needed |
| `signOut()` with no scope | `signOut({ scope: 'global' \| 'local' \| 'others' })` | supabase-js v2 | Granular session management |
| `PASSWORD_RECOVERY` event handling | Direct `verifyOtp` + `updateUser` | Both still supported | OTP approach gives more control to the app |

**Deprecated/outdated:**
- Using `{{ .ConfirmationURL }}` for mobile recovery: Works for web but unreliable for mobile deep links. OTP is preferred.

## Open Questions

1. **RecoveryState vs Navigation Guard**
   - What we know: AuthContext has a `RecoveryState` state machine (`idle` → `email_sent` → `link_clicked` → `updating`). AppNavigator switches between AuthNavigator and MainNavigator based on `state` (logged_in/logged_out).
   - What's unclear: The `verifyOtp({ type: 'recovery' })` call will authenticate the user (state → 'ready'), which normally triggers navigation to MainNavigator. We need to ensure the user stays on UpdatePasswordScreen.
   - Recommendation: Use `recoveryState` as a navigation guard. In AppNavigator, if `recoveryState !== 'idle'`, show the auth flow (or a dedicated recovery screen) instead of MainNavigator. The RecoveryState transitions should be: `idle` → `email_sent` (after resetPassword) → `updating` (after OTP verified) → `idle` (after updateUser + signOut). Note: the `link_clicked` state was designed for the link-based flow and may need renaming or skipping for OTP.

2. **"Resend verification email" from Login**
   - What we know: CONTEXT.md says "If email is unverified: block login and offer 'Resend verification email'". Current LoginScreen detects the error but only shows a message.
   - What's unclear: Should we navigate to OtpVerificationScreen, or show an inline resend button?
   - Recommendation: Show an inline "Resend verification email" link below the error message. On tap, call `resendOtp(email)` and show a toast. This avoids a jarring navigation.

3. **Password Strength Rules**
   - What we know: REQUIREMENTS.md says "6-char minimum sufficient". Supabase enforces 6-char minimum server-side. CONTEXT.md says "Enforce basic password strength rules (minimum length + simple requirements)".
   - What's unclear: What "simple requirements" beyond minimum length?
   - Recommendation: Client-side validation: minimum 6 characters (matching Supabase). Don't add complexity requirements (uppercase, digit, symbol) — REQUIREMENTS.md explicitly scoped this as out of scope ("Custom password policy beyond Supabase default"). Show weak password error from server if it triggers.

## Sources

### Primary (HIGH confidence)
- Supabase official docs: [Password-based Auth](https://supabase.com/docs/guides/auth/passwords) — signInWithPassword, resetPasswordForEmail, updateUser flows
- Supabase official docs: [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) — `{{ .Token }}` vs `{{ .ConfirmationURL }}`, verifyOtp usage
- Supabase official docs: [Signing Out](https://supabase.com/docs/guides/auth/signout) — signOut scope: global/local/others
- Supabase official docs: [Password Security](https://supabase.com/docs/guides/auth/password-security) — minimum length, bcrypt hashing, WeakPasswordError
- Existing codebase: `apps/android/contexts/AuthContext.tsx` — all auth methods already implemented
- Existing codebase: `apps/android/screens/LoginScreen.tsx` — login UI with "Forgot password?" placeholder
- Existing codebase: `apps/android/screens/OtpVerificationScreen.tsx` — OTP input pattern to reuse
- Existing codebase: `supabase/templates/recovery.html` — recovery template uses `{{ .Token }}` (OTP)
- Existing codebase: `supabase/config.toml` — `otp_length = 6`, `otp_expiry = 3600`

### Secondary (MEDIUM confidence)
- Supabase docs: verifyOtp type 'recovery' creates an authenticated session — verified via template docs and auth flow documentation

### Tertiary (LOW confidence)
- None — all findings verified against official docs or existing codebase

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed and in use
- Architecture: HIGH — all auth methods already implemented in AuthContext, only UI screens needed
- Pitfalls: HIGH — verified against Supabase official docs and existing codebase patterns

**Research date:** 2026-03-01
**Valid until:** 2026-03-31 (stable — Supabase auth API is mature)
