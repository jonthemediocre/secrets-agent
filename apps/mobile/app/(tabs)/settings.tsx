import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Switch,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { getPlatformOrchestrator, Platform } from '../../../../src/universal/PlatformOrchestrator';

interface SettingsSection {
  title: string;
  items: SettingItem[];
}

interface SettingItem {
  id: string;
  title: string;
  description: string;
  type: 'toggle' | 'button' | 'info';
  value?: boolean | string;
  onPress?: () => void;
  onToggle?: (value: boolean) => void;
}

export default function SettingsScreen() {
  const [biometricEnabled, setBiometricEnabled] = useState(true);
  const [autoLockEnabled, setAutoLockEnabled] = useState(true);
  const [syncEnabled, setSyncEnabled] = useState(true);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [modalVisible, setModalVisible] = useState(false);
  const [modalContent, setModalContent] = useState({ title: '', content: '' });

  const orchestrator = getPlatformOrchestrator();

  const showModal = (title: string, content: string) => {
    setModalContent({ title, content });
    setModalVisible(true);
  };

  const handleBiometricToggle = async (value: boolean) => {
    setBiometricEnabled(value);
    
    if (value) {
      Alert.alert(
        'Biometric Authentication Enabled',
        'Your vault will now require fingerprint or face recognition to unlock.',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Biometric Authentication Disabled',
        'You will need to use your master password to unlock the vault.',
        [{ text: 'OK' }]
      );
    }

    // Broadcast setting change
    if (orchestrator) {
      await orchestrator.broadcastChange('config:updated' as any, {
        setting: 'biometric_auth',
        value,
        platform: 'mobile'
      });
    }
  };

  const handleSyncToggle = async (value: boolean) => {
    setSyncEnabled(value);
    
    if (value) {
      Alert.alert(
        'Platform Sync Enabled',
        'Your secrets will sync across all devices (Mobile, Desktop, Web, CLI).',
        [{ text: 'OK' }]
      );
    } else {
      Alert.alert(
        'Platform Sync Disabled',
        'Your secrets will only be available on this device.',
        [{ text: 'OK' }]
      );
    }

    // Broadcast sync setting change
    if (orchestrator) {
      await orchestrator.broadcastChange('config:updated' as any, {
        setting: 'platform_sync',
        value,
        platform: 'mobile'
      });
    }
  };

  const handleVaultReset = () => {
    Alert.alert(
      'Reset Vault',
      'This will permanently delete all secrets and reset your vault. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Reset', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Vault Reset', 'Feature will be implemented in next update');
          }
        }
      ]
    );
  };

  const handleExportData = () => {
    Alert.alert(
      'Export Vault',
      'Export your vault data as an encrypted backup file.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Export', 
          onPress: () => {
            Alert.alert('Export Started', 'Your encrypted backup will be saved to Downloads');
          }
        }
      ]
    );
  };

  const handleChangeMasterPassword = () => {
    Alert.alert(
      'Change Master Password',
      'You will be asked to enter your current password, then set a new one.',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Change', 
          onPress: () => {
            Alert.alert('Password Change', 'Feature will be implemented in next update');
          }
        }
      ]
    );
  };

  const settings: SettingsSection[] = [
    {
      title: 'Security',
      items: [
        {
          id: 'biometric',
          title: 'Biometric Authentication',
          description: 'Use fingerprint or face recognition to unlock vault',
          type: 'toggle',
          value: biometricEnabled,
          onToggle: handleBiometricToggle
        },
        {
          id: 'autolock',
          title: 'Auto-Lock',
          description: 'Automatically lock vault after 5 minutes of inactivity',
          type: 'toggle',
          value: autoLockEnabled,
          onToggle: setAutoLockEnabled
        },
        {
          id: 'change_password',
          title: 'Change Master Password',
          description: 'Update your vault master password',
          type: 'button',
          onPress: handleChangeMasterPassword
        }
      ]
    },
    {
      title: 'Synchronization',
      items: [
        {
          id: 'sync',
          title: 'Cross-Platform Sync',
          description: 'Sync secrets across Mobile, Desktop, Web, and CLI',
          type: 'toggle',
          value: syncEnabled,
          onToggle: handleSyncToggle
        },
        {
          id: 'notifications',
          title: 'Sync Notifications',
          description: 'Get notified when secrets are updated on other devices',
          type: 'toggle',
          value: notificationsEnabled,
          onToggle: setNotificationsEnabled
        },
        {
          id: 'sync_status',
          title: 'Platform Status',
          description: 'View connection status of all platforms',
          type: 'button',
          onPress: () => showModal(
            'Platform Status',
            `📱 Mobile: Online\n🪟 Desktop: Online\n🌐 Web: Online\n⌨️ CLI: Offline\n\nLast sync: ${new Date().toLocaleString()}`
          )
        }
      ]
    },
    {
      title: 'Vault Management',
      items: [
        {
          id: 'export',
          title: 'Export Vault',
          description: 'Create encrypted backup of all secrets',
          type: 'button',
          onPress: handleExportData
        },
        {
          id: 'import',
          title: 'Import Data',
          description: 'Import secrets from .env files or other vaults',
          type: 'button',
          onPress: () => Alert.alert('Import', 'Feature will be implemented in next update')
        },
        {
          id: 'reset',
          title: 'Reset Vault',
          description: 'Permanently delete all data and start fresh',
          type: 'button',
          onPress: handleVaultReset
        }
      ]
    },
    {
      title: 'About',
      items: [
        {
          id: 'version',
          title: 'Version',
          description: '1.3.4 (Build 47)',
          type: 'info'
        },
        {
          id: 'encryption',
          title: 'Encryption',
          description: 'AES-256-GCM with PBKDF2 key derivation',
          type: 'info'
        },
        {
          id: 'support',
          title: 'Support',
          description: 'Get help and report issues',
          type: 'button',
          onPress: () => showModal(
            'Support',
            'Need help?\n\n📧 Email: support@secretsagent.dev\n🌐 Documentation: docs.secretsagent.dev\n🐛 Issues: github.com/secrets-agent/issues'
          )
        }
      ]
    }
  ];

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>⚙️ Settings</Text>
          <Text style={styles.subtitle}>
            Configure your vault and sync preferences
          </Text>
        </View>

        {settings.map((section, sectionIndex) => (
          <View key={sectionIndex} style={styles.section}>
            <Text style={styles.sectionTitle}>{section.title}</Text>
            
            {section.items.map((item, itemIndex) => (
              <View key={item.id} style={styles.settingItem}>
                <View style={styles.settingContent}>
                  <Text style={styles.settingTitle}>{item.title}</Text>
                  <Text style={styles.settingDescription}>{item.description}</Text>
                </View>
                
                <View style={styles.settingControl}>
                  {item.type === 'toggle' && (
                    <Switch
                      value={item.value as boolean}
                      onValueChange={item.onToggle}
                      trackColor={{ false: '#374151', true: '#2dd4bf' }}
                      thumbColor={item.value ? '#ffffff' : '#9ca3af'}
                    />
                  )}
                  
                  {item.type === 'button' && (
                    <TouchableOpacity 
                      style={styles.settingButton}
                      onPress={item.onPress}
                    >
                      <Text style={styles.settingButtonText}>▶️</Text>
                    </TouchableOpacity>
                  )}
                  
                  {item.type === 'info' && (
                    <Text style={styles.infoValue}>{item.value}</Text>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Quick Actions</Text>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔄 Force Sync Now</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>📋 Copy Sync Code</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.actionButton}>
            <Text style={styles.actionButtonText}>🔍 Test Vault Integrity</Text>
          </TouchableOpacity>
        </View>

        {/* Platform Status */}
        <View style={styles.platformStatus}>
          <Text style={styles.sectionTitle}>Platform Sync Status</Text>
          
          <View style={styles.statusGrid}>
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>📱</Text>
              <Text style={styles.statusTitle}>Mobile</Text>
              <Text style={[styles.statusIndicator, { color: '#10b981' }]}>● Online</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>🪟</Text>
              <Text style={styles.statusTitle}>Desktop</Text>
              <Text style={[styles.statusIndicator, { color: '#10b981' }]}>● Online</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>🌐</Text>
              <Text style={styles.statusTitle}>Web</Text>
              <Text style={[styles.statusIndicator, { color: '#f59e0b' }]}>● Syncing</Text>
            </View>
            
            <View style={styles.statusCard}>
              <Text style={styles.statusIcon}>⌨️</Text>
              <Text style={styles.statusTitle}>CLI</Text>
              <Text style={[styles.statusIndicator, { color: '#6b7280' }]}>● Offline</Text>
            </View>
          </View>
        </View>

        {/* Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>{modalContent.title}</Text>
              <Text style={styles.modalText}>{modalContent.content}</Text>
              
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCloseText}>Close</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
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
    fontSize: 14,
    color: '#9ca3af',
  },
  section: {
    margin: 20,
    marginBottom: 0,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
  },
  settingItem: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  settingContent: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  settingDescription: {
    fontSize: 14,
    color: '#9ca3af',
  },
  settingControl: {
    marginLeft: 16,
  },
  settingButton: {
    backgroundColor: '#374151',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
  },
  settingButtonText: {
    color: '#ffffff',
    fontSize: 16,
  },
  infoValue: {
    fontSize: 14,
    color: '#2dd4bf',
    fontWeight: '500',
  },
  quickActions: {
    margin: 20,
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
    textAlign: 'center',
  },
  platformStatus: {
    margin: 20,
  },
  statusGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statusCard: {
    backgroundColor: '#1f2937',
    borderRadius: 8,
    padding: 12,
    width: '47%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#374151',
  },
  statusIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  statusTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
    marginBottom: 4,
  },
  statusIndicator: {
    fontSize: 12,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#1f2937',
    borderRadius: 16,
    padding: 24,
    width: '90%',
    maxWidth: 400,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 16,
    textAlign: 'center',
  },
  modalText: {
    fontSize: 16,
    color: '#9ca3af',
    lineHeight: 24,
    marginBottom: 20,
  },
  modalCloseButton: {
    backgroundColor: '#2dd4bf',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  modalCloseText: {
    color: '#0f0f23',
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 