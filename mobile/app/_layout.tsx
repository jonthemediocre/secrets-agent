
import { Tabs } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useColorScheme } from 'react-native';
import { TabBarIcon } from '@/components/navigation/TabBarIcon';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarActiveTintColor: '#007AFF',
          headerShown: false,
          tabBarStyle: {
            backgroundColor: colorScheme === 'dark' ? '#1C1C1E' : '#F2F2F7',
          },
        }}>
        <Tabs.Screen
          name="index"
          options={{
            title: 'Home',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'home' : 'home-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="vault"
          options={{
            title: 'Vault',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'lock-closed' : 'lock-closed-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="agents"
          options={{
            title: 'Agents',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'people' : 'people-outline'} color={color} />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            title: 'Settings',
            tabBarIcon: ({ color, focused }) => (
              <TabBarIcon name={focused ? 'settings' : 'settings-outline'} color={color} />
            ),
          }}
        />
      </Tabs>
      <StatusBar style="auto" />
    </>
  );
}