/**
 * Standalone modal for previewing full card content.
 *
 * Displays the card's markdown content rendered via CardContentView
 * (WebView with marked.js, KaTeX, highlight.js). Image URLs are
 * resolved through CardView from @lumio/core for Supabase Storage.
 *
 * This component is self-contained and ready to be imported by
 * StudyScreen once plan 04-02 completes its modifications.
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  StyleSheet,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import {
  CardView,
  getSupabaseUrl,
  type StudyCard,
  type Repository,
} from '@lumio/core';
import { useTheme } from '../../hooks/useTheme';
import { CardContentView } from './CardContentView';

interface CardPreviewModalProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Callback to close the modal */
  onClose: () => void;
  /** The card to preview (null when no card selected) */
  card: StudyCard | null;
  /** Map of repository ID to Repository for image URL resolution */
  repositoryMap: Map<string, Repository>;
}

/**
 * Full-screen modal that renders a card's markdown content with
 * support for LaTeX, code blocks, and Supabase-hosted images.
 */
export function CardPreviewModal({
  visible,
  onClose,
  card,
  repositoryMap,
}: CardPreviewModalProps) {
  const { colors, isDark } = useTheme();

  // Resolve image URLs through CardView
  let content = card?.content || '';
  if (card) {
    const repository = repositoryMap.get(card.repositoryId);
    if (repository) {
      const cardView = new CardView(
        {
          ...card,
          contentHash: card.contentHash || '',
          language: card.language || '',
          createdAt: card.createdAt || '',
          updatedAt: card.updatedAt || '',
        },
        repository,
        getSupabaseUrl(),
      );
      content = cardView.getContent();
    }
  }

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[styles.header, { borderBottomColor: colors.border }]}>
          <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
            {card?.title || 'Card Content'}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            style={[styles.closeButton, { backgroundColor: colors.surface }]}
            hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}
          >
            <Ionicons name="close" size={22} color={colors.text} />
          </TouchableOpacity>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={true}
        >
          {card ? (
            <CardContentView content={content} isDark={isDark} />
          ) : (
            <View style={styles.emptyState}>
              <Text style={[styles.emptyText, { color: colors.textSecondary }]}>
                No card content to display
              </Text>
            </View>
          )}
        </ScrollView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
    marginRight: 12,
  },
  closeButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 16,
    textAlign: 'center',
  },
});
