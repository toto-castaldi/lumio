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
import { NeedsApiKeyMessage } from '@/components/NeedsApiKeyMessage';
import { APP_NAME, getVersionString, getUserStats, type UserStats } from '@lumio/core';

export function DashboardPage() {
  const { user, state, logout } = useAuth();
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

  // Show needs API key message if user doesn't have API keys
  if (state === 'needs_api_key') {
    return (
      <div className="min-h-screen p-4 flex flex-col">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-xl font-bold">{APP_NAME}</h1>
          <div className="flex items-center gap-2">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
              <AvatarFallback>
                {getInitials(user?.displayName)}
              </AvatarFallback>
            </Avatar>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center">
          <NeedsApiKeyMessage />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-lg space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h1 className="text-xl font-bold">{APP_NAME}</h1>
          <div className="flex items-center gap-3">
            <Avatar className="h-8 w-8">
              <AvatarImage src={user?.avatarUrl} alt={user?.displayName} />
              <AvatarFallback>
                {getInitials(user?.displayName)}
              </AvatarFallback>
            </Avatar>
            <Button variant="outline" size="sm" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </div>

        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle>Ciao, {user?.displayName?.split(' ')[0] || 'Utente'}!</CardTitle>
            <CardDescription>
              Benvenuto nella tua app di studio
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 grid-cols-2">
              <Link to="/repositories" className="block">
                <Card className="hover:bg-muted/50 transition-colors cursor-pointer h-full">
                  <CardHeader className="pb-2">
                    <CardTitle className="text-base">Repository</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-2xl font-bold">
                      {isLoadingStats ? '...' : stats.repositoryCount}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Deck collegati
                    </p>
                  </CardContent>
                </Card>
              </Link>

              <Card className="h-full">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-2xl font-bold">
                    {isLoadingStats ? '...' : stats.cardCount}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Card totali
                  </p>
                </CardContent>
              </Card>
            </div>

            <Card className="bg-muted/30">
              <CardContent className="pt-4">
                <p className="text-sm text-muted-foreground text-center">
                  Le sessioni di studio saranno disponibili nelle prossime versioni.
                </p>
              </CardContent>
            </Card>
          </CardContent>
        </Card>

        {/* Footer */}
        <div className="text-center text-xs text-muted-foreground">
          {getVersionString()}
        </div>
      </div>
    </div>
  );
}
