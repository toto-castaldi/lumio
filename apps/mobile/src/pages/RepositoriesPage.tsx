import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { getUserRepositories, type Repository } from '@lumio/core';
import { ChevronLeft, FolderGit2, ExternalLink, Layers, RefreshCw } from 'lucide-react';

const WEB_APP_URL = 'https://lumio.toto-castaldi.com';

export function RepositoriesPage() {
  const navigate = useNavigate();
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRepositories();
  }, []);

  const loadRepositories = async () => {
    try {
      setIsLoading(true);
      const repos = await getUserRepositories();
      setRepositories(repos);
      setError(null);
    } catch (err) {
      console.error('Failed to load repositories:', err);
      setError('Impossibile caricare i repository');
    } finally {
      setIsLoading(false);
    }
  };

  const handleOpenWebRepositories = () => {
    window.open(`${WEB_APP_URL}/repositories`, '_blank');
  };

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="flex items-center justify-between">
          <button
            onClick={() => navigate('/dashboard')}
            className="flex items-center gap-1.5 text-slate-600 font-medium active:text-slate-900 transition-colors h-11 px-2 -ml-2"
          >
            <ChevronLeft className="w-5 h-5" />
            <span>Indietro</span>
          </button>
          <h1 className="text-lg font-bold text-slate-800">Repository</h1>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 space-y-4">
        {isLoading ? (
          <div className="flex-1 flex flex-col items-center justify-center py-16">
            <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center mb-4 animate-pulse">
              <FolderGit2 className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-slate-500 font-medium">Caricamento...</p>
          </div>
        ) : error ? (
          <Card className="border-rose-200 bg-rose-50">
            <CardContent className="py-6 text-center">
              <p className="text-rose-700 mb-4">{error}</p>
              <Button variant="outline" onClick={loadRepositories} className="h-11 rounded-xl">
                <RefreshCw className="w-4 h-4 mr-2" />
                Riprova
              </Button>
            </CardContent>
          </Card>
        ) : repositories.length === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-12 text-center">
            <div className="w-20 h-20 rounded-3xl bg-slate-100 flex items-center justify-center mb-5">
              <FolderGit2 className="w-10 h-10 text-slate-400" />
            </div>
            <h2 className="text-xl font-bold text-slate-800 mb-2">Nessun repository</h2>
            <p className="text-slate-500 mb-6 max-w-xs">
              Non hai ancora aggiunto nessun repository di flashcard.
            </p>
            <Button onClick={handleOpenWebRepositories} className="h-12 px-6 rounded-xl">
              <ExternalLink className="w-4 h-4 mr-2" />
              Aggiungi da Web
            </Button>
          </div>
        ) : (
          <>
            {/* Repository List */}
            <div className="space-y-3">
              {repositories.map((repo) => (
                <Card
                  key={repo.id}
                  className="border-slate-200 hover:bg-slate-50 transition-colors"
                >
                  <CardHeader className="pb-2">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center flex-shrink-0">
                        <FolderGit2 className="w-5 h-5 text-blue-600" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-base font-semibold text-slate-800 truncate">
                          {repo.name || 'Repository'}
                        </CardTitle>
                        <CardDescription className="text-xs truncate mt-0.5">
                          {repo.url}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-1.5 text-slate-600">
                        <Layers className="w-4 h-4" />
                        <span className="font-medium">{repo.cardCount || 0}</span>
                        <span className="text-slate-400">card</span>
                      </div>
                      {repo.lastSyncedAt && (
                        <span className="text-xs text-slate-400">
                          Sync: {new Date(repo.lastSyncedAt).toLocaleDateString('it-IT')}
                        </span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Add More Button */}
            <button
              onClick={handleOpenWebRepositories}
              className="w-full flex items-center justify-center gap-2 p-4 rounded-2xl border-2 border-dashed border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-600 transition-colors"
            >
              <ExternalLink className="w-4 h-4" />
              <span className="font-medium">Gestisci su Web</span>
            </button>
          </>
        )}
      </main>

      {/* Info Footer */}
      <footer className="px-4 py-4">
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-100">
          <p className="text-xs text-slate-500 text-center">
            Per aggiungere o rimuovere repository, usa la versione Web.
          </p>
        </div>
      </footer>
    </div>
  );
}
