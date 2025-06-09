import { createLogger } from '../utils/logger';
import AgentBridge from './AgentBridge';
import { PrismaClient } from '@prisma/client';

const logger = createLogger('AuthAgentService');
const prisma = new PrismaClient();

export interface ThreatAssessment {
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: number;
  indicators: string[];
  recommendations: string[];
  shouldBlock: boolean;
}

export interface LoginAnalysis {
  isAnomaly: boolean;
  geoLocation: {
    suspicious: boolean;
    country?: string;
    previousLocations: string[];
  };
  deviceFingerprint: {
    isKnown: boolean;
    riskScore: number;
  };
  behaviorPattern: {
    isNormal: boolean;
    deviations: string[];
  };
}

export class AuthAgentService {
  private agentBridge: AgentBridge;

  constructor() {
    this.agentBridge = new AgentBridge();
  }

  /**
   * Agent-based threat assessment for login attempts
   */
  async assessLoginThreat(loginData: {
    email: string;
    ipAddress: string;
    userAgent: string;
    timestamp: Date;
  }): Promise<ThreatAssessment> {
    logger.info('Assessing login threat with agent analysis', { email: loginData.email, ip: loginData.ipAddress });

    // Get agent system status for analysis
    const agentStatus = await this.agentBridge.getAgentStatus();
    
    // Simulate agent-based threat analysis
    const assessment: ThreatAssessment = {
      riskLevel: 'low',
      confidence: 0.85,
      indicators: [],
      recommendations: [],
      shouldBlock: false
    };

    // Check for suspicious patterns
    if (await this.isHighRiskIP(loginData.ipAddress)) {
      assessment.riskLevel = 'high';
      assessment.indicators.push('High-risk IP address detected');
      assessment.recommendations.push('Require additional verification');
    }

    // Check login frequency
    const recentAttempts = await this.getRecentLoginAttempts(loginData.email);
    if (recentAttempts > 5) {
      assessment.riskLevel = 'medium';
      assessment.indicators.push('Multiple recent login attempts');
      assessment.recommendations.push('Rate limiting recommended');
    }

    // Check for unusual timing
    if (this.isUnusualTime(loginData.timestamp)) {
      assessment.indicators.push('Login attempt outside normal hours');
    }

    // Determine if should block
    if (assessment.riskLevel === 'critical' || 
        (assessment.riskLevel === 'high' && assessment.confidence > 0.9)) {
      assessment.shouldBlock = true;
      assessment.recommendations.unshift('Block login attempt');
    }

    return assessment;
  }

  /**
   * Analyze login behavior patterns
   */
  async analyzeLoginBehavior(userId: string, loginData: any): Promise<LoginAnalysis> {
    const analysis: LoginAnalysis = {
      isAnomaly: false,
      geoLocation: {
        suspicious: false,
        previousLocations: ['US', 'CA']
      },
      deviceFingerprint: {
        isKnown: true,
        riskScore: 0.2
      },
      behaviorPattern: {
        isNormal: true,
        deviations: []
      }
    };

    // Check for geo-location anomalies
    const userHistory = await this.getUserLoginHistory(userId);
    if (userHistory.locations && !userHistory.locations.includes(loginData.country)) {
      analysis.geoLocation.suspicious = true;
      analysis.isAnomaly = true;
      analysis.behaviorPattern.deviations.push('New geographic location');
    }

    // Check device fingerprint
    if (!userHistory.devices?.includes(loginData.deviceFingerprint)) {
      analysis.deviceFingerprint.isKnown = false;
      analysis.deviceFingerprint.riskScore = 0.7;
      analysis.behaviorPattern.deviations.push('New device detected');
    }

    return analysis;
  }

  /**
   * Enhanced login with agent validation
   */
  async enhancedLogin(credentials: {
    email: string;
    password: string;
    ipAddress: string;
    userAgent: string;
  }): Promise<{
    success: boolean;
    user?: any;
    threatAssessment: ThreatAssessment;
    analysis: LoginAnalysis;
    requiresAdditionalAuth?: boolean;
  }> {
    // Perform threat assessment
    const threatAssessment = await this.assessLoginThreat({
      email: credentials.email,
      ipAddress: credentials.ipAddress,
      userAgent: credentials.userAgent,
      timestamp: new Date()
    });

    // Block if high threat
    if (threatAssessment.shouldBlock) {
      logger.warn('Login blocked by agent threat assessment', { 
        email: credentials.email, 
        riskLevel: threatAssessment.riskLevel 
      });
      
      return {
        success: false,
        threatAssessment,
        analysis: {
          isAnomaly: true,
          geoLocation: { suspicious: true, previousLocations: [] },
          deviceFingerprint: { isKnown: false, riskScore: 1.0 },
          behaviorPattern: { isNormal: false, deviations: ['Blocked by threat assessment'] }
        }
      };
    }

    // Attempt regular login (simplified for demo)
    const user = await this.validateCredentials(credentials.email, credentials.password);
    
    if (!user) {
      return {
        success: false,
        threatAssessment,
        analysis: {
          isAnomaly: false,
          geoLocation: { suspicious: false, previousLocations: [] },
          deviceFingerprint: { isKnown: true, riskScore: 0.1 },
          behaviorPattern: { isNormal: true, deviations: [] }
        }
      };
    }

    // Analyze behavior patterns
    const analysis = await this.analyzeLoginBehavior(user.id, {
      country: 'US', // Would extract from IP
      deviceFingerprint: credentials.userAgent
    });

    // Log successful login with agent data
    await this.logLoginAttempt({
      userId: user.id,
      success: true,
      ipAddress: credentials.ipAddress,
      threatLevel: threatAssessment.riskLevel,
      agentAnalysis: analysis
    });

    return {
      success: true,
      user,
      threatAssessment,
      analysis,
      requiresAdditionalAuth: threatAssessment.riskLevel === 'high'
    };
  }

  /**
   * Check if IP is high risk
   */
  private async isHighRiskIP(ipAddress: string): Promise<boolean> {
    // Simulate checking against threat intelligence
    const highRiskPatterns = ['192.168.', '10.0.', '172.16.'];
    return highRiskPatterns.some(pattern => ipAddress.startsWith(pattern)) && 
           Math.random() > 0.9; // Simulate occasional high-risk detection
  }

  /**
   * Get recent login attempts
   */
  private async getRecentLoginAttempts(email: string): Promise<number> {
    try {
      const user = await prisma.user.findUnique({ where: { email } });
      if (!user) return 0;

      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const attempts = await prisma.loginAttempt.count({
        where: {
          userId: user.id,
          timestamp: {
            gte: twentyFourHoursAgo
          }
        }
      });

      return attempts;
    } catch (error) {
      logger.warn('Failed to get recent login attempts:', error);
      return 0;
    }
  }

  /**
   * Check if login time is unusual
   */
  private isUnusualTime(timestamp: Date): boolean {
    const hour = timestamp.getHours();
    return hour < 6 || hour > 22; // Outside 6 AM - 10 PM
  }

  /**
   * Get user login history
   */
  private async getUserLoginHistory(userId: string): Promise<{
    locations?: string[];
    devices?: string[];
  }> {
    try {
      const history = await prisma.loginAttempt.findMany({
        where: { userId, success: true },
        take: 50,
        orderBy: { timestamp: 'desc' }
      });

      return {
        locations: [...new Set(history.map(h => h.location).filter(Boolean))],
        devices: [...new Set(history.map(h => h.userAgent).filter(Boolean))]
      };
    } catch (error) {
      logger.warn('Failed to get user login history:', error);
      return {};
    }
  }

  /**
   * Validate user credentials
   */
  private async validateCredentials(email: string, password: string): Promise<any> {
    try {
      const user = await prisma.user.findUnique({
        where: { email },
        select: {
          id: true,
          email: true,
          passwordHash: true,
          role: true
        }
      });

      if (!user) return null;

      // Simplified password check (would use proper hashing in production)
      if (password === 'password123' || password === 'demo') {
        return {
          id: user.id,
          email: user.email,
          role: user.role
        };
      }

      return null;
    } catch (error) {
      logger.error('Credential validation failed:', error);
      return null;
    }
  }

  /**
   * Log login attempt with agent analysis
   */
  private async logLoginAttempt(data: {
    userId: string;
    success: boolean;
    ipAddress: string;
    threatLevel: string;
    agentAnalysis: LoginAnalysis;
  }): Promise<void> {
    try {
      await prisma.loginAttempt.create({
        data: {
          userId: data.userId,
          success: data.success,
          ipAddress: data.ipAddress,
          userAgent: 'agent-enhanced',
          location: 'US', // Would extract from IP
          timestamp: new Date(),
          metadata: JSON.stringify({
            threatLevel: data.threatLevel,
            agentAnalysis: data.agentAnalysis
          })
        }
      });
    } catch (error) {
      logger.warn('Failed to log login attempt:', error);
    }
  }
}

export default AuthAgentService; 