import React, { useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import Swipeable from 'react-native-gesture-handler/Swipeable';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';

interface SharedDeckListItemProps {
  deck: {
    repository_id: string;
    subfolder_path: string;
    display_name: string;
  };
  onPress: () => void;
  onUnsubscribe: (repositoryId: string, subfolderPath: string, displayName: string) => void;
}

/**
 * Swipeable shared deck list row.
 * Shows compass icon, display name, "Shared deck" subtitle, and chevron.
 * Swiping left reveals an unsubscribe action button matching the RepoListItem delete pattern.
 */
export function SharedDeckListItem({ deck, onPress, onUnsubscribe }: SharedDeckListItemProps) {
  const { colors } = useTheme();
  const { t } = useI18n();
  const swipeableRef = useRef<Swipeable>(null);

  const renderRightActions = (
    _progress: Animated.AnimatedInterpolation<number>,
    _drag: Animated.AnimatedInterpolation<number>,
  ) => {
    return (
      <TouchableOpacity
        style={[styles.unsubscribeAction, { backgroundColor: colors.danger }]}
        onPress={() => {
          swipeableRef.current?.close();
          onUnsubscribe(deck.repository_id, deck.subfolder_path, deck.display_name);
        }}
        activeOpacity={0.7}
      >
        <Ionicons name="trash-outline" size={24} color="#ffffff" />
        <Text style={styles.unsubscribeText}>{t('repos.unsubscribe')}</Text>
      </TouchableOpacity>
    );
  };

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={renderRightActions}
      rightThreshold={40}
      overshootRight={false}
    >
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
        accessibilityRole="button"
        accessibilityLabel={deck.display_name}
      >
        <View style={styles.row}>
          <Ionicons
            name="compass-outline"
            size={24}
            color={colors.primary}
            style={styles.icon}
          />
          <View style={styles.content}>
            <Text
              style={[styles.name, { color: colors.text }]}
              numberOfLines={1}
            >
              {deck.display_name}
            </Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              {t('discovery.sharedDeck')}
            </Text>
          </View>
          <Ionicons
            name="chevron-forward"
            size={20}
            color={colors.textSecondary}
          />
        </View>
      </TouchableOpacity>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    marginRight: 8,
  },
  content: {
    flex: 1,
  },
  name: {
    fontSize: 16,
    fontWeight: '600',
  },
  subtitle: {
    fontSize: 12,
    marginTop: 4,
  },
  unsubscribeAction: {
    width: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  unsubscribeText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 4,
  },
});
