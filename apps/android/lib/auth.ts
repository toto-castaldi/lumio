import {
  GoogleSignin,
  statusCodes,
} from '@react-native-google-signin/google-signin';

/**
 * Configure Google Sign-In SDK.
 * Must be called once at app startup (e.g., in App.tsx or a context provider).
 *
 * NOTE: webClientId must be the Web Client ID from Google Cloud Console,
 * not the Android Client ID. This is required for Supabase's signInWithIdToken to work.
 */
export function configureGoogleSignIn(): void {
  const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;

  if (!webClientId) {
    console.warn(
      '[Auth] EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID is not set. ' +
        'Google Sign-In will not work. ' +
        'Set this env var to your Web Client ID from Google Cloud Console.'
    );
    return;
  }

  GoogleSignin.configure({
    webClientId,
    offlineAccess: true,
  });
}

// Re-export statusCodes for error handling in other modules
export { statusCodes };
