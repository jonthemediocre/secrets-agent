# MCP Discovery Guide

This guide explains how to use the enhanced project scanner to discover MCP-related code across all projects in the `pinokio/api` directory.

## 🎯 Purpose

The MCP Discovery Scanner helps identify existing MCP (Master Control Program) implementations, configurations, and patterns across all projects to accelerate Phase 6 implementation.

## 🚀 Quick Start

### Run MCP Discovery

```bash
# Run the comprehensive MCP discovery scan
npm run mcp-discovery

# Or run the basic project scanner
npm run scan-projects
```

### What It Discovers

The scanner looks for:

- **📁 MCP Files**: Files containing MCP-related code and references
- **⚙️ Configurations**: YAML/JSON files with MCP bridge configurations
- **🔧 Tool Definitions**: Classes, functions, and services implementing MCP tools
- **🌉 Bridge Implementations**: HTTP clients, API bridges, and communication layers
- **🔗 API Endpoints**: REST endpoints for MCP operations
- **💻 CLI Commands**: Command-line interfaces for MCP functionality

### Detection Patterns

The scanner uses sophisticated pattern matching to find:

```regex
# Core MCP patterns
/mcp|MCP/gi
/Master\s*Control\s*Program/gi
/bridge.*integration/gi
/tool.*orchestration/gi
/agent.*communication/gi

# Implementation patterns
/class\s+(\w*MCP\w*|\w*Tool\w*|\w*Bridge\w*)/gi
/function\s+(\w*mcp\w*|\w*tool\w*)/gi
/app\.(get|post|put|delete)\s*\(\s*['"`]([^'"`]+mcp[^'"`]*)['"`]/gi
```

## 📊 Output Reports

The scanner generates three types of reports in the `./reports/` directory:

### 1. MCP Discovery Summary (`mcp-discovery-{timestamp}.json`)
```json
{
  "executionSummary": {
    "timestamp": "2025-01-25T...",
    "totalExecutionTime": 5432,
    "projectsScanned": 15,
    "mcpProjectsFound": 3,
    "highValueProjects": 1
  },
  "mcpFindings": {
    "totalMCPFiles": 12,
    "totalConfigurations": 2,
    "totalToolDefinitions": 8,
    "totalBridgeImplementations": 3,
    "totalApiEndpoints": 5,
    "totalCliCommands": 4
  },
  "topRecommendations": [...]
}
```

### 2. Full Scan Report (`full-scan-{timestamp}.json`)
Complete detailed findings including:
- File-by-file analysis
- Code snippets
- Configuration extractions
- Parameter mappings

### 3. Markdown Summary (`mcp-discovery-summary-{timestamp}.md`)
Human-readable report with:
- Executive summary
- Integration recommendations
- Implementation plan
- Next steps

## 🎯 Integration Recommendations

The scanner provides prioritized recommendations:

### Priority Levels
- **🔴 HIGH**: Critical implementations to copy/adapt
- **🟡 MEDIUM**: Valuable patterns to reference
- **🟢 LOW**: Nice-to-have enhancements

### Integration Types
- **`copy_code`**: Direct code adaptation
- **`extract_config`**: Configuration file extraction
- **`adapt_pattern`**: Pattern-based implementation
- **`reference_implementation`**: Reference for guidance

### Effort Estimates
- **LOW**: < 4 hours implementation
- **MEDIUM**: 1-2 days implementation  
- **HIGH**: > 2 days implementation

## 📋 Implementation Plan

The scanner generates a phased implementation plan:

### Phase 1: Quick Wins
High priority, low effort items that can be implemented immediately.

### Phase 2: High Impact
High priority items or medium priority with low effort.

### Phase 3: Future Enhancements
Lower priority items for future consideration.

## 🔧 Configuration

### Scanner Settings

The scanner can be configured by modifying `scripts/scan-all-projects.ts`:

```typescript
// Adjust the base directory
constructor(projectsBaseDir: string = 'C:\\Users\\Jonbr\\pinokio\\api') {

// Modify MCP detection patterns
this.mcpPatterns = [
  /mcp|MCP/gi,
  /your_custom_pattern/gi,
  // Add more patterns...
];
```

### File Filtering

Skip certain files or directories:

```typescript
private shouldSkipFileForMCPScan(relativePath: string): boolean {
  const skipPatterns = [
    /node_modules/,
    /\.git/,
    /your_custom_skip_pattern/,
    // Add more skip patterns...
  ];
  
  return skipPatterns.some(pattern => pattern.test(relativePath));
}
```

## 🚨 Troubleshooting

### Common Issues

1. **Permission Errors**
   ```bash
   # Ensure you have read access to the pinokio/api directory
   ls -la C:\Users\Jonbr\pinokio\api
   ```

2. **TypeScript Compilation Errors**
   ```bash
   # Install dependencies
   npm install
   
   # Check TypeScript configuration
   npm run type-check
   ```

3. **Memory Issues with Large Projects**
   ```bash
   # Increase Node.js memory limit
   node --max-old-space-size=4096 scripts/run-mcp-discovery.ts
   ```

### Debug Mode

Enable detailed logging:

```typescript
// In scripts/run-mcp-discovery.ts
const logger = createLogger('MCPDiscoveryRunner', 'debug');
```

## 📈 Example Output

```
🔍 MCP DISCOVERY SUMMARY
========================
📊 Projects Scanned: 15
🎯 MCP Projects Found: 3
⭐ High-Value Projects: 1
⏱️  Execution Time: 5432ms

📈 MCP COMPONENTS DISCOVERED
============================
📁 MCP Files: 12
⚙️  Configurations: 2
🔧 Tool Definitions: 8
🌉 Bridge Implementations: 3
🔗 API Endpoints: 5
💻 CLI Commands: 4

🎯 TOP INTEGRATION OPPORTUNITIES
=================================
1. [HIGH] ProjectX
   extract_config: Extract MCP bridge configurations from 2 config files
   Effort: low | Files: 2

2. [HIGH] ProjectY
   copy_code: Adapt 3 MCP bridge implementations
   Effort: medium | Files: 3
```

## 🔄 Next Steps

After running the discovery:

1. **Review the markdown summary** for high-level findings
2. **Examine high-priority recommendations** in detail
3. **Extract configurations** from identified projects
4. **Adapt bridge implementations** for Phase 6
5. **Plan implementation** based on the generated roadmap

## 🤝 Contributing

To improve the MCP discovery scanner:

1. Add new detection patterns for specific MCP implementations
2. Enhance configuration extraction for different formats
3. Improve integration recommendations based on findings
4. Add support for additional file types and frameworks

---

*This scanner is part of the VANTA Secrets Agent Phase 6: MCP Bridge Integration initiative.* 