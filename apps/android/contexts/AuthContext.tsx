import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useRef,
  ReactNode,
} from 'react';
import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { User, Session, UserIdentity } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
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

/**
 * Recovery flow state machine:
 * - 'idle': No recovery in progress
 * - 'email_sent': Reset email sent, waiting for user to click link
 * - 'link_clicked': User clicked recovery link, PASSWORD_RECOVERY event received
 * - 'updating': Password update in progress
 */
export type RecoveryState = 'idle' | 'email_sent' | 'link_clicked' | 'updating';

const RECOVERY_STATE_KEY = '@lumio/recovery-state';

async function loadRecoveryState(): Promise<RecoveryState> {
  try {
    const stored = await AsyncStorage.getItem(RECOVERY_STATE_KEY);
    if (stored === 'email_sent' || stored === 'link_clicked' || stored === 'updating') {
      return stored;
    }
    return 'idle';
  } catch {
    return 'idle';
  }
}

async function saveRecoveryState(state: RecoveryState): Promise<void> {
  if (state === 'idle') {
    await AsyncStorage.removeItem(RECOVERY_STATE_KEY);
  } else {
    await AsyncStorage.setItem(RECOVERY_STATE_KEY, state);
  }
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  state: AuthState;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;

  // Email auth methods
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;

  // Per-operation loading states
  signUpLoading: boolean;
  signInLoading: boolean;
  resetLoading: boolean;
  updatePasswordLoading: boolean;

  // OTP verification methods
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  resendOtp: (email: string) => Promise<void>;
  verifyLoading: boolean;
  resendLoading: boolean;

  // Recovery OTP verification
  verifyRecoveryOtp: (email: string, token: string) => Promise<void>;
  verifyRecoveryLoading: boolean;

  // Recovery flow state
  recoveryState: RecoveryState;

  // Identity linking methods
  linkGoogle: () => Promise<void>;
  unlinkIdentity: (identity: UserIdentity) => Promise<void>;
  refreshUser: () => Promise<void>;
  sendPasswordSetupOtp: (email: string) => Promise<void>;
  verifyPasswordSetupOtp: (email: string, token: string) => Promise<void>;
  setAccountPassword: (password: string) => Promise<void>;

  // Identity linking loading states
  linkGoogleLoading: boolean;
  unlinkLoading: boolean;
  addPasswordLoading: boolean;
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
  const [signUpLoading, setSignUpLoading] = useState(false);
  const [signInLoading, setSignInLoading] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [updatePasswordLoading, setUpdatePasswordLoading] = useState(false);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [verifyRecoveryLoading, setVerifyRecoveryLoading] = useState(false);
  const [recoveryState, setRecoveryStateLocal] = useState<RecoveryState>('idle');
  const [linkGoogleLoading, setLinkGoogleLoading] = useState(false);
  const [unlinkLoading, setUnlinkLoading] = useState(false);
  const [addPasswordLoading, setAddPasswordLoading] = useState(false);
  const addPasswordModeRef = useRef(false);

  const setRecoveryState = useCallback(async (newState: RecoveryState) => {
    setRecoveryStateLocal(newState);
    await saveRecoveryState(newState);
  }, []);

  useEffect(() => {
    console.log('[Auth] Initializing auth...');

    // Configure Google Sign-In SDK
    configureGoogleSignIn();

    // Load persisted recovery state
    loadRecoveryState().then(setRecoveryStateLocal);

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
    } = getSupabaseClient().auth.onAuthStateChange((event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);
      setState(newSession ? 'ready' : 'logged_out');

      if (event === 'PASSWORD_RECOVERY' && !addPasswordModeRef.current) {
        setRecoveryState('link_clicked');
      }
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
    // Guard: only call GoogleSignin.signOut() if there's a cached Google sign-in
    if (GoogleSignin.hasPreviousSignIn()) {
      try {
        await GoogleSignin.signOut();
      } catch (e) {
        console.warn('[Auth] GoogleSignin.signOut failed, continuing:', e);
      }
    }

    // Sign out from Supabase
    await getSupabaseClient().auth.signOut();
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string): Promise<void> => {
    setSignUpLoading(true);
    try {
      const { data, error } = await getSupabaseClient().auth.signUp({ email, password });
      if (error) throw error;
      // Detect fake success for existing emails (email enumeration protection)
      if (data.user && data.user.identities?.length === 0) {
        throw new Error('email_exists');
      }
      // When enable_confirmations=true: data.session is null, confirmation email sent
      // Caller should show "check your email" UI
    } finally {
      setSignUpLoading(false);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string): Promise<void> => {
    setSignInLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.signInWithPassword({ email, password });
      if (error) throw error;
      // onAuthStateChange fires SIGNED_IN, session auto-updates
    } finally {
      setSignInLoading(false);
    }
  }, []);

  const resetPassword = useCallback(async (email: string): Promise<void> => {
    setResetLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email);
      if (error) throw error;
      await setRecoveryState('email_sent');
    } finally {
      setResetLoading(false);
    }
  }, [setRecoveryState]);

  const updatePassword = useCallback(async (newPassword: string): Promise<void> => {
    setUpdatePasswordLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.updateUser({ password: newPassword });
      if (error) throw error;
      // Invalidate ALL sessions across devices per CONTEXT.md decision
      await getSupabaseClient().auth.signOut({ scope: 'global' });
      // Clear recovery state — this triggers navigation back to login
      await setRecoveryState('idle');
    } finally {
      setUpdatePasswordLoading(false);
    }
  }, [setRecoveryState]);

  const verifyEmailOtp = useCallback(async (email: string, token: string): Promise<void> => {
    setVerifyLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.verifyOtp({
        email,
        token,
        type: 'email',
      });
      if (error) throw error;
      // onAuthStateChange fires SIGNED_IN, session auto-updates, state -> 'ready'
    } finally {
      setVerifyLoading(false);
    }
  }, []);

  const resendOtp = useCallback(async (email: string): Promise<void> => {
    setResendLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.resend({
        type: 'signup',
        email,
      });
      if (error) throw error;
    } finally {
      setResendLoading(false);
    }
  }, []);

  const verifyRecoveryOtp = useCallback(async (email: string, token: string): Promise<void> => {
    setVerifyRecoveryLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.verifyOtp({
        email,
        token,
        type: 'recovery',
      });
      if (error) throw error;
      // User is now authenticated; transition to 'updating' so navigation guard keeps auth flow
      await setRecoveryState('updating');
    } finally {
      setVerifyRecoveryLoading(false);
    }
  }, [setRecoveryState]);

  const refreshUser = useCallback(async (): Promise<void> => {
    const { data, error } = await getSupabaseClient().auth.getUser();
    if (error) throw error;
    setUser(data.user);
  }, []);

  const linkGoogle = useCallback(async (): Promise<void> => {
    setLinkGoogleLoading(true);
    try {
      await GoogleSignin.hasPlayServices();
      const response = await GoogleSignin.signIn();
      if (response.type !== 'success' || !response.data.idToken) {
        return; // User cancelled
      }
      const tokens = await GoogleSignin.getTokens();
      const { error } = await getSupabaseClient().auth.linkIdentity({
        provider: 'google',
        options: {
          queryParams: {
            id_token: response.data.idToken,
            access_token: tokens.accessToken,
          },
        },
      });
      if (error) {
        if (error.message?.includes('already linked')) {
          throw new Error('google_already_linked');
        }
        throw error;
      }
      await refreshUser();
    } finally {
      setLinkGoogleLoading(false);
    }
  }, [refreshUser]);

  const unlinkIdentity = useCallback(async (identity: UserIdentity): Promise<void> => {
    setUnlinkLoading(true);
    try {
      const { error } = await getSupabaseClient().auth.unlinkIdentity(identity);
      if (error) throw error;
      await refreshUser();
    } finally {
      setUnlinkLoading(false);
    }
  }, [refreshUser]);

  const sendPasswordSetupOtp = useCallback(async (email: string): Promise<void> => {
    setAddPasswordLoading(true);
    try {
      addPasswordModeRef.current = true;
      const { error } = await getSupabaseClient().auth.resetPasswordForEmail(email);
      if (error) {
        addPasswordModeRef.current = false;
        throw error;
      }
    } finally {
      setAddPasswordLoading(false);
    }
  }, []);

  const verifyPasswordSetupOtp = useCallback(async (email: string, token: string): Promise<void> => {
    const { error } = await getSupabaseClient().auth.verifyOtp({
      email,
      token,
      type: 'recovery',
    });
    if (error) throw error;
  }, []);

  const setAccountPassword = useCallback(async (password: string): Promise<void> => {
    try {
      const { error } = await getSupabaseClient().auth.updateUser({ password });
      if (error) {
        addPasswordModeRef.current = false;
        throw error;
      }
      addPasswordModeRef.current = false;
      await refreshUser();
    } catch (err) {
      addPasswordModeRef.current = false;
      throw err;
    }
  }, [refreshUser]);

  const value: AuthContextType = {
    user,
    session,
    state,
    signInWithGoogle,
    signOut,
    signUpWithEmail,
    signInWithEmail,
    resetPassword,
    updatePassword,
    signUpLoading,
    signInLoading,
    resetLoading,
    updatePasswordLoading,
    verifyEmailOtp,
    resendOtp,
    verifyLoading,
    resendLoading,
    verifyRecoveryOtp,
    verifyRecoveryLoading,
    recoveryState,
    linkGoogle,
    unlinkIdentity,
    refreshUser,
    sendPasswordSetupOtp,
    verifyPasswordSetupOtp,
    setAccountPassword,
    linkGoogleLoading,
    unlinkLoading,
    addPasswordLoading,
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
