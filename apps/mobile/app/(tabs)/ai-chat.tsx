import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TextInput,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { AIClient, VantaChatRequest, AIResponse } from '../../../ai-gateway/src/client/AIClient';

interface Message {
  id: string;
  type: 'user' | 'ai' | 'system';
  content: string;
  timestamp: Date;
  usage?: {
    tokens: number;
    cost: number;
  };
}

export default function AIChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      type: 'system',
      content: 'Welcome! I\'m your Vanta AI assistant. I can help you with security analysis, compliance checks, and secure configuration generation.',
      timestamp: new Date()
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [aiClient, setAiClient] = useState<AIClient | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);

  useEffect(() => {
    // Initialize AI Client
    const client = new AIClient({
      gatewayUrl: 'http://localhost:3001', // AI Gateway URL
      appId: 'secrets-agent-mobile'
    });

    // Test connection
    client.healthCheck()
      .then(isHealthy => {
        if (isHealthy) {
          setAiClient(client);
          addSystemMessage('✅ Connected to AI Gateway');
        } else {
          addSystemMessage('❌ AI Gateway not available');
        }
      })
      .catch(() => {
        addSystemMessage('❌ Failed to connect to AI Gateway');
      });

  }, []);

  const addSystemMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'system',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const addUserMessage = (content: string) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'user',
      content,
      timestamp: new Date()
    };
    setMessages(prev => [...prev, message]);
  };

  const addAIMessage = (content: string, usage?: any) => {
    const message: Message = {
      id: Date.now().toString(),
      type: 'ai',
      content,
      timestamp: new Date(),
      usage
    };
    setMessages(prev => [...prev, message]);
  };

  const sendMessage = async () => {
    if (!inputText.trim() || !aiClient || isLoading) return;

    const userMessage = inputText.trim();
    setInputText('');
    setIsLoading(true);

    // Add user message
    addUserMessage(userMessage);

    try {
      // Prepare context based on current vault state
      const context = {
        domain: 'security',
        vault: 'secrets-agent',
        platform: 'mobile'
      };

      const request: VantaChatRequest = {
        message: userMessage,
        context
      };

      const response: AIResponse = await aiClient.chat(request);

      if (response.success && response.data) {
        addAIMessage(response.data.message || response.data.content, response.usage);
      } else {
        addAIMessage(`❌ Error: ${response.error || 'Unknown error occurred'}`);
      }

    } catch (error) {
      console.error('Chat error:', error);
      addAIMessage(`❌ Failed to send message: ${error.message}`);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleQuickAction = async (action: string) => {
    if (!aiClient) return;

    setIsLoading(true);
    let prompt = '';

    switch (action) {
      case 'analyze_secrets':
        prompt = 'Analyze my current vault for potential security vulnerabilities and compliance issues';
        break;
      case 'generate_password':
        prompt = 'Generate a secure password policy for enterprise use';
        break;
      case 'compliance_check':
        prompt = 'Check my secrets vault against SOC 2 compliance requirements';
        break;
      case 'security_tips':
        prompt = 'Give me 5 security best practices for managing secrets in production';
        break;
    }

    addUserMessage(prompt);

    try {
      const response = await aiClient.chat({
        message: prompt,
        context: { domain: 'security', action }
      });

      if (response.success && response.data) {
        addAIMessage(response.data.message || response.data.content, response.usage);
      }
    } catch (error) {
      addAIMessage(`❌ Error: ${error.message}`);
    } finally {
      setIsLoading(false);
      scrollToBottom();
    }
  };

  const formatTimestamp = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatUsage = (usage?: { tokens: number; cost: number }) => {
    if (!usage) return '';
    return `${usage.tokens} tokens • $${usage.cost.toFixed(4)}`;
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>🤖 Vanta AI Assistant</Text>
        <View style={styles.connectionStatus}>
          <View style={[styles.statusDot, aiClient ? styles.connected : styles.disconnected]} />
          <Text style={styles.statusText}>
            {aiClient ? 'Connected' : 'Disconnected'}
          </Text>
        </View>
      </View>

      {/* Quick Actions */}
      <View style={styles.quickActions}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={() => handleQuickAction('analyze_secrets')}
            disabled={isLoading}
          >
            <Text style={styles.quickButtonText}>🔍 Analyze Secrets</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={() => handleQuickAction('generate_password')}
            disabled={isLoading}
          >
            <Text style={styles.quickButtonText}>🔑 Password Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={() => handleQuickAction('compliance_check')}
            disabled={isLoading}
          >
            <Text style={styles.quickButtonText}>📋 Compliance</Text>
          </TouchableOpacity>
          <TouchableOpacity 
            style={styles.quickButton}
            onPress={() => handleQuickAction('security_tips')}
            disabled={isLoading}
          >
            <Text style={styles.quickButtonText}>💡 Security Tips</Text>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Messages */}
      <ScrollView 
        ref={scrollViewRef}
        style={styles.messagesContainer}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((message) => (
          <View key={message.id} style={[
            styles.messageContainer,
            message.type === 'user' ? styles.userMessage : 
            message.type === 'ai' ? styles.aiMessage : styles.systemMessage
          ]}>
            <View style={styles.messageContent}>
              <Text style={[
                styles.messageText,
                message.type === 'user' ? styles.userMessageText : 
                message.type === 'ai' ? styles.aiMessageText : styles.systemMessageText
              ]}>
                {message.content}
              </Text>
              <View style={styles.messageFooter}>
                <Text style={styles.timestamp}>
                  {formatTimestamp(message.timestamp)}
                </Text>
                {message.usage && (
                  <Text style={styles.usage}>
                    {formatUsage(message.usage)}
                  </Text>
                )}
              </View>
            </View>
          </View>
        ))}
        {isLoading && (
          <View style={[styles.messageContainer, styles.aiMessage]}>
            <View style={styles.messageContent}>
              <Text style={styles.loadingText}>🤖 Thinking...</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Input */}
      <KeyboardAvoidingView 
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.inputContainer}
      >
        <View style={styles.inputRow}>
          <TextInput
            style={styles.textInput}
            value={inputText}
            onChangeText={setInputText}
            placeholder="Ask me about security, compliance, or secrets..."
            placeholderTextColor="#666"
            multiline
            maxLength={500}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={sendMessage}
            disabled={!inputText.trim() || isLoading}
          >
            <Text style={styles.sendButtonText}>Send</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0f0f23',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#ffffff',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  connected: {
    backgroundColor: '#2dd4bf',
  },
  disconnected: {
    backgroundColor: '#ef4444',
  },
  statusText: {
    fontSize: 12,
    color: '#888',
  },
  quickActions: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#2a2a3a',
  },
  quickButton: {
    backgroundColor: '#2a2a3a',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    marginRight: 8,
  },
  quickButtonText: {
    color: '#2dd4bf',
    fontSize: 12,
    fontWeight: '500',
  },
  messagesContainer: {
    flex: 1,
    padding: 16,
  },
  messageContainer: {
    marginBottom: 12,
  },
  userMessage: {
    alignItems: 'flex-end',
  },
  aiMessage: {
    alignItems: 'flex-start',
  },
  systemMessage: {
    alignItems: 'center',
  },
  messageContent: {
    maxWidth: '80%',
    padding: 12,
    borderRadius: 12,
  },
  userMessageText: {
    color: '#ffffff',
  },
  aiMessageText: {
    color: '#ffffff',
  },
  systemMessageText: {
    color: '#888',
    fontStyle: 'italic',
  },
  messageText: {
    fontSize: 14,
    lineHeight: 20,
  },
  messageFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  timestamp: {
    fontSize: 10,
    color: '#666',
  },
  usage: {
    fontSize: 10,
    color: '#666',
  },
  loadingText: {
    color: '#2dd4bf',
    fontStyle: 'italic',
  },
  inputContainer: {
    borderTopWidth: 1,
    borderTopColor: '#2a2a3a',
    backgroundColor: '#0f0f23',
  },
  inputRow: {
    flexDirection: 'row',
    padding: 16,
    alignItems: 'flex-end',
  },
  textInput: {
    flex: 1,
    backgroundColor: '#2a2a3a',
    color: '#ffffff',
    padding: 12,
    borderRadius: 12,
    marginRight: 8,
    maxHeight: 100,
    fontSize: 14,
  },
  sendButton: {
    backgroundColor: '#2dd4bf',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
  },
  sendButtonDisabled: {
    backgroundColor: '#666',
  },
  sendButtonText: {
    color: '#0f0f23',
    fontWeight: 'bold',
    fontSize: 14,
  },
});

// Update the user message styles
const userMessageStyle = {
  backgroundColor: '#2dd4bf',
};

const aiMessageStyle = {
  backgroundColor: '#2a2a3a',
};

const systemMessageStyle = {
  backgroundColor: 'transparent',
}; 