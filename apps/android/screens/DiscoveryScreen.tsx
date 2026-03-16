import React from 'react';
import { View, Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';

/**
 * Discovery screen placeholder — will be completed in Task 2.
 */
export function DiscoveryScreen() {
  const { colors } = useTheme();
  return (
    <View style={{ flex: 1, backgroundColor: colors.background, alignItems: 'center', justifyContent: 'center' }}>
      <Text style={{ color: colors.text }}>Discovery</Text>
    </View>
  );
}
