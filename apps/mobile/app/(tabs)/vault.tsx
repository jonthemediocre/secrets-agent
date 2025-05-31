import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Modal,
  Alert
} from 'react-native';

interface Secret {
  id: string;
  key: string;
  category: string;
  lastModified: string;
  isVisible: boolean;
}

interface SecretCardProps {
  secret: Secret;
  onToggleVisibility: (id: string) => void;
  onEdit: (secret: Secret) => void;
}

const SecretCard: React.FC<SecretCardProps> = ({ 
  secret, 
  onToggleVisibility, 
  onEdit 
}) => (
  <View style={styles.secretCard}>
    <View style={styles.secretHeader}>
      <Text style={styles.secretKey}>{secret.key}</Text>
      <View style={styles.categoryBadge}>
        <Text style={styles.categoryText}>{secret.category}</Text>
      </View>
    </View>
    
    <View style={styles.secretValue}>
      <Text style={styles.valueText}>
        {secret.isVisible ? '••••••••••••••••' : '••••••••••••••••'}
      </Text>
    </View>
    
    <View style={styles.secretActions}>
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => onToggleVisibility(secret.id)}
      >
        <Text style={styles.actionText}>
          {secret.isVisible ? '👁️ Hide' : '👁️ Show'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity 
        style={styles.actionButton}
        onPress={() => onEdit(secret)}
      >
        <Text style={styles.actionText}>✏️ Edit</Text>
      </TouchableOpacity>
    </View>
    
    <Text style={styles.lastModified}>
      Last modified: {secret.lastModified}
    </Text>
  </View>
);

export default function VaultScreen() {
  const [secrets, setSecrets] = useState<Secret[]>([
    {
      id: '1',
      key: 'DATABASE_URL',
      category: 'database',
      lastModified: '2025-01-15 10:30 AM',
      isVisible: false,
    },
    {
      id: '2',
      key: 'API_KEY_OPENAI',
      category: 'api',
      lastModified: '2025-01-14 2:15 PM',
      isVisible: false,
    },
    {
      id: '3',
      key: 'JWT_SECRET',
      category: 'auth',
      lastModified: '2025-01-13 9:45 AM',
      isVisible: false,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedSecret, setSelectedSecret] = useState<Secret | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [formData, setFormData] = useState({
    key: '',
    value: '',
    category: ''
  });

  const toggleSecretVisibility = (id: string) => {
    setSecrets(prev => prev.map(secret => 
      secret.id === id 
        ? { ...secret, isVisible: !secret.isVisible }
        : secret
    ));
  };

  const handleEditSecret = (secret: Secret) => {
    setSelectedSecret(secret);
    setFormData({
      key: secret.key,
      value: '••••••••••••••••', // Hidden for security
      category: secret.category
    });
    setIsAddingNew(false);
    setModalVisible(true);
  };

  const handleAddSecret = () => {
    setSelectedSecret(null);
    setFormData({
      key: '',
      value: '',
      category: ''
    });
    setIsAddingNew(true);
    setModalVisible(true);
  };

  const handleSaveSecret = () => {
    if (!formData.key || !formData.value) {
      Alert.alert('Error', 'Key and value are required');
      return;
    }

    if (isAddingNew) {
      // Add new secret
      const newSecret: Secret = {
        id: Date.now().toString(),
        key: formData.key,
        category: formData.category || 'general',
        lastModified: new Date().toLocaleString(),
        isVisible: false
      };
      setSecrets(prev => [...prev, newSecret]);
      Alert.alert('Success', `Secret "${formData.key}" added successfully!`);
    } else {
      // Update existing secret
      setSecrets(prev => prev.map(secret => 
        secret.id === selectedSecret?.id
          ? {
              ...secret,
              key: formData.key,
              category: formData.category,
              lastModified: new Date().toLocaleString()
            }
          : secret
      ));
      Alert.alert('Success', `Secret "${formData.key}" updated successfully!`);
    }

    setModalVisible(false);
    setFormData({ key: '', value: '', category: '' });
  };

  const handleImportEnv = () => {
    Alert.alert(
      'Import .env File',
      'This will import secrets from a .env file. Choose your import method:',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Scan QR Code', 
          onPress: () => {
            Alert.alert('QR Import', 'QR code scanner will open in next update');
          }
        },
        { 
          text: 'Select File', 
          onPress: () => {
            // Simulate file import
            const sampleSecrets = [
              {
                id: Date.now().toString(),
                key: 'IMPORTED_API_KEY',
                category: 'imported',
                lastModified: new Date().toLocaleString(),
                isVisible: false
              },
              {
                id: (Date.now() + 1).toString(),
                key: 'IMPORTED_DATABASE_URL',
                category: 'imported',
                lastModified: new Date().toLocaleString(),
                isVisible: false
              }
            ];
            setSecrets(prev => [...prev, ...sampleSecrets]);
            Alert.alert('Import Complete', `Imported ${sampleSecrets.length} secrets from .env file`);
          }
        }
      ]
    );
  };

  const filteredSecrets = secrets.filter(secret =>
    secret.key.toLowerCase().includes(searchQuery.toLowerCase()) ||
    secret.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>🔐 Vault</Text>
        <Text style={styles.subtitle}>
          {secrets.length} secrets • Encrypted with AES-256-GCM
        </Text>
      </View>

      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search secrets..."
          placeholderTextColor="#6b7280"
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>

      <View style={styles.actionsBar}>
        <TouchableOpacity style={styles.primaryButton} onPress={handleAddSecret}>
          <Text style={styles.primaryButtonText}>➕ Add Secret</Text>
        </TouchableOpacity>
        
        <TouchableOpacity style={styles.secondaryButton} onPress={handleImportEnv}>
          <Text style={styles.secondaryButtonText}>📋 Import .env</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.secretsList}>
        {filteredSecrets.map(secret => (
          <SecretCard
            key={secret.id}
            secret={secret}
            onToggleVisibility={toggleSecretVisibility}
            onEdit={handleEditSecret}
          />
        ))}
      </ScrollView>

      {/* Edit/Add Secret Modal */}
      <Modal
        animationType="slide"
        transparent={true}
        visible={modalVisible}
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {isAddingNew ? '➕ Add Secret' : '✏️ Edit Secret'}
            </Text>
            
            <Text style={styles.modalLabel}>Key</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.key}
              onChangeText={(text) => setFormData(prev => ({ ...prev, key: text }))}
              placeholder="Secret key (e.g., API_KEY)"
              placeholderTextColor="#6b7280"
              autoCapitalize="characters"
            />
            
            <Text style={styles.modalLabel}>Value</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.value}
              onChangeText={(text) => setFormData(prev => ({ ...prev, value: text }))}
              placeholder="Secret value"
              placeholderTextColor="#6b7280"
              secureTextEntry={!isAddingNew}
              multiline={isAddingNew}
            />
            
            <Text style={styles.modalLabel}>Category</Text>
            <TextInput
              style={styles.modalInput}
              value={formData.category}
              onChangeText={(text) => setFormData(prev => ({ ...prev, category: text }))}
              placeholder="Category (e.g., database, api, auth)"
              placeholderTextColor="#6b7280"
              autoCapitalize="none"
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setModalVisible(false)}
              >
                <Text style={styles.modalCancelText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalSaveButton}
                onPress={handleSaveSecret}
              >
                <Text style={styles.modalSaveText}>
                  {isAddingNew ? 'Add' : 'Save'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
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
  searchContainer: {
    paddingHorizontal: 20,
    marginBottom: 16,
  },
  searchInput: {
    backgroundColor: '#1f2937',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  actionsBar: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginBottom: 16,
    gap: 12,
  },
  primaryButton: {
    backgroundColor: '#2dd4bf',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
  },
  primaryButtonText: {
    color: '#0f0f23',
    fontWeight: 'bold',
    textAlign: 'center',
  },
  secondaryButton: {
    backgroundColor: '#1f2937',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    borderWidth: 1,
    borderColor: '#374151',
  },
  secondaryButtonText: {
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
  },
  secretsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  secretCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  secretHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  secretKey: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  categoryBadge: {
    backgroundColor: '#2dd4bf',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: '#0f0f23',
    fontSize: 12,
    fontWeight: 'bold',
  },
  secretValue: {
    marginBottom: 12,
  },
  valueText: {
    color: '#9ca3af',
    fontSize: 14,
    fontFamily: 'monospace',
  },
  secretActions: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  actionButton: {
    backgroundColor: '#374151',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  actionText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '500',
  },
  lastModified: {
    color: '#6b7280',
    fontSize: 12,
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
    marginBottom: 20,
    textAlign: 'center',
  },
  modalLabel: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
    marginTop: 12,
  },
  modalInput: {
    backgroundColor: '#0f0f23',
    color: '#ffffff',
    padding: 12,
    borderRadius: 8,
    fontSize: 16,
    borderWidth: 1,
    borderColor: '#374151',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  modalCancelButton: {
    backgroundColor: '#374151',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
  },
  modalCancelText: {
    color: '#ffffff',
    fontWeight: '500',
    textAlign: 'center',
  },
  modalSaveButton: {
    backgroundColor: '#2dd4bf',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    flex: 1,
  },
  modalSaveText: {
    color: '#0f0f23',
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 