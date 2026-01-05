import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// Types
type LLMProvider = "openai" | "anthropic";

interface PlatformConfig {
  provider: LLMProvider;
  model: string;
  systemPrompt: string;
}

interface QuizQuestion {
  question: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

interface ValidationResponse {
  isCorrect: boolean;
  explanation: string;
  tips?: string[];
}

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

// Validation prompt for Step 2
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
// PLATFORM CONFIG
// =============================================================================

/**
 * Get platform configuration from database
 */
async function getPlatformConfig(supabase: ReturnType<typeof createClient>): Promise<PlatformConfig> {
  const { data, error } = await supabase
    .from("platform_config")
    .select("key, value")
    .in("key", ["llm_provider", "llm_model", "system_prompt"]);

  if (error) {
    throw new Error(`Failed to load platform config: ${error.message}`);
  }

  // Parse config from rows
  const config: Record<string, string> = {};
  for (const row of data || []) {
    // value is stored as JSON, parse it
    config[row.key] = typeof row.value === "string" ? row.value : JSON.parse(JSON.stringify(row.value));
  }

  return {
    provider: (config.llm_provider || "anthropic") as LLMProvider,
    model: config.llm_model || "claude-3-5-haiku-latest",
    systemPrompt: config.system_prompt || DEFAULT_SYSTEM_PROMPT,
  };
}

/**
 * Get API key from environment variable
 */
function getApiKey(provider: LLMProvider): string {
  const envKey = provider === "openai" ? "OPENAI_API_KEY" : "ANTHROPIC_API_KEY";
  const apiKey = Deno.env.get(envKey);

  if (!apiKey) {
    throw new Error(`${envKey} not configured`);
  }

  return apiKey;
}

// =============================================================================
// QUIZ GENERATION
// =============================================================================

/**
 * Parse JSON response from LLM (handles markdown code blocks)
 */
function parseJsonResponse<T>(content: string): T {
  let jsonStr = content.trim();
  if (jsonStr.startsWith("```json")) {
    jsonStr = jsonStr.slice(7);
  } else if (jsonStr.startsWith("```")) {
    jsonStr = jsonStr.slice(3);
  }
  if (jsonStr.endsWith("```")) {
    jsonStr = jsonStr.slice(0, -3);
  }
  return JSON.parse(jsonStr.trim());
}

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

  return parseJsonResponse<QuizQuestion>(content);
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

  return parseJsonResponse<QuizQuestion>(content);
}

/**
 * Validate answer using OpenAI API
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

  return parseJsonResponse<ValidationResponse>(content);
}

/**
 * Validate answer using Anthropic API
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

  return parseJsonResponse<ValidationResponse>(content);
}

/**
 * Handle generate_quiz action
 */
async function handleGenerateQuiz(
  config: PlatformConfig,
  cardContent: string
): Promise<QuizQuestion> {
  const apiKey = getApiKey(config.provider);

  if (config.provider === "openai") {
    return await generateQuizOpenAI(apiKey, config.model, cardContent, config.systemPrompt);
  } else {
    return await generateQuizAnthropic(apiKey, config.model, cardContent, config.systemPrompt);
  }
}

/**
 * Handle validate_answer action
 */
async function handleValidateAnswer(
  config: PlatformConfig,
  cardContent: string,
  question: string,
  userAnswer: string,
  correctAnswer: string
): Promise<ValidationResponse> {
  const apiKey = getApiKey(config.provider);

  if (config.provider === "openai") {
    return await validateAnswerOpenAI(apiKey, config.model, cardContent, question, userAnswer, correctAnswer);
  } else {
    return await validateAnswerAnthropic(apiKey, config.model, cardContent, question, userAnswer, correctAnswer);
  }
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

    const supabase = createSupabaseClient(authHeader);

    // Verify user is authenticated
    await getUserId(supabase);

    const body = await req.json();
    const { action } = body;

    switch (action) {
      case "get_platform_config": {
        const config = await getPlatformConfig(supabase);
        return new Response(JSON.stringify({ success: true, config }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "generate_quiz": {
        const { cardContent } = body;
        if (!cardContent) {
          return new Response(
            JSON.stringify({ error: "Missing cardContent" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const config = await getPlatformConfig(supabase);
        const quiz = await handleGenerateQuiz(config, cardContent);
        return new Response(JSON.stringify({ success: true, quiz }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "validate_answer": {
        const { cardContent, question, userAnswer, correctAnswer } = body;
        if (!cardContent || !question || !userAnswer || !correctAnswer) {
          return new Response(
            JSON.stringify({ error: "Missing required fields for validation" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        const config = await getPlatformConfig(supabase);
        const validation = await handleValidateAnswer(
          config, cardContent, question, userAnswer, correctAnswer
        );
        return new Response(JSON.stringify({ success: true, validation }), {
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
