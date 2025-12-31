import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSupabaseClient } from '@lumio/core';
import { Sparkles, AlertCircle } from 'lucide-react';

export function AuthCallbackPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const handleCallback = async () => {
      const supabase = getSupabaseClient();

      // Check for error in URL params
      const errorParam = searchParams.get('error');
      const errorDescription = searchParams.get('error_description');

      if (errorParam) {
        setError(errorDescription || errorParam);
        setTimeout(() => navigate('/login'), 3000);
        return;
      }

      // Check for authorization code (PKCE flow)
      const code = searchParams.get('code');

      if (code) {
        // Exchange authorization code for session
        const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

        if (exchangeError) {
          console.error('Code exchange error:', exchangeError);
          setError(exchangeError.message);
          setTimeout(() => navigate('/login'), 3000);
          return;
        }
      }

      // Check if we have a session now
      const { data: { session } } = await supabase.auth.getSession();

      if (session) {
        // Redirect to dashboard - AuthContext will handle state
        navigate('/dashboard');
      } else {
        // No session, try to get it from URL hash (implicit flow)
        // Supabase should have processed it automatically
        setError('Autenticazione fallita. Riprova.');
        setTimeout(() => navigate('/login'), 3000);
      }
    };

    handleCallback();
  }, [navigate, searchParams]);

  if (error) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white px-6">
        <div className="w-16 h-16 rounded-2xl bg-rose-100 flex items-center justify-center mb-4">
          <AlertCircle className="w-8 h-8 text-rose-500" />
        </div>
        <p className="text-rose-600 font-medium text-center mb-2">{error}</p>
        <p className="text-sm text-slate-400">Reindirizzamento al login...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-b from-slate-50 to-white">
      <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mb-4">
        <Sparkles className="w-8 h-8 text-primary animate-pulse" />
      </div>
      <p className="text-slate-600 font-medium">Autenticazione in corso...</p>
    </div>
  );
}
