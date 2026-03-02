import React from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { LoginScreen } from '../screens/LoginScreen';
import { SignUpScreen } from '../screens/SignUpScreen';
import { OtpVerificationScreen } from '../screens/OtpVerificationScreen';
import { ForgotPasswordScreen } from '../screens/ForgotPasswordScreen';
import { UpdatePasswordScreen } from '../screens/UpdatePasswordScreen';

export type AuthStackParamList = {
  Login: undefined;
  SignUp: undefined;
  OtpVerification: { email: string };
  ForgotPassword: undefined;
  UpdatePassword: { email: string };
};

const Stack = createNativeStackNavigator<AuthStackParamList>();

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
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="UpdatePassword" component={UpdatePasswordScreen} />
    </Stack.Navigator>
  );
}
