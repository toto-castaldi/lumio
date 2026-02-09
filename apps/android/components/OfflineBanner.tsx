import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';

/**
 * OfflineBanner displays a warning banner when the device loses network connection.
 * Renders inline - parent component decides placement.
 * Uses theme-aware danger color for background, white text for contrast.
 */
export function OfflineBanner() {
  const { colors } = useTheme();
  const { t } = useI18n();
  const [isOffline, setIsOffline] = useState(false);

  useEffect(() => {
    // Subscribe to network state changes
    const unsubscribe = NetInfo.addEventListener((state) => {
      // isConnected can be null during initial fetch, treat as connected
      setIsOffline(state.isConnected === false);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  // Don't render anything when online
  if (!isOffline) {
    return null;
  }

  return (
    <View style={[styles.banner, { backgroundColor: colors.danger }]}>
      <Text style={styles.text}>{t('components.noInternet')}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    padding: 8,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
});
