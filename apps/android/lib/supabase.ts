import 'react-native-url-polyfill/auto';
import { createSupabaseClient, getSupabaseClient, type StorageAdapter } from '@lumio/core';
import * as SecureStore from 'expo-secure-store';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    'Missing Supabase credentials. Set EXPO_PUBLIC_SUPABASE_URL and EXPO_PUBLIC_SUPABASE_ANON_KEY in .env.local'
  );
}

/**
 * SecureStore adapter for Supabase auth storage.
 * Uses encrypted storage for sensitive auth tokens on Android.
 * Implements @lumio/core StorageAdapter interface.
 */
const SecureStoreAdapter: StorageAdapter = {
  getItem: async (key: string): Promise<string | null> => {
    return SecureStore.getItemAsync(key);
  },
  setItem: async (key: string, value: string): Promise<void> => {
    await SecureStore.setItemAsync(key, value);
  },
  removeItem: async (key: string): Promise<void> => {
    await SecureStore.deleteItemAsync(key);
  },
};

// Initialize @lumio/core singleton with SecureStore adapter
createSupabaseClient(supabaseUrl, supabaseAnonKey, {
  storage: SecureStoreAdapter,
});

// Re-export getSupabaseClient for convenience
export { getSupabaseClient };
