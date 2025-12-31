import { createBrowserRouter, Navigate, Outlet } from 'react-router-dom';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { DashboardPage } from './pages/DashboardPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { StudyPage } from './pages/StudyPage';
import { useAuth } from './contexts/AuthContext';

/**
 * Protected route wrapper - requires auth (API key check is handled in DashboardPage)
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (state === 'logged_out') {
    return <Navigate to="/login" replace />;
  }

  // For mobile, we allow access even without API keys
  // The DashboardPage will show the NeedsApiKeyMessage
  return <>{children}</>;
}

/**
 * Guest route wrapper - only for non-authenticated users
 */
function GuestRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (state === 'ready') {
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

/**
 * Home route - redirects based on auth state
 */
function HomeRoute() {
  const { state } = useAuth();

  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  if (state === 'logged_out') {
    return <Navigate to="/login" replace />;
  }

  return <Navigate to="/dashboard" replace />;
}

/**
 * Root layout - just renders children
 */
function RootLayout() {
  return <Outlet />;
}

export const router = createBrowserRouter([
  {
    path: '/',
    element: <RootLayout />,
    children: [
      {
        index: true,
        element: <HomeRoute />,
      },
      {
        path: 'login',
        element: (
          <GuestRoute>
            <LoginPage />
          </GuestRoute>
        ),
      },
      {
        path: 'auth/callback',
        element: <AuthCallbackPage />,
      },
      {
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'repositories',
        element: (
          <ProtectedRoute>
            <RepositoriesPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'study',
        element: (
          <ProtectedRoute>
            <StudyPage />
          </ProtectedRoute>
        ),
      },
    ],
  },
]);
