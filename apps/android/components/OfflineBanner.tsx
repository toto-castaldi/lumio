import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import NetInfo from '@react-native-community/netinfo';

/**
 * OfflineBanner displays a warning banner when the device loses network connection.
 * Renders inline - parent component decides placement.
 */
export function OfflineBanner() {
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
    <View style={styles.banner}>
      <Text style={styles.text}>No internet connection</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  banner: {
    backgroundColor: '#f97316',
    padding: 8,
    alignItems: 'center',
  },
  text: {
    color: '#ffffff',
    fontWeight: '500',
    fontSize: 14,
  },
});
