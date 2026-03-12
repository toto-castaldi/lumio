import { useState, useRef, type KeyboardEvent, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

const OTP_LENGTH = 6;

export function ResetPassword() {
  const { verifyRecoveryOtp, updatePassword } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const email = (location.state as { email?: string } | null)?.email ?? '';

  const [step, setStep] = useState<1 | 2>(1);
  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  // --- Step 1: OTP verification ---

  function handleDigitChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleDigitKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  }

  function handlePaste(e: React.ClipboardEvent<HTMLInputElement>) {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;

    const newDigits = [...digits];
    for (let i = 0; i < pasted.length; i++) {
      newDigits[i] = pasted[i];
    }
    setDigits(newDigits);

    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  async function handleVerifyOtp(e: FormEvent) {
    e.preventDefault();
    const token = digits.join('');
    if (token.length !== OTP_LENGTH) return;

    setLoading(true);
    try {
      await verifyRecoveryOtp(email, token);
      setStep(2);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  // --- Step 2: New password ---

  async function handleUpdatePassword(e: FormEvent) {
    e.preventDefault();

    if (newPassword !== confirmPassword) {
      toast.error(t('signup.passwordMismatch'));
      return;
    }

    setLoading(true);
    try {
      await updatePassword(newPassword);
      toast.success(t('resetPassword.success'));
      navigate('/login', { replace: true });
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
    } finally {
      setLoading(false);
    }
  }

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lumio-bg px-4">
        <div className="w-full max-w-[400px] rounded-xl bg-lumio-surface p-8 text-center shadow-lg">
          <p className="mb-4 text-lumio-text">{t('common.error')}</p>
          <Link to="/forgot-password" className="text-lumio-primary hover:underline">
            {t('forgotPassword.title')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-lumio-bg px-4">
      <div className="w-full max-w-[400px] rounded-xl bg-lumio-surface p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-lumio-text">
          {t('resetPassword.title')}
        </h1>

        {step === 1 ? (
          <>
            <p className="mb-6 text-center text-sm text-lumio-text-secondary">
              {t('otp.subtitle')} <span className="font-medium text-lumio-text">{email}</span>
            </p>

            <form onSubmit={handleVerifyOtp} className="space-y-6">
              <div className="flex justify-center gap-2">
                {digits.map((digit, index) => (
                  <input
                    key={index}
                    ref={(el) => { inputRefs.current[index] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleDigitChange(index, e)}
                    onKeyDown={(e) => handleDigitKeyDown(index, e)}
                    onPaste={index === 0 ? handlePaste : undefined}
                    autoFocus={index === 0}
                    className="h-12 w-10 rounded-lg border border-lumio-border bg-lumio-bg text-center text-lg font-semibold text-lumio-text outline-none transition-colors focus:border-lumio-primary focus:ring-2 focus:ring-lumio-primary/30"
                  />
                ))}
              </div>

              <button
                type="submit"
                disabled={loading || digits.some((d) => !d)}
                className="w-full rounded-lg bg-lumio-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-lumio-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? t('otp.verifying') : t('otp.verifyButton')}
              </button>
            </form>
          </>
        ) : (
          <form onSubmit={handleUpdatePassword} className="mt-6 space-y-4">
            <div>
              <label
                htmlFor="new-password"
                className="mb-1 block text-sm font-medium text-lumio-text"
              >
                {t('resetPassword.newPasswordLabel')}
              </label>
              <input
                id="new-password"
                type="password"
                autoFocus
                required
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="w-full rounded-lg border border-lumio-border bg-lumio-bg px-3 py-2.5 text-sm text-lumio-text placeholder-lumio-text-secondary outline-none transition-colors focus:border-lumio-primary focus:ring-2 focus:ring-lumio-primary/30"
                placeholder={t('resetPassword.newPasswordLabel')}
              />
            </div>

            <div>
              <label
                htmlFor="confirm-new-password"
                className="mb-1 block text-sm font-medium text-lumio-text"
              >
                {t('resetPassword.confirmPasswordLabel')}
              </label>
              <input
                id="confirm-new-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full rounded-lg border border-lumio-border bg-lumio-bg px-3 py-2.5 text-sm text-lumio-text placeholder-lumio-text-secondary outline-none transition-colors focus:border-lumio-primary focus:ring-2 focus:ring-lumio-primary/30"
                placeholder={t('resetPassword.confirmPasswordLabel')}
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-lumio-primary px-4 py-2.5 text-sm font-medium text-white transition-colors hover:bg-lumio-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? t('common.loading') : t('resetPassword.updateButton')}
            </button>
          </form>
        )}

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-lumio-primary hover:underline">
            {t('forgotPassword.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
