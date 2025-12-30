import { useState, useEffect } from 'react';
import {
  saveApiKey,
  deleteApiKey,
  testApiKey as testApiKeyFn,
  getUserApiKeys,
  API_KEY_PREFIXES,
  APP_NAME,
  type LLMProvider,
  type UserApiKey,
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
import { Trash2, CheckCircle, XCircle, Loader2 } from 'lucide-react';

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export function ApiKeySettings() {
  const { refreshApiKeyStatus } = useAuth();

  const [existingKeys, setExistingKeys] = useState<UserApiKey[]>([]);
  const [isLoadingKeys, setIsLoadingKeys] = useState(true);
  const [provider, setProvider] = useState<LLMProvider>('openai');
  const [apiKey, setApiKey] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [deletingKeyId, setDeletingKeyId] = useState<string | null>(null);

  // Load existing keys
  useEffect(() => {
    loadExistingKeys();
  }, []);

  const loadExistingKeys = async () => {
    try {
      const keys = await getUserApiKeys();
      setExistingKeys(keys);
    } catch (err) {
      console.error('Failed to load API keys:', err);
    } finally {
      setIsLoadingKeys(false);
    }
  };

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
      // Check if this is the first key (make it preferred)
      const isFirst = existingKeys.length === 0;

      // Save the key (the Edge Function validates and encrypts it)
      await saveApiKey(provider, apiKey, isFirst);

      // Refresh auth context and keys list
      await refreshApiKeyStatus();
      await loadExistingKeys();

      // Reset form
      setApiKey('');
      setTestStatus('idle');

      toast.success('API Key salvata', {
        description: `La tua chiave ${provider === 'openai' ? 'OpenAI' : 'Anthropic'} e stata configurata.`,
      });
    } catch (err) {
      console.error('Save error:', err);
      const message = err instanceof Error ? err.message : 'Errore durante il salvataggio della chiave';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteKey = async (keyId: string, keyProvider: LLMProvider) => {
    setDeletingKeyId(keyId);
    try {
      await deleteApiKey(keyProvider);
      await refreshApiKeyStatus();
      await loadExistingKeys();

      toast.success('API Key rimossa', {
        description: `La chiave ${keyProvider === 'openai' ? 'OpenAI' : 'Anthropic'} e stata eliminata.`,
      });
    } catch (err) {
      console.error('Delete error:', err);
      toast.error('Errore', {
        description: 'Impossibile eliminare la chiave',
      });
    } finally {
      setDeletingKeyId(null);
    }
  };

  const handleProviderChange = (value: string) => {
    setProvider(value as LLMProvider);
    setApiKey('');
    setError(null);
    setTestStatus('idle');
  };

  const getProviderDisplayName = (prov: LLMProvider) =>
    prov === 'openai' ? 'OpenAI' : 'Anthropic';

  return (
    <div className="space-y-6">
      {/* Existing Keys */}
      {isLoadingKeys ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" />
          Caricamento chiavi...
        </div>
      ) : existingKeys.length > 0 ? (
        <div className="space-y-3">
          <h3 className="text-sm font-medium">Chiavi configurate</h3>
          {existingKeys.map((key) => (
            <Card key={key.id} className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {key.isValid ? (
                    <CheckCircle className="h-5 w-5 text-green-500" />
                  ) : (
                    <XCircle className="h-5 w-5 text-red-500" />
                  )}
                  <div>
                    <p className="font-medium">{getProviderDisplayName(key.provider)}</p>
                    <p className="text-xs text-muted-foreground">
                      {key.isValid ? 'Valida' : 'Non valida'}
                    </p>
                  </div>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeleteKey(key.id, key.provider)}
                  disabled={deletingKeyId === key.id}
                >
                  {deletingKeyId === key.id ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Trash2 className="h-4 w-4 text-destructive" />
                  )}
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : null}

      {/* Add New Key Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">
            {existingKeys.length > 0 ? 'Aggiungi chiave' : 'Configura API Key'}
          </CardTitle>
          <CardDescription>
            Per generare le domande, {APP_NAME} usa AI. I costi delle chiamate sono a carico tuo.
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
                {isLoading ? 'Salvando...' : 'Salva'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
