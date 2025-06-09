# 🏗️ **Revised Project Structure for Cursor IDE & Level 3 Context Enforcement**

## 📁 **Corrected New Project File Structure**

```
my-new-project/                    # PROJECT ROOT
├── 🔧 **Cursor IDE Integration (ROOT LEVEL)**
│   └── .cursor/
│       ├── rules                  # MDC files for Cursor AI context
│       │   ├── index.md           # Master index of all rules
│       │   ├── level-1-global.md  # Global governance rules
│       │   ├── level-2-dynamic.md # Dynamic context rules
│       │   └── level-3-app.md     # App-specific context rules
│       │
│       ├── templates/             # Context enforcement templates
│       │   ├── index.md           # Template index
│       │   ├── uap-templates/     # User Action Protocol templates
│       │   │   ├── secret-operations.md
│       │   │   ├── vault-management.md
│       │   │   └── governance-actions.md
│       │   │
│       │   ├── mdc-templates/     # Multi-Document Context templates
│       │   │   ├── agent-context.md
│       │   │   ├── project-context.md
│       │   │   └── security-context.md
│       │   │
│       │   └── mcp-tools/         # MCP Tool Integration templates
│       │       ├── tools-index.md
│       │       ├── secrets-agent-tools.md
│       │       └── governance-tools.md
│       │
│       └── context/               # Dynamic context state
│           ├── current-session.json
│           ├── agent-state.json
│           └── rule-overrides.json
│
├── 🔐 **Core Vault Files**
│   ├── .vault.yaml                # Main vault file (encrypted)
│   └── .vault.yaml.enc            # Backup encrypted vault
│
├── 🌐 **Global Governance (Level 1)**
│   ├── globalrules.md             # Synced from global system
│   └── governance-state.json      # Global rule sync status
│
├── 📊 **Data & Operations**
│   └── data/
│       ├── access.log             # Access audit trail
│       ├── rule-execution.log     # Level 2 rule execution history
│       ├── context-cache.json     # Level 3 context cache
│       └── agent-learning.json    # Agent behavioral learning
│
├── ⚙️ **Configuration**
│   ├── .secrets-agent.config.json # Project configuration
│   ├── .env.example              # Template for team members
│   └── .gitignore                # Security-aware git ignore
│
└── 📚 **Documentation**
    ├── SECRETS.md                 # Project secret documentation
    ├── GOVERNANCE.md              # Multi-level governance guide
    └── CURSOR-INTEGRATION.md      # Cursor IDE integration guide
```

## 🎯 **Level 3 Context Enforcement Elements**

### **1. Master Index (.cursor/rules/index.md)**
```markdown
# Secrets Agent - Multi-Level Governance Index

## Context Enforcement Levels

### 🌐 Level 1: Global Governance
- **File**: `level-1-global.md`
- **Scope**: All projects, all agents
- **Source**: Synced from `globalrules.md`
- **Enforcement**: Cursor AI + Global Rule Manager

### 🔄 Level 2: Dynamic Context
- **File**: `level-2-dynamic.md` 
- **Scope**: Runtime adaptive, agent-bound
- **Source**: Dynamic Rule Engine
- **Enforcement**: Cursor AI + Real-time validation

### 🎯 Level 3: App-Specific Context
- **File**: `level-3-app.md`
- **Scope**: Project-specific, contextual
- **Source**: This project's requirements
- **Enforcement**: Cursor AI + App-specific validators

## Quick Context Engagement
- Use `@rules` to engage rule context
- Use `@templates` to engage template context  
- Use `@tools` to engage MCP tool context

## Current Active Context
- Project: {{project_name}}
- Environment: {{environment}}
- Active Agents: {{active_agents}}
- Security Level: {{security_level}}
```

### **2. Level 3 App-Specific Rules (.cursor/rules/level-3-app.md)**
```markdown
# Level 3: App-Specific Context Enforcement

## Project Context
- **Project Type**: {{project_type}}
- **Framework**: {{framework}}
- **Security Requirements**: {{security_requirements}}
- **Team Size**: {{team_size}}

## App-Specific Rules

### A001: Framework-Specific Secret Patterns
**Context**: {{framework}} applications
**Rule**: Secrets must follow {{framework}} naming conventions
**Enforcement**: Validate against framework patterns
**Examples**:
- NextJS: `NEXT_PUBLIC_*` for client-side
- React: `REACT_APP_*` for build-time
- Node: Standard env var patterns

### A002: Component-Level Secret Access
**Context**: UI components requiring secrets
**Rule**: Components can only access secrets through secure context providers
**Enforcement**: Lint rules + runtime validation
**Implementation**: Use SecretContext provider pattern

### A003: API Endpoint Secret Validation  
**Context**: API routes and endpoints
**Rule**: All endpoints must validate secret access permissions
**Enforcement**: Middleware + access logging
**Implementation**: Require authentication middleware

### A004: Build-Time Secret Handling
**Context**: Build and deployment processes
**Rule**: Build processes must not expose secrets in client bundles
**Enforcement**: Build-time scanning + bundle analysis
**Implementation**: Use build-time secret injection

## Context-Aware Behaviors

### When User Requests Secret Operations:
1. **Validate Context**: Check current file/component context
2. **Apply Framework Rules**: Use framework-specific validation
3. **Check Access Permissions**: Validate user/role access
4. **Log Action**: Record in access audit trail
5. **Provide Guidance**: Offer context-specific suggestions

### When AI Suggests Secret Changes:
1. **Context Analysis**: Understand current development context
2. **Impact Assessment**: Evaluate change impact on app
3. **Security Validation**: Ensure changes meet security requirements
4. **Team Notification**: Alert team members if needed
5. **Documentation Update**: Update relevant documentation

## Integration Points

### With Cursor IDE:
- **File Context**: Rules apply based on current file type
- **Selection Context**: Rules apply to selected code blocks
- **Chat Context**: Rules influence AI responses
- **Command Context**: Rules affect command suggestions

### With MCP Tools:
- **Tool Selection**: Context determines available tools
- **Parameter Validation**: Context validates tool parameters
- **Result Processing**: Context shapes tool output
- **Error Handling**: Context-specific error messages
```

### **3. UAP Template (.cursor/templates/uap-templates/secret-operations.md)**
```markdown
# UAP: Secret Operations User Action Protocol

## User Intent Recognition Patterns

### 🔍 Secret Discovery Actions
**User Says**: "find secrets", "what secrets do I need", "scan for secrets"
**AI Action**:
1. Engage SECRET SAUCE analysis
2. Run `secrets-agent-advanced secret-sauce analyze`
3. Present categorized results with confidence scores
4. Offer to apply suggestions with conflict resolution

**Context Required**:
- Current project type
- Existing .env files
- Framework dependencies
- Infrastructure configuration

### 📥 Secret Import Actions  
**User Says**: "import my .env", "migrate from .env", "add existing secrets"
**AI Action**:
1. Locate .env files in project
2. Run `secrets-agent-advanced env import`
3. Handle conflicts with user preferences
4. Update project documentation

**Context Required**:
- .env file locations
- Merge behavior preferences  
- Comment preservation settings
- Category mapping preferences

### 🔐 Secret Creation Actions
**User Says**: "add a new secret", "create API key", "need database password"
**AI Action**:
1. Validate against Level 3 rules
2. Apply framework-specific naming
3. Generate secure default if requested
4. Log creation in audit trail
5. Update relevant documentation

**Context Required**:
- Secret category and purpose
- Framework naming conventions
- Security level requirements
- Access control requirements

### 📊 Secret Audit Actions
**User Says**: "show access logs", "who accessed what", "audit trail"
**AI Action**:
1. Run `secrets-agent-advanced logs query` with context
2. Present filtered results based on user permissions
3. Highlight security concerns
4. Suggest governance improvements

**Context Required**:
- User permission level
- Project access scope
- Time range preferences
- Output format preferences

## Context Engagement Protocol

### Pre-Action Context Gathering
```typescript
interface ActionContext {
  user: {
    role: string;
    permissions: string[];
    preferences: UserPreferences;
  };
  project: {
    type: string;
    framework: string;
    securityLevel: string;
    teamSize: number;
  };
  current: {
    file?: string;
    component?: string;
    selection?: string;
    intent: string;
  };
}
```

### Action Validation Pipeline
1. **Intent Recognition**: Parse user request for action type
2. **Context Assembly**: Gather relevant project/user context
3. **Rule Evaluation**: Apply Level 1, 2, 3 rules
4. **Permission Check**: Validate user permissions
5. **Action Execution**: Execute with context-aware parameters
6. **Result Processing**: Format results with context
7. **Follow-up Suggestions**: Offer context-relevant next steps

### Error Recovery Protocol
1. **Context-Aware Errors**: Provide errors specific to current context
2. **Suggested Fixes**: Offer fixes based on project type/framework
3. **Documentation Links**: Link to relevant docs for context
4. **Alternative Actions**: Suggest alternative approaches
5. **Learning Integration**: Learn from errors for future improvements
```

### **4. MCP Tools Integration (.cursor/templates/mcp-tools/secrets-agent-tools.md)**
```markdown
# MCP Tools: Secrets Agent Integration

## Available Tools by Context

### 🔥 SECRET SAUCE Tools
**Context**: Project analysis and secret generation
**Tools**:
- `secrets_agent_analyze`: Perform 6-phase SECRET SAUCE analysis
- `secrets_agent_apply_suggestions`: Apply AI-generated suggestions
- `secrets_agent_confidence_boost`: Enhance suggestion confidence
- `secrets_agent_production_ready`: Generate production-ready values

**Usage in Cursor**:
```typescript
// When user requests secret analysis
const analysis = await mcp.call('secrets_agent_analyze', {
  projectPath: context.projectPath,
  projectName: context.projectName,
  options: {
    includeFrameworkSpecific: true,
    generateProductionValues: true,
    enhanceWithAI: true
  }
});
```

### 📁 Environment Integration Tools  
**Context**: .env file operations
**Tools**:
- `env_import`: Import secrets from .env files
- `env_export`: Export vault secrets to .env format
- `env_validate`: Validate .env file compliance
- `env_migrate`: Migrate between .env formats

**Usage in Cursor**:
```typescript
// When user drags .env file or requests import
const importResult = await mcp.call('env_import', {
  filePath: context.selectedFile,
  projectName: context.projectName,
  mergeBehavior: userPreferences.mergeBehavior,
  preserveComments: true
});
```

### 📊 Governance & Audit Tools
**Context**: Rule management and access auditing  
**Tools**:
- `governance_sync`: Sync global rules to project
- `governance_validate`: Validate against governance rules
- `access_log_query`: Query access audit trails
- `rule_engine_execute`: Execute dynamic rules

**Usage in Cursor**:
```typescript
// When user requests governance check
const validation = await mcp.call('governance_validate', {
  action: context.userAction,
  data: context.actionData,
  rules: ['level-1-global', 'level-2-dynamic', 'level-3-app']
});
```

## Context-Aware Tool Selection

### File Context Integration
```typescript
// Cursor IDE file context determines tool availability
const getAvailableTools = (fileContext) => {
  const tools = [];
  
  if (fileContext.fileName.includes('.env')) {
    tools.push('env_import', 'env_export', 'env_validate');
  }
  
  if (fileContext.fileType === 'typescript' || fileContext.fileType === 'javascript') {
    tools.push('secrets_agent_analyze', 'framework_validate');
  }
  
  if (fileContext.directory.includes('api') || fileContext.directory.includes('routes')) {
    tools.push('api_secret_validate', 'access_log_query');
  }
  
  return tools;
};
```

### Project Context Integration
```typescript
// Project type determines specialized tools
const getProjectTools = (projectContext) => {
  const baseTools = ['secrets_agent_analyze', 'governance_validate'];
  
  switch (projectContext.type) {
    case 'nextjs':
      return [...baseTools, 'nextjs_secret_validate', 'client_secret_check'];
    case 'react':
      return [...baseTools, 'react_env_validate', 'build_secret_check'];
    case 'node':
      return [...baseTools, 'node_secret_patterns', 'runtime_secret_check'];
    default:
      return baseTools;
  }
};
```

## Tool Chain Workflows

### Secret Discovery Workflow
1. **Context Analysis** → `project_analyze`
2. **Framework Detection** → `framework_detect`  
3. **SECRET SAUCE Analysis** → `secrets_agent_analyze`
4. **Validation** → `governance_validate`
5. **Application** → `secrets_agent_apply_suggestions`

### .env Migration Workflow  
1. **File Discovery** → `env_discover`
2. **Content Analysis** → `env_parse`
3. **Conflict Detection** → `env_conflict_check`
4. **Import with Resolution** → `env_import`
5. **Validation** → `governance_validate`
6. **Documentation Update** → `docs_update`

### Governance Enforcement Workflow
1. **Action Detection** → `action_classify`
2. **Context Assembly** → `context_gather`
3. **Rule Evaluation** → `rule_engine_execute`
4. **Permission Check** → `permission_validate`  
5. **Action Execution** → `action_execute`
6. **Audit Logging** → `access_log_create`
```

## 🚀 **Initialization Commands for Cursor Integration**

```bash
# Initialize project with full Cursor IDE support
secrets-agent-advanced init \
  --project-name "my-app" \
  --project-type "nextjs" \
  --enable-cursor-integration \
  --setup-level-3-context \
  --create-mcp-tools \
  --generate-templates

# Specific Cursor setup
secrets-agent-advanced cursor setup \
  --create-rules-index \
  --setup-uap-templates \
  --configure-mcp-tools \
  --enable-context-enforcement
```

This structure ensures **Cursor IDE can properly engage** with all three levels of governance while providing **Level 3 app-specific context enforcement** through proper MDC files, UAP templates, and MCP tool integration! 🎯 