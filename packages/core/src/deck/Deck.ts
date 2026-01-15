import ignore, { Ignore } from 'ignore';
import type { Repository, Card } from '@lumio/shared';

/**
 * Deck class for managing repository cards with .lumioignore filtering.
 *
 * This class provides a stateless approach to card filtering:
 * - Every time cards are listed, filtering is applied based on .lumioignore
 * - No state is stored about which cards are ignored
 * - Card counts are calculated dynamically
 *
 * @example
 * ```typescript
 * const deck = new Deck(repository, cards);
 * const activeCards = deck.getActiveCards();
 * const count = deck.getActiveCardCount();
 * ```
 */
export class Deck {
  private repository: Repository;
  private allCards: Card[];
  private ignoreFilter: Ignore | null;

  /**
   * Create a new Deck instance
   * @param repository - Repository with optional lumioignoreContent
   * @param cards - All cards from the repository (unfiltered)
   */
  constructor(repository: Repository, cards: Card[]) {
    this.repository = repository;
    this.allCards = cards;
    this.ignoreFilter = this.createIgnoreFilter();
  }

  /**
   * Create ignore filter from repository's .lumioignore content
   */
  private createIgnoreFilter(): Ignore | null {
    if (!this.repository.lumioignoreContent) {
      return null;
    }

    try {
      const ig = ignore();
      // Split content by lines, filter empty lines and comments
      const patterns = this.repository.lumioignoreContent
        .split('\n')
        .map(line => line.trim())
        .filter(line => line && !line.startsWith('#'));

      if (patterns.length === 0) {
        return null;
      }

      ig.add(patterns);
      return ig;
    } catch (error) {
      console.error('[Deck] Failed to parse .lumioignore:', error);
      return null;
    }
  }

  /**
   * Check if a card should be ignored based on its file path
   * @param card - Card to check
   * @returns true if the card should be ignored
   */
  private isCardIgnored(card: Card): boolean {
    if (!this.ignoreFilter) {
      return false;
    }
    return this.ignoreFilter.ignores(card.filePath);
  }

  /**
   * Get all active (non-ignored) cards
   * @returns Array of cards that are not matched by .lumioignore patterns
   */
  getActiveCards(): Card[] {
    if (!this.ignoreFilter) {
      return this.allCards;
    }
    return this.allCards.filter(card => !this.isCardIgnored(card));
  }

  /**
   * Get count of active (non-ignored) cards
   * @returns Number of cards that are not matched by .lumioignore patterns
   */
  getActiveCardCount(): number {
    return this.getActiveCards().length;
  }

  /**
   * Get all ignored cards (for debugging/info purposes)
   * @returns Array of cards that are matched by .lumioignore patterns
   */
  getIgnoredCards(): Card[] {
    if (!this.ignoreFilter) {
      return [];
    }
    return this.allCards.filter(card => this.isCardIgnored(card));
  }

  /**
   * Get count of ignored cards
   * @returns Number of cards that are matched by .lumioignore patterns
   */
  getIgnoredCardCount(): number {
    return this.getIgnoredCards().length;
  }

  /**
   * Get total card count (including ignored)
   * @returns Total number of cards in the repository
   */
  getTotalCardCount(): number {
    return this.allCards.length;
  }

  /**
   * Get the repository associated with this deck
   * @returns Repository object
   */
  getRepository(): Repository {
    return this.repository;
  }

  /**
   * Check if the deck has .lumioignore configured
   * @returns true if .lumioignore content exists
   */
  hasIgnoreRules(): boolean {
    return this.ignoreFilter !== null;
  }

  /**
   * Get the raw .lumioignore content
   * @returns .lumioignore content or undefined if not set
   */
  getIgnoreContent(): string | undefined {
    return this.repository.lumioignoreContent;
  }
}
