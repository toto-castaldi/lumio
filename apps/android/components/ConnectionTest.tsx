import { useEffect, useState } from 'react';
import { Text, View, StyleSheet, ActivityIndicator } from 'react-native';
import { getSupabaseClient } from '@lumio/core';
import '../lib/supabase'; // Side-effect import to ensure @lumio/core initialization

type ConnectionStatus = 'loading' | 'connected' | 'error';

/**
 * ConnectionTest - Verifies Supabase backend connectivity
 *
 * Uses auth.getSession() to verify:
 * 1. Network connectivity to Supabase
 * 2. Supabase client is configured correctly
 * 3. Anon key is valid
 */
export function ConnectionTest() {
  const [status, setStatus] = useState<ConnectionStatus>('loading');
  const [error, setError] = useState<string | null>(null);
  const [latency, setLatency] = useState<number | null>(null);

  useEffect(() => {
    async function testConnection() {
      const startTime = Date.now();
      try {
        const { error: sessionError } = await getSupabaseClient().auth.getSession();

        if (sessionError) {
          throw sessionError;
        }

        setLatency(Date.now() - startTime);
        setStatus('connected');
      } catch (e) {
        setStatus('error');
        setError(e instanceof Error ? e.message : 'Unknown error');
      }
    }

    testConnection();
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Supabase Connection</Text>

      <View style={styles.statusRow}>
        {status === 'loading' && (
          <>
            <ActivityIndicator size="small" color="#6B7280" />
            <Text style={styles.loadingText}>Connecting...</Text>
          </>
        )}

        {status === 'connected' && (
          <>
            <View style={styles.dotGreen} />
            <Text style={styles.connectedText}>Connected</Text>
            {latency !== null && (
              <Text style={styles.latencyText}>({latency}ms)</Text>
            )}
          </>
        )}

        {status === 'error' && (
          <>
            <View style={styles.dotRed} />
            <Text style={styles.errorText}>Error</Text>
          </>
        )}
      </View>

      {error && (
        <View style={styles.errorBox}>
          <Text style={styles.errorMessage}>{error}</Text>
        </View>
      )}

      <Text style={styles.hint}>Testing connection to Supabase backend</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  dotGreen: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#22C55E',
  },
  dotRed: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#EF4444',
  },
  loadingText: {
    color: '#6B7280',
    marginLeft: 8,
  },
  connectedText: {
    color: '#16A34A',
    fontWeight: '500',
    marginLeft: 8,
  },
  latencyText: {
    color: '#9CA3AF',
    marginLeft: 8,
  },
  errorText: {
    color: '#DC2626',
    fontWeight: '500',
    marginLeft: 8,
  },
  errorBox: {
    marginTop: 8,
    padding: 8,
    backgroundColor: '#FEF2F2',
    borderRadius: 4,
  },
  errorMessage: {
    color: '#B91C1C',
    fontSize: 12,
  },
  hint: {
    color: '#9CA3AF',
    fontSize: 12,
    marginTop: 12,
  },
});
