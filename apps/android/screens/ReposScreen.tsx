import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

/**
 * ReposScreen placeholder.
 * Content will be implemented in Phase 3.
 */
export function ReposScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Repositories</Text>
      <Text style={styles.subtitle}>Coming in Phase 3</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333333',
  },
  subtitle: {
    fontSize: 16,
    color: '#6B7280',
    marginTop: 8,
  },
});
