import { getSupabaseUrl } from './client';
import { getAccessToken } from './auth';
import type { LLMProvider, UserApiKey } from '@lumio/shared';

/**
 * Get the Supabase Functions URL
 */
function getFunctionsUrl(): string {
  const supabaseUrl = getSupabaseUrl();
  return `${supabaseUrl}/functions/v1/llm-proxy`;
}

/**
 * Make an authenticated request to the llm-proxy Edge Function
 */
async function callLlmProxy<T>(
  action: string,
  body: Record<string, unknown> = {}
): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('Not authenticated');
  }

  const response = await fetch(getFunctionsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action, ...body }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Request failed');
  }

  return data;
}

/**
 * Test an API key without saving it
 * @param provider - LLM provider (openai or anthropic)
 * @param apiKey - The API key to test
 */
export async function testApiKey(
  provider: LLMProvider,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  const token = await getAccessToken();

  const response = await fetch(getFunctionsUrl(), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({ action: 'test_key', provider, apiKey }),
  });

  return response.json();
}

/**
 * Save or update an API key for the current user
 * The key is validated and encrypted server-side before storage
 * @param provider - LLM provider (openai or anthropic)
 * @param apiKey - The API key (will be encrypted server-side)
 * @param isPreferred - Whether this should be the preferred provider
 */
export async function saveApiKey(
  provider: LLMProvider,
  apiKey: string,
  isPreferred: boolean = false
): Promise<UserApiKey> {
  const response = await callLlmProxy<{ success: boolean; key: UserApiKey }>(
    'save_key',
    { provider, apiKey, isPreferred }
  );

  return response.key;
}

/**
 * Get all API keys for the current user
 * Note: The actual key values are never returned, only metadata
 */
export async function getUserApiKeys(): Promise<UserApiKey[]> {
  const response = await callLlmProxy<{ success: boolean; keys: UserApiKey[] }>(
    'get_keys'
  );

  return response.keys;
}

/**
 * Delete an API key
 * @param provider - LLM provider to delete
 */
export async function deleteApiKey(provider: LLMProvider): Promise<void> {
  await callLlmProxy('delete_key', { provider });
}

/**
 * Set a provider as the preferred one
 * @param provider - LLM provider to set as preferred
 */
export async function setPreferredProvider(
  provider: LLMProvider
): Promise<void> {
  await callLlmProxy('set_preferred', { provider });
}

/**
 * Check if the current user has at least one valid API key
 */
export async function hasValidApiKey(): Promise<boolean> {
  const response = await callLlmProxy<{
    success: boolean;
    hasValidKey: boolean;
  }>('has_valid_key');

  return response.hasValidKey;
}

/**
 * Get the preferred API key provider
 * @returns The preferred provider or null if none set
 */
export async function getPreferredProvider(): Promise<LLMProvider | null> {
  const keys = await getUserApiKeys();
  const preferred = keys.find((k) => k.isPreferred && k.isValid);
  return preferred?.provider || null;
}
