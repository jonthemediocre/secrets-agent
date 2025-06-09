import { useState, useEffect } from 'react';

export function useVault() {
  const [vaultStatus, setvaultStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshVault();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshVault = async () => {
    setLoading(true);
    try {
      // Fetch ${hook_type} data
      const response = await fetch('/api/vault/status');
      const data = await response.json();
      setvaultStatus(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { vaultStatus, loading, error, refresh: refreshVault };
}