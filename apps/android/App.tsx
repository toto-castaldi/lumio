import './lib/supabase'; // Side-effect import: ensure @lumio/core initialization before anything else
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { AppNavigator } from './navigation/AppNavigator';
import { OfflineBanner } from './components/OfflineBanner';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <NavigationContainer>
              <OfflineBanner />
              <AppNavigator />
            </NavigationContainer>
          </ThemeProvider>
        </AuthProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}
