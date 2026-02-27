# Technology Stack: v2.1 Email Auth

**Project:** Lumio
**Researched:** 2026-02-27
**Focus:** Email/password authentication with email verification, password reset, and Google OAuth account linking
**Confidence:** HIGH

---

## Executive Summary

No new npm dependencies are needed. The existing stack (`@supabase/supabase-js@2.89.0`, `expo-linking@8.0.11`, `expo-secure-store@15.0.8`) provides all required APIs for email/password auth, OTP-based email verification, password reset, and account linking. The work is purely integration: wiring Supabase Auth methods already present in the installed SDK, updating `config.toml` for email confirmations and manual identity linking, creating OTP-based email templates, and building new UI screens.

---

## Recommended Stack Additions

### No New npm Packages Required

All required auth functionality exists in the already-installed `@supabase/supabase-js@2.89.0`. The following Supabase Auth JS methods are needed but already available:

| Method | Purpose | Exists in 2.89.0 |
|--------|---------|:-:|
| `auth.signUp()` | Register with email + password | Yes |
| `auth.signInWithPassword()` | Login with email + password | Yes |
| `auth.verifyOtp()` | Verify email (OTP code) and verify recovery OTP | Yes |
| `auth.resetPasswordForEmail()` | Send password reset email | Yes |
| `auth.updateUser()` | Set new password after reset, add password to OAuth account | Yes |
| `auth.linkIdentity()` | Link Google OAuth to email account | Yes |
| `auth.getUserIdentities()` | List linked auth providers | Yes |
| `auth.unlinkIdentity()` | Remove linked identity | Yes |

**Confidence:** HIGH -- all methods verified in [Supabase JS API Reference](https://supabase.com/docs/reference/javascript/auth-signup).

---

## What Already Exists (DO NOT add)

| Technology | Version | Already Used For |
|------------|---------|------------------|
| @supabase/supabase-js | 2.89.0 | Google OAuth via `signInWithIdToken`, session mgmt, DB queries |
| expo-linking | 8.0.11 | Installed in package.json (not yet used in code), provides `Linking.addEventListener`, `Linking.createURL` |
| expo-secure-store | 15.0.8 | SecureStore adapter for Supabase auth token persistence |
| @react-native-google-signin/google-signin | 16.1.1 | Native Google Sign-In with ID token exchange |
| react-native-toast-message | 2.3.3 | User notifications (success/error/info) |
| @expo/vector-icons (Ionicons) | 15.0.3 | Icons throughout the app |
| i18n-js | 4.5.2 | EN/IT translations |

---

## Configuration Changes Required

### 1. Supabase config.toml (Local Development)

**Confidence: HIGH** -- verified via [Supabase CLI config docs](https://supabase.com/docs/guides/local-development/cli/config) and [GitHub Discussion #22214](https://github.com/orgs/supabase/discussions/22214).

Current state and required changes:

```toml
[auth]
enabled = true
site_url = "http://localhost:5173"
additional_redirect_urls = [
  "http://localhost:5173/auth/callback",
  "http://localhost:5174/auth/callback",
  "https://m-lumio.toto-castaldi.com/auth/callback",
  "lumio://auth/callback"                              # Already present
]
jwt_expiry = 3600
enable_refresh_token_rotation = true
refresh_token_reuse_interval = 10
enable_manual_linking = true   # ADD: Required for linkIdentity() API

[auth.email]
enable_signup = true            # Already true
double_confirm_changes = true   # Already true
enable_confirmations = true     # CHANGE from false -> true

# ADD: Custom email templates for OTP-based verification
[auth.email.template.confirmation]
content_path = "./templates/confirmation.html"

[auth.email.template.recovery]
content_path = "./templates/recovery.html"
```

**Why `enable_confirmations = true`:** Currently `false`, meaning any email signup gets an immediate session. For production email auth, users must verify their email first. This prevents fake signups and is standard practice.

**Why `enable_manual_linking = true`:** Required for `supabase.auth.linkIdentity()`. Without this, only automatic linking (same-email identities auto-merge) is available. Manual linking enables the Settings "Link Google account" feature.

### 2. Email Templates (OTP-based)

**Confidence: HIGH** -- verified via [Supabase Email Templates docs](https://supabase.com/docs/guides/auth/auth-email-templates).

Create `supabase/templates/` directory with OTP-based templates:

| Template | File | Key Variable |
|----------|------|-------------|
| Confirm signup | `supabase/templates/confirmation.html` | `{{ .Token }}` (6-digit OTP) |
| Password recovery | `supabase/templates/recovery.html` | `{{ .Token }}` (6-digit OTP) |

**Critical Decision: OTP vs Deep Link for email verification**

| Approach | Pros | Cons |
|----------|------|------|
| **OTP (6-digit code)** | No deep link complexity, works in every email client, user stays in app, no fragment parsing issues | User must type/paste 6 digits |
| **Deep link** | One-tap experience | URL fragment parsing issues in React Native ([GitHub #10754](https://github.com/orgs/supabase/discussions/10754)), email client compatibility varies, complex Linking setup |

**Use OTP.** The user receives a 6-digit code via email and enters it in-app. This avoids the well-documented deep link fragment parsing issues in React Native and works reliably across all email clients. The trade-off (typing 6 digits) is negligible for a one-time verification and occasional password reset.

Template example (`confirmation.html`):
```html
<h2>Confirm your Lumio account</h2>
<p>Your verification code is:</p>
<h1 style="letter-spacing: 8px; font-size: 32px;">{{ .Token }}</h1>
<p>Enter this code in the Lumio app to verify your email.</p>
<p>This code expires in 1 hour.</p>
```

### 3. Supabase Dashboard (Production)

| Setting | Location | Value |
|---------|----------|-------|
| Enable email confirmations | Auth > Providers > Email | ON |
| Enable Manual Linking | Auth > General | ON |
| Redirect URL | Auth > URL Configuration | `lumio://auth/callback` (verify present) |
| Email templates | Auth > Email Templates | Update Confirmation and Recovery templates to show OTP code |

### 4. app.json (No Changes Needed)

The `"scheme": "lumio"` is already configured. The redirect URL `lumio://auth/callback` is already in `config.toml`. No changes needed here since we are using OTP approach, not deep links.

---

## Supabase Auth API Integration Guide

### Sign Up (email + password)

```typescript
const { data, error } = await supabase.auth.signUp({
  email,
  password,
});
// With enable_confirmations=true:
//   data.user exists but data.session is NULL
//   User receives 6-digit OTP email
//   Must verify before they can sign in
```

### Verify Email (OTP after signup)

```typescript
const { data, error } = await supabase.auth.verifyOtp({
  email,
  token: otpCode,  // 6-digit code from email
  type: 'email',
});
// On success: data.session is returned, user is now logged in
```

### Sign In (email + password)

```typescript
const { data, error } = await supabase.auth.signInWithPassword({
  email,
  password,
});
// Fails if email not yet confirmed
```

### Request Password Reset

```typescript
const { data, error } = await supabase.auth.resetPasswordForEmail(email);
// Sends OTP to email via recovery template
```

### Verify Recovery OTP + Set New Password

```typescript
// Step 1: Verify the OTP
const { data, error } = await supabase.auth.verifyOtp({
  email,
  token: otpCode,
  type: 'recovery',
});
// On success: authenticated session with PASSWORD_RECOVERY event

// Step 2: Set new password (user is now authenticated)
const { data: updateData, error: updateError } = await supabase.auth.updateUser({
  password: newPassword,
});
```

### Add Password to Google-Only Account (Settings)

```typescript
// User logged in via Google, wants to add email/password
const { data, error } = await supabase.auth.updateUser({
  password: newPassword,
});
// Adds email identity to the existing Google OAuth account
// The email is already set (from Google profile)
```

### Link Google to Email-Only Account (Settings)

```typescript
// User logged in with email/password, wants to link Google
const googleResponse = await GoogleSignin.signIn();
if (googleResponse.type === 'success' && googleResponse.data.idToken) {
  // Option A: linkIdentity (if it supports native ID token)
  const { data, error } = await supabase.auth.linkIdentity({
    provider: 'google',
  });
  // Note: linkIdentity uses redirect-based PKCE flow
  // For native Android, may need alternative approach (see Open Questions)
}
```

**WARNING:** `linkIdentity()` is designed for browser-based redirect flows. For native Android with `@react-native-google-signin`, the ID token approach may not work directly with `linkIdentity()`. The fallback is to use Supabase's automatic linking behavior (same email = auto-merge) by having the user sign in with Google, which will auto-link if the emails match and `enable_confirmations` is enabled.

### Get Linked Identities (Settings display)

```typescript
const { data, error } = await supabase.auth.getUserIdentities();
// data.identities: Array<{ provider: 'google' | 'email', ... }>
// Show which auth methods are linked
```

### Unlink Identity (Settings)

```typescript
const { data, error } = await supabase.auth.unlinkIdentity(identity);
// Requires at least 2 identities linked
// Prevents user from removing their only login method
```

---

## Integration Points with Existing Code

### @lumio/core/src/supabase/auth.ts -- New Exports

Add alongside existing `signInWithGoogle`, `signOut`, `getSession`, `getCurrentUser`:

```typescript
export async function signUpWithEmail(email: string, password: string): Promise<...>
export async function signInWithEmail(email: string, password: string): Promise<...>
export async function verifyEmailOtp(email: string, token: string, type: 'email' | 'recovery'): Promise<...>
export async function requestPasswordReset(email: string): Promise<...>
export async function updatePassword(newPassword: string): Promise<...>
export async function getUserIdentities(): Promise<...>
export async function addPasswordToAccount(password: string): Promise<...>
```

### AuthContext.tsx -- Extended Interface

```typescript
export interface AuthContextType {
  user: User | null;
  session: Session | null;
  state: AuthState;
  signInWithGoogle: () => Promise<void>;          // Existing
  signInWithEmail: (email: string, password: string) => Promise<void>;     // NEW
  signUpWithEmail: (email: string, password: string) => Promise<SignUpResult>; // NEW
  verifyOtp: (email: string, token: string, type: string) => Promise<void>;   // NEW
  resetPassword: (email: string) => Promise<void>;                             // NEW
  updatePassword: (password: string) => Promise<void>;                         // NEW
  signOut: () => Promise<void>;                   // Existing
}
```

### AuthNavigator.tsx -- New Screens

```typescript
export type AuthStackParamList = {
  Login: undefined;                                // Existing
  SignUp: undefined;                               // NEW
  VerifyEmail: { email: string };                  // NEW
  ForgotPassword: undefined;                       // NEW
  ResetPassword: { email: string };                // NEW
};
```

### LoginScreen.tsx -- Layout Change

Current: Google Sign-In button only.
New layout:
1. Google Sign-In button (prominent, at top -- existing)
2. "oppure" / "or" divider (horizontal line with text)
3. Email input field
4. Password input field
5. "Login" button
6. "Forgot password?" link -> ForgotPassword screen
7. "Don't have an account? Sign up" link -> SignUp screen

### SettingsScreen.tsx -- New Section

Add "Linked Accounts" section between Account and Appearance:
- Show list of linked identities (Google icon, Email icon)
- "Link Google account" button (if only email identity)
- "Add password" button (if only Google identity)
- "Unlink" option (if 2+ identities)

---

## What NOT to Add

| Library | Why NOT | Use Instead |
|---------|---------|-------------|
| expo-auth-session | Not needed. Google Sign-In uses native SDK. Email auth uses direct API calls. | @supabase/supabase-js direct methods |
| expo-web-browser | Not needed. No browser-based OAuth flows. Google Sign-In is native. | @react-native-google-signin |
| react-native-keychain | Already using expo-secure-store for tokens. | expo-secure-store |
| formik / react-hook-form | Auth forms are simple (2-3 fields). useState is sufficient. Same pattern as all existing screens. | useState + inline validation |
| yup / zod | Email regex + password min length check. 2 validations do not need a schema library. | Inline validation functions |
| react-native-otp-input | TextInput with `keyboardType="number-pad"` and `maxLength={6}` is sufficient. One less dep. | Standard TextInput |
| @gorhom/bottom-sheet | No bottom sheets needed for auth flows. Standard screen navigation. | react-navigation stack screens |
| Additional Supabase packages | @supabase/supabase-js 2.89.0 contains everything needed. No @supabase/auth-helpers or similar. | Already installed SDK |

---

## Password Validation

No library needed. Supabase GoTrue enforces minimum password length server-side (default 6, configurable in dashboard). Client-side validation mirrors this:

```typescript
const PASSWORD_MIN_LENGTH = 6;
const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
const isValidPassword = (password: string) => password.length >= PASSWORD_MIN_LENGTH;
```

---

## i18n Additions Required

New translation keys needed (EN + IT) for:

| Screen | Estimated Keys |
|--------|---------------|
| Login (email form, divider, links) | ~8 |
| Sign Up (fields, validation, submit) | ~10 |
| Verify Email (instructions, OTP input, resend, timer) | ~8 |
| Forgot Password (instructions, email input, submit) | ~6 |
| Reset Password (OTP input, new password, confirm, submit) | ~8 |
| Settings (linked accounts, link/unlink buttons) | ~6 |
| Error messages (invalid email, weak password, email taken, wrong OTP, expired OTP, etc.) | ~10 |
| **Total** | **~56 keys** |

---

## Database Changes

No new tables needed for email auth. Supabase Auth manages identities in `auth.users` and `auth.identities` (internal schema). The existing `users` table in public schema remains unchanged.

The only DB-related work is:
- Supabase dashboard/config: Enable email confirmations + manual linking
- No new migrations needed for email auth itself

---

## Local Development Testing

Supabase local includes Inbucket (email capture) at `http://127.0.0.1:54324`. All verification and password reset emails sent locally are captured here. OTP codes can be read from Inbucket UI during development.

| Step | How to Test |
|------|-------------|
| Sign up | Submit form -> check Inbucket -> copy 6-digit code -> enter in app |
| Verify email | Enter OTP -> session created -> navigate to dashboard |
| Password reset | Request reset -> check Inbucket -> copy code -> enter new password |
| Google linking | Tap "Link Google" in Settings -> native Google Sign-In flow |

---

## Alternatives Considered

| Recommended | Alternative | Why Not |
|-------------|-------------|---------|
| OTP (6-digit code) for email verification | Deep link from email | Fragment parsing issues in RN, email client compatibility, extra Linking setup. OTP is simpler and more reliable on mobile. |
| OTP for password reset | Deep link + PASSWORD_RECOVERY event | Same deep link issues. OTP + verifyOtp + updateUser is a clean 2-step flow. |
| Manual inline validation | formik + yup | 2-3 fields per form. Library overhead unjustified. Consistent with existing codebase pattern (no form libraries used anywhere). |
| Standard TextInput for OTP | react-native-otp-input | Extra dependency for a single 6-character input. Not worth the maintenance cost. |
| `updateUser({password})` for adding password to OAuth account | Custom edge function | Supabase natively supports this. No custom backend needed. |
| Automatic linking (same email auto-merge) as fallback for Google linking | Only manual `linkIdentity()` | Automatic linking handles the common case (user signs up with email, later signs in with Google using same email). Manual linking via `linkIdentity()` is the explicit Settings action. Both work together. |

---

## Confidence Assessment

| Area | Confidence | Reason |
|------|------------|--------|
| signUp / signInWithPassword | HIGH | Official JS API docs, well-documented, standard usage |
| verifyOtp (type: email) | HIGH | Official docs, multiple Supabase examples |
| verifyOtp (type: recovery) | HIGH | Official docs, recovery flow documented |
| updateUser for password | HIGH | Official docs, standard pattern |
| enable_manual_linking config | HIGH | Verified via GitHub discussion + CLI config docs |
| OTP approach for mobile | HIGH | Official email template docs, widely used RN pattern |
| Email template content_path | HIGH | CLI config docs, content_path parameter documented |
| linkIdentity for native Google | MEDIUM | Web redirect flow documented. Native mobile ID token approach unclear for linkIdentity specifically. May need fallback to auto-linking. |
| No new npm dependencies | HIGH | All required methods verified in @supabase/supabase-js@2.89.0 |
| getUserIdentities / unlinkIdentity | HIGH | Official JS API docs |

---

## Open Questions (Flag for Phase-Specific Research)

1. **`linkIdentity()` with native Google Sign-In:** The `linkIdentity()` API is designed for browser redirect (PKCE). For native Android using `@react-native-google-signin`, this may need: (a) a redirect-based flow via WebBrowser, or (b) relying on Supabase's automatic email-based linking instead of manual `linkIdentity()`. Test both approaches during the account linking phase.

2. **Automatic linking interaction with manual linking:** When `enable_manual_linking = true`, verify that automatic linking (same-email auto-merge on signup) still functions for new users. The docs suggest both modes coexist, but confirm locally.

3. **OTP expiration and resend:** Default OTP expiration is 1 hour, resend cooldown is 60 seconds. Verify these defaults work for the UX or if they need adjustment in dashboard settings.

4. **Email deliverability in production:** Supabase uses its built-in email service for auth emails. For production, consider whether custom SMTP is needed for better deliverability and branding. This is a post-launch consideration, not a blocker.

---

## Sources

- [Supabase Auth Identity Linking Guide](https://supabase.com/docs/guides/auth/auth-identity-linking) -- HIGH confidence
- [Supabase JS auth.signUp() Reference](https://supabase.com/docs/reference/javascript/auth-signup) -- HIGH confidence
- [Supabase JS auth.signInWithPassword() Reference](https://supabase.com/docs/reference/javascript/auth-signinwithpassword) -- HIGH confidence
- [Supabase JS auth.verifyOtp() Reference](https://supabase.com/docs/reference/javascript/auth-verifyotp) -- HIGH confidence
- [Supabase JS auth.resetPasswordForEmail() Reference](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) -- HIGH confidence
- [Supabase JS auth.updateUser() Reference](https://supabase.com/docs/reference/javascript/auth-updateuser) -- HIGH confidence
- [Supabase JS auth.linkIdentity() Reference](https://supabase.com/docs/reference/javascript/auth-linkidentity) -- MEDIUM confidence
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) -- HIGH confidence
- [Supabase CLI Config Reference](https://supabase.com/docs/guides/local-development/cli/config) -- HIGH confidence
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) -- HIGH confidence
- [GitHub Discussion: Manual Linking Locally #22214](https://github.com/orgs/supabase/discussions/22214) -- HIGH confidence
- [GitHub Discussion: Deep Linking with Expo #10754](https://github.com/orgs/supabase/discussions/10754) -- HIGH confidence (informed OTP recommendation)
- Codebase analysis: `apps/android/contexts/AuthContext.tsx`, `packages/core/src/supabase/auth.ts`, `packages/core/src/supabase/client.ts`, `supabase/config.toml`, `apps/android/app.json`, `apps/android/package.json` -- verified existing setup

---

*Stack research for: Lumio v2.1 Email Auth -- email/password authentication, OTP verification, password reset, account linking*
*Researched: 2026-02-27*
