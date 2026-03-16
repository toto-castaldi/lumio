import React, { useState, useCallback, useRef, useEffect } from 'react';
import {
  View,
  FlatList,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import Toast from 'react-native-toast-message';
import { Ionicons } from '@expo/vector-icons';
import {
  searchDecks,
  subscribeToDeck,
  unsubscribeFromDeck,
  getUserDeckSubscriptions,
  type DeckSearchResult,
  type DeckSubscription,
} from '@lumio/core';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { DeckCard } from '../components/DeckCard';
import { TagChipBar } from '../components/TagChipBar';
import { EmptyState } from '../components/EmptyState';

/** Build a unique key for a deck from its repository_id and subfolder_path */
function deckKey(deck: { repository_id: string; subfolder_path: string }): string {
  return `${deck.repository_id}:${deck.subfolder_path}`;
}

/**
 * Discovery screen: search, browse, and subscribe to shared decks.
 *
 * - Sticky search bar with 300ms debounce
 * - Tag chip bar for filtering
 * - FlatList of DeckCard components
 * - Optimistic subscribe/unsubscribe with toast
 * - Empty states for no decks and no results
 */
export function DiscoveryScreen() {
  const { colors } = useTheme();
  const { t } = useI18n();

  const [decks, setDecks] = useState<DeckSearchResult[]>([]);
  const [subscribedKeys, setSubscribedKeys] = useState<Set<string>>(new Set());
  const [searchText, setSearchText] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [availableTags, setAvailableTags] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const tagsLoadedRef = useRef(false);

  // Fetch decks from the search API
  const fetchDecks = useCallback(
    async (query: string, tag: string | null) => {
      setIsSearching(true);
      try {
        const results = await searchDecks(
          query || undefined,
          tag || undefined,
        );
        setDecks(results);
      } catch (error) {
        console.error('[DiscoveryScreen] fetchDecks error:', error);
        Toast.show({
          type: 'error',
          text1: t('repos.failedToLoad'),
          text2: error instanceof Error ? error.message : t('common.unknownError'),
        });
      } finally {
        setIsSearching(false);
      }
    },
    [t],
  );

  // Refresh subscription state + initial deck load on screen focus
  useFocusEffect(
    useCallback(() => {
      let cancelled = false;

      const refresh = async () => {
        try {
          // Always refresh subscription state
          const subs = await getUserDeckSubscriptions();
          if (!cancelled) {
            const keys = new Set<string>();
            for (const sub of subs) {
              keys.add(deckKey(sub));
            }
            setSubscribedKeys(keys);
          }

          // On first mount, load all decks and compute tags
          if (!tagsLoadedRef.current) {
            const results = await searchDecks();
            if (!cancelled) {
              setDecks(results);

              // Compute top 10 tags from all results
              const tagCounts = new Map<string, number>();
              for (const deck of results) {
                for (const tag of deck.tags) {
                  tagCounts.set(tag, (tagCounts.get(tag) || 0) + 1);
                }
              }
              const sorted = [...tagCounts.entries()]
                .sort((a, b) => b[1] - a[1])
                .slice(0, 10)
                .map(([tag]) => tag);
              setAvailableTags(sorted);
              tagsLoadedRef.current = true;
            }
          }
        } catch (error) {
          console.error('[DiscoveryScreen] refresh error:', error);
        }
      };

      refresh().finally(() => {
        if (!cancelled) setIsLoading(false);
      });

      return () => {
        cancelled = true;
      };
    }, []),
  );

  // Cleanup debounce timeout on unmount
  useEffect(() => {
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, []);

  // Search input change with 300ms debounce
  const handleSearchChange = useCallback(
    (text: string) => {
      setSearchText(text);
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      setIsSearching(true);
      debounceRef.current = setTimeout(() => {
        fetchDecks(text, selectedTag);
      }, 300);
    },
    [fetchDecks, selectedTag],
  );

  // Tag selection triggers immediate search (no debounce)
  const handleTagSelect = useCallback(
    (tag: string | null) => {
      setSelectedTag(tag);
      fetchDecks(searchText, tag);
    },
    [fetchDecks, searchText],
  );

  // Subscribe with optimistic UI
  const handleSubscribe = useCallback(
    (deck: DeckSearchResult) => {
      const key = deckKey(deck);

      // Optimistically add
      setSubscribedKeys((prev) => {
        const next = new Set(prev);
        next.add(key);
        return next;
      });

      Toast.show({
        type: 'success',
        text1: t('discovery.subscribed', { name: deck.display_name }),
      });

      subscribeToDeck(deck.repository_id, deck.subfolder_path).catch(() => {
        // Revert on failure
        setSubscribedKeys((prev) => {
          const next = new Set(prev);
          next.delete(key);
          return next;
        });
        Toast.show({
          type: 'error',
          text1: t('discovery.subscribeFailed'),
        });
      });
    },
    [t],
  );

  // Unsubscribe with confirmation dialog
  const handleUnsubscribe = useCallback(
    (deck: DeckSearchResult) => {
      Alert.alert(
        t('discovery.unsubscribeTitle', { name: deck.display_name }),
        t('discovery.unsubscribeBody'),
        [
          { text: t('common.cancel'), style: 'cancel' },
          {
            text: t('discovery.unsubscribe'),
            style: 'destructive',
            onPress: () => {
              const key = deckKey(deck);

              // Optimistically remove
              setSubscribedKeys((prev) => {
                const next = new Set(prev);
                next.delete(key);
                return next;
              });

              Toast.show({
                type: 'success',
                text1: t('discovery.unsubscribed', { name: deck.display_name }),
              });

              unsubscribeFromDeck(
                deck.repository_id,
                deck.subfolder_path,
              ).catch(() => {
                // Revert on failure
                setSubscribedKeys((prev) => {
                  const next = new Set(prev);
                  next.add(key);
                  return next;
                });
                Toast.show({
                  type: 'error',
                  text1: t('discovery.unsubscribeFailed'),
                });
              });
            },
          },
        ],
      );
    },
    [t],
  );

  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchText('');
    setSelectedTag(null);
    fetchDecks('', null);
  }, [fetchDecks]);

  // Empty state renderer
  const renderEmptyState = useCallback(() => {
    if (!searchText && selectedTag === null && decks.length === 0 && !isSearching) {
      return (
        <EmptyState
          icon="library-outline"
          title={t('discovery.noDecksTitle')}
          subtitle={t('discovery.noDecksSubtitle')}
        />
      );
    }
    if ((searchText || selectedTag) && decks.length === 0) {
      return (
        <EmptyState
          icon="search-outline"
          title={t('discovery.noResultsTitle')}
          subtitle={t('discovery.noResultsSubtitle')}
          actionLabel={t('discovery.clearFilters')}
          onAction={clearFilters}
        />
      );
    }
    return null;
  }, [searchText, selectedTag, decks.length, isSearching, t, clearFilters]);

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      {/* Sticky header */}
      <View style={{ backgroundColor: colors.background, paddingTop: 8 }}>
        {/* Search bar */}
        <View style={styles.searchBarWrapper}>
          <View
            style={[
              styles.searchBarContainer,
              { backgroundColor: colors.surface, borderColor: colors.border },
            ]}
          >
            <Ionicons
              name="search"
              size={18}
              color={colors.textSecondary}
              style={styles.searchIcon}
            />
            <TextInput
              value={searchText}
              onChangeText={handleSearchChange}
              placeholder={t('discovery.searchPlaceholder')}
              placeholderTextColor={colors.textSecondary}
              style={[styles.searchInput, { color: colors.text }]}
              returnKeyType="search"
              autoCorrect={false}
            />
            {isSearching && <ActivityIndicator size="small" />}
          </View>
        </View>

        {/* Tag chip bar */}
        <TagChipBar
          tags={availableTags}
          selectedTag={selectedTag}
          onSelectTag={handleTagSelect}
        />
      </View>

      {/* Results */}
      {isLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <FlatList
          data={decks}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <DeckCard
              deck={item}
              isSubscribed={subscribedKeys.has(deckKey(item))}
              onSubscribe={handleSubscribe}
              onUnsubscribe={handleUnsubscribe}
            />
          )}
          contentContainerStyle={
            decks.length === 0
              ? styles.emptyContainer
              : styles.listContent
          }
          ItemSeparatorComponent={() => <View style={styles.separator} />}
          ListEmptyComponent={renderEmptyState()}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
  },
  searchBarWrapper: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  searchBarContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 10,
    borderWidth: 1,
    paddingHorizontal: 12,
    height: 42,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    paddingVertical: 0,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 16,
  },
  emptyContainer: {
    flexGrow: 1,
  },
  separator: {
    height: 10,
  },
});
