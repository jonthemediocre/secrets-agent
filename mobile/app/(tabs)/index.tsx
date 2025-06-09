
import React from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { VaultCard } from '@/components/ui/VaultCard';
import { EnvToolCard } from '@/components/ui/EnvToolCard';
import { ProjectCard } from '@/components/ui/ProjectCard';
import { useAuthState } from '@/hooks/useAuthState';

export default function HomeScreen() {
  const { user } = useAuthState();

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.greeting}>
            Hello, {user?.name || 'User'}
          </Text>
          <Text style={styles.subtitle}>
            Secure secrets management at your fingertips
          </Text>
        </View>

        <View style={styles.cards}>
          <VaultCard />
          <EnvToolCard />
          <ProjectCard />
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F2F2F7',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    paddingBottom: 10,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#1D1D1F',
    marginBottom: 4,
  },
  subtitle: {
    fontSize: 16,
    color: '#8E8E93',
  },
  cards: {
    padding: 20,
    paddingTop: 10,
  },
});