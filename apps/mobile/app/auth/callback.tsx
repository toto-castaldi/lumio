import { useEffect, useRef, useState } from 'react';
import { View, Text, ActivityIndicator, StyleSheet, TouchableOpacity } from 'react-native';
import { useRouter, type Href } from 'expo-router';
import * as Linking from 'expo-linking';
import * as Sentry from '@sentry/react-native';
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
    let mounted = true;

    const handleUrl = (event: { url: string }) => {
      console.log('URL event received:', event.url);
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'URL event received',
        data: { url: event.url.substring(0, 100), hasHash: event.url.includes('#') },
        level: 'info',
      });
      if (mounted && !processedRef.current) {
        setDebugInfo(prev => prev + `\nEvent URL: ${event.url.substring(0, 80)}...`);
        setCallbackUrl(event.url);
      }
    };

    const getUrl = async () => {
      Sentry.addBreadcrumb({
        category: 'auth',
        message: 'Auth callback mounted',
        data: { urlFromHook: urlFromHook?.substring(0, 100) || 'null' },
        level: 'info',
      });
      console.log('Getting URL... urlFromHook:', urlFromHook);
      setDebugInfo(`Start: urlFromHook=${urlFromHook ? 'present' : 'null'}`);

      // Try useURL hook first
      if (urlFromHook) {
        console.log('Got URL from hook:', urlFromHook);
        setCallbackUrl(urlFromHook);
        setDebugInfo(prev => prev + `\nHook URL: ${urlFromHook.substring(0, 80)}...`);
        return;
      }

      // Try getInitialURL
      const initialUrl = await Linking.getInitialURL();
      console.log('getInitialURL result:', initialUrl);
      setDebugInfo(prev => prev + `\nInitial URL: ${initialUrl?.substring(0, 80) || 'null'}`);

      if (initialUrl && mounted) {
        setCallbackUrl(initialUrl);
        return;
      }

      // If still no URL after a delay, show error
      setTimeout(async () => {
        if (!processedRef.current && mounted) {
          const lastUrl = await Linking.getInitialURL();
          console.log('Delayed getInitialURL:', lastUrl);
          if (lastUrl) {
            setCallbackUrl(lastUrl);
          } else {
            const errorMsg = 'Android ha strippato il hash fragment dal deep link';
            Sentry.captureMessage(errorMsg, {
              level: 'error',
              tags: { flow: 'oauth_callback' },
              extra: {
                urlFromHook: urlFromHook || 'null',
                initialUrl: initialUrl || 'null',
                lastUrl: lastUrl || 'null',
              },
            });
            setError('URL non ricevuto');
            setDebugInfo(prev => prev + `\nTimeout: nessun URL ricevuto\n\nAndroid non passa il hash fragment (#) nei deep link. Serve PKCE flow.`);
          }
        }
      }, 3000);
    };

    // Add listener for incoming URLs
    const subscription = Linking.addEventListener('url', handleUrl);

    getUrl();

    return () => {
      mounted = false;
      subscription.remove();
    };
  }, [urlFromHook]);

  useEffect(() => {
    // Prevent double processing
    if (processedRef.current || !callbackUrl) return;

    const handleCallback = async () => {
      try {
        console.log('Processing auth callback URL:', callbackUrl);
        processedRef.current = true;

        // Parse the URL to extract tokens or code
        // PKCE flow: lumio://auth/callback?code=xxx (query param)
        // Implicit flow: lumio://auth/callback#access_token=xxx&refresh_token=yyy (hash)

        const supabase = getSupabaseClient();
        let authSuccess = false;

        // Try to get code from query params (PKCE flow - preferred for Android)
        const queryIndex = callbackUrl.indexOf('?');
        if (queryIndex !== -1) {
          const queryParams = new URLSearchParams(callbackUrl.substring(queryIndex + 1));
          const code = queryParams.get('code');

          if (code) {
            console.log('Got PKCE code from query params');
            Sentry.addBreadcrumb({
              category: 'auth',
              message: 'Exchanging PKCE code for session',
              level: 'info',
            });

            const { error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);

            if (exchangeError) {
              console.error('Code exchange error:', exchangeError);
              setDebugInfo(`PKCE exchange failed: ${exchangeError.message}`);
              setError('Errore scambio codice');
              return;
            }

            authSuccess = true;
          }
        }

        // Fallback: try hash fragment (implicit flow - for other platforms)
        if (!authSuccess) {
          const hashIndex = callbackUrl.indexOf('#');
          if (hashIndex !== -1) {
            const hashParams = new URLSearchParams(callbackUrl.substring(hashIndex + 1));
            const accessToken = hashParams.get('access_token');
            const refreshToken = hashParams.get('refresh_token');

            if (accessToken && refreshToken) {
              console.log('Got tokens from hash fragment');
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

              authSuccess = true;
            }
          }
        }

        if (!authSuccess) {
          const info = `URL: ${callbackUrl.substring(0, 100)}...\nHas #: ${callbackUrl.includes('#')}\nHas ?: ${callbackUrl.includes('?')}\nLength: ${callbackUrl.length}`;
          console.error('No auth data in callback URL:', info);
          Sentry.captureMessage('No auth data in callback URL', {
            level: 'error',
            extra: { url: callbackUrl.substring(0, 200) },
          });
          setDebugInfo(info);
          setError('Dati autenticazione non trovati');
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
      <Text style={styles.debugSmall}>
        {callbackUrl
          ? `URL: ${callbackUrl.substring(0, 50)}...`
          : `Attendo URL...\nurlFromHook: ${urlFromHook ? 'presente' : 'null'}`
        }
      </Text>
      {debugInfo ? <Text style={styles.debugSmall}>{debugInfo}</Text> : null}
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
