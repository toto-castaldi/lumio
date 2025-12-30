import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import * as WebBrowser from 'expo-web-browser';
import { makeRedirectUri } from 'expo-auth-session';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  createSupabaseClient,
  getSupabaseClient,
  getCurrentUser,
  getUserApiKeys,
  type AuthUser,
  type AuthState,
} from '@lumio/core';
import Constants from 'expo-constants';

// NOTE: We don't call WebBrowser.maybeCompleteAuthSession() here
// because on native Android builds it can consume the deep link URL
// before Expo Router can pass it to the /auth/callback route.
// The callback handling is done in app/auth/callback.tsx

interface AuthContextType {
  user: AuthUser | null;
  state: AuthState;
  hasApiKey: boolean;
  signInWithGoogle: () => Promise<void>;
  signOut: () => Promise<void>;
  refreshApiKeyStatus: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [state, setState] = useState<AuthState>('loading');
  const [hasApiKey, setHasApiKey] = useState(false);

  // Get environment variables
  const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || '';
  const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || '';

  // Check if user has API keys
  const checkApiKeys = async (): Promise<boolean> => {
    try {
      const keys = await getUserApiKeys();
      return keys.length > 0;
    } catch {
      return false;
    }
  };

  // Refresh API key status
  const refreshApiKeyStatus = async () => {
    const hasKeys = await checkApiKeys();
    setHasApiKey(hasKeys);
    if (user) {
      setState(hasKeys ? 'ready' : 'needs_api_key');
    }
  };

  useEffect(() => {
    // Initialize Supabase client
    createSupabaseClient(supabaseUrl, supabaseAnonKey);

    // Check initial auth state
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);

        if (currentUser) {
          const hasKeys = await checkApiKeys();
          setHasApiKey(hasKeys);
          setState(hasKeys ? 'ready' : 'needs_api_key');
        } else {
          setState('logged_out');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        setState('logged_out');
      }
    };

    checkAuth();

    // Listen for auth changes
    const supabase = getSupabaseClient();
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const authUser: AuthUser = {
          id: session.user.id,
          email: session.user.email || '',
          displayName:
            session.user.user_metadata?.full_name ||
            session.user.user_metadata?.name ||
            undefined,
          avatarUrl: session.user.user_metadata?.avatar_url || undefined,
        };
        setUser(authUser);

        const hasKeys = await checkApiKeys();
        setHasApiKey(hasKeys);
        setState(hasKeys ? 'ready' : 'needs_api_key');
      } else {
        setUser(null);
        setState('logged_out');
        setHasApiKey(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [supabaseUrl, supabaseAnonKey]);

  const signInWithGoogle = async () => {
    try {
      const supabase = getSupabaseClient();

      // Create redirect URI for Expo
      const redirectUri = makeRedirectUri({
        scheme: 'lumio',
        path: 'auth/callback',
      });

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
        },
      });

      if (error) throw error;

      if (data?.url) {
        // Open the browser for authentication
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        if (result.type === 'success') {
          // Extract the URL and handle the tokens
          const url = new URL(result.url);
          const hashParams = new URLSearchParams(
            url.hash.slice(1) || url.search.slice(1)
          );

          const accessToken = hashParams.get('access_token');
          const refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            // Set the session in Supabase
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });

            if (sessionError) {
              console.error('Session error:', sessionError);
            }
          }
        }
      }
    } catch (error) {
      console.error('Google sign in error:', error);
    }
  };

  const signOut = async () => {
    try {
      const supabase = getSupabaseClient();
      await supabase.auth.signOut();
      await AsyncStorage.clear();
      setUser(null);
      setState('logged_out');
      setHasApiKey(false);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        state,
        hasApiKey,
        signInWithGoogle,
        signOut,
        refreshApiKeyStatus,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
