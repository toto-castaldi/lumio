import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getSupabaseClient } from '@lumio/core';

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
      <div className="flex min-h-screen flex-col items-center justify-center gap-2">
        <p className="text-destructive">{error}</p>
        <p className="text-sm text-muted-foreground">Reindirizzamento al login...</p>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Autenticazione in corso...</p>
    </div>
  );
}
