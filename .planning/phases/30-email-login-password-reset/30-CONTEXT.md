# Phase 30: Email Login & Password Reset - Context

**Gathered:** 2026-02-28
**Status:** Ready for planning

<domain>
## Phase Boundary

Users can log in with email/password and recover a forgotten password via OTP. This phase wires the existing AuthContext methods (signInWithEmail, resetPassword, updatePassword) into new UI screens and navigation. Login with email already works in LoginScreen — the main work is the forgot/reset password flow.

Requirements covered: AUTH-04, AUTH-05, AUTH-06.

</domain>

<decisions>
## Implementation Decisions

### Forgot Password Flow Structure
- Progressive steps on a single ForgotPasswordScreen (consistent with LoginScreen's progressive disclosure pattern)
- Step 1: Email input (pre-filled if navigated from LoginScreen with email param)
- Step 2: 6-digit OTP input (reuse same 6-box pattern from OtpVerificationScreen)
- Step 3: New password entry
- Entry point: LoginScreen's "Forgot password?" link only

### Password Reset OTP
- Reuse OtpVerificationScreen with a mode prop ('signup' | 'reset') or create the OTP+password flow within the ForgotPasswordScreen's progressive steps
- Same 60-second resend cooldown as signup flow
- Same shake animation on invalid/expired OTP codes
- Inline error display below OTP boxes (not toast) — consistent with signup OTP

### New Password Entry
- Single password field with eye toggle (matches SignUpScreen pattern)
- Show minimum length hint below field: "Minimum 6 characters"
- After OTP verified, reveal password fields on same screen

### Post-Reset Behavior
- Auto-login immediately after updatePassword succeeds (Supabase session already exists from OTP verification)
- Show success toast "Password updated!" before transition
- If user closes app mid-flow, resume from persisted RecoveryState on next open

### Error Handling
- Always show generic "check your email" after reset request (no email enumeration)
- Unverified email login attempt: show error + offer "Resend verification" link to OtpVerificationScreen
- Expired/invalid OTP: shake animation + inline error + resend option
- Google-only user requesting reset: same generic "check email" message (no info leakage)
- Invalid credentials: existing error handling in LoginScreen is sufficient

### Claude's Discretion
- Exact screen layout and spacing
- Whether to extract OTP input as shared component or duplicate within ForgotPasswordScreen
- Navigation animation transitions
- Keyboard handling details
- i18n key naming conventions (follow existing auth.* pattern)

</decisions>

<specifics>
## Specific Ideas

- LoginScreen already has a working "Forgot password?" TouchableOpacity (currently no-op, line 279-289) — just needs navigation wiring
- Pre-fill email from LoginScreen navigation param to avoid re-typing
- RecoveryState machine (idle/email_sent/link_clicked/updating) already persisted in AsyncStorage — leverage for app resume
- Follow same visual patterns as existing auth screens: same input heights (48), border radius (8), font sizes, colors from useTheme()

</specifics>

<code_context>
## Existing Code Insights

### Reusable Assets
- `AuthContext` (contexts/AuthContext.tsx): signInWithEmail, resetPassword, updatePassword, recoveryState — all implemented, just need UI wiring
- `OtpVerificationScreen` (screens/OtpVerificationScreen.tsx): 6-digit OTP input with auto-advance, auto-submit, paste support, shake animation, resend cooldown — pattern to reuse or adapt
- `SignUpScreen` (screens/SignUpScreen.tsx): Password field with eye toggle — pattern to follow
- `LoginScreen` (screens/LoginScreen.tsx): Progressive disclosure pattern (email step → password step) — same approach for forgot password
- Toast system: react-native-toast-message mounted at App root
- i18n: useI18n() hook with en.ts/it.ts translations

### Established Patterns
- Progressive disclosure for multi-step forms (LoginScreen)
- Per-operation loading booleans (signInLoading, resetLoading, updatePasswordLoading)
- Error display as inline Text with colors.danger
- KeyboardAvoidingView + ScrollView wrapper for all auth screens
- Navigation params for passing data between auth screens (e.g., OtpVerification receives { email })

### Integration Points
- AuthNavigator (navigation/AuthNavigator.tsx): Add ForgotPassword screen to AuthStackParamList
- LoginScreen "Forgot password?" link: Wire navigation.navigate('ForgotPassword', { email })
- LoginScreen "Email not confirmed" error: Add navigation to OtpVerification for resend
- AuthContext onAuthStateChange: PASSWORD_RECOVERY event already handled, sets recoveryState to 'link_clicked'
- i18n files: Add new keys for forgot password flow (en.ts, it.ts)

</code_context>

<deferred>
## Deferred Ideas

None — discussion stayed within phase scope.

</deferred>

---

*Phase: 30-email-login-password-reset*
*Context gathered: 2026-02-28*
