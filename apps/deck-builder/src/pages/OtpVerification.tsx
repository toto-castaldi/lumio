import { useState, useRef, useCallback, useEffect, type KeyboardEvent, type ChangeEvent, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router';
import toast from 'react-hot-toast';
import { useAuth } from '../contexts/AuthContext';
import { useI18n } from '../contexts/I18nContext';

const OTP_LENGTH = 6;

export function OtpVerification() {
  const { verifyEmailOtp } = useAuth();
  const { t } = useI18n();
  const navigate = useNavigate();
  const location = useLocation();

  const email = (location.state as { email?: string } | null)?.email ?? '';

  const [digits, setDigits] = useState<string[]>(Array(OTP_LENGTH).fill(''));
  const [loading, setLoading] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleVerify = useCallback(
    async (token: string) => {
      if (!email) return;
      setLoading(true);
      try {
        await verifyEmailOtp(email, token);
        toast.success(t('otp.title'));
        navigate('/login', { replace: true });
      } catch (err) {
        toast.error(err instanceof Error ? err.message : t('common.error'));
      } finally {
        setLoading(false);
      }
    },
    [email, verifyEmailOtp, navigate, t],
  );

  // Auto-submit when all 6 digits are entered
  useEffect(() => {
    const token = digits.join('');
    if (token.length === OTP_LENGTH && digits.every((d) => d !== '')) {
      handleVerify(token);
    }
  }, [digits, handleVerify]);

  function handleChange(index: number, e: ChangeEvent<HTMLInputElement>) {
    const value = e.target.value;
    // Only accept single digit
    if (value.length > 1) return;
    if (value && !/^\d$/.test(value)) return;

    const newDigits = [...digits];
    newDigits[index] = value;
    setDigits(newDigits);

    // Auto-advance to next field
    if (value && index < OTP_LENGTH - 1) {
      inputRefs.current[index + 1]?.focus();
    }
  }

  function handleKeyDown(index: number, e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Backspace' && !digits[index] && index > 0) {
      // Go back to previous field on backspace when current is empty
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

    // Focus last filled or next empty field
    const focusIndex = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIndex]?.focus();
  }

  function handleSubmit(e: FormEvent) {
    e.preventDefault();
    const token = digits.join('');
    if (token.length === OTP_LENGTH) {
      handleVerify(token);
    }
  }

  if (!email) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-lumio-bg px-4">
        <div className="w-full max-w-[400px] rounded-xl bg-lumio-surface p-8 text-center shadow-lg">
          <p className="mb-4 text-lumio-text">{t('common.error')}</p>
          <Link to="/signup" className="text-lumio-primary hover:underline">
            {t('signup.signUp')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-lumio-bg px-4">
      <div className="w-full max-w-[400px] rounded-xl bg-lumio-surface p-8 shadow-lg">
        <h1 className="mb-2 text-center text-2xl font-bold text-lumio-text">
          {t('otp.title')}
        </h1>
        <p className="mb-6 text-center text-sm text-lumio-text-secondary">
          {t('otp.subtitle')} <span className="font-medium text-lumio-text">{email}</span>
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 6-digit OTP inputs */}
          <div className="flex justify-center gap-2">
            {digits.map((digit, index) => (
              <input
                key={index}
                ref={(el) => { inputRefs.current[index] = el; }}
                type="text"
                inputMode="numeric"
                maxLength={1}
                value={digit}
                onChange={(e) => handleChange(index, e)}
                onKeyDown={(e) => handleKeyDown(index, e)}
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

        <div className="mt-6 text-center text-sm">
          <Link to="/login" className="text-lumio-primary hover:underline">
            {t('otp.backToLogin')}
          </Link>
        </div>
      </div>
    </div>
  );
}
