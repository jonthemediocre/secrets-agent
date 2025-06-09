
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useVaultState } from '@/hooks/useVaultState';
import { StatusBadge } from '@/components/ui/StatusBadge';

export function VaultCard() {
  const { isVaultOpen, isLoading, openVault, closeVault, vaultStatus } = useVaultState();

  return (
    <Card style={styles.card}>
      <CardContent style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>🔐 Vault Access</Text>
          <StatusBadge status={vaultStatus} />
        </View>
        
        <Text style={styles.description}>
          Secure access to your secrets and environment variables
        </Text>
        
        <View style={styles.actions}>
          <Button
            variant={isVaultOpen ? "outline" : "default"}
            onPress={isVaultOpen ? closeVault : openVault}
            loading={isLoading}
            style={styles.button}
            accessibilityLabel={isVaultOpen ? "Close vault" : "Open vault"}
          >
            {isLoading ? "Processing..." : isVaultOpen ? "Close Vault" : "Open Vault"}
          </Button>
        </View>
      </CardContent>
    </Card>
  );
}

const styles = StyleSheet.create({
  card: {
    marginBottom: 16,
  },
  content: {
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1D1D1F',
  },
  description: {
    fontSize: 14,
    color: '#8E8E93',
    marginBottom: 16,
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  button: {
    flex: 1,
  },
});