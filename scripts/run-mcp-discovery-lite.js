#!/usr/bin/env node

/**
 * MCP Discovery Lite - Memory-efficient scanner
 * Scans for MCP-related code with memory optimization
 */

const fs = require('fs').promises;
const path = require('path');

const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};

class LiteMCPScanner {
  constructor(projectsBaseDir = 'C:\\Users\\Jonbr\\pinokio\\api') {
    this.projectsBaseDir = projectsBaseDir;
    this.mcpPatterns = [
      /\bmcp\b/gi,
      /\bMCP\b/g,
      /bridge/gi,
      /tool.*execution/gi,
      /agent.*communication/gi
    ];
    this.maxFilesPerProject = 100; // Limit files per project
    this.maxFileSize = 1024 * 1024; // 1MB max file size
  }

  async scanAllProjects() {
    const startTime = Date.now();
    logger.info('Starting lite MCP Discovery scan');

    try {
      const projectDirs = await this.discoverProjects();
      logger.info(`Discovered ${projectDirs.length} potential projects`);

      const results = {
        timestamp: new Date().toISOString(),
        executionTime: 0,
        totalProjects: projectDirs.length,
        projectsScanned: 0,
        projectsWithMCP: 0,
        topFindings: []
      };

      // Process projects in batches to manage memory
      const batchSize = 5;
      for (let i = 0; i < projectDirs.length; i += batchSize) {
        const batch = projectDirs.slice(i, i + batchSize);
        
        for (const projectPath of batch) {
          try {
            const projectName = path.basename(projectPath);
            logger.info(`Scanning project: ${projectName} (${i + 1}/${projectDirs.length})`);
            
            const mcpFiles = await this.scanProjectForMCP(projectPath, projectName);
            results.projectsScanned++;
            
            if (mcpFiles.length > 0) {
              results.projectsWithMCP++;
              
              const finding = {
                projectName,
                mcpFileCount: mcpFiles.length,
                totalReferences: mcpFiles.reduce((sum, f) => sum + f.mcpReferences, 0),
                priority: this.calculatePriority(mcpFiles),
                topFiles: mcpFiles.slice(0, 5) // Keep only top 5 files
              };
              
              results.topFindings.push(finding);
              
              // Log interesting findings immediately
              if (finding.priority === 'high') {
                logger.info(`🎯 HIGH PRIORITY: ${projectName} - ${mcpFiles.length} MCP files, ${finding.totalReferences} references`);
              }
            }
            
            // Force garbage collection periodically
            if (global.gc && (i % 10 === 0)) {
              global.gc();
            }
            
          } catch (error) {
            logger.warn(`Failed to scan project: ${path.basename(projectPath)}`, error.message);
          }
        }
        
        // Small delay between batches
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      results.executionTime = Date.now() - startTime;
      
      // Sort findings by priority and reference count
      results.topFindings.sort((a, b) => {
        const priorityOrder = { high: 3, medium: 2, low: 1 };
        const priorityDiff = priorityOrder[b.priority] - priorityOrder[a.priority];
        return priorityDiff !== 0 ? priorityDiff : b.totalReferences - a.totalReferences;
      });
      
      // Save and display results
      await this.saveResults(results);
      this.displayResults(results);

      return results;

    } catch (error) {
      logger.error('MCP Discovery failed', error.message);
      throw error;
    }
  }

  async discoverProjects() {
    const projectDirs = [];
    
    try {
      const entries = await fs.readdir(this.projectsBaseDir, { withFileTypes: true });
      
      for (const entry of entries) {
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          projectDirs.push(path.join(this.projectsBaseDir, entry.name));
        }
      }
    } catch (error) {
      logger.error('Failed to read projects directory', error.message);
      throw error;
    }

    return projectDirs;
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', '.next', 
      'coverage', '.nyc_output', 'temp', 'tmp', 'cache'
    ];
    return dirName.startsWith('.') || skipDirs.includes(dirName.toLowerCase());
  }

  async scanProjectForMCP(projectPath, projectName) {
    const mcpFiles = [];
    let filesScanned = 0;
    
    try {
      const allFiles = await this.getTopLevelFiles(projectPath);
      
      for (const filePath of allFiles) {
        if (filesScanned >= this.maxFilesPerProject) {
          break;
        }
        
        const relativePath = filePath.replace(projectPath, '').replace(/^[\\\/]/, '');
        
        if (this.shouldSkipFile(relativePath)) {
          continue;
        }

        try {
          const stats = await fs.stat(filePath);
          if (stats.size > this.maxFileSize) {
            continue; // Skip large files
          }
          
          const content = await fs.readFile(filePath, 'utf-8');
          const mcpReferences = this.countMCPReferences(content);
          
          if (mcpReferences > 0) {
            mcpFiles.push({
              relativePath,
              mcpReferences,
              fileSize: stats.size,
              preview: this.extractPreview(content, 150)
            });
          }
          
          filesScanned++;
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }
    } catch (error) {
      logger.warn(`Failed to scan project ${projectName}`, error.message);
    }

    return mcpFiles.sort((a, b) => b.mcpReferences - a.mcpReferences);
  }

  async getTopLevelFiles(dirPath, maxDepth = 2, currentDepth = 0) {
    const files = [];
    
    if (currentDepth >= maxDepth) {
      return files;
    }
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          const subFiles = await this.getTopLevelFiles(fullPath, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
        
        // Limit total files to prevent memory issues
        if (files.length > this.maxFilesPerProject) {
          break;
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    
    return files;
  }

  shouldSkipFile(relativePath) {
    const skipPatterns = [
      /node_modules/,
      /\.git/,
      /dist/,
      /build/,
      /coverage/,
      /\.log$/,
      /\.lock$/,
      /package-lock\.json$/,
      /yarn\.lock$/,
      /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|tar|gz)$/
    ];
    
    return skipPatterns.some(pattern => pattern.test(relativePath));
  }

  countMCPReferences(content) {
    let count = 0;
    
    for (const pattern of this.mcpPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        count += matches.length;
      }
    }
    
    return count;
  }

  extractPreview(content, maxLength) {
    const lines = content.split('\n');
    const relevantLines = [];
    
    for (const line of lines) {
      if (this.countMCPReferences(line) > 0) {
        relevantLines.push(line.trim());
        
        if (relevantLines.join('\n').length > maxLength) {
          break;
        }
      }
      
      if (relevantLines.length > 5) { // Limit to 5 lines max
        break;
      }
    }
    
    const result = relevantLines.join('\n');
    return result.length > maxLength ? result.substring(0, maxLength) + '...' : result;
  }

  calculatePriority(mcpFiles) {
    const totalReferences = mcpFiles.reduce((sum, f) => sum + f.mcpReferences, 0);
    const fileCount = mcpFiles.length;
    
    if (totalReferences > 20 || fileCount > 10) return 'high';
    if (totalReferences > 5 || fileCount > 3) return 'medium';
    return 'low';
  }

  async saveResults(results) {
    try {
      await fs.mkdir('./reports', { recursive: true });
      
      const timestamp = Date.now();
      const jsonPath = path.join('./reports', `mcp-discovery-lite-${timestamp}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
      logger.info(`Results saved to: ${jsonPath}`);
      
      // Generate markdown report
      const markdownReport = this.generateMarkdownReport(results);
      const markdownPath = path.join('./reports', `mcp-discovery-lite-${timestamp}.md`);
      await fs.writeFile(markdownPath, markdownReport);
      logger.info(`Markdown report saved to: ${markdownPath}`);
      
    } catch (error) {
      logger.error('Failed to save results', error.message);
    }
  }

  generateMarkdownReport(results) {
    return `# MCP Discovery Report (Lite)

**Generated:** ${results.timestamp}  
**Execution Time:** ${results.executionTime}ms  

## 📊 Summary

- **Projects Discovered:** ${results.totalProjects}
- **Projects Scanned:** ${results.projectsScanned}
- **Projects with MCP Code:** ${results.projectsWithMCP}

## 🎯 Top MCP Projects

${results.topFindings.slice(0, 10).map((finding, index) => `
### ${index + 1}. ${finding.projectName}

**Priority:** ${finding.priority.toUpperCase()}  
**MCP Files:** ${finding.mcpFileCount}  
**Total References:** ${finding.totalReferences}  

**Top Files:**
${finding.topFiles.map(file => `- \`${file.relativePath}\` (${file.mcpReferences} refs)`).join('\n')}
`).join('\n')}

## 📋 Implementation Recommendations

### High Priority Projects
${results.topFindings.filter(f => f.priority === 'high').map(f => `- **${f.projectName}**: ${f.totalReferences} MCP references across ${f.mcpFileCount} files`).join('\n')}

### Medium Priority Projects  
${results.topFindings.filter(f => f.priority === 'medium').map(f => `- **${f.projectName}**: ${f.totalReferences} MCP references across ${f.mcpFileCount} files`).join('\n')}

## 🔄 Next Steps

1. **Focus on high-priority projects** for immediate investigation
2. **Examine specific files** with the most MCP references
3. **Extract patterns and configurations** for Phase 6 implementation
4. **Plan detailed analysis** of promising projects

---

*Generated by VANTA Secrets Agent MCP Discovery Scanner (Lite)*
`;
  }

  displayResults(results) {
    console.log('\n🔍 MCP DISCOVERY RESULTS (LITE)');
    console.log('===============================');
    console.log(`📊 Projects Discovered: ${results.totalProjects}`);
    console.log(`🔍 Projects Scanned: ${results.projectsScanned}`);
    console.log(`🎯 Projects with MCP: ${results.projectsWithMCP}`);
    console.log(`⏱️  Execution Time: ${results.executionTime}ms`);
    
    if (results.topFindings.length > 0) {
      console.log('\n🎯 TOP MCP PROJECTS');
      console.log('===================');
      
      results.topFindings.slice(0, 10).forEach((finding, index) => {
        console.log(`${index + 1}. [${finding.priority.toUpperCase()}] ${finding.projectName}`);
        console.log(`   Files: ${finding.mcpFileCount} | References: ${finding.totalReferences}`);
        if (finding.topFiles.length > 0) {
          console.log(`   Top file: ${finding.topFiles[0].relativePath} (${finding.topFiles[0].mcpReferences} refs)`);
        }
        console.log('');
      });
    }
    
    console.log('📋 Check the reports/ directory for detailed findings.');
  }
}

// Run the discovery
async function runDiscovery() {
  try {
    const scanner = new LiteMCPScanner();
    await scanner.scanAllProjects();
  } catch (error) {
    console.error('Discovery failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runDiscovery();
}

module.exports = { LiteMCPScanner }; 