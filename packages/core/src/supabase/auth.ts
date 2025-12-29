import { getSupabaseClient } from './client';
import type { AuthUser } from '@lumio/shared';

/**
 * Sign in with Google OAuth
 * @param redirectTo - URL to redirect after successful login
 */
export async function signInWithGoogle(redirectTo?: string) {
  const supabase = getSupabaseClient();

  // Determine redirect URL
  const defaultRedirectTo =
    typeof window !== 'undefined'
      ? `${window.location.origin}/auth/callback`
      : undefined;

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectTo || defaultRedirectTo,
    },
  });

  return { data, error };
}

/**
 * Sign out the current user
 */
export async function signOut() {
  const supabase = getSupabaseClient();
  return supabase.auth.signOut();
}

/**
 * Get the current session
 */
export async function getSession() {
  const supabase = getSupabaseClient();
  return supabase.auth.getSession();
}

/**
 * Get the current authenticated user
 * @returns AuthUser or null if not authenticated
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  const supabase = getSupabaseClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) return null;

  return {
    id: user.id,
    email: user.email || '',
    displayName:
      user.user_metadata?.full_name || user.user_metadata?.name || undefined,
    avatarUrl: user.user_metadata?.avatar_url || undefined,
  };
}

/**
 * Subscribe to auth state changes
 * @param callback - Function to call when auth state changes
 * @returns Subscription object with unsubscribe method
 */
export function onAuthStateChange(
  callback: (user: AuthUser | null) => void
) {
  const supabase = getSupabaseClient();

  return supabase.auth.onAuthStateChange((_event, session) => {
    if (session?.user) {
      callback({
        id: session.user.id,
        email: session.user.email || '',
        displayName:
          session.user.user_metadata?.full_name ||
          session.user.user_metadata?.name ||
          undefined,
        avatarUrl: session.user.user_metadata?.avatar_url || undefined,
      });
    } else {
      callback(null);
    }
  });
}

/**
 * Get the access token for the current session
 * @returns Access token string or null
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();

  return session?.access_token || null;
}

/**
 * Sign in with a development test user (only for local development)
 * Creates the user if it doesn't exist
 */
export async function signInWithDevUser() {
  const supabase = getSupabaseClient();

  const devEmail = 'dev@lumio.local';
  const devPassword = 'devpassword123';

  // Try to sign in first
  const { data, error } = await supabase.auth.signInWithPassword({
    email: devEmail,
    password: devPassword,
  });

  if (error && error.message.includes('Invalid login credentials')) {
    // User doesn't exist, create it
    const { data: signUpData, error: signUpError } = await supabase.auth.signUp(
      {
        email: devEmail,
        password: devPassword,
        options: {
          data: {
            full_name: 'Dev User',
            avatar_url: 'https://api.dicebear.com/7.x/avataaars/svg?seed=dev',
          },
        },
      }
    );

    if (signUpError) {
      return { data: null, error: signUpError };
    }

    return { data: signUpData, error: null };
  }

  return { data, error };
}
