import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { SetupApiKeysPage } from './pages/setup/SetupApiKeysPage';
import { DashboardPage } from './pages/DashboardPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { CardsPage } from './pages/CardsPage';
import { StudyPage } from './pages/StudyPage';
import { useAuth } from './contexts/AuthContext';

/**
 * Protected route wrapper - requires auth and API key
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

  if (state === 'needs_api_key') {
    return <Navigate to="/setup/api-keys" replace />;
  }

  return <>{children}</>;
}

/**
 * Auth route wrapper - requires auth but not API key
 */
function AuthRoute({ children }: { children: React.ReactNode }) {
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

  if (state === 'needs_api_key') {
    return <Navigate to="/setup/api-keys" replace />;
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

  if (state === 'needs_api_key') {
    return <Navigate to="/setup/api-keys" replace />;
  }

  return <Navigate to="/dashboard" replace />;
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
        path: 'setup/api-keys',
        element: (
          <AuthRoute>
            <SetupApiKeysPage />
          </AuthRoute>
        ),
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
        path: 'repositories/:repositoryId/cards',
        element: (
          <ProtectedRoute>
            <CardsPage />
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
