import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Types
type LLMProvider = "openai" | "anthropic";

interface UserApiKey {
  id: string;
  userId: string;
  provider: LLMProvider;
  isValid: boolean;
  isPreferred: boolean;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
}

// =============================================================================
// ENCRYPTION UTILITIES (AES-256-GCM)
// =============================================================================

const ALGORITHM = "AES-GCM";
const IV_LENGTH = 12; // 96 bits for GCM

/**
 * Get encryption key from environment variable
 */
async function getEncryptionKey(): Promise<CryptoKey> {
  const keyBase64 = Deno.env.get("ENCRYPTION_KEY");
  if (!keyBase64) {
    throw new Error("ENCRYPTION_KEY environment variable not set");
  }

  // Decode base64 key (should be 32 bytes for AES-256)
  const keyBytes = Uint8Array.from(atob(keyBase64), (c) => c.charCodeAt(0));

  if (keyBytes.length !== 32) {
    throw new Error("ENCRYPTION_KEY must be 32 bytes (256 bits) base64 encoded");
  }

  return await crypto.subtle.importKey(
    "raw",
    keyBytes,
    { name: ALGORITHM },
    false,
    ["encrypt", "decrypt"]
  );
}

/**
 * Encrypt a plaintext string
 * Returns: base64(iv + ciphertext)
 */
async function encrypt(plaintext: string): Promise<string> {
  const key = await getEncryptionKey();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));
  const encodedText = new TextEncoder().encode(plaintext);

  const ciphertext = await crypto.subtle.encrypt(
    { name: ALGORITHM, iv },
    key,
    encodedText
  );

  // Combine IV + ciphertext
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv, 0);
  combined.set(new Uint8Array(ciphertext), iv.length);

  // Return as base64
  return btoa(String.fromCharCode(...combined));
}

/**
 * Decrypt a ciphertext string
 * Input: base64(iv + ciphertext)
 */
async function decrypt(encryptedBase64: string): Promise<string> {
  const key = await getEncryptionKey();

  // Decode base64
  const combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));

  // Extract IV and ciphertext
  const iv = combined.slice(0, IV_LENGTH);
  const ciphertext = combined.slice(IV_LENGTH);

  const decrypted = await crypto.subtle.decrypt(
    { name: ALGORITHM, iv },
    key,
    ciphertext
  );

  return new TextDecoder().decode(decrypted);
}

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function createSupabaseClient(authHeader: string) {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: { Authorization: authHeader },
    },
  });
}

async function getUserId(supabase: ReturnType<typeof createClient>): Promise<string> {
  const { data: { user }, error } = await supabase.auth.getUser();
  if (error || !user) {
    throw new Error("Unauthorized");
  }
  return user.id;
}

// =============================================================================
// API KEY TESTING
// =============================================================================

async function testApiKey(
  provider: string,
  apiKey: string
): Promise<{ valid: boolean; error?: string }> {
  try {
    if (provider === "openai") {
      const response = await fetch("https://api.openai.com/v1/models", {
        headers: {
          Authorization: `Bearer ${apiKey}`,
        },
      });

      if (response.ok) {
        return { valid: true };
      }

      const error = await response.json();
      return {
        valid: false,
        error: error.error?.message || "Invalid API key",
      };
    } else if (provider === "anthropic") {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: {
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "claude-3-haiku-20240307",
          max_tokens: 1,
          messages: [{ role: "user", content: "Hi" }],
        }),
      });

      if (response.ok || response.status === 400) {
        return { valid: true };
      }

      if (response.status === 401) {
        return { valid: false, error: "Invalid API key" };
      }

      const error = await response.json();
      return {
        valid: false,
        error: error.error?.message || "Failed to validate key",
      };
    }

    return { valid: false, error: "Unknown provider" };
  } catch (error) {
    return { valid: false, error: `Connection error: ${error.message}` };
  }
}

// =============================================================================
// API KEY MANAGEMENT
// =============================================================================

/**
 * Save (or update) an API key for the user
 * - Tests the key first
 * - Encrypts the key
 * - Stores in database
 */
async function handleSaveKey(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  provider: LLMProvider,
  apiKey: string,
  isPreferred: boolean
): Promise<UserApiKey> {
  // Test the key first
  const testResult = await testApiKey(provider, apiKey);
  if (!testResult.valid) {
    throw new Error(testResult.error || "Invalid API key");
  }

  // Encrypt the key
  const encryptedKey = await encrypt(apiKey);

  // If setting as preferred, unset all others first
  if (isPreferred) {
    await supabase
      .from("user_api_keys")
      .update({ is_preferred: false })
      .eq("user_id", userId);
  }

  // Upsert the key
  const { data, error } = await supabase
    .from("user_api_keys")
    .upsert(
      {
        user_id: userId,
        provider,
        encrypted_key: encryptedKey,
        is_valid: true,
        is_preferred: isPreferred,
        last_tested_at: new Date().toISOString(),
      },
      { onConflict: "user_id,provider" }
    )
    .select("id, user_id, provider, is_valid, is_preferred, last_tested_at, created_at, updated_at")
    .single();

  if (error) throw error;

  return {
    id: data.id,
    userId: data.user_id,
    provider: data.provider,
    isValid: data.is_valid,
    isPreferred: data.is_preferred,
    lastTestedAt: data.last_tested_at,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}

/**
 * Get all API keys for the user (without decrypted keys)
 */
async function handleGetKeys(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<UserApiKey[]> {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("id, user_id, provider, is_valid, is_preferred, last_tested_at, created_at, updated_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true });

  if (error) throw error;
  if (!data) return [];

  return data.map((row: Record<string, unknown>) => ({
    id: row.id as string,
    userId: row.user_id as string,
    provider: row.provider as LLMProvider,
    isValid: row.is_valid as boolean,
    isPreferred: row.is_preferred as boolean,
    lastTestedAt: row.last_tested_at as string | undefined,
    createdAt: row.created_at as string,
    updatedAt: row.updated_at as string,
  }));
}

/**
 * Delete an API key
 */
async function handleDeleteKey(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  provider: LLMProvider
): Promise<void> {
  const { error } = await supabase
    .from("user_api_keys")
    .delete()
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) throw error;
}

/**
 * Set a provider as preferred
 */
async function handleSetPreferred(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  provider: LLMProvider
): Promise<void> {
  // First unset all
  await supabase
    .from("user_api_keys")
    .update({ is_preferred: false })
    .eq("user_id", userId);

  // Then set the selected one
  const { error } = await supabase
    .from("user_api_keys")
    .update({ is_preferred: true })
    .eq("user_id", userId)
    .eq("provider", provider);

  if (error) throw error;
}

/**
 * Get decrypted API key for a provider (internal use for LLM calls)
 */
async function getDecryptedKey(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  provider: LLMProvider
): Promise<string | null> {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("encrypted_key")
    .eq("user_id", userId)
    .eq("provider", provider)
    .eq("is_valid", true)
    .single();

  if (error || !data) return null;

  return await decrypt(data.encrypted_key);
}

/**
 * Check if user has at least one valid API key
 */
async function handleHasValidKey(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from("user_api_keys")
    .select("id")
    .eq("user_id", userId)
    .eq("is_valid", true)
    .limit(1);

  if (error) throw error;
  return data !== null && data.length > 0;
}

// =============================================================================
// REQUEST HANDLER
// =============================================================================

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing authorization header" }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 401,
        }
      );
    }

    const body = await req.json();
    const { action } = body;

    // Actions that don't require authentication
    if (action === "test_key") {
      const { provider, apiKey } = body;
      if (!provider || !apiKey) {
        return new Response(
          JSON.stringify({ valid: false, error: "Missing provider or apiKey" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
      }

      const result = await testApiKey(provider, apiKey);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    // All other actions require authentication
    const supabase = createSupabaseClient(authHeader);
    const userId = await getUserId(supabase);

    switch (action) {
      case "save_key": {
        const { provider, apiKey, isPreferred = false } = body;
        if (!provider || !apiKey) {
          return new Response(
            JSON.stringify({ error: "Missing provider or apiKey" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const savedKey = await handleSaveKey(supabase, userId, provider, apiKey, isPreferred);
        return new Response(JSON.stringify({ success: true, key: savedKey }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "get_keys": {
        const keys = await handleGetKeys(supabase, userId);
        return new Response(JSON.stringify({ success: true, keys }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "delete_key": {
        const { provider } = body;
        if (!provider) {
          return new Response(
            JSON.stringify({ error: "Missing provider" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        await handleDeleteKey(supabase, userId, provider);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "set_preferred": {
        const { provider } = body;
        if (!provider) {
          return new Response(
            JSON.stringify({ error: "Missing provider" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        await handleSetPreferred(supabase, userId, provider);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "has_valid_key": {
        const hasKey = await handleHasValidKey(supabase, userId);
        return new Response(JSON.stringify({ success: true, hasValidKey: hasKey }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        return new Response(
          JSON.stringify({ error: `Unknown action: ${action}` }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          }
        );
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message === "Unauthorized" ? 401 : 500;

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status,
    });
  }
});
