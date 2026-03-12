import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { createBrowserRouter, RouterProvider, Navigate, Outlet } from 'react-router';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { LoginPage } from './pages/LoginPage';
import { SignUpPage } from './pages/SignUpPage';
import { AuthCallback } from './pages/AuthCallback';
import './index.css';

// ---------------------------------------------------------------------------
// Placeholder page components (Plans 02 and 03 replace with real implementations)
// ---------------------------------------------------------------------------

function OtpVerification() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lumio-bg">
      <div className="text-lumio-text">OTP Verification (placeholder)</div>
    </div>
  );
}

function ForgotPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lumio-bg">
      <div className="text-lumio-text">Forgot Password (placeholder)</div>
    </div>
  );
}

function ResetPassword() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-lumio-bg">
      <div className="text-lumio-text">Reset Password (placeholder)</div>
    </div>
  );
}

function DashboardPage() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold text-lumio-text">Welcome to Lumio Deck Builder</h1>
      <p className="mt-2 text-lumio-text-secondary">Select a deck to start editing</p>
    </div>
  );
}

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
    <div className="min-h-screen bg-lumio-bg">
      <Outlet />
    </div>
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
