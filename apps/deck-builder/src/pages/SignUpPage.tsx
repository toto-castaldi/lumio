import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

export function SignUpPage() {
  const { signUpWithEmail } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSignUp(e: FormEvent) {
    e.preventDefault();

    if (password !== confirmPassword) {
      toast.error(t('signup.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await signUpWithEmail(email, password);
      toast.success(t('signup.signUpSuccess'));
      navigate('/verify-otp', { state: { email } });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-lumio-bg px-4">
      <div className="w-full max-w-[400px] rounded-xl bg-lumio-surface p-8 shadow-lg">
        <h1 className="mb-6 text-center text-2xl font-bold text-lumio-text">
          {t('signup.title')}
        </h1>

        <form onSubmit={handleSignUp} className="space-y-4">
          <div>
            <label
              htmlFor="signup-email"
              className="mb-1 block text-sm font-medium text-lumio-text"
            >
              {t('signup.emailLabel')}
            </label>
            <input
              id="signup-email"
              type="email"
              autoFocus
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-lg border border-lumio-border bg-lumio-bg px-3 py-2.5 text-sm text-lumio-text placeholder-lumio-text-secondary outline-none transition-colors focus:border-lumio-primary focus:ring-2 focus:ring-lumio-primary/30"
              placeholder={t('signup.emailLabel')}
            />
          </div>

          <div>
            <label
              htmlFor="signup-password"
              className="mb-1 block text-sm font-medium text-lumio-text"
            >
              {t('signup.passwordLabel')}
            </label>
            <input
              id="signup-password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-lg border border-lumio-border bg-lumio-bg px-3 py-2.5 text-sm text-lumio-text placeholder-lumio-text-secondary outline-none transition-colors focus:border-lumio-primary focus:ring-2 focus:ring-lumio-primary/30"
              placeholder={t('signup.passwordLabel')}
            />
          </div>

          <div>
            <label
              htmlFor="signup-confirm-password"
              className="mb-1 block text-sm font-medium text-lumio-text"
            >
              {t('signup.confirmPasswordLabel')}
            </label>
            <input
              id="signup-confirm-password"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full rounded-lg border border-lumio-border bg-lumio-bg px-3 py-2.5 text-sm text-lumio-text placeholder-lumio-text-secondary outline-none transition-colors focus:border-lumio-primary focus:ring-2 focus:ring-lumio-primary/30"
              placeholder={t('signup.confirmPasswordLabel')}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-lumio-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-lumio-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? t('common.loading') : t('signup.signUp')}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-lumio-text-secondary">
          {t('signup.haveAccount')}{' '}
          <Link to="/login" className="text-lumio-primary hover:underline">
            {t('signup.signInLink')}
          </Link>
        </div>
      </div>
    </div>
  );
}
