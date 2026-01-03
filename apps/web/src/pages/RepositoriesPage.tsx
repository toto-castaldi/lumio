import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  addRepository,
  deleteRepository,
  syncRepository,
  getUserRepositories,
  validateGitHubToken,
  updateRepositoryToken,
  type Repository,
  type SyncStatus,
} from '@lumio/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import { Lock, AlertTriangle, Key } from 'lucide-react';

function getSyncStatusIcon(status: SyncStatus): string {
  switch (status) {
    case 'synced':
      return '✓';
    case 'syncing':
      return '↻';
    case 'pending':
      return '○';
    case 'error':
      return '✗';
    default:
      return '?';
  }
}

function getSyncStatusColor(status: SyncStatus): string {
  switch (status) {
    case 'synced':
      return 'text-green-600';
    case 'syncing':
      return 'text-blue-600 animate-spin';
    case 'pending':
      return 'text-yellow-600';
    case 'error':
      return 'text-red-600';
    default:
      return 'text-gray-600';
  }
}

function formatDate(dateString?: string): string {
  if (!dateString) return 'Mai';
  const date = new Date(dateString);
  return date.toLocaleDateString('it-IT', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function RepositoriesPage() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [url, setUrl] = useState('');
  const [isPrivate, setIsPrivate] = useState(false);
  const [accessToken, setAccessToken] = useState('');
  const [isValidatingToken, setIsValidatingToken] = useState(false);
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

  // Update token dialog state
  const [updateTokenRepo, setUpdateTokenRepo] = useState<Repository | null>(null);
  const [newToken, setNewToken] = useState('');
  const [isUpdatingToken, setIsUpdatingToken] = useState(false);
  const [updateTokenError, setUpdateTokenError] = useState<string | null>(null);

  // Load repositories on mount
  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      const repos = await getUserRepositories();
      setRepositories(repos);
    } catch (err) {
      console.error('Failed to load repositories:', err);
      toast.error('Errore nel caricamento dei repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddRepository = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!url.trim()) {
      setError('Inserisci un URL');
      return;
    }

    // Basic URL validation
    if (!url.includes('github.com/')) {
      setError('Inserisci un URL GitHub valido (es. https://github.com/user/repo)');
      return;
    }

    // Validate token for private repos
    if (isPrivate) {
      if (!accessToken.trim()) {
        setError('Inserisci un Personal Access Token per i repository privati');
        return;
      }

      // Validate token before adding
      setIsValidatingToken(true);
      try {
        const validation = await validateGitHubToken(url.trim(), accessToken.trim());
        if (!validation.valid) {
          setError(validation.error || 'Token non valido o senza permessi sufficienti');
          setIsValidatingToken(false);
          return;
        }
      } catch (err) {
        setError('Errore durante la validazione del token');
        setIsValidatingToken(false);
        return;
      }
      setIsValidatingToken(false);
    }

    setIsAdding(true);

    try {
      const newRepo = await addRepository({
        url: url.trim(),
        isPrivate,
        accessToken: isPrivate ? accessToken.trim() : undefined,
      });
      setRepositories((prev) => [newRepo, ...prev]);
      setUrl('');
      setAccessToken('');
      setIsPrivate(false);
      toast.success('Repository aggiunto', {
        description: `${newRepo.name} con ${newRepo.cardCount} card${isPrivate ? ' (privato)' : ''}`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante l\'aggiunta';
      setError(message);
    } finally {
      setIsAdding(false);
    }
  };

  const handleSync = async (repoId: string) => {
    setSyncingIds((prev) => new Set(prev).add(repoId));

    try {
      const updatedRepo = await syncRepository(repoId);
      setRepositories((prev) =>
        prev.map((r) => (r.id === repoId ? updatedRepo : r))
      );
      toast.success('Sincronizzazione completata', {
        description: `${updatedRepo.cardCount} card aggiornate`,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante la sincronizzazione';
      toast.error('Sincronizzazione fallita', { description: message });
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(repoId);
        return next;
      });
    }
  };

  const handleDeleteClick = (repoId: string, repoName: string) => {
    setDeleteConfirm({ id: repoId, name: repoName });
  };

  const handleDeleteConfirm = async () => {
    if (!deleteConfirm) return;

    const { id: repoId } = deleteConfirm;
    setDeleteConfirm(null);
    setDeletingIds((prev) => new Set(prev).add(repoId));

    try {
      await deleteRepository(repoId);
      setRepositories((prev) => prev.filter((r) => r.id !== repoId));
      toast.success('Repository eliminato');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante l\'eliminazione';
      toast.error('Eliminazione fallita', { description: message });
    } finally {
      setDeletingIds((prev) => {
        const next = new Set(prev);
        next.delete(repoId);
        return next;
      });
    }
  };

  const handleUpdateToken = async () => {
    if (!updateTokenRepo || !newToken.trim()) return;

    setUpdateTokenError(null);
    setIsUpdatingToken(true);

    try {
      const updatedRepo = await updateRepositoryToken(updateTokenRepo.id, newToken.trim());
      setRepositories((prev) =>
        prev.map((r) => (r.id === updatedRepo.id ? updatedRepo : r))
      );
      setUpdateTokenRepo(null);
      setNewToken('');
      toast.success('Token aggiornato', {
        description: 'Il repository verrà sincronizzato automaticamente',
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Errore durante l\'aggiornamento';
      setUpdateTokenError(message);
    } finally {
      setIsUpdatingToken(false);
    }
  };

  const openUpdateTokenDialog = (repo: Repository) => {
    setUpdateTokenRepo(repo);
    setNewToken('');
    setUpdateTokenError(null);
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-muted-foreground">Caricamento...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold">I miei Repository</h1>
            <p className="text-muted-foreground">
              Gestisci i deck di flashcard collegati da GitHub
            </p>
          </div>
          <Button variant="outline" asChild>
            <Link to="/dashboard">← Dashboard</Link>
          </Button>
        </div>

        {/* Add Repository Form */}
        <Card>
          <CardHeader>
            <CardTitle>Aggiungi Repository</CardTitle>
            <CardDescription>
              Inserisci l'URL di un repository GitHub pubblico contenente flashcard in formato Lumio
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleAddRepository} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="url">URL Repository GitHub</Label>
                <Input
                  id="url"
                  type="url"
                  value={url}
                  onChange={(e) => {
                    setUrl(e.target.value);
                    setError(null);
                  }}
                  placeholder="https://github.com/username/repository"
                  disabled={isAdding || isValidatingToken}
                />
                <p className="text-xs text-muted-foreground">
                  Il repository deve contenere un README.md con lumio_format_version: 1
                </p>
              </div>

              {/* Private Repository Toggle */}
              <div className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-0.5">
                  <Label htmlFor="private-toggle" className="flex items-center gap-2">
                    <Lock className="h-4 w-4" />
                    Repository privato
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Attiva se il repository non è pubblico
                  </p>
                </div>
                <Switch
                  id="private-toggle"
                  checked={isPrivate}
                  onCheckedChange={(checked: boolean) => {
                    setIsPrivate(checked);
                    if (!checked) {
                      setAccessToken('');
                    }
                    setError(null);
                  }}
                  disabled={isAdding || isValidatingToken}
                />
              </div>

              {/* PAT Input (visible only for private repos) */}
              {isPrivate && (
                <div className="space-y-2">
                  <Label htmlFor="token" className="flex items-center gap-2">
                    <Key className="h-4 w-4" />
                    Personal Access Token (PAT)
                  </Label>
                  <Input
                    id="token"
                    type="password"
                    value={accessToken}
                    onChange={(e) => {
                      setAccessToken(e.target.value);
                      setError(null);
                    }}
                    placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                    disabled={isAdding || isValidatingToken}
                  />
                  <p className="text-xs text-muted-foreground">
                    Crea un{' '}
                    <a
                      href="https://github.com/settings/tokens/new?description=Lumio&scopes=repo"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Personal Access Token
                    </a>
                    {' '}con permesso "repo" per accedere ai repository privati.
                    Il token verrà crittografato e memorizzato in modo sicuro.
                  </p>
                </div>
              )}

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isAdding || isValidatingToken || !url.trim() || (isPrivate && !accessToken.trim())}>
                {isValidatingToken ? 'Validando token...' : isAdding ? 'Aggiungendo...' : 'Aggiungi Repository'}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Repository List */}
        <div className="space-y-4">
          <h2 className="text-lg font-semibold">
            Repository ({repositories.length})
          </h2>

          {repositories.length === 0 ? (
            <Card>
              <CardContent className="py-8 text-center">
                <p className="text-muted-foreground">
                  Nessun repository collegato. Aggiungi il tuo primo deck!
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {repositories.map((repo) => (
                <Card key={repo.id}>
                  <CardContent className="py-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            className={`text-lg ${getSyncStatusColor(repo.syncStatus)}`}
                            title={`Status: ${repo.syncStatus}`}
                          >
                            {getSyncStatusIcon(repo.syncStatus)}
                          </span>
                          {repo.isPrivate && (
                            <span title="Repository privato">
                              <Lock className="h-4 w-4 text-muted-foreground" />
                            </span>
                          )}
                          <h3 className="font-semibold truncate">{repo.name}</h3>
                          {repo.tokenStatus === 'invalid' && (
                            <span className="inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs text-destructive">
                              <AlertTriangle className="h-3 w-3" />
                              Token invalido
                            </span>
                          )}
                        </div>
                        {repo.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {repo.description}
                          </p>
                        )}
                        {repo.tokenErrorMessage && (
                          <p className="text-xs text-destructive mt-1">
                            {repo.tokenErrorMessage}
                          </p>
                        )}
                        <div className="flex flex-wrap gap-4 mt-2 text-sm text-muted-foreground">
                          <Link
                            to={`/repositories/${repo.id}/cards`}
                            className="text-primary hover:underline"
                          >
                            {repo.cardCount} card
                          </Link>
                          <span>Ultimo sync: {formatDate(repo.lastSyncedAt)}</span>
                          {repo.syncErrorMessage && (
                            <span className="text-yellow-600">
                              {repo.syncErrorMessage}
                            </span>
                          )}
                        </div>
                        <a
                          href={repo.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-blue-600 hover:underline mt-1 block truncate"
                        >
                          {repo.url}
                        </a>
                      </div>
                      <div className="flex gap-2 shrink-0">
                        {repo.tokenStatus === 'invalid' && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => openUpdateTokenDialog(repo)}
                            disabled={syncingIds.has(repo.id) || deletingIds.has(repo.id)}
                            className="text-destructive border-destructive hover:bg-destructive/10"
                          >
                            <Key className="h-3 w-3 mr-1" />
                            Aggiorna token
                          </Button>
                        )}
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(repo.id)}
                          disabled={syncingIds.has(repo.id) || deletingIds.has(repo.id) || repo.tokenStatus === 'invalid'}
                        >
                          {syncingIds.has(repo.id) ? 'Sync...' : 'Sync'}
                        </Button>
                        <Button
                          variant="destructive"
                          size="sm"
                          onClick={() => handleDeleteClick(repo.id, repo.name)}
                          disabled={syncingIds.has(repo.id) || deletingIds.has(repo.id)}
                        >
                          {deletingIds.has(repo.id) ? '...' : 'Elimina'}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteConfirm} onOpenChange={() => setDeleteConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare il repository?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare <strong>"{deleteConfirm?.name}"</strong>.
              <br /><br />
              Questa azione è irreversibile. Tutte le card associate a questo repository
              verranno eliminate definitivamente.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Update Token Dialog */}
      <Dialog open={!!updateTokenRepo} onOpenChange={(open) => !open && setUpdateTokenRepo(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Key className="h-5 w-5" />
              Aggiorna Token
            </DialogTitle>
            <DialogDescription>
              Il token per <strong>"{updateTokenRepo?.name}"</strong> non è più valido.
              Inserisci un nuovo Personal Access Token per continuare a sincronizzare questo repository.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="new-token">Nuovo Personal Access Token</Label>
              <Input
                id="new-token"
                type="password"
                value={newToken}
                onChange={(e) => {
                  setNewToken(e.target.value);
                  setUpdateTokenError(null);
                }}
                placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                disabled={isUpdatingToken}
              />
              <p className="text-xs text-muted-foreground">
                Crea un{' '}
                <a
                  href="https://github.com/settings/tokens/new?description=Lumio&scopes=repo"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  nuovo Personal Access Token
                </a>
                {' '}con permesso "repo".
              </p>
            </div>
            {updateTokenError && (
              <Alert variant="destructive">
                <AlertDescription>{updateTokenError}</AlertDescription>
              </Alert>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setUpdateTokenRepo(null)}
              disabled={isUpdatingToken}
            >
              Annulla
            </Button>
            <Button
              onClick={handleUpdateToken}
              disabled={isUpdatingToken || !newToken.trim()}
            >
              {isUpdatingToken ? 'Aggiornando...' : 'Aggiorna Token'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
