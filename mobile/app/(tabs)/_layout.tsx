
import { Tabs } from 'expo-router';
import { useColorScheme } from 'react-native';

export default function TabsLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#007AFF',
        tabBarInactiveTintColor: '#8E8E93',
        tabBarStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
          borderTopColor: colorScheme === 'dark' ? '#38383A' : '#C6C6C8',
        },
        headerStyle: {
          backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
        },
        headerTintColor: colorScheme === 'dark' ? '#FFFFFF' : '#000000',
      }}
    />
  );
}