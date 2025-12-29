import { useEffect } from 'react';
import { Stack, useRouter, useSegments, type Href } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { AuthProvider, useAuth } from '../contexts/AuthContext';

function RootLayoutNav() {
  const { state } = useAuth();
  const segments = useSegments();
  const router = useRouter();

  useEffect(() => {
    // Get the current route group
    const firstSegment = segments[0] as string | undefined;
    const inLoginScreen = firstSegment === 'login';
    const inSetupScreen = firstSegment === 'setup';

    // Don't redirect while loading
    if (state === 'loading') return;

    // Redirect based on auth state
    if (state === 'logged_out' && !inLoginScreen) {
      router.replace('/login' as Href);
    } else if (state === 'needs_api_key' && !inSetupScreen) {
      router.replace('/setup/api-keys' as Href);
    } else if (state === 'ready' && (inLoginScreen || inSetupScreen)) {
      router.replace('/' as Href);
    }
  }, [state, segments, router]);

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: 'Lumio',
          headerStyle: {
            backgroundColor: '#6366f1',
          },
          headerTintColor: '#fff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      />
      <Stack.Screen
        name="login"
        options={{
          headerShown: false,
        }}
      />
      <Stack.Screen
        name="setup/api-keys"
        options={{
          title: 'Configurazione Richiesta',
          headerStyle: {
            backgroundColor: '#6366f1',
          },
          headerTintColor: '#fff',
          headerBackVisible: false,
        }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  return (
    <AuthProvider>
      <RootLayoutNav />
      <StatusBar style="light" />
    </AuthProvider>
  );
}
