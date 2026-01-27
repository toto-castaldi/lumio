import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Image, decode } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import ignore from "npm:ignore@5.3.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

// =============================================================================
// CONSTANTS
// =============================================================================

const MAX_IMAGE_SIZE = 1568;
const MAX_IMAGES_PER_CARD = 20;
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const RATE_LIMIT_DELAY_MS = 500;

// =============================================================================
// TYPES
// =============================================================================

type LLMProvider = "openai" | "anthropic";

interface ImageData {
  base64: string;
  mediaType: "image/jpeg" | "image/png" | "image/gif" | "image/webp";
}

interface BatchConfig {
  provider: LLMProvider;
  model: string;
  questionsPerCard: number;
  retryOnJsonError: number;
  cardsPerRun: number;
}

interface CardToProcess {
  card_id: string;
  content: string;
  raw_content: string;
  file_path: string;
  repository_id: string;
  current_count: number;
}

interface GeneratedQuestion {
  question: string;
  options: { label: string; text: string }[];
  correctAnswer: string;
  explanation: string;
}

interface BatchStats {
  cardsProcessed: number;
  questionsGenerated: number;
  errors: number;
  skipped: number;
}

// =============================================================================
// PROMPT
// =============================================================================

const QUESTION_GENERATION_PROMPT = `Sei un assistente educativo esperto. Il tuo compito è creare una domanda a scelta multipla basata sul contenuto della flashcard fornita.

REGOLE FONDAMENTALI:
1. Crea UNA domanda che testi la comprensione del concetto principale della carta
2. Fornisci esattamente 4 opzioni (A, B, C, D)
3. Solo UNA opzione deve essere corretta
4. Le opzioni sbagliate devono essere plausibili ma chiaramente errate per chi conosce il tema
5. IMPORTANTE: Varia la posizione della risposta corretta in modo random (non sempre A o B!)
6. La spiegazione deve essere dettagliata (3-4 frasi) e aiutare a capire il concetto

FORMATO RISPOSTA (JSON rigoroso):
{
  "question": "La domanda qui",
  "options": [
    {"label": "A", "text": "Prima opzione"},
    {"label": "B", "text": "Seconda opzione"},
    {"label": "C", "text": "Terza opzione"},
    {"label": "D", "text": "Quarta opzione"}
  ],
  "correctAnswer": "C",
  "explanation": "Spiegazione dettagliata del concetto (3-4 frasi). Spiega perché la risposta corretta è quella giusta e come ricordare questo concetto."
}

Rispondi SOLO con il JSON, senza altro testo.`;

// =============================================================================
// SUPABASE CLIENT
// =============================================================================

function createServiceClient() {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

// =============================================================================
// LUMIOIGNORE FILTERING
// =============================================================================

type IgnoreFilter = ReturnType<typeof ignore>;

/**
 * Create ignore filter from .lumioignore content
 * Replicates the logic from packages/core/src/deck/Deck.ts
 */
function createIgnoreFilter(lumioignoreContent: string | null | undefined): IgnoreFilter | null {
  if (!lumioignoreContent) {
    return null;
  }

  try {
    const ig = ignore();
    // Split content by lines, filter empty lines and comments
    const patterns = lumioignoreContent
      .split('\n')
      .map(line => line.trim())
      .filter(line => line && !line.startsWith('#'));

    if (patterns.length === 0) {
      return null;
    }

    ig.add(patterns);
    return ig;
  } catch (error) {
    console.error('[Batch] Failed to parse .lumioignore:', error);
    return null;
  }
}

/**
 * Check if a card should be ignored based on its file path
 */
function isCardIgnored(filePath: string, ignoreFilter: IgnoreFilter | null): boolean {
  if (!ignoreFilter) {
    return false;
  }
  return ignoreFilter.ignores(filePath);
}

// =============================================================================
// CONFIG
// =============================================================================

async function getBatchConfig(
  supabase: ReturnType<typeof createClient>
): Promise<BatchConfig> {
  const { data, error } = await supabase
    .from("platform_config")
    .select("key, value")
    .in("key", [
      "llm_provider",
      "llm_model",
      "questions_per_card",
      "batch_retry_on_json_error",
      "batch_cards_per_run",
    ]);

  if (error) {
    throw new Error(`Failed to load config: ${error.message}`);
  }

  const config: Record<string, string | number> = {};
  for (const row of data || []) {
    const value = row.value;
    // Handle both quoted strings and numbers
    if (typeof value === "string") {
      config[row.key] = value.replace(/^"|"$/g, "");
    } else if (typeof value === "number") {
      config[row.key] = value;
    } else {
      config[row.key] = JSON.stringify(value);
    }
  }

  return {
    provider: (config.llm_provider as LLMProvider) || "anthropic",
    model: (config.llm_model as string) || "claude-3-5-haiku-latest",
    questionsPerCard: parseInt(String(config.questions_per_card || "4"), 10),
    retryOnJsonError: parseInt(String(config.batch_retry_on_json_error || "3"), 10),
    cardsPerRun: parseInt(String(config.batch_cards_per_run || "50"), 10),
  };
}

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

function extractImagePaths(content: string): string[] {
  const paths: string[] = [];
  let match;
  IMAGE_REGEX.lastIndex = 0;

  while ((match = IMAGE_REGEX.exec(content)) !== null) {
    const imagePath = match[2];
    if (!imagePath.startsWith("http://") && !imagePath.startsWith("https://")) {
      paths.push(imagePath);
    }
  }

  return paths.slice(0, MAX_IMAGES_PER_CARD);
}

function buildImageUrl(repositoryId: string, imagePath: string): string {
  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  return `${supabaseUrl}/storage/v1/object/public/card-assets/${repositoryId}/${imagePath}`;
}

function detectMediaType(bytes: Uint8Array): ImageData["mediaType"] | null {
  if (bytes.length < 4) return null;
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) return "image/png";
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) return "image/jpeg";
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x38) return "image/gif";
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46) {
    if (bytes.length >= 12 && bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
      return "image/webp";
    }
  }
  return null;
}

async function resizeImage(
  imageBytes: Uint8Array
): Promise<{ base64: string; mediaType: ImageData["mediaType"] }> {
  const image = await decode(imageBytes);
  if (!(image instanceof Image)) {
    throw new Error("Failed to decode image");
  }

  const { width, height } = image;
  if (width <= MAX_IMAGE_SIZE && height <= MAX_IMAGE_SIZE) {
    const encoded = await image.encode();
    const base64 = btoa(String.fromCharCode(...encoded));
    return { base64, mediaType: "image/png" };
  }

  let newWidth = width;
  let newHeight = height;

  if (width > height) {
    newWidth = MAX_IMAGE_SIZE;
    newHeight = Math.round((height / width) * MAX_IMAGE_SIZE);
  } else {
    newHeight = MAX_IMAGE_SIZE;
    newWidth = Math.round((width / height) * MAX_IMAGE_SIZE);
  }

  const resized = image.resize(newWidth, newHeight);
  const encoded = await resized.encode();
  const base64 = btoa(String.fromCharCode(...encoded));

  return { base64, mediaType: "image/png" };
}

async function processImage(imageUrl: string): Promise<ImageData | null> {
  try {
    const response = await fetch(imageUrl);
    if (!response.ok) return null;

    const arrayBuffer = await response.arrayBuffer();
    const bytes = new Uint8Array(arrayBuffer);

    if (bytes.length > MAX_IMAGE_BYTES) return null;

    const detectedType = detectMediaType(bytes);
    if (!detectedType) return null;

    const { base64, mediaType } = await resizeImage(bytes);
    return { base64, mediaType };
  } catch {
    return null;
  }
}

async function processCardImages(
  cardContent: string,
  repositoryId: string
): Promise<ImageData[]> {
  if (!repositoryId) return [];

  const imagePaths = extractImagePaths(cardContent);
  if (imagePaths.length === 0) return [];

  const images: ImageData[] = [];
  for (const path of imagePaths) {
    const url = buildImageUrl(repositoryId, path);
    const processed = await processImage(url);
    if (processed) {
      images.push(processed);
    }
  }

  return images;
}

// =============================================================================
// LLM API CALLS
// =============================================================================

function buildOpenAIContent(
  text: string,
  images: ImageData[]
): Array<{ type: string; text?: string; image_url?: { url: string } }> {
  const content: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];
  for (const image of images) {
    content.push({
      type: "image_url",
      image_url: { url: `data:${image.mediaType};base64,${image.base64}` },
    });
  }
  content.push({ type: "text", text });
  return content;
}

function buildAnthropicContent(
  text: string,
  images: ImageData[]
): Array<{
  type: string;
  text?: string;
  source?: { type: string; media_type: string; data: string };
}> {
  const content: Array<{
    type: string;
    text?: string;
    source?: { type: string; media_type: string; data: string };
  }> = [];
  for (const image of images) {
    content.push({
      type: "image",
      source: { type: "base64", media_type: image.mediaType, data: image.base64 },
    });
  }
  content.push({ type: "text", text });
  return content;
}

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

async function generateQuestionOpenAI(
  apiKey: string,
  modelId: string,
  cardContent: string,
  images: ImageData[]
): Promise<GeneratedQuestion> {
  const textContent = `Ecco il contenuto della flashcard:\n\n${cardContent}`;
  const userContent =
    images.length > 0 ? buildOpenAIContent(textContent, images) : textContent;

  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: modelId,
      messages: [
        { role: "system", content: QUESTION_GENERATION_PROMPT },
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

  return parseJsonResponse<GeneratedQuestion>(content);
}

async function generateQuestionAnthropic(
  apiKey: string,
  modelId: string,
  cardContent: string,
  images: ImageData[]
): Promise<GeneratedQuestion> {
  const textContent = `Ecco il contenuto della flashcard:\n\n${cardContent}`;
  const userContent =
    images.length > 0 ? buildAnthropicContent(textContent, images) : textContent;

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
      system: QUESTION_GENERATION_PROMPT,
      messages: [{ role: "user", content: userContent }],
    }),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(
      error.error?.message || `Anthropic API error: ${response.status}`
    );
  }

  const data = await response.json();
  const content = data.content?.[0]?.text;

  if (!content) {
    throw new Error("Empty response from Anthropic");
  }

  return parseJsonResponse<GeneratedQuestion>(content);
}

async function generateQuestion(
  config: BatchConfig,
  cardContent: string,
  images: ImageData[]
): Promise<GeneratedQuestion> {
  const apiKey = getApiKey(config.provider);

  if (config.provider === "openai") {
    return generateQuestionOpenAI(apiKey, config.model, cardContent, images);
  } else {
    return generateQuestionAnthropic(apiKey, config.model, cardContent, images);
  }
}

// =============================================================================
// VALIDATION
// =============================================================================

function validateQuestion(question: GeneratedQuestion): boolean {
  if (!question.question || typeof question.question !== "string") return false;
  if (!question.explanation || typeof question.explanation !== "string") return false;
  if (!question.correctAnswer || !["A", "B", "C", "D"].includes(question.correctAnswer))
    return false;
  if (!Array.isArray(question.options) || question.options.length !== 4) return false;

  for (const opt of question.options) {
    if (!opt.label || !opt.text) return false;
    if (!["A", "B", "C", "D"].includes(opt.label)) return false;
  }

  return true;
}

// =============================================================================
// BATCH PROCESSING
// =============================================================================

async function processCard(
  supabase: ReturnType<typeof createClient>,
  config: BatchConfig,
  card: CardToProcess,
  stats: BatchStats
): Promise<void> {
  const questionsNeeded = config.questionsPerCard - card.current_count;
  console.log(
    `[Card ${card.card_id}] Needs ${questionsNeeded} questions (has ${card.current_count})`
  );

  // Process images for this card
  const images = await processCardImages(card.raw_content, card.repository_id);

  for (let i = 0; i < questionsNeeded; i++) {
    let attempts = 0;
    let success = false;

    while (attempts < config.retryOnJsonError && !success) {
      attempts++;
      try {
        console.log(
          `[Card ${card.card_id}] Generating question ${i + 1}/${questionsNeeded} (attempt ${attempts})`
        );

        const question = await generateQuestion(config, card.raw_content, images);

        if (!validateQuestion(question)) {
          console.error(`[Card ${card.card_id}] Invalid question structure`);
          continue;
        }

        // Save to database using RPC function
        const { error: insertError } = await supabase.rpc("insert_card_question", {
          p_card_id: card.card_id,
          p_question_text: question.question,
          p_options: question.options,
          p_correct_answer: question.correctAnswer,
          p_explanation: question.explanation,
          p_llm_provider: config.provider,
          p_llm_model: config.model,
        });

        if (insertError) {
          console.error(`[Card ${card.card_id}] Insert error: ${insertError.message}`);
          stats.errors++;
        } else {
          stats.questionsGenerated++;
          success = true;
          console.log(`[Card ${card.card_id}] Question ${i + 1} saved successfully`);
        }
      } catch (error) {
        const msg = error instanceof Error ? error.message : "Unknown error";
        console.error(`[Card ${card.card_id}] Generation error: ${msg}`);
      }
    }

    if (!success) {
      stats.errors++;
    }

    // Rate limiting between API calls
    await new Promise((resolve) => setTimeout(resolve, RATE_LIMIT_DELAY_MS));
  }

  stats.cardsProcessed++;
}

async function generateBatch(
  supabase: ReturnType<typeof createClient>
): Promise<BatchStats> {
  const stats: BatchStats = {
    cardsProcessed: 0,
    questionsGenerated: 0,
    errors: 0,
    skipped: 0,
  };

  console.log("[Batch] Starting batch question generation...");

  // Get config
  const config = await getBatchConfig(supabase);
  console.log(
    `[Batch] Config: provider=${config.provider}, model=${config.model}, questionsPerCard=${config.questionsPerCard}`
  );

  // Get cards needing questions (now includes file_path)
  const { data: cards, error } = await supabase.rpc("get_cards_needing_questions", {
    p_target_count: config.questionsPerCard,
    p_limit: config.cardsPerRun,
  });

  if (error) {
    console.error(`[Batch] Error fetching cards: ${error.message}`);
    throw new Error(`Failed to fetch cards: ${error.message}`);
  }

  if (!cards || cards.length === 0) {
    console.log("[Batch] No cards need questions");
    return stats;
  }

  console.log(`[Batch] Found ${cards.length} cards needing questions`);

  // =========================================================================
  // LUMIOIGNORE FILTERING
  // Group cards by repository, load lumioignore_content, filter ignored cards
  // =========================================================================
  const cardsByRepo = new Map<string, CardToProcess[]>();
  for (const card of cards as CardToProcess[]) {
    const repoCards = cardsByRepo.get(card.repository_id) || [];
    repoCards.push(card);
    cardsByRepo.set(card.repository_id, repoCards);
  }

  const filteredCards: CardToProcess[] = [];
  for (const [repoId, repoCards] of cardsByRepo) {
    // Load lumioignore_content for this repository
    const { data: repo } = await supabase
      .from("repositories")
      .select("lumioignore_content")
      .eq("id", repoId)
      .single();

    const ignoreFilter = createIgnoreFilter(repo?.lumioignore_content);

    for (const card of repoCards) {
      if (!isCardIgnored(card.file_path, ignoreFilter)) {
        filteredCards.push(card);
      } else {
        stats.skipped++;
        console.log(`[Batch] Skipped ignored card: ${card.file_path}`);
      }
    }
  }

  if (filteredCards.length === 0) {
    console.log("[Batch] All cards filtered by .lumioignore");
    return stats;
  }

  console.log(
    `[Batch] After .lumioignore filter: ${filteredCards.length} cards to process (${stats.skipped} skipped)`
  );

  // Process each filtered card
  for (const card of filteredCards) {
    try {
      await processCard(supabase, config, card, stats);
    } catch (error) {
      const msg = error instanceof Error ? error.message : "Unknown error";
      console.error(`[Batch] Error processing card ${card.card_id}: ${msg}`);
      stats.errors++;
      stats.skipped++;
    }
  }

  console.log(
    `[Batch] Complete. Cards: ${stats.cardsProcessed}, Questions: ${stats.questionsGenerated}, Errors: ${stats.errors}, Skipped: ${stats.skipped}`
  );

  return stats;
}

async function generateForCard(
  supabase: ReturnType<typeof createClient>,
  cardId: string
): Promise<BatchStats> {
  const stats: BatchStats = {
    cardsProcessed: 0,
    questionsGenerated: 0,
    errors: 0,
    skipped: 0,
  };

  console.log(`[Single] Generating questions for card ${cardId}...`);

  // Get config
  const config = await getBatchConfig(supabase);

  // Get card details
  const { data: card, error: cardError } = await supabase
    .from("cards")
    .select("id, content, raw_content, repository_id")
    .eq("id", cardId)
    .single();

  if (cardError || !card) {
    throw new Error(`Card not found: ${cardId}`);
  }

  // Count existing questions
  const { count } = await supabase
    .from("card_questions")
    .select("id", { count: "exact", head: true })
    .eq("card_id", cardId)
    .eq("is_active", true);

  const cardToProcess: CardToProcess = {
    card_id: card.id,
    content: card.content,
    raw_content: card.raw_content,
    repository_id: card.repository_id,
    current_count: count || 0,
  };

  await processCard(supabase, config, cardToProcess, stats);

  return stats;
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

    // Check for service role key (for batch jobs)
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const isServiceRole =
      authHeader && serviceRoleKey && authHeader.includes(serviceRoleKey);

    if (!isServiceRole) {
      // Verify user authentication
      if (!authHeader) {
        return new Response(
          JSON.stringify({ error: "Missing authorization header" }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 401,
          }
        );
      }

      // For user requests, verify they have admin privileges (optional)
      // For now, we allow authenticated users to trigger single-card generation
    }

    const supabase = createServiceClient();
    const body = await req.json();
    const { action, cardId } = body;

    switch (action) {
      case "generate_batch": {
        const stats = await generateBatch(supabase);
        return new Response(JSON.stringify({ success: true, stats }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      case "generate_for_card": {
        if (!cardId) {
          return new Response(JSON.stringify({ error: "Missing cardId" }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
          });
        }

        const stats = await generateForCard(supabase, cardId);
        return new Response(JSON.stringify({ success: true, stats }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 200,
        });
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown action: ${action}` }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
          status: 400,
        });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(`[Error] ${message}`);

    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
