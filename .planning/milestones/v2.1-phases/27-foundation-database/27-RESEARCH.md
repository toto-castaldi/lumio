# Phase 27: Foundation & Database - Research

**Researched:** 2026-02-27
**Domain:** Supabase email auth configuration, database triggers, email templates
**Confidence:** HIGH

## Summary

Phase 27 configures Supabase for email/password authentication alongside the existing Google OAuth flow. The work is entirely backend/infrastructure: updating `config.toml` for email confirmations and manual identity linking, modifying the existing `handle_new_user` database trigger to handle email signups (where Google metadata is absent), and creating branded OTP email templates for signup confirmation and password reset.

The existing `handle_new_user` trigger (migration `20241230000003_auth_trigger.sql`) currently relies on `raw_user_meta_data->>'full_name'` and `raw_user_meta_data->>'avatar_url'` from Google OAuth. For email signups, these fields are null/empty, so the trigger must derive `display_name` from the email prefix and generate an `avatar_url` using an external initials avatar service.

**Primary recommendation:** Create a new SQL migration that replaces the `handle_new_user` function with provider-aware logic (Google metadata vs email prefix derivation), update `config.toml` with email auth settings, and add two branded HTML email templates to `supabase/templates/`.

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- OTP email branding: Minimal & functional tone, branded HTML layout with Lumio logo at top and brand colors, bilingual (English first, Italian translation below with subtle separator), subject lines include "Lumio", OTP code displayed large and prominent (centered, big font like a PIN display), footer includes safety disclaimer in both languages
- Two templates only: Confirm signup and Reset password (no magic link or change email)
- Display name derivation: Split email prefix on dots, underscores, hyphens, capitalize each word (john.doe@gmail.com -> "John Doe"). Use as-is for edge cases (numbers-only, single characters) -- no fallback placeholder
- avatar_url: Generate initials avatar URL using an avatar service (e.g. ui-avatars.com) with Lumio brand color as fixed background. Populated in DB trigger alongside display_name
- Email configuration: OTP code expiry 1 hour, email confirmation required before login, rate limiting Supabase defaults, enable_manual_linking enabled in Phase 27
- Email OTP display: Like bank/financial app OTP emails -- big centered number, impossible to miss
- Initials avatar: Consistent Lumio brand color (not per-user unique colors)

### Claude's Discretion
- Exact HTML/CSS for email templates (within the branded, minimal constraints above)
- DB trigger implementation details (PL/pgSQL logic)
- config.toml parameter specifics beyond the decisions above
- Avatar service choice and URL format

### Deferred Ideas (OUT OF SCOPE)
None -- discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| INFRA-01 | Database trigger handles email signups (no Google metadata) | Existing `handle_new_user` trigger identified in migration `20241230000003_auth_trigger.sql`. Must be replaced with provider-aware function that derives display_name from email prefix and generates avatar_url via ui-avatars.com when Google metadata absent. See Architecture Patterns and Code Examples sections. |
| INFRA-03 | Supabase config enables email confirmations and manual linking | Current `config.toml` has `enable_confirmations = false` and no `enable_manual_linking` setting. Must set `enable_confirmations = true`, add `enable_manual_linking = true`, set `otp_length = 6`, `otp_expiry = 3600`. See Standard Stack section. |
| INFRA-04 | OTP email templates customized with Lumio branding | No templates directory exists yet. Must create `supabase/templates/` with confirmation.html and recovery.html using `{{ .Token }}` variable for 6-digit OTP display. Config.toml needs `[auth.email.template.confirmation]` and `[auth.email.template.recovery]` sections. See Code Examples section. |
</phase_requirements>

## Standard Stack

### Core

No new libraries needed. This phase uses only Supabase built-in features:

| Component | Version | Purpose | Why Standard |
|-----------|---------|---------|--------------|
| Supabase config.toml | CLI v2.x | Email auth configuration | Built-in config system for local dev |
| PL/pgSQL | PostgreSQL 15 | Database trigger function | Native PostgreSQL procedural language |
| Go template engine | Built into GoTrue | Email template rendering | Supabase uses Go templates with `{{ .Token }}`, `{{ .Email }}`, etc. |
| ui-avatars.com | API v1 | Initials avatar generation | Free, no-auth API, URL-based, widely used |

### Supporting

| Component | Purpose | When to Use |
|-----------|---------|-------------|
| Inbucket | Local email capture and testing | Already configured on port 54324 -- use to verify OTP emails render correctly |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ui-avatars.com | DiceBear API, Gravatar | ui-avatars.com is simpler (URL params only), no API key needed, supports custom background color. DiceBear has more styles but more complex URLs. User decision locks avatar service approach. |

## Architecture Patterns

### Recommended File Structure

```
supabase/
├── config.toml                          # Updated: email auth + template refs
├── templates/
│   ├── confirmation.html                # NEW: Signup OTP email
│   └── recovery.html                    # NEW: Password reset OTP email
└── migrations/
    └── 2026MMDD000001_email_auth_trigger.sql  # NEW: Updated handle_new_user
```

### Pattern 1: Provider-Aware Trigger Function

**What:** The `handle_new_user` trigger must detect whether the signup came from Google OAuth (metadata present) or email/password (metadata absent) and handle each case accordingly.

**When to use:** Always -- this is the single trigger that fires on `auth.users` INSERT.

**How to detect provider:** Check `NEW.raw_user_meta_data->>'full_name'` -- if non-null, it's Google OAuth. If null, it's email signup. Alternative: check `NEW.raw_app_meta_data->>'provider'` which contains `'google'` or `'email'`.

**Key insight:** The `raw_app_meta_data->>'provider'` field is the most reliable way to detect the auth provider. For Google signups it's `'google'`, for email signups it's `'email'`.

### Pattern 2: Email Prefix to Display Name

**What:** Parse the local part of the email address (before @) and convert separators to spaces with title case.

**Logic:**
1. Extract prefix: `split_part(email, '@', 1)`
2. Replace `.`, `_`, `-` with spaces
3. Title-case each word (capitalize first letter of each word)
4. No fallback needed per user decision -- use as-is for edge cases

**Edge cases handled by "use as-is" decision:**
- `123@gmail.com` -> `"123"`
- `a@gmail.com` -> `"A"`
- `john.doe@gmail.com` -> `"John Doe"`
- `john_doe-smith@gmail.com` -> `"John Doe Smith"`

### Pattern 3: OTP Email Template with {{ .Token }}

**What:** Use `{{ .Token }}` in email templates instead of `{{ .ConfirmationURL }}` to show a 6-digit code that the user enters in-app.

**Why OTP over links:** Links can be consumed by email providers' spam detection (URL prefetching), OTP codes are more reliable especially on mobile. User decision locks this approach.

**Template variables available:**
- `{{ .Token }}` -- 6-digit OTP code
- `{{ .Email }}` -- User's email address
- `{{ .SiteURL }}` -- Configured site URL
- `{{ .TokenHash }}` -- Hashed token (not needed for OTP flow)
- `{{ .Data }}` -- User metadata (from signUp options.data)

### Pattern 4: Initials Avatar URL Generation in PL/pgSQL

**What:** Construct a ui-avatars.com URL from the derived display name directly in the database trigger.

**URL format:** `https://ui-avatars.com/api/?name=John+Doe&background=7C3AED&color=fff&size=128&bold=true`

**Key parameters:**
- `name` -- URL-encoded display name (spaces become `+`)
- `background` -- Hex color without `#` (Lumio purple: `7C3AED`)
- `color` -- Font color hex without `#` (white: `fff`)
- `size` -- Pixel size (128 is a good default)
- `bold` -- `true` for better visibility

### Anti-Patterns to Avoid

- **Dropping and recreating the trigger:** Use `CREATE OR REPLACE FUNCTION` to update the function body. The trigger itself (`on_auth_user_created`) does not need to be recreated since it just references the function name.
- **Using DROP COLUMN in migration:** Per project rules, SQL migrations must never cause data loss.
- **Hardcoding provider detection with string matching on email:** Use `raw_app_meta_data->>'provider'` instead -- more reliable than checking if metadata fields are null.
- **Using ConfirmationURL in templates:** Since the app uses OTP verification (entering code in-app), templates should use `{{ .Token }}` not `{{ .ConfirmationURL }}`.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Avatar generation | Custom SVG/image generation service | ui-avatars.com API URL | Handles font rendering, sizing, encoding; free and reliable |
| Email template rendering | Custom email sending function | Supabase GoTrue built-in templates | Handles SMTP, rate limiting, token generation, expiry |
| OTP code generation | Custom random code generator | Supabase `{{ .Token }}` | Cryptographically secure, managed expiry, replay protection |
| Title-case conversion | Custom regex replacements | PL/pgSQL `initcap()` function | PostgreSQL built-in, handles unicode properly |

**Key insight:** The entire OTP flow (code generation, email delivery, expiry, verification) is handled by Supabase GoTrue. Phase 27 only needs to configure it and provide templates.

## Common Pitfalls

### Pitfall 1: Trigger Failure Blocks Signups
**What goes wrong:** If the `handle_new_user` trigger throws an exception, the entire `INSERT` into `auth.users` is rolled back, and the signup fails silently.
**Why it happens:** PL/pgSQL triggers run in the same transaction as the triggering statement. An unhandled exception (e.g., from a constraint violation or null pointer) aborts the transaction.
**How to avoid:** Use `COALESCE` and null-safe operations throughout the trigger. Test with edge-case emails. Consider wrapping the body in an exception handler as a safety net, but prefer defensive null handling.
**Warning signs:** Signups that fail with no clear error message, or signups that work with Google but fail with email.

### Pitfall 2: config.toml Changes Require Restart
**What goes wrong:** Updating `config.toml` settings has no effect on the running Supabase instance.
**Why it happens:** `config.toml` is read at startup time. Unlike migrations, config changes are not hot-reloaded.
**How to avoid:** After changing `config.toml`, run `supabase stop && source supabase/.env.local && supabase start` to apply changes. For template HTML file changes, also restart.
**Warning signs:** Settings appear correct in config but behavior doesn't match.

### Pitfall 3: enable_confirmations Changes Signup Flow
**What goes wrong:** After enabling `enable_confirmations = true`, the `signUp()` call returns `{ user, session: null }` instead of `{ user, session }`. Frontend code that expects an immediate session will break.
**Why it happens:** With confirmations enabled, users must verify their email before getting a session.
**How to avoid:** This is expected behavior and will be handled in Phase 29 (signup UI). Phase 27 just enables the setting; the existing Google OAuth flow is unaffected because OAuth users are already confirmed via the provider.
**Warning signs:** N/A for Phase 27 -- this is a Phase 29 concern, but important to document.

### Pitfall 4: Template content_path Relative Resolution
**What goes wrong:** Templates not found because the `content_path` is relative to the wrong directory.
**Why it happens:** The `content_path` in `config.toml` is relative to the project root (where `supabase/` directory lives), not relative to `config.toml` itself.
**How to avoid:** Use `./supabase/templates/confirmation.html` (from project root) in the config.
**Warning signs:** Supabase start fails or emails use default templates instead of custom ones.

### Pitfall 5: initcap() Behavior with Apostrophes and Special Characters
**What goes wrong:** PostgreSQL's `initcap()` capitalizes after every non-alphanumeric character. `o'brien` becomes `O'Brien` (correct), but `mcdonald` stays `Mcdonald`.
**Why it happens:** `initcap()` treats separators as word boundaries.
**How to avoid:** This is acceptable per the user decision ("use as-is for edge cases"). Don't over-engineer name parsing.
**Warning signs:** None -- this is expected behavior and explicitly accepted.

## Code Examples

### Updating config.toml for Email Auth

```toml
# Source: Supabase CLI config template + official docs
# https://supabase.com/docs/guides/cli/config

[auth]
enabled = true
site_url = "http://localhost:5173"
# ... existing settings ...
enable_manual_linking = true

[auth.email]
enable_signup = true
double_confirm_changes = true
enable_confirmations = true
otp_length = 6
otp_expiry = 3600
max_frequency = "1s"

[auth.email.template.confirmation]
subject = "Lumio - Your verification code"
content_path = "./supabase/templates/confirmation.html"

[auth.email.template.recovery]
subject = "Lumio - Password reset code"
content_path = "./supabase/templates/recovery.html"
```

### Provider-Aware handle_new_user Function

```sql
-- Source: Existing migration 20241230000003_auth_trigger.sql (current project)
-- Updated to handle email signups alongside Google OAuth

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    _provider TEXT;
    _display_name TEXT;
    _avatar_url TEXT;
    _email_prefix TEXT;
BEGIN
    -- Detect auth provider
    _provider := COALESCE(NEW.raw_app_meta_data->>'provider', 'email');

    IF _provider = 'google' THEN
        -- Google OAuth: use metadata directly
        _display_name := COALESCE(
            NEW.raw_user_meta_data->>'full_name',
            NEW.raw_user_meta_data->>'name'
        );
        _avatar_url := NEW.raw_user_meta_data->>'avatar_url';
    ELSE
        -- Email signup: derive from email address
        _email_prefix := split_part(COALESCE(NEW.email, ''), '@', 1);
        -- Replace dots, underscores, hyphens with spaces, then title-case
        _display_name := initcap(
            replace(replace(replace(_email_prefix, '.', ' '), '_', ' '), '-', ' ')
        );
        -- Generate initials avatar with Lumio brand color
        _avatar_url := 'https://ui-avatars.com/api/?name='
            || replace(_display_name, ' ', '+')
            || '&background=7C3AED&color=fff&size=128&bold=true';
    END IF;

    INSERT INTO public.users (id, email, display_name, avatar_url)
    VALUES (
        NEW.id,
        NEW.email,
        _display_name,
        _avatar_url
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

### Email Template: Confirmation (confirmation.html)

```html
<!-- Source: Supabase email template docs -->
<!-- https://supabase.com/docs/guides/local-development/customizing-email-templates -->
<!-- Variables: {{ .Token }} = 6-digit OTP, {{ .Email }} = user email -->

<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; background-color:#f5f5f5; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="max-width:480px; margin:0 auto; background:#ffffff; border-radius:12px; overflow:hidden; margin-top:40px;">
    <!-- Logo header -->
    <tr>
      <td style="background:#7C3AED; padding:24px; text-align:center;">
        <span style="color:#ffffff; font-size:28px; font-weight:bold; letter-spacing:1px;">LUMIO</span>
      </td>
    </tr>
    <!-- EN section -->
    <tr>
      <td style="padding:32px 24px 16px;">
        <p style="color:#333; font-size:16px; margin:0 0 8px;">Your verification code:</p>
        <div style="background:#f0ecf9; border-radius:8px; padding:20px; text-align:center; margin:16px 0;">
          <span style="font-size:36px; font-weight:bold; letter-spacing:8px; color:#7C3AED;">{{ .Token }}</span>
        </div>
        <p style="color:#666; font-size:14px; margin:8px 0 0;">Enter this code in the app to verify your email.</p>
      </td>
    </tr>
    <!-- Separator -->
    <tr>
      <td style="padding:0 24px;">
        <hr style="border:none; border-top:1px solid #e5e7eb; margin:16px 0;">
      </td>
    </tr>
    <!-- IT section -->
    <tr>
      <td style="padding:0 24px 32px;">
        <p style="color:#333; font-size:16px; margin:0 0 8px;">Il tuo codice di verifica:</p>
        <div style="background:#f0ecf9; border-radius:8px; padding:20px; text-align:center; margin:16px 0;">
          <span style="font-size:36px; font-weight:bold; letter-spacing:8px; color:#7C3AED;">{{ .Token }}</span>
        </div>
        <p style="color:#666; font-size:14px; margin:8px 0 0;">Inserisci questo codice nell'app per verificare la tua email.</p>
      </td>
    </tr>
    <!-- Footer -->
    <tr>
      <td style="background:#f9fafb; padding:16px 24px; border-top:1px solid #e5e7eb;">
        <p style="color:#999; font-size:12px; margin:0; text-align:center;">
          If you didn't request this code, you can safely ignore this email.<br>
          Se non hai richiesto questo codice, puoi ignorare questa email.
        </p>
      </td>
    </tr>
  </table>
</body>
</html>
```

### Email Template: Recovery (recovery.html)

```html
<!-- Variables: {{ .Token }} = 6-digit OTP for password reset -->
<!-- Same structure as confirmation but with reset messaging -->
<!-- Subject: "Lumio - Password reset code" -->
```

The recovery template follows the same layout pattern (logo header, EN block, separator, IT block, footer disclaimer) but with password-reset-specific copy.

### Verifying OTP in Frontend (Phase 29 reference)

```typescript
// Source: Supabase JS docs
// https://supabase.com/docs/reference/javascript/auth-verifyotp
// NOTE: This code is for Phase 29, not Phase 27. Documented here for context.

const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '123456',
  type: 'email',  // NOT 'signup' (deprecated)
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `type: 'signup'` in verifyOtp | `type: 'email'` in verifyOtp | Supabase Auth v2.x (2024) | `signup` type is deprecated; use `email` for post-signup OTP verification |
| `{{ .ConfirmationURL }}` link-based | `{{ .Token }}` OTP-based | Always available, recommended for mobile | OTP avoids link prefetching issues from email providers |
| Global config only | `config.toml` per-project | Supabase CLI v1.x+ | Local dev config now supports all auth settings including templates |

**Deprecated/outdated:**
- `verifyOtp({ type: 'signup' })` -- use `type: 'email'` instead
- `verifyOtp({ type: 'magiclink' })` -- use `type: 'email'` instead

## Open Questions

1. **url-encoding special characters in display_name for avatar URL**
   - What we know: PL/pgSQL `replace()` handles spaces -> `+`, and `initcap()` handles basic title casing
   - What's unclear: If email prefix contains characters that need URL-encoding beyond spaces (e.g., `%`, `&`, `+`), the avatar URL could break
   - Recommendation: This is an edge case for email prefixes. Use simple `replace(name, ' ', '+')` -- ui-avatars.com handles most input gracefully. If issues arise, can add URL encoding later.

2. **Google OAuth users and enable_manual_linking interaction**
   - What we know: `enable_manual_linking = true` is needed for Phase 31 (account linking). Setting it now should not affect existing Google OAuth flow.
   - What's unclear: Whether enabling manual linking changes any default behavior for new Google signups
   - Recommendation: LOW risk. The setting only enables the `linkIdentity()` API -- it does not change automatic behavior. Safe to enable now.

## Sources

### Primary (HIGH confidence)
- Supabase official docs: [Customizing Email Templates](https://supabase.com/docs/guides/local-development/customizing-email-templates) -- template config.toml syntax, content_path, template variables
- Supabase official docs: [Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) -- template types, `{{ .Token }}` variable, available variables
- Supabase official docs: [Passwords](https://supabase.com/docs/guides/auth/passwords) -- signup confirmation flow, OTP verification
- Supabase official docs: [CLI Config](https://supabase.com/docs/guides/cli/config) -- all config.toml auth settings
- Supabase CLI config template: [config.toml](https://github.com/supabase/cli/blob/develop/pkg/config/templates/config.toml) -- default values for all settings
- Context7 /supabase/supabase -- email template configuration, notification templates
- Existing codebase: `supabase/migrations/20241230000003_auth_trigger.sql` -- current trigger implementation
- Existing codebase: `supabase/config.toml` -- current auth configuration
- ui-avatars.com: [API documentation](https://ui-avatars.com/) -- URL format, parameters

### Secondary (MEDIUM confidence)
- Supabase official docs: [verifyOtp reference](https://supabase.com/docs/reference/javascript/auth-verifyotp) -- OTP type deprecation (`signup` -> `email`)
- Supabase official docs: [signUp reference](https://supabase.com/docs/reference/javascript/auth-signup) -- raw_user_meta_data behavior

### Tertiary (LOW confidence)
- None -- all findings verified with official sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- all components are built-in Supabase features with official documentation
- Architecture: HIGH -- trigger pattern is standard PostgreSQL, template system is well-documented
- Pitfalls: HIGH -- verified through official docs and existing project experience with Supabase

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable Supabase features, unlikely to change)
