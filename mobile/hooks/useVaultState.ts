
import { useState, useEffect, useCallback } from 'react';
import { vaultService } from '@/services/vaultService';
import type { VaultStatus } from '@/types/vault';

export function useVaultState() {
  const [isVaultOpen, setIsVaultOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [vaultStatus, setVaultStatus] = useState<VaultStatus>('closed');

  const openVault = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await vaultService.open();
      setIsVaultOpen(true);
      setVaultStatus('open');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to open vault');
      setVaultStatus('error');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const closeVault = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      await vaultService.close();
      setIsVaultOpen(false);
      setVaultStatus('closed');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to close vault');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const refreshStatus = useCallback(async () => {
    try {
      const status = await vaultService.getStatus();
      setVaultStatus(status);
      setIsVaultOpen(status === 'open');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to refresh status');
    }
  }, []);

  useEffect(() => {
    refreshStatus();
    
    // Auto-refresh every 30 seconds
    const interval = setInterval(refreshStatus, 30000);
    return () => clearInterval(interval);
  }, [refreshStatus]);

  return {
    isVaultOpen,
    isLoading,
    error,
    vaultStatus,
    openVault,
    closeVault,
    refreshStatus,
  };
}