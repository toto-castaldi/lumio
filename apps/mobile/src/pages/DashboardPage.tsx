import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import {
  APP_NAME,
  getVersionString,
  getUserStats,
  type UserStats,
} from '@lumio/core';
import { FolderGit2, Layers, LogOut, Sparkles, ExternalLink } from 'lucide-react';

const WEB_APP_URL = 'https://lumio.toto-castaldi.com';

export function DashboardPage() {
  const navigate = useNavigate();
  const { user, state, hasApiKey, logout } = useAuth();
  const [stats, setStats] = useState<UserStats>({ repositoryCount: 0, cardCount: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    if (state === 'ready') {
      getUserStats()
        .then(setStats)
        .catch((err) => console.error('Failed to load stats:', err))
        .finally(() => setIsLoadingStats(false));
    }
  }, [state]);

  const handleLogout = async () => {
    await logout();
  };

  // Get initials for avatar fallback
  const getInitials = (name?: string) => {
    if (!name) return '?';
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  // Determine study button state
  const canStudy = hasApiKey && stats.cardCount > 0;
  const studyButtonDisabled = isLoadingStats || !canStudy;

  const handleOpenWebSettings = () => {
    window.open(`${WEB_APP_URL}/settings`, '_blank');
  };

  const getStudyMessage = () => {
    if (isLoadingStats) return null;
    if (!hasApiKey) {
      return {
        text: 'Configura le API Keys dalla versione web per studiare',
        action: (
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-xl mt-2"
            onClick={handleOpenWebSettings}
          >
            <ExternalLink className="w-4 h-4 mr-2" />
            Apri Lumio Web
          </Button>
        ),
      };
    }
    if (stats.cardCount === 0) {
      return {
        text: 'Aggiungi un repository per iniziare a studiare',
        action: (
          <Button
            variant="outline"
            size="sm"
            className="h-10 rounded-xl mt-2"
            asChild
          >
            <Link to="/repositories">
              <FolderGit2 className="w-4 h-4 mr-2" />
              Gestisci Repository
            </Link>
          </Button>
        ),
      };
    }
    return null;
  };

  const studyMessage = getStudyMessage();

  return (
    <div className="min-h-screen flex flex-col bg-gradient-to-b from-slate-50 to-white">
      {/* Header */}
      <header className="sticky top-0 z-10 px-4 py-3 bg-white/80 backdrop-blur-lg border-b border-slate-100">
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold text-slate-800">{APP_NAME}</h1>
          <div className="flex items-center gap-2">
            <Avatar className="h-9 w-9 border-2 border-slate-100">
              <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
              <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                {getInitials(user?.displayName)}
              </AvatarFallback>
            </Avatar>
            <button
              onClick={handleLogout}
              className="h-9 w-9 flex items-center justify-center rounded-full text-slate-500 hover:text-slate-700 hover:bg-slate-100 transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 px-4 py-6 space-y-6">
        {/* Study Button - Primary CTA */}
        <div className="space-y-3">
          <Button
            onClick={() => navigate('/study')}
            disabled={studyButtonDisabled}
            className="w-full h-16 rounded-2xl text-lg font-semibold shadow-lg shadow-primary/20 disabled:shadow-none"
          >
            <Sparkles className="w-5 h-5 mr-2" />
            Studia
          </Button>

          {studyMessage && (
            <Card className="border-amber-200 bg-amber-50/50">
              <CardContent className="py-4 text-center">
                <p className="text-sm text-amber-700">{studyMessage.text}</p>
                {studyMessage.action}
              </CardContent>
            </Card>
          )}
        </div>

        {/* Stats Cards */}
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wide px-1">
            Il tuo piano di studio
          </h2>

          <div className="grid grid-cols-2 gap-3">
            {/* Repository Card */}
            <Link to="/repositories" className="block">
              <Card className="h-full hover:bg-slate-50 active:scale-[0.98] transition-all cursor-pointer border-slate-200">
                <CardHeader className="pb-2">
                  <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center mb-2">
                    <FolderGit2 className="w-5 h-5 text-blue-600" />
                  </div>
                  <CardTitle className="text-sm font-medium text-slate-600">
                    Repository
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold text-slate-800">
                    {isLoadingStats ? (
                      <span className="inline-block w-8 h-8 bg-slate-200 rounded animate-pulse" />
                    ) : (
                      stats.repositoryCount
                    )}
                  </p>
                  <p className="text-xs text-slate-500 mt-1">Deck collegati</p>
                </CardContent>
              </Card>
            </Link>

            {/* Cards Card */}
            <Card className="h-full border-slate-200">
              <CardHeader className="pb-2">
                <div className="w-10 h-10 rounded-xl bg-purple-100 flex items-center justify-center mb-2">
                  <Layers className="w-5 h-5 text-purple-600" />
                </div>
                <CardTitle className="text-sm font-medium text-slate-600">
                  Card
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-slate-800">
                  {isLoadingStats ? (
                    <span className="inline-block w-8 h-8 bg-slate-200 rounded animate-pulse" />
                  ) : (
                    stats.cardCount
                  )}
                </p>
                <p className="text-xs text-slate-500 mt-1">Card totali</p>
              </CardContent>
            </Card>
          </div>
        </div>

      </main>

      {/* Footer */}
      <footer className="px-4 py-4 text-center">
        <p className="text-xs text-slate-400">{getVersionString()}</p>
      </footer>
    </div>
  );
}
