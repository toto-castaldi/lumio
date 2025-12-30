import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { ApiKeySettings } from '@/components/ApiKeySettings';
import { ArrowLeft, LogOut } from 'lucide-react';
import { APP_NAME } from '@lumio/core';

export function SettingsPage() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen p-4">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link to="/dashboard">
              <ArrowLeft className="h-5 w-5" />
            </Link>
          </Button>
          <h1 className="text-2xl font-bold">Impostazioni</h1>
        </div>

        {/* API Keys Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">API Keys</h2>
          <ApiKeySettings />
        </section>

        {/* Account Section */}
        <section>
          <h2 className="text-lg font-semibold mb-4">Account</h2>
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Il tuo account</CardTitle>
              <CardDescription>
                Sei connesso come {user?.email}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button
                variant="outline"
                onClick={handleLogout}
                className="w-full sm:w-auto"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </CardContent>
          </Card>
        </section>
      </div>
    </div>
  );
}
