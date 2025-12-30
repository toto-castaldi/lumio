import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  addRepository,
  deleteRepository,
  syncRepository,
  getUserRepositories,
  type Repository,
  type SyncStatus,
} from '@lumio/core';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { toast } from 'sonner';

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
  const [isAdding, setIsAdding] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  const [deletingIds, setDeletingIds] = useState<Set<string>>(new Set());
  const [deleteConfirm, setDeleteConfirm] = useState<{ id: string; name: string } | null>(null);

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

    setIsAdding(true);

    try {
      const newRepo = await addRepository(url.trim());
      setRepositories((prev) => [newRepo, ...prev]);
      setUrl('');
      toast.success('Repository aggiunto', {
        description: `${newRepo.name} con ${newRepo.cardCount} card`,
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
                  disabled={isAdding}
                />
                <p className="text-xs text-muted-foreground">
                  Il repository deve contenere un README.md con lumio_format_version: 1
                </p>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button type="submit" disabled={isAdding || !url.trim()}>
                {isAdding ? 'Aggiungendo...' : 'Aggiungi Repository'}
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
                          <h3 className="font-semibold truncate">{repo.name}</h3>
                        </div>
                        {repo.description && (
                          <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                            {repo.description}
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
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSync(repo.id)}
                          disabled={syncingIds.has(repo.id) || deletingIds.has(repo.id)}
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
    </div>
  );
}
