# Phase 31: Account Linking - Research

**Researched:** 2026-03-02
**Domain:** Supabase identity management, React Native OAuth, session storage
**Confidence:** HIGH

## Summary

Account linking in this phase requires three distinct operations: (1) displaying connected identities via `user.identities`, (2) linking Google to an email-only account via `linkIdentity()` with native ID token, and (3) adding email/password to a Google-only account via `updateUser({ password })`. The Supabase JS SDK v2.89.0 (installed) fully supports all three operations, including the critical `linkIdentity()` with ID token overload that avoids the browser PKCE redirect — resolving the MEDIUM-confidence spike from STATE.md.

The SecureStore JWT size concern from STATE.md is effectively mitigated: the current `SecureStoreAdapter` stores the full session object (including user + identities), and Supabase v2.89.0 supports a `userStorage` option that splits user data out of the main session storage. However, since a typical Supabase session JSON with 2 identities is estimated at ~1200-1500 bytes (well within the 2048-byte SecureStore limit), this split may not be needed. The planner should include a measurement task as a gate.

A key design tension exists around the "add password + OTP verification" flow specified in CONTEXT.md: Supabase's `updateUser({ password })` sets the password immediately without OTP. The OTP flow would need to be a custom application-level verification step (e.g., send OTP via `signUp` or `resetPasswordForEmail`, then set password), not a built-in Supabase behavior.

**Primary recommendation:** Use `linkIdentity({ provider: 'google', token: idToken, access_token: accessToken })` for Google linking (native), `updateUser({ password })` for adding password to OAuth accounts, `getUserIdentities()` for display, and `unlinkIdentity(identity)` for disconnection — all via the existing `@supabase/supabase-js@2.89.0`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Expand existing account section in Settings (below avatar/name/email) — not a separate section
- Each auth method (Google, Email) gets its own row: icon + label + email address + status
- Connected methods show the associated email and an explicit "Disconnect" button
- Unconnected methods show an "Add" action button
- Show the specific email for each method (Google email, account email) — useful when they differ
- Tapping "Add" on the Email row navigates to a dedicated "Set Password" screen (new screen, not inline)
- Email field pre-filled with the Google account email but editable
- User enters password + confirm password
- After submission, OTP verification is required (consistent with signup flow) — navigate to OTP screen
- On successful verification, return to Settings with a success toast ("Email/password added")
- Tapping "Add" on the Google row launches the Google OAuth picker directly — no intermediate confirmation screen
- If the selected Google account is already linked to a different Lumio account, block with error: "This Google account is already linked to another account"
- If Google email differs from the Lumio account email, allow it without special handling — Supabase manages multi-identity
- On successful linking, return to Settings with a success toast ("Google account connected")
- No confirmation dialog for unlinking — unlinking is immediate since it's reversible
- When only one method is connected, hide the "Disconnect" button entirely — no disabled state
- After unlinking, show a toast and update the row to show "Add" button
- Unlinking email/password is a full removal — re-adding later requires the complete add-password flow

### OpenCode's Discretion
- Exact row layout, spacing, icons, and typography
- Loading/spinner states during link/unlink operations
- Error handling for network failures during OAuth or API calls
- SecureStore dual-identity JWT handling approach
- Animation/transition between states (connected ↔ unconnected)

### Deferred Ideas (OUT OF SCOPE)
- Account merging (when Google account is already linked to a different Lumio account) — future phase
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| LINK-01 | User can see connected authentication methods in Settings | `user.identities` array on the Supabase User object contains all linked identities. Each identity has `provider` ("google", "email"), `identity_data` (containing email, name, etc.), and `identity_id`. Use `getUserIdentities()` or directly access `user.identities` from AuthContext. |
| LINK-02 | User can add Google to an email-only account | `linkIdentity({ provider: 'google', token: idToken, access_token: accessToken })` with ID token from native Google Sign-In SDK. Returns updated session with new identity. Server validates: blocks if Google identity already linked to another user. |
| LINK-03 | User can add email/password to a Google-only account | `updateUser({ password: newPassword })` adds password credential to OAuth-only account. Per Supabase docs FAQ: "Call updateUser({ password }) to add email/password auth to an OAuth account." See "Add Password Flow" architecture pattern for CONTEXT.md's OTP requirement. |
| LINK-04 | User can unlink an authentication method (if at least one remains) | `unlinkIdentity(identity)` with the `UserIdentity` object. Server enforces at-least-one: returns `ErrorCodeSingleIdentityNotDeletable` if user has only 1 identity. Client-side: hide "Disconnect" button when `identities.length <= 1` per CONTEXT.md. |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | 2.89.0 (installed) | Identity CRUD: `linkIdentity()`, `unlinkIdentity()`, `getUserIdentities()`, `updateUser()` | Already installed and used for all auth operations |
| `@react-native-google-signin/google-signin` | installed | Native Google Sign-In for `linkIdentity` ID token flow | Already configured with `webClientId` and `offlineAccess: true` |
| `react-native-toast-message` | installed | Success/error feedback toasts | Established pattern across all auth screens |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `expo-secure-store` | installed | Session token storage (2048-byte limit) | Current storage adapter for Supabase sessions |
| `@react-navigation/native-stack` | installed | Screen navigation for SetPassword flow | New screen added to navigation |
| `i18n-js` | installed | EN/IT translations for all new strings | All new UI text requires both locales |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `linkIdentity()` with ID token | `linkIdentity()` with OAuth redirect (PKCE) | ID token uses native Google picker (consistent UX). PKCE opens browser — different UX, more complex. **Use ID token.** |
| `updateUser({ password })` | Full signUp flow for email identity | `updateUser` is simpler and officially recommended. SignUp would create a new user, not link to existing. |
| Direct `user.identities` access | `getUserIdentities()` API call | Both work — `getUserIdentities()` internally calls `getUser()` and returns `user.identities`. Direct access from AuthContext's `user` object is simpler. |

**Installation:**
No new packages needed. All required APIs are available in the installed stack.

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
├── contexts/AuthContext.tsx       # ADD: linkGoogle, addPassword, unlinkIdentity, getUserIdentities
├── screens/
│   ├── SettingsScreen.tsx         # MODIFY: add connected accounts rows below account section
│   └── SetPasswordScreen.tsx     # NEW: password + confirm for Google-only users
├── navigation/
│   ├── MainNavigator.tsx          # MODIFY: add SetPassword screen (or use root stack)
│   └── AppNavigator.tsx           # MODIFY: add SetPassword to RootStackParamList
└── i18n/
    ├── en.ts                      # ADD: auth.linking.* and settings.linking.* keys
    └── it.ts                      # ADD: Italian translations
```

### Pattern 1: Identity Display from User Object
**What:** Read connected identities from the AuthContext `user` object
**When:** SettingsScreen renders connected accounts section
**Why:** `user.identities` is always available on the Supabase User object, no extra API call needed

```typescript
// Source: @supabase/auth-js/src/lib/types.ts:322 (UserIdentity interface)
// Source: @supabase/auth-js/src/lib/types.ts:396 (User.identities field)

// In SettingsScreen or a custom hook
const { user } = useAuth();

const googleIdentity = user?.identities?.find(i => i.provider === 'google');
const emailIdentity = user?.identities?.find(i => i.provider === 'email');

// Each identity has:
// - provider: 'google' | 'email'
// - identity_data: { email: string, full_name?: string, avatar_url?: string, ... }
// - identity_id: string (UUID, needed for unlinkIdentity)
// - created_at, last_sign_in_at

const googleEmail = googleIdentity?.identity_data?.email;
const emailEmail = emailIdentity?.identity_data?.email;
const hasMultipleIdentities = (user?.identities?.length ?? 0) > 1;
```

### Pattern 2: Link Google with Native ID Token
**What:** Use native Google Sign-In SDK to get ID token, then call `linkIdentity()` with token overload
**When:** Email-only user taps "Add" on Google row in Settings
**Why:** Avoids browser redirect (PKCE flow), uses same native Google picker as initial sign-in

```typescript
// Source: @supabase/auth-js/src/GoTrueClient.ts:2331-2343 (linkIdentity overloads)
// Source: @supabase/auth-js/src/GoTrueClient.ts:2382-2431 (linkIdentityIdToken implementation)

async function linkGoogleIdentity(): Promise<void> {
  // 1. Native Google Sign-In (same as signInWithGoogle)
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  
  if (response.type !== 'success' || !response.data.idToken) {
    return; // User cancelled
  }
  
  // 2. Get access token (recommended for linkIdentity, handles at_hash claim)
  const tokens = await GoogleSignin.getTokens();
  
  // 3. Link identity via Supabase
  const { data, error } = await getSupabaseClient().auth.linkIdentity({
    provider: 'google',
    token: response.data.idToken,
    access_token: tokens.accessToken,
  });
  
  if (error) {
    // Server returns "Identity is already linked to another user" 
    // when Google account belongs to different Lumio user
    if (error.message?.includes('already linked')) {
      throw new Error('google_already_linked');
    }
    throw error;
  }
  
  // linkIdentityIdToken saves session and fires USER_UPDATED event
  // AuthContext's onAuthStateChange listener auto-updates user state
}
```

### Pattern 3: Add Password to OAuth Account
**What:** Use `updateUser({ password })` to add email/password credential
**When:** Google-only user taps "Add" on Email row in Settings
**Why:** Official Supabase approach per their FAQ

```typescript
// Source: Supabase Identity Linking Guide FAQ
// Source: @supabase/auth-js/src/GoTrueClient.ts:1776-1835 (updateUser implementation)

async function addPasswordToAccount(password: string): Promise<void> {
  const { data, error } = await getSupabaseClient().auth.updateUser({ 
    password 
  });
  
  if (error) throw error;
  // Session is auto-updated, onAuthStateChange fires USER_UPDATED
  // User object now has an 'email' identity in addition to 'google'
}
```

**CRITICAL DESIGN NOTE — OTP Verification:**
CONTEXT.md requires OTP verification after adding a password. However, `updateUser({ password })` sets the password **immediately** without OTP. The email identity is created instantly. There is no built-in Supabase mechanism to require OTP verification for `updateUser({ password })` on an existing authenticated user.

**Options for implementing CONTEXT.md's OTP requirement:**
1. **Application-level OTP verification BEFORE setting password:** Send an OTP to the email (using `signUp` or custom Edge Function), verify it, then call `updateUser({ password })`. This adds complexity but matches the CONTEXT.md flow.
2. **Rely on updateUser's email confirmation behavior:** If the user edits the email to something different from their Google email, `updateUser({ email: newEmail, password })` would trigger email confirmation (because `double_confirm_changes = true`). But if the email stays the same, no OTP is sent.
3. **Accept the simpler flow:** Call `updateUser({ password })` directly and skip OTP. The user is already authenticated with Google, so identity verification is implicit. **This deviates from CONTEXT.md.**

**Recommendation for planner:** The most practical approach is **Option 1** — use `resetPasswordForEmail(email)` to send an OTP, verify with `verifyOtp({ type: 'recovery' })`, then call `updateUser({ password })`. This leverages existing OTP infrastructure (OtpVerificationScreen pattern from Phase 29), matches CONTEXT.md's requirement, and works because the user is already authenticated. The recovery OTP flow is already implemented in AuthContext.

### Pattern 4: Unlink Identity
**What:** Remove an identity from the user
**When:** User taps "Disconnect" on a connected method (only shown when 2+ identities)
**Why:** Supabase server enforces at-least-one identity; client hides button as additional UX guard

```typescript
// Source: @supabase/auth-js/src/GoTrueClient.ts:2436-2465 (unlinkIdentity implementation)
// Source: Supabase Auth server identity.go DeleteIdentity function

async function unlinkIdentity(identity: UserIdentity): Promise<void> {
  const { error } = await getSupabaseClient().auth.unlinkIdentity(identity);
  if (error) throw error;
  // Note: unlike linkIdentity, unlinkIdentity does NOT auto-update the local session
  // Need to call getUser() to refresh the user object with updated identities
}
```

**Important:** After `unlinkIdentity()`, the local user object in AuthContext may be stale. Call `getUser()` to refresh, or rely on the next `onAuthStateChange` event. The safest approach is to explicitly refresh:

```typescript
// After successful unlink
const { data: { user: updatedUser } } = await getSupabaseClient().auth.getUser();
// Update AuthContext state with updatedUser
```

### Pattern 5: Navigation for SetPassword Screen
**What:** New screen accessible from Settings for the "add password" flow
**When:** Google-only user taps "Add" on Email row
**Why:** CONTEXT.md specifies a dedicated screen, not inline editing

```typescript
// Option A: Add to RootStackParamList (accessible from Settings tab)
export type RootStackParamList = {
  Main: undefined;
  Study: undefined;
  StudySummary: { ... };
  SetPassword: { email: string };  // NEW
  OtpVerification: { email: string; returnTo: 'Settings' }; // REUSE with returnTo param
  // ...
};

// Option B: Create a Settings sub-navigator
// Less preferred — adds navigation complexity for one screen
```

### Anti-Patterns to Avoid
- **Using `signUp()` to add email identity:** `signUp` creates a NEW user, not a linked identity. Use `updateUser({ password })` instead.
- **Using `linkIdentity()` without `access_token`:** Google ID tokens may contain an `at_hash` claim that requires the access token for validation. Always pass both.
- **Assuming `unlinkIdentity` refreshes local state:** It doesn't fire `USER_UPDATED` consistently. Explicitly refresh user data after unlinking.
- **Relying solely on client-side identity count check for unlink:** Always handle the server error `ErrorCodeSingleIdentityNotDeletable` as a fallback, even though the UI hides the button.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Identity CRUD | Custom API calls to GoTrue | `supabase.auth.linkIdentity()`, `unlinkIdentity()`, `getUserIdentities()` | API handles token exchange, session updates, server validation |
| At-least-one-identity enforcement | Client-side validation only | Server enforces via `ErrorCodeSingleIdentityNotDeletable` + client UI hides button | Server-side enforcement is the security boundary |
| Google OAuth token exchange | Manual HTTP requests to Google | `GoogleSignin.signIn()` + `GoogleSignin.getTokens()` | SDK handles Play Services, token refresh, error codes |
| Session storage after linking | Manual SecureStore writes | Supabase client's `_saveSession()` auto-persists after `linkIdentity` | Client handles session update + storage internally |

**Key insight:** The `linkIdentity({ token, access_token })` overload (ID token flow) handles the entire server-side identity creation, session update, and local persistence in one call. The browser PKCE redirect is NOT needed for native mobile.

## Common Pitfalls

### Pitfall 1: linkIdentity Returns Error for Already-Linked Google Account
**What goes wrong:** User tries to link a Google account that's already linked to a different Lumio user. Server returns HTTP 422 with `ErrorCodeIdentityAlreadyExists`.
**Why it happens:** Supabase enforces unique identity-per-user at the server level.
**How to avoid:** Catch the specific error and show CONTEXT.md's required message: "This Google account is already linked to another account."
**Warning signs:** Error message contains "already linked."

### Pitfall 2: updateUser({ password }) Does NOT Create Email Identity on All Supabase Versions
**What goes wrong:** On some Supabase versions, `updateUser({ password })` may only set the password hash without creating an email identity record. The user has a password but `user.identities` doesn't show an email identity.
**Why it happens:** Behavior varies between Supabase Auth versions. In modern versions, setting a password on an OAuth-only user should create an email identity.
**How to avoid:** After `updateUser({ password })`, verify that `user.identities` contains an email identity. If not, the display may need to check for password existence differently (e.g., `user.email` exists and password is set).
**Warning signs:** After adding password, the Email row still shows as "not connected."

### Pitfall 3: Stale User Object After unlinkIdentity
**What goes wrong:** After unlinking, the UI still shows the old identity because the local `user` object wasn't refreshed.
**Why it happens:** `unlinkIdentity()` returns `{ data: {}, error: null }` — it does NOT return the updated user. The local session user object is stale.
**How to avoid:** Explicitly call `getUser()` after successful unlink to refresh identities. Or trigger a forced user refresh in AuthContext.
**Warning signs:** UI doesn't update after successful unlink until next app restart.

### Pitfall 4: GoogleSignin.getTokens() Requires Prior signIn
**What goes wrong:** Calling `GoogleSignin.getTokens()` without a prior successful `GoogleSignin.signIn()` throws an error.
**Why it happens:** `getTokens()` retrieves tokens for the currently signed-in Google user. If no Google sign-in session exists, it fails.
**How to avoid:** Always call `getTokens()` immediately after `signIn()` returns success, in the same flow.
**Warning signs:** `getTokens()` error: "User is not signed in."

### Pitfall 5: SecureStore 2048-Byte Limit with Dual Identities
**What goes wrong:** Session JSON with 2 identities (each containing identity_data with email, name, avatar_url, etc.) may exceed the 2048-byte SecureStore limit, causing silent storage failure or crash.
**Why it happens:** Each identity adds ~200-400 bytes of JSON (provider, identity_data, timestamps). A session with 2 identities is ~1200-1600 bytes. Add session tokens (~700 bytes for access + refresh tokens), and total can approach 2048.
**How to avoid:** Measure actual session size after linking. If over 1500 bytes, switch to `userStorage` pattern (supabase-js v2.89.0 supports splitting user data to separate storage). Or implement LargeSecureStore pattern from Phase 1 research.
**Warning signs:** Session persistence failures, user getting logged out unexpectedly after linking identities.

### Pitfall 6: OTP Flow for "Add Password" — No Native Supabase Support
**What goes wrong:** CONTEXT.md requires OTP verification when adding password to Google-only account, but `updateUser({ password })` doesn't send OTP.
**Why it happens:** `updateUser()` is designed for authenticated users updating their own profile — no additional verification needed from Supabase's perspective.
**How to avoid:** Implement application-level OTP verification: send recovery OTP → verify → set password. See Architecture Pattern 3 for detailed approach.
**Warning signs:** Password is set immediately without OTP step.

## Code Examples

### Get Connected Identities
```typescript
// Source: @supabase/auth-js/src/lib/types.ts:322 (UserIdentity)
// Source: @supabase/auth-js/src/lib/types.ts:396 (User)

interface ConnectedAccount {
  provider: 'google' | 'email';
  email: string | undefined;
  identityId: string;
  isConnected: boolean;
}

function getConnectedAccounts(user: User | null): ConnectedAccount[] {
  const identities = user?.identities ?? [];
  
  const google = identities.find(i => i.provider === 'google');
  const email = identities.find(i => i.provider === 'email');
  
  return [
    {
      provider: 'google',
      email: google?.identity_data?.email,
      identityId: google?.identity_id ?? '',
      isConnected: !!google,
    },
    {
      provider: 'email',
      email: email?.identity_data?.email ?? user?.email,
      identityId: email?.identity_id ?? '',
      isConnected: !!email,
    },
  ];
}
```

### Link Google Identity (Native Flow)
```typescript
// Source: @supabase/auth-js/src/GoTrueClient.ts:2382-2431
// Source: @react-native-google-signin/google-signin types.ts:98-101

import { GoogleSignin, statusCodes } from '@react-native-google-signin/google-signin';
import { getSupabaseClient } from '@lumio/core';

async function linkGoogle(): Promise<void> {
  await GoogleSignin.hasPlayServices();
  const response = await GoogleSignin.signIn();
  
  if (response.type !== 'success' || !response.data.idToken) {
    return; // cancelled
  }
  
  // getTokens() returns { idToken, accessToken }
  const tokens = await GoogleSignin.getTokens();
  
  const { error } = await getSupabaseClient().auth.linkIdentity({
    provider: 'google',
    token: response.data.idToken,
    access_token: tokens.accessToken,
  });
  
  if (error) throw error;
  // Session auto-updated, USER_UPDATED event fires
}
```

### Unlink Identity with Refresh
```typescript
// Source: @supabase/auth-js/src/GoTrueClient.ts:2436-2465
// Source: Supabase Auth server identity.go — enforces len(identities) > 1

import type { UserIdentity } from '@supabase/supabase-js';

async function unlinkIdentityAndRefresh(identity: UserIdentity): Promise<User> {
  const { error } = await getSupabaseClient().auth.unlinkIdentity(identity);
  if (error) throw error;
  
  // Must refresh — unlinkIdentity doesn't return updated user
  const { data, error: refreshError } = await getSupabaseClient().auth.getUser();
  if (refreshError) throw refreshError;
  
  return data.user;
}
```

### Supabase Error Code Handling
```typescript
// Source: Supabase Auth server identity.go

// Error codes from server:
// - "Identity is already linked" → Google already linked to another user
// - "Identity is already linked to another user" → same
// - "User must have at least 1 identity after unlinking" → can't unlink last identity
// - "Identity doesn't exist" → identity_id not found

function mapLinkingError(error: AuthError): string {
  const msg = error.message?.toLowerCase() ?? '';
  
  if (msg.includes('already linked')) {
    return t('auth.linking.googleAlreadyLinked');
  }
  if (msg.includes('at least 1 identity')) {
    return t('auth.linking.cannotUnlinkLast');
  }
  return t('common.unknownError');
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `linkIdentity()` OAuth redirect only | `linkIdentity()` with ID token overload | supabase-js ~2.80+ (late 2025) | Native mobile can link without browser redirect |
| No `userStorage` option | `userStorage` splits user from session storage | supabase-js ~2.85+ | Enables smaller main storage payload (helps SecureStore limit) |
| Server didn't enforce unlink minimum | Server enforces `len(identities) > 1` | GoTrue 2.x | Server-side safety net for at-least-one identity |

**Deprecated/outdated:**
- Browser PKCE redirect for `linkIdentity` in React Native: No longer needed — ID token overload available in 2.89.0
- LargeSecureStore hybrid encryption pattern: May not be needed if session stays under 2048 bytes. Measure first.

## Open Questions

1. **`updateUser({ password })` email identity creation behavior**
   - What we know: Supabase docs FAQ says "Call updateUser({ password }) to add email/password auth to an OAuth account." The installed supabase-js 2.89.0 supports this.
   - What's unclear: Does this automatically create an `email` identity in `user.identities`, or does it only set a password hash? Behavior may vary by GoTrue server version.
   - Recommendation: Test locally with Supabase CLI after implementation. If no email identity appears, check the user object structure and consider displaying "Password set" instead of relying on identity count.
   - Confidence: MEDIUM — docs say it works, but server behavior needs verification.

2. **OTP verification for "add password" flow (CONTEXT.md requirement)**
   - What we know: `updateUser({ password })` does NOT send OTP. CONTEXT.md explicitly requires OTP after password submission.
   - What's unclear: Is the user-decided OTP flow technically sound? Using `resetPasswordForEmail` to trigger OTP on an already-authenticated user works because recovery OTP is independent of session state.
   - Recommendation: Use this flow: (1) call `resetPasswordForEmail(email)` to send OTP, (2) navigate to OTP screen, (3) verify with `verifyOtp({ type: 'recovery' })`, (4) call `updateUser({ password })`. This piggybacks on existing recovery OTP infrastructure.
   - Confidence: MEDIUM — the recovery OTP flow on an already-authenticated user is non-standard but should work because OTP verification is session-independent.

3. **Session size after dual-identity linking**
   - What we know: SecureStore limit is 2048 bytes. Single-identity sessions are ~800-1200 bytes. Each identity adds ~200-400 bytes.
   - What's unclear: Exact session JSON size with 2 identities including Google's rich identity_data (email, name, avatar_url, sub, etc.)
   - Recommendation: Add a measurement task in the plan — log `JSON.stringify(session).length` after linking. If > 1500 bytes, implement `userStorage` split.
   - Confidence: MEDIUM — estimate suggests it fits, but must verify.

4. **`GoogleSignin.getTokens()` availability after `signIn()` in linking context**
   - What we know: `getTokens()` returns `{ idToken, accessToken }`. The `signIn()` response only has `idToken` (not `accessToken`).
   - What's unclear: Whether `getTokens()` works reliably immediately after `signIn()` in all Android versions.
   - Recommendation: Call `getTokens()` right after `signIn()` success. If `accessToken` is undefined, fall back to calling `linkIdentity` with `token` only (without `access_token`). The `access_token` parameter is optional in `SignInWithIdTokenCredentials`.
   - Confidence: HIGH — `getTokens()` is the standard way to get access tokens in the Google Sign-In SDK.

## Sources

### Primary (HIGH confidence)
- `@supabase/auth-js@2.89.0` source code — `GoTrueClient.ts:2306-2465` — verified `getUserIdentities`, `linkIdentity` (both overloads), `unlinkIdentity` implementation
- `@supabase/auth-js@2.89.0` types — `types.ts:322-333` (UserIdentity), `types.ts:396-422` (User), `types.ts:636-649` (SignInWithIdTokenCredentials)
- Supabase Auth server (`identity.go`) — verified server-side at-least-one enforcement, duplicate identity blocking, error codes
- Supabase Identity Linking Guide — https://supabase.com/docs/guides/auth/auth-identity-linking — automatic/manual linking, FAQ on adding password
- `@react-native-google-signin/google-signin` types — `types.ts:98-101` (GetTokensResponse with accessToken)
- `expo-secure-store` source — `byteCounter.ts:1` — confirmed 2048-byte VALUE_BYTES_LIMIT
- Project codebase: `AuthContext.tsx` (auth methods), `SettingsScreen.tsx` (UI structure), `supabase.ts` (storage adapter), `config.toml` (enable_manual_linking = true)

### Secondary (MEDIUM confidence)
- Prior project research: `.planning/research/STACK.md`, `ARCHITECTURE.md`, `PITFALLS.md` — early analysis of linkIdentity concerns, corroborated with source code verification
- Supabase GoTrueClient `_saveSession()` implementation — shows how `userStorage` splits user from session (lines 2768-2806)

### Tertiary (LOW confidence)
- Session size estimates (800-1600 bytes): Based on typical JWT + session JSON structure, NOT empirically measured for this project. Must be measured during implementation.

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all APIs verified in installed source code, no new dependencies needed
- Architecture: HIGH for linking/unlinking flows, MEDIUM for "add password + OTP" flow (non-standard OTP usage)
- Pitfalls: HIGH — server source code verified for error handling; session size concern is MEDIUM until measured

**Research date:** 2026-03-02
**Valid until:** 2026-04-02 (stable — Supabase auth API is mature)
