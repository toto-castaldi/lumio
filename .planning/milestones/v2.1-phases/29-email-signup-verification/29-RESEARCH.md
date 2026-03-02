# Phase 29: Email Signup & Verification - Research

**Researched:** 2026-02-27
**Domain:** Supabase email auth + React Native screens + OTP verification UX
**Confidence:** HIGH

<user_constraints>
## User Constraints (from CONTEXT.md)

### Locked Decisions
- Google button and email form have equal visual weight — neither is "primary"
- Separator is a horizontal line with "oppure" / "or" text centered in it
- Email-first flow: login screen shows email field + "Continua" button initially
- After entering email and tapping "Continua", password field reveals on the same screen (email becomes read-only)
- "Forgot password?" link appears alongside password field (navigates in Phase 30)
- Signup fields: email + password only (display name derived from email prefix via Phase 27 trigger)
- Single password field with show/hide eye toggle — no confirm password field
- Password requirements shown on error only, not upfront
- After successful signup: auto-navigate to OTP verification screen with brief toast ("Code sent to your email")
- 6 separate digit boxes in a row, auto-focus advances to next box
- Auto-submit when all 6 digits are entered — no manual "Verifica" button needed
- Resend code with cooldown timer (e.g., "Resend in 58s") before allowing retry
- Verification screen shows the email address the code was sent to for context
- Full screen stack navigation (standard push, back arrow to go back)
- After successful OTP verification: straight to home — no intermediate welcome screen
- Login → Signup: standard stack push
- Signup → OTP verification: replace or push (user completed signup step)
- If email is already registered (e.g., via Google), show a friendly error guiding user to sign in instead
- Error message uses the i18n keys from Phase 28

### Claude's Discretion
- "Non hai un account? Registrati" link placement on login screen
- OTP wrong code behavior (shake + clear vs error message with digits preserved)
- OTP back button destination (back to signup vs back to login)
- Exact cooldown timer duration for resend
- Keyboard behavior and auto-focus patterns
- Loading indicators during signup and verification API calls

### Deferred Ideas (OUT OF SCOPE)
None — discussion stayed within phase scope
</user_constraints>

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| AUTH-01 | User can sign up with email and password | `signUpWithEmail()` already in AuthContext (Phase 28), new SignUpScreen calls it; Supabase `signUp()` returns `data.user` with `session: null` when confirmations enabled |
| AUTH-02 | User receives OTP code via email after signup | Supabase config has `enable_confirmations = true` and `otp_length = 6`; confirmation.html template uses `{{ .Token }}`; email sent automatically by Supabase on signup |
| AUTH-03 | User can verify email by entering 6-digit OTP code in-app | `supabase.auth.verifyOtp({ email, token, type: 'email' })` completes verification and creates session; `onAuthStateChange` fires `SIGNED_IN` |
| INFRA-05 | Login screen shows Google OAuth button on top and email form below with separator | Redesign LoginScreen layout: Google button, separator with "oppure"/"or", email-first form with progressive disclosure |
</phase_requirements>

## Summary

Phase 29 builds three screens (redesigned Login, new SignUp, new OTP Verification) on top of Phase 28's AuthContext infrastructure. The backend is fully ready: Supabase config has `enable_confirmations = true`, `otp_length = 6`, custom OTP email templates exist, and `signUpWithEmail()` is already implemented in AuthContext with duplicate-email detection (`email_exists` error on empty identities array).

The core technical challenge is the OTP verification screen UX (6 separate digit boxes with auto-advance and auto-submit) and the login screen redesign with email-first progressive disclosure (email field + "Continua" button, then reveal password). The Supabase JS client `verifyOtp({ email, token, type: 'email' })` method handles verification and automatically creates a session, which triggers `onAuthStateChange` and navigates the user to the home screen.

The AuthNavigator needs expansion from a single Login screen to a 3-screen stack (Login, SignUp, OtpVerification). All screens use the established patterns: `useAuth()` for auth operations, `useTheme()` for colors, `useI18n()` for translations, and `react-native-toast-message` for notifications.

**Primary recommendation:** Build the three screens in the AuthNavigator stack, adding `verifyOtp` and `resendOtp` methods to AuthContext, and adding new i18n keys for OTP-specific UI strings.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@supabase/supabase-js` | ^2.45.0 | `auth.verifyOtp()`, `auth.resend()` | Already installed; provides OTP verification and resend APIs |
| `@react-navigation/native-stack` | ^7.12.0 | Stack navigation for auth flow | Already installed; AuthNavigator already uses it |
| `react-native` TextInput | 0.81.5 | Email, password, OTP digit inputs | Core RN component, no external dependency needed |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `react-native-toast-message` | ^2.3.3 | Toast for "Code sent to your email" | Already installed; used throughout the app |
| `@expo/vector-icons` (Ionicons) | ^15.0.3 | Eye icon for password show/hide toggle | Already installed; used in AddRepoForm |
| `expo-haptics` | ^15.0.8 | Optional haptic feedback on OTP digit entry | Already installed; could enhance UX |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| 6 separate TextInputs for OTP | `react-native-otp-entry` or `react-native-otp-input` | External dependency for something achievable with 6 TextInputs; user decision prefers no new deps when avoidable |
| Custom password visibility toggle | `react-native-elements` Input | Overkill; a simple eye icon TouchableOpacity suffices |

**Installation:**
No new packages needed. All required libraries are already installed.

## Architecture Patterns

### Recommended Project Structure
```
apps/android/
├── screens/
│   ├── LoginScreen.tsx          # REDESIGN: Google + email-first progressive disclosure
│   ├── SignUpScreen.tsx          # NEW: email + password + eye toggle
│   └── OtpVerificationScreen.tsx # NEW: 6-digit boxes with auto-advance/auto-submit
├── navigation/
│   └── AuthNavigator.tsx         # EXTEND: Login → SignUp → OtpVerification stack
├── contexts/
│   └── AuthContext.tsx           # EXTEND: add verifyOtp + resendOtp methods
└── i18n/
    ├── en.ts                     # EXTEND: auth.otp.* keys
    └── it.ts                     # EXTEND: auth.otp.* keys
```

### Pattern 1: Progressive Disclosure Login (Email-First)
**What:** Login screen shows only email + "Continua" button initially. After email entry, password field reveals and email becomes read-only.
**When to use:** The login screen redesign (INFRA-05).
**Example:**
```typescript
// LoginScreen state machine
const [step, setStep] = useState<'email' | 'password'>('email');
const [email, setEmail] = useState('');

const handleContinue = () => {
  if (validateEmail(email)) {
    setStep('password');
  }
};

// In JSX: when step === 'email', show email + Continua button
// When step === 'password', show email (read-only) + password + sign-in button
```

### Pattern 2: OTP Digit Box Auto-Advance
**What:** 6 separate TextInput refs, each accepting 1 digit. On change, auto-focus next. On backspace of empty field, focus previous.
**When to use:** OTP verification screen.
**Example:**
```typescript
// Source: Standard React Native OTP pattern
const inputRefs = useRef<Array<TextInput | null>>([]);
const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);

const handleChange = (text: string, index: number) => {
  const newDigits = [...digits];
  newDigits[index] = text;
  setDigits(newDigits);

  if (text && index < 5) {
    inputRefs.current[index + 1]?.focus();
  }

  // Auto-submit when all filled
  if (newDigits.every(d => d !== '')) {
    handleVerify(newDigits.join(''));
  }
};

const handleKeyPress = (e: NativeSyntheticEvent<TextInputKeyPressEventData>, index: number) => {
  if (e.nativeEvent.key === 'Backspace' && !digits[index] && index > 0) {
    inputRefs.current[index - 1]?.focus();
  }
};
```

### Pattern 3: Clipboard Paste Support for OTP
**What:** Detect when user pastes a 6-digit code (from SMS/email), distribute digits across all boxes.
**When to use:** OTP verification screen for better UX.
**Example:**
```typescript
const handleChange = (text: string, index: number) => {
  // Handle paste: if text is longer than 1 char, it's a paste
  if (text.length > 1) {
    const pastedDigits = text.replace(/\D/g, '').slice(0, 6).split('');
    const newDigits = [...digits];
    pastedDigits.forEach((d, i) => { newDigits[i] = d; });
    setDigits(newDigits);
    // Focus last filled or submit
    if (pastedDigits.length === 6) {
      handleVerify(newDigits.join(''));
    } else {
      inputRefs.current[pastedDigits.length]?.focus();
    }
    return;
  }
  // Normal single-digit handling...
};
```

### Pattern 4: Resend Cooldown Timer
**What:** After sending/resending OTP, disable resend button for N seconds with a countdown.
**When to use:** OTP verification screen to prevent spam.
**Example:**
```typescript
const COOLDOWN_SECONDS = 60;
const [cooldown, setCooldown] = useState(COOLDOWN_SECONDS);

useEffect(() => {
  if (cooldown <= 0) return;
  const timer = setInterval(() => {
    setCooldown(prev => prev - 1);
  }, 1000);
  return () => clearInterval(timer);
}, [cooldown]);

const handleResend = async () => {
  await supabase.auth.resend({ type: 'signup', email });
  setCooldown(COOLDOWN_SECONDS);
};
```

### Pattern 5: Supabase verifyOtp in AuthContext
**What:** Add `verifyEmailOtp` method to AuthContext that calls `supabase.auth.verifyOtp()`.
**When to use:** Called from OTP verification screen after user enters 6 digits.
**Example:**
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-verifyotp
const verifyEmailOtp = useCallback(async (email: string, token: string): Promise<void> => {
  setVerifyLoading(true);
  try {
    const { error } = await getSupabaseClient().auth.verifyOtp({
      email,
      token,
      type: 'email',  // NOT 'signup' (deprecated)
    });
    if (error) throw error;
    // onAuthStateChange fires SIGNED_IN, session auto-updates, state → 'ready'
  } finally {
    setVerifyLoading(false);
  }
}, []);
```

### Anti-Patterns to Avoid
- **Using `type: 'signup'` in verifyOtp:** Deprecated. Use `type: 'email'` instead. Source: [Supabase verifyOtp docs](https://supabase.com/docs/reference/javascript/auth-verifyotp).
- **Manually setting session after verification:** `onAuthStateChange` already handles this — let the existing subscription in AuthContext propagate the state change.
- **Creating a "Welcome" screen after verification:** User decision explicitly says "straight to home — no intermediate welcome screen."
- **Using controlled TextInput for each OTP digit with single state string:** Creates re-render storms. Use array of 6 individual digit strings instead.
- **Adding new native dependencies for OTP input:** 6 standard TextInputs with refs is the proven approach in this project's pattern of minimal dependencies.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| OTP sending/verification | Custom email sending + token matching | Supabase `auth.signUp()` + `auth.verifyOtp()` + `auth.resend()` | Supabase handles token generation, storage, expiry, rate limiting |
| Duplicate email detection | Custom DB query to check existence | AuthContext `signUpWithEmail` already detects via `identities.length === 0` | Phase 28 already built this — throws `email_exists` error |
| Session creation after verification | Manual JWT generation | Supabase `verifyOtp()` auto-creates session, `onAuthStateChange` propagates | AuthContext subscription handles state transition to 'ready' |
| Email validation | Complex regex | Basic format check (`/.+@.+\..+/`) + let Supabase validate | Supabase returns proper error for invalid emails |
| Password strength validation | Custom rules | Let Supabase enforce (6 char min) + show error from i18n keys | Phase 28 already has `auth.signup.weakPassword` key |

**Key insight:** The entire email auth backend is already configured (Phase 27 infra + Phase 28 context). This phase is purely UI screens that wire into existing AuthContext methods.

## Common Pitfalls

### Pitfall 1: OTP type parameter wrong
**What goes wrong:** Using `type: 'signup'` (deprecated) in `verifyOtp()` causes errors or unexpected behavior.
**Why it happens:** Old documentation and examples still show `type: 'signup'`.
**How to avoid:** Use `type: 'email'` for email-based OTP verification after signup.
**Warning signs:** Error messages mentioning invalid token type or unexpected verification failure.

### Pitfall 2: Keyboard covering OTP input on Android
**What goes wrong:** The numeric keyboard pushes the OTP boxes off-screen or covers the resend button.
**Why it happens:** Android's soft keyboard behavior differs from iOS; `KeyboardAvoidingView` has quirks on Android.
**How to avoid:** Use `android:windowSoftInputMode="adjustResize"` (already set by Expo default) and wrap content in `ScrollView` or `KeyboardAvoidingView` with `behavior="padding"`. Test on actual device.
**Warning signs:** OTP boxes hidden behind keyboard, user can't see what they're typing.

### Pitfall 3: Auto-submit fires before paste completes
**What goes wrong:** When user pastes a 6-digit code, onChange fires per-character, triggering premature auto-submit with incomplete digits.
**Why it happens:** React Native TextInput onChange can fire multiple times during paste.
**How to avoid:** In the onChange handler, check if the incoming text length > 1 (paste scenario) and handle all digits at once before checking for auto-submit.
**Warning signs:** Verification fails intermittently when users paste codes but works when typing manually.

### Pitfall 4: Navigation state after OTP verification
**What goes wrong:** After successful verification, user presses back and ends up on OTP screen or signup screen instead of being fully logged in.
**Why it happens:** Stack navigation keeps previous screens in history.
**How to avoid:** The AuthContext state change to 'ready' causes AppNavigator to switch from AuthNavigator to MainNavigator entirely — the auth stack is unmounted. This is already handled by the existing `if (state === 'logged_out') return <AuthNavigator />` pattern. No manual navigation reset needed.
**Warning signs:** None likely — the existing architecture handles this correctly.

### Pitfall 5: Race condition between toast and navigation
**What goes wrong:** Toast "Code sent to your email" appears on the wrong screen or not at all.
**Why it happens:** Navigation happens before toast is rendered, or toast renders on old screen that's about to unmount.
**How to avoid:** Show toast first, then navigate with a small delay, or show toast on the destination screen (OTP screen) using `useEffect` on mount.
**Warning signs:** Toast flashes briefly or doesn't appear.

### Pitfall 6: Resend OTP uses different API than expected
**What goes wrong:** Calling `signUp()` again to resend the code creates duplicate entries or errors.
**Why it happens:** Confusion between signup and resend flows.
**How to avoid:** Use `supabase.auth.resend({ type: 'signup', email })` specifically for resending the confirmation OTP. Note: the `resend` method uses `type: 'signup'` (not `'email'`), while `verifyOtp` uses `type: 'email'`.
**Warning signs:** Duplicate user errors or rate limiting errors on what should be a simple resend.

## Code Examples

Verified patterns from official sources:

### Supabase verifyOtp for Email Signup Confirmation
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-verifyotp
const { data, error } = await supabase.auth.verifyOtp({
  email: 'user@example.com',
  token: '123456',
  type: 'email',
});
// On success: data.session is populated, onAuthStateChange fires SIGNED_IN
```

### Supabase Resend Signup Confirmation OTP
```typescript
// Source: https://supabase.com/docs/reference/javascript/auth-resend
const { error } = await supabase.auth.resend({
  type: 'signup',
  email: 'user@example.com',
});
// On success: new OTP sent to email, old one invalidated
```

### AuthNavigator Stack with 3 Screens
```typescript
// Source: react-navigation docs + project pattern
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  OtpVerification: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

export function AuthNavigator() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
    </Stack.Navigator>
  );
}
```

### Password Visibility Toggle Pattern
```typescript
const [showPassword, setShowPassword] = useState(false);

<View style={styles.passwordRow}>
  <TextInput
    secureTextEntry={!showPassword}
    value={password}
    onChangeText={setPassword}
    // ...other props
  />
  <TouchableOpacity onPress={() => setShowPassword(!showPassword)}>
    <Ionicons
      name={showPassword ? 'eye-off-outline' : 'eye-outline'}
      size={22}
      color={colors.textSecondary}
    />
  </TouchableOpacity>
</View>
```

### Login Screen Separator Pattern
```typescript
// "oppure" / "or" centered in horizontal line
<View style={styles.separatorContainer}>
  <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
  <Text style={[styles.separatorText, { color: colors.textSecondary }]}>
    {t('auth.login.or')}
  </Text>
  <View style={[styles.separatorLine, { backgroundColor: colors.border }]} />
</View>

// Styles:
separatorContainer: { flexDirection: 'row', alignItems: 'center', marginVertical: 24 },
separatorLine: { flex: 1, height: 1 },
separatorText: { marginHorizontal: 16, fontSize: 14 },
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `verifyOtp({ type: 'signup' })` | `verifyOtp({ type: 'email' })` | Supabase JS v2.x | `'signup'` type is deprecated; `'email'` is correct for post-signup OTP |
| Magic link email confirmation | OTP code verification | Project decision (Phase 27) | Templates use `{{ .Token }}` not `{{ .ConfirmationURL }}`; in-app verification instead of browser redirect |
| Confirm password field | Single password + eye toggle | User decision (Phase 29) | Simpler signup form, fewer friction points |

**Deprecated/outdated:**
- `verifyOtp({ type: 'signup' })`: Deprecated in Supabase JS. Use `type: 'email'` instead.
- `supabase.auth.signUp()` for resending: Use `supabase.auth.resend({ type: 'signup' })` instead.

## Open Questions

1. **Resend type asymmetry**
   - What we know: `verifyOtp` uses `type: 'email'` but `resend` uses `type: 'signup'`.
   - What's unclear: Whether this asymmetry is intentional or a Supabase API inconsistency.
   - Recommendation: Use both as documented. The APIs are distinct endpoints with different type enums. LOW risk — official docs confirm both.

2. **OTP expiry handling**
   - What we know: Supabase config has `otp_expiry = 3600` (1 hour).
   - What's unclear: What exact error message Supabase returns when an OTP is expired.
   - Recommendation: Catch any verifyOtp error and display it via i18n. Add a specific `auth.otp.expired` key. Test locally with Inbucket (http://127.0.0.1:54324).

## Discretion Recommendations

Based on research, here are recommendations for areas left to Claude's discretion:

1. **"Registrati" link placement:** Below the email form, right-aligned or center-aligned, with text "Non hai un account? Registrati" where "Registrati" is a tappable link. Consistent with common mobile patterns.

2. **OTP wrong code behavior:** Shake animation + clear all digits. This is the more polished UX — preserving digits after a wrong code is confusing (user doesn't know which digit was wrong). A shake provides immediate negative feedback.

3. **OTP back button destination:** Back to Login (not signup). After signup succeeded, the user is in verification flow. Going back to signup is confusing (they already signed up). Back to login lets them try signing in via Google if they prefer.

4. **Cooldown timer duration:** 60 seconds. Industry standard for OTP resend cooldowns.

5. **Keyboard behavior:** Auto-focus first digit on OTP screen mount. Numeric keyboard type (`keyboardType="number-pad"`). Auto-focus email field on Login/SignUp screen mount.

6. **Loading indicators:** Use `ActivityIndicator` inline in buttons (replacing button text) during API calls, matching the existing pattern from AddRepoForm.

## New i18n Keys Needed

The following keys need to be added to `auth.otp.*` namespace in both `en.ts` and `it.ts`:

```
auth.otp.title            → "Verify Your Email" / "Verifica la tua Email"
auth.otp.subtitle         → "Enter the 6-digit code sent to" / "Inserisci il codice a 6 cifre inviato a"
auth.otp.resend           → "Resend code" / "Reinvia codice"
auth.otp.resendIn         → "Resend in %{seconds}s" / "Reinvia tra %{seconds}s"
auth.otp.invalidCode      → "Invalid code. Please try again." / "Codice non valido. Riprova."
auth.otp.expired          → "Code expired. Please request a new one." / "Codice scaduto. Richiedine uno nuovo."
auth.otp.resent           → "New code sent" / "Nuovo codice inviato"
auth.otp.verifying        → "Verifying..." / "Verifica in corso..."
```

Additional keys for login screen redesign:
```
auth.login.continue       → "Continue" / "Continua"
auth.login.signInAction   → "Sign in" / "Accedi"
auth.login.signingIn      → "Signing in..." / "Accesso in corso..."
auth.signup.signingUp     → "Signing up..." / "Registrazione in corso..."
auth.signup.codeSentToast → "Code sent to your email" / "Codice inviato alla tua email"
```

## Sources

### Primary (HIGH confidence)
- [Supabase JS - verifyOtp](https://supabase.com/docs/reference/javascript/auth-verifyotp) - Verified `type: 'email'` for post-signup OTP, `type: 'signup'` deprecated
- [Supabase JS - resend](https://supabase.com/docs/reference/javascript/auth-resend) - Verified `type: 'signup'` for resending confirmation email
- [Supabase JS - signUp](https://supabase.com/docs/reference/javascript/auth-signup) - Session null when confirmations enabled
- Context7 `/supabase/supabase-js` - verifyOtp API shape, signUp response structure
- Context7 `/react-navigation/react-navigation.github.io` - `replace()`, `push()`, stack navigation TypeScript patterns
- Existing codebase: AuthContext.tsx, AuthNavigator.tsx, LoginScreen.tsx, config.toml

### Secondary (MEDIUM confidence)
- [Supabase Password Auth guide](https://supabase.com/docs/guides/auth/passwords) - Email confirmation flow
- [Supabase Email Templates](https://supabase.com/docs/guides/auth/auth-email-templates) - Template variable `{{ .Token }}`

### Tertiary (LOW confidence)
- None — all findings verified with primary sources

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All libraries already installed, APIs verified via Context7 and official docs
- Architecture: HIGH - Patterns follow existing codebase conventions exactly (AuthContext, navigation, i18n, theme)
- Pitfalls: HIGH - OTP type deprecation confirmed via official docs; keyboard/paste issues are well-documented React Native patterns
- New i18n keys: MEDIUM - Key names are recommendations; exact wording may change during implementation

**Research date:** 2026-02-27
**Valid until:** 2026-03-27 (stable APIs, no breaking changes expected)
