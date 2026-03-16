import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { getLanguageFlag, type DeckSearchResult } from '@lumio/core';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';

interface DeckCardProps {
  deck: DeckSearchResult;
  isSubscribed: boolean;
  onSubscribe: (deck: DeckSearchResult) => void;
  onUnsubscribe: (deck: DeckSearchResult) => void;
}

/**
 * Individual deck result card for the Discovery screen.
 * Shows flag, name, description, tags, card count, author, and subscribe button.
 */
export function DeckCard({
  deck,
  isSubscribed,
  onSubscribe,
  onUnsubscribe,
}: DeckCardProps) {
  const { colors } = useTheme();
  const { t } = useI18n();

  const visibleTags = deck.tags.slice(0, 3);
  const extraTagCount = deck.tags.length - 3;

  return (
    <View style={[styles.container, { backgroundColor: colors.surface }]}>
      {/* Row 1: Flag + Name + Card count */}
      <View style={styles.headerRow}>
        <Text style={styles.flag}>{getLanguageFlag(deck.language)}</Text>
        <Text
          style={[styles.displayName, { color: colors.text }]}
          numberOfLines={1}
        >
          {deck.display_name}
        </Text>
        <View style={[styles.countBadge, { backgroundColor: colors.primaryLight }]}>
          <Text style={[styles.countText, { color: colors.primary }]}>
            {t('discovery.cardCount', { count: deck.card_count })}
          </Text>
        </View>
      </View>

      {/* Row 2: Description */}
      <Text
        style={[styles.description, { color: colors.textSecondary }]}
        numberOfLines={2}
      >
        {deck.description}
      </Text>

      {/* Row 3: Tags */}
      {deck.tags.length > 0 && (
        <View style={styles.tagsRow}>
          {visibleTags.map((tag) => (
            <View
              key={tag}
              style={[styles.tagChip, { borderColor: colors.border }]}
            >
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                {tag}
              </Text>
            </View>
          ))}
          {extraTagCount > 0 && (
            <View style={[styles.tagChip, { borderColor: colors.border }]}>
              <Text style={[styles.tagText, { color: colors.textSecondary }]}>
                +{extraTagCount}
              </Text>
            </View>
          )}
        </View>
      )}

      {/* Row 4: Author + Subscribe button */}
      <View style={styles.footerRow}>
        <Text style={[styles.author, { color: colors.textSecondary }]}>
          {deck.author}
        </Text>
        <TouchableOpacity
          onPress={() =>
            isSubscribed ? onUnsubscribe(deck) : onSubscribe(deck)
          }
          activeOpacity={0.6}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons
            name={isSubscribed ? 'checkmark-circle' : 'add-circle-outline'}
            size={28}
            color={isSubscribed ? '#10b981' : colors.primary}
          />
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 12,
    padding: 16,
    elevation: 1,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.08,
    shadowRadius: 2,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  flag: {
    fontSize: 18,
    marginRight: 8,
  },
  displayName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
  },
  countBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  countText: {
    fontSize: 12,
    fontWeight: '500',
  },
  description: {
    fontSize: 14,
    lineHeight: 20,
    marginTop: 8,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
    gap: 6,
  },
  tagChip: {
    borderWidth: 1,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 12,
  },
  tagText: {
    fontSize: 11,
  },
  footerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  author: {
    fontSize: 12,
  },
});
