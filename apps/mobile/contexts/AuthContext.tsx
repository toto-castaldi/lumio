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
  type StorageAdapter,
} from '@lumio/core';
import Constants from 'expo-constants';

// NOTE: We don't call WebBrowser.maybeCompleteAuthSession() here
// because on native Android builds it can consume the deep link URL
// before Expo Router can pass it to the /auth/callback route.
// The callback handling is done in app/auth/callback.tsx

// Create AsyncStorage adapter for Supabase
// This is required for PKCE flow to persist the code_verifier
const asyncStorageAdapter: StorageAdapter = {
  getItem: (key: string) => AsyncStorage.getItem(key),
  setItem: (key: string, value: string) => AsyncStorage.setItem(key, value),
  removeItem: (key: string) => AsyncStorage.removeItem(key),
};

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
    // Initialize Supabase client with AsyncStorage for PKCE support
    createSupabaseClient(supabaseUrl, supabaseAnonKey, {
      storage: asyncStorageAdapter,
    });

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

      console.log('Starting Google OAuth with PKCE, redirectUri:', redirectUri);

      // Use PKCE flow - returns code in query params instead of tokens in hash
      // This is required for Android native apps because Android strips hash fragments
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUri,
          skipBrowserRedirect: true,
          queryParams: {
            // Force PKCE flow
            access_type: 'offline',
            prompt: 'consent',
          },
        },
      });

      if (error) throw error;

      if (data?.url) {
        console.log('Opening browser for OAuth...');
        // Open the browser for authentication
        const result = await WebBrowser.openAuthSessionAsync(
          data.url,
          redirectUri
        );

        console.log('Browser result type:', result.type);

        if (result.type === 'success' && result.url) {
          console.log('Browser returned success, URL:', result.url.substring(0, 100));
          // Try to extract tokens from hash or code from query params
          const url = new URL(result.url);

          // Check for tokens in hash (implicit flow - works on some platforms)
          const hashParams = new URLSearchParams(url.hash.slice(1));
          let accessToken = hashParams.get('access_token');
          let refreshToken = hashParams.get('refresh_token');

          if (accessToken && refreshToken) {
            console.log('Got tokens from hash');
            const { error: sessionError } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken,
            });
            if (sessionError) {
              console.error('Session error:', sessionError);
            }
            return;
          }

          // Check for code in query params (PKCE flow)
          const code = url.searchParams.get('code');
          if (code) {
            console.log('Got code from query params, exchanging for session...');
            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
            if (exchangeError) {
              console.error('Code exchange error:', exchangeError);
            }
            return;
          }

          console.log('No tokens or code found in result URL');
        }

        // If we get here on Android, the deep link will handle it via /auth/callback route
        console.log('Browser did not return success, deep link should handle callback');
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
