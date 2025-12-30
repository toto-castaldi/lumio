import { createClient, SupabaseClient, SupabaseClientOptions } from '@supabase/supabase-js';

let supabaseInstance: SupabaseClient | null = null;
let supabaseUrl: string | null = null;
let supabaseAnonKey: string | null = null;

/**
 * Storage adapter interface for Supabase auth
 */
export interface StorageAdapter {
  getItem: (key: string) => Promise<string | null> | string | null;
  setItem: (key: string, value: string) => Promise<void> | void;
  removeItem: (key: string) => Promise<void> | void;
}

/**
 * Options for creating the Supabase client
 */
export interface CreateSupabaseClientOptions {
  storage?: StorageAdapter;
}

/**
 * Creates a new Supabase client instance.
 * Uses singleton pattern to avoid creating multiple instances.
 *
 * @param url - Supabase project URL
 * @param anonKey - Supabase anon key
 * @param options - Optional configuration (e.g., custom storage for mobile)
 */
export function createSupabaseClient(
  url: string,
  anonKey: string,
  options?: CreateSupabaseClientOptions
): SupabaseClient {
  if (!supabaseInstance) {
    supabaseUrl = url;
    supabaseAnonKey = anonKey;

    const clientOptions: SupabaseClientOptions<'public'> = {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false, // Important for mobile - we handle URL manually
        flowType: 'pkce', // Use PKCE for mobile compatibility
      },
    };

    // Add custom storage adapter if provided (e.g., AsyncStorage for React Native)
    if (options?.storage) {
      clientOptions.auth!.storage = options.storage;
    }

    supabaseInstance = createClient(url, anonKey, clientOptions);
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

/**
 * Returns the Supabase anon key.
 * Throws an error if the client hasn't been initialized.
 */
export function getSupabaseAnonKey(): string {
  if (!supabaseAnonKey) {
    throw new Error(
      'Supabase client not initialized. Call createSupabaseClient first.'
    );
  }
  return supabaseAnonKey;
}
