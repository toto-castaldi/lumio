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
 * Only refreshes if the token is expired or about to expire
 * @returns Access token string or null
 */
export async function getAccessToken(): Promise<string | null> {
  const supabase = getSupabaseClient();

  // Get current session first
  const { data: { session } } = await supabase.auth.getSession();

  if (!session) {
    return null;
  }

  // Check if token is expired or will expire in the next 60 seconds
  const expiresAt = session.expires_at;
  const now = Math.floor(Date.now() / 1000);
  const needsRefresh = expiresAt && (expiresAt - now) < 60;

  if (needsRefresh) {
    const { data, error } = await supabase.auth.refreshSession();
    if (error) {
      console.error('Failed to refresh session:', error);
      // Return current token even if refresh fails
      return session.access_token;
    }
    return data.session?.access_token || null;
  }

  return session.access_token;
}
