import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import { useEffect, useState } from 'react';
import { APP_NAME, signInWithDevUser } from '@lumio/core';
import { useAuth } from '../contexts/AuthContext';

const isDev = __DEV__;

export default function LoginScreen() {
  const router = useRouter();
  const { state, signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (state === 'ready') {
      router.replace('/' as Href);
    } else if (state === 'needs_api_key') {
      router.replace('/setup/api-keys' as Href);
    }
  }, [state, router]);

  const handleGoogleLogin = async () => {
    await signInWithGoogle();
  };

  const handleDevLogin = async () => {
    setIsLoading(true);
    const { error } = await signInWithDevUser();
    setIsLoading(false);
    if (error) {
      console.error('Dev login error:', error);
    }
  };

  if (state === 'loading') {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>Caricamento...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.title}>{APP_NAME}</Text>
        <Text style={styles.subtitle}>
          Piattaforma di studio con flashcard AI-powered
        </Text>

        <TouchableOpacity style={styles.googleButton} onPress={handleGoogleLogin}>
          <Text style={styles.googleButtonText}>Accedi con Google</Text>
        </TouchableOpacity>

        {isDev && (
          <>
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Solo sviluppo</Text>
              <View style={styles.dividerLine} />
            </View>
            <TouchableOpacity
              style={styles.devButton}
              onPress={handleDevLogin}
              disabled={isLoading}
            >
              <Text style={styles.devButtonText}>
                {isLoading ? 'Accesso...' : '🛠️ Dev Login'}
              </Text>
            </TouchableOpacity>
          </>
        )}

        <Text style={styles.disclaimer}>
          Registrandoti accetti i nostri termini di servizio
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    backgroundColor: 'white',
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 32,
  },
  googleButton: {
    width: '100%',
    backgroundColor: '#4285F4',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  googleButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    width: '100%',
    marginVertical: 16,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: '#ddd',
  },
  dividerText: {
    paddingHorizontal: 12,
    fontSize: 12,
    color: '#999',
    textTransform: 'uppercase',
  },
  devButton: {
    width: '100%',
    backgroundColor: '#f0f0f0',
    paddingVertical: 14,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  devButtonText: {
    color: '#333',
    fontSize: 16,
    fontWeight: '600',
  },
  disclaimer: {
    fontSize: 12,
    color: '#999',
    textAlign: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
  },
});
