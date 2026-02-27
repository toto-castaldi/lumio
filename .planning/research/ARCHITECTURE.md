# Architecture Patterns

**Domain:** Email/password auth with account linking for existing React Native + Supabase app
**Researched:** 2026-02-27

## Recommended Architecture

### High-Level Integration Map

```
EXISTING (unchanged)                    NEW (this milestone)
========================               ========================

App.tsx
  AuthProvider -----.
    ThemeProvider   |
      I18nProvider  |
        ...         |
          AppNavigator
            |
     state=='loading' -> Spinner
     state=='logged_out' -> AuthNavigator ----> NEW: SignUpScreen
                              |                       ForgotPasswordScreen
                              |                       EmailVerificationScreen
                              v
                          LoginScreen ----> MODIFY: Add email/password form
     state=='ready' -> RootStack
                         MainNavigator
                           SettingsScreen ----> MODIFY: Add account linking section
                         ResetPassword ----> NEW: Conditional on passwordRecoveryPending

  + NEW: Deep link handler in App.tsx (Linking.useURL + createSessionFromUrl)
```

### Component Boundaries

| Component | Responsibility | Status | Communicates With |
|-----------|---------------|--------|-------------------|
| `AuthContext` | Auth state machine, sign-in/out methods | MODIFY: Add signInWithEmail, signUpWithEmail, resetPassword, linkGoogleIdentity, passwordRecoveryPending | Supabase Auth API |
| `AuthNavigator` | Stack navigator for unauthenticated screens | MODIFY: Add SignUp, ForgotPassword, EmailVerification screens | LoginScreen, SignUpScreen, ForgotPasswordScreen, EmailVerificationScreen |
| `LoginScreen` | Login UI | MODIFY: Add email/password form below Google button | AuthContext |
| `SignUpScreen` | NEW: Registration form | NEW | AuthContext |
| `ForgotPasswordScreen` | NEW: Password reset request | NEW | AuthContext |
| `EmailVerificationScreen` | NEW: Post-signup "check your email" | NEW | Navigation only (informational screen) |
| `ResetPasswordScreen` | NEW: Set new password (after deep link) | NEW | AuthContext, deep link params |
| `SettingsScreen` | User settings | MODIFY: Add account linking section | AuthContext |
| `App.tsx` | Root provider tree | MODIFY: Add deep link handler | Linking API, Supabase Auth |
| `lib/auth.ts` | Google Sign-In config | UNCHANGED | - |
| `supabase/config.toml` | Local Supabase config | MODIFY: Enable email confirmations, add redirect URLs | - |
| `handle_new_user()` trigger | Creates public.users from auth.users | Already handles NULL gracefully via COALESCE | DB trigger |

### Data Flow

#### 1. Email Sign-Up Flow

```
User enters email+password on SignUpScreen
  -> supabase.auth.signUp({ email, password, options: { emailRedirectTo } })
  -> Supabase sends verification email
  -> Navigate to EmailVerificationScreen ("Check your email")
  -> User opens email, taps link
  -> Deep link: lumio://auth/callback?access_token=...&refresh_token=...
  -> App.tsx Linking.useURL() captures URL
  -> createSessionFromUrl() calls supabase.auth.setSession()
  -> onAuthStateChange fires SIGNED_IN
  -> AuthContext state -> 'ready'
  -> AppNavigator renders RootStack (user is in the app)
```

#### 2. Email Sign-In Flow

```
User enters email+password on LoginScreen
  -> supabase.auth.signInWithPassword({ email, password })
  -> Returns session immediately (no redirect needed)
  -> onAuthStateChange fires SIGNED_IN
  -> AuthContext state -> 'ready'
```

#### 3. Password Reset Flow

```
User taps "Forgot password?" on LoginScreen
  -> Navigate to ForgotPasswordScreen
  -> User enters email
  -> supabase.auth.resetPasswordForEmail(email, { redirectTo })
  -> Supabase sends reset email
  -> Show "Check your email" confirmation on ForgotPasswordScreen
  -> User opens email, taps link
  -> Deep link: lumio://auth/callback?access_token=...&refresh_token=...&type=recovery
  -> App.tsx Linking.useURL() captures URL
  -> createSessionFromUrl() creates session
  -> onAuthStateChange fires PASSWORD_RECOVERY event
  -> AuthContext sets passwordRecoveryPending = true
  -> AppNavigator is in state='ready' but passwordRecoveryPending gate
     forces navigation to ResetPasswordScreen
  -> User enters new password
  -> supabase.auth.updateUser({ password: newPassword })
  -> clearPasswordRecovery()
  -> Navigate to main app
```

#### 4. Account Linking Flow (Settings)

```
User is logged in with email/password, taps "Link Google Account" in Settings
  -> GoogleSignin.signIn() (native dialog)
  -> Gets Google ID token
  -> supabase.auth.linkIdentity({ provider: 'google', token: idToken })
  -> Identity linked to existing Supabase user
  -> UI updates to show linked Google account

User is logged in with Google, taps "Add Password" in Settings
  -> Shows inline password form
  -> supabase.auth.updateUser({ password: newPassword })
  -> Email identity is added to user
  -> UI updates to show email+password is configured
```

## Patterns to Follow

### Pattern 1: Deep Link Session Handler

**What:** Centralized deep link handler in App.tsx that intercepts auth-related URLs and creates sessions.
**When:** Always -- this is the bridge between email links and the app.
**Why:** The Supabase client is configured with `detectSessionInUrl: false` (already set in `packages/core/src/supabase/client.ts`), so we must manually parse deep link URLs.

```typescript
// In lib/deepLink.ts
import * as QueryParams from 'expo-auth-session/build/QueryParams';
import { getSupabaseClient } from '@lumio/core';

export const createSessionFromUrl = async (url: string) => {
  const { params, errorCode } = QueryParams.getQueryParams(url);
  if (errorCode) throw new Error(errorCode);

  const { access_token, refresh_token } = params;
  if (!access_token) return null;

  const { data, error } = await getSupabaseClient().auth.setSession({
    access_token,
    refresh_token,
  });
  if (error) throw error;
  return data.session;
};

// In App.tsx, inside the component:
import * as Linking from 'expo-linking';
import { createSessionFromUrl } from './lib/deepLink';

const url = Linking.useURL();
useEffect(() => {
  if (url) {
    createSessionFromUrl(url).catch(err =>
      console.error('[DeepLink] Failed to create session:', err)
    );
  }
}, [url]);
```

**Confidence:** HIGH -- This is the official Supabase pattern for Expo deep linking, documented at supabase.com/docs/guides/auth/native-mobile-deep-linking.

### Pattern 2: Auth Event Type Handling for PASSWORD_RECOVERY

**What:** Extend the existing `onAuthStateChange` listener to detect `PASSWORD_RECOVERY` events.
**When:** When a user clicks a password reset link and the app receives the deep link.
**Why:** The reset link creates a valid session, but we must redirect to a password update screen instead of the main app.

```typescript
// In AuthContext.tsx, extend the existing onAuthStateChange
const [passwordRecoveryPending, setPasswordRecoveryPending] = useState(false);

getSupabaseClient().auth.onAuthStateChange((event, newSession) => {
  setSession(newSession);
  setUser(newSession?.user ?? null);
  setState(newSession ? 'ready' : 'logged_out');

  // NEW: Handle password recovery flow
  if (event === 'PASSWORD_RECOVERY') {
    setPasswordRecoveryPending(true);
  }
});
```

**Confidence:** HIGH -- PASSWORD_RECOVERY is a documented Supabase onAuthStateChange event type.

### Pattern 3: Conditional Auth Navigator Routing

**What:** Expand AuthNavigator from single-screen (Login only) to multi-screen stack.
**When:** Auth flow now has 4 screens instead of just Login.

```typescript
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  ForgotPassword: undefined;
  EmailVerification: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="EmailVerification" component={EmailVerificationScreen} />
    </Stack.Navigator>
  );
}
```

**Confidence:** HIGH -- Standard react-navigation pattern already used in the codebase.

### Pattern 4: Password Recovery Screen in Root Stack (Not Auth Stack)

**What:** Add ResetPasswordScreen to the root stack (authenticated navigator), not AuthNavigator.
**When:** After deep link creates a session with PASSWORD_RECOVERY event.
**Why:** When a user clicks a password reset link, Supabase creates a valid session (the user is technically logged in with state='ready'). AuthNavigator only renders when state='logged_out'. Placing ResetPassword in AuthNavigator means the user would never see it -- they would jump straight to the main app.

```typescript
// In AppNavigator.tsx, inside the authenticated stack:
const { passwordRecoveryPending } = useAuth();

// Inside the Stack.Navigator:
<Stack.Screen name="Main" component={MainNavigator} />
{/* ... existing screens ... */}
{passwordRecoveryPending && (
  <Stack.Screen
    name="ResetPassword"
    component={ResetPasswordScreen}
    options={{ presentation: 'card', gestureEnabled: false }}
  />
)}
```

**Confidence:** HIGH -- Password recovery creates a valid session, so the user is in the 'ready' state.

### Pattern 5: Account Linking via User Identity Inspection

**What:** In SettingsScreen, inspect `user.identities` to determine which providers are linked and offer appropriate actions.
**When:** Always on SettingsScreen render.

```typescript
const { user } = useAuth();

const identities = user?.identities ?? [];
const hasGoogleIdentity = identities.some(i => i.provider === 'google');
const hasEmailIdentity = identities.some(i => i.provider === 'email');

// Show appropriate linking options:
// If has Google but no email -> Show "Add Password" form
// If has email but no Google -> Show "Link Google Account" button
// If has both -> Show both as linked (checkmarks, no action needed)
```

**Confidence:** HIGH -- `user.identities` is a standard Supabase Auth property available on the User object. The `linkIdentity` with ID token support was shipped in supabase-js (late 2025) and is available with the project's `^2.45.0` semver range.

### Pattern 6: Redirect URL with makeRedirectUri

**What:** Use `expo-auth-session`'s `makeRedirectUri()` to generate the correct deep link URI.
**When:** For all email-based auth operations that need a redirect (signUp, resetPasswordForEmail).

```typescript
import { makeRedirectUri } from 'expo-auth-session';

const redirectTo = makeRedirectUri();
// Returns something like: lumio:// (based on app.json scheme: "lumio")
```

**Confidence:** HIGH -- expo-auth-session is the standard Expo utility for this. The app already has `scheme: "lumio"` in app.json.

## Anti-Patterns to Avoid

### Anti-Pattern 1: Separate AuthContext for Email Auth

**What:** Creating a new EmailAuthContext alongside the existing AuthContext.
**Why bad:** Two auth contexts would both listen to the same `onAuthStateChange` and fight over state. The Supabase client is singular.
**Instead:** Extend the existing AuthContext with new methods (signUpWithEmail, signInWithEmail, etc.).

### Anti-Pattern 2: In-App OTP Code Instead of Deep Links

**What:** Asking users to copy a verification code from their email instead of using deep link redirect.
**Why bad:** Supabase's email verification default flow uses URL-based confirmation, not OTP codes. Fighting this requires custom email templates and server-side workarounds.
**Instead:** Use the standard Supabase email-link-based verification with deep link handling.

### Anti-Pattern 3: ResetPasswordScreen in AuthNavigator

**What:** Placing ResetPasswordScreen inside the AuthNavigator (the logged-out stack).
**Why bad:** When a user clicks a password reset link, Supabase creates a valid session (the user is technically logged in). AuthNavigator only renders when `state === 'logged_out'`. The user would skip directly to the main app, never seeing the password reset form.
**Instead:** Place ResetPasswordScreen in the root stack (authenticated navigator) gated by a `passwordRecoveryPending` flag.

### Anti-Pattern 4: Using updateUser for Google Linking

**What:** Trying to link a Google identity by calling `updateUser()` with Google metadata.
**Why bad:** `updateUser()` updates email/password/metadata, not identity providers. Identity linking requires `linkIdentity()` which creates a new identity record.
**Instead:** Use `linkIdentity({ provider: 'google', token: idToken })` for Google linking.

### Anti-Pattern 5: Disabling Email Confirmation

**What:** Setting `enable_confirmations: false` to avoid deep link complexity.
**Why bad:** Allows anyone to create accounts with unverified emails. Users could sign up with emails they don't own. This also breaks automatic identity linking security (which requires verified emails to safely merge accounts).
**Instead:** Enable email confirmations and implement proper deep link handling. The complexity is one-time setup.

## Detailed Component Specifications

### New Files

| File | Type | Purpose |
|------|------|---------|
| `screens/SignUpScreen.tsx` | Screen | Email+password registration form with validation |
| `screens/ForgotPasswordScreen.tsx` | Screen | Enter email, request password reset |
| `screens/EmailVerificationScreen.tsx` | Screen | "Check your email" informational screen post-signup |
| `screens/ResetPasswordScreen.tsx` | Screen | New password entry form (after deep link from reset email) |
| `lib/deepLink.ts` | Utility | createSessionFromUrl: parse deep link, create Supabase session |

### Modified Files

| File | Change | Impact |
|------|--------|--------|
| `contexts/AuthContext.tsx` | Add signUpWithEmail, signInWithEmail, resetPassword, updatePassword, linkGoogleIdentity, passwordRecoveryPending state, clearPasswordRecovery, PASSWORD_RECOVERY event handler | Core -- all new auth flows depend on this |
| `navigation/AuthNavigator.tsx` | Add SignUp, ForgotPassword, EmailVerification to AuthStackParamList and Stack.Navigator | Navigation -- new screens in logged-out flow |
| `navigation/AppNavigator.tsx` | Add ResetPassword to RootStackParamList, conditionally render when passwordRecoveryPending is true | Navigation -- password recovery after deep link |
| `screens/LoginScreen.tsx` | Add email/password form below Google button with "or" separator, "Forgot password?" link, "Sign up" link | UI -- largest visual change |
| `screens/SettingsScreen.tsx` | Add account linking section: display linked identities, offer "Add Password" or "Link Google" based on current identities | UI -- new section in settings |
| `App.tsx` | Add Linking.useURL() hook + createSessionFromUrl for deep link handling | Core -- bridges email links to app sessions |
| `i18n/en.ts` | Add ~25 new translation keys for signup, verification, password reset, account linking | i18n |
| `i18n/it.ts` | Add corresponding Italian translations | i18n |
| `supabase/config.toml` | Set `enable_confirmations = true`, add `lumio://**` to redirect URLs | Backend config for local dev |
| `packages/core/src/supabase/auth.ts` | Add signUpWithEmail, signInWithEmail, resetPasswordForEmail exports | Shared auth functions |
| `packages/core/src/index.ts` | Re-export new auth functions | Package public API |

### Unchanged Files (Explicitly No Touch Needed)

| File | Why Unchanged |
|------|---------------|
| `lib/supabase.ts` | Client config already correct: `detectSessionInUrl: false`, `flowType: 'pkce'`, SecureStore adapter |
| `lib/auth.ts` | Google Sign-In config unchanged -- still needed for Google login and account linking |
| `App.tsx` provider tree order | AuthProvider remains outermost -- new email auth methods go in same context |
| `handle_new_user()` trigger | `COALESCE` on `display_name`/`avatar_url` already handles NULL for email signups (no Google metadata) |
| All edge functions | They use session tokens (auth.uid()), not provider-specific logic |
| All RLS policies | Policies are based on `auth.uid()`, not auth provider type |
| `lib/theme.ts`, `lib/i18n.ts`, `lib/studySettings.ts` | Unrelated to auth |
| Study-related files | `useStudySession.ts`, `StudyScreen.tsx`, etc. -- no auth changes needed |

## AuthContext Extended Interface

```typescript
export interface AuthContextType {
  // EXISTING (unchanged)
  user: User | null;
  session: Session | null;
  state: AuthState;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // NEW: Email auth
  signUpWithEmail: (email: string, password: string) => Promise<{ needsVerification: boolean }>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;

  // NEW: Account linking
  linkGoogleIdentity: () => Promise<void>;

  // NEW: Password recovery state
  passwordRecoveryPending: boolean;
  clearPasswordRecovery: () => void;
}
```

## Navigation Structure (Updated)

```
App.tsx
  NavigationContainer
    AppNavigator
      state='loading' -> ActivityIndicator spinner
      state='logged_out' -> AuthNavigator (NativeStack)
        Login              (EXISTING, modified with email form)
        SignUp             (NEW)
        ForgotPassword     (NEW)
        EmailVerification  (NEW)
      state='ready' -> RootStack (NativeStack)
        Main               (EXISTING - bottom tab navigator)
        Study              (EXISTING)
        StudySummary       (EXISTING)
        CardList           (EXISTING)
        CardDetail         (EXISTING)
        StudyHistory       (EXISTING)
        ResetPassword      (NEW, conditional: rendered only when passwordRecoveryPending)
```

## Deep Link Configuration

### app.json (Already Correct -- No Changes)

```json
{
  "expo": {
    "scheme": "lumio"
  }
}
```

### supabase/config.toml Updates (Local Dev)

```toml
[auth]
site_url = "lumio://auth/callback"
additional_redirect_urls = [
  "http://localhost:5173/auth/callback",
  "http://localhost:5174/auth/callback",
  "https://m-lumio.toto-castaldi.com/auth/callback",
  "lumio://auth/callback",
  "lumio://**"
]

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true   # CHANGE from false -- required for email verification
```

### Production Supabase Dashboard

- Add `lumio://auth/callback` and `lumio://**` to Redirect URL allow list
- Ensure email confirmations are enabled
- Default email templates are sufficient for MVP (they include {{ .RedirectTo }})

### Required New Package

```bash
pnpm --filter @lumio/android add expo-auth-session
```

`expo-linking` is already installed (`~8.0.11`). `expo-auth-session` is needed for `makeRedirectUri()` and `QueryParams.getQueryParams()` -- these are the standard Expo utilities for deep link URL parsing.

No native rebuild is required for `expo-auth-session` (pure JS package).

## Supabase Email Templates

For local development, emails are captured by Inbucket (http://127.0.0.1:54324). For production, Supabase Cloud provides default email delivery (rate limited to 2/hour in free tier -- sufficient for single dev but needs Custom SMTP for real usage).

The email templates use `{{ .RedirectTo }}` which Supabase populates from the `emailRedirectTo` parameter passed in `signUp()` and `resetPasswordForEmail()`.

No custom email templates are needed for this milestone.

## Build Order (Dependency-Driven)

```
Phase 1: Deep Link Foundation
  1. supabase/config.toml: enable email confirmations, add redirect URLs
  2. Install expo-auth-session
  3. lib/deepLink.ts: createSessionFromUrl utility
  4. App.tsx: add Linking.useURL() handler
  -> Validates: deep links arrive in the app, session can be created from URL

Phase 2: Email Auth Core
  5. packages/core/src/supabase/auth.ts: add signUpWithEmail, signInWithEmail, resetPasswordForEmail
  6. packages/core/src/index.ts: re-export new functions
  7. contexts/AuthContext.tsx: add new methods + PASSWORD_RECOVERY event handling
  8. i18n/en.ts + it.ts: add all new translation keys
  -> Validates: email signup/signin round-trips through AuthContext

Phase 3: Auth Screens
  9. screens/SignUpScreen.tsx
  10. screens/EmailVerificationScreen.tsx
  11. screens/ForgotPasswordScreen.tsx
  12. navigation/AuthNavigator.tsx: register new screens
  13. screens/LoginScreen.tsx: add email/password form + "or" separator + navigation links
  -> Validates: full signup -> verification email -> deep link -> logged in

Phase 4: Password Reset
  14. screens/ResetPasswordScreen.tsx
  15. navigation/AppNavigator.tsx: add conditional ResetPassword screen gated by passwordRecoveryPending
  -> Validates: reset email -> deep link -> new password form -> password updated

Phase 5: Account Linking
  16. contexts/AuthContext.tsx: add linkGoogleIdentity method
  17. screens/SettingsScreen.tsx: add linked identities display + linking actions
  -> Validates: Google user can add password, email user can link Google

Phase 6: Production Config
  18. Supabase Dashboard: add redirect URLs, verify email confirmations enabled
  19. End-to-end test with production Supabase (not just local Inbucket)
```

**Phase ordering rationale:**
- Phase 1 first because deep links are the foundation for email verification and password reset. Without them, signUp confirmation is broken.
- Phase 2 before Phase 3 because screens need the auth methods to exist.
- Phase 3 before Phase 4 because ForgotPasswordScreen (in auth stack) must exist before ResetPasswordScreen (in root stack) can be useful.
- Phase 5 last because it requires both email and Google auth to already work independently.
- Phase 6 last because local development testing should pass before touching production.

## Scalability Considerations

| Concern | Current (single dev) | At 100 users | At 1000+ users |
|---------|---------------------|--------------|----------------|
| Email delivery | Inbucket (local), Supabase default (prod) | Supabase default OK for low volume | Custom SMTP needed (2/hour rate limit) |
| Account merging conflicts | Rare | Occasional same-email Google + email signups | Need clear error messages for linking failures |
| Session management | SecureStore, single device | Fine | Fine (server-managed sessions) |
| Password reset abuse | N/A | Rate limiting built into Supabase Auth | Monitor for email enumeration attempts |

## Sources

- [Supabase Identity Linking Docs](https://supabase.com/docs/guides/auth/auth-identity-linking) -- HIGH confidence
- [Supabase Native Mobile Deep Linking](https://supabase.com/docs/guides/auth/native-mobile-deep-linking) -- HIGH confidence
- [Supabase signUp API Reference](https://supabase.com/docs/reference/javascript/auth-signup) -- HIGH confidence
- [Supabase resetPasswordForEmail API](https://supabase.com/docs/reference/javascript/auth-resetpasswordforemail) -- HIGH confidence
- [Supabase Password-Based Auth Guide](https://supabase.com/docs/guides/auth/passwords) -- HIGH confidence
- [Supabase signInWithIdToken API](https://supabase.com/docs/reference/javascript/auth-signinwithidtoken) -- HIGH confidence
- [Supabase PKCE Flow Docs](https://supabase.com/docs/guides/auth/sessions/pkce-flow) -- HIGH confidence
- [linkIdentityWithIdToken support issue #1591](https://github.com/supabase/supabase-js/issues/1591) -- MEDIUM confidence (feature shipped Nov 2025, exact API surface should be verified at build time)
- [linkIdentity React Native discussion #25976](https://github.com/orgs/supabase/discussions/25976) -- MEDIUM confidence
- [Expo Using Supabase guide](https://docs.expo.dev/guides/using-supabase/) -- HIGH confidence
- Lumio codebase analysis (direct code reading) -- HIGH confidence
