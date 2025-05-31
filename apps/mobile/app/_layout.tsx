import React from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: {
            backgroundColor: '#0f0f23',
          },
          headerTintColor: '#ffffff',
          headerTitleStyle: {
            fontWeight: 'bold',
          },
        }}
      >
        <Stack.Screen 
          name="(tabs)" 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="auth/login" 
          options={{ 
            title: 'Sign In',
            presentation: 'modal' 
          }} 
        />
        <Stack.Screen 
          name="vault/secret-detail" 
          options={{ 
            title: 'Secret Details',
            presentation: 'modal' 
          }} 
        />
      </Stack>
      <StatusBar style="light" backgroundColor="#0f0f23" />
    </>
  );
} 