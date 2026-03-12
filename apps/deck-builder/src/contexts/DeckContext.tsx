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
import type { DeckEntry } from '../lib/api';
import { useI18n } from './I18nContext';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

interface DeckContextType {
  decks: DeckEntry[];
  selectedDeck: DeckEntry | null;
  loading: boolean;
  initialLoading: boolean;
  cardCounts: Record<string, number>;
  deckCreatedAt: Record<string, string>;
  selectDeck: (deck: DeckEntry | null) => void;
  createDeck: (name: string) => Promise<void>;
  renameDeck: (oldName: string, newName: string) => Promise<void>;
  deleteDeck: (name: string) => Promise<void>;
  refreshDecks: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// localStorage helpers
// ---------------------------------------------------------------------------

const TIMESTAMPS_KEY = 'lumio-deck-timestamps';
const CREATED_KEY = 'lumio-deck-created';

function getDeckTimestamps(): Record<string, number> {
  try {
    const raw = localStorage.getItem(TIMESTAMPS_KEY);
    return raw ? (JSON.parse(raw) as Record<string, number>) : {};
  } catch {
    return {};
  }
}

function setDeckTimestamp(name: string, ts: number): void {
  try {
    const all = getDeckTimestamps();
    all[name] = ts;
    localStorage.setItem(TIMESTAMPS_KEY, JSON.stringify(all));
  } catch {
    /* privacy mode – ignore */
  }
}

function removeDeckTimestamp(name: string): void {
  try {
    const all = getDeckTimestamps();
    delete all[name];
    localStorage.setItem(TIMESTAMPS_KEY, JSON.stringify(all));
  } catch {
    /* privacy mode – ignore */
  }
}

function getDeckCreatedDates(): Record<string, string> {
  try {
    const raw = localStorage.getItem(CREATED_KEY);
    return raw ? (JSON.parse(raw) as Record<string, string>) : {};
  } catch {
    return {};
  }
}

function setDeckCreatedDate(name: string, iso: string): void {
  try {
    const all = getDeckCreatedDates();
    all[name] = iso;
    localStorage.setItem(CREATED_KEY, JSON.stringify(all));
  } catch {
    /* privacy mode – ignore */
  }
}

function removeDeckCreatedDate(name: string): void {
  try {
    const all = getDeckCreatedDates();
    delete all[name];
    localStorage.setItem(CREATED_KEY, JSON.stringify(all));
  } catch {
    /* privacy mode – ignore */
  }
}

function moveDeckCreatedDate(oldName: string, newName: string): void {
  try {
    const all = getDeckCreatedDates();
    if (all[oldName]) {
      all[newName] = all[oldName];
      delete all[oldName];
      localStorage.setItem(CREATED_KEY, JSON.stringify(all));
    }
  } catch {
    /* privacy mode – ignore */
  }
}

// ---------------------------------------------------------------------------
// Sort helper
// ---------------------------------------------------------------------------

function sortDecks(decks: DeckEntry[]): DeckEntry[] {
  const timestamps = getDeckTimestamps();
  return [...decks].sort((a, b) => {
    const tsA = timestamps[a.name] ?? 0;
    const tsB = timestamps[b.name] ?? 0;
    if (tsA !== tsB) return tsB - tsA; // descending by timestamp
    // Decks without timestamps: alphabetical by name
    return a.name.localeCompare(b.name);
  });
}

// ---------------------------------------------------------------------------
// Context
// ---------------------------------------------------------------------------

const DeckContext = createContext<DeckContextType | null>(null);

export function DeckProvider({ children }: { children: ReactNode }) {
  const { t } = useI18n();

  const [decks, setDecks] = useState<DeckEntry[]>([]);
  const [selectedDeck, setSelectedDeck] = useState<DeckEntry | null>(null);
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const [cardCounts, setCardCounts] = useState<Record<string, number>>({});
  const [deckCreatedAt, setDeckCreatedAt] = useState<Record<string, string>>(getDeckCreatedDates);

  // Fetch card counts for a list of decks
  const fetchCardCounts = useCallback(async (deckList: DeckEntry[]) => {
    if (deckList.length === 0) {
      setCardCounts({});
      return;
    }
    try {
      const results = await Promise.all(
        deckList.map((d) => api.listFiles(d.path).catch(() => [] as api.FileEntry[])),
      );
      const counts: Record<string, number> = {};
      deckList.forEach((d, i) => {
        counts[d.name] = results[i].filter(
          (f) => f.name !== '.gitkeep' && f.name.endsWith('.md'),
        ).length;
      });
      setCardCounts(counts);
    } catch {
      // Non-critical – leave counts as-is
    }
  }, []);

  // Refresh deck list (sorted) and card counts
  const refreshDecks = useCallback(async () => {
    const fetched = await api.listDecks();
    const sorted = sortDecks(fetched);
    setDecks(sorted);
    await fetchCardCounts(sorted);
  }, [fetchCardCounts]);

  // Initial load
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const fetched = await api.listDecks();
        if (cancelled) return;
        const sorted = sortDecks(fetched);
        setDecks(sorted);
        await fetchCardCounts(sorted);
      } catch {
        // Will show empty list on error
      } finally {
        if (!cancelled) setInitialLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [fetchCardCounts]);

  // Select deck + update timestamp
  const selectDeck = useCallback((deck: DeckEntry | null) => {
    setSelectedDeck(deck);
    if (deck) {
      setDeckTimestamp(deck.name, Date.now());
      // Re-sort after timestamp update
      setDecks((prev) => sortDecks(prev));
    }
  }, []);

  // Create deck
  const handleCreateDeck = useCallback(async (name: string) => {
    setLoading(true);
    try {
      const newDeck = await api.createDeck(name);
      const now = Date.now();
      setDeckTimestamp(name, now);
      setDeckCreatedDate(name, new Date().toISOString());
      setDeckCreatedAt(getDeckCreatedDates());
      await refreshDecks();
      // Auto-select the new deck
      setSelectedDeck(newDeck);
      toast.success(t('deck.createSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshDecks, t]);

  // Rename deck
  const handleRenameDeck = useCallback(async (oldName: string, newName: string) => {
    setLoading(true);
    try {
      const renamed = await api.renameDeck(oldName, newName);
      // Move timestamps
      const timestamps = getDeckTimestamps();
      const oldTs = timestamps[oldName];
      removeDeckTimestamp(oldName);
      setDeckTimestamp(newName, oldTs ?? Date.now());
      // Move creation date
      moveDeckCreatedDate(oldName, newName);
      setDeckCreatedAt(getDeckCreatedDates());
      await refreshDecks();
      // Update selected deck if it was the renamed one
      setSelectedDeck((prev) => (prev?.name === oldName ? renamed : prev));
      toast.success(t('deck.renameSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshDecks, t]);

  // Delete deck
  const handleDeleteDeck = useCallback(async (name: string) => {
    setLoading(true);
    try {
      await api.deleteDeck(name);
      removeDeckTimestamp(name);
      removeDeckCreatedDate(name);
      setDeckCreatedAt(getDeckCreatedDates());
      await refreshDecks();
      // Clear selection if deleted deck was selected
      setSelectedDeck((prev) => (prev?.name === name ? null : prev));
      toast.success(t('deck.deleteSuccess'));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : t('common.error'));
      throw err;
    } finally {
      setLoading(false);
    }
  }, [refreshDecks, t]);

  const value = useMemo<DeckContextType>(() => ({
    decks,
    selectedDeck,
    loading,
    initialLoading,
    cardCounts,
    deckCreatedAt,
    selectDeck,
    createDeck: handleCreateDeck,
    renameDeck: handleRenameDeck,
    deleteDeck: handleDeleteDeck,
    refreshDecks,
  }), [
    decks,
    selectedDeck,
    loading,
    initialLoading,
    cardCounts,
    deckCreatedAt,
    selectDeck,
    handleCreateDeck,
    handleRenameDeck,
    handleDeleteDeck,
    refreshDecks,
  ]);

  return (
    <DeckContext.Provider value={value}>
      {children}
    </DeckContext.Provider>
  );
}

export function useDeck(): DeckContextType {
  const context = useContext(DeckContext);
  if (!context) {
    throw new Error('useDeck must be used within a DeckProvider');
  }
  return context;
}
