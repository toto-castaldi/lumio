import React from 'react';
import { Image, View, Text } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../hooks/useTheme';
import { useI18n } from '../hooks/useI18n';
import { DashboardScreen } from '../screens/DashboardScreen';
import { ReposScreen } from '../screens/ReposScreen';
import { DiscoveryScreen } from '../screens/DiscoveryScreen';
import { SettingsScreen } from '../screens/SettingsScreen';

export type MainTabParamList = {
  Dashboard: undefined;
  Repos: undefined;
  Discovery: undefined;
  Settings: undefined;
};

const Tab = createBottomTabNavigator<MainTabParamList>();

type TabIconName = 'home' | 'home-outline' | 'folder' | 'folder-outline'
  | 'compass' | 'compass-outline' | 'settings' | 'settings-outline';

/**
 * MainNavigator provides the main app experience with bottom tabs.
 * - Icons only (no labels) per design spec
 * - StudyFAB overlay positioned above tab bar
 */
export function MainNavigator() {
  const { colors } = useTheme();
  const { t } = useI18n();

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
            headerTitle: () => (
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Image
                  source={require('../assets/logo-header.png')}
                  style={{ width: 28, height: 28, marginRight: 8 }}
                  resizeMode="contain"
                />
                <Text style={{ color: '#ffffff', fontSize: 18, fontWeight: 'bold' }}>
                  Lumio
                </Text>
              </View>
            ),
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
            title: t('navigation.repositories'),
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
          name="Discovery"
          component={DiscoveryScreen}
          options={{
            title: t('navigation.discovery'),
            tabBarIcon: ({ focused, color, size }) => (
              <Ionicons
                name={(focused ? 'compass' : 'compass-outline') as TabIconName}
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
            title: t('navigation.settings'),
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
