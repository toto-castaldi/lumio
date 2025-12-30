import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import { getSupabaseClient } from '@lumio/core';

/**
 * OAuth Callback Handler
 *
 * This route handles the redirect from Google OAuth.
 * The tokens are passed in the URL hash fragment:
 * lumio://auth/callback#access_token=xxx&refresh_token=yyy
 */
export default function AuthCallbackScreen() {
  const router = useRouter();
  const urlFromHook = Linking.useURL();
  const [callbackUrl, setCallbackUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const processedRef = useRef(false);

  // Get URL from multiple sources
  useEffect(() => {
    const getUrl = async () => {
      // Try useURL hook first
      if (urlFromHook) {
        console.log('Got URL from hook:', urlFromHook);
        setCallbackUrl(urlFromHook);
        return;
      }

      // Fallback to getInitialURL
      const initialUrl = await Linking.getInitialURL();
      if (initialUrl) {
        console.log('Got URL from getInitialURL:', initialUrl);
        setCallbackUrl(initialUrl);
      }
    };

    getUrl();
  }, [urlFromHook]);

  useEffect(() => {
    // Prevent double processing
    if (processedRef.current || !callbackUrl) return;

    const handleCallback = async () => {
      try {
        console.log('Processing auth callback URL:', callbackUrl);
        processedRef.current = true;

        // Parse the URL to extract tokens
        // Tokens can be in hash fragment (#) or query params (?)
        // Format: lumio://auth/callback#access_token=xxx&refresh_token=yyy
        // Or: lumio://auth/callback?access_token=xxx&refresh_token=yyy

        let accessToken: string | null = null;
        let refreshToken: string | null = null;

        // Try hash fragment first
        const hashIndex = callbackUrl.indexOf('#');
        if (hashIndex !== -1) {
          const hashParams = new URLSearchParams(callbackUrl.substring(hashIndex + 1));
          accessToken = hashParams.get('access_token');
          refreshToken = hashParams.get('refresh_token');
          console.log('Tokens from hash:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });
        }

        // Fallback to query params
        if (!accessToken || !refreshToken) {
          const queryIndex = callbackUrl.indexOf('?');
          if (queryIndex !== -1) {
            const queryParams = new URLSearchParams(callbackUrl.substring(queryIndex + 1));
            accessToken = accessToken || queryParams.get('access_token');
            refreshToken = refreshToken || queryParams.get('refresh_token');
            console.log('Tokens from query:', { hasAccess: !!accessToken, hasRefresh: !!refreshToken });
          }
        }

        if (!accessToken || !refreshToken) {
          const info = `URL: ${callbackUrl.substring(0, 100)}...\nHas #: ${callbackUrl.includes('#')}\nHas ?: ${callbackUrl.includes('?')}\nLength: ${callbackUrl.length}`;
          console.error('Missing tokens in callback URL:', info);
          setDebugInfo(info);
          setError('Token non trovati nella risposta');
          return;
        }

        // Set the session in Supabase
        const supabase = getSupabaseClient();
        const { error: sessionError } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (sessionError) {
          console.error('Failed to set session:', sessionError);
          setDebugInfo(sessionError.message);
          setError('Errore durante il login');
          return;
        }

        console.log('Session set successfully');
        // Session set successfully - the AuthContext will detect the change
        // and redirect to the appropriate screen (/ or /setup/api-keys)
        router.replace('/' as Href);
      } catch (err) {
        console.error('Auth callback error:', err);
        setDebugInfo(String(err));
        setError('Errore imprevisto');
      }
    };

    handleCallback();
  }, [callbackUrl, router]);

  // Error state
  if (error) {
    return (
      <View style={styles.container}>
        <Text style={styles.errorTitle}>{error}</Text>
        <Text style={styles.debugText}>{debugInfo}</Text>
        <TouchableOpacity
          style={styles.button}
          onPress={() => router.replace('/login' as Href)}
        >
          <Text style={styles.buttonText}>Torna al login</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.text}>Completamento accesso...</Text>
      {callbackUrl && (
        <Text style={styles.debugSmall}>URL ricevuto: {callbackUrl.substring(0, 50)}...</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 20,
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#dc2626',
    marginBottom: 12,
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
    backgroundColor: '#e5e5e5',
    padding: 12,
    borderRadius: 8,
    marginBottom: 20,
    maxWidth: '100%',
  },
  debugSmall: {
    marginTop: 20,
    fontSize: 10,
    color: '#999',
  },
  button: {
    backgroundColor: '#6366f1',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  buttonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
});
