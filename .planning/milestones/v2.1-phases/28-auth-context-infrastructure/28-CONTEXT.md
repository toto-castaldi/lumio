# Phase 28: Auth Context & Infrastructure - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

AuthContext supports the full email auth lifecycle (sign-up, sign-in, password reset, password update) and all new auth-related UI strings are translatable in IT and EN. An email-only user can sign out without crashing. No new screens are built in this phase — only context/infrastructure.

</domain>

<decisions>
## Implementation Decisions

### AuthContext API Shape
- Per-operation loading states: signUpLoading, signInLoading, resetLoading, updatePasswordLoading
- Methods throw on error — callers use try/catch
- Caller handles toast notifications, not AuthContext
- signUpWithEmail requires email confirmation before sign-in (no auto sign-in after registration)

### Sign-out Guard
- Check auth provider before calling GoogleSignin.signOut() — skip for email-only users
- Same visual sign-out experience regardless of provider (no provider-aware UI)
- If GoogleSignin.signOut() fails for a Google user, continue sign-out anyway (clear Supabase session regardless)

### i18n String Design
- Keys organized by screen: auth.login.*, auth.signup.*, auth.reset.*, auth.updatePassword.*
- Error messages are friendly and helpful — guide user to next action (e.g., "That email is already registered. Try signing in instead.")
- Claude writes both EN and IT translations
- Italian uses informal "tu" tone (e.g., "Inserisci la tua email")

### Recovery Flow State
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

</decisions>

<specifics>
## Specific Ideas

No specific requirements — open to standard approaches that match existing Lumio patterns.

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 28-auth-context-infrastructure*
*Context gathered: 2026-02-27*
