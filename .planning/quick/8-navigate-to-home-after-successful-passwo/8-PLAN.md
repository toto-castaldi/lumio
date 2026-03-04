---
phase: quick-8
plan: 01
type: execute
wave: 1
depends_on: []
files_modified:
  - apps/android/screens/UpdatePasswordScreen.tsx
autonomous: true
requirements: [QUICK-8]
must_haves:
  truths:
    - "After entering a new password and tapping 'Aggiorna password', the user is navigated back to the Login screen"
    - "Success toast still appears before navigation"
  artifacts:
    - path: "apps/android/screens/UpdatePasswordScreen.tsx"
      provides: "Password update with post-success navigation"
      contains: "navigation.reset"
  key_links:
    - from: "UpdatePasswordScreen.handleUpdatePassword"
      to: "AuthNavigator Login screen"
      via: "navigation.reset after successful updatePassword"
      pattern: "navigation\\.reset.*Login"
---

<objective>
Fix navigation after successful password reset: navigate to Login screen instead of staying on UpdatePasswordScreen.

Purpose: After the user enters a new password and taps "Aggiorna password", the app stays on the UpdatePasswordScreen. It should navigate back to the Login screen so the user can sign in with their new password.

Root cause: `updatePassword()` in AuthContext calls `signOut({scope: 'global'})` which sets auth state to `logged_out`. However, AppNavigator renders `<AuthNavigator />` both BEFORE the signOut (because `recoveryState !== 'idle'`) and AFTER (because `state === 'logged_out'`). Since it is the same component, React preserves the navigation stack and UpdatePasswordScreen stays on top. The fix is to explicitly reset the AuthNavigator stack to Login after the successful password update.

Output: UpdatePasswordScreen navigates to Login after successful password update.
</objective>

<execution_context>
@/home/toto/.claude/get-shit-done/workflows/execute-plan.md
@/home/toto/.claude/get-shit-done/templates/summary.md
</execution_context>

<context>
@apps/android/screens/UpdatePasswordScreen.tsx
@apps/android/navigation/AuthNavigator.tsx
@apps/android/navigation/AppNavigator.tsx
@apps/android/contexts/AuthContext.tsx
</context>

<interfaces>
<!-- Key types the executor needs -->

From apps/android/navigation/AuthNavigator.tsx:
```typescript
export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  OtpVerification: { email: string };
  ForgotPassword: undefined;
  UpdatePassword: { email: string };
};
```

From apps/android/screens/UpdatePasswordScreen.tsx:
```typescript
type Props = NativeStackScreenProps<AuthStackParamList, 'UpdatePassword'>;
// navigation and route are destructured from Props
```
</interfaces>

<tasks>

<task type="auto">
  <name>Task 1: Navigate to Login after successful password update</name>
  <files>apps/android/screens/UpdatePasswordScreen.tsx</files>
  <action>
In the `handleUpdatePassword` callback (around line 204-229), after the successful `await updatePassword(newPassword)` call and after the `Toast.show()` call, add a navigation reset to bring the user back to the Login screen:

```typescript
navigation.reset({
  index: 0,
  routes: [{ name: 'Login' }],
});
```

Use `navigation.reset()` (not `navigation.navigate('Login')`) to clear the entire AuthNavigator stack. This ensures the UpdatePasswordScreen is removed from the stack and the user lands cleanly on Login. The reset should come AFTER the Toast.show() call so the success toast is visible.

The reason `navigation.navigate('Login')` alone would also work is that Login is the initial route, but `reset` is more robust: it clears the stack entirely, preventing the user from swiping back to the UpdatePasswordScreen.

Do NOT modify the AuthContext `updatePassword` function or the AppNavigator. The fix is purely in the screen's success handler.
  </action>
  <verify>
    <automated>cd /home/toto/scm-projects/lumio && pnpm --filter @lumio/android exec -- npx tsc --noEmit</automated>
  </verify>
  <done>After a successful password update, the UpdatePasswordScreen navigates the user to the Login screen via navigation.reset(). TypeScript compiles without errors.</done>
</task>

</tasks>

<verification>
- TypeScript check passes: `pnpm --filter @lumio/android exec -- npx tsc --noEmit`
- The `handleUpdatePassword` success path includes `navigation.reset()` to Login
- Toast.show() still appears before the navigation reset
</verification>

<success_criteria>
- User taps "Aggiorna password" with valid new password
- Success toast appears
- App navigates to Login screen (not stuck on UpdatePasswordScreen)
- TypeScript compiles cleanly
</success_criteria>

<output>
After completion, create `.planning/quick/8-navigate-to-home-after-successful-passwo/8-SUMMARY.md`
</output>
