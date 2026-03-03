---
phase: quick-5
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/config.toml
  - supabase/.env.local
autonomous: true
requirements: [QUICK-5]
user_setup:
  - service: smtp
    why: "Supabase auth emails (signup OTP)"
    env_vars:
      - name: SMTP_HOST
        source: "SMTP provider dashboard (or use 127.0.0.1 for local inbucket)"
      - name: SMTP_PORT
        source: "SMTP provider dashboard (or 54325 for local inbucket)"
      - name: SMTP_USER
        source: "SMTP provider dashboard (optional for inbucket)"
      - name: SMTP_PASS
        source: "SMTP provider dashboard (optional for inbucket)"
      - name: SMTP_ADMIN_EMAIL
        source: "Sender email address"
      - name: SMTP_SENDER_NAME
        source: "Sender display name"

must_haves:
  truths:
    - "After email signup, the confirmation OTP email is sent and is visible in the local Inbucket inbox during dev"
    - "Supabase mailer configuration is explicitly set and not relying on undocumented defaults"
  artifacts:
    - path: "supabase/config.toml"
      provides: "SMTP mailer configuration for Supabase auth email"
      contains: "[auth.email.smtp]"
    - path: "supabase/.env.local"
      provides: "Local SMTP variables for Inbucket"
      contains: "SMTP_HOST"
  key_links:
    - from: "supabase/config.toml [auth.email.smtp]"
      to: "supabase/.env.local"
      via: "env(SMTP_*) references"
      pattern: "env\(SMTP_"
---

<objective>
Ensure Supabase email signup sends OTP emails by explicitly configuring the SMTP mailer for local development (Inbucket) and environment-based SMTP variables.

Purpose: The signup UI flows correctly but no email is delivered. Making the mailer configuration explicit removes hidden defaults and routes local mail to Inbucket.

Output: Updated Supabase config + local SMTP env entries that enable OTP emails to be delivered and viewable in Inbucket.
</objective>

<execution_context>
@~/.config/opencode/get-shit-done/workflows/execute-plan.md
@~/.config/opencode/get-shit-done/templates/summary.md
</execution_context>

<context>
@supabase/config.toml
@apps/android/contexts/AuthContext.tsx
@apps/android/screens/SignUpScreen.tsx
</context>

<tasks>

<task type="auto">
  <name>Task 1: Add explicit SMTP mailer config for auth emails</name>
  <files>supabase/config.toml, supabase/.env.local</files>
  <action>
Add a Supabase mailer section that wires auth email delivery through SMTP, using environment variables so production can set a real SMTP provider and local dev routes to Inbucket.

1) In `supabase/config.toml`, add a new `[auth.email.smtp]` section under the existing `[auth.email]` block, and reference env vars:
   - `host = "env(SMTP_HOST)"`
   - `port = "env(SMTP_PORT)"`
   - `user = "env(SMTP_USER)"`
   - `pass = "env(SMTP_PASS)"`
   - `admin_email = "env(SMTP_ADMIN_EMAIL)"`
   - `sender_name = "env(SMTP_SENDER_NAME)"`
   - `secure = false` (Inbucket is local, no TLS)

2) In `supabase/.env.local`, add local defaults for Inbucket:
   - `SMTP_HOST=127.0.0.1`
   - `SMTP_PORT=54325`
   - `SMTP_USER=` (leave blank if not required)
   - `SMTP_PASS=` (leave blank if not required)
   - `SMTP_ADMIN_EMAIL=no-reply@lumio.local`
   - `SMTP_SENDER_NAME=Lumio (Local)`

Do not change any auth settings (enable_confirmations, site_url, redirects). Only add SMTP configuration and local defaults.
  </action>
  <verify>
    <automated>rg -n "\[auth.email.smtp\]|SMTP_(HOST|PORT|USER|PASS|ADMIN_EMAIL|SENDER_NAME)" supabase/config.toml supabase/.env.local</automated>
    <manual>Start Supabase locally and verify the confirmation email appears in Inbucket at http://127.0.0.1:54324 after signing up.</manual>
  </verify>
  <done>`supabase/config.toml` contains a `[auth.email.smtp]` section wired to env vars, and `supabase/.env.local` defines SMTP_* values for Inbucket so OTP emails are delivered locally.</done>
</task>

</tasks>

<verification>
- `rg -n "\[auth.email.smtp\]" supabase/config.toml` finds the new SMTP section
- `rg -n "SMTP_" supabase/.env.local` shows all required SMTP_* variables
- Local signup results in an email visible in Inbucket (http://127.0.0.1:54324)
</verification>

<success_criteria>
- Supabase auth mailer is explicitly configured via SMTP env vars
- Local development sends signup OTP emails to Inbucket
- No changes to auth flow logic in the Android app
</success_criteria>

<output>
After completion, create `.planning/quick/5-ho-provato-la-registrazione-utente-con-m/5-SUMMARY.md`
</output>
