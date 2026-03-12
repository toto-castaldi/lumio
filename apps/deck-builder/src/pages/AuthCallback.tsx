import { useEffect } from 'react';
import { useNavigate } from 'react-router';
import { supabase } from '../lib/supabase';
import { useI18n } from '../contexts/I18nContext';

export function AuthCallback() {
  const navigate = useNavigate();
  const { t } = useI18n();

  useEffect(() => {
    // detectSessionInUrl handles the code exchange automatically.
    // Listen for auth state change to know when session is ready.
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        navigate('/', { replace: true });
      }
    });
    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-lumio-bg">
      <div className="flex flex-col items-center gap-3">
        {/* Spinner */}
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-lumio-border border-t-lumio-primary" />
        <p className="text-sm text-lumio-text-secondary">{t('common.loading')}</p>
      </div>
    </div>
  );
}
