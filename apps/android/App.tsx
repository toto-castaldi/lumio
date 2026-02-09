import './lib/supabase'; // Side-effect import: ensure @lumio/core initialization before anything else
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { NavigationContainer } from '@react-navigation/native';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import Toast from 'react-native-toast-message';
import { AuthProvider } from './contexts/AuthContext';
import { ThemeProvider } from './contexts/ThemeContext';
import { I18nProvider } from './contexts/I18nContext';
import { StudySettingsProvider } from './contexts/StudySettingsContext';
import { AppNavigator } from './navigation/AppNavigator';
import { OfflineBanner } from './components/OfflineBanner';

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <ThemeProvider>
            <I18nProvider>
              <StudySettingsProvider>
                <NavigationContainer>
                  <OfflineBanner />
                  <AppNavigator />
                </NavigationContainer>
              </StudySettingsProvider>
            </I18nProvider>
          </ThemeProvider>
        </AuthProvider>
        <StatusBar style="light" />
      </SafeAreaProvider>
      <Toast />
    </GestureHandlerRootView>
  );
}
