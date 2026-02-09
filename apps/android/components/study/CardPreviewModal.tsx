/**
 * Standalone modal for previewing full card content.
 *
 * Displays the card's markdown content rendered natively via
 * react-native-marked (CardContentView). Image URLs are resolved
 * through CardView from @lumio/core for Supabase Storage.
 *
 * Dismiss methods:
 * - Swipe down on the drag handle (PanResponder)
 * - Tap the dimmed backdrop
 * - Android back button (onRequestClose)
 *
 * No close button (X) per locked design decision.
 */

import React, { useRef } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Dimensions,
  Pressable,
  PanResponder,
  Animated,
} from 'react-native';
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

const DISMISS_THRESHOLD = 100;

/**
 * Bottom-sheet modal that renders a card's markdown content with
 * support for LaTeX, code blocks, and Supabase-hosted images.
 *
 * Swipe down on the drag handle or tap backdrop to dismiss.
 */
export function CardPreviewModal({
  visible,
  onClose,
  card,
  repositoryMap,
}: CardPreviewModalProps) {
  const { colors, isDark } = useTheme();

  // Animated value for swipe-down dismiss gesture
  const translateY = useRef(new Animated.Value(0)).current;

  // PanResponder for the drag handle area only
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_evt, gestureState) => {
        // Only capture vertical downward gestures
        return gestureState.dy > 5;
      },
      onPanResponderMove: (_evt, gestureState) => {
        // Only allow downward movement (positive dy)
        if (gestureState.dy > 0) {
          translateY.setValue(gestureState.dy);
        }
      },
      onPanResponderRelease: (_evt, gestureState) => {
        if (gestureState.dy > DISMISS_THRESHOLD) {
          // Swipe exceeded threshold -- dismiss
          Animated.timing(translateY, {
            toValue: SCREEN_HEIGHT,
            duration: 200,
            useNativeDriver: true,
          }).start(() => {
            onClose();
            translateY.setValue(0);
          });
        } else {
          // Spring back to original position
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 8,
          }).start();
        }
      },
    }),
  ).current;

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
      transparent
      onRequestClose={onClose}
    >
      {/* Dimmed backdrop -- tap to close */}
      <Pressable style={styles.backdrop} onPress={onClose}>
        <View />
      </Pressable>

      {/* Bottom-sheet card with swipe-down dismiss */}
      <Animated.View
        style={[
          styles.sheet,
          { backgroundColor: colors.background },
          { transform: [{ translateY }] },
        ]}
      >
        {/* Drag handle -- PanResponder attached here only */}
        <View {...panResponder.panHandlers}>
          <View style={styles.handleRow}>
            <View
              style={[styles.handle, { backgroundColor: colors.border }]}
            />
          </View>
        </View>

        {/* Header (title only, no close button) */}
        <View
          style={[styles.header, { borderBottomColor: colors.border }]}
        >
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
          >
            {card?.title || 'Card Content'}
          </Text>
        </View>

        {/* Content -- FlatList inside Markdown handles scrolling */}
        <View style={styles.contentContainer}>
          {card ? (
            <CardContentView
              content={content}
              isDark={isDark}
              scrollEnabled={true}
            />
          ) : (
            <View style={styles.emptyState}>
              <Text
                style={[
                  styles.emptyText,
                  { color: colors.textSecondary },
                ]}
              >
                No card content to display
              </Text>
            </View>
          )}
        </View>
      </Animated.View>
    </Modal>
  );
}

const SCREEN_HEIGHT = Dimensions.get('window').height;

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  sheet: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.8,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
  },
  handleRow: {
    alignItems: 'center',
    paddingTop: 10,
    paddingBottom: 4,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
  },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentContainer: {
    flex: 1,
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
