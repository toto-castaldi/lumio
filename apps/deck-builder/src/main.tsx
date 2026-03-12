import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { DeckProvider } from './contexts/DeckContext';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { AuthCallback } from './pages/AuthCallback';
import { OtpVerification } from './pages/OtpVerification';
import { ForgotPassword } from './pages/ForgotPassword';
import { ResetPassword } from './pages/ResetPassword';
import Layout from './components/Layout';
import DashboardPage from './pages/DashboardPage';
import './index.css';

// ---------------------------------------------------------------------------
// Layout wrappers
// ---------------------------------------------------------------------------

function ProtectedLayout() {
  const { state } = useAuth();
  if (state === 'loading') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lumio-bg">
        <div className="text-lumio-text">Loading...</div>
      </div>
    );
  }
  if (state === 'logged_out') return <Navigate to="/login" replace />;
  return (
    <DeckProvider>
      <Layout>
        <Outlet />
      </Layout>
    </DeckProvider>
  );
}

function PublicLayout() {
  const { state } = useAuth();
  if (state === 'ready') return <Navigate to="/" replace />;
  return <Outlet />;
}

// ---------------------------------------------------------------------------
// Router
// ---------------------------------------------------------------------------

const router = createBrowserRouter([
  {
    path: '/auth/callback',
    Component: AuthCallback,
  },
  {
    Component: PublicLayout,
    children: [
      { path: '/login', Component: LoginPage },
      { path: '/signup', Component: SignUpPage },
      { path: '/verify-otp', Component: OtpVerification },
      { path: '/forgot-password', Component: ForgotPassword },
      { path: '/reset-password', Component: ResetPassword },
    ],
  },
  {
    Component: ProtectedLayout,
    children: [
      { path: '/', Component: DashboardPage },
    ],
  },
]);

// ---------------------------------------------------------------------------
// App root
// ---------------------------------------------------------------------------

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <I18nProvider>
        <AuthProvider>
          <RouterProvider router={router} />
          <Toaster position="bottom-center" />
        </AuthProvider>
      </I18nProvider>
    </ThemeProvider>
  </StrictMode>
);
