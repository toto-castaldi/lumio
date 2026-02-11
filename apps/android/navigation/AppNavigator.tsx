import React from 'react';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import type { Card, Repository } from '@lumio/core';
import { useAuth } from '../contexts/AuthContext';
import { useTheme } from '../hooks/useTheme';
import { AuthNavigator } from './AuthNavigator';
import { MainNavigator } from './MainNavigator';
import { StudyScreen } from '../screens/StudyScreen';
import { StudySummaryScreen } from '../screens/StudySummaryScreen';
import { CardListScreen } from '../screens/CardListScreen';
import { CardDetailScreen } from '../screens/CardDetailScreen';
import { StudyHistoryScreen } from '../screens/StudyHistoryScreen';

/**
 * Root stack param list for modal screens (Study, StudySummary)
 * and card browsing screens (CardList, CardDetail)
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
  CardList: { repoId: string; repoName: string };
  CardDetail: { card: Card; repository: Repository };
  StudyHistory: undefined;
};

const Stack = createNativeStackNavigator<RootStackParamList>();

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
  const { colors } = useTheme();

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
        component={StudySummaryScreen}
        options={{ presentation: 'card', gestureEnabled: false }}
      />
      <Stack.Screen
        name="CardList"
        component={CardListScreen}
        options={({ route }) => ({
          headerShown: true,
          headerTitle: route.params.repoName,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#ffffff',
        })}
      />
      <Stack.Screen
        name="CardDetail"
        component={CardDetailScreen}
        options={({ route }) => ({
          headerShown: true,
          headerTitle: route.params.card.title,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#ffffff',
        })}
      />
      <Stack.Screen
        name="StudyHistory"
        component={StudyHistoryScreen}
        options={{
          headerShown: true,
          headerStyle: { backgroundColor: colors.primary },
          headerTintColor: '#ffffff',
        }}
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
