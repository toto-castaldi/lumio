import {
  createContext,
  useContext,
  useState,
  useEffect,
  useMemo,
  useCallback,
  type ReactNode,
} from 'react';
import toast from 'react-hot-toast';
import * as api from '../lib/api';
import type { FileEntry } from '../lib/api';
import { useDeck } from './DeckContext';
import { useI18n } from './I18nContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CardState {
  name: string;       // filename e.g. "my-card.md"
  path: string;       // full path e.g. "{deckPath}/my-card.md"
  sha: string;        // GitHub blob SHA for update/delete
  title: string;      // derived from filename (de-slugify: strip .md, replace hyphens with spaces, title case)
  tags: string[];     // empty initially (populated when card is loaded)
  difficulty?: number; // undefined initially (populated when card is loaded)
}

interface CardContextType {
  cards: CardState[];
  selectedCard: CardState | null;
  loading: boolean;
  saving: boolean;
  selectCard: (card: CardState | null) => void;
  createCard: (title: string, content: string) => Promise<void>;
  saveCard: (path: string, content: string, sha?: string) => Promise<{ sha: string }>;
  deleteCard: (path: string, sha: string) => Promise<void>;
  refreshCards: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** De-slugify a filename to a human-readable title.
 *  Strip .md extension, replace hyphens with spaces, title case each word. */
function titleFromFilename(filename: string): string {
  return filename
    .replace(/\.md$/, '')
    .replace(/-/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Map a FileEntry to CardState */
function fileToCard(file: FileEntry): CardState {
  return {
    name: file.name,
    path: file.path,
    sha: file.sha,
    title: titleFromFilename(file.name),
    tags: [],
    difficulty: undefined,
  };
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const CardContext = createContext<CardContextType | null>(null);

export function CardProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();
  const { selectedDeck, refreshDecks } = useDeck();

  const [cards, setCards] = useState<CardState[]>([]);
  const [selectedCard, setSelectedCard] = useState<CardState | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refresh card list for the selected deck
  const refreshCards = useCallback(async () => {
    if (!selectedDeck) {
      setCards([]);
      return;
    }
    setLoading(true);
    try {
      const files = await api.listFiles(selectedDeck.path);
      const cardFiles = files
        .filter((f: FileEntry) => f.name !== '.gitkeep' && f.name.endsWith('.md'));
      setCards(cardFiles.map(fileToCard));
    } catch {
      // Non-critical -- leave cards as-is
    } finally {
      setLoading(false);
    }
  }, [selectedDeck]);

  // When selectedDeck changes, refresh cards and clear selection
  useEffect(() => {
    setSelectedCard(null);
    if (selectedDeck) {
      refreshCards();
    } else {
      setCards([]);
    }
  }, [selectedDeck, refreshCards]);

  // Select card
  const selectCard = useCallback((card: CardState | null) => {
    setSelectedCard(card);
  }, []);

  // Create card
  const createCard = useCallback(async (title: string, content: string) => {
    if (!selectedDeck) return;
    setSaving(true);
    try {
      // Slugify the title for the filename
      const slug = title
        .trim()
        .toLowerCase()
        .replace(/\s+/g, '-')
        .replace(/[^a-z0-9-]/g, '')
        .replace(/-+/g, '-')
        .replace(/^-+|-+$/g, '');
      const filename = `${slug}.md`;
      const filePath = `${selectedDeck.path}/${filename}`;

      await api.commitFile(filePath, content);
      await refreshCards();
      await refreshDecks(); // update card count

      // Auto-select the newly created card
      setSelectedCard((prev) => {
        // Find the new card in the refreshed list by filename
        // We need to get it from state, but since setCards already ran in refreshCards,
        // we can't access the new state here. Use a fallback.
        return prev; // will be updated by the effect below
      });
      // Use a micro-task to pick up the updated cards list
      setTimeout(() => {
        setCards((currentCards) => {
          const newCard = currentCards.find((c) => c.name === filename);
          if (newCard) setSelectedCard(newCard);
          return currentCards;
        });
      }, 0);

      toast.success(t('card.createSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [selectedDeck, refreshCards, refreshDecks, t]);

  // Save card
  const saveCard = useCallback(async (path: string, content: string, sha?: string): Promise<{ sha: string }> => {
    setSaving(true);
    try {
      const result = await api.commitFile(path, content, sha);
      toast.success(t('card.saveSuccess'));
      await refreshCards();
      return { sha: result.sha };
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [refreshCards, t]);

  // Delete card
  const deleteCard = useCallback(async (path: string, sha: string) => {
    setSaving(true);
    try {
      await api.deleteFile(path, sha);
      await refreshCards();
      await refreshDecks(); // update card count
      setSelectedCard(null);
      toast.success(t('card.deleteSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
      throw err;
    } finally {
      setSaving(false);
    }
  }, [refreshCards, refreshDecks, t]);

  const value = useMemo<CardContextType>(() => ({
    cards,
    selectedCard,
    loading,
    saving,
    selectCard,
    createCard,
    saveCard,
    deleteCard,
    refreshCards,
  }), [
    cards,
    selectedCard,
    loading,
    saving,
    selectCard,
    createCard,
    saveCard,
    deleteCard,
    refreshCards,
  ]);

  return (
    <CardContext.Provider value={value}>
      {children}
    </CardContext.Provider>
  );
}

export function useCard(): CardContextType {
  const context = useContext(CardContext);
  if (!context) {
    throw new Error('useCard must be used within a CardProvider');
  }
  return context;
}
