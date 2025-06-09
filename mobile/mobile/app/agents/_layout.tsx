import { Stack } from 'expo-router';

export default function AgentsLayout() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: 'Agents Overview' }} />
      <Stack.Screen name="[id]" options={{ title: 'Agent Details' }} />
    </Stack>
  );
}