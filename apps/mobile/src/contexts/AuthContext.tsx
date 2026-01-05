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
  type AuthUser,
  type AuthState,
} from '@lumio/core';

interface AuthContextType {
  user: AuthUser | null;
  state: AuthState;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

// Initialize Supabase client synchronously BEFORE any component mounts
// This ensures getSupabaseClient() is available to all child components
createSupabaseClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY
);

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [state, setState] = useState<AuthState>('loading');

  useEffect(() => {
    // Check initial auth state
    const checkAuth = async () => {
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
        setState(currentUser ? 'ready' : 'logged_out');
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
      setState(authUser ? 'ready' : 'logged_out');
    });

    return () => subscription.unsubscribe();
  }, []);

  const logout = async () => {
    await supabaseSignOut();
    setUser(null);
    setState('logged_out');
  };

  return (
    <AuthContext.Provider value={{ user, state, logout }}>
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
