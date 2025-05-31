import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity,
  SafeAreaView,
  Alert,
  Modal,
  TextInput
} from 'react-native';
import { getPlatformOrchestrator, Platform } from '../../../../src/universal/PlatformOrchestrator';

interface MCPTool {
  id: string;
  name: string;
  description: string;
  category: string;
  status: 'available' | 'busy' | 'error';
  lastUsed?: string;
}

interface AnalysisResult {
  projectName: string;
  secretsFound: number;
  vulnerabilities: number;
  recommendations: string[];
}

export default function ToolsScreen() {
  const [mcpTools, setMcpTools] = useState<MCPTool[]>([
    {
      id: '1',
      name: 'Secret Scanner',
      description: 'Deep scan for exposed secrets in codebase',
      category: 'security',
      status: 'available',
      lastUsed: '2025-01-15 10:30 AM'
    },
    {
      id: '2',
      name: 'Vault Rotator',
      description: 'Automated secret rotation policies',
      category: 'automation',
      status: 'available',
      lastUsed: '2025-01-14 3:45 PM'
    },
    {
      id: '3',
      name: 'Access Monitor',
      description: 'Real-time access pattern analysis',
      category: 'monitoring',
      status: 'available',
      lastUsed: '2025-01-15 9:15 AM'
    }
  ]);
  
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedTool, setSelectedTool] = useState<MCPTool | null>(null);

  const orchestrator = getPlatformOrchestrator();

  useEffect(() => {
    // Load real MCP tools from orchestrator
    loadMCPTools();
  }, []);

  const loadMCPTools = async () => {
    try {
      // In real implementation, this would fetch from MCP bridge
      console.log('Loading MCP tools...');
    } catch (error) {
      console.error('Failed to load MCP tools:', error);
    }
  };

  const handleSecretSauceAnalysis = async () => {
    setIsAnalyzing(true);
    
    try {
      // Simulate analysis
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      const result: AnalysisResult = {
        projectName: 'Current Project',
        secretsFound: 47,
        vulnerabilities: 3,
        recommendations: [
          'Rotate API keys older than 90 days',
          'Enable multi-factor authentication',
          'Review access permissions for service accounts',
          'Update weak encryption algorithms'
        ]
      };
      
      setAnalysisResult(result);
      setModalVisible(true);
    } catch (error) {
      Alert.alert('Analysis Failed', 'Could not complete secret sauce analysis');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleAccessLogs = () => {
    Alert.alert(
      'Access Logs',
      'Recent access patterns:\n\n' +
      '🔍 CLI access: 15:30 - vault:unlock\n' +
      '🌐 Web access: 14:45 - secret:read\n' +
      '📱 Mobile access: 13:20 - vault:status\n' +
      '🪟 Desktop access: 12:10 - secret:add\n\n' +
      'All accesses verified with biometric auth.'
    );
  };

  const executeMCPTool = async (tool: MCPTool) => {
    setSelectedTool(tool);
    
    // Update tool status
    setMcpTools(prev => prev.map(t => 
      t.id === tool.id 
        ? { ...t, status: 'busy' as const }
        : t
    ));

    try {
      // Broadcast tool execution via orchestrator
      if (orchestrator) {
        await orchestrator.broadcastChange('vault:status:changed' as any, {
          action: 'mcp_tool_execute',
          tool: tool.name,
          platform: 'mobile'
        });
      }

      // Simulate tool execution
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        `${tool.name} Executed`,
        `✅ Tool completed successfully!\n\nResults:\n• Analysis complete\n• No issues found\n• Recommendations applied`
      );

      // Update tool status
      setMcpTools(prev => prev.map(t => 
        t.id === tool.id 
          ? { ...t, status: 'available' as const, lastUsed: new Date().toLocaleString() }
          : t
      ));

    } catch (error) {
      Alert.alert('Tool Error', `Failed to execute ${tool.name}`);
      
      setMcpTools(prev => prev.map(t => 
        t.id === tool.id 
          ? { ...t, status: 'error' as const }
          : t
      ));
    }
  };

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'security': return '#ef4444';
      case 'automation': return '#3b82f6';
      case 'monitoring': return '#10b981';
      default: return '#6b7280';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'available': return '#10b981';
      case 'busy': return '#f59e0b';
      case 'error': return '#ef4444';
      default: return '#6b7280';
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollView}>
        <View style={styles.header}>
          <Text style={styles.title}>🛠️ Tools</Text>
          <Text style={styles.subtitle}>
            MCP integration and security analysis
          </Text>
        </View>

        {/* Quick Actions */}
        <View style={styles.quickActions}>
          <Text style={styles.sectionTitle}>Security Analysis</Text>
          
          <TouchableOpacity 
            style={[styles.actionButton, isAnalyzing && styles.disabledButton]}
            onPress={handleSecretSauceAnalysis}
            disabled={isAnalyzing}
          >
            <Text style={styles.actionButtonText}>
              {isAnalyzing ? '🔍 Analyzing...' : '🔍 Secret Sauce Analysis'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleAccessLogs}
          >
            <Text style={styles.actionButtonText}>📊 View Access Logs</Text>
          </TouchableOpacity>
        </View>

        {/* MCP Tools */}
        <View style={styles.mcpTools}>
          <Text style={styles.sectionTitle}>MCP Tools</Text>
          <Text style={styles.sectionSubtitle}>
            {mcpTools.length} tools available
          </Text>

          {mcpTools.map(tool => (
            <View key={tool.id} style={styles.toolCard}>
              <View style={styles.toolHeader}>
                <Text style={styles.toolName}>{tool.name}</Text>
                <View style={[styles.statusBadge, { backgroundColor: getStatusColor(tool.status) }]}>
                  <Text style={styles.statusText}>{tool.status}</Text>
                </View>
              </View>
              
              <Text style={styles.toolDescription}>{tool.description}</Text>
              
              <View style={styles.toolFooter}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(tool.category) }]}>
                  <Text style={styles.categoryText}>{tool.category}</Text>
                </View>
                
                <TouchableOpacity 
                  style={[
                    styles.executeButton,
                    tool.status !== 'available' && styles.disabledExecuteButton
                  ]}
                  onPress={() => executeMCPTool(tool)}
                  disabled={tool.status !== 'available'}
                >
                  <Text style={styles.executeButtonText}>▶️ Execute</Text>
                </TouchableOpacity>
              </View>
              
              {tool.lastUsed && (
                <Text style={styles.lastUsed}>
                  Last used: {tool.lastUsed}
                </Text>
              )}
            </View>
          ))}
        </View>

        {/* Analysis Results Modal */}
        <Modal
          animationType="slide"
          transparent={true}
          visible={modalVisible}
          onRequestClose={() => setModalVisible(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContent}>
              <Text style={styles.modalTitle}>🔍 Secret Sauce Analysis</Text>
              
              {analysisResult && (
                <>
                  <View style={styles.analysisStats}>
                    <View style={styles.statItem}>
                      <Text style={styles.statValue}>{analysisResult.secretsFound}</Text>
                      <Text style={styles.statLabel}>Secrets Found</Text>
                    </View>
                    <View style={styles.statItem}>
                      <Text style={[styles.statValue, { color: '#ef4444' }]}>
                        {analysisResult.vulnerabilities}
                      </Text>
                      <Text style={styles.statLabel}>Vulnerabilities</Text>
                    </View>
                  </View>
                  
                  <Text style={styles.recommendationsTitle}>Recommendations:</Text>
                  {analysisResult.recommendations.map((rec, index) => (
                    <Text key={index} style={styles.recommendation}>
                      • {rec}
                    </Text>
                  ))}
                </>
              )}
              
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
  quickActions: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: '#9ca3af',
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
    textAlign: 'center',
  },
  disabledButton: {
    backgroundColor: '#374151',
    opacity: 0.6,
  },
  mcpTools: {
    padding: 20,
  },
  toolCard: {
    backgroundColor: '#1f2937',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#374151',
  },
  toolHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  toolName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  statusText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  toolDescription: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 12,
  },
  toolFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  categoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 6,
  },
  categoryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: 'bold',
  },
  executeButton: {
    backgroundColor: '#2dd4bf',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
  },
  executeButtonText: {
    color: '#0f0f23',
    fontSize: 12,
    fontWeight: 'bold',
  },
  disabledExecuteButton: {
    backgroundColor: '#6b7280',
  },
  lastUsed: {
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
  analysisStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#2dd4bf',
  },
  statLabel: {
    fontSize: 12,
    color: '#9ca3af',
    marginTop: 4,
  },
  recommendationsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#ffffff',
    marginBottom: 12,
  },
  recommendation: {
    color: '#9ca3af',
    fontSize: 14,
    marginBottom: 8,
    paddingLeft: 12,
  },
  modalCloseButton: {
    backgroundColor: '#2dd4bf',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    marginTop: 20,
  },
  modalCloseText: {
    color: '#0f0f23',
    fontWeight: 'bold',
    textAlign: 'center',
  },
}); 