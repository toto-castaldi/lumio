import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { User, Session } from '@supabase/supabase-js';
import { getSupabaseClient } from '@lumio/core';
import '../lib/supabase'; // Side-effect import to ensure @lumio/core initialization
import { configureGoogleSignIn, statusCodes } from '../lib/auth';

/**
 * Auth state transitions:
 * - 'loading': Initial state while checking for existing session
 * - 'logged_out': No valid session exists
 * - 'ready': User is authenticated with valid session
 */
export type AuthState = 'loading' | 'logged_out' | 'ready';

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  state: AuthState;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

interface AuthProviderProps {
  children: ReactNode;
}

/**
 * AuthProvider manages the complete auth lifecycle:
 * - Configures Google Sign-In on mount
 * - Restores persisted sessions from SecureStore
 * - Handles Google Sign-In -> Supabase token exchange
 * - Provides signIn/signOut methods to children
 */
export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    console.log('[Auth] Initializing auth...');

    // Configure Google Sign-In SDK
    configureGoogleSignIn();

    // Restore persisted session
    getSupabaseClient().auth.getSession()
      .then(({ data: { session: existingSession }, error }) => {
        if (error) {
          console.error('[Auth] getSession error:', error);
        }
        setSession(existingSession);
        setUser(existingSession?.user ?? null);
        setState(existingSession ? 'ready' : 'logged_out');
      })
      .catch((err) => {
        console.error('[Auth] getSession failed:', err);
        // Even on error, transition to logged_out so the app is usable
        setState('logged_out');
      });

    // Subscribe to auth state changes
    const {
      data: { subscription },
    } = getSupabaseClient().auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setState(newSession ? 'ready' : 'logged_out');
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signInWithGoogle = useCallback(async (): Promise<void> => {
    try {
      // Ensure Google Play Services are available
      await GoogleSignin.hasPlayServices();

      // Initiate Google Sign-In
      const response = await GoogleSignin.signIn();

      // Check for successful sign-in with id token
      if (response.type === 'success' && response.data.idToken) {
        // Exchange Google ID token for Supabase session
        const { error } = await getSupabaseClient().auth.signInWithIdToken({
          provider: 'google',
          token: response.data.idToken,
        });

        if (error) {
          throw error;
        }
      }
    } catch (error: unknown) {
      // Handle specific Google Sign-In errors
      if (error && typeof error === 'object' && 'code' in error) {
        const errorCode = (error as { code: string }).code;

        // User cancelled the sign-in flow - return silently
        if (errorCode === statusCodes.SIGN_IN_CANCELLED) {
          return;
        }

        // Google Play Services not available
        if (errorCode === statusCodes.PLAY_SERVICES_NOT_AVAILABLE) {
          throw new Error('Google Play Services not available');
        }
      }

      // Rethrow other errors
      throw error;
    }
  }, []);

  const signOut = useCallback(async (): Promise<void> => {
    // Sign out from Google
    await GoogleSignin.signOut();

    // Sign out from Supabase
    await getSupabaseClient().auth.signOut();
  }, []);

  const value: AuthContextType = {
    user,
    session,
    state,
    signInWithGoogle,
    signOut,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

/**
 * Hook to access auth context.
 * Must be used within an AuthProvider.
 *
 * @throws Error if used outside of AuthProvider
 */
export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
