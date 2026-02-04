import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StudyFAB } from '../components/StudyFAB';

/**
 * Placeholder screens - will be replaced by actual screens in Phase 3.
 */
function DashboardScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Dashboard</Text>
      <Text style={styles.subtitle}>Welcome to Lumio</Text>
    </View>
  );
}

function ReposScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Repositories</Text>
      <Text style={styles.subtitle}>Manage your repositories</Text>
    </View>
  );
}

function SettingsScreen() {
  return (
    <View style={styles.screen}>
      <Text style={styles.title}>Settings</Text>
      <Text style={styles.subtitle}>App settings</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  screen: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginTop: 8,
  },
});

export type MainTabParamList = {
  Dashboard: undefined;
  Repos: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = 'home' | 'home-outline' | 'folder' | 'folder-outline' | 'settings' | 'settings-outline';

/**
 * MainNavigator provides the main app experience with bottom tabs.
 * - Icons only (no labels) per design spec
 * - StudyFAB overlay positioned above tab bar
 */
export function MainNavigator() {
  return (
    <View style={styles.container}>
      <Tab.Navigator
        screenOptions={{
          tabBarShowLabel: false,
          tabBarActiveTintColor: '#3B82F6',
          tabBarInactiveTintColor: '#6B7280',
          headerStyle: { backgroundColor: '#3B82F6' },
          headerTintColor: '#ffffff',
          headerShown: true,
        }}
      >
        <Tab.Screen
          name="Dashboard"
          component={DashboardScreen}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={(focused ? 'home' : 'home-outline') as TabIconName}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Repos"
          component={ReposScreen}
          options={{
            title: 'Repositories',
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={(focused ? 'folder' : 'folder-outline') as TabIconName}
                size={size}
                color={color}
              />
            ),
          }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={(focused ? 'settings' : 'settings-outline') as TabIconName}
                size={size}
                color={color}
              />
            ),
          }}
        />
      </Tab.Navigator>
      <StudyFAB />
    </View>
  );
}
