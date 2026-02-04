import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
} from 'react-native';
import {
  GoogleSigninButton,
} from '@react-native-google-signin/google-signin';
import { useAuth } from '../contexts/AuthContext';

/**
 * LoginScreen displays the login UI with Google Sign-In.
 *
 * Layout:
 * - Lumio logo (text placeholder for now)
 * - Tagline: "Your flashcards, supercharged"
 * - Google Sign-In button
 *
 * Handles loading and error states during sign-in process.
 */
export function LoginScreen() {
  const { signInWithGoogle } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // Navigation happens automatically via AuthContext state change
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Sign in failed';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        {/* Logo placeholder - will be replaced with actual logo */}
        <Text style={styles.logo}>Lumio</Text>

        {/* Tagline */}
        <Text style={styles.tagline}>Your flashcards, supercharged</Text>

        {/* Error message */}
        {error && <Text style={styles.error}>{error}</Text>}

        {/* Google Sign-In button or loading indicator */}
        {isLoading ? (
          <ActivityIndicator size="large" color="#3B82F6" />
        ) : (
          <GoogleSigninButton
            size={GoogleSigninButton.Size.Wide}
            color={GoogleSigninButton.Color.Dark}
            onPress={handleSignIn}
            disabled={isLoading}
          />
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  logo: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#3B82F6',
    marginBottom: 8,
  },
  tagline: {
    fontSize: 16,
    color: '#6B7280',
    marginBottom: 48,
    textAlign: 'center',
  },
  error: {
    color: '#ef4444',
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
});
