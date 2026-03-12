import { createContext, useContext, useState, useEffect, useMemo, useCallback, type ReactNode } from 'react';
import type { User, Session } from '@supabase/supabase-js';
import type { AuthState } from '@lumio/shared';
import { supabase } from '../lib/supabase';
import * as authLib from '../lib/auth';

interface AuthContextType {
  user: User | null;
  session: Session | null;
  state: AuthState;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  signUpWithEmail: (email: string, password: string) => Promise<void>;
  verifyEmailOtp: (email: string, token: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  verifyRecoveryOtp: (email: string, token: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    // Check for existing session
    supabase.auth.getSession().then(({ data: { session: existing } }) => {
      setSession(existing);
      setUser(existing?.user ?? null);
      setState(existing ? 'ready' : 'logged_out');
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, newSession) => {
        setSession(newSession);
        setUser(newSession?.user ?? null);
        setState(newSession ? 'ready' : 'logged_out');
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const signInWithGoogle = useCallback(async () => {
    await authLib.signInWithGoogle();
  }, []);

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await authLib.signInWithEmail(email, password);
  }, []);

  const signUpWithEmail = useCallback(async (email: string, password: string) => {
    await authLib.signUpWithEmail(email, password);
  }, []);

  const verifyEmailOtp = useCallback(async (email: string, token: string) => {
    await authLib.verifyEmailOtp(email, token);
  }, []);

  const resetPassword = useCallback(async (email: string) => {
    await authLib.resetPassword(email);
  }, []);

  const verifyRecoveryOtp = useCallback(async (email: string, token: string) => {
    await authLib.verifyRecoveryOtp(email, token);
  }, []);

  const updatePassword = useCallback(async (newPassword: string) => {
    await authLib.updatePassword(newPassword);
  }, []);

  const signOut = useCallback(async () => {
    await authLib.signOut();
  }, []);

  const value = useMemo<AuthContextType>(() => ({
    user,
    session,
    state,
    signInWithGoogle,
    signInWithEmail,
    signUpWithEmail,
    verifyEmailOtp,
    resetPassword,
    verifyRecoveryOtp,
    updatePassword,
    signOut,
  }), [user, session, state, signInWithGoogle, signInWithEmail, signUpWithEmail, verifyEmailOtp, resetPassword, verifyRecoveryOtp, updatePassword, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
