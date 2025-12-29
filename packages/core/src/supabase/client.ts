import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;

/**
 * Creates a new Supabase client instance.
 * Uses singleton pattern to avoid creating multiple instances.
 */
export function createSupabaseClient(
  url: string,
  anonKey: string
): SupabaseClient {
  if (!supabaseInstance) {
    supabaseInstance = createClient(url, anonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
      },
    });
  }
  return supabaseInstance;
}

/**
 * Returns the existing Supabase client instance.
 * Throws an error if the client hasn't been initialized.
 */
export function getSupabaseClient(): SupabaseClient {
  if (!supabaseInstance) {
    throw new Error(
      'Supabase client not initialized. Call createSupabaseClient first.'
    );
  }
  return supabaseInstance;
}
