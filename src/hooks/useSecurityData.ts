import { useState, useEffect } from 'react';

export interface SecurityData {
  overview: {
    totalUsers: number;
    totalVaults: number;
    totalSecrets: number;
    activeVaults: number;
    utilizationRate: number;
  };
  security: {
    threatLevel: {
      level: string;
      count: number;
      status: 'low' | 'medium' | 'high' | 'critical';
    };
    vulnerabilities: {
      count: number;
      status: 'normal' | 'attention' | 'warning';
      issues: string[];
    };
    secureConnections: number;
    accessReviews: number;
    healthScore: number;
  };
  activity: {
    last24Hours: {
      newUsers: number;
      newSecrets: number;
      vaultActivity: number;
    };
    timeline: Array<{
      date: string;
      type: string;
      count: number;
    }>;
    vaultDistribution: Array<{
      vaultName: string;
      secretCount: number;
    }>;
  };
  realTimeAlerts: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    timestamp: string;
    active: boolean;
  }>;
  timestamp: string;
}

export interface LoginAttemptsData {
  timeframe: string;
  since: string;
  statistics: {
    totalAttempts: number;
    failedAttempts: number;
    successfulAttempts: number;
    successRate: number;
    uniqueEmails: number;
    blockedAccounts: number;
    failureRate: number;
  };
  suspiciousActivities: Array<{
    email: string;
    attempts: number;
    lastAttempt: string;
    blocked: boolean;
    severity: string;
  }>;
  securityAlerts: Array<{
    id: string;
    type: string;
    title: string;
    message: string;
    severity: string;
    timestamp: string;
  }>;
  activeBlocks: Array<{
    email: string;
    blockedAt: string;
    expiresAt: string;
    attempts: number;
  }>;
}

export function useSecurityData() {
  const [data, setData] = useState<SecurityData | null>(null);
  const [loginData, setLoginData] = useState<LoginAttemptsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchSecurityData = async () => {
    try {
      setLoading(true);
      
      // Fetch both monitoring stats and login attempts in parallel
      const [statsResponse, loginResponse] = await Promise.all([
        fetch('/api/monitoring/stats'),
        fetch('/api/monitoring/login-attempts?timeframe=24h')
      ]);

      if (!statsResponse.ok) {
        throw new Error(`Stats API failed: ${statsResponse.status}`);
      }

      if (!loginResponse.ok) {
        throw new Error(`Login attempts API failed: ${loginResponse.status}`);
      }

      const statsData = await statsResponse.json();
      const loginAttemptsData = await loginResponse.json();

      if (statsData.success) {
        setData(statsData.data);
      } else {
        throw new Error(statsData.error || 'Failed to fetch security stats');
      }

      if (loginAttemptsData.success) {
        setLoginData(loginAttemptsData.data);
      } else {
        throw new Error(loginAttemptsData.error || 'Failed to fetch login attempts');
      }

      setError(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      console.error('Failed to fetch security data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSecurityData();
    
    // Refresh data every 30 seconds
    const interval = setInterval(fetchSecurityData, 30000);
    
    return () => clearInterval(interval);
  }, []);

  return {
    data,
    loginData,
    loading,
    error,
    refresh: fetchSecurityData
  };
}

export default useSecurityData; 