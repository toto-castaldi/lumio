/**
 * CardView class for stateless image URL transformation
 *
 * Transforms relative image paths in card content to absolute Supabase Storage URLs.
 * This is a stateless approach - URLs are resolved at display time based on:
 * - Repository userId and id
 * - Original image path in markdown
 *
 * Storage structure: card-assets/{userId}/{repoId}/{originalPath}
 * Example: /assets/biagram.png -> {supabaseUrl}/storage/v1/object/public/card-assets/{userId}/{repoId}/assets/biagram.png
 */

import type { Card, Repository } from '@lumio/shared';

// Image reference regex: ![alt](path) or ![alt](path "title")
const IMAGE_REGEX = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;

export class CardView {
  private card: Card;
  private repository: Repository;
  private supabaseUrl: string;

  constructor(card: Card, repository: Repository, supabaseUrl: string) {
    this.card = card;
    this.repository = repository;
    this.supabaseUrl = supabaseUrl;
  }

  /**
   * Get the card with image URLs transformed to Supabase Storage URLs
   */
  getCard(): Card {
    return this.card;
  }

  /**
   * Get content with image URLs resolved to Supabase Storage
   */
  getContent(): string {
    return this.transformImageUrls(this.card.content);
  }

  /**
   * Get raw content with image URLs resolved to Supabase Storage
   */
  getRawContent(): string {
    return this.transformImageUrls(this.card.rawContent);
  }

  /**
   * Get title (unchanged)
   */
  getTitle(): string {
    return this.card.title;
  }

  /**
   * Get repository
   */
  getRepository(): Repository {
    return this.repository;
  }

  /**
   * Resolve a relative path based on the card's file path
   * Example: card at "cards/exercise.md" with image "../assets/img.png" -> "assets/img.png"
   */
  private resolveRelativePath(imagePath: string): string {
    // If absolute path (starts with /), just remove the leading slash
    if (imagePath.startsWith('/')) {
      return imagePath.slice(1);
    }

    // If not a relative path (no ./ or ../), return as-is
    if (!imagePath.startsWith('./') && !imagePath.startsWith('../')) {
      return imagePath;
    }

    // Get the directory of the card file
    // e.g., "cards/exercise.md" -> "cards"
    const cardDir = this.card.filePath.includes('/')
      ? this.card.filePath.substring(0, this.card.filePath.lastIndexOf('/'))
      : '';

    // Split into path segments
    const cardSegments = cardDir ? cardDir.split('/') : [];
    const imageSegments = imagePath.split('/');

    // Process each segment of the image path
    const resultSegments = [...cardSegments];
    for (const segment of imageSegments) {
      if (segment === '..') {
        // Go up one directory
        resultSegments.pop();
      } else if (segment !== '.' && segment !== '') {
        // Add the segment
        resultSegments.push(segment);
      }
    }

    return resultSegments.join('/');
  }

  /**
   * Transform relative image URLs to absolute Supabase Storage URLs
   */
  private transformImageUrls(content: string): string {
    return content.replace(IMAGE_REGEX, (match, alt, path) => {
      // Skip external URLs
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return match;
      }

      // Resolve relative path based on card's file location
      const resolvedPath = this.resolveRelativePath(path);

      // Construct Supabase Storage URL
      // Format: {supabaseUrl}/storage/v1/object/public/card-assets/{userId}/{repoId}/{resolvedPath}
      const storageUrl = `${this.supabaseUrl}/storage/v1/object/public/card-assets/${this.repository.userId}/${this.repository.id}/${resolvedPath}`;

      return `![${alt}](${storageUrl})`;
    });
  }

  /**
   * Extract all image paths from content (useful for debugging)
   */
  getImagePaths(): string[] {
    const paths: string[] = [];
    let match;

    const regex = new RegExp(IMAGE_REGEX.source, 'g');
    while ((match = regex.exec(this.card.content)) !== null) {
      const path = match[2];
      if (!path.startsWith('http://') && !path.startsWith('https://')) {
        paths.push(path);
      }
    }

    return paths;
  }
}
