import React, { useMemo } from 'react';
import { View, StyleSheet } from 'react-native';
import { useRoute, type RouteProp } from '@react-navigation/native';
import { CardView, getSupabaseUrl } from '@lumio/core';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import type { RootStackParamList } from '../navigation/AppNavigator';
import { useTheme } from '../hooks/useTheme';
import { CardContentView } from '../components/study/CardContentView';

type CardDetailRouteProp = RouteProp<RootStackParamList, 'CardDetail'>;

/**
 * Full read-only card content view.
 * Renders the card's markdown content using CardContentView with
 * image URLs resolved through CardView for Supabase Storage.
 */
export function CardDetailScreen() {
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<CardDetailRouteProp>();
  const { card, repository } = route.params;

  // Resolve image URLs through CardView
  const resolvedContent = useMemo(() => {
    const cardView = new CardView(card, repository, getSupabaseUrl());
    return cardView.getContent();
  }, [card, repository]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <CardContentView
        content={resolvedContent}
        isDark={isDark}
        scrollEnabled={true}
        contentPaddingBottom={insets.bottom}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
