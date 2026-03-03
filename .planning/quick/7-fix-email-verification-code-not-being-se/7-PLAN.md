---
phase: quick-7
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - supabase/config.toml
  - supabase/.env.local
autonomous: false
requirements: [QUICK-7]
user_setup:
  - service: supabase-smtp-production
    why: "Production Supabase project needs SMTP configured in the Dashboard for auth emails to be sent"
    dashboard_config:
      - task: "Enable custom SMTP for authentication emails"
        location: "Supabase Dashboard -> Project Settings -> Authentication -> SMTP Settings -> Enable Custom SMTP"
        details: "Configure a real SMTP provider (e.g., Resend, SendGrid, Mailgun). Set Host, Port, User, Password, Sender email, Sender name. Without this, the hosted Supabase project uses its built-in email service which has strict rate limits and may not deliver."

must_haves:
  truths:
    - "After email signup locally, the confirmation OTP email appears in Inbucket at http://127.0.0.1:54324"
    - "Production Supabase project has SMTP configured in the Dashboard so auth emails are delivered"
  artifacts:
    - path: "supabase/config.toml"
      provides: "Correct SMTP configuration with unquoted env() references"
      contains: "pass = env(SMTP_PASS)"
    - path: "supabase/.env.local"
      provides: "Local SMTP env vars for Inbucket Docker container"
      contains: "SMTP_HOST"
  key_links:
    - from: "supabase/config.toml [auth.email.smtp]"
      to: "supabase/.env.local"
      via: "env() substitution (unquoted)"
      pattern: "= env\\("
---

<objective>
Fix email verification code not being sent during registration by correcting the Supabase SMTP configuration syntax in config.toml.

Purpose: Quick task 5 added SMTP config but all `env()` references were wrapped in double quotes, making them literal strings instead of resolved environment variables. Supabase CLI treats `"env(SMTP_HOST)"` as the literal hostname string `env(SMTP_HOST)` rather than resolving the SMTP_HOST environment variable. Additionally, the local env vars used host-side addresses (127.0.0.1:54325) instead of Docker-internal addresses (inbucket:2500).

Output: Fixed config.toml with correct env() syntax + correct Docker-internal SMTP defaults so auth emails are delivered locally via Inbucket.
</objective>

<execution_context>
@/root/.claude/get-shit-done/workflows/execute-plan.md
@/root/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@.planning/STATE.md
@supabase/config.toml
@supabase/.env.local
</context>

<tasks>

<task type="auto">
  <name>Task 1: Fix SMTP env() syntax and Docker-internal defaults</name>
  <files>supabase/config.toml, supabase/.env.local</files>
  <action>
Two bugs need fixing:

**Bug 1 -- Quoted env() references in config.toml (lines 53-58):**
All `env()` references are wrapped in double quotes, e.g., `host = "env(SMTP_HOST)"`. Supabase CLI treats these as literal strings, not environment variable lookups. Remove the quotes from env() calls.

Change the `[auth.email.smtp]` section from:
```toml
host = "env(SMTP_HOST)"
port = "env(SMTP_PORT)"
user = "env(SMTP_USER)"
pass = "env(SMTP_PASS)"
admin_email = "env(SMTP_ADMIN_EMAIL)"
sender_name = "env(SMTP_SENDER_NAME)"
```

To:
```toml
host = env(SMTP_HOST)
port = env(SMTP_PORT)
user = env(SMTP_USER)
pass = env(SMTP_PASS)
admin_email = env(SMTP_ADMIN_EMAIL)
sender_name = env(SMTP_SENDER_NAME)
```

Note: `secure = false` is already correct (boolean, not env ref).

**Bug 2 -- Wrong SMTP host/port in .env.local:**
The Supabase auth service runs inside Docker. `127.0.0.1:54325` is the host-mapped port, but from inside Docker the Inbucket container is reachable at hostname `inbucket` on port `2500` (the internal SMTP port).

Change in `supabase/.env.local`:
- `SMTP_HOST=127.0.0.1` -> `SMTP_HOST=inbucket`
- `SMTP_PORT=54325` -> `SMTP_PORT=2500`

Keep all other SMTP_* values unchanged (SMTP_USER, SMTP_PASS, SMTP_ADMIN_EMAIL, SMTP_SENDER_NAME are correct).

Also fix the same quoting pattern for Google OAuth env() references (lines 71-72) which have the same bug:
```toml
client_id = "env(GOOGLE_CLIENT_ID)"   ->   client_id = env(GOOGLE_CLIENT_ID)
secret = "env(GOOGLE_CLIENT_SECRET)"  ->   secret = env(GOOGLE_CLIENT_SECRET)
```

Do NOT change any other settings (enable_confirmations, otp_length, site_url, etc.).
  </action>
  <verify>
    <automated>grep -n 'env(' /workspace/lumio/supabase/config.toml | grep -c '"env(' | xargs -I{} test {} -eq 0 && echo "PASS: no quoted env() references" || echo "FAIL: still has quoted env() references"</automated>
  </verify>
  <done>All env() references in config.toml are unquoted. SMTP_HOST is "inbucket" and SMTP_PORT is "2500" in .env.local. Supabase CLI can now resolve the environment variables properly and route auth emails to Inbucket inside Docker.</done>
</task>

<task type="checkpoint:human-verify" gate="blocking">
  <name>Task 2: Verify email delivery locally and configure production SMTP</name>
  <files>n/a</files>
  <action>Human verifies that the SMTP fix results in actual email delivery.</action>
  <what-built>Fixed SMTP configuration so Supabase auth emails are correctly routed to Inbucket in local development. For production, SMTP must be configured in the Supabase Dashboard.</what-built>
  <how-to-verify>
    1. Restart Supabase locally: `source supabase/.env.local && supabase stop && supabase start`
    2. Open the app and register with a new email+password
    3. Check Inbucket at http://127.0.0.1:54324 -- the verification email with the 6-digit OTP code should appear
    4. Enter the code in the app to verify it works end-to-end

    For PRODUCTION email delivery:
    5. Go to Supabase Dashboard -> Project Settings -> Authentication -> SMTP Settings
    6. Enable Custom SMTP and configure a real SMTP provider (Resend, SendGrid, etc.)
    7. Test registration on the production app
  </how-to-verify>
  <verify>Human confirms emails arrive in Inbucket locally</verify>
  <done>Verification email with OTP code is received after signup</done>
  <resume-signal>Type "approved" if emails arrive locally (and optionally in production), or describe any remaining issues</resume-signal>
</task>

</tasks>

<verification>
- `grep -c '"env(' supabase/config.toml` returns 0 (no quoted env refs)
- `grep 'SMTP_HOST' supabase/.env.local` shows `inbucket` (Docker-internal hostname)
- `grep 'SMTP_PORT' supabase/.env.local` shows `2500` (Docker-internal port)
- After `supabase stop && supabase start`, signup produces an email visible in Inbucket
</verification>

<success_criteria>
- All env() references in config.toml are unquoted so Supabase CLI resolves them
- Local SMTP defaults use Docker-internal addressing (inbucket:2500)
- Registration signup sends OTP email visible in Inbucket locally
- User is informed about production SMTP Dashboard configuration requirement
</success_criteria>

<output>
After completion, create `.planning/quick/7-fix-email-verification-code-not-being-se/7-SUMMARY.md`
</output>
