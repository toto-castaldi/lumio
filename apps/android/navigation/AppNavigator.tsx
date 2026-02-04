import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';

/**
 * AppNavigator is the root navigator that switches between auth and main flows
 * based on the current authentication state.
 *
 * States:
 * - 'loading': Shows centered ActivityIndicator while checking session
 * - 'logged_out': Shows AuthNavigator (login flow)
 * - 'ready': Shows MainNavigator (main app with tabs)
 */
export function AppNavigator() {
  const { state } = useAuth();

  // Show loading indicator while checking auth state
  if (state === 'loading') {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  // Show auth flow when logged out
  if (state === 'logged_out') {
    return <AuthNavigator />;
  }

  // Show main app when authenticated
  return <MainNavigator />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
