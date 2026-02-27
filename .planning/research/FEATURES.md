# Feature Landscape

**Domain:** Email/password authentication with account linking for React Native/Expo Android app
**Researched:** 2026-02-27
**Existing auth:** Google OAuth via @react-native-google-signin + Supabase signInWithIdToken

## Table Stakes

Features users expect. Missing = product feels incomplete.

| Feature | Why Expected | Complexity | Dependencies on Existing |
|---------|--------------|------------|--------------------------|
| Email + password signup | Standard alternative to social login; users who distrust OAuth or lack Google accounts need this | Medium | Supabase `signUp({ email, password })`. New SignupScreen. Requires `auth.email.enable_confirmations = true` in config.toml (currently `false`). |
| Email + password login | Complement to signup; returning users must be able to sign in | Low | `signInWithPassword({ email, password })`. Modify existing LoginScreen to add email form below Google button with "or"/"oppure" separator (per PROJECT.md requirement). |
| Email verification after signup (OTP) | Prevents fake account spam; required for secure identity linking | Medium | Supabase `verifyOtp({ email, token, type: 'email' })`. New VerifyEmailScreen. Custom email template using `{{ .Token }}` instead of `{{ .ConfirmationURL }}` to send 6-digit OTP code instead of deep link. |
| Password reset via email (OTP) | 75% of users who start reset flows drop off; must be frictionless | Medium | `resetPasswordForEmail()` sends recovery code. Custom recovery template with `{{ .Token }}`. New ForgotPasswordScreen + ResetPasswordScreen. User enters OTP + new password in-app. |
| Password visibility toggle | Users expect show/hide on password fields; removing "confirm password" + adding toggle increases conversion 56% | Low | Single password field + eye icon toggle using Ionicons (already installed). No "confirm password" field. |
| Form validation with inline errors | Users expect immediate feedback on invalid email format, weak password | Low | Client-side validation before API call. Inline error text near fields. Supabase minimum password: 6 characters. |
| Loading states during auth operations | Network calls take time; spinners prevent double-taps | Low | Already have this pattern in LoginScreen for Google sign-in. Replicate for email auth. |
| Bilingual auth strings (IT/EN) | App is already bilingual; new screens must match | Low | Add ~30 new i18n keys to en.ts and it.ts. |

## Differentiators

Features that set product apart. Not expected, but valued.

| Feature | Value Proposition | Complexity | Dependencies on Existing |
|---------|-------------------|------------|--------------------------|
| Account linking: add Google to email account | Users who signed up with email can later connect Google for faster login | Medium | Supabase `linkIdentity({ provider: 'google', token: idToken })` uses same native Google Sign-In SDK already installed. Requires `auth.enable_manual_linking = true` in config.toml. New section in SettingsScreen. |
| Account linking: add password to Google account | Google OAuth users can add email+password as fallback auth method | Low | Supabase `updateUser({ password })` adds email identity to existing OAuth account. No email verification needed since Google already verified the email. New "Set password" option in SettingsScreen. |
| Visual account identities in Settings | Show which auth methods are connected (Google checkmark, email checkmark) | Low | `getUserIdentities()` to list linked providers. New "Connected Accounts" section in SettingsScreen. |
| Unlink identity | Users can remove a linked auth method if they have 2+ methods | Low | `unlinkIdentity(identity)`. Supabase enforces minimum 1 identity. Show "Disconnect" only when 2+ identities exist. |
| Auto-login after email verification | After confirming email OTP, immediately create session instead of forcing re-login | Low | `verifyOtp()` returns a session. Navigate directly to Dashboard via AuthContext state change. |
| Auto-login after password reset | After setting new password, keep user logged in | Low | `updateUser({ password })` on active recovery session. User stays authenticated. |
| Pre-filled email on password reset | Carry email from login screen to forgot password screen | Low | Pass email as navigation param from LoginScreen to ForgotPasswordScreen. |
| Resend verification/reset email | Users who don't receive email need retry with cooldown | Low | `resend({ type: 'signup', email })` with 60s cooldown matching Supabase `max_frequency`. Visual countdown timer. |

## Anti-Features

Features to explicitly NOT build.

| Anti-Feature | Why Avoid | What to Do Instead |
|--------------|-----------|-------------------|
| Phone/SMS authentication | Requires SMS provider (Twilio/MessageBird), recurring cost, phone recycling security risks, overkill for a study app | Email-only authentication |
| Magic link login (passwordless email) | Adds third auth method creating confusion; deep link handling unreliable on Android; OTP is simpler | Use email+password with OTP verification |
| Social providers beyond Google (Apple, GitHub, Facebook) | Android-only app; each provider adds OAuth config complexity; Google covers social login use case | Keep Google as sole social provider |
| Biometric authentication (fingerprint/face) | Requires native module, additional native rebuild; SecureStore already persists session across app restarts | Rely on persistent sessions via SecureStore |
| Multi-factor authentication (TOTP/SMS 2FA) | Over-engineering for a flashcard study app; Supabase MFA adds significant UI complexity (QR code enrollment, recovery codes) | Single-factor auth is sufficient |
| Username-based login (no email) | Cannot do email verification or password reset without email; violates Supabase auth model | Always require email |
| "Confirm password" field on signup/reset | Studies show removing it + adding show/hide toggle increases conversions 56%; reduces form friction | Show/hide password toggle instead |
| Email enumeration protection bypass | Supabase returns obfuscated responses when email already exists (security feature); don't try to give specific "email already registered" messages | Show generic "Check your email" message for all signup attempts |
| Deep link-based email verification | Deep links on Android are inconsistent, fail in some email clients, require intent filter configuration | Use 6-digit OTP code entry in-app |
| Deep link-based password reset | Same deep link reliability issues; user leaves app, clicks link, may not return correctly | Use 6-digit OTP code entry in-app for recovery token |
| Custom SMTP for local dev | Supabase local already has Inbucket (port 54324) for email capture; no need for external SMTP | Use Inbucket for local testing; configure production SMTP in Supabase dashboard |
| Password strength meter (animated bar) | Over-engineering; clear requirements text + inline validation is sufficient | Show password requirements as text with real-time validation checkmark |
| Change password screen (standalone) | Low priority; users can use "forgot password" as workaround. Adds another screen and UX flow. | Defer. "Forgot password" flow works as reset mechanism. |

## Feature Dependencies

```
Email+password signup --> Email verification (OTP) --> Auto-login after verification
                                                   --> Dashboard access

Email+password login --> Dashboard access
                    --> "Forgot password?" link

Forgot password --> Recovery OTP email --> Enter OTP + new password --> Auto-login

Google OAuth login (existing) --> Dashboard access (unchanged)

Account linking: add Google --> Requires active email+password session
                             --> Requires @react-native-google-signin (already installed)
                             --> Requires auth.enable_manual_linking = true

Account linking: add password --> Requires active Google OAuth session
                               --> updateUser({ password }) call

Unlink identity --> Requires 2+ linked identities (enforced by Supabase)

Resend email --> Requires knowing which email was used (state from signup/reset flow)
             --> 60s cooldown (Supabase max_frequency)
```

## Login Screen Layout

Per PROJECT.md: "Google OAuth prominente in alto, form email sotto separatore 'oppure'":

```
+----------------------------------+
|         [Lumio Logo]             |
|           Lumio                  |
|  "Your flashcards, supercharged" |
|                                  |
|  [G] Sign in with Google         |  <-- Primary, prominent (existing)
|                                  |
|  ---------- or ----------        |  <-- "oppure" in IT
|                                  |
|  [Email field                 ]  |
|  [Password field         [eye]]  |
|                                  |
|  [      Sign In              ]   |  <-- Primary button
|                                  |
|  Forgot password?    No account? |
|                      Sign up     |
|                                  |
|  {Error message if any}          |
+----------------------------------+
```

## Signup Screen Layout

```
+----------------------------------+
|  <-- Back                        |
|                                  |
|        Create Account            |
|                                  |
|  [Email field                 ]  |
|  [Password field         [eye]]  |
|                                  |
|  At least 6 characters  [check]  |
|                                  |
|  [     Create Account        ]   |
|                                  |
|  Already have an account?        |
|  Sign in                         |
|                                  |
|  {Error message if any}          |
+----------------------------------+
```

## Email Verification Screen (OTP)

```
+----------------------------------+
|  <-- Back                        |
|                                  |
|     Verify Your Email            |
|                                  |
|  We sent a 6-digit code to      |
|  user@example.com                |
|                                  |
|  [  _  _  _  _  _  _  ]         |  <-- 6-digit OTP input
|                                  |
|  [      Verify              ]    |
|                                  |
|  Didn't receive the email?       |
|  Resend (available in 45s)       |  <-- Cooldown timer
|                                  |
|  {Error message if any}          |
+----------------------------------+
```

## Password Reset Flow (2 screens)

**Screen 1: Request Reset**
```
+----------------------------------+
|  <-- Back                        |
|                                  |
|     Reset Password               |
|                                  |
|  Enter your email and we'll      |
|  send you a reset code.          |
|                                  |
|  [Email field                 ]  |  <-- Pre-filled if from login
|                                  |
|  [     Send Reset Code       ]   |
|                                  |
|  {Error/success message}         |
+----------------------------------+
```

**Screen 2: Enter Code + New Password**
```
+----------------------------------+
|  <-- Back                        |
|                                  |
|     New Password                 |
|                                  |
|  Enter the code sent to          |
|  user@example.com                |
|                                  |
|  [  _  _  _  _  _  _  ]         |  <-- 6-digit OTP
|  [New password field     [eye]]  |
|                                  |
|  [    Reset Password         ]   |
|                                  |
|  Didn't receive the code?        |
|  Resend                          |
|                                  |
|  {Error message if any}          |
+----------------------------------+
```

## Account Linking in Settings

New section added to existing SettingsScreen (between ACCOUNT and APPEARANCE):

```
+----------------------------------+
|  ACCOUNT                         |
|  +----------------------------+  |
|  | [Avatar]  Display Name     |  |
|  |           user@email.com   |  |
|  +----------------------------+  |
|                                  |
|  CONNECTED ACCOUNTS              |
|  +----------------------------+  |
|  | [G] Google    [Connected]  |  |  <-- "Disconnect" if 2+ identities
|  | [E] Email     [Set up]     |  |  <-- Tapping opens password setup
|  +----------------------------+  |
|                                  |
|  APPEARANCE                      |
|  ...existing settings...         |
+----------------------------------+
```

## Edge Cases and Behavioral Expectations

### Automatic Identity Linking (Supabase built-in)
- User signs up with email+password, verifies email, then later signs in with Google using same email: Supabase automatically links both identities to one account. All data (repos, study history, SRS schedule) preserved.
- User signs in with Google first, then tries to sign up with email+password using same email: Supabase returns obfuscated response (no verification email sent) to prevent user enumeration. Correct path: sign in with Google, then add password via `updateUser()` from Settings.
- Automatic linking only works when the email identity is verified. Unverified email identities are removed when a new identity can be linked.

### Session and Token Handling
- Email+password sessions use the same JWT/refresh token mechanism as Google OAuth -- no changes needed to SecureStore adapter or token refresh logic in AuthContext.
- `onAuthStateChange` fires for all auth events (SIGNED_IN, SIGNED_UP, TOKEN_REFRESHED, PASSWORD_RECOVERY) -- existing AuthContext listener handles all cases.
- The `PASSWORD_RECOVERY` event fires when a user arrives via recovery flow. Must detect this to show the new password form.

### Password Requirements
- Supabase default minimum: 6 characters. No uppercase/number/symbol requirements by default.
- Client-side validation should enforce the same minimum before API call to avoid unnecessary network requests.

### OTP Specifics
- Default OTP length: 6 digits (configurable 6-10 in config.toml via `otp_length`).
- Default OTP expiry: 3600 seconds (1 hour).
- Rate limit: 1 email per 60 seconds (`max_frequency: "1m"`).
- Each OTP is single-use; entering it verifies and consumes the token.
- For signup verification: use `verifyOtp({ email, token, type: 'email' })`.
- For password recovery: use `verifyOtp({ email, token, type: 'recovery' })`.

### Error Scenarios
- **Wrong password on login:** Supabase returns `"Invalid login credentials"`. Display generic error, don't clear email field.
- **Unverified email on login:** With `enable_confirmations = true`, login returns error until email is verified. Show "Please verify your email" with resend option.
- **Expired OTP:** Returns verification error. Show "Code expired, please request a new one" with resend button.
- **Email already registered (signup):** Obfuscated response, no error exposed. Show generic "If this email is registered, you'll receive a verification code."
- **Weak password:** Supabase returns error if < 6 chars. Client-side validation prevents this.
- **Rate limited (too many emails):** Supabase returns 429. Show "Please wait before requesting another email."
- **User tries to unlink only identity:** Supabase returns error. UI should hide Disconnect button when only 1 identity exists.

### Display Name and Avatar After Email Signup
- Google OAuth provides `full_name` and `avatar_url` in user_metadata. Email signup does NOT.
- SettingsScreen and Dashboard already handle missing avatar (fallback icon exists at line 99-103 of SettingsScreen).
- Display name defaults to null for email users. Consider showing email as display name when `full_name` is missing (already handled: line 109-111 shows email).
- When email user later links Google, user_metadata updates with Google profile data.

## Supabase Config Changes Required

| Setting | Current Value | New Value | Why |
|---------|--------------|-----------|-----|
| `auth.email.enable_confirmations` | `false` | `true` | Required for email verification flow |
| `auth.enable_manual_linking` | not set (`false`) | `true` | Required for linkIdentity/unlinkIdentity APIs |
| Email confirmation template | default (uses ConfirmationURL) | Custom with `{{ .Token }}` | Send 6-digit OTP code instead of deep link |
| Email recovery template | default (uses ConfirmationURL) | Custom with `{{ .Token }}` | Send 6-digit OTP code for password reset |

Production Supabase project requires matching changes in the dashboard:
- Auth > Providers > Email: enable confirmations
- Auth > Email Templates: confirmation and recovery templates with `{{ .Token }}`
- Auth > General: enable manual identity linking

## New Screens Required

| Screen | Navigation Route | Purpose |
|--------|-----------------|---------|
| SignupScreen | LoginScreen --> SignupScreen | Email+password registration form |
| VerifyEmailScreen | SignupScreen --> VerifyEmailScreen | OTP code entry after signup |
| ForgotPasswordScreen | LoginScreen --> ForgotPasswordScreen | Enter email to receive reset code |
| ResetPasswordScreen | ForgotPasswordScreen --> ResetPasswordScreen | Enter OTP + set new password |

Account linking fits within existing SettingsScreen as a new section. No new screen needed.

## New i18n Keys Required (~30 keys)

Login screen additions:
- `login.or` / "or" / "oppure"
- `login.email` / "Email"
- `login.password` / "Password"
- `login.signIn` / "Sign In" / "Accedi"
- `login.forgotPassword` / "Forgot password?" / "Password dimenticata?"
- `login.noAccount` / "No account?" / "Non hai un account?"
- `login.signUp` / "Sign up" / "Registrati"

Signup screen:
- `signup.title` / "Create Account" / "Crea Account"
- `signup.createAccount` / "Create Account" / "Crea Account"
- `signup.hasAccount` / "Already have an account?" / "Hai gia un account?"
- `signup.passwordMin` / "At least 6 characters" / "Almeno 6 caratteri"

Email verification screen:
- `verify.title` / "Verify Your Email" / "Verifica la tua Email"
- `verify.codeSent` / "We sent a 6-digit code to %{email}" / "Abbiamo inviato un codice a 6 cifre a %{email}"
- `verify.verify` / "Verify" / "Verifica"
- `verify.resend` / "Resend" / "Reinvia"
- `verify.resendIn` / "Resend in %{seconds}s" / "Reinvia tra %{seconds}s"
- `verify.didntReceive` / "Didn't receive the email?" / "Non hai ricevuto l'email?"

Password reset screens:
- `forgot.title` / "Reset Password" / "Reimposta Password"
- `forgot.description` / "Enter your email and we'll send you a reset code" / "Inserisci la tua email e ti invieremo un codice di reset"
- `forgot.sendCode` / "Send Reset Code" / "Invia Codice di Reset"
- `reset.title` / "New Password" / "Nuova Password"
- `reset.codeSent` / "Enter the code sent to %{email}" / "Inserisci il codice inviato a %{email}"
- `reset.newPassword` / "New password" / "Nuova password"
- `reset.resetPassword` / "Reset Password" / "Reimposta Password"

Settings account linking:
- `settings.connectedAccounts` / "Connected Accounts" / "Account Collegati"
- `settings.google` / "Google"
- `settings.emailPassword` / "Email & Password"
- `settings.connected` / "Connected" / "Collegato"
- `settings.setUp` / "Set up" / "Configura"
- `settings.disconnect` / "Disconnect" / "Scollega"
- `settings.addPassword` / "Set password" / "Imposta password"

Error messages:
- `auth.invalidCredentials` / "Invalid email or password" / "Email o password non validi"
- `auth.emailNotVerified` / "Please verify your email first" / "Verifica prima la tua email"
- `auth.codeExpired` / "Code expired. Please request a new one." / "Codice scaduto. Richiedine uno nuovo."
- `auth.rateLimited` / "Please wait before requesting another email" / "Attendi prima di richiedere un'altra email"
- `auth.checkEmail` / "If this email is registered, you'll receive a code" / "Se questa email e registrata, riceverai un codice"

## MVP Recommendation

**Phase 1 -- Core Email Auth (must ship together):**
1. Supabase config changes (enable_confirmations, email templates with OTP)
2. Email+password signup with OTP email verification (SignupScreen + VerifyEmailScreen)
3. Email+password login (refactored LoginScreen with Google button + email form + separator)
4. Password reset via OTP (ForgotPasswordScreen + ResetPasswordScreen)
5. Bilingual strings for all new screens

**Phase 2 -- Account Linking:**
6. Connected accounts section in Settings (show identities)
7. Add password to Google account (updateUser)
8. Add Google to email account (linkIdentity)
9. Unlink identity (with 2+ identity guard)

**Defer:**
- Change password (standalone flow) -- users can use "forgot password" as workaround
- Security notification emails (password_changed, identity_linked) -- Supabase sends automatically if templates configured, not critical for MVP
- Password strength meter beyond basic validation

## Sources

- [Supabase Identity Linking](https://supabase.com/docs/guides/auth/auth-identity-linking) -- HIGH confidence
- [Supabase Password-Based Auth](https://supabase.com/docs/guides/auth/passwords) -- HIGH confidence
- [Supabase resetPasswordForEmail](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) -- HIGH confidence
- [Supabase verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp) -- HIGH confidence
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) -- HIGH confidence
- [Supabase Email Templates](https://supabase.com/docs/guides/local-development/customizing-email-templates) -- HIGH confidence
- [Supabase CLI Config Reference](https://supabase.com/docs/guides/local-development/cli/config) -- HIGH confidence
- [Login & Signup UX Guide 2025](https://www.authgear.com/post/login-signup-ux-guide) -- MEDIUM confidence
- [Token-Based Password Reset for Supabase (dev.to)](https://dev.to/tanmay_kaushik_/why-i-ditched-deep-linking-for-a-token-based-password-reset-in-supabase-3e69) -- MEDIUM confidence
- [Supabase Password Reset Discussion #12324](https://github.com/orgs/supabase/discussions/12324) -- MEDIUM confidence
- [Supabase Password Reset Ghost Password Discussion #37737](https://github.com/orgs/supabase/discussions/37737) -- MEDIUM confidence
- Lumio codebase: LoginScreen.tsx, AuthContext.tsx, auth.ts, SettingsScreen.tsx, config.toml, app.json -- HIGH confidence
