import React from 'react';
import { View, Text, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useAuth } from '../contexts/AuthContext';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { StudyScreen } from '../screens/StudyScreen';

/**
 * Root stack param list for modal screens (Study, StudySummary)
 * that appear over the main tab navigator.
 */
export type RootStackParamList = {
  Main: undefined;
  Study: undefined;
  StudySummary: {
    totalCards: number;
    correctCount: number;
    incorrectCount: number;
    skippedCount: number;
    timeSpentSeconds: number;
  };
};

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * Placeholder for StudySummaryScreen until plan 04 creates it.
 */
function StudySummaryPlaceholder() {
  return (
    <View style={placeholderStyles.container}>
      <Text style={placeholderStyles.text}>Study Summary</Text>
    </View>
  );
}

const placeholderStyles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  text: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
  },
});

/**
 * AppNavigator is the root navigator that switches between auth and main flows
 * based on the current authentication state.
 *
 * When authenticated, renders a root native-stack navigator wrapping:
 * - Main: The tab navigator (MainNavigator)
 * - Study: Full-screen modal study session
 * - StudySummary: End-of-session results (card presentation)
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

  // Show main app when authenticated, wrapped in root stack for modal screens
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="Main" component={MainNavigator} />
      <Stack.Screen
        name="Study"
        component={StudyScreen}
        options={{ presentation: 'card' }}
      />
      <Stack.Screen
        name="StudySummary"
        component={StudySummaryPlaceholder}
        options={{ presentation: 'card' }}
      />
    </Stack.Navigator>
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
});
