import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from 'react';
import {
  createSupabaseClient,
  onAuthStateChange,
  getCurrentUser,
  signOut as supabaseSignOut,
  getUserApiKeys,
  type AuthUser,
  type AuthState,
} from '@lumio/core';

interface AuthContextType {
  user: AuthUser | null;
  state: AuthState;
  hasApiKey: boolean;
  logout: () => Promise<void>;
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
    createSupabaseClient(
      import.meta.env.VITE_SUPABASE_URL,
      import.meta.env.VITE_SUPABASE_ANON_KEY
    );

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
    const {
      data: { subscription },
    } = onAuthStateChange(async (authUser) => {
      setUser(authUser);

      if (authUser) {
        const hasKeys = await checkApiKeys();
        setHasApiKey(hasKeys);
        setState(hasKeys ? 'ready' : 'needs_api_key');
      } else {
        setState('logged_out');
        setHasApiKey(false);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabaseSignOut();
    setUser(null);
    setState('logged_out');
    setHasApiKey(false);
  };

  return (
    <AuthContext.Provider
      value={{ user, state, hasApiKey, logout, refreshApiKeyStatus }}
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
