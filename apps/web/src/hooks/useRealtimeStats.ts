import { useState, useEffect, useCallback } from 'react';
import {
  getSupabaseClient,
  getUserStats,
  type UserStats,
} from '@lumio/core';
import { RealtimeChannel } from '@supabase/supabase-js';

/**
 * Hook that provides real-time user stats via Supabase Realtime
 *
 * Subscribes to changes on repositories table and automatically
 * refreshes stats when changes occur.
 */
export function useRealtimeStats() {
  const [stats, setStats] = useState<UserStats>({ repositoryCount: 0, cardCount: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Fetch stats from the server
  const fetchStats = useCallback(async () => {
    try {
      const newStats = await getUserStats();
      setStats(newStats);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch stats:', err);
      setError(err instanceof Error ? err : new Error('Failed to fetch stats'));
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Initial fetch and realtime subscription
  useEffect(() => {
    let channel: RealtimeChannel | null = null;

    const setup = async () => {
      // Initial fetch
      await fetchStats();

      // Subscribe to realtime changes on repositories
      const supabase = getSupabaseClient();

      channel = supabase
        .channel('stats-changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'repositories',
          },
          (payload) => {
            console.log('[Realtime] Stats update triggered by:', payload.eventType);
            fetchStats();
          }
        )
        .subscribe((status) => {
          console.log('[Realtime] Stats subscription status:', status);
        });
    };

    setup();

    return () => {
      if (channel) {
        console.log('[Realtime] Unsubscribing from stats channel');
        channel.unsubscribe();
      }
    };
  }, [fetchStats]);

  // Manual refresh function
  const refresh = useCallback(() => {
    setIsLoading(true);
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    isLoading,
    error,
    refresh,
  };
}
