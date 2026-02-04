import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
  Image,
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';

// Check if Google Sign-In is configured
const googleClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
const isGoogleConfigured = !!googleClientId;
console.log('[LoginScreen] Google Client ID:', googleClientId ? `${googleClientId.substring(0, 20)}...` : 'NOT SET');
console.log('[LoginScreen] isGoogleConfigured:', isGoogleConfigured);

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
          <TouchableOpacity
            style={styles.googleButton}
            onPress={handleSignIn}
            disabled={isLoading}
            activeOpacity={0.8}
          >
            <View style={styles.googleButtonContent}>
              <View style={styles.googleIconContainer}>
                <Text style={styles.googleIcon}>G</Text>
              </View>
              <Text style={styles.googleButtonText}>Sign in with Google</Text>
            </View>
          </TouchableOpacity>
        )}

        {!isGoogleConfigured && (
          <Text style={styles.configWarning}>
            Google Sign-In not configured.{'\n'}
            Set EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID
          </Text>
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
  googleButton: {
    backgroundColor: '#4285F4',
    borderRadius: 4,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 1.5,
  },
  googleButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 1,
    paddingRight: 12,
  },
  googleIconContainer: {
    backgroundColor: '#ffffff',
    padding: 12,
    marginRight: 12,
    borderTopLeftRadius: 2,
    borderBottomLeftRadius: 2,
  },
  googleIcon: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#4285F4',
  },
  googleButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  configWarning: {
    color: '#f97316',
    fontSize: 12,
    marginTop: 12,
    textAlign: 'center',
  },
});
