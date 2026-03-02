# Phase 29: Email Signup & Verification - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can create an account with email/password and verify their email via a 6-digit OTP code. The login screen is redesigned to show Google OAuth and email form with equal visual weight, separated by a divider. Phase 28 provides AuthContext methods and i18n keys — this phase builds the actual screens.

</domain>

<decisions>
## Implementation Decisions

### Login screen layout
- Google button and email form have equal visual weight — neither is "primary"
- Separator is a horizontal line with "oppure" / "or" text centered in it
- Email-first flow: login screen shows email field + "Continua" button initially
- After entering email and tapping "Continua", password field reveals on the same screen (email becomes read-only)
- "Forgot password?" link appears alongside password field (navigates in Phase 30)

### Signup screen design
- Fields: email + password only (display name derived from email prefix via Phase 27 trigger)
- Single password field with show/hide eye toggle — no confirm password field
- Password requirements shown on error only, not upfront
- After successful signup: auto-navigate to OTP verification screen with brief toast ("Code sent to your email")

### OTP verification screen
- 6 separate digit boxes in a row, auto-focus advances to next box
- Auto-submit when all 6 digits are entered — no manual "Verifica" button needed
- Resend code with cooldown timer (e.g., "Resend in 58s") before allowing retry
- Verification screen shows the email address the code was sent to for context

### Screen navigation flow
- Full screen stack navigation (standard push, back arrow to go back)
- After successful OTP verification: straight to home — no intermediate welcome screen
- Login → Signup: standard stack push
- Signup → OTP verification: replace or push (user completed signup step)
- OTP back navigation and "Registrati" link placement at Claude's discretion

### Duplicate email handling
- If email is already registered (e.g., via Google), show a friendly error guiding user to sign in instead
- Error message uses the i18n keys from Phase 28 (e.g., "That email is already registered. Try signing in instead.")

### Claude's Discretion
- "Non hai un account? Registrati" link placement on login screen
- OTP wrong code behavior (shake + clear vs error message with digits preserved)
- OTP back button destination (back to signup vs back to login)
- Exact cooldown timer duration for resend
- Keyboard behavior and auto-focus patterns
- Loading indicators during signup and verification API calls

</decisions>

<specifics>
## Specific Ideas

- Email-first login feels like a progressive disclosure — start simple, reveal password only when needed
- 6 separate OTP boxes should feel polished and satisfying (auto-advance, paste support)
- The transition from signup to OTP should be seamless — toast + auto-navigate, no extra taps

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 29-email-signup-verification*
*Context gathered: 2026-02-27*
