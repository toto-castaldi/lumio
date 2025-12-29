import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { getSession } from '@lumio/core';

export function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      // Supabase automatically handles the OAuth callback
      // and sets the session from URL hash.
      // We just need to check if it worked and redirect.
      const {
        data: { session },
      } = await getSession();

      if (session) {
        // Redirect to home - AuthContext will handle routing
        // based on whether user has API keys
        navigate('/');
      } else {
        // Auth failed, go back to login
        navigate('/login');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground">Autenticazione in corso...</p>
    </div>
  );
}
