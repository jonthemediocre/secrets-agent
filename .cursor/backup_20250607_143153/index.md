# Secrets Agent - Multi-Level Governance Index

## 🎯 **Context Enforcement Levels**

### 🌐 **Level 1: Global Governance**
- **File**: [`level-1-global.md`](./level-1-global.md)
- **Scope**: All projects, all agents, universal standards
- **Source**: Synced from `globalrules.md` by Global Rule Manager
- **Enforcement**: Cursor AI + Global Rule Manager
- **Update Frequency**: On global rule changes, manual sync commands

### 🔄 **Level 2: Dynamic Context Rules (MDC)**
- **Files**: [`*.mdc`](./level-2-dynamic/) in `.cursor/rules/`
- **Format**: Cursor AI's MDC format with frontmatter
- **Scope**: Glob-based, runtime adaptive, session-aware
- **Source**: Dynamic Rule Engine with real-time adaptation
- **Enforcement**: Cursor AI + Runtime validation + File watchers
- **Triggers**: File patterns, agent requests, always-apply
- **Update Frequency**: Real-time, context-driven

### 🎯 **Level 3: App-Specific Context Rules (MDC)**
- **Files**: [`*.mdc`](./level-3-app/) in `.cursor/rules/app/`
- **Format**: Cursor AI's MDC format with frontmatter
- **Scope**: Agent-driven, context-aware, software scaffold, time-triggered
- **Source**: This project's specific requirements and patterns
- **Enforcement**: Cursor AI + App-specific validators + Framework rules
- **Triggers**: Agent context, software scaffold events, time-based
- **Update Frequency**: Project evolution, team decisions

## 🤖 **Universal Agent Protocol (UAP)**

**UAP is the framework that defines how agents should behave and interact across all levels.**

### UAP Implementation Points:
- **Agent Behavior Standards**: How agents communicate and operate
- **Protocol Compliance**: Standardized agent interactions
- **Cross-Level Communication**: How Level 1, 2, 3 agents coordinate
- **Error Handling**: Standardized agent error responses
- **Context Passing**: How agents share context between levels

### UAP Integration:
- **Level 2 MDC Rules**: Implement UAP-compliant agent behaviors
- **Level 3 MDC Rules**: Enforce UAP protocols in app-specific contexts
- **Agent Communication**: All agents follow UAP standards

## 🚀 **Quick Context Engagement**

### For Users:
- **@rules** - Engage MDC rule context in Cursor chat
- **@app-rules** - Access Level 3 app-specific MDC rules
- **@global** - Reference Level 1 global governance
- **@secrets** - Direct access to secrets agent context

### For AI/Cursor:
- **Rule Priority**: Level 3 MDC → Level 2 MDC → Level 1 Global (most specific wins)
- **Rule Inheritance**: Level 3 inherits and can override Level 2/1
- **Validation Chain**: All levels must pass for action approval
- **UAP Compliance**: All agent interactions follow UAP standards

## 📊 **Current Active Context**

```yaml
# This section is dynamically updated
project:
  name: "{{project_name}}"
  type: "{{project_type}}"
  framework: "{{framework}}"
  
environment: "{{environment}}"
security_level: "{{security_level}}"

uap_compliance:
  protocol_version: "{{uap_version}}"
  agent_standards: "{{uap_standards}}"
  
active_agents:
  - SecretScaffoldAgent (UAP-compliant)
  - VaultAgent (UAP-compliant)
  - GovernanceAgent (UAP-compliant)
  
current_session:
  user_role: "{{user_role}}"
  permissions: {{user_permissions}}
  started: "{{session_start}}"
  
governance_state:
  level_1_version: "{{global_rules_version}}"
  level_2_mdc_rules: {{dynamic_mdc_count}}
  level_3_mdc_rules: {{app_specific_mdc_count}}
  last_sync: "{{last_governance_sync}}"
  uap_compliance: "{{uap_compliance_status}}"
```

## 🔧 **MDC Rule Structure (Cursor Format)**

### Level 2 Dynamic MDC Rules:
```markdown
---
description: "Use when working with secret operations"
globs: "**/*.env,**/.vault.yaml,src/services/*Secret*"
alwaysApply: false
---

# Dynamic Secret Management Rules

- Apply UAP agent protocols for secret operations
- Use runtime context to adapt secret handling
- Trigger on glob pattern matches
- Follow UAP error handling standards
```

### Level 3 App-Specific MDC Rules:
```markdown
---
description: "NextJS app-specific secret patterns"
globs: "app/**/*,pages/**/*"
alwaysApply: false
---

# NextJS Secret Context Rules

- Enforce NEXT_PUBLIC_* for client-side secrets
- Apply UAP protocols for component-level access
- Trigger on app directory changes
- Follow framework-specific UAP patterns
```

## 🔧 **Integration Commands**

### Context Updates:
```bash
# Refresh all governance contexts
secrets-agent-advanced governance sync-contexts

# Update specific MDC level
secrets-agent-advanced mdc update-level --level 3

# Validate UAP compliance
secrets-agent-advanced uap validate-compliance
```

### UAP Protocol Management:
```bash
# Initialize UAP framework
secrets-agent-advanced uap init --version latest

# Validate agent UAP compliance
secrets-agent-advanced uap validate-agents

# Update UAP protocols
secrets-agent-advanced uap update-protocols
```

## 📚 **Navigation Map**

### Rule Files (MDC Format):
- [`level-1-global.md`](./level-1-global.md) - Universal governance (non-MDC)
- [`level-2-dynamic/`](./level-2-dynamic/) - Runtime MDC rules
- [`level-3-app/`](./level-3-app/) - App-specific MDC rules

### UAP Framework:
- [`../uap/`](../uap/) - Universal Agent Protocol definitions
- [`../uap/agent-standards.md`](../uap/agent-standards.md) - Agent behavior standards
- [`../uap/protocol-compliance.md`](../uap/protocol-compliance.md) - UAP compliance guidelines

### Context State:
- [`../context/`](../context/) - Dynamic session state
- [`../context/uap-state.json`](../context/uap-state.json) - UAP protocol state

---

**Last Updated**: {{timestamp}}  
**Managed By**: Secrets Agent Multi-Level Governance System + UAP Framework  
**Version**: {{system_version}}  
**UAP Version**: {{uap_version}} 