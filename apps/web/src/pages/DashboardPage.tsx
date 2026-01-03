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
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Settings } from 'lucide-react';
import { APP_NAME, getVersionString, getUserStats, type UserStats } from '@lumio/core';

export function DashboardPage() {
  const { user, hasApiKey } = useAuth();
  const [stats, setStats] = useState<UserStats>({ repositoryCount: 0, cardCount: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    getUserStats()
      .then(setStats)
      .catch((err) => console.error('Failed to load stats:', err))
      .finally(() => setIsLoadingStats(false));
  }, []);

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

  // Determine study button state and message
  const canStudy = hasApiKey && stats.cardCount > 0;
  const getStudyMessage = () => {
    if (isLoadingStats) return 'Caricamento...';
    if (!hasApiKey) return 'Configura le API Keys per studiare';
    if (stats.cardCount === 0) return 'Aggiungi un repository per iniziare';
    return '';
  };

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="Lumio" className="h-10 w-10" />
            <h1 className="text-2xl font-bold">{APP_NAME}</h1>
          </div>
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
                <AvatarFallback>
                  {getInitials(user?.displayName)}
                </AvatarFallback>
              </Avatar>
              <span className="text-sm text-muted-foreground">
                {user?.displayName || user?.email}
              </span>
            </div>
            <Button variant="ghost" size="icon" asChild>
              <Link to="/settings">
                <Settings className="h-5 w-5" />
              </Link>
            </Button>
          </div>
        </div>

        {/* Study Button */}
        <Card className="bg-primary/5 border-primary/20">
          <CardContent className="py-6">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">Pronto a studiare?</h2>
                <p className="text-sm text-muted-foreground">
                  {getStudyMessage()}
                  {!hasApiKey && !isLoadingStats && (
                    <Link to="/settings" className="ml-1 underline">
                      Vai alle Impostazioni
                    </Link>
                  )}
                </p>
              </div>
              {isLoadingStats || !canStudy ? (
                <Button size="lg" disabled>
                  Studia
                </Button>
              ) : (
                <Button asChild size="lg">
                  <Link to="/study">Studia</Link>
                </Button>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle>Il tuo piano di studio</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Link to="/repositories" className="block">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg">Repository</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-3xl font-bold">
                      {isLoadingStats ? '...' : stats.repositoryCount}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      Deck collegati
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">
                    {isLoadingStats ? '...' : stats.cardCount}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Card da studiare
                  </p>
                </CardContent>
              </Card>

              
            </div>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-sm text-muted-foreground">
          {getVersionString()}
        </div>
      </div>
    </div>
  );
}
