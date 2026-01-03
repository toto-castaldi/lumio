import { getSupabaseClient } from './client';
import type { CardAsset } from '@lumio/shared';

/**
 * Map database card_assets row to frontend CardAsset type
 */
function mapCardAsset(dbAsset: Record<string, unknown>): CardAsset {
  return {
    id: dbAsset.id as string,
    cardId: dbAsset.card_id as string,
    originalPath: dbAsset.original_path as string,
    storagePath: dbAsset.storage_path as string,
    contentHash: dbAsset.content_hash as string,
    mimeType: dbAsset.mime_type as string,
    sizeBytes: dbAsset.size_bytes as number | undefined,
    createdAt: dbAsset.created_at as string,
  };
}

/**
 * Get all assets for a specific card
 * @param cardId - UUID of the card
 */
export async function getCardAssets(cardId: string): Promise<CardAsset[]> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('card_assets')
    .select('*')
    .eq('card_id', cardId);

  if (error) throw error;

  return (data || []).map(mapCardAsset);
}

/**
 * Get all assets for multiple cards (batch operation)
 * @param cardIds - Array of card UUIDs
 */
export async function getCardAssetsBatch(cardIds: string[]): Promise<Map<string, CardAsset[]>> {
  if (cardIds.length === 0) return new Map();

  const supabase = getSupabaseClient();

  const { data, error } = await supabase
    .from('card_assets')
    .select('*')
    .in('card_id', cardIds);

  if (error) throw error;

  // Group assets by card_id
  const assetMap = new Map<string, CardAsset[]>();
  for (const row of data || []) {
    const asset = mapCardAsset(row);
    if (!assetMap.has(asset.cardId)) {
      assetMap.set(asset.cardId, []);
    }
    assetMap.get(asset.cardId)!.push(asset);
  }

  return assetMap;
}

/**
 * Get a signed URL for an asset in Supabase Storage
 * URLs are valid for 1 hour by default
 * @param storagePath - Path in Supabase Storage (e.g., user_id/repo_id/hash.png)
 * @param expiresIn - URL validity in seconds (default: 3600 = 1 hour)
 */
export async function getAssetSignedUrl(
  storagePath: string,
  expiresIn: number = 3600
): Promise<string | null> {
  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from('card-assets')
    .createSignedUrl(storagePath, expiresIn);

  if (error || !data) {
    console.warn('Failed to create signed URL:', error?.message);
    return null;
  }

  return data.signedUrl;
}

/**
 * Get signed URLs for multiple assets (batch operation)
 * @param storagePaths - Array of storage paths
 * @param expiresIn - URL validity in seconds (default: 3600 = 1 hour)
 */
export async function getAssetSignedUrls(
  storagePaths: string[],
  expiresIn: number = 3600
): Promise<Map<string, string>> {
  if (storagePaths.length === 0) return new Map();

  const supabase = getSupabaseClient();

  const { data, error } = await supabase.storage
    .from('card-assets')
    .createSignedUrls(storagePaths, expiresIn);

  if (error || !data) {
    console.warn('Failed to create signed URLs:', error?.message);
    return new Map();
  }

  const urlMap = new Map<string, string>();
  for (const item of data) {
    if (item.signedUrl && item.path) {
      urlMap.set(item.path, item.signedUrl);
    }
  }

  return urlMap;
}

/**
 * Transform image URLs in markdown content
 * Replaces original paths with signed URLs from Supabase Storage
 * @param content - Markdown content with image references
 * @param assets - Array of CardAsset objects for this card
 * @returns Markdown content with transformed image URLs
 */
export async function transformCardContentImages(
  content: string,
  assets: CardAsset[]
): Promise<string> {
  if (assets.length === 0) return content;

  // Get signed URLs for all assets
  const storagePaths = assets.map((a) => a.storagePath);
  const signedUrls = await getAssetSignedUrls(storagePaths);

  // Create a mapping from original path to signed URL
  const pathToUrl = new Map<string, string>();
  for (const asset of assets) {
    const signedUrl = signedUrls.get(asset.storagePath);
    if (signedUrl) {
      pathToUrl.set(asset.originalPath, signedUrl);
    }
  }

  // Replace image references in content
  // Matches: ![alt text](path)
  let transformedContent = content;
  for (const [originalPath, signedUrl] of pathToUrl) {
    // Escape special regex characters in the path
    const escapedPath = originalPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    // Also handle paths that might have leading ./ or /
    const pathVariants = [
      escapedPath,
      `./${escapedPath}`,
      `/${escapedPath}`,
    ];

    for (const variant of pathVariants) {
      const regex = new RegExp(`(!\\[[^\\]]*\\]\\()${variant}(\\))`, 'g');
      transformedContent = transformedContent.replace(regex, `$1${signedUrl}$2`);
    }
  }

  return transformedContent;
}
