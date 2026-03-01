# Phase 30: Email Login & Password Reset - Context

**Gathered:** 2026-03-01
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement email-based login for existing users and a password reset flow, building on the completed signup and verification infrastructure. This phase covers login UX, error handling, password reset behavior, and session policies. It does not introduce new authentication capabilities (e.g., device management UI or new auth methods).

</domain>

<decisions>
## Implementation Decisions

### Login UX & Structure
- Single-screen login (email + password together)
- Sessions are always remembered (no "remember me" checkbox)
- Inline live validation for email format and required fields
- Primary "Log in" button as the main CTA

### Error Messaging & Account States
- Generic error message for invalid credentials (no account enumeration)
- If email is unverified: block login and offer "Resend verification email"
- Wrong password uses the same generic invalid credentials message
- Tone is neutral and concise

### Password Reset Flow
- Entry via "Forgot password?" link on login screen
- Reset via email link only (no manual code entry)
- After successful reset, redirect user to login (no auto-login)
- Enforce basic password strength rules (minimum length + simple requirements)

### Session & Multi-Device Policy
- Multiple active sessions allowed across devices
- After password reset, invalidate all active sessions
- Long-lived persistent sessions
- No device/session management UI in this phase

### Claude's Discretion
- Exact copywriting of messages (within neutral/concise tone)
- Exact password rule thresholds (within "basic" definition)
- Visual design details consistent with existing auth screens

</decisions>

<code_context>
## Existing Code Insights

### Reusable Assets
- Existing signup forms and validation patterns: reuse structure and styling for login
- Auth context/infrastructure from Phase 28: integrate login and reset into existing provider
- Email verification flow from Phase 29: align resend verification behavior and messaging

### Established Patterns
- Supabase-based authentication already integrated
- Centralized auth context for session handling
- Existing form handling and inline validation patterns should be reused for consistency

### Integration Points
- Login screen integrates with existing auth routes/navigation
- Password reset email flow connects to Supabase reset mechanism
- Session invalidation after reset handled via auth context/session management layer

</code_context>

<specifics>
## Specific Ideas

- Error messages should be short, factual, and not reveal account existence.
- Login and reset experience should feel consistent with the existing signup and verification flow.

</specifics>

<deferred>
## Deferred Ideas

- Device/session management UI (view/revoke active sessions) — separate future phase
- Additional authentication methods (e.g., passwordless login) — separate future phase

</deferred>

---

*Phase: 30-email-login-password-reset*
*Context gathered: 2026-03-01*
