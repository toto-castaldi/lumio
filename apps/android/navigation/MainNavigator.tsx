import React from 'react';
import { View, StyleSheet } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { StudyFAB } from '../components/StudyFAB';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ReposScreen } from '../screens/ReposScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

const styles = StyleSheet.create({
  container: {
    flex: 1,
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
