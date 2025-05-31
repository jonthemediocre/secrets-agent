#!/usr/bin/env node

/**
 * MCP Discovery Runner Script (JavaScript version)
 * Runs a simplified MCP discovery scan across projects
 */

const fs = require('fs').promises;
const path = require('path');

const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};

class SimpleMCPScanner {
  constructor(projectsBaseDir = 'C:\\Users\\Jonbr\\pinokio\\api') {
    this.projectsBaseDir = projectsBaseDir;
    this.mcpPatterns = [
      /mcp/gi,
      /MCP/g,
      /Master.*Control.*Program/gi,
      /bridge.*integration/gi,
      /tool.*orchestration/gi,
      /agent.*communication/gi,
      /external.*tool.*execution/gi,
      /api.*bridge/gi,
      /tool.*discovery/gi,
      /tool.*execution/gi
    ];
  }

  async scanAllProjects() {
    const startTime = Date.now();
    logger.info('Starting simplified MCP Discovery scan');

    try {
      const projectDirs = await this.discoverProjects();
      logger.info(`Discovered ${projectDirs.length} potential projects`);

      const results = {
        timestamp: new Date().toISOString(),
        executionTime: 0,
        totalProjects: projectDirs.length,
        projectsWithMCP: 0,
        mcpFiles: [],
        recommendations: []
      };

      for (const projectPath of projectDirs) {
        try {
          const projectName = path.basename(projectPath);
          const mcpFiles = await this.scanProjectForMCP(projectPath, projectName);
          
          if (mcpFiles.length > 0) {
            results.projectsWithMCP++;
            results.mcpFiles.push(...mcpFiles);
            
            // Generate simple recommendations
            const recommendation = {
              projectName,
              mcpFileCount: mcpFiles.length,
              priority: mcpFiles.length > 5 ? 'high' : mcpFiles.length > 2 ? 'medium' : 'low',
              description: `Found ${mcpFiles.length} MCP-related files in ${projectName}`,
              files: mcpFiles.map(f => f.relativePath)
            };
            results.recommendations.push(recommendation);
          }
        } catch (error) {
          logger.warn(`Failed to scan project: ${path.basename(projectPath)}`, error.message);
        }
      }

      results.executionTime = Date.now() - startTime;
      
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
      'coverage', '.nyc_output', 'temp', 'tmp'
    ];
    return dirName.startsWith('.') || skipDirs.includes(dirName.toLowerCase());
  }

  async scanProjectForMCP(projectPath, projectName) {
    const mcpFiles = [];
    
    try {
      const allFiles = await this.getAllFilesRecursively(projectPath);
      
      for (const filePath of allFiles) {
        const relativePath = filePath.replace(projectPath, '').replace(/^[\\\/]/, '');
        
        if (this.shouldSkipFile(relativePath)) {
          continue;
        }

        try {
          const content = await fs.readFile(filePath, 'utf-8');
          const mcpReferences = this.countMCPReferences(content);
          
          if (mcpReferences > 0) {
            mcpFiles.push({
              relativePath,
              mcpReferences,
              fileSize: content.length,
              preview: this.extractPreview(content, 200)
            });
          }
        } catch (error) {
          // Skip files that can't be read as text
          continue;
        }
      }
    } catch (error) {
      logger.warn(`Failed to scan project ${projectName}`, error.message);
    }

    return mcpFiles;
  }

  async getAllFilesRecursively(dirPath) {
    const files = [];
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          const subFiles = await this.getAllFilesRecursively(fullPath);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
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
      /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/
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
    }
    
    const result = relevantLines.join('\n');
    return result.length > maxLength ? result.substring(0, maxLength) + '...' : result;
  }

  async saveResults(results) {
    try {
      await fs.mkdir('./reports', { recursive: true });
      
      const timestamp = Date.now();
      const jsonPath = path.join('./reports', `mcp-discovery-simple-${timestamp}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
      logger.info(`Results saved to: ${jsonPath}`);
      
      // Generate markdown report
      const markdownReport = this.generateMarkdownReport(results);
      const markdownPath = path.join('./reports', `mcp-discovery-simple-${timestamp}.md`);
      await fs.writeFile(markdownPath, markdownReport);
      logger.info(`Markdown report saved to: ${markdownPath}`);
      
    } catch (error) {
      logger.error('Failed to save results', error.message);
    }
  }

  generateMarkdownReport(results) {
    return `# MCP Discovery Report (Simplified)

**Generated:** ${results.timestamp}  
**Execution Time:** ${results.executionTime}ms  

## 📊 Summary

- **Projects Scanned:** ${results.totalProjects}
- **Projects with MCP Code:** ${results.projectsWithMCP}
- **Total MCP Files Found:** ${results.mcpFiles.length}

## 🎯 Projects with MCP Content

${results.recommendations.map((rec, index) => `
### ${index + 1}. ${rec.projectName}

**Priority:** ${rec.priority.toUpperCase()}  
**MCP Files:** ${rec.mcpFileCount}  
**Description:** ${rec.description}  

**Files Found:**
${rec.files.slice(0, 10).map(file => `- \`${file}\``).join('\n')}
${rec.files.length > 10 ? `- ... and ${rec.files.length - 10} more files` : ''}
`).join('\n')}

## 📁 Detailed File Analysis

${results.mcpFiles.slice(0, 20).map((file, index) => `
### ${index + 1}. ${file.relativePath}

**MCP References:** ${file.mcpReferences}  
**File Size:** ${file.fileSize} bytes  

**Preview:**
\`\`\`
${file.preview}
\`\`\`
`).join('\n')}

${results.mcpFiles.length > 20 ? `\n*... and ${results.mcpFiles.length - 20} more files*` : ''}

## 🔄 Next Steps

1. **Review high-priority projects** with the most MCP references
2. **Examine specific files** for implementation patterns
3. **Extract configurations** and bridge implementations
4. **Plan Phase 6 integration** based on findings

---

*Generated by VANTA Secrets Agent MCP Discovery Scanner*
`;
  }

  displayResults(results) {
    console.log('\n🔍 MCP DISCOVERY RESULTS');
    console.log('========================');
    console.log(`📊 Projects Scanned: ${results.totalProjects}`);
    console.log(`🎯 Projects with MCP: ${results.projectsWithMCP}`);
    console.log(`📁 Total MCP Files: ${results.mcpFiles.length}`);
    console.log(`⏱️  Execution Time: ${results.executionTime}ms`);
    
    if (results.recommendations.length > 0) {
      console.log('\n🎯 TOP PROJECTS WITH MCP CONTENT');
      console.log('=================================');
      
      results.recommendations
        .sort((a, b) => b.mcpFileCount - a.mcpFileCount)
        .slice(0, 5)
        .forEach((rec, index) => {
          console.log(`${index + 1}. [${rec.priority.toUpperCase()}] ${rec.projectName}`);
          console.log(`   MCP Files: ${rec.mcpFileCount}`);
          console.log(`   ${rec.description}`);
          console.log('');
        });
    }
    
    console.log('📋 Check the reports/ directory for detailed findings.');
  }
}

// Run the discovery
async function runDiscovery() {
  try {
    const scanner = new SimpleMCPScanner();
    await scanner.scanAllProjects();
  } catch (error) {
    console.error('Discovery failed:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  runDiscovery();
}

module.exports = { SimpleMCPScanner }; 