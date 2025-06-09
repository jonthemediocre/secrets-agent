export const SECURITY_LEVELS = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
  CRITICAL: 'critical'
} as const;

export const THREAT_TYPES = {
  UNAUTHORIZED_ACCESS: 'unauthorized_access',
  DATA_BREACH: 'data_breach',
  MALWARE: 'malware',
  PHISHING: 'phishing'
} as const;