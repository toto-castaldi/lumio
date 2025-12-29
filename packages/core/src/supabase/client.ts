import { createClient, SupabaseClient } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseUrl: string | null = null;

/**
 * Creates a new Supabase client instance.
 * Uses singleton pattern to avoid creating multiple instances.
 */
export function createSupabaseClient(
  url: string,
  anonKey: string
): SupabaseClient {
  if (!supabaseInstance) {
    supabaseUrl = url;
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
 * Returns the Supabase URL.
 * Throws an error if the client hasn't been initialized.
 */
export function getSupabaseUrl(): string {
  if (!supabaseUrl) {
    throw new Error(
      'Supabase client not initialized. Call createSupabaseClient first.'
    );
  }
  return supabaseUrl;
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
