import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image, decode } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// IMAGE PROCESSING CONSTANTS
// =============================================================================

const MAX_IMAGE_SIZE = 1568; // Max pixels per side (Anthropic recommendation)
const MAX_IMAGES_PER_CARD = 20;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024; // 5MB per image
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

// Types
type LLMProvider = "openai" | "anthropic";

interface ImageData {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

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
// IMAGE PROCESSING
// =============================================================================

/**
 * Extract image paths from markdown content
 * Returns array of relative paths like "assets/image.png"
 */
function extractImagePaths(content: string): string[] {
  const paths: string[] = [];
  let match;

  // Reset regex lastIndex
  IMAGE_REGEX.lastIndex = 0;

  while ((match = IMAGE_REGEX.exec(content)) !== null) {
    const imagePath = match[2];
    // Only process relative paths (stored in our bucket)
    if (!imagePath.startsWith("http://") && !imagePath.startsWith("https://")) {
      paths.push(imagePath);
    }
  }

  return paths.slice(0, MAX_IMAGES_PER_CARD);
}

/**
 * Build full URL for image in Supabase storage
 */
function buildImageUrl(userId: string, repositoryId: string, imagePath: string): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  // Images are stored at: card-assets/{userId}/{repoId}/{path}
  return `${supabaseUrl}/storage/v1/object/public/card-assets/${userId}/${repositoryId}/${imagePath}`;
}

/**
 * Detect media type from image bytes (magic bytes)
 */
function detectMediaType(bytes: Uint8Array): ImageData["mediaType"] | null {
  if (bytes.length < 4) return null;

  // PNG: 89 50 4E 47
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4E && bytes[3] === 0x47) {
    return "image/png";
  }
  // JPEG: FF D8 FF
  if (bytes[0] === 0xFF && bytes[1] === 0xD8 && bytes[2] === 0xFF) {
    return "image/jpeg";
  }
  // GIF: 47 49 46 38
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) {
    return "image/gif";
  }
  // WebP: 52 49 46 46 ... 57 45 42 50
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return "image/webp";
    }
  }

  return null;
}

/**
 * Resize image to max dimensions while maintaining aspect ratio
 * Returns base64 encoded resized image
 */
async function resizeImage(imageBytes: Uint8Array): Promise<{ base64: string; mediaType: ImageData["mediaType"] }> {
  // Decode image
  const image = await decode(imageBytes);

  if (!(image instanceof Image)) {
    throw new Error("Failed to decode image");
  }

  const { width, height } = image;
  console.log(`[Image] Original size: ${width}x${height}`);

  // Check if resize is needed
  if (width <= MAX_IMAGE_SIZE && height <= MAX_IMAGE_SIZE) {
    // No resize needed, encode to PNG
    const encoded = await image.encode();
    const base64 = btoa(String.fromCharCode(...encoded));
    console.log(`[Image] No resize needed, output size: ${encoded.length} bytes`);
    return { base64, mediaType: "image/png" };
  }

  // Calculate new dimensions maintaining aspect ratio
  let newWidth = width;
  let newHeight = height;

  if (width > height) {
    newWidth = MAX_IMAGE_SIZE;
    newHeight = Math.round((height / width) * MAX_IMAGE_SIZE);
  } else {
    newHeight = MAX_IMAGE_SIZE;
    newWidth = Math.round((width / height) * MAX_IMAGE_SIZE);
  }

  console.log(`[Image] Resizing to: ${newWidth}x${newHeight}`);

  // Resize image
  const resized = image.resize(newWidth, newHeight);
  const encoded = await resized.encode();
  const base64 = btoa(String.fromCharCode(...encoded));

  console.log(`[Image] Resized output size: ${encoded.length} bytes`);

  return { base64, mediaType: "image/png" };
}

/**
 * Fetch and process a single image from storage
 * Returns null if image cannot be processed
 */
async function processImage(imageUrl: string): Promise<ImageData | null> {
  try {
    console.log(`[Image] Fetching: ${imageUrl}`);

    const response = await fetch(imageUrl);
    if (!response.ok) {
      console.error(`[Image] Failed to fetch: ${response.status}`);
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    console.log(`[Image] Fetched ${bytes.length} bytes`);

    // Check size limit
    if (bytes.length > MAX_IMAGE_BYTES) {
      console.error(`[Image] Too large: ${bytes.length} bytes (max ${MAX_IMAGE_BYTES})`);
      return null;
    }

    // Detect media type
    const detectedType = detectMediaType(bytes);
    if (!detectedType) {
      console.error(`[Image] Unknown image format`);
      return null;
    }

    console.log(`[Image] Detected type: ${detectedType}`);

    // Resize image
    const { base64, mediaType } = await resizeImage(bytes);

    return { base64, mediaType };
  } catch (error) {
    const msg = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Image] Processing error: ${msg}`);
    return null;
  }
}

/**
 * Process all images in a card's content
 * Returns array of processed images ready for LLM API
 */
async function processCardImages(
  cardContent: string,
  userId: string,
  repositoryId: string
): Promise<ImageData[]> {
  if (!userId || !repositoryId) {
    console.log(`[Image] No userId/repositoryId provided, skipping images`);
    return [];
  }

  const imagePaths = extractImagePaths(cardContent);
  console.log(`[Image] Found ${imagePaths.length} images in card`);

  if (imagePaths.length === 0) {
    return [];
  }

  const images: ImageData[] = [];

  for (const path of imagePaths) {
    const url = buildImageUrl(userId, repositoryId, path);
    const processed = await processImage(url);
    if (processed) {
      images.push(processed);
    }
  }

  console.log(`[Image] Successfully processed ${images.length}/${imagePaths.length} images`);
  return images;
}

/**
 * Build OpenAI multimodal content array
 */
function buildOpenAIContent(text: string, images: ImageData[]): Array<{ type: string; text?: string; image_url?: { url: string } }> {
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // Add images first (context)
  for (const image of images) {
    content.push({
      type: "image_url",
      image_url: {
        url: `data:${image.mediaType};base64,${image.base64}`,
      },
    });
  }

  // Add text
  content.push({ type: "text", text });

  return content;
}

/**
 * Build Anthropic multimodal content array
 */
function buildAnthropicContent(text: string, images: ImageData[]): Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> {
  const content: Array<{ type: string; text?: string; source?: { type: string; media_type: string; data: string } }> = [];

  // Add images first (context)
  for (const image of images) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: image.mediaType,
        data: image.base64,
      },
    });
  }

  // Add text
  content.push({ type: "text", text });

  return content;
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
  systemPrompt: string,
  images: ImageData[] = []
): Promise<QuizQuestion> {
  const textContent = `Ecco il contenuto della flashcard:\n\n${cardContent}`;

  // Build user message content (text-only or multimodal)
  const userContent = images.length > 0
    ? buildOpenAIContent(textContent, images)
    : textContent;

  console.log(`[OpenAI] Sending request with ${images.length} images`);

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
        { role: "user", content: userContent },
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
  systemPrompt: string,
  images: ImageData[] = []
): Promise<QuizQuestion> {
  const textContent = `Ecco il contenuto della flashcard:\n\n${cardContent}`;

  // Build user message content (text-only or multimodal)
  const userContent = images.length > 0
    ? buildAnthropicContent(textContent, images)
    : textContent;

  console.log(`[Anthropic] Sending request with ${images.length} images`);

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
        { role: "user", content: userContent },
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
  correctAnswer: string,
  images: ImageData[] = []
): Promise<ValidationResponse> {
  const textMessage = `CONTENUTO DELLA CARTA:
${cardContent}

DOMANDA POSTA:
${question}

RISPOSTA DELL'UTENTE: ${userAnswer}
RISPOSTA CORRETTA: ${correctAnswer}

Valida la risposta e fornisci una spiegazione dettagliata.`;

  // Build user message content (text-only or multimodal)
  const userContent = images.length > 0
    ? buildOpenAIContent(textMessage, images)
    : textMessage;

  console.log(`[OpenAI] Validating with ${images.length} images`);

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
        { role: "user", content: userContent },
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
  correctAnswer: string,
  images: ImageData[] = []
): Promise<ValidationResponse> {
  const textMessage = `CONTENUTO DELLA CARTA:
${cardContent}

DOMANDA POSTA:
${question}

RISPOSTA DELL'UTENTE: ${userAnswer}
RISPOSTA CORRETTA: ${correctAnswer}

Valida la risposta e fornisci una spiegazione dettagliata.`;

  // Build user message content (text-only or multimodal)
  const userContent = images.length > 0
    ? buildAnthropicContent(textMessage, images)
    : textMessage;

  console.log(`[Anthropic] Validating with ${images.length} images`);

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
        { role: "user", content: userContent },
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
  cardContent: string,
  images: ImageData[] = []
): Promise<QuizQuestion> {
  const apiKey = getApiKey(config.provider);

  if (config.provider === "openai") {
    return await generateQuizOpenAI(apiKey, config.model, cardContent, config.systemPrompt, images);
  } else {
    return await generateQuizAnthropic(apiKey, config.model, cardContent, config.systemPrompt, images);
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
  correctAnswer: string,
  images: ImageData[] = []
): Promise<ValidationResponse> {
  const apiKey = getApiKey(config.provider);

  if (config.provider === "openai") {
    return await validateAnswerOpenAI(apiKey, config.model, cardContent, question, userAnswer, correctAnswer, images);
  } else {
    return await validateAnswerAnthropic(apiKey, config.model, cardContent, question, userAnswer, correctAnswer, images);
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
        const { cardContent, userId, repositoryId } = body;
        if (!cardContent) {
          return new Response(
            JSON.stringify({ error: "Missing cardContent" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // Process images from card content (if userId/repositoryId provided)
        const images = await processCardImages(cardContent, userId || '', repositoryId || '');

        const config = await getPlatformConfig(supabase);
        const quiz = await handleGenerateQuiz(config, cardContent, images);
        return new Response(JSON.stringify({ success: true, quiz }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "validate_answer": {
        const { cardContent, question, userAnswer, correctAnswer, userId, repositoryId } = body;
        if (!cardContent || !question || !userAnswer || !correctAnswer) {
          return new Response(
            JSON.stringify({ error: "Missing required fields for validation" }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 400,
            }
          );
        }

        // Process images from card content (if userId/repositoryId provided)
        const images = await processCardImages(cardContent, userId || '', repositoryId || '');

        const config = await getPlatformConfig(supabase);
        const validation = await handleValidateAnswer(
          config, cardContent, question, userAnswer, correctAnswer, images
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
