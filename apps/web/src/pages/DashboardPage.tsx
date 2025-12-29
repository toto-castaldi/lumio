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
import { APP_NAME, getVersionString } from '@lumio/core';

export function DashboardPage() {
  const { user, logout } = useAuth();

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

        {/* Welcome Card */}
        <Card>
          <CardHeader>
            <CardTitle>Benvenuto in Lumio!</CardTitle>
            <CardDescription>
              La tua piattaforma di studio con flashcard AI-powered
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-muted-foreground">
              Questa e la dashboard principale. Le funzionalita di studio
              saranno disponibili nelle prossime versioni.
            </p>

            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Repository</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">0</p>
                  <p className="text-sm text-muted-foreground">
                    Deck collegati
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg">Card</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-3xl font-bold">0</p>
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
