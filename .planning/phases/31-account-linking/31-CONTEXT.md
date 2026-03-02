# Phase 31: Account Linking - Context

**Gathered:** 2026-03-02
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can connect multiple auth methods (Google, email/password) to a single account from Settings. Includes viewing connected methods, adding new methods, and unlinking existing methods. Account merging across different Lumio accounts is out of scope.

</domain>

<decisions>
## Implementation Decisions

### Connected accounts display
- Expand existing account section in Settings (below avatar/name/email) — not a separate section
- Each auth method (Google, Email) gets its own row: icon + label + email address + status
- Connected methods show the associated email and an explicit "Disconnect" button
- Unconnected methods show an "Add" action button
- Show the specific email for each method (Google email, account email) — useful when they differ

### Add password flow (Google → email)
- Tapping "Add" on the Email row navigates to a dedicated "Set Password" screen (new screen, not inline)
- Email field pre-filled with the Google account email but editable
- User enters password + confirm password
- After submission, OTP verification is required (consistent with signup flow) — navigate to OTP screen
- On successful verification, return to Settings with a success toast ("Email/password added")

### Link Google flow (email → Google)
- Tapping "Add" on the Google row launches the Google OAuth picker directly — no intermediate confirmation screen
- If the selected Google account is already linked to a different Lumio account, block with error: "This Google account is already linked to another account"
- If Google email differs from the Lumio account email, allow it without special handling — Supabase manages multi-identity
- On successful linking, return to Settings with a success toast ("Google account connected")

### Unlink safeguards
- No confirmation dialog — unlinking is immediate since it's reversible (user can re-link)
- When only one method is connected, hide the "Disconnect" button entirely — no disabled state, no error on tap
- After unlinking, show a toast ("Google disconnected" / "Email disconnected") and update the row to show "Add" button
- Unlinking email/password is a full removal — re-adding later requires the complete add-password flow with new password + OTP verification

### OpenCode's Discretion
- Exact row layout, spacing, icons, and typography
- Loading/spinner states during link/unlink operations
- Error handling for network failures during OAuth or API calls
- SecureStore dual-identity JWT handling approach
- Animation/transition between states (connected ↔ unconnected)

</decisions>

<specifics>
## Specific Ideas

- Success/error feedback consistently uses toasts (same pattern across add-password, link-Google, and unlink flows)
- The connected accounts area extends the existing account section — should feel like a natural part of that section, not bolted on
- Auth screens for add-password flow should be consistent with existing signup/login screens from Phases 29-30

</specifics>

<deferred>
## Deferred Ideas

- Account merging (when Google account is already linked to a different Lumio account) — future phase

</deferred>

---

*Phase: 31-account-linking*
*Context gathered: 2026-03-02*
