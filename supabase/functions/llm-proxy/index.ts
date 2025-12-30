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

interface LLMModel {
  provider: LLMProvider;
  modelId: string;
  displayName: string;
}

interface QuizQuestion {
  question: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

// Available models per provider (Phase 5 - only latest models)
const AVAILABLE_MODELS: Record<LLMProvider, LLMModel[]> = {
  openai: [
    { provider: "openai", modelId: "gpt-4o", displayName: "GPT-4o" },
    { provider: "openai", modelId: "o1", displayName: "o1" },
  ],
  anthropic: [
    { provider: "anthropic", modelId: "claude-3-5-haiku-latest", displayName: "Claude 3.5 Haiku" },
    { provider: "anthropic", modelId: "claude-sonnet-4-20250514", displayName: "Claude Sonnet 4" },
    { provider: "anthropic", modelId: "claude-opus-4-20250514", displayName: "Claude Opus 4" },
  ],
};

// Default system prompt for quiz generation
const DEFAULT_SYSTEM_PROMPT = `Sei un assistente educativo. Il tuo compito è creare una domanda a scelta multipla basata sul contenuto della flashcard fornita.

REGOLE:
1. Crea UNA domanda che testi la comprensione del concetto principale della carta
2. Fornisci esattamente 4 opzioni (A, B, C, D)
3. Solo UNA opzione deve essere corretta
4. Le opzioni sbagliate devono essere plausibili ma chiaramente errate
5. Varia la posizione della risposta corretta (non sempre A o D)
6. Dopo la risposta, fornisci una breve spiegazione del concetto

FORMATO RISPOSTA (JSON rigoroso):
{
  "question": "La domanda qui",
  "options": [
    {"label": "A", "text": "Prima opzione"},
    {"label": "B", "text": "Seconda opzione"},
    {"label": "C", "text": "Terza opzione"},
    {"label": "D", "text": "Quarta opzione"}
  ],
  "correctAnswer": "B",
  "explanation": "Breve spiegazione del concetto e perché B è corretta"
}

Rispondi SOLO con il JSON, senza altro testo.`;

// Study preferences interface
interface StudyPreferences {
  userId: string;
  systemPrompt: string;
  preferredProvider?: LLMProvider;
  preferredModel?: string;
  createdAt: string;
  updatedAt: string;
}

// Validation response interface
interface ValidationResponse {
  isCorrect: boolean;
  explanation: string;
  tips?: string[];
}

// Default validation prompt for Step 2
const VALIDATION_SYSTEM_PROMPT = `Sei un tutor esperto e paziente. Il tuo compito è validare la risposta dell'utente a una domanda di studio e fornire una spiegazione dettagliata.

ISTRUZIONI:
1. Verifica se la risposta dell'utente corrisponde alla risposta corretta
2. Inizia con "Corretto!" oppure "Non proprio..." in base all'esito
3. Fornisci una spiegazione DETTAGLIATA e CORPOSA (almeno 3-4 frasi) del concetto
4. Spiega PERCHÉ la risposta corretta è quella giusta, facendo riferimento al contenuto della carta
5. Se la risposta è sbagliata, spiega anche PERCHÉ la risposta dell'utente non è corretta
6. Aggiungi 1-3 suggerimenti pratici per memorizzare meglio il concetto (mnemonici, associazioni, esempi)

FORMATO RISPOSTA (JSON):
{
  "isCorrect": true/false,
  "explanation": "Spiegazione dettagliata del concetto...",
  "tips": ["Suggerimento 1", "Suggerimento 2"]
}

TONO:
- Incoraggiante anche se la risposta è sbagliata
- Didattico ma non pedante
- Usa esempi concreti quando possibile
- Evita di essere troppo tecnico a meno che il contenuto non lo richieda

Rispondi SOLO con il JSON, senza altro testo.`;

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
// QUIZ GENERATION
// =============================================================================

/**
 * Generate quiz using OpenAI API
 */
async function generateQuizOpenAI(
  apiKey: string,
  modelId: string,
  cardContent: string,
  systemPrompt: string
): Promise<QuizQuestion> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: `Ecco il contenuto della flashcard:\n\n${cardContent}` },
      ],
      temperature: 0.7,
      max_tokens: 1000,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  // Parse JSON response (handle potential markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    throw new Error("Failed to parse quiz response from OpenAI");
  }
}

/**
 * Generate quiz using Anthropic API
 */
async function generateQuizAnthropic(
  apiKey: string,
  modelId: string,
  cardContent: string,
  systemPrompt: string
): Promise<QuizQuestion> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 1000,
      system: systemPrompt,
      messages: [
        { role: "user", content: `Ecco il contenuto della flashcard:\n\n${cardContent}` },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("Empty response from Anthropic");
  }

  // Parse JSON response (handle potential markdown code blocks)
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    throw new Error("Failed to parse quiz response from Anthropic");
  }
}

/**
 * Validate answer using OpenAI API (Step 2)
 */
async function validateAnswerOpenAI(
  apiKey: string,
  modelId: string,
  cardContent: string,
  question: string,
  userAnswer: string,
  correctAnswer: string
): Promise<ValidationResponse> {
  const userMessage = `CONTENUTO DELLA CARTA:
${cardContent}

DOMANDA POSTA:
${question}

RISPOSTA DELL'UTENTE: ${userAnswer}
RISPOSTA CORRETTA: ${correctAnswer}

Valida la risposta e fornisci una spiegazione dettagliata.`;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Authorization": `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: VALIDATION_SYSTEM_PROMPT },
        { role: "user", content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 1500,
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `OpenAI API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content;

  if (!content) {
    throw new Error("Empty response from OpenAI");
  }

  // Parse JSON response
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    throw new Error("Failed to parse validation response from OpenAI");
  }
}

/**
 * Validate answer using Anthropic API (Step 2)
 */
async function validateAnswerAnthropic(
  apiKey: string,
  modelId: string,
  cardContent: string,
  question: string,
  userAnswer: string,
  correctAnswer: string
): Promise<ValidationResponse> {
  const userMessage = `CONTENUTO DELLA CARTA:
${cardContent}

DOMANDA POSTA:
${question}

RISPOSTA DELL'UTENTE: ${userAnswer}
RISPOSTA CORRETTA: ${correctAnswer}

Valida la risposta e fornisci una spiegazione dettagliata.`;

  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      max_tokens: 1500,
      system: VALIDATION_SYSTEM_PROMPT,
      messages: [
        { role: "user", content: userMessage },
      ],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error?.message || `Anthropic API error: ${response.status}`);
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("Empty response from Anthropic");
  }

  // Parse JSON response
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }

  try {
    return JSON.parse(jsonStr.trim());
  } catch {
    throw new Error("Failed to parse validation response from Anthropic");
  }
}

/**
 * Handle validate_answer action (Step 2)
 */
async function handleValidateAnswer(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  provider: LLMProvider,
  modelId: string,
  cardContent: string,
  question: string,
  userAnswer: string,
  correctAnswer: string
): Promise<ValidationResponse> {
  // Validate model exists for provider
  const providerModels = AVAILABLE_MODELS[provider];
  if (!providerModels?.some(m => m.modelId === modelId)) {
    throw new Error(`Invalid model ${modelId} for provider ${provider}`);
  }

  // Get decrypted API key
  const apiKey = await getDecryptedKey(supabase, userId, provider);
  if (!apiKey) {
    throw new Error(`No valid API key configured for ${provider}`);
  }

  // Validate based on provider
  if (provider === "openai") {
    return await validateAnswerOpenAI(apiKey, modelId, cardContent, question, userAnswer, correctAnswer);
  } else {
    return await validateAnswerAnthropic(apiKey, modelId, cardContent, question, userAnswer, correctAnswer);
  }
}

/**
 * Handle generate_quiz action
 */
async function handleGenerateQuiz(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  provider: LLMProvider,
  modelId: string,
  cardContent: string,
  customSystemPrompt?: string
): Promise<QuizQuestion> {
  // Validate model exists for provider
  const providerModels = AVAILABLE_MODELS[provider];
  if (!providerModels?.some(m => m.modelId === modelId)) {
    throw new Error(`Invalid model ${modelId} for provider ${provider}`);
  }

  // Get decrypted API key
  const apiKey = await getDecryptedKey(supabase, userId, provider);
  if (!apiKey) {
    throw new Error(`No valid API key configured for ${provider}`);
  }

  // Use custom prompt or default
  const systemPrompt = customSystemPrompt || DEFAULT_SYSTEM_PROMPT;

  // Generate quiz based on provider
  if (provider === "openai") {
    return await generateQuizOpenAI(apiKey, modelId, cardContent, systemPrompt);
  } else {
    return await generateQuizAnthropic(apiKey, modelId, cardContent, systemPrompt);
  }
}

/**
 * Handle get_available_models action
 * Returns available models for each provider the user has configured
 */
async function handleGetAvailableModels(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{
  providers: {
    provider: LLMProvider;
    models: LLMModel[];
    isConfigured: boolean;
  }[];
}> {
  // Get user's configured providers
  const keys = await handleGetKeys(supabase, userId);
  const configuredProviders = new Set(
    keys.filter(k => k.isValid).map(k => k.provider)
  );

  // Build response with all providers
  const providers: LLMProvider[] = ["openai", "anthropic"];

  return {
    providers: providers.map(provider => ({
      provider,
      models: AVAILABLE_MODELS[provider],
      isConfigured: configuredProviders.has(provider),
    })),
  };
}

// =============================================================================
// STUDY PREFERENCES
// =============================================================================

/**
 * Get study preferences for user
 * Returns default prompt if no custom preferences exist
 */
async function handleGetStudyPreferences(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<{
  systemPrompt: string;
  isCustom: boolean;
  preferredProvider?: LLMProvider;
  preferredModel?: string;
}> {
  const { data, error } = await supabase
    .from("user_study_preferences")
    .select("system_prompt, preferred_provider, preferred_model")
    .eq("user_id", userId)
    .single();

  if (error || !data) {
    // Return default values
    return {
      systemPrompt: DEFAULT_SYSTEM_PROMPT,
      isCustom: false,
    };
  }

  return {
    systemPrompt: data.system_prompt || DEFAULT_SYSTEM_PROMPT,
    isCustom: !!data.system_prompt,
    preferredProvider: data.preferred_provider as LLMProvider | undefined,
    preferredModel: data.preferred_model as string | undefined,
  };
}

/**
 * Save study preferences for user (prompt only)
 */
async function handleSaveStudyPreferences(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  systemPrompt: string
): Promise<void> {
  const { error } = await supabase
    .from("user_study_preferences")
    .upsert(
      {
        user_id: userId,
        system_prompt: systemPrompt,
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

/**
 * Save model preferences for user (provider and model)
 */
async function handleSaveModelPreferences(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  provider: LLMProvider,
  modelId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_study_preferences")
    .upsert(
      {
        user_id: userId,
        preferred_provider: provider,
        preferred_model: modelId,
      },
      { onConflict: "user_id" }
    );

  if (error) throw error;
}

/**
 * Reset study preferences to default
 */
async function handleResetStudyPreferences(
  supabase: ReturnType<typeof createClient>,
  userId: string
): Promise<void> {
  const { error } = await supabase
    .from("user_study_preferences")
    .delete()
    .eq("user_id", userId);

  if (error) throw error;
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

      case "get_available_models": {
        const result = await handleGetAvailableModels(supabase, userId);
        return new Response(JSON.stringify({ success: true, ...result }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "generate_quiz": {
        const { provider, modelId, cardContent, systemPrompt } = body;
        if (!provider || !modelId || !cardContent) {
          return new Response(
            JSON.stringify({ error: "Missing provider, modelId, or cardContent" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const quiz = await handleGenerateQuiz(supabase, userId, provider, modelId, cardContent, systemPrompt);
        return new Response(JSON.stringify({ success: true, quiz }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "validate_answer": {
        const { provider, modelId, cardContent, question, userAnswer, correctAnswer } = body;
        if (!provider || !modelId || !cardContent || !question || !userAnswer || !correctAnswer) {
          return new Response(
            JSON.stringify({ error: "Missing required fields for validation" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const validation = await handleValidateAnswer(
          supabase, userId, provider, modelId, cardContent, question, userAnswer, correctAnswer
        );
        return new Response(JSON.stringify({ success: true, validation }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "get_study_preferences": {
        const prefs = await handleGetStudyPreferences(supabase, userId);
        return new Response(JSON.stringify({ success: true, ...prefs }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "save_study_preferences": {
        const { systemPrompt: newPrompt } = body;
        if (!newPrompt || typeof newPrompt !== "string") {
          return new Response(
            JSON.stringify({ error: "Missing or invalid systemPrompt" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        await handleSaveStudyPreferences(supabase, userId, newPrompt);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "save_model_preferences": {
        const { provider, modelId } = body;
        if (!provider || !modelId) {
          return new Response(
            JSON.stringify({ error: "Missing provider or modelId" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        await handleSaveModelPreferences(supabase, userId, provider, modelId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "reset_study_preferences": {
        await handleResetStudyPreferences(supabase, userId);
        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "get_default_prompt": {
        return new Response(
          JSON.stringify({ success: true, defaultPrompt: DEFAULT_SYSTEM_PROMPT }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          }
        );
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
