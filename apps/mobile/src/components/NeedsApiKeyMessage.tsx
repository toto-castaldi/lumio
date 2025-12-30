import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { useAuth } from '@/contexts/AuthContext';

const WEB_APP_URL = 'https://lumio.toto-castaldi.com';

export function NeedsApiKeyMessage() {
  const { logout } = useAuth();

  const handleOpenWeb = () => {
    window.open(`${WEB_APP_URL}/setup/api-keys`, '_blank');
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="text-xl">Configurazione richiesta</CardTitle>
        <CardDescription>
          Per utilizzare Lumio, devi configurare le tue API keys (OpenAI o Anthropic).
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground text-center">
          Questa operazione e disponibile solo su Web.
        </p>

        <Button
          onClick={handleOpenWeb}
          className="w-full"
          size="lg"
        >
          Apri Lumio Web
        </Button>

        <Button
          onClick={handleLogout}
          variant="ghost"
          className="w-full"
          size="sm"
        >
          Logout per cambiare account
        </Button>
      </CardContent>
    </Card>
  );
}
