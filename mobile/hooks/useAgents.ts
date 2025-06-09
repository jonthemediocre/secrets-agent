import { useState, useEffect } from 'react';

export function useAgents() {
  const [agents, setagents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto-refresh every 30 seconds
    const interval = setInterval(() => {
      refreshAgents();
    }, 30000);
    
    return () => clearInterval(interval);
  }, []);

  const refreshAgents = async () => {
    setLoading(true);
    try {
      // Fetch ${hook_type} data
      const response = await fetch('/api/agents');
      const data = await response.json();
      setagents(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  return { agents, loading, error, refresh: refreshAgents };
}