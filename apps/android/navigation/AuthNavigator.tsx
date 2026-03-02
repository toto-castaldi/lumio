import React from 'react';
import { View, Text } from 'react-native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  OtpVerification: { email: string };
  ForgotPassword: undefined;
  UpdatePassword: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

// Placeholder components — real screens built in Plan 02
const ForgotPasswordPlaceholder = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>ForgotPassword</Text>
  </View>
);
const UpdatePasswordPlaceholder = () => (
  <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
    <Text>UpdatePassword</Text>
  </View>
);

/**
 * AuthNavigator handles the authentication flow.
 * Contains Login, SignUp, OtpVerification, ForgotPassword, and UpdatePassword screens.
 */
export function AuthNavigator() {
  return (
    <Stack.Navigator
      screenOptions={{
        headerShown: false,
      }}
    >
      <Stack.Screen name="Login" component={LoginScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="OtpVerification" component={OtpVerificationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordPlaceholder} />
      <Stack.Screen name="UpdatePassword" component={UpdatePasswordPlaceholder} />
    </Stack.Navigator>
  );
}
