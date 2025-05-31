import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Alert
} from 'react-native';
import { router } from 'expo-router';

interface DashboardCardProps {
  title: string;
  value: string;
  description: string;
  onPress: () => void;
}

const DashboardCard: React.FC<DashboardCardProps> = ({ 
  title, 
  value, 
  description, 
  onPress 
}) => (
  <TouchableOpacity style={styles.card} onPress={onPress}>
    <Text style={styles.cardTitle}>{title}</Text>
    <Text style={styles.cardValue}>{value}</Text>
    <Text style={styles.cardDescription}>{description}</Text>
  </TouchableOpacity>
);

export default function DashboardScreen() {
  const handleVaultStatus = () => {
    Alert.alert(
      '🔓 Vault Status',
      'Status: Unlocked ✅\nLast Activity: 5 minutes ago\nEncryption: AES-256-GCM\nBiometric Lock: Enabled\n\nVault is secure and operational.',
      [
        { text: 'Lock Vault', onPress: () => Alert.alert('Locked', 'Vault has been locked') },
        { text: 'OK', style: 'cancel' }
      ]
    );
  };

  const handleSecretsNavigation = () => {
    router.push('/(tabs)/vault');
  };

  const handleRecentActivity = () => {
    Alert.alert(
      '📊 Recent Activity',
      'Last 24 hours:\n\n' +
      '🔍 15:30 - Secret Scanner executed\n' +
      '📱 14:45 - Mobile sync completed\n' +
      '➕ 13:20 - Added new API secret\n' +
      '🔄 12:10 - Vault auto-backup\n' +
      '🔐 11:55 - Biometric unlock\n\n' +
      'All activities verified and secure.'
    );
  };

  const handleMCPTools = () => {
    router.push('/(tabs)/tools');
  };

  const handleImportEnv = () => {
    Alert.alert(
      '📋 Import .env File',
      'Choose import method:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Camera Scan', 
          onPress: () => Alert.alert('Scanner', 'QR/File scanner will open in next update')
        },
        { 
          text: 'File Browser', 
          onPress: () => Alert.alert('Import', 'File browser will open in next update')
        }
      ]
    );
  };

  const handleSecretSauceAnalysis = () => {
    Alert.alert(
      '🔍 Secret Sauce Analysis',
      'Starting deep security analysis...',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Start Analysis', 
          onPress: () => {
            router.push('/(tabs)/tools');
            // This would trigger the analysis in the tools screen
          }
        }
      ]
    );
  };

  const handleAccessLogs = () => {
    Alert.alert(
      '📊 Access Logs',
      'Recent vault access patterns:\n\n' +
      '🔍 CLI Access: 15:30 - vault:unlock\n' +
      '🌐 Web Access: 14:45 - secret:read\n' +
      '📱 Mobile Access: 13:20 - vault:status\n' +
      '🪟 Desktop Access: 12:10 - secret:add\n\n' +
      'All accesses verified with biometric authentication.',
      [
        { text: 'Export Logs', onPress: () => Alert.alert('Export', 'Logs exported to Downloads') },
        { text: 'Close', style: 'cancel' }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>🔐 Secrets Agent</Text>
          <Text style={styles.subtitle}>Universal Secrets Management</Text>
        </View>

        <View style={styles.cardsContainer}>
          <DashboardCard
            title="Vault Status"
            value="🔓 Unlocked"
            description="Your vault is ready and accessible"
            onPress={handleVaultStatus}
          />
          
          <DashboardCard
            title="Active Secrets"
            value="23"
            description="Secrets currently managed"
            onPress={handleSecretsNavigation}
          />
          
          <DashboardCard
            title="Recent Activity"
            value="5 actions"
            description="Last 24 hours"
            onPress={handleRecentActivity}
          />
          
          <DashboardCard
            title="MCP Tools"
            value="8 available"
            description="Connected tools and agents"
            onPress={handleMCPTools}
          />
        </View>

        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleImportEnv}>
            <Text style={styles.actionButtonText}>📋 Import .env File</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleSecretSauceAnalysis}>
            <Text style={styles.actionButtonText}>🔍 Secret Sauce Analysis</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton} onPress={handleAccessLogs}>
            <Text style={styles.actionButtonText}>📊 Access Logs</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: '#9ca3af',
  },
  cardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    padding: 16,
    gap: 16,
  },
  card: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    width: '47%',
    borderWidth: 1,
    borderColor: '#374151',
  },
  cardTitle: {
    fontSize: 14,
    color: '#9ca3af',
    marginBottom: 8,
  },
  cardValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#2dd4bf',
    marginBottom: 4,
  },
  cardDescription: {
    fontSize: 12,
    color: '#6b7280',
  },
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  actionButton: {
    backgroundColor: '#1f2937',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '500',
  },
}); 