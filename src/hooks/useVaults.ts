import { useState, useEffect, useCallback } from 'react';
import { createLogger } from '../utils/logger';
import { useAuth } from '../contexts/AuthContext';

const logger = createLogger('useVaults');

export interface Vault {
  id: string;
  name: string;
  description?: string;
  secretCount: number;
  lastAccessed?: string;
  status: 'active' | 'maintenance' | 'archived';
  encryption: 'AES-256';
  size: string;
  createdAt: string;
  updatedAt: string;
  ownerId: string;
}

export interface VaultStats {
  totalVaults: number;
  activeSecrets: number;
  accessEvents: number;
  rotations: number;
}

export interface UseVaultsReturn {
  vaults: Vault[];
  stats: VaultStats | null;
  isLoading: boolean;
  error: string | null;
  createVault: (name: string, description?: string) => Promise<{ success: boolean; vault?: Vault; error?: string }>;
  deleteVault: (vaultId: string) => Promise<{ success: boolean; error?: string }>;
  refreshVaults: () => Promise<void>;
}

export function useVaults(): UseVaultsReturn {
  const { user, token, isAuthenticated } = useAuth();
  const [vaults, setVaults] = useState<Vault[]>([]);
  const [stats, setStats] = useState<VaultStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchVaults = useCallback(async () => {
    if (!isAuthenticated || !token || !user) {
      setVaults([]);
      setStats(null);
      setIsLoading(false);
      return;
    }

    try {
      setError(null);
      
      const response = await fetch('/api/vault', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        const data = await response.json();
        
        if (data.success && data.data) {
          const apiVaults = data.data;
          
          // Transform API vaults to UI format
          const transformedVaults: Vault[] = apiVaults.map((vault: any) => ({
            id: vault.id,
            name: vault.name,
            description: vault.description || 'Secure storage container',
            secretCount: vault._count?.secrets || 0,
            lastAccessed: vault.lastAccessed || 'Recently',
            status: 'active' as const,
            encryption: 'AES-256' as const,
            size: `${Math.max(1, Math.round((vault._count?.secrets || 0) * 0.25))} MB`,
            createdAt: vault.createdAt,
            updatedAt: vault.updatedAt,
            ownerId: vault.ownerId,
          }));

          setVaults(transformedVaults);

          // Calculate stats
          const totalSecrets = transformedVaults.reduce((sum, vault) => sum + vault.secretCount, 0);
          const calculatedStats: VaultStats = {
            totalVaults: transformedVaults.length,
            activeSecrets: totalSecrets,
            accessEvents: Math.round(totalSecrets * 3.2), // Estimate based on secrets
            rotations: Math.round(totalSecrets * 0.15), // Estimate
          };
          
          setStats(calculatedStats);
          
          logger.info('Vaults loaded successfully', { 
            count: transformedVaults.length,
            totalSecrets 
          });
        } else {
          setError(data.error || 'Failed to load vaults');
        }
      } else {
        const errorData = await response.json().catch(() => ({}));
        setError(errorData.error || `Failed to load vaults (${response.status})`);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      setError(errorMessage);
      logger.error('Failed to fetch vaults', { error: errorMessage });
    } finally {
      setIsLoading(false);
    }
  }, [isAuthenticated, token, user]);

  const createVault = useCallback(async (
    name: string, 
    description?: string
  ): Promise<{ success: boolean; vault?: Vault; error?: string }> => {
    if (!isAuthenticated || !token || !user) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch('/api/vault', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name,
          description,
          ownerId: user.id,
        }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const newVault: Vault = {
          id: data.data.id,
          name: data.data.name,
          description: data.data.description || 'Secure storage container',
          secretCount: 0,
          lastAccessed: 'Just created',
          status: 'active',
          encryption: 'AES-256',
          size: '0 MB',
          createdAt: data.data.createdAt,
          updatedAt: data.data.updatedAt,
          ownerId: data.data.ownerId,
        };

        // Add to local state
        setVaults(prev => [newVault, ...prev]);
        
        // Update stats
        if (stats) {
          setStats(prev => prev ? { ...prev, totalVaults: prev.totalVaults + 1 } : null);
        }

        logger.info('Vault created successfully', { vaultId: newVault.id, name });
        return { success: true, vault: newVault };
      } else {
        const errorMessage = data.error || 'Failed to create vault';
        logger.warn('Vault creation failed', { name, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      logger.error('Vault creation error', { name, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, token, user, stats]);

  const deleteVault = useCallback(async (
    vaultId: string
  ): Promise<{ success: boolean; error?: string }> => {
    if (!isAuthenticated || !token) {
      return { success: false, error: 'Not authenticated' };
    }

    try {
      const response = await fetch(`/api/vault/${vaultId}`, {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      });

      if (response.ok) {
        // Remove from local state
        setVaults(prev => prev.filter(vault => vault.id !== vaultId));
        
        // Update stats
        if (stats) {
          setStats(prev => prev ? { ...prev, totalVaults: prev.totalVaults - 1 } : null);
        }

        logger.info('Vault deleted successfully', { vaultId });
        return { success: true };
      } else {
        const data = await response.json().catch(() => ({}));
        const errorMessage = data.error || 'Failed to delete vault';
        logger.warn('Vault deletion failed', { vaultId, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Network error';
      logger.error('Vault deletion error', { vaultId, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  }, [isAuthenticated, token, stats]);

  const refreshVaults = useCallback(async () => {
    setIsLoading(true);
    await fetchVaults();
  }, [fetchVaults]);

  // Load vaults on mount and auth changes
  useEffect(() => {
    fetchVaults();
  }, [fetchVaults]);

  return {
    vaults,
    stats,
    isLoading,
    error,
    createVault,
    deleteVault,
    refreshVaults,
  };
} 