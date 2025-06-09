import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';

const logger = createLogger('useSecrets');

export interface Secret {
  id: string;
  name: string;
  description?: string;
  value: string; // Encrypted value from API
  type: 'text' | 'password' | 'api_key' | 'certificate' | 'json';
  tags: string[];
  vaultId: string;
  vaultName?: string;
  expiresAt?: string;
  lastRotated?: string;
  version: number;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
}

export interface CreateSecretData {
  name: string;
  description?: string;
  value: string;
  type: 'text' | 'password' | 'api_key' | 'certificate' | 'json';
  tags?: string[];
  vaultId: string;
  expiresAt?: string;
}

export interface UpdateSecretData {
  name?: string;
  description?: string;
  value?: string;
  type?: 'text' | 'password' | 'api_key' | 'certificate' | 'json';
  tags?: string[];
  expiresAt?: string;
}

export interface SecretsStats {
  totalSecrets: number;
  secretsByType: Record<string, number>;
  secretsByVault: Record<string, number>;
  expiringSecrets: number;
  recentlyUpdated: number;
}

export interface UseSecretsReturn {
  secrets: Secret[];
  stats: SecretsStats | null;
  isLoading: boolean;
  error: string | null;
  createSecret: (data: CreateSecretData) => Promise<{ success: boolean; secret?: Secret; error?: string }>;
  updateSecret: (secretId: string, data: UpdateSecretData) => Promise<{ success: boolean; secret?: Secret; error?: string }>;
  deleteSecret: (secretId: string) => Promise<{ success: boolean; error?: string }>;
  revealSecret: (secretId: string) => Promise<{ success: boolean; value?: string; error?: string }>;
  refreshSecrets: () => Promise<void>;
  getSecretsByVault: (vaultId: string) => Secret[];
}

export function useSecrets(vaultId?: string): UseSecretsReturn {
  const { user, token, isAuthenticated } = useAuth();
  const [secrets, setSecrets] = useState<Secret[]>([]);
  const [stats, setStats] = useState<SecretsStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecrets = useCallback(async () => {
    if (!isAuthenticated || !token || !user) {
      setSecrets([]);
      setStats(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      // Build query parameters
      const queryParams = new URLSearchParams();
      if (vaultId) {
        queryParams.append('vaultId', vaultId);
      }

      const response = await fetch(`/api/secrets?${queryParams.toString()}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          const apiSecrets = Array.isArray(data.data) ? data.data : [];
          
          // Transform API secrets to UI format
          const transformedSecrets: Secret[] = apiSecrets.map((secret: any) => ({
            id: secret.id,
            name: secret.name,
            description: secret.description,
            value: secret.encryptedValue || '***ENCRYPTED***',
            type: secret.type || 'text',
            tags: secret.tags || [],
            vaultId: secret.vaultId,
            vaultName: secret.vault?.name || 'Unknown Vault',
            expiresAt: secret.expiresAt,
            lastRotated: secret.lastRotated,
            version: secret.version || 1,
            createdAt: secret.createdAt,
            updatedAt: secret.updatedAt,
            createdBy: secret.createdBy || user.id,
          }));

          setSecrets(transformedSecrets);

          // Calculate stats
          const totalSecrets = transformedSecrets.length;
          const secretsByType = transformedSecrets.reduce((acc, secret) => {
            acc[secret.type] = (acc[secret.type] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);
          
          const secretsByVault = transformedSecrets.reduce((acc, secret) => {
            acc[secret.vaultId] = (acc[secret.vaultId] || 0) + 1;
            return acc;
          }, {} as Record<string, number>);

          const now = new Date();
          const expiringSecrets = transformedSecrets.filter(secret => {
            if (!secret.expiresAt) return false;
            const expirationDate = new Date(secret.expiresAt);
            const daysUntilExpiration = (expirationDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
            return daysUntilExpiration <= 30; // Expiring in next 30 days
          }).length;

          const recentlyUpdated = transformedSecrets.filter(secret => {
            const updatedDate = new Date(secret.updatedAt);
            const daysSinceUpdate = (now.getTime() - updatedDate.getTime()) / (1000 * 60 * 60 * 24);
            return daysSinceUpdate <= 7; // Updated in last 7 days
          }).length;

          const calculatedStats: SecretsStats = {
            totalSecrets,
            secretsByType,
            secretsByVault,
            expiringSecrets,
            recentlyUpdated,
          };
          
          setStats(calculatedStats);
          
          logger.info('Secrets loaded successfully', { 
            count: transformedSecrets.length,
            vaultId 
          });
        } else {
          setError(data.error || 'Failed to load secrets');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to load secrets (${response.status})`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      logger.error('Failed to fetch secrets', { error: errorMessage, vaultId });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, user, vaultId]);

  const createSecret = useCallback(async (
    data: CreateSecretData
  ): Promise<{ success: boolean; secret?: Secret; error?: string }> => {
    if (!isAuthenticated || !token || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/secrets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: data.name,
          description: data.description,
          value: data.value,
          type: data.type,
          tags: data.tags || [],
          vaultId: data.vaultId,
          expiresAt: data.expiresAt,
          createdBy: user.id,
        }),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        const newSecret: Secret = {
          id: responseData.data.id,
          name: responseData.data.name,
          description: responseData.data.description,
          value: '***ENCRYPTED***',
          type: responseData.data.type,
          tags: responseData.data.tags || [],
          vaultId: responseData.data.vaultId,
          vaultName: responseData.data.vault?.name,
          expiresAt: responseData.data.expiresAt,
          lastRotated: responseData.data.lastRotated,
          version: responseData.data.version || 1,
          createdAt: responseData.data.createdAt,
          updatedAt: responseData.data.updatedAt,
          createdBy: responseData.data.createdBy,
        };

        // Add to local state
        setSecrets(prev => [newSecret, ...prev]);
        
        // Update stats
        if (stats) {
          setStats(prev => prev ? {
            ...prev,
            totalSecrets: prev.totalSecrets + 1,
            secretsByType: {
              ...prev.secretsByType,
              [newSecret.type]: (prev.secretsByType[newSecret.type] || 0) + 1
            },
            secretsByVault: {
              ...prev.secretsByVault,
              [newSecret.vaultId]: (prev.secretsByVault[newSecret.vaultId] || 0) + 1
            }
          } : null);
        }

        logger.info('Secret created successfully', { secretId: newSecret.id, name: data.name });
        return { success: true, secret: newSecret };
      } else {
        const errorMessage = responseData.error || 'Failed to create secret';
        logger.warn('Secret creation failed', { name: data.name, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      logger.error('Secret creation error', { name: data.name, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, token, user, stats]);

  const updateSecret = useCallback(async (
    secretId: string,
    data: UpdateSecretData
  ): Promise<{ success: boolean; secret?: Secret; error?: string }> => {
    if (!isAuthenticated || !token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`/api/secrets/${secretId}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      });

      const responseData = await response.json();

      if (response.ok && responseData.success) {
        const updatedSecret: Secret = {
          ...secrets.find(s => s.id === secretId)!,
          name: responseData.data.name,
          description: responseData.data.description,
          type: responseData.data.type,
          tags: responseData.data.tags || [],
          expiresAt: responseData.data.expiresAt,
          version: responseData.data.version,
          updatedAt: responseData.data.updatedAt,
        };

        // Update in local state
        setSecrets(prev => prev.map(secret => 
          secret.id === secretId ? updatedSecret : secret
        ));

        logger.info('Secret updated successfully', { secretId });
        return { success: true, secret: updatedSecret };
      } else {
        const errorMessage = responseData.error || 'Failed to update secret';
        logger.warn('Secret update failed', { secretId, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      logger.error('Secret update error', { secretId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, token, secrets]);

  const deleteSecret = useCallback(async (
    secretId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`/api/secrets/${secretId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const secretToDelete = secrets.find(s => s.id === secretId);
        
        // Remove from local state
        setSecrets(prev => prev.filter(secret => secret.id !== secretId));
        
        // Update stats
        if (stats && secretToDelete) {
          setStats(prev => prev ? {
            ...prev,
            totalSecrets: prev.totalSecrets - 1,
            secretsByType: {
              ...prev.secretsByType,
              [secretToDelete.type]: Math.max(0, (prev.secretsByType[secretToDelete.type] || 0) - 1)
            },
            secretsByVault: {
              ...prev.secretsByVault,
              [secretToDelete.vaultId]: Math.max(0, (prev.secretsByVault[secretToDelete.vaultId] || 0) - 1)
            }
          } : null);
        }

        logger.info('Secret deleted successfully', { secretId });
        return { success: true };
      } else {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data.error || 'Failed to delete secret';
        logger.warn('Secret deletion failed', { secretId, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      logger.error('Secret deletion error', { secretId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, token, secrets, stats]);

  const revealSecret = useCallback(async (
    secretId: string
  ): Promise<{ success: boolean; value?: string; error?: string }> => {
    if (!isAuthenticated || !token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`/api/secrets/${secretId}/reveal`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (response.ok && data.success) {
        logger.info('Secret revealed successfully', { secretId });
        return { success: true, value: data.data.decryptedValue };
      } else {
        const errorMessage = data.error || 'Failed to reveal secret';
        logger.warn('Secret reveal failed', { secretId, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      logger.error('Secret reveal error', { secretId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, token]);

  const refreshSecrets = useCallback(async () => {
    setIsLoading(true);
    await fetchSecrets();
  }, [fetchSecrets]);

  const getSecretsByVault = useCallback((vaultId: string): Secret[] => {
    return secrets.filter(secret => secret.vaultId === vaultId);
  }, [secrets]);

  // Load secrets on mount and auth changes
  useEffect(() => {
    fetchSecrets();
  }, [fetchSecrets]);

  return {
    secrets,
    stats,
    isLoading,
    error,
    createSecret,
    updateSecret,
    deleteSecret,
    revealSecret,
    refreshSecrets,
    getSecretsByVault,
  };
} 