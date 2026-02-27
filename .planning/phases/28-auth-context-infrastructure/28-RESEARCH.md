# Phase 28: Auth Context & Infrastructure - Research

**Researched:** 2026-02-27
**Domain:** React Native AuthContext extension, Supabase email auth API, i18n
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Per-operation loading states: signUpLoading, signInLoading, resetLoading, updatePasswordLoading
- Methods throw on error — callers use try/catch
- Caller handles toast notifications, not AuthContext
- signUpWithEmail requires email confirmation before sign-in (no auto sign-in after registration)
- Check auth provider before calling GoogleSignin.signOut() — skip for email-only users
- Same visual sign-out experience regardless of provider (no provider-aware UI)
- If GoogleSignin.signOut() fails for a Google user, continue sign-out anyway (clear Supabase session regardless)
- Keys organized by screen: auth.login.*, auth.signup.*, auth.reset.*, auth.updatePassword.*
- Error messages are friendly and helpful — guide user to next action (e.g., "That email is already registered. Try signing in instead.")
- Claude writes both EN and IT translations
- Italian uses informal "tu" tone (e.g., "Inserisci la tua email")
- State enum: recoveryState: 'idle' | 'email_sent' | 'link_clicked' | 'updating'
- Set to 'email_sent' when reset email is sent, transitions through states as user progresses
- Cleared (back to 'idle') after successful password update
- Persist recovery state across app restarts (user may open reset email hours later)
- After successful password update: show success message, user taps to continue (no auto-navigate)

### Claude's Discretion
- Provider detection approach (from session metadata vs on-the-fly query at sign-out time)
- Password reset link detection mechanism (Supabase onAuthStateChange vs deep link handler)
- Exact recovery state persistence mechanism (AsyncStorage, SecureStore, etc.)
- Loading state type (boolean per operation vs single union type)

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-02 | Sign-out works correctly for email-only users | GoogleSignin.hasPreviousSignIn() guard before GoogleSignin.signOut(); provider detection from session app_metadata |
| INFRA-06 | All new UI strings available in IT and EN | i18n-js translation files with DeepStringify type constraint; ~30 new keys under auth.* namespace |
</phase_requirements>

## Summary

Phase 28 extends the existing `AuthContext.tsx` to support the full email auth lifecycle (signUp, signIn, resetPassword, updatePassword) without building any new screens. The current AuthContext only handles Google Sign-In and has an unguarded `GoogleSignin.signOut()` call that will crash for email-only users. This phase also adds approximately 30 i18n keys for auth-related UI strings.

The Supabase JS client (`@supabase/supabase-js` v2.45+, using `@supabase/auth-js` v2.89.0) already provides all required methods: `signUp()`, `signInWithPassword()`, `resetPasswordForEmail()`, `updateUser()`, and `verifyOtp()`. The project uses OTP codes (6-digit, configured in `config.toml` with `otp_length = 6`), NOT deep links, for both email confirmation and password recovery. The `onAuthStateChange` listener already exists in AuthContext and can detect `PASSWORD_RECOVERY` events for the recovery flow.

**Primary recommendation:** Extend AuthContext with four new methods + recovery state machine, guard signOut with `GoogleSignin.hasPreviousSignIn()`, and add ~30 i18n keys organized by auth.login/signup/reset/updatePassword namespaces.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| @supabase/supabase-js | ^2.45.0 | Email auth API (signUp, signInWithPassword, resetPasswordForEmail, updateUser, verifyOtp) | Already installed in @lumio/core |
| @react-native-google-signin/google-signin | ^16.1.1 | Sign-out guard via hasPreviousSignIn() | Already installed in apps/android |
| i18n-js | ^4.5.2 | Translation strings with type-safe keys | Already installed in apps/android |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| @react-native-async-storage/async-storage | 2.2.0 | Persist recovery state across app restarts | Already used for locale persistence in I18nContext |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| AsyncStorage for recovery state | SecureStore | Recovery state is not sensitive (just an enum string), AsyncStorage is simpler and already used for similar pattern (locale). SecureStore has 2048 byte limit and is overkill for a state enum. |
| Boolean per-operation loading | Single union type `loadingOp: 'signUp' \| 'signIn' \| ...` | Booleans are simpler for callers (`if (signUpLoading)` vs `if (loadingOp === 'signUp')`). Multiple booleans match the locked decision from CONTEXT.md. |

**Installation:** No new dependencies needed. All libraries already installed.

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
├── contexts/
│   └── AuthContext.tsx           # Extended with email auth methods + recovery state
├── i18n/
│   ├── en.ts                    # Add auth.* namespace keys (~30 new keys)
│   └── it.ts                    # Mirror with Italian translations
└── lib/
    └── auth.ts                  # Unchanged (Google config only)
```

### Pattern 1: AuthContext Extension — Adding Email Methods
**What:** Add signUpWithEmail, signInWithEmail, resetPassword, updatePassword methods to existing AuthContext, each with its own loading state boolean.
**When to use:** This phase — all four methods follow the same pattern.
**Example:**
```typescript
// Source: Verified against @supabase/auth-js v2.89.0 type definitions
export interface AuthContextType {
  // Existing
  user: User | null;
  session: Session | null;
  state: AuthState;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // New — email auth
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;

  // New — loading states (per-operation)
  signUpLoading: boolean;
  signInLoading: boolean;
  resetLoading: boolean;
  updatePasswordLoading: boolean;

  // New — recovery flow state
  recoveryState: RecoveryState;
}

type RecoveryState = 'idle' | 'email_sent' | 'link_clicked' | 'updating';
```

### Pattern 2: Provider-Guarded Sign-Out
**What:** Check if user has a Google session before calling GoogleSignin.signOut(). Use `GoogleSignin.hasPreviousSignIn()` which is synchronous and returns boolean.
**When to use:** signOut method in AuthContext.
**Example:**
```typescript
// Source: @react-native-google-signin/google-signin v16.1.1 — hasPreviousSignIn() is synchronous
const signOut = useCallback(async (): Promise<void> => {
  // Guard: only call GoogleSignin.signOut() if user signed in with Google
  if (GoogleSignin.hasPreviousSignIn()) {
    try {
      await GoogleSignin.signOut();
    } catch (e) {
      // Per CONTEXT decision: if Google signOut fails, continue anyway
      console.warn('[Auth] GoogleSignin.signOut failed, continuing:', e);
    }
  }
  // Always clear Supabase session regardless
  await getSupabaseClient().auth.signOut();
}, []);
```

### Pattern 3: Recovery State Machine via onAuthStateChange
**What:** Detect PASSWORD_RECOVERY event from Supabase's onAuthStateChange to transition recovery state from 'email_sent' to 'link_clicked'. This event fires when the user enters the OTP recovery code via `verifyOtp({ type: 'recovery', ... })`.
**When to use:** Password reset flow.
**Example:**
```typescript
// Source: @supabase/auth-js v2.89.0 — AuthChangeEvent includes 'PASSWORD_RECOVERY'
const { data: { subscription } } = getSupabaseClient().auth.onAuthStateChange(
  (event, newSession) => {
    // Existing logic...
    setSession(newSession);
    setUser(newSession?.user ?? null);
    setState(newSession ? 'ready' : 'logged_out');

    // Recovery flow detection
    if (event === 'PASSWORD_RECOVERY') {
      setRecoveryState('link_clicked');
    }
  }
);
```

### Pattern 4: Supabase Email SignUp with OTP Confirmation
**What:** When `enable_confirmations = true` (as configured in config.toml), `signUp()` returns a user but NO session. The user must verify with a 6-digit OTP code sent to their email.
**When to use:** signUpWithEmail method.
**Example:**
```typescript
// Source: Context7 /supabase/supabase-js — signUp with autoconfirm OFF
const signUpWithEmail = useCallback(async (email: string, password: string): Promise<void> => {
  setSignUpLoading(true);
  try {
    const { data, error } = await getSupabaseClient().auth.signUp({
      email,
      password,
    });
    if (error) throw error;
    // When enable_confirmations = true: data.user exists but data.session is null
    // Caller shows "check your email for verification code" UI
  } finally {
    setSignUpLoading(false);
  }
}, []);
```

### Pattern 5: OTP Verification for Signup and Recovery
**What:** Use `verifyOtp()` with type 'signup' for email confirmation, type 'recovery' for password reset code.
**When to use:** After user receives OTP via email. NOTE: verifyOtp is NOT exposed from AuthContext in this phase (Phase 29/30 screens will call it). But AuthContext must handle the resulting onAuthStateChange events.
**Example:**
```typescript
// Source: @supabase/auth-js v2.89.0 types — VerifyEmailOtpParams
// For signup confirmation (Phase 29 will use this):
const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '123456',
  type: 'signup',  // EmailOtpType
});

// For recovery (Phase 30 will use this):
const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '123456',
  type: 'recovery',  // Triggers PASSWORD_RECOVERY event in onAuthStateChange
});
```

### Pattern 6: i18n Key Organization
**What:** Add auth-related keys following existing pattern where EN is the source of truth and IT must match the exact shape via `DeepStringify<typeof en>`.
**When to use:** All new auth strings.
**Example:**
```typescript
// Source: apps/android/i18n/en.ts — existing pattern
const en = {
  // ... existing keys ...
  auth: {
    login: {
      emailLabel: 'Email',
      passwordLabel: 'Password',
      signIn: 'Sign in',
      forgotPassword: 'Forgot password?',
      noAccount: "Don't have an account?",
      signUpLink: 'Sign up',
      invalidCredentials: 'Invalid email or password. Please try again.',
      emailNotConfirmed: 'Please verify your email before signing in.',
    },
    signup: {
      title: 'Create Account',
      emailLabel: 'Email',
      passwordLabel: 'Password',
      confirmPasswordLabel: 'Confirm password',
      signUp: 'Sign up',
      hasAccount: 'Already have an account?',
      signInLink: 'Sign in',
      emailExists: 'That email is already registered. Try signing in instead.',
      weakPassword: 'Password is too weak. Use at least 6 characters.',
      checkEmail: 'Check your email',
      verificationSent: 'We sent a verification code to %{email}',
    },
    reset: {
      title: 'Reset Password',
      emailLabel: 'Email',
      sendCode: 'Send reset code',
      backToLogin: 'Back to sign in',
      codeSent: 'Reset code sent',
      codeSentDescription: 'Check your email for the reset code.',
      userNotFound: 'No account found with that email.',
    },
    updatePassword: {
      title: 'Set New Password',
      newPasswordLabel: 'New password',
      confirmPasswordLabel: 'Confirm new password',
      update: 'Update password',
      success: 'Password updated',
      successDescription: 'Your password has been updated successfully.',
      continue: 'Continue',
      passwordMismatch: 'Passwords do not match.',
      samePassword: 'New password must be different from the current one.',
    },
  },
} as const;
```

### Anti-Patterns to Avoid
- **Calling GoogleSignin.signOut() without guard:** Will throw for email-only users who never signed in with Google. Always check `hasPreviousSignIn()` first.
- **Auto-signing in after email signup:** When `enable_confirmations = true`, the signup returns no session. Attempting to call `signInWithPassword` immediately will fail with `email_not_confirmed` error.
- **Storing recovery state in React state only:** User may close app after requesting reset, open email hours later. State must persist to AsyncStorage.
- **Using PASSWORD_RECOVERY event without checking recoveryState:** The `PASSWORD_RECOVERY` event fires when verifyOtp with type 'recovery' succeeds. It does NOT fire when `resetPasswordForEmail` is called. The flow is: resetPasswordForEmail -> (email sent, set 'email_sent') -> user enters OTP via verifyOtp -> PASSWORD_RECOVERY event fires -> set 'link_clicked' -> user calls updateUser({password}) -> set 'idle'.
- **Putting error-to-message mapping in AuthContext:** Per CONTEXT decision, AuthContext throws errors. The caller (screen) catches and shows toasts. Do NOT map errors to user-friendly strings inside AuthContext.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Email auth operations | Custom fetch calls to Supabase auth API | `supabase.auth.signUp()`, `signInWithPassword()`, `resetPasswordForEmail()`, `updateUser()` | Handles token refresh, PKCE, error codes automatically |
| Provider detection at sign-out | Query `user.app_metadata.provider` from Supabase DB | `GoogleSignin.hasPreviousSignIn()` | Synchronous, local check, no network call. Checks if Google SDK has a cached sign-in, which is exactly what we need to know before calling signOut() |
| Auth error type checking | `error.message.includes(...)` | `isAuthApiError(error)` + `error.code` from `@supabase/auth-js` | Type-safe error codes: `email_exists`, `invalid_credentials`, `email_not_confirmed`, `weak_password`, `otp_expired`, `same_password`, `over_email_send_rate_limit` |
| Recovery state persistence | Custom file-based storage | AsyncStorage with key `@lumio/recovery-state` | Same pattern as locale persistence in `lib/i18n.ts` |
| Translation type safety | Manual type matching between EN and IT | `DeepStringify<typeof en>` type (already exists in `i18n/en.ts`) | TypeScript enforces IT file has exact same key structure as EN |

**Key insight:** All four Supabase auth methods follow the same pattern: call method, check for error, throw if error. The complexity is in the state management (loading booleans, recovery state machine), not in the Supabase calls themselves.

## Common Pitfalls

### Pitfall 1: GoogleSignin.signOut() crashes for email-only users
**What goes wrong:** Current code calls `await GoogleSignin.signOut()` unconditionally. For email-only users who never signed in with Google, this throws an exception because the Google SDK has no cached session.
**Why it happens:** Original AuthContext was built for Google-only auth.
**How to avoid:** Guard with `GoogleSignin.hasPreviousSignIn()` — it's synchronous and returns `false` if no Google sign-in has occurred in this app instance.
**Warning signs:** App crash on sign-out for any non-Google user.

### Pitfall 2: signUp returns no session when email confirmation is enabled
**What goes wrong:** After `signUp()`, `data.session` is null (not a session). If code assumes a session exists post-signup, it will crash or redirect incorrectly.
**Why it happens:** `enable_confirmations = true` in config.toml means user must verify email before getting a session.
**How to avoid:** Check `data.user && !data.session` — this indicates "confirmation email sent, no session yet". The method should resolve successfully (not throw), and the caller should show a "check your email" message.
**Warning signs:** User sees blank screen or error after signing up.

### Pitfall 3: Recovery state lost on app restart
**What goes wrong:** User requests password reset, closes app, opens email hours later, enters OTP — but app has lost track that a recovery is in progress.
**Why it happens:** React state resets on app restart.
**How to avoid:** Persist `recoveryState` to AsyncStorage. On mount, read from AsyncStorage. On every state transition, write to AsyncStorage. Clear on successful password update.
**Warning signs:** Recovery flow breaks when app is backgrounded/killed between requesting reset and entering code.

### Pitfall 4: PASSWORD_RECOVERY event misunderstood
**What goes wrong:** Expecting `PASSWORD_RECOVERY` to fire when `resetPasswordForEmail()` is called. It does NOT. It fires when `verifyOtp({ type: 'recovery' })` succeeds, creating a temporary session for the user to update their password.
**Why it happens:** Confusion between "reset email sent" and "recovery OTP verified".
**How to avoid:** The state machine is: resetPasswordForEmail -> manually set 'email_sent' -> verifyOtp (Phase 30 screen) -> PASSWORD_RECOVERY event fires -> set 'link_clicked' -> updateUser({password}) -> set 'idle'.
**Warning signs:** Recovery state never transitions past 'email_sent'.

### Pitfall 5: Error code mismatch between signUp and "email already exists"
**What goes wrong:** When email confirmation is enabled and a user tries to sign up with an already-existing email, Supabase may return a "fake" success (user object with no session) rather than an `email_exists` error, to prevent user enumeration. The behavior depends on Supabase server configuration.
**Why it happens:** Security feature to prevent email enumeration attacks.
**How to avoid:** When `signUp` returns `data.user` with `data.user.identities` being an empty array `[]`, it means the email already exists. Check: `if (data.user && data.user.identities?.length === 0)` — treat as "email already registered".
**Warning signs:** User signs up with existing email, sees "check your email" but never gets a code.

### Pitfall 6: Missing i18n keys cause fallback to key path
**What goes wrong:** i18n-js returns the dotted key path (e.g., "auth.login.emailLabel") when a key is missing.
**Why it happens:** IT file missing a key that EN has.
**How to avoid:** The `DeepStringify<typeof en>` type on the IT file enforces structural parity at compile time. TypeScript will error if IT is missing any key that EN has. Run `npx tsc --noEmit` to verify.
**Warning signs:** Raw key paths visible in the UI instead of translated text.

## Code Examples

Verified patterns from official sources:

### Sign Up with Email (Supabase)
```typescript
// Source: Context7 /supabase/supabase-js — signUp method
// Config: enable_confirmations = true, otp_length = 6
const { data, error } = await getSupabaseClient().auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123',
});
if (error) throw error;

// Check for "fake" success (email already exists)
if (data.user && data.user.identities?.length === 0) {
  throw new Error('email_exists'); // Caller maps to friendly string
}

// data.session is null — email confirmation required
// data.user contains the unconfirmed user
```

### Sign In with Email/Password (Supabase)
```typescript
// Source: Context7 /supabase/supabase-js — signInWithPassword method
const { data, error } = await getSupabaseClient().auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword123',
});
if (error) throw error;
// data.session is now available — onAuthStateChange fires SIGNED_IN
```

### Request Password Reset (Supabase)
```typescript
// Source: Context7 /supabase/supabase-js — resetPasswordForEmail method
// No redirectTo needed — OTP flow, not deep link
const { error } = await getSupabaseClient().auth.resetPasswordForEmail(
  'user@example.com',
);
if (error) throw error;
// Recovery OTP email sent — Supabase uses templates/recovery.html
```

### Update Password (after OTP verification)
```typescript
// Source: Context7 /supabase/supabase-js — updateUser method
// Requires active session (from PASSWORD_RECOVERY event after verifyOtp)
const { error } = await getSupabaseClient().auth.updateUser({
  password: 'newSecurePassword123',
});
if (error) throw error;
// Password updated — clear recovery state
```

### GoogleSignin.hasPreviousSignIn() guard
```typescript
// Source: @react-native-google-signin/google-signin v16.1.1 type definitions
// hasPreviousSignIn(): boolean — synchronous, no await needed
if (GoogleSignin.hasPreviousSignIn()) {
  try {
    await GoogleSignin.signOut();
  } catch (e) {
    console.warn('[Auth] Google signOut failed:', e);
  }
}
```

### Auth Error Handling with error.code
```typescript
// Source: @supabase/auth-js v2.89.0 error-codes.d.ts
import { isAuthApiError } from '@supabase/supabase-js';

try {
  await signInWithEmail(email, password);
} catch (error) {
  if (isAuthApiError(error)) {
    switch (error.code) {
      case 'invalid_credentials':
        // "Invalid email or password"
        break;
      case 'email_not_confirmed':
        // "Please verify your email first"
        break;
      case 'user_banned':
        // "Account is disabled"
        break;
    }
  }
}
```

### AsyncStorage Recovery State Persistence
```typescript
// Source: Follows existing pattern from apps/android/lib/i18n.ts
import AsyncStorage from '@react-native-async-storage/async-storage';

const RECOVERY_STATE_KEY = '@lumio/recovery-state';

export type RecoveryState = 'idle' | 'email_sent' | 'link_clicked' | 'updating';

export async function loadRecoveryState(): Promise<RecoveryState> {
  try {
    const stored = await AsyncStorage.getItem(RECOVERY_STATE_KEY);
    if (stored === 'email_sent' || stored === 'link_clicked' || stored === 'updating') {
      return stored;
    }
    return 'idle';
  } catch {
    return 'idle';
  }
}

export async function saveRecoveryState(state: RecoveryState): Promise<void> {
  if (state === 'idle') {
    await AsyncStorage.removeItem(RECOVERY_STATE_KEY);
  } else {
    await AsyncStorage.setItem(RECOVERY_STATE_KEY, state);
  }
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Deep link email verification | OTP code verification | Supabase config: `otp_length = 6` | No deep link infrastructure needed; user enters 6-digit code in-app |
| `error.message` string matching | `error.code` enum matching | @supabase/auth-js v2.x | Type-safe error handling with `ErrorCode` type |
| Single loading boolean | Per-operation loading booleans | User decision (this phase) | Callers know exactly which operation is loading |

**Deprecated/outdated:**
- Deep link password recovery: Project uses OTP approach per REQUIREMENTS.md ("OTP approach chosen -- more reliable on Android, no deep link infrastructure needed")

## Open Questions

1. **verifyOtp exposure from AuthContext**
   - What we know: Phase 28 scope is "infrastructure only, no new screens." Phase 29 (signup screens) and Phase 30 (signin/reset screens) will need `verifyOtp`.
   - What's unclear: Should verifyOtp be exposed from AuthContext in Phase 28, or deferred to Phase 29/30?
   - Recommendation: Expose it now. It's part of the auth infrastructure, and having it available avoids modifying AuthContext again in Phase 29. Add two methods: `verifySignupOtp(email, token)` and `verifyRecoveryOtp(email, token)`.

2. **Supabase's email enumeration protection behavior**
   - What we know: With `enable_confirmations = true`, signUp with existing email MAY return fake success (empty identities array) instead of error.
   - What's unclear: Exact server behavior depends on Supabase configuration that may differ between local and production.
   - Recommendation: Handle both paths — check for error.code === 'email_exists' AND check for empty identities array. Test both locally.

## Sources

### Primary (HIGH confidence)
- Context7 `/supabase/supabase-js` — signUp, signInWithPassword, resetPasswordForEmail, updateUser, verifyOtp, onAuthStateChange events
- `@supabase/auth-js` v2.89.0 type definitions (locally installed) — ErrorCode, AuthChangeEvent, VerifyEmailOtpParams, EmailOtpType
- `@react-native-google-signin/google-signin` v16.1.1 source code (locally installed) — hasPreviousSignIn() synchronous boolean, signOut() async

### Secondary (MEDIUM confidence)
- Supabase email enumeration behavior (signUp with existing email returns empty identities) — documented in Supabase docs, verified against type definitions

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all libraries already installed, type definitions verified locally
- Architecture: HIGH — extending existing AuthContext follows established pattern, Supabase API verified via Context7 and local type defs
- Pitfalls: HIGH — Google signOut crash is directly observable in code, OTP flow confirmed by config.toml settings and template files

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable — no version changes expected)
