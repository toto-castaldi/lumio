import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { Settings, ExternalLink, LogOut } from 'lucide-react';

const WEB_APP_URL = 'https://lumio.toto-castaldi.com';

export function NeedsApiKeyMessage() {
  const { logout } = useAuth();

  const handleOpenWeb = () => {
    window.open(`${WEB_APP_URL}/settings`, '_blank');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="w-full max-w-sm mx-auto text-center px-4">
      <div className="w-20 h-20 rounded-3xl bg-amber-100 flex items-center justify-center mx-auto mb-6">
        <Settings className="w-10 h-10 text-amber-600" />
      </div>

      <h2 className="text-xl font-bold text-slate-800 mb-2">
        Configurazione richiesta
      </h2>

      <p className="text-slate-500 mb-6">
        Per utilizzare Lumio, devi configurare le tue API keys (OpenAI o Anthropic) dalla versione Web.
      </p>

      <div className="space-y-3">
        <Button
          onClick={handleOpenWeb}
          className="w-full h-14 rounded-2xl text-base font-semibold shadow-lg shadow-primary/20"
        >
          <ExternalLink className="w-5 h-5 mr-2" />
          Apri Lumio Web
        </Button>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full h-11 rounded-xl text-slate-500"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Logout per cambiare account
        </Button>
      </div>
    </div>
  );
}
