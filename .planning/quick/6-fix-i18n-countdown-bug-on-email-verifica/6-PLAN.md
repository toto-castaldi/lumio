---
phase: quick-6
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/android/screens/OtpVerificationScreen.tsx
  - apps/android/screens/ForgotPasswordScreen.tsx
  - apps/android/screens/UpdatePasswordScreen.tsx
  - apps/android/screens/SetPasswordOtpScreen.tsx
autonomous: true
requirements: [FIX-I18N-COUNTDOWN]

must_haves:
  truths:
    - "Countdown timer on OTP verification screen shows interpolated seconds value (e.g. 'Reinvia tra 51s') instead of missing-value marker"
    - "Same fix applied consistently across all 4 screens that use the resendIn countdown"
  artifacts:
    - path: "apps/android/screens/OtpVerificationScreen.tsx"
      provides: "Fixed countdown interpolation"
      contains: "t('auth.otp.resendIn', { seconds:"
    - path: "apps/android/screens/ForgotPasswordScreen.tsx"
      provides: "Fixed countdown interpolation"
      contains: "t('auth.otp.resendIn', { seconds:"
    - path: "apps/android/screens/UpdatePasswordScreen.tsx"
      provides: "Fixed countdown interpolation"
      contains: "t('auth.otp.resendIn', { seconds:"
    - path: "apps/android/screens/SetPasswordOtpScreen.tsx"
      provides: "Fixed countdown interpolation"
      contains: "t('auth.otp.resendIn', { seconds:"
  key_links:
    - from: "all 4 screen files"
      to: "i18n-js t() function"
      via: "options parameter with seconds key"
      pattern: "t\\('auth\\.otp\\.resendIn',\\s*\\{\\s*seconds:"
---

<objective>
Fix i18n countdown interpolation bug on email verification and related OTP screens.

Purpose: The countdown timer displays "Reinvia tra [missing "seconds" value]s" instead of "Reinvia tra 51s" because the code calls `t('auth.otp.resendIn').replace('%{seconds}', ...)` -- but `i18n-js` processes `%{seconds}` placeholders internally BEFORE `.replace()` runs. When no `seconds` option is passed to `t()`, i18n-js substitutes its missing-interpolation marker, and the subsequent `.replace()` finds nothing to replace.

Output: 4 fixed screen files using proper i18n-js interpolation
</objective>

<execution_context>
@/root/.claude/get-shit-done/workflows/execute-plan.md
@/root/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/android/screens/OtpVerificationScreen.tsx
@apps/android/screens/ForgotPasswordScreen.tsx
@apps/android/screens/UpdatePasswordScreen.tsx
@apps/android/screens/SetPasswordOtpScreen.tsx
@apps/android/i18n/en.ts
@apps/android/i18n/it.ts

<interfaces>
<!-- i18n-js t() function signature from I18nContext.tsx -->
t: (scope: string, options?: Record<string, unknown>) => string

<!-- Translation strings that use %{seconds} placeholder -->
EN: resendIn: 'Resend in %{seconds}s'
IT: resendIn: 'Reinvia tra %{seconds}s'

<!-- i18n-js supports interpolation natively: t('key', { seconds: 51 }) -->
<!-- produces "Reinvia tra 51s" correctly -->
</interfaces>
</context>

<tasks>

<task type="auto">
  <name>Task 1: Replace manual .replace() with i18n-js native interpolation in all 4 screens</name>
  <files>
    apps/android/screens/OtpVerificationScreen.tsx
    apps/android/screens/ForgotPasswordScreen.tsx
    apps/android/screens/UpdatePasswordScreen.tsx
    apps/android/screens/SetPasswordOtpScreen.tsx
  </files>
  <action>
In each of the 4 files, find the line:

```
{t('auth.otp.resendIn').replace('%{seconds}', String(cooldown))}
```

Replace it with:

```
{t('auth.otp.resendIn', { seconds: cooldown })}
```

This uses i18n-js's built-in interpolation (passing variables via the options object) instead of manually replacing placeholder strings after i18n-js has already processed them.

Root cause: i18n-js processes `%{...}` placeholders during `t()` call. When `seconds` is not in the options, it outputs `[missing "seconds" value]`. The subsequent `.replace('%{seconds}', ...)` finds nothing because the placeholder was already consumed.

Specific line numbers:
- OtpVerificationScreen.tsx: line 247
- ForgotPasswordScreen.tsx: line 170
- UpdatePasswordScreen.tsx: line 320
- SetPasswordOtpScreen.tsx: line 273
  </action>
  <verify>
    <automated>cd /workspace/lumio && grep -rn "\.replace('%{seconds}'" apps/android/screens/ | wc -l | xargs test 0 -eq && echo "PASS: no manual .replace remaining" || echo "FAIL: manual .replace still found"</automated>
  </verify>
  <done>All 4 screens use `t('auth.otp.resendIn', { seconds: cooldown })` instead of the broken `.replace()` pattern. Zero occurrences of `.replace('%{seconds}'` remain in the codebase. The countdown timer correctly displays interpolated values like "Reinvia tra 51s" (IT) or "Resend in 51s" (EN).</done>
</task>

</tasks>

<verification>
1. `grep -rn "\.replace('%{seconds}'" apps/android/screens/` returns no results (all manual replacements removed)
2. `grep -rn "t('auth.otp.resendIn', { seconds:" apps/android/screens/` returns exactly 4 results (one per screen)
3. TypeScript compiles: `cd apps/android && npx tsc --noEmit` passes (or at least these 4 files have no new errors)
</verification>

<success_criteria>
- The countdown timer on all OTP/verification screens displays the interpolated seconds value correctly (e.g., "Reinvia tra 51s" or "Resend in 51s")
- No manual `.replace('%{seconds}', ...)` calls remain in the codebase
- All 4 affected screens use i18n-js native interpolation via the options parameter
</success_criteria>

<output>
After completion, create `.planning/quick/6-fix-i18n-countdown-bug-on-email-verifica/6-01-SUMMARY.md`
</output>
