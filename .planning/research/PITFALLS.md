# Domain Pitfalls

**Domain:** Adding email/password auth, email verification, password reset, and account linking to existing Supabase + React Native app with Google OAuth
**Researched:** 2026-02-27
**Confidence:** HIGH

---

## Critical Pitfalls

### Pitfall 1: handle_new_user Trigger Assumes OAuth Metadata -- Email/Password Signup Has None

**What goes wrong:**
The existing `handle_new_user()` trigger (migration `20241230000003_auth_trigger.sql`) extracts `display_name` from `raw_user_meta_data->>'full_name'` and `avatar_url` from `raw_user_meta_data->>'avatar_url'`. These fields are populated by Google OAuth but are completely absent in email/password signups. The `COALESCE` in the trigger still evaluates to NULL for both fields. While `display_name` and `avatar_url` are nullable in `public.users`, several UI components assume they exist:
- `SettingsScreen.tsx` line 48-49: reads `user?.user_metadata?.avatar_url` and `user?.user_metadata?.full_name` directly for the account section
- `packages/core/src/supabase/auth.ts` line 57-60: constructs `AuthUser` from `user_metadata?.full_name`

The result: email-signup users see a blank account section (no name, no avatar), and the AuthUser's `displayName` is undefined everywhere it is consumed.

**Why it happens:**
Google OAuth populates `raw_user_meta_data` with profile info automatically. Email/password signup does not -- `raw_user_meta_data` contains only `{"email_verified": false}` (or nothing). The existing trigger was built when Google OAuth was the only auth method.

**Consequences:**
- Blank avatar and name in Settings (cosmetic but jarring)
- Potential null-reference errors in any code that does not guard against missing display_name
- `public.users.display_name` is NULL for email-signup users, breaking any queries that filter or sort by display_name

**Prevention:**
- Update `handle_new_user()` to fall back to the email local part (before @) when no `full_name` is available: `COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1))`
- Add the `avatar_url` fallback to use the Ionicons person-icon fallback already present in SettingsScreen (no code change needed there -- the fallback already exists)
- Allow users to pass `display_name` via signUp options.data to pre-populate: `signUp({ email, password, options: { data: { full_name: 'User Name' } } })`
- Audit all code paths that consume `displayName` or `avatar_url` and ensure they handle NULL gracefully

**Detection:**
- Create an email-signup test user and check `public.users` row -- `display_name` should be non-null
- Verify Settings screen renders correctly for email-only users

**Phase to address:**
Database migration phase (update trigger) + signup form phase (collect display name during registration).

---

### Pitfall 2: Supabase signUp with Existing Google Email Returns Obfuscated Response, Not an Error

**What goes wrong:**
When a user who already signed up via Google OAuth tries to create a new account with `signUp({ email, password })` using the same email, Supabase does NOT return an error. Instead, it returns a "fake" user object that looks like a successful signup. No verification email is sent. The app cannot distinguish between "new account created" and "email already exists" on the client side. This is an intentional Supabase security measure to prevent email enumeration attacks.

The implication: a user signs up with email/password, sees a "check your email for verification" screen, waits forever for an email that never arrives, and assumes the app is broken.

**Why it happens:**
Supabase removed the "User already registered" error message for security. When `enable_confirmations` is true (required for email verification), the obfuscated response is returned for duplicate emails. This is documented in [Supabase Discussion #7632](https://github.com/orgs/supabase/discussions/7632) and [auth-js Issue #513](https://github.com/supabase/auth-js/issues/513).

**Consequences:**
- User is stuck on "check your email" screen indefinitely
- No way to inform the user that they should use Google sign-in instead
- Support burden from confused users

**Prevention:**
- After signUp, check if the returned user object has `identities` array that is empty. An empty `identities` array indicates the email is already taken: `if (data.user && data.user.identities && data.user.identities.length === 0)` means duplicate email.
- When detecting a duplicate email, show a specific message: "An account with this email already exists. Try signing in with Google instead." or "Sign in with your existing account."
- Document this detection pattern prominently in the signup handler code with a comment explaining the Supabase behavior.

**Detection:**
- Test: sign up with Google first, then try email/password signup with same email -- the `identities` array should be empty
- Check that the "email already exists" message appears in the UI

**Phase to address:**
Signup implementation phase. The empty-identities check must be in the signUp handler from day one.

---

### Pitfall 3: Email Verification Deep Link Does Not Work on Android Without Proper Configuration

**What goes wrong:**
After email-signup, Supabase sends a verification email with a link. The link format is `https://[project-ref].supabase.co/auth/v1/verify?token_hash=...&type=signup&redirect_to=...`. The `redirect_to` parameter should open the app via deep link (e.g., `lumio://auth/callback`). But on Android, several things can break:
1. The `lumio://` custom scheme is registered in `app.json` (`"scheme": "lumio"`) but NOT registered in Supabase's `additional_redirect_urls` for production (only local config.toml has it)
2. The deep link must extract `access_token` and `refresh_token` from the URL parameters and call `supabase.auth.setSession()` -- there is zero deep link handling code in the app today
3. Android does not automatically open custom-scheme links from email clients -- the user may end up in the browser instead of the app
4. The Supabase verification link uses the project's site_url as default redirect, which is `http://localhost:5173` in config.toml -- wrong for production

**Why it happens:**
Google OAuth in the current app uses `signInWithIdToken` (native SDK) which never involves browser redirects or deep links. The entire redirect/deep-link infrastructure was never needed or built. Email verification is fundamentally different -- it requires the user to click a link in another app (email client) and return to the app.

**Consequences:**
- User clicks verification link, ends up in browser showing error or blank page
- Verification succeeds on the server side but the app does not know about it
- User must manually go back to app and try to log in (confusing UX)
- If redirect URL is not in the allowed list, Supabase rejects the redirect entirely

**Prevention:**
- **Use OTP (6-digit code) instead of link-based verification.** This avoids deep linking entirely. Supabase supports OTP verification via `verifyOtp({ email, token, type: 'signup' })`. The user stays in the app, enters the code from their email, done. This is the recommended approach for mobile apps.
- If using links: configure `additional_redirect_urls` in Supabase Dashboard (production) to include `lumio://auth/callback`. Add deep link handling in the app using `expo-linking`. Create a `createSessionFromUrl` handler.
- For password reset: same choice -- OTP (enter code + new password in-app) vs deep link (redirect back to app). OTP is strongly recommended for mobile.
- Update Supabase email templates to show the OTP token (not just a link) for mobile-friendly UX.

**Detection:**
- Test email verification flow on a real Android device (not emulator -- email client behavior differs)
- Verify the redirect URL is in the allowed list in Supabase Dashboard

**Phase to address:**
This is the most critical architectural decision for the milestone. Must be decided BEFORE any implementation. OTP-based flow should be the default choice for this mobile-only app.

---

### Pitfall 4: Password Reset Flow Requires Deep Link or OTP -- Neither Exists Today

**What goes wrong:**
`resetPasswordForEmail(email)` sends a password reset email. The email contains a link with a token that establishes a session in "recovery" mode. The `onAuthStateChange` listener fires a `PASSWORD_RECOVERY` event. The app must then show a "set new password" form and call `updateUser({ password })`. But:
1. The `PASSWORD_RECOVERY` event fires AFTER a `SIGNED_IN` event, which the current `AuthContext` interprets as "user is logged in" and navigates to the main app -- the password reset form never appears
2. Without deep link handling (see Pitfall 3), the user cannot get back to the app from the reset email link
3. The current `onAuthStateChange` handler in `AuthContext.tsx` does not distinguish between `SIGNED_IN`, `PASSWORD_RECOVERY`, `TOKEN_REFRESHED`, or any other events -- it treats all of them as "set session, navigate to main"

**Why it happens:**
The `onAuthStateChange` handler was designed for a single auth method (Google OAuth) where the only relevant events are `SIGNED_IN` and `SIGNED_OUT`. Password recovery introduces a new event type that requires different handling.

**Consequences:**
- User clicks reset link, gets signed in to main app but never sees password reset form
- Password remains unchanged
- User is confused and locked out of their account

**Prevention:**
- **OTP approach (recommended):** Use `resetPasswordForEmail(email)` with a custom email template showing the OTP token. User enters the OTP in-app via `verifyOtp({ email, token, type: 'recovery' })`. On success, show password reset form and call `updateUser({ password })`. No deep link needed.
- **Link approach (if needed):** Update `onAuthStateChange` to check the `_event` parameter. When `_event === 'PASSWORD_RECOVERY'`, set a state flag (e.g., `needsPasswordReset: true`) and navigate to a password reset screen instead of the main app. Handle the event ordering: `SIGNED_IN` fires first, then `PASSWORD_RECOVERY` -- the handler must wait for or prioritize the recovery event.

**Detection:**
- Test full password reset flow end-to-end: request reset, receive email, complete reset, verify new password works
- Check that `onAuthStateChange` correctly routes `PASSWORD_RECOVERY` events

**Phase to address:**
AuthContext refactoring phase. The `onAuthStateChange` handler must be updated to handle multiple event types before password reset is implemented.

---

### Pitfall 5: Account Linking (Email + Google on Same Account) Has Multiple Failure Modes

**What goes wrong:**
The milestone requires linking Google OAuth and email/password identities on the same account. Supabase supports this via `linkIdentity()` and automatic linking. But several scenarios cause problems:

**Scenario A -- Existing Google user adds email/password:**
User is logged in via Google. They want to add a password. The correct approach is `updateUser({ password: 'newpassword' })` which adds an email identity. But the user must also verify their email identity. If the user's Google email is already confirmed, does adding a password auto-confirm the email identity? Supabase behavior: yes, since the email matches the confirmed Google identity, the email identity is auto-confirmed.

**Scenario B -- Existing Google user tries signUp with same email:**
This hits Pitfall 2 (obfuscated response). The user should NOT be using `signUp` -- they should be using `updateUser` from an authenticated session. But if the UI lets them reach the signup form, they will try.

**Scenario C -- New email user later links Google:**
User signs up with email/password. Later they want to add Google sign-in. They call `linkIdentity({ provider: 'google' })`. This opens a browser-based OAuth flow (NOT the native Google Sign-In SDK). The `@react-native-google-signin/google-signin` library used in the app is bypassed entirely. The user may see a different Google sign-in UI (browser vs native) which is confusing.

**Scenario D -- Unlinking the last identity:**
User has both Google and email/password. They try to unlink Google. `unlinkIdentity()` requires at least 2 identities to remain. But what if the user's email identity is unconfirmed? They could end up with only an unconfirmed email identity and be unable to log in.

**Why it happens:**
Account linking is one of the most complex auth features. Supabase's automatic linking simplifies the happy path but the edge cases are numerous.

**Consequences:**
- Confused UI states (link button appears when it should not)
- User gets locked out after unlinking their only confirmed identity
- Different Google sign-in experiences (native vs browser) in the same app

**Prevention:**
- For Scenario A (Google user adds password): use `updateUser({ password })` only when the user is authenticated. Do not expose a "link email" flow -- just a "set password" form in Settings.
- For Scenario B: handle in signup form (see Pitfall 2 prevention).
- For Scenario C (email user adds Google): use `linkIdentity()` but test the browser-based flow thoroughly. Consider whether to show "Link Google Account" only for email-only users.
- For Scenario D: before allowing `unlinkIdentity()`, check `user.identities.length > 1` AND that the remaining identity is confirmed. Simpler approach: do not allow unlinking in v2.1 -- only allow adding identities.
- **Simplest viable approach:** Do NOT implement full bidirectional linking in v2.1. Instead: (1) Google users can add a password via Settings, (2) email users can link Google via Settings, (3) no unlinking. Defer unlinking to a future milestone.

**Detection:**
- Test every combination: Google-first + add password, email-first + link Google, both + try unlink
- Check `user.identities` after each operation to verify the expected identities exist

**Phase to address:**
Settings/account linking phase. Must be the LAST phase in the milestone after login/signup/verification/reset are solid.

---

### Pitfall 6: SecureStore 2048-Byte Limit May Truncate Tokens for Email+Google Users

**What goes wrong:**
The current app uses `expo-secure-store` (via `SecureStoreAdapter` in `lib/supabase.ts`) to persist Supabase auth tokens. SecureStore has a hard 2048-byte limit per key on Android. When a user has multiple linked identities (Google + email), the session JWT grows because it contains claims from both providers. Google OAuth alone can produce JWTs close to 2000 bytes (profile data, scopes). Adding email identity metadata pushes it over the limit. SecureStore silently fails or throws, causing the session to not persist -- the user gets logged out on every app restart.

**Why it happens:**
Supabase's JWT includes `user_metadata` from all linked identities. Google provides `full_name`, `avatar_url`, `email_verified`, `iss`, `sub`, and more. Email/password adds its own metadata. The combined size exceeds SecureStore's Android Keystore limit.

**Consequences:**
- Session not persisted -- user logs out every time app restarts
- Error is silent or appears as a generic "SecureStore write failed" log
- Only affects users with multiple linked identities (the account linking feature itself triggers the bug)

**Prevention:**
- Test with a real Google+email dual-identity user and measure the JWT size before shipping
- If JWT exceeds 2048 bytes: switch to `expo-secure-store` + MMKV pattern. Generate an encryption key with `expo-crypto`, store it in SecureStore (small, fits in 2048 bytes), use MMKV for the actual session data encrypted with that key
- Alternative: use `aes-256-gcm` encryption with a SecureStore-stored key and AsyncStorage for the encrypted payload
- The existing Supabase setup in `lib/supabase.ts` passes `storage: SecureStoreAdapter` to createSupabaseClient. This adapter must be updated if the limit is hit.
- **Immediate mitigation:** test the current JWT size for a Google-only user. If it is already close to 2048 bytes, this must be fixed in the foundation phase of this milestone, not deferred.

**Detection:**
- `console.log(JSON.stringify(session).length)` after login -- if over ~1800 bytes, you are at risk
- Test: link Google + email identity, restart app, check if session persists

**Phase to address:**
Foundation phase (before any auth changes). Measure current JWT size. If over 1500 bytes, implement MMKV+SecureStore pattern first.

---

## Moderate Pitfalls

### Pitfall 7: Supabase config.toml enable_confirmations Is False -- Production Must Enable It

**What goes wrong:**
The current `config.toml` has `enable_confirmations = false` (line 47). This means email verification is disabled for local development. But production Supabase projects have email verification enabled by default. If the app is developed and tested with confirmations disabled, the signup flow will behave differently in production:
- Local: signUp immediately creates a confirmed user, session is returned
- Production: signUp creates an unconfirmed user, no session is returned, user must verify email first

The app works perfectly in local development but breaks in production.

**Why it happens:**
The config.toml was set up when Google OAuth was the only auth method. OAuth users are pre-confirmed by the provider. Email verification was irrelevant. Now that email/password is being added, the local config must match production behavior.

**Prevention:**
- Set `enable_confirmations = true` in `config.toml` for local development
- Use the local Inbucket email service (already running on port 54324) to receive verification emails during development
- Test the full signup-verify-login flow locally before deploying
- Remember: Supabase's built-in SMTP has a rate limit of 2 emails/hour in production. For production, configure a custom SMTP provider (Resend, Postmark, SendGrid, etc.) via Supabase Dashboard.

**Detection:**
- Compare config.toml setting with production Dashboard auth settings
- Test signup flow with `enable_confirmations = true` locally

**Phase to address:**
Foundation/configuration phase. Change config.toml before any email auth development starts.

---

### Pitfall 8: signOut Must Clear Google Sign-In State Even for Email-Only Users

**What goes wrong:**
The current `signOut` handler in `AuthContext.tsx` (line 126-131) calls `GoogleSignin.signOut()` before `supabase.auth.signOut()`. If the user signed in with email/password (not Google), `GoogleSignin.signOut()` throws an error because there is no Google session to sign out of. This crashes the signOut flow, and the user remains logged in.

**Why it happens:**
The signOut handler was written assuming Google OAuth is the only auth method. It unconditionally calls the Google SDK's signOut.

**Consequences:**
- Email-only users cannot log out
- Crash or unhandled promise rejection

**Prevention:**
- Wrap `GoogleSignin.signOut()` in a try-catch that silently ignores "not signed in" errors
- Or: check if the user has a Google identity before calling Google signOut: `const hasGoogle = user?.app_metadata?.providers?.includes('google')`
- Better: check `GoogleSignin.getCurrentUser()` -- if null, skip Google signOut

**Detection:**
- Test: sign in with email/password, then tap logout -- should not crash

**Phase to address:**
AuthContext refactoring phase. Must be updated when adding email/password signIn method.

---

### Pitfall 9: AuthContext Interface Must Expose New Methods Without Breaking Existing Consumers

**What goes wrong:**
The current `AuthContextType` interface exposes `signInWithGoogle` and `signOut`. Adding email auth requires `signInWithEmail`, `signUpWithEmail`, `resetPassword`, and potentially `verifyOtp`. If these are added naively, every consumer of `useAuth()` (LoginScreen, SettingsScreen, AppNavigator) needs updating. Worse: if the interface is changed mid-development, TypeScript errors cascade across the codebase.

**Why it happens:**
The AuthContext was designed as a thin wrapper around Google OAuth. Adding multiple auth methods requires a richer interface.

**Prevention:**
- Add new methods incrementally: `signInWithEmail(email, password)`, `signUpWithEmail(email, password, displayName?)`, `resetPassword(email)`, `verifyOtp(email, token, type)`
- Keep the existing `signInWithGoogle` method unchanged -- no breaking changes for existing consumers
- Type the new methods as optional initially if needed: `signInWithEmail?: (email: string, password: string) => Promise<void>` -- but this forces null-checks at call sites. Better: add them as required from the start since they will be needed immediately.
- The `AuthState` type ('loading' | 'logged_out' | 'ready') needs a new state: `'pending_verification'` for users who signed up but have not verified their email. Without this, unverified users either see the login screen (confusing) or the main app (skipping verification).

**Detection:**
- Run TypeScript check (`pnpm typecheck`) after each AuthContext change
- Verify all screens that use `useAuth()` still compile

**Phase to address:**
AuthContext refactoring phase. Must be the first implementation phase.

---

### Pitfall 10: Email Template Customization Required for OTP-Based Flow

**What goes wrong:**
The default Supabase email templates send a clickable link for verification and password reset. For an OTP-based mobile flow, the email must display a 6-digit code prominently. If the developer uses `verifyOtp()` on the client but does not customize the email template, the user receives an email with a link (not a code) and does not know what to enter in the OTP input field.

**Why it happens:**
Supabase's default email templates are designed for web apps that use link-based verification. Mobile apps using OTP need customized templates that show `{{ .Token }}` instead of (or in addition to) `{{ .ConfirmationURL }}`.

**Prevention:**
- Customize the following email templates in Supabase Dashboard (production) and in `supabase/templates/` (local):
  - **Confirm signup:** Show OTP code `{{ .Token }}` with text "Enter this code in the app: {{ .Token }}"
  - **Reset password:** Show OTP code `{{ .Token }}` with text "Enter this code to reset your password: {{ .Token }}"
  - **Email change:** Show OTP code `{{ .Token }}` for both old and new email
- For local development, create template files in `supabase/templates/` directory (Supabase CLI supports custom templates via config.toml `[auth.email]` section)
- Keep the clickable link as a fallback for users who open the email on desktop

**Detection:**
- Send a test verification email (via Inbucket locally) and verify the OTP code is visible
- Verify the OTP code from the email matches what `verifyOtp()` accepts

**Phase to address:**
Configuration phase, immediately after enabling email confirmations.

---

## Minor Pitfalls

### Pitfall 11: Login Screen Layout Needs Restructuring for Dual Auth Methods

**What goes wrong:**
The current `LoginScreen.tsx` centers a single Google Sign-In button. Adding email/password form fields (email input, password input, submit button, "forgot password" link, "sign up" link, separator "or") to this screen creates a crowded layout. The vertical centering that works for a single button breaks with a form.

**Prevention:**
- Use Google button prominently at top (existing user expectation), then a separator ("or"/"oppure"), then email form below
- Use `KeyboardAvoidingView` to handle keyboard overlap on the login form
- Consider a tab or toggle between "Sign In" and "Sign Up" rather than cramming both on one screen
- The `AuthNavigator` currently has only `Login` screen. Add `SignUp`, `ForgotPassword`, and `VerifyEmail` screens to the auth stack.

**Phase to address:**
UI implementation phase.

---

### Pitfall 12: Password Strength Validation Not Enforced by Supabase by Default

**What goes wrong:**
Supabase's `signUp` accepts any password with minimum 6 characters. There is no built-in strength validation. Users can set passwords like "123456" or "password". This is both a security risk and a UX problem (weak passwords lead to account compromise or forgotten passwords).

**Prevention:**
- Add client-side password validation: minimum 8 characters, at least one uppercase, one lowercase, one number
- Show real-time strength indicator during signup
- Supabase does not enforce password complexity server-side -- client validation is the only defense
- Do NOT over-engineer: avoid requiring symbols or very long passwords. Balance security with usability for a flashcard app.

**Phase to address:**
Signup form implementation phase.

---

### Pitfall 13: SMTP Rate Limits in Production

**What goes wrong:**
Supabase's built-in SMTP service is rate-limited to approximately 2-4 emails per hour in production. During testing or if multiple users sign up simultaneously, verification emails are silently dropped. The user never receives the email and cannot verify their account.

**Prevention:**
- Configure a custom SMTP provider (Resend, Postmark, SendGrid) in Supabase Dashboard before launching email auth
- For a small user base (single developer's app), the built-in SMTP may suffice initially, but monitor delivery
- Add a "Resend verification email" button with rate limiting (60-second cooldown) in the UI

**Phase to address:**
Production configuration phase (can be deferred to deployment, but must be done before public release).

---

## Phase-Specific Warnings

| Phase Topic | Likely Pitfall | Mitigation |
|-------------|---------------|------------|
| Config/foundation | config.toml has `enable_confirmations = false` | Set to `true`, test with Inbucket |
| Config/foundation | SecureStore 2048-byte limit | Measure JWT size before adding email identity |
| Config/foundation | Production site_url and redirect_urls not set | Configure in Supabase Dashboard |
| Database migration | handle_new_user trigger assumes OAuth metadata | Update trigger to handle NULL metadata gracefully |
| AuthContext refactor | signOut crashes for email-only users | Wrap GoogleSignin.signOut in try-catch |
| AuthContext refactor | onAuthStateChange does not handle PASSWORD_RECOVERY | Check event type, add recovery flow routing |
| Signup implementation | Duplicate email returns obfuscated response | Check empty identities array to detect duplicates |
| Signup implementation | No password strength validation | Add client-side validation |
| Email verification | Deep links do not work on Android without setup | Use OTP-based verification instead of links |
| Password reset | PASSWORD_RECOVERY event masked by SIGNED_IN event | Use OTP-based reset flow instead of deep links |
| Account linking | Multiple failure modes for link/unlink | Defer unlinking, start with add-only |
| Account linking | linkIdentity uses browser OAuth, not native SDK | Test and document the different UX |
| Email templates | Default templates show links, not OTP codes | Customize templates for mobile OTP flow |
| Settings UI | Google-only avatar/name not available for email users | Show fallback icon, email-derived name |

---

## "Looks Done But Isn't" Checklist

- [ ] **Signup works:** Test with a brand new email -- check that verification email arrives (local: check Inbucket at port 54324)
- [ ] **Duplicate email detected:** Test signUp with an existing Google email -- check that the app shows "account exists" message, not a fake success
- [ ] **Email verification completes:** Test OTP entry -- check that user transitions from unverified to verified state
- [ ] **Password reset works end-to-end:** Request reset, receive email, enter OTP, set new password, log in with new password
- [ ] **Google sign-in still works:** After all changes, verify that existing Google OAuth flow is unchanged
- [ ] **Sign out works for both auth types:** Email-only user can log out without crash; Google user can log out
- [ ] **Session persists after app restart:** For email user, for Google user, and for dual-identity user
- [ ] **handle_new_user trigger works for email signup:** Check `public.users` row has non-null display_name
- [ ] **Settings shows correct account info:** Email-only user sees email and fallback avatar; Google user sees name and Google avatar; dual-identity user sees Google profile
- [ ] **config.toml matches production:** `enable_confirmations = true`, redirect URLs include `lumio://auth/callback`

---

## Recovery Strategies

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| handle_new_user trigger fails for email signup | MEDIUM | Write migration to update trigger; backfill NULL display_names from email |
| User stuck on verification screen (email never sent) | LOW | Add "Resend" button; check SMTP config; check Supabase email rate limits |
| signOut crash for email users | LOW | Hotfix: wrap GoogleSignin.signOut in try-catch |
| SecureStore overflow with dual identity | HIGH | Requires storage adapter migration to MMKV; all users must re-login |
| Wrong event handling in onAuthStateChange | MEDIUM | Update AuthContext; no data loss but users cannot reset password until fixed |
| Obfuscated signup response not detected | LOW | Add identities-check logic; no data corruption, just UX confusion |
| Email templates not customized for OTP | LOW | Update templates in Supabase Dashboard; re-send verification emails |

---

## Sources

- Direct inspection: `supabase/migrations/20241230000003_auth_trigger.sql` -- handle_new_user trigger extracting OAuth metadata (PRIMARY)
- Direct inspection: `apps/android/contexts/AuthContext.tsx` -- signOut calls GoogleSignin.signOut unconditionally (PRIMARY)
- Direct inspection: `apps/android/lib/supabase.ts` -- SecureStoreAdapter for session storage (PRIMARY)
- Direct inspection: `supabase/config.toml` -- enable_confirmations = false, redirect URLs (PRIMARY)
- Direct inspection: `apps/android/screens/LoginScreen.tsx` -- single Google button layout (PRIMARY)
- Direct inspection: `apps/android/screens/SettingsScreen.tsx` -- avatar_url and full_name from user_metadata (PRIMARY)
- Direct inspection: `apps/android/app.json` -- scheme: "lumio" configured (PRIMARY)
- [Supabase Identity Linking docs](https://supabase.com/docs/guides/auth/auth-identity-linking) -- automatic linking, manual linking, linkIdentity/unlinkIdentity APIs -- HIGH confidence
- [Supabase Password-based Auth docs](https://supabase.com/docs/guides/auth/passwords) -- signUp, resetPasswordForEmail, updateUser flows -- HIGH confidence
- [Supabase Native Mobile Deep Linking docs](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) -- deep link setup for Expo, createSessionFromUrl pattern -- HIGH confidence
- [Supabase verifyOtp API Reference](https://supabase.com/docs/reference/javascript/auth-verifyotp) -- OTP types: signup, recovery, email_change -- HIGH confidence
- [Supabase Discussion #7632](https://github.com/orgs/supabase/discussions/7632) -- signUp duplicate email obfuscated response behavior -- HIGH confidence
- [Supabase auth-js Issue #513](https://github.com/supabase/auth-js/issues/513) -- signUp not returning error on duplicate email -- HIGH confidence
- [Supabase Discussion #14306](https://github.com/orgs/supabase/discussions/14306) -- SecureStore 2048-byte limit with OAuth JWT tokens -- HIGH confidence
- [Supabase Custom SMTP docs](https://supabase.com/docs/guides/auth/auth-smtp) -- SMTP setup, rate limits, link tracking issues -- HIGH confidence
- [Token-based password reset for mobile](https://dev.to/tanmay_kaushik_/why-i-ditched-deep-linking-for-a-token-based-password-reset-in-supabase-3e69) -- OTP approach for mobile apps, avoiding deep link complexity -- MEDIUM confidence
- [Supabase Discussion #12324](https://github.com/orgs/supabase/discussions/12324) -- password reset with React Native and Supabase auth flow -- MEDIUM confidence
- [Supabase onAuthStateChange docs](https://supabase.com/docs/reference/javascript/auth-onauthstatechange) -- PASSWORD_RECOVERY event fires after SIGNED_IN -- HIGH confidence
- [Supabase auth Issue #1645](https://github.com/supabase/auth/issues/1645) -- linkIdentity does not work natively in React Native (uses browser flow) -- HIGH confidence

---
*Pitfalls research for: Lumio v2.1 -- Adding email/password auth with account linking to existing Google OAuth app*
*Researched: 2026-02-27*
