import { useState, useEffect, useCallback } from 'react';
import {
  getSupabaseClient,
  getUserRepositories,
  type Repository,
} from '@lumio/core';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook that provides real-time repository updates via Supabase Realtime
 *
 * Subscribes to INSERT, UPDATE, DELETE events on the repositories table
 * and automatically refreshes the repository list when changes occur.
 */
export function useRealtimeRepositories() {
  const [repositories, setRepositories] = useState<Repository[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch repositories from the server
  const fetchRepositories = useCallback(async () => {
    try {
      const repos = await getUserRepositories();
      setRepositories(repos);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch repositories:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch repositories'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and realtime subscription
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setup = async () => {
      // Initial fetch
      await fetchRepositories();

      // Subscribe to realtime changes
      const supabase = getSupabaseClient();

      channel = supabase
        .channel('repositories-changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to all events (INSERT, UPDATE, DELETE)
            schema: 'public',
            table: 'repositories',
          },
          (payload) => {
            console.log('[Realtime] Repository change:', payload.eventType);
            // Refetch all repositories on any change
            // This is simpler and ensures consistency
            fetchRepositories();
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Subscription status:', status);
        });
    };

    setup();

    // Cleanup subscription on unmount
    return () => {
      if (channel) {
        console.log('[Realtime] Unsubscribing from repositories channel');
        channel.unsubscribe();
      }
    };
  }, [fetchRepositories]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchRepositories();
  }, [fetchRepositories]);

  return {
    repositories,
    isLoading,
    error,
    refresh,
  };
}
