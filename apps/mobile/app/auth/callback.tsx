import { useEffect } from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { useRouter, useLocalSearchParams, type Href } from 'expo-router';
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

  useEffect(() => {
    const handleCallback = async () => {
      try {
        // Get the full URL that opened this screen
        const url = await Linking.getInitialURL();

        if (!url) {
          console.error('No URL found in callback');
          router.replace('/login' as Href);
          return;
        }

        // Parse the URL to extract tokens from hash fragment
        // Format: lumio://auth/callback#access_token=xxx&refresh_token=yyy
        const hashIndex = url.indexOf('#');
        if (hashIndex === -1) {
          console.error('No hash fragment in callback URL');
          router.replace('/login' as Href);
          return;
        }

        const hashParams = new URLSearchParams(url.substring(hashIndex + 1));
        const accessToken = hashParams.get('access_token');
        const refreshToken = hashParams.get('refresh_token');

        if (!accessToken || !refreshToken) {
          console.error('Missing tokens in callback URL');
          router.replace('/login' as Href);
          return;
        }

        // Set the session in Supabase
        const supabase = getSupabaseClient();
        const { error } = await supabase.auth.setSession({
          access_token: accessToken,
          refresh_token: refreshToken,
        });

        if (error) {
          console.error('Failed to set session:', error);
          router.replace('/login' as Href);
          return;
        }

        // Session set successfully - the AuthContext will detect the change
        // and redirect to the appropriate screen (/ or /setup/api-keys)
        // We redirect to index and let the auth flow handle it
        router.replace('/' as Href);
      } catch (error) {
        console.error('Auth callback error:', error);
        router.replace('/login' as Href);
      }
    };

    handleCallback();
  }, [router]);

  return (
    <View style={styles.container}>
      <ActivityIndicator size="large" color="#6366f1" />
      <Text style={styles.text}>Completamento accesso...</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
});
