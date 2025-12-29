import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  saveApiKey,
  testApiKey as testApiKeyFn,
  API_KEY_PREFIXES,
  APP_NAME,
  type LLMProvider,
} from '@lumio/core';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { toast } from 'sonner';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function SetupApiKeysPage() {
  const navigate = useNavigate();
  const { refreshApiKeyStatus } = useAuth();

  const [provider, setProvider] = useState<LLMProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');

  const validateKeyFormat = (key: string, prov: LLMProvider): boolean => {
    const prefix = API_KEY_PREFIXES[prov];
    return key.startsWith(prefix);
  };

  const handleTestApiKey = async (): Promise<boolean> => {
    setError(null);

    if (!apiKey.trim()) {
      setError('Inserisci una API key');
      return false;
    }

    if (!validateKeyFormat(apiKey, provider)) {
      const providerName = provider === 'openai' ? 'OpenAI' : 'Anthropic';
      setError(
        `La chiave ${providerName} deve iniziare con "${API_KEY_PREFIXES[provider]}"`
      );
      return false;
    }

    setTestStatus('testing');

    try {
      const result = await testApiKeyFn(provider, apiKey);

      if (result.valid) {
        setTestStatus('success');
        return true;
      } else {
        setTestStatus('error');
        setError(result.error || 'Chiave non valida o scaduta');
        return false;
      }
    } catch {
      setTestStatus('error');
      setError('Errore durante il test della chiave');
      return false;
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!apiKey.trim()) {
      setError('Inserisci una API key');
      return;
    }

    if (!validateKeyFormat(apiKey, provider)) {
      const providerName = provider === 'openai' ? 'OpenAI' : 'Anthropic';
      setError(
        `La chiave ${providerName} deve iniziare con "${API_KEY_PREFIXES[provider]}"`
      );
      return;
    }

    setIsLoading(true);

    try {
      // Save the key (the Edge Function validates and encrypts it)
      await saveApiKey(provider, apiKey, true);

      // Refresh auth context
      await refreshApiKeyStatus();

      toast.success('API Key salvata', {
        description: 'La tua chiave API e stata configurata con successo.',
      });

      // Navigate to dashboard
      navigate('/dashboard');
    } catch (err) {
      console.error('Save error:', err);
      const message = err instanceof Error ? err.message : 'Errore durante il salvataggio della chiave';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleProviderChange = (value: string) => {
    setProvider(value as LLMProvider);
    setApiKey('');
    setError(null);
    setTestStatus('idle');
  };

  return (
    <div className="flex min-h-screen items-center justify-center p-4">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle>Configura API Key</CardTitle>
          <CardDescription>
            Per generare le domande, {APP_NAME} usa AI. Configura le tue API
            keys. I costi delle chiamate AI sono a carico tuo.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="provider">Provider</Label>
              <Select value={provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="openai">OpenAI</SelectItem>
                  <SelectItem value="anthropic">Anthropic</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="apiKey">API Key</Label>
              <Input
                id="apiKey"
                type="password"
                value={apiKey}
                onChange={(e) => {
                  setApiKey(e.target.value);
                  setError(null);
                  setTestStatus('idle');
                }}
                placeholder={`Inizia con ${API_KEY_PREFIXES[provider]}...`}
              />
              <p className="text-xs text-muted-foreground">
                {provider === 'openai' ? (
                  <>
                    Ottieni la tua API key su{' '}
                    <a
                      href="https://platform.openai.com/api-keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      platform.openai.com
                    </a>
                  </>
                ) : (
                  <>
                    Ottieni la tua API key su{' '}
                    <a
                      href="https://console.anthropic.com/settings/keys"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      console.anthropic.com
                    </a>
                  </>
                )}
              </p>
            </div>

            {error && (
              <Alert variant="destructive">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {testStatus === 'success' && (
              <Alert>
                <AlertDescription className="text-green-600">
                  Chiave valida!
                </AlertDescription>
              </Alert>
            )}

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={handleTestApiKey}
                disabled={!apiKey || isLoading || testStatus === 'testing'}
              >
                {testStatus === 'testing' ? 'Testing...' : 'Test Connessione'}
              </Button>
              <Button
                type="submit"
                className="flex-1"
                disabled={isLoading || testStatus === 'testing'}
              >
                {isLoading ? 'Salvando...' : 'Continua'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
