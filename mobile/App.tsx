
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';

export default function RootLayout() {
  return (
    <>
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: '#1f2937' },
          headerTintColor: '#fff',
          headerTitleStyle: { fontWeight: 'bold' }
        }}
      />
      <StatusBar style="auto" />
    </>
  );
}