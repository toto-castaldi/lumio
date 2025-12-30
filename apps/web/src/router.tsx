import { createBrowserRouter, Navigate } from 'react-router-dom';
import { RootLayout } from './layouts/RootLayout';
import { LoginPage } from './pages/LoginPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { DashboardPage } from './pages/DashboardPage';
import { RepositoriesPage } from './pages/RepositoriesPage';
import { CardsPage } from './pages/CardsPage';
import { StudyPage } from './pages/StudyPage';
import { SettingsPage } from './pages/SettingsPage';
import { useAuth } from './contexts/AuthContext';

/**
 * Loading component for auth state
 */
function LoadingScreen() {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Caricamento...</p>
    </div>
  );
}

/**
 * Protected route wrapper - requires auth (Phase 6: no API key check)
 */
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { state } = useAuth();

  if (state === 'loading') {
    return <LoadingScreen />;
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
    return <LoadingScreen />;
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
    return <LoadingScreen />;
  }

  if (state === 'logged_out') {
    return <Navigate to="/login" replace />;
  }

  // Phase 6: always go to dashboard when logged in
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
        path: 'dashboard',
        element: (
          <ProtectedRoute>
            <DashboardPage />
          </ProtectedRoute>
        ),
      },
      {
        path: 'settings',
        element: (
          <ProtectedRoute>
            <SettingsPage />
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
