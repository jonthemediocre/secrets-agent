#!/usr/bin/env node

/**
 * MCP Discovery Runner Script
 * Runs the enhanced project scanner with MCP discovery capabilities
 * and generates comprehensive reports for Phase 6 implementation
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { createLogger } from '../src/utils/logger';

// Import the enhanced scanner (we'll need to adjust the import path)
const logger = createLogger('MCPDiscoveryRunner');

interface MCPDiscoveryReport {
  executionSummary: {
    timestamp: string;
    totalExecutionTime: number;
    projectsScanned: number;
    mcpProjectsFound: number;
    highValueProjects: number;
  };
  mcpFindings: {
    totalMCPFiles: number;
    totalConfigurations: number;
    totalToolDefinitions: number;
    totalBridgeImplementations: number;
    totalApiEndpoints: number;
    totalCliCommands: number;
  };
  topRecommendations: Array<{
    projectName: string;
    priority: 'high' | 'medium' | 'low';
    integrationType: string;
    description: string;
    files: string[];
    effort: string;
  }>;
  detailedFindings: any;
  implementationPlan: {
    phase1: string[];
    phase2: string[];
    phase3: string[];
  };
}

async function runMCPDiscovery(): Promise<void> {
  const startTime = Date.now();
  logger.info('Starting MCP Discovery across all projects');

  try {
    // Dynamic import to avoid compilation issues
    const { ProjectScanner } = await import('./scan-all-projects');
    
    const scanner = new ProjectScanner();
    await scanner.initialize();
    
    logger.info('Running comprehensive project scan with MCP discovery...');
    const scanReport = await scanner.scanAllProjects();
    
    const executionTime = Date.now() - startTime;
    
    // Generate comprehensive MCP discovery report
    const mcpReport = generateMCPDiscoveryReport(scanReport, executionTime);
    
    // Save reports
    await saveReports(mcpReport, scanReport);
    
    // Display summary
    displaySummary(mcpReport);
    
    logger.info('MCP Discovery completed successfully', {
      executionTime: `${executionTime}ms`,
      projectsWithMCP: scanReport.mcpSummary.projectsWithMCP,
      totalRecommendations: scanReport.mcpSummary.recommendedIntegrations.length
    });

  } catch (error) {
    logger.error('MCP Discovery failed', { error: String(error) });
    process.exit(1);
  }
}

function generateMCPDiscoveryReport(scanReport: any, executionTime: number): MCPDiscoveryReport {
  const mcpSummary = scanReport.mcpSummary;
  
  // Filter high-value projects
  const highValueProjects = scanReport.projects.filter((p: any) => 
    p.mcpDiscovery && p.mcpDiscovery.confidence === 'high'
  );
  
  // Get top recommendations
  const topRecommendations = mcpSummary.recommendedIntegrations
    .slice(0, 10) // Top 10 recommendations
    .map((rec: any) => ({
      projectName: rec.projectName,
      priority: rec.priority,
      integrationType: rec.integrationType,
      description: rec.description,
      files: rec.files,
      effort: rec.effort
    }));
  
  // Generate implementation plan
  const implementationPlan = generateImplementationPlan(mcpSummary.recommendedIntegrations);
  
  return {
    executionSummary: {
      timestamp: new Date().toISOString(),
      totalExecutionTime: executionTime,
      projectsScanned: scanReport.totalProjects,
      mcpProjectsFound: mcpSummary.projectsWithMCP,
      highValueProjects: highValueProjects.length
    },
    mcpFindings: {
      totalMCPFiles: mcpSummary.totalMCPFiles,
      totalConfigurations: mcpSummary.totalMCPConfigurations,
      totalToolDefinitions: mcpSummary.totalMCPTools,
      totalBridgeImplementations: mcpSummary.totalMCPBridges,
      totalApiEndpoints: mcpSummary.totalMCPEndpoints,
      totalCliCommands: mcpSummary.totalMCPCommands
    },
    topRecommendations,
    detailedFindings: scanReport,
    implementationPlan
  };
}

function generateImplementationPlan(recommendations: any[]): {
  phase1: string[];
  phase2: string[];
  phase3: string[];
} {
  const phase1: string[] = [];
  const phase2: string[] = [];
  const phase3: string[] = [];
  
  for (const rec of recommendations) {
    const task = `${rec.integrationType}: ${rec.description} (${rec.projectName})`;
    
    if (rec.priority === 'high' && rec.effort === 'low') {
      phase1.push(task);
    } else if (rec.priority === 'high' || (rec.priority === 'medium' && rec.effort === 'low')) {
      phase2.push(task);
    } else {
      phase3.push(task);
    }
  }
  
  return { phase1, phase2, phase3 };
}

async function saveReports(mcpReport: MCPDiscoveryReport, fullScanReport: any): Promise<void> {
  const reportsDir = './reports';
  
  try {
    await fs.mkdir(reportsDir, { recursive: true });
    
    // Save MCP discovery summary
    const mcpReportPath = join(reportsDir, `mcp-discovery-${Date.now()}.json`);
    await fs.writeFile(mcpReportPath, JSON.stringify(mcpReport, null, 2));
    logger.info(`MCP discovery report saved to: ${mcpReportPath}`);
    
    // Save full scan report
    const fullReportPath = join(reportsDir, `full-scan-${Date.now()}.json`);
    await fs.writeFile(fullReportPath, JSON.stringify(fullScanReport, null, 2));
    logger.info(`Full scan report saved to: ${fullReportPath}`);
    
    // Generate markdown summary
    const markdownReport = generateMarkdownReport(mcpReport);
    const markdownPath = join(reportsDir, `mcp-discovery-summary-${Date.now()}.md`);
    await fs.writeFile(markdownPath, markdownReport);
    logger.info(`Markdown summary saved to: ${markdownPath}`);
    
  } catch (error) {
    logger.error('Failed to save reports', { error: String(error) });
  }
}

function generateMarkdownReport(mcpReport: MCPDiscoveryReport): string {
  const { executionSummary, mcpFindings, topRecommendations, implementationPlan } = mcpReport;
  
  return `# MCP Discovery Report

**Generated:** ${executionSummary.timestamp}  
**Execution Time:** ${executionSummary.totalExecutionTime}ms  

## 📊 Executive Summary

- **Projects Scanned:** ${executionSummary.projectsScanned}
- **Projects with MCP Code:** ${executionSummary.mcpProjectsFound}
- **High-Value MCP Projects:** ${executionSummary.highValueProjects}

## 🔍 MCP Findings Overview

| Component | Count |
|-----------|-------|
| MCP Files | ${mcpFindings.totalMCPFiles} |
| Configurations | ${mcpFindings.totalConfigurations} |
| Tool Definitions | ${mcpFindings.totalToolDefinitions} |
| Bridge Implementations | ${mcpFindings.totalBridgeImplementations} |
| API Endpoints | ${mcpFindings.totalApiEndpoints} |
| CLI Commands | ${mcpFindings.totalCliCommands} |

## 🎯 Top Integration Recommendations

${topRecommendations.map((rec, index) => `
### ${index + 1}. ${rec.projectName} - ${rec.integrationType}

**Priority:** ${rec.priority.toUpperCase()}  
**Effort:** ${rec.effort}  
**Description:** ${rec.description}  

**Files to Review:**
${rec.files.map(file => `- \`${file}\``).join('\n')}
`).join('\n')}

## 🚀 Implementation Plan

### Phase 1: Quick Wins (High Priority, Low Effort)
${implementationPlan.phase1.map(task => `- ${task}`).join('\n')}

### Phase 2: High Impact (High Priority or Medium Priority + Low Effort)
${implementationPlan.phase2.map(task => `- ${task}`).join('\n')}

### Phase 3: Future Enhancements
${implementationPlan.phase3.map(task => `- ${task}`).join('\n')}

## 📋 Next Steps

1. **Review Phase 1 recommendations** - Start with quick wins
2. **Extract configurations** from high-priority projects
3. **Analyze bridge implementations** for adaptation patterns
4. **Plan Phase 6 implementation** based on discovered patterns

---

*This report was generated by the VANTA Secrets Agent MCP Discovery Scanner*
`;
}

function displaySummary(mcpReport: MCPDiscoveryReport): void {
  const { executionSummary, mcpFindings, topRecommendations } = mcpReport;
  
  console.log('\n🔍 MCP DISCOVERY SUMMARY');
  console.log('========================');
  console.log(`📊 Projects Scanned: ${executionSummary.projectsScanned}`);
  console.log(`🎯 MCP Projects Found: ${executionSummary.mcpProjectsFound}`);
  console.log(`⭐ High-Value Projects: ${executionSummary.highValueProjects}`);
  console.log(`⏱️  Execution Time: ${executionSummary.totalExecutionTime}ms`);
  
  console.log('\n📈 MCP COMPONENTS DISCOVERED');
  console.log('============================');
  console.log(`📁 MCP Files: ${mcpFindings.totalMCPFiles}`);
  console.log(`⚙️  Configurations: ${mcpFindings.totalConfigurations}`);
  console.log(`🔧 Tool Definitions: ${mcpFindings.totalToolDefinitions}`);
  console.log(`🌉 Bridge Implementations: ${mcpFindings.totalBridgeImplementations}`);
  console.log(`🔗 API Endpoints: ${mcpFindings.totalApiEndpoints}`);
  console.log(`💻 CLI Commands: ${mcpFindings.totalCliCommands}`);
  
  if (topRecommendations.length > 0) {
    console.log('\n🎯 TOP INTEGRATION OPPORTUNITIES');
    console.log('=================================');
    
    topRecommendations.slice(0, 5).forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.projectName}`);
      console.log(`   ${rec.integrationType}: ${rec.description}`);
      console.log(`   Effort: ${rec.effort} | Files: ${rec.files.length}`);
      console.log('');
    });
  }
  
  console.log('📋 Check the reports/ directory for detailed findings and implementation plans.');
}

// Run the discovery if this script is executed directly
if (require.main === module) {
  runMCPDiscovery().catch(error => {
    console.error('MCP Discovery failed:', error);
    process.exit(1);
  });
}

export { runMCPDiscovery, generateMCPDiscoveryReport }; 