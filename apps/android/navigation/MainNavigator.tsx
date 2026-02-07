import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ReposScreen } from '../screens/ReposScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

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
  const { colors } = useTheme();

  return (
    <Tab.Navigator
        screenOptions={{
          tabBarShowLabel: false,
          tabBarActiveTintColor: colors.primary,
          tabBarInactiveTintColor: colors.textSecondary,
          tabBarStyle: {
            backgroundColor: colors.surface,
            borderTopColor: colors.border,
          },
          headerStyle: { backgroundColor: colors.primary },
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
  );
}
