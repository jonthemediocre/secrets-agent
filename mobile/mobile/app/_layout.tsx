import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';

export default function TabLayout() {
  return (
    <Tabs screenOptions={{ tabBarActiveTintColor: 'blue' }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <Ionicons name="home" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="agents"
        options={{
          title: 'Agents',
          tabBarIcon: ({ color }) => <Ionicons name="people" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="security"
        options={{
          title: 'Security',
          tabBarIcon: ({ color }) => <Ionicons name="shield" size={24} color={color} />,
        }}
      />
      <Tabs.Screen
        name="vault"
        options={{
          title: 'Vault',
          tabBarIcon: ({ color }) => <Ionicons name="lock-closed" size={24} color={color} />,
        }}
      />
    </Tabs>
  );
}