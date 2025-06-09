import { createLogger } from '../utils/logger';
import AgentBridge from './AgentBridge';
import { PrismaClient } from '@prisma/client';

const logger = createLogger('ComplianceAgentService');
const prisma = new PrismaClient();

export interface ComplianceFramework {
  name: string;
  version: string;
  requirements: ComplianceRequirement[];
}

export interface ComplianceRequirement {
  id: string;
  title: string;
  description: string;
  category: 'encryption' | 'access_control' | 'audit' | 'data_retention' | 'backup';
  severity: 'low' | 'medium' | 'high' | 'critical';
  automated: boolean;
}

export interface ComplianceReport {
  framework: string;
  overallScore: number;
  status: 'compliant' | 'non_compliant' | 'partial';
  findings: ComplianceFinding[];
  recommendations: string[];
  nextAuditDate: string;
  generatedAt: string;
}

export interface ComplianceFinding {
  requirementId: string;
  status: 'pass' | 'fail' | 'warning';
  evidence?: string;
  remediation?: string;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
}

export class ComplianceAgentService {
  private agentBridge: AgentBridge;
  private supportedFrameworks: ComplianceFramework[];

  constructor() {
    this.agentBridge = new AgentBridge();
    this.initializeFrameworks();
  }

  /**
   * Initialize supported compliance frameworks
   */
  private initializeFrameworks(): void {
    this.supportedFrameworks = [
      {
        name: 'SOC 2 Type II',
        version: '2024',
        requirements: [
          {
            id: 'CC6.1',
            title: 'Logical and Physical Access Controls',
            description: 'Controls provide reasonable assurance that access to data and system resources is restricted to authorized users',
            category: 'access_control',
            severity: 'high',
            automated: true
          },
          {
            id: 'CC6.7',
            title: 'Data Transmission and Disposal',
            description: 'Data is protected during transmission and disposal',
            category: 'encryption',
            severity: 'high',
            automated: true
          },
          {
            id: 'CC7.2',
            title: 'System Monitoring',
            description: 'System monitoring provides reasonable assurance that unauthorized access is prevented or detected',
            category: 'audit',
            severity: 'medium',
            automated: true
          }
        ]
      },
      {
        name: 'ISO 27001',
        version: '2022',
        requirements: [
          {
            id: 'A.8.2.3',
            title: 'Information handling procedures',
            description: 'Procedures for handling information shall be developed and implemented',
            category: 'data_retention',
            severity: 'medium',
            automated: false
          },
          {
            id: 'A.10.1.1',
            title: 'Cryptographic controls',
            description: 'Policy on the use of cryptographic controls for protection of information',
            category: 'encryption',
            severity: 'high',
            automated: true
          }
        ]
      }
    ];
  }

  /**
   * Generate automated compliance report
   */
  async generateComplianceReport(framework: string = 'SOC 2 Type II'): Promise<ComplianceReport> {
    logger.info(`Generating compliance report for ${framework}`);

    const frameworkConfig = this.supportedFrameworks.find(f => f.name === framework);
    if (!frameworkConfig) {
      throw new Error(`Unsupported compliance framework: ${framework}`);
    }

    // Use agent system for automated compliance checking
    const agentStatus = await this.agentBridge.getAgentStatus();
    
    const findings: ComplianceFinding[] = [];
    
    // Check each requirement
    for (const requirement of frameworkConfig.requirements) {
      const finding = await this.assessRequirement(requirement);
      findings.push(finding);
    }

    // Calculate overall score
    const passCount = findings.filter(f => f.status === 'pass').length;
    const totalCount = findings.length;
    const overallScore = Math.round((passCount / totalCount) * 100);

    // Determine status
    let status: 'compliant' | 'non_compliant' | 'partial' = 'compliant';
    if (overallScore < 70) {
      status = 'non_compliant';
    } else if (overallScore < 90) {
      status = 'partial';
    }

    const report: ComplianceReport = {
      framework,
      overallScore,
      status,
      findings,
      recommendations: this.generateRecommendations(findings),
      nextAuditDate: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000).toISOString(), // 90 days
      generatedAt: new Date().toISOString()
    };

    // Store report
    await this.storeComplianceReport(report);

    return report;
  }

  /**
   * Assess individual compliance requirement
   */
  private async assessRequirement(requirement: ComplianceRequirement): Promise<ComplianceFinding> {
    if (!requirement.automated) {
      return {
        requirementId: requirement.id,
        status: 'warning',
        evidence: 'Manual assessment required',
        riskLevel: 'medium'
      };
    }

    // Agent-based automated assessment
    switch (requirement.category) {
      case 'encryption':
        return await this.assessEncryptionCompliance(requirement);
      case 'access_control':
        return await this.assessAccessControlCompliance(requirement);
      case 'audit':
        return await this.assessAuditCompliance(requirement);
      case 'data_retention':
        return await this.assessDataRetentionCompliance(requirement);
      case 'backup':
        return await this.assessBackupCompliance(requirement);
      default:
        return {
          requirementId: requirement.id,
          status: 'warning',
          evidence: 'Assessment not implemented',
          riskLevel: 'medium'
        };
    }
  }

  /**
   * Assess encryption compliance
   */
  private async assessEncryptionCompliance(requirement: ComplianceRequirement): Promise<ComplianceFinding> {
    try {
      // Check vault encryption
      const vaults = await prisma.vault.findMany({
        select: { id: true, encryptionKey: true }
      });

      const unencryptedVaults = vaults.filter(v => !v.encryptionKey);
      
      if (unencryptedVaults.length > 0) {
        return {
          requirementId: requirement.id,
          status: 'fail',
          evidence: `${unencryptedVaults.length} vaults without encryption`,
          remediation: 'Enable encryption for all vaults',
          riskLevel: 'high'
        };
      }

      return {
        requirementId: requirement.id,
        status: 'pass',
        evidence: 'All vaults are encrypted',
        riskLevel: 'low'
      };
    } catch (error) {
      logger.error('Encryption compliance check failed:', error);
      return {
        requirementId: requirement.id,
        status: 'fail',
        evidence: 'Assessment failed',
        riskLevel: 'high'
      };
    }
  }

  /**
   * Assess access control compliance
   */
  private async assessAccessControlCompliance(requirement: ComplianceRequirement): Promise<ComplianceFinding> {
    try {
      // Check user access patterns
      const users = await prisma.user.findMany({
        include: { vaults: true }
      });

      const adminUsers = users.filter(u => u.role === 'admin');
      
      if (adminUsers.length === 0) {
        return {
          requirementId: requirement.id,
          status: 'fail',
          evidence: 'No admin users found',
          remediation: 'Assign admin role to authorized users',
          riskLevel: 'critical'
        };
      }

      return {
        requirementId: requirement.id,
        status: 'pass',
        evidence: `${adminUsers.length} admin users configured`,
        riskLevel: 'low'
      };
    } catch (error) {
      logger.error('Access control compliance check failed:', error);
      return {
        requirementId: requirement.id,
        status: 'fail',
        evidence: 'Assessment failed',
        riskLevel: 'high'
      };
    }
  }

  /**
   * Assess audit compliance
   */
  private async assessAuditCompliance(requirement: ComplianceRequirement): Promise<ComplianceFinding> {
    // For audit compliance, check if monitoring is enabled
    const agentStatus = await this.agentBridge.getAgentStatus();
    
    if (agentStatus.agentSystemStatus === 'ready' && agentStatus.statistics.secretsManaged > 0) {
      return {
        requirementId: requirement.id,
        status: 'pass',
        evidence: 'Agent monitoring system active',
        riskLevel: 'low'
      };
    }

    return {
      requirementId: requirement.id,
      status: 'fail',
      evidence: 'Monitoring system not active',
      remediation: 'Enable continuous monitoring',
      riskLevel: 'medium'
    };
  }

  /**
   * Assess data retention compliance
   */
  private async assessDataRetentionCompliance(requirement: ComplianceRequirement): Promise<ComplianceFinding> {
    // Check for data retention policies
    return {
      requirementId: requirement.id,
      status: 'warning',
      evidence: 'Data retention policy assessment not automated',
      remediation: 'Implement automated data retention checks',
      riskLevel: 'medium'
    };
  }

  /**
   * Assess backup compliance
   */
  private async assessBackupCompliance(requirement: ComplianceRequirement): Promise<ComplianceFinding> {
    // Check backup configuration
    return {
      requirementId: requirement.id,
      status: 'warning',
      evidence: 'Backup compliance assessment not automated',
      remediation: 'Implement automated backup verification',
      riskLevel: 'medium'
    };
  }

  /**
   * Generate recommendations based on findings
   */
  private generateRecommendations(findings: ComplianceFinding[]): string[] {
    const recommendations: string[] = [];
    
    const failedFindings = findings.filter(f => f.status === 'fail');
    const warningFindings = findings.filter(f => f.status === 'warning');
    
    if (failedFindings.length > 0) {
      recommendations.push(`Address ${failedFindings.length} failed compliance requirements immediately`);
    }
    
    if (warningFindings.length > 0) {
      recommendations.push(`Review ${warningFindings.length} requirements requiring manual assessment`);
    }
    
    recommendations.push('Schedule quarterly compliance reviews');
    recommendations.push('Implement automated remediation where possible');
    
    return recommendations;
  }

  /**
   * Store compliance report
   */
  private async storeComplianceReport(report: ComplianceReport): Promise<void> {
    try {
      logger.info(`Storing compliance report for ${report.framework}`, {
        score: report.overallScore,
        status: report.status
      });
      
      // In a real implementation, this would store to database
      // For now, we'll just log it
      
    } catch (error) {
      logger.error('Failed to store compliance report:', error);
    }
  }

  /**
   * Get supported frameworks
   */
  getSupportedFrameworks(): ComplianceFramework[] {
    return this.supportedFrameworks;
  }

  /**
   * Continuous compliance monitoring
   */
  async startContinuousMonitoring(): Promise<void> {
    logger.info('Starting continuous compliance monitoring');
    
    // Run compliance checks every 24 hours
    setInterval(async () => {
      try {
        for (const framework of this.supportedFrameworks) {
          const report = await this.generateComplianceReport(framework.name);
          
          if (report.status === 'non_compliant') {
            logger.warn(`Compliance violation detected for ${framework.name}`, {
              score: report.overallScore,
              criticalFindings: report.findings.filter(f => f.riskLevel === 'critical').length
            });
          }
        }
      } catch (error) {
        logger.error('Continuous compliance monitoring failed:', error);
      }
    }, 24 * 60 * 60 * 1000); // 24 hours
  }
}

export default ComplianceAgentService; 