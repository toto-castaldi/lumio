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
import { APP_NAME, getVersionString, getUserStats, type UserStats } from '@lumio/core';

export function DashboardPage() {
  const { user, logout } = useAuth();
  const [stats, setStats] = useState<UserStats>({ repositoryCount: 0, cardCount: 0 });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

  useEffect(() => {
    getUserStats()
      .then(setStats)
      .catch((err) => console.error('Failed to load stats:', err))
      .finally(() => setIsLoadingStats(false));
  }, []);

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

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-4xl space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">{APP_NAME}</h1>
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
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
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
                  {isLoadingStats
                    ? 'Caricamento...'
                    : stats.cardCount > 0
                      ? `Hai ${stats.cardCount} carte da studiare`
                      : 'Aggiungi un repository per iniziare'}
                </p>
              </div>
              {isLoadingStats || stats.cardCount === 0 ? (
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
            <CardTitle>Benvenuto in Lumio!</CardTitle>
            <CardDescription>
              La tua piattaforma di studio con flashcard AI-powered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
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

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Obiettivo</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">-</p>
                  <p className="text-sm text-muted-foreground">
                    Nessun obiettivo attivo
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
