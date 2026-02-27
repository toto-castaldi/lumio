import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  OtpVerification: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

/**
 * AuthNavigator handles the authentication flow.
 * Contains Login, SignUp, and OtpVerification screens.
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
    </Stack.Navigator>
  );
}
