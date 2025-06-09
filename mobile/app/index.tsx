import { View, Text, ScrollView } from 'react-native';
import { Link } from 'expo-router';

export default function HomeScreen() {
  return (
    <ScrollView style={{ flex: 1, backgroundColor: '#111827' }}>
      <View style={{ padding: 20 }}>
        <Text style={{ color: 'white', fontSize: 24, fontWeight: 'bold', marginBottom: 20 }}>
          🔐 Secrets Agent Mobile
        </Text>
        
        <View style={{ gap: 15 }}>
          <Link href="/agents" style={{ color: '#60a5fa', fontSize: 18 }}>
            🤖 Manage Agents
          </Link>
          <Link href="/security" style={{ color: '#60a5fa', fontSize: 18 }}>
            🛡️ Security Center
          </Link>
          <Link href="/vault" style={{ color: '#60a5fa', fontSize: 18 }}>
            🔐 Vault Access
          </Link>
        </View>
      </View>
    </ScrollView>
  );
}