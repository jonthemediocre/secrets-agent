# 🚀 Universal Agent Protocol (UAP) Level 2 Rules

## Overview

The **UAP Level 2 Cursor Rule Bundle** establishes a comprehensive governance framework for AI-agent-callable code that ensures:

- **MCP (Model Context Protocol) compliance** 
- **Symbolic agent interoperability**
- **Runtime composability** 
- **UAP lifecycle adherence**
- **Mutation safety and version tracking**

## 📋 Rule Index

| Rule ID | Name | Level | Focus Area |
|---------|------|-------|------------|
| `004-mcp-callability.mdc` | MCP Callability | 2 | Agent-callable functions |
| `005-cli-interface.mdc` | CLI Interface | 2 | UAP command patterns |
| `006-agent-scaffold.mdc` | Agent Scaffold | 2 | Agent generation standards |
| `007-hook-system.mdc` | Hook System | 2 | Lifecycle extensibility |
| `008-manifest-export.mdc` | Manifest Export | 2 | Agent self-description |
| `009-mutation-mode.mdc` | Mutation Mode | 2 | Self-modification safety |

## 🎯 Core Principles

### 1. **MCP Callability** (Rule 004)
Every `.ts` file must expose at least one callable function that can be invoked by AI agents via the MCP Tools Interface.

```typescript
// ✅ COMPLIANT
export async function analyzeProject(path: string): Promise<AnalysisResult> {
  // Implementation
}

// ❌ NON-COMPLIANT (unless marked @mcpPassive)
const helperFunction = () => { /* no export */ }
```

### 2. **UAP CLI Interface** (Rule 005)
Standardized command-line interface using `typer` library:

```bash
uap run <contract.yaml> <objective>
uap scaffold <AgentName>
uap mutate <AgentName> --preview
```

### 3. **Agent Scaffolding** (Rule 006)
Generated agents follow consistent structure:

```
agents/
├── web_search_agent.py          # Implementation
├── WebSearchAgent.uap.yaml      # Contract
├── tools/                       # Plugin directory
└── tests/                       # Test suite
```

### 4. **Hook System** (Rule 007)
Lifecycle extensibility through structured hook points:

```python
# Agent lifecycle hooks
self.hooks.trigger("before_plan", context)
self.hooks.trigger("after_execute", result)
self.hooks.trigger("on_success", data)
```

### 5. **Manifest Export** (Rule 008)
Agents must generate `UAPAgentManifest.yaml` files:

```yaml
title: WebSearchAgent
version: 1.0.1
agent_roles:
  - web_search
symbolic_intent:
  goal: Retrieve answers from public web
  scope: web_data
```

### 6. **Mutation Mode** (Rule 009)
Safe self-modification with version tracking:

```python
def mutate(self):
    proposed_change = refactor_collapse_method()
    return {
        "diff": proposed_change, 
        "symbolic_delta": "...", 
        "status": "pending"
    }
```

## 🛠 Validation Tools

### MCP Validator

Run the enhanced MCP validator that includes UAP rule checking:

```bash
# Basic MCP compliance check
npm run mcp:validate

# Full UAP validation
npm run uap:check

# Agent-specific validation
npm run agent:validate
```

### Validation Output

```
📊 MCP + UAP Compliance Summary
──────────────────────────────────────────────────
Total files scanned: 47
✅ Compliant files: 42
📝 Passive files (@mcpPassive): 3
❌ Violations: 2

🚀 UAP Feature Analysis:
🪝 Hook support: 12 files
📋 Manifest support: 8 files
🧬 Mutation support: 3 files

🎯 MCP Compliance Rate: 89.4%
🚀 UAP Adoption Rate: 42.6%
```

## 📁 File Structure

```
project/
├── .cursor/
│   └── rules/
│       └── uap/
│           ├── 004-mcp-callability.mdc
│           ├── 005-cli-interface.mdc
│           ├── 006-agent-scaffold.mdc
│           ├── 007-hook-system.mdc
│           ├── 008-manifest-export.mdc
│           └── 009-mutation-mode.mdc
├── scripts/
│   └── validate-mcp.ts                # Enhanced validator
├── package.json                       # UAP validation scripts
└── UAP_RULES_README.md               # This file
```

## 🔧 Implementation Guide

### Step 1: Enable Rules in Cursor

Place `.mdc` files in `.cursor/rules/uap/` directory. Cursor will automatically enforce these rules during development.

### Step 2: Install Validation Tools

```bash
npm install glob tsx
```

### Step 3: Run Validation

```bash
# Check MCP + UAP compliance
npm run mcp:validate

# Fix violations automatically (where possible)
npm run mcp:validate --fix
```

### Step 4: Mark Passive Files

For utility files that don't need agent-callable exports:

```typescript
// @mcpPassive
// Utility functions not intended for direct agent invocation

export function formatOutput(data: any): string {
  // Implementation
}
```

## 🚨 Common Violations & Fixes

### Missing Callable Exports

**Problem**: File has no agent-callable functions

**Fix**: Add exported function or mark as passive

```typescript
// Add this
export async function processData(input: string): Promise<Result> {
  // Implementation
}

// OR mark as passive
// @mcpPassive
```

### Missing Hook Support

**Problem**: Agent class lacks lifecycle hooks

**Fix**: Implement hook system

```typescript
import { HookManager } from './hooks'

export class MyAgent {
  private hooks = new HookManager()
  
  async plan(objective: string) {
    this.hooks.trigger('before_plan', { objective })
    // Implementation
    this.hooks.trigger('after_plan', result)
  }
}
```

### Missing Manifest

**Problem**: Agent cannot export manifest

**Fix**: Add manifest generation

```typescript
export class MyAgent {
  generateManifest(): AgentManifest {
    return {
      title: 'MyAgent',
      version: '1.0.0',
      agent_roles: ['data_processor'],
      symbolic_intent: {
        goal: 'Process data efficiently',
        scope: 'data_transformation'
      }
    }
  }
}
```

## 🎯 Compliance Levels

### Level 0: Basic MCP
- ✅ Exported callable functions
- ✅ Type annotations
- ✅ JSDoc documentation

### Level 1: UAP Foundation  
- ✅ CLI interface support
- ✅ Agent scaffolding compliance
- ✅ Lifecycle method structure

### Level 2: UAP Advanced
- ✅ Hook system integration
- ✅ Manifest export capability
- ✅ Mutation mode safety
- ✅ Version lineage tracking

### Level 3: UAP Production Runtime 🚀
- ✅ **Standalone MCP Server**: Agents run independently without development tooling
- ✅ **Runtime Agent Discovery**: Dynamic agent registration and service discovery
- ✅ **Production Orchestration**: Container-ready deployment with health checks
- ✅ **Runtime Manifest Validation**: Self-validating agent capabilities at runtime
- ✅ **Auto-Recovery**: Self-healing agents with failure resilience
- ✅ **Resource Management**: Dynamic scaling and resource optimization
- ✅ **Inter-Agent Communication**: Production-grade agent-to-agent protocols
- ✅ **Observability**: Comprehensive monitoring, metrics, and tracing
- ✅ **Security Hardening**: Production security controls and compliance enforcement

## 🌟 Level 3 Runtime Independence Characteristics

### **Deployment Independence**
```yaml
# docker-compose.yml
version: '3.8'
services:
  vanta-agent:
    image: vanta-framework:latest
    environment:
      - UAP_LEVEL=3
      - MCP_SERVER_MODE=production
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/health"]
```

### **Runtime Agent Registration**
```typescript
// Auto-discovery at runtime, no development dependencies
const agent = await AgentRegistry.discover('VantaFrameworkAgent');
await agent.initialize({ mode: 'production' });
```

### **Production MCP Server**
```typescript
// Standalone server initialization
const mcpServer = new ProductionMCPServer({
  agents: ['VantaFrameworkAgent'],
  port: process.env.MCP_PORT || 3000,
  security: 'production',
  monitoring: true
});
```

## 🚀 Next Steps

1. **Run validation**: `npm run uap:check`
2. **Fix violations**: Follow the guide above
3. **Adopt UAP features**: Implement hooks, manifests, mutation safety
4. **Generate documentation**: Use manifests for auto-generated docs

## 📚 Resources

- [MCP Specification](https://modelcontextprotocol.io/)
- [UAP Framework Documentation](./UAP_FRAMEWORK.md)
- [Agent Development Guide](./AGENT_DEVELOPMENT.md)
- [Mutation Safety Best Practices](./MUTATION_SAFETY.md)

## 🌉 **Level 2.5: Production Bridge Rules** ⚡

### **Bridge Principle: App Context + Level 2 → Level 3**

Level 2.5 provides transition guidance for converting Level 2 compliant apps into Level 3 production runtime using app-specific context files.

#### **Required Context Files for Level 3 Transition:**
- `plan.md` or `TODO.md` → Production requirements and deployment goals
- `README.md` → App description and deployment context  
- Brand materials → UI/UX guidance for production interfaces
- Existing Level 2 MCP functions → Runtime service definitions

#### **Bridge Rules for Production Runtime:**

##### **Rule 2.5.1: Production Server Pattern**
```typescript
// Auto-generate from Level 2 MCP functions
export class ProductionMCPServer {
  constructor(config: ProductionConfig) {
    // Extract from app's MCP callable functions
    this.registerToolsFromManifest();
  }
}
```

##### **Rule 2.5.2: Container Deployment Pattern**  
```dockerfile
# Dockerfile.production - Generated from app context
FROM node:18-alpine
# Copy app-specific components based on plan.md requirements
COPY lib/ ./lib/
COPY app/ ./app/
```

##### **Rule 2.5.3: App-Aware Agent Registry**
```typescript
// Auto-discover from existing UAP manifest
export class AgentRegistry {
  static async discoverFromManifest(manifestPath: string): Promise<Agent> {
    // Use app's UAPAgentManifest.yaml + brand context
  }
}
```

##### **Rule 2.5.4: Context-Driven Health Checks**
```typescript
// Generate health checks from TODO.md completion criteria
export async function generateHealthChecks(appContext: AppContext): Promise<HealthCheck[]> {
  // Parse plan.md/TODO.md for critical functionality
  // Generate appropriate production health checks
}
```

### **Level 2.5 Implementation Strategy:**

1. **Analyze App Context** → Parse plan.md/TODO.md for production requirements
2. **Extract Level 2 Assets** → Inventory MCP functions, hooks, manifests
3. **Generate Production Bridge** → Auto-create Level 3 infrastructure
4. **Deploy with Monitoring** → Add observability based on app goals

### **Example: VANTA Framework Level 2.5 Transition**

```typescript
// From TODO.md: "AI-powered enterprise security platform"
// From Level 2 MCP: analyzeSecretSecurity, executeAutomation, etc.
// Generated Level 3 Bridge:

const productionConfig = generateFromContext({
  appName: 'VantaFrameworkAgent',
  domain: 'enterprise_secrets_security', // from manifest
  mcpTools: vantaMcpTools, // from Level 2
  requirements: parseRequirements('TODO.md'),
  branding: loadBrandContext()
});

const server = new ProductionMCPServer(productionConfig);
```

## �� Compliance Levels

---

**Status**: ✅ Production Ready  
**Version**: 2.0.0  
**Compatibility**: Cursor IDE, VSCode, CLI tools  
**License**: MIT 