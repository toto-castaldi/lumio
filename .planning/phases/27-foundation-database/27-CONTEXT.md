# Phase 27: Foundation & Database - Context

**Gathered:** 2026-02-27
**Status:** Ready for planning

<domain>
## Phase Boundary

Configure Supabase for email authentication and fix the database trigger to handle email signups (no Google metadata). Deliverables: config.toml updates, OTP email templates with Lumio branding, and a DB trigger that derives display_name from email prefix. No UI screens in this phase.

</domain>

<decisions>
## Implementation Decisions

### OTP email branding
- Minimal & functional tone — just the code and brief instruction, no conversational fluff
- Branded HTML layout — Lumio logo at top, brand colors, styled template
- Bilingual: English first, Italian translation below in the same template
- Subject lines include "Lumio" (e.g. "Lumio - Your verification code")
- OTP code displayed large and prominent (centered, big font — like a PIN display)
- Footer includes safety disclaimer: "If you didn't request this code, you can safely ignore this email" (in both languages)
- Two templates only: Confirm signup and Reset password (magic link and change email not needed for v2.1)

### Display name derivation
- Split email prefix on dots, underscores, hyphens → capitalize each word (john.doe@gmail.com → "John Doe")
- Use as-is for edge cases (numbers-only prefixes, single characters) — no fallback placeholder
- Generate initials avatar URL using an avatar service (e.g. ui-avatars.com) with Lumio brand color as fixed background
- avatar_url populated in the DB trigger alongside display_name

### Email configuration
- OTP code expiry: 1 hour (generous window for personal study app)
- Email confirmation required before login — user cannot access app with unverified email
- Rate limiting: Supabase defaults (no custom override)
- `enable_manual_linking` enabled now in Phase 27 config.toml (prepares for Phase 31 account linking)

### Claude's Discretion
- Exact HTML/CSS for email templates (within the branded, minimal constraints above)
- DB trigger implementation details (PL/pgSQL logic)
- config.toml parameter specifics beyond the decisions above
- Avatar service choice and URL format

</decisions>

<specifics>
## Specific Ideas

- Email OTP display should look like bank/financial app OTP emails — big centered number, impossible to miss
- Email template has two language sections: EN block first, then a subtle separator, then IT block below
- Initials avatar uses consistent Lumio brand color (not per-user unique colors)

</specifics>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope

</deferred>

---

*Phase: 27-foundation-database*
*Context gathered: 2026-02-27*
