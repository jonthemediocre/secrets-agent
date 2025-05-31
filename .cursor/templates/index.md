# 📚 **Secrets Agent Templates Index**

## 🎯 **Template Categories**

### 🔄 **UAP Templates (User Action Protocols)**
**Purpose**: Define how AI should respond to specific user intents and actions
**Location**: [`uap-templates/`](./uap-templates/)

| Template | Purpose | Context |
|----------|---------|---------|
| [`secret-operations.md`](./uap-templates/secret-operations.md) | Secret discovery, creation, management | All secret-related user actions |
| [`vault-management.md`](./uap-templates/vault-management.md) | Vault operations, project management | Vault admin operations |
| [`governance-actions.md`](./uap-templates/governance-actions.md) | Rule management, compliance checking | Governance and audit operations |
| [`env-integration.md`](./uap-templates/env-integration.md) | .env import/export workflows | Environment file operations |

### 📄 **MDC Templates (Multi-Document Context)**
**Purpose**: Provide structured context for different operational domains
**Location**: [`mdc-templates/`](./mdc-templates/)

| Template | Purpose | Context |
|----------|---------|---------|
| [`agent-context.md`](./mdc-templates/agent-context.md) | Agent behavior and capabilities | When AI needs to understand agent roles |
| [`project-context.md`](./mdc-templates/project-context.md) | Project structure and requirements | Project-specific operations |
| [`security-context.md`](./mdc-templates/security-context.md) | Security policies and compliance | Security-sensitive operations |
| [`framework-context.md`](./mdc-templates/framework-context.md) | Framework-specific patterns | Framework-aware secret handling |

### 🔧 **MCP Tools Templates**
**Purpose**: Define tool integrations and workflows for external systems
**Location**: [`mcp-tools/`](./mcp-tools/)

| Template | Purpose | Context |
|----------|---------|---------|
| [`secrets-agent-tools.md`](./mcp-tools/secrets-agent-tools.md) | Core secrets agent tool definitions | Secret operations via MCP |
| [`governance-tools.md`](./mcp-tools/governance-tools.md) | Governance and audit tools | Rule enforcement via MCP |
| [`integration-tools.md`](./mcp-tools/integration-tools.md) | Third-party integration tools | External system connectivity |
| [`framework-tools.md`](./mcp-tools/framework-tools.md) | Framework-specific tools | Framework-aware operations |

## 🚀 **Usage Patterns**

### **For Cursor AI Integration:**
```markdown
# In chat, reference templates with:
@templates/uap-templates/secret-operations    # For secret actions
@templates/mdc-templates/security-context     # For security context
@templates/mcp-tools/secrets-agent-tools      # For tool operations
```

### **For Context Assembly:**
```typescript
// Template loading priority:
// 1. Project-specific customizations
// 2. Framework-specific templates  
// 3. Default templates
// 4. Fallback behaviors

const contextAssembly = {
  userAction: await loadUAPTemplate(userIntent),
  domainContext: await loadMDCTemplate(operationDomain),
  toolIntegration: await loadMCPTemplate(requiredTools)
};
```

## 🎨 **Template Customization**

### **Project-Level Overrides:**
Create custom templates in your project to override defaults:

```
.cursor/templates/
├── custom/                    # Project-specific templates
│   ├── secret-operations.md   # Override default UAP
│   ├── project-context.md     # Override default MDC
│   └── custom-tools.md        # Add project-specific tools
│
└── defaults/                  # Fallback to system defaults
    ├── uap-templates/
    ├── mdc-templates/
    └── mcp-tools/
```

### **Framework-Specific Templates:**
Auto-loaded based on project type detection:

```yaml
# Template resolution order:
project_type: "nextjs"
templates:
  - .cursor/templates/nextjs/secret-operations.md    # Framework-specific
  - .cursor/templates/custom/secret-operations.md    # Project override
  - .cursor/templates/defaults/secret-operations.md  # System default
```

## 📊 **Template Analytics**

### **Usage Tracking:**
```json
{
  "template_usage": {
    "secret-operations": {
      "invocations": 45,
      "success_rate": 0.96,
      "avg_response_time": "1.2s",
      "user_satisfaction": 4.7
    },
    "vault-management": {
      "invocations": 12,
      "success_rate": 1.0,
      "avg_response_time": "0.8s",
      "user_satisfaction": 4.9
    }
  },
  "context_effectiveness": {
    "security-context": {
      "compliance_score": 0.98,
      "error_reduction": 0.85,
      "user_guidance_quality": 4.8
    }
  }
}
```

## 🔧 **Template Development**

### **Creating New Templates:**
```bash
# Generate new UAP template
secrets-agent-advanced templates create \
  --type uap \
  --name "deployment-actions" \
  --context "deployment and release operations"

# Generate framework-specific template
secrets-agent-advanced templates create \
  --type mdc \
  --name "react-context" \
  --framework "react" \
  --inherit-from "project-context"
```

### **Template Validation:**
```bash
# Validate template syntax and structure
secrets-agent-advanced templates validate --all

# Test template with sample context
secrets-agent-advanced templates test \
  --template "secret-operations" \
  --sample-context "user wants to add API key"
```

## 🎯 **Best Practices**

### **Template Design:**
1. **Specific Intent Matching**: Each UAP should handle specific user intents
2. **Context Richness**: MDC templates should provide comprehensive context
3. **Tool Integration**: MCP templates should define clear tool workflows
4. **Fallback Handling**: Always provide graceful degradation paths

### **Maintenance:**
1. **Regular Updates**: Keep templates aligned with evolving project needs
2. **Usage Analytics**: Monitor which templates are most/least effective
3. **User Feedback**: Incorporate developer feedback into template improvements
4. **Version Control**: Track template changes and their impact

### **Team Collaboration:**
1. **Shared Templates**: Maintain team-wide template standards
2. **Documentation**: Document custom template purposes and usage
3. **Review Process**: Establish template change review workflows
4. **Training**: Ensure team understands template system

---

**Navigation**:
- [← Back to Rules Index](../rules/index.md)
- [🔄 UAP Templates →](./uap-templates/)
- [📄 MDC Templates →](./mdc-templates/)
- [🔧 MCP Tools →](./mcp-tools/)

**Last Updated**: {{timestamp}}  
**Managed By**: Secrets Agent Template System  
**Version**: {{template_system_version}} 