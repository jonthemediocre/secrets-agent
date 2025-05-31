#!/usr/bin/env node

/**
 * Custom Directory MCP Scanner
 * Scans specific directories for MCP-related content
 */

const fs = require('fs').promises;
const path = require('path');

const logger = {
  info: (msg, data) => console.log(`[INFO] ${msg}`, data || ''),
  warn: (msg, data) => console.warn(`[WARN] ${msg}`, data || ''),
  error: (msg, data) => console.error(`[ERROR] ${msg}`, data || '')
};

class CustomDirectoryMCPScanner {
  constructor() {
    this.mcpPatterns = [
      /\bmcp\b/gi,
      /\bMCP\b/g,
      /Master.*Control.*Program/gi,
      /bridge.*integration/gi,
      /tool.*orchestration/gi,
      /agent.*communication/gi,
      /external.*tool.*execution/gi,
      /api.*bridge/gi,
      /tool.*discovery/gi,
      /tool.*execution/gi,
      /mcp.*server/gi,
      /mcp.*client/gi,
      /mcp.*bridge/gi,
      /mcp.*tool/gi,
      /mcp.*endpoint/gi,
      /mcp.*command/gi
    ];
    this.maxFilesPerProject = 200;
    this.maxFileSize = 2 * 1024 * 1024; // 2MB max file size
  }

  async scanDirectory(targetDir) {
    const startTime = Date.now();
    logger.info(`Starting MCP scan of directory: ${targetDir}`);

    try {
      // Check if directory exists
      const stats = await fs.stat(targetDir);
      if (!stats.isDirectory()) {
        throw new Error(`${targetDir} is not a directory`);
      }

      const results = {
        timestamp: new Date().toISOString(),
        executionTime: 0,
        targetDirectory: targetDir,
        totalFiles: 0,
        mcpFiles: [],
        mcpReferences: 0,
        topFindings: []
      };

      const allFiles = await this.getAllFilesRecursively(targetDir);
      results.totalFiles = allFiles.length;
      
      logger.info(`Found ${allFiles.length} files to scan`);

      for (const filePath of allFiles) {
        try {
          const relativePath = filePath.replace(targetDir, '').replace(/^[\\\/]/, '');
          
          if (this.shouldSkipFile(relativePath)) {
            continue;
          }

          const stats = await fs.stat(filePath);
          if (stats.size > this.maxFileSize) {
            continue;
          }
          
          const content = await fs.readFile(filePath, 'utf-8');
          const mcpReferences = this.countMCPReferences(content);
          
          if (mcpReferences > 0) {
            const fileInfo = {
              relativePath,
              fullPath: filePath,
              mcpReferences,
              fileSize: stats.size,
              preview: this.extractPreview(content, 300),
              patterns: this.extractMCPPatterns(content)
            };
            
            results.mcpFiles.push(fileInfo);
            results.mcpReferences += mcpReferences;
            
            logger.info(`Found MCP content: ${relativePath} (${mcpReferences} refs)`);
          }
        } catch (error) {
          // Skip files that can't be read
          continue;
        }
      }

      results.executionTime = Date.now() - startTime;
      
      // Sort by MCP references
      results.mcpFiles.sort((a, b) => b.mcpReferences - a.mcpReferences);
      
      // Generate top findings
      results.topFindings = this.generateFindings(results.mcpFiles);
      
      // Save and display results
      await this.saveResults(results);
      this.displayResults(results);

      return results;

    } catch (error) {
      logger.error('Directory scan failed', error.message);
      throw error;
    }
  }

  async getAllFilesRecursively(dirPath, maxDepth = 5, currentDepth = 0) {
    const files = [];
    
    if (currentDepth >= maxDepth) {
      return files;
    }
    
    try {
      const entries = await fs.readdir(dirPath, { withFileTypes: true });
      
      for (const entry of entries) {
        const fullPath = path.join(dirPath, entry.name);
        
        if (entry.isDirectory() && !this.shouldSkipDirectory(entry.name)) {
          const subFiles = await this.getAllFilesRecursively(fullPath, maxDepth, currentDepth + 1);
          files.push(...subFiles);
        } else if (entry.isFile()) {
          files.push(fullPath);
        }
        
        if (files.length > this.maxFilesPerProject) {
          break;
        }
      }
    } catch (error) {
      // Skip directories that can't be read
    }
    
    return files;
  }

  shouldSkipDirectory(dirName) {
    const skipDirs = [
      'node_modules', '.git', 'dist', 'build', '.next', 
      'coverage', '.nyc_output', 'temp', 'tmp', 'cache',
      '.vscode', '.idea', '__pycache__', '.pytest_cache'
    ];
    return dirName.startsWith('.') || skipDirs.includes(dirName.toLowerCase());
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
      /\.(png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot|pdf|zip|tar|gz|exe|dll|bin)$/
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

  extractMCPPatterns(content) {
    const patterns = [];
    
    for (const pattern of this.mcpPatterns) {
      const matches = content.match(pattern);
      if (matches) {
        patterns.push(...Array.from(matches).map(match => match.trim()));
      }
    }
    
    return Array.from(new Set(patterns));
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
      
      if (relevantLines.length > 10) {
        break;
      }
    }
    
    const result = relevantLines.join('\n');
    return result.length > maxLength ? result.substring(0, maxLength) + '...' : result;
  }

  generateFindings(mcpFiles) {
    const findings = [];
    
    // Group by file type
    const byType = {};
    for (const file of mcpFiles) {
      const ext = path.extname(file.relativePath).toLowerCase();
      const type = ext || 'no-extension';
      if (!byType[type]) byType[type] = [];
      byType[type].push(file);
    }
    
    // Generate findings by type
    for (const [type, files] of Object.entries(byType)) {
      const totalRefs = files.reduce((sum, f) => sum + f.mcpReferences, 0);
      findings.push({
        type: `Files with ${type} extension`,
        fileCount: files.length,
        totalReferences: totalRefs,
        topFiles: files.slice(0, 3)
      });
    }
    
    return findings.sort((a, b) => b.totalReferences - a.totalReferences);
  }

  async saveResults(results) {
    try {
      await fs.mkdir('./reports', { recursive: true });
      
      const timestamp = Date.now();
      const dirName = path.basename(results.targetDirectory);
      const jsonPath = path.join('./reports', `custom-mcp-scan-${dirName}-${timestamp}.json`);
      await fs.writeFile(jsonPath, JSON.stringify(results, null, 2));
      logger.info(`Results saved to: ${jsonPath}`);
      
      // Generate markdown report
      const markdownReport = this.generateMarkdownReport(results);
      const markdownPath = path.join('./reports', `custom-mcp-scan-${dirName}-${timestamp}.md`);
      await fs.writeFile(markdownPath, markdownReport);
      logger.info(`Markdown report saved to: ${markdownPath}`);
      
    } catch (error) {
      logger.error('Failed to save results', error.message);
    }
  }

  generateMarkdownReport(results) {
    const dirName = path.basename(results.targetDirectory);
    
    return `# MCP Discovery Report - ${dirName}

**Generated:** ${results.timestamp}  
**Target Directory:** ${results.targetDirectory}  
**Execution Time:** ${results.executionTime}ms  

## 📊 Summary

- **Total Files Scanned:** ${results.totalFiles}
- **Files with MCP Content:** ${results.mcpFiles.length}
- **Total MCP References:** ${results.mcpReferences}

## 🎯 Files with MCP Content

${results.mcpFiles.slice(0, 20).map((file, index) => `
### ${index + 1}. ${file.relativePath}

**MCP References:** ${file.mcpReferences}  
**File Size:** ${file.fileSize} bytes  
**Patterns Found:** ${file.patterns.join(', ')}

**Preview:**
\`\`\`
${file.preview}
\`\`\`
`).join('\n')}

${results.mcpFiles.length > 20 ? `\n*... and ${results.mcpFiles.length - 20} more files*` : ''}

## 📋 Findings by File Type

${results.topFindings.map((finding, index) => `
### ${index + 1}. ${finding.type}

**Files:** ${finding.fileCount}  
**Total References:** ${finding.totalReferences}  

**Top Files:**
${finding.topFiles.map(file => `- \`${file.relativePath}\` (${file.mcpReferences} refs)`).join('\n')}
`).join('\n')}

## 🔄 Integration Recommendations

${results.mcpFiles.length > 0 ? `
Based on the MCP content found in ${dirName}:

1. **High-Value Files:** ${results.mcpFiles.filter(f => f.mcpReferences > 5).length} files with 5+ MCP references
2. **Configuration Files:** ${results.mcpFiles.filter(f => f.relativePath.includes('config') || f.relativePath.endsWith('.yaml') || f.relativePath.endsWith('.json')).length} potential config files
3. **Documentation:** ${results.mcpFiles.filter(f => f.relativePath.endsWith('.md')).length} markdown files with MCP content

**Recommended Actions:**
- Extract configuration patterns from high-reference files
- Review documentation for implementation guidance
- Analyze code files for bridge patterns
` : 'No MCP content found in this directory.'}

---

*Generated by VANTA Secrets Agent Custom Directory MCP Scanner*
`;
  }

  displayResults(results) {
    const dirName = path.basename(results.targetDirectory);
    
    console.log(`\n🔍 MCP DISCOVERY RESULTS - ${dirName.toUpperCase()}`);
    console.log('='.repeat(50));
    console.log(`📁 Target Directory: ${results.targetDirectory}`);
    console.log(`📊 Total Files: ${results.totalFiles}`);
    console.log(`🎯 Files with MCP: ${results.mcpFiles.length}`);
    console.log(`📈 Total References: ${results.mcpReferences}`);
    console.log(`⏱️  Execution Time: ${results.executionTime}ms`);
    
    if (results.mcpFiles.length > 0) {
      console.log('\n🎯 TOP MCP FILES');
      console.log('================');
      
      results.mcpFiles.slice(0, 10).forEach((file, index) => {
        console.log(`${index + 1}. ${file.relativePath}`);
        console.log(`   References: ${file.mcpReferences} | Size: ${file.fileSize} bytes`);
        console.log(`   Patterns: ${file.patterns.slice(0, 3).join(', ')}`);
        console.log('');
      });
    }
    
    console.log('📋 Check the reports/ directory for detailed findings.');
  }
}

// Main execution
async function main() {
  const args = process.argv.slice(2);
  const targetDir = args[0];
  
  if (!targetDir) {
    console.error('Usage: node scan-custom-directory.js <directory-path>');
    console.error('Example: node scan-custom-directory.js "C:\\FamilyDocRepo"');
    process.exit(1);
  }
  
  try {
    const scanner = new CustomDirectoryMCPScanner();
    await scanner.scanDirectory(targetDir);
  } catch (error) {
    console.error('Scan failed:', error.message);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

module.exports = { CustomDirectoryMCPScanner }; 