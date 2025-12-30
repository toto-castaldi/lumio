import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getUserRepositories, type Repository } from '@lumio/core';

export function RepositoriesPage() {
  const { logout } = useAuth();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadRepositories = async () => {
      try {
        const repos = await getUserRepositories();
        setRepositories(repos);
      } catch (err) {
        console.error('Failed to load repositories:', err);
        setError('Impossibile caricare i repository');
      } finally {
        setIsLoading(false);
      }
    };

    loadRepositories();
  }, []);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link to="/dashboard">
              <Button variant="ghost" size="sm">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  <path d="m15 18-6-6 6-6" />
                </svg>
              </Button>
            </Link>
            <h1 className="text-xl font-bold">Repository</h1>
          </div>
          <Button variant="outline" size="sm" onClick={handleLogout}>
            Logout
          </Button>
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="text-center py-8">
            <p className="text-muted-foreground">Caricamento...</p>
          </div>
        ) : error ? (
          <Card>
            <CardContent className="pt-6">
              <p className="text-center text-destructive">{error}</p>
            </CardContent>
          </Card>
        ) : repositories.length === 0 ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Nessun repository</CardTitle>
              <CardDescription>
                Non hai ancora aggiunto nessun repository di flashcard.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Puoi aggiungere repository dalla versione Web di Lumio.
              </p>
              <Button
                className="mt-4 w-full"
                variant="outline"
                onClick={() => window.open('https://lumio.toto-castaldi.com/repositories', '_blank')}
              >
                Apri Lumio Web
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-3">
            {repositories.map((repo) => (
              <Card key={repo.id} className="hover:bg-muted/50 transition-colors">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base flex items-center gap-2">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="16"
                      height="16"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.403 5.403 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4" />
                      <path d="M9 18c-4.51 2-5-2-7-2" />
                    </svg>
                    {repo.name || 'Repository'}
                  </CardTitle>
                  <CardDescription className="text-xs truncate">
                    {repo.url}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">
                      {repo.cardCount || 0} card
                    </span>
                    {repo.lastSyncedAt && (
                      <span className="text-xs text-muted-foreground">
                        Sync: {new Date(repo.lastSyncedAt).toLocaleDateString('it-IT')}
                      </span>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Info */}
        <Card className="bg-muted/30">
          <CardContent className="pt-4">
            <p className="text-xs text-muted-foreground text-center">
              Per aggiungere o rimuovere repository, usa la versione Web.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
