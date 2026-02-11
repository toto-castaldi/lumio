import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { Card } from '@lumio/core';
import { useTheme } from '../hooks/useTheme';

interface CardListItemProps {
  card: Card;
  onPress: () => void;
}

/**
 * Individual card row in the card list.
 * Shows card title, tags as colored chips, and a chevron indicator.
 */
export function CardListItem({ card, onPress }: CardListItemProps) {
  const { colors } = useTheme();

  return (
    <TouchableOpacity
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderBottomColor: colors.border,
        },
      ]}
      onPress={onPress}
      activeOpacity={0.7}
    >
      <View style={styles.contentRow}>
        <View style={styles.textContainer}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {card.title}
          </Text>
          {card.tags.length > 0 && (
            <View style={styles.tagsRow}>
              {card.tags.map((tag) => (
                <View
                  key={tag}
                  style={[
                    styles.tagChip,
                    { backgroundColor: colors.primaryLight },
                  ]}
                >
                  <Text style={[styles.tagText, { color: colors.primary }]}>
                    {tag}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>
        <Ionicons
          name="chevron-forward"
          size={20}
          color={colors.textSecondary}
        />
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderBottomWidth: 1,
  },
  contentRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  textContainer: {
    flex: 1,
  },
  title: {
    fontSize: 16,
    fontWeight: '600',
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 6,
  },
  tagChip: {
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
  },
  tagText: {
    fontSize: 12,
  },
});
