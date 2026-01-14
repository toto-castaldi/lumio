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
   * Transform relative image URLs to absolute Supabase Storage URLs
   */
  private transformImageUrls(content: string): string {
    return content.replace(IMAGE_REGEX, (match, alt, path) => {
      // Skip external URLs
      if (path.startsWith('http://') || path.startsWith('https://')) {
        return match;
      }

      // Remove leading slash if present for storage path
      const cleanPath = path.startsWith('/') ? path.slice(1) : path;

      // Construct Supabase Storage URL
      // Format: {supabaseUrl}/storage/v1/object/public/card-assets/{userId}/{repoId}/{originalPath}
      const storageUrl = `${this.supabaseUrl}/storage/v1/object/public/card-assets/${this.repository.userId}/${this.repository.id}/${cleanPath}`;

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
