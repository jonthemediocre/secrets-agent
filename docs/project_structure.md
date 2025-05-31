# Project File Structure

```
project-root/
├── .cursor/                          # Cursor-specific configuration (Level 2)
│   ├── governance.yaml               # Project-level governance config
│   ├── rules/                        # Rule definitions
│   │   ├── code_style.yaml          # Code style rules
│   │   ├── security.yaml            # Security rules
│   │   └── performance.yaml         # Performance rules
│   │
│   ├── config/                      # Tool configurations
│   │   └── settings.yaml            # Global Cursor settings
│   │
│   ├── tools/                       # Tool-specific configs
│   │   ├── firecrawl.yaml          # Firecrawl configuration
│   │   ├── memory-bank.yaml        # Memory Bank configuration
│   │   ├── figma.yaml              # Figma Context configuration
│   │   └── search.yaml             # DuckDuckGo configuration
│   │
│   ├── agents/                      # Agent configurations
│   │   ├── code_assistant.yaml     # Code assistant agent rules
│   │   └── test_runner.yaml        # Test runner agent rules
│   │
│   ├── plugins/                     # Cursor plugins
│   │   ├── custom-tools/           # Custom tool implementations
│   │   └── extensions/             # Cursor extensions
│   │
│   ├── hooks/                       # Git hooks
│   │   ├── pre-commit.sh           # Pre-commit checks
│   │   └── post-merge.sh           # Post-merge actions
│   │
│   ├── cache/                       # Cursor cache
│   │   ├── tools/                  # Tool execution cache
│   │   └── agents/                 # Agent state cache
│   │
│   └── audit/                       # Audit logs
│       └── logs/                    # JSONL format audit logs
│           ├── tool_execution.jsonl
│           ├── agent_action.jsonl
│           └── rule_violation.jsonl
│
├── src/                             # Project source code
│   ├── config/                      # Application configuration
│   │   ├── governance.yaml         # System-wide governance (Level 1)
│   │   └── cursor_governance.yaml  # Cursor governance template
│   │
│   └── services/
│       ├── GovernanceService.ts    # Governance implementation
│       └── ...
│
├── mcp.yaml                         # General MCP configuration
└── theplan.md                       # Project planning document
```

## Directory Descriptions

### Level 1 (System-wide) - `src/config/governance.yaml`
- System-wide roles and permissions
- Global security policies
- Compliance requirements
- Vault integration settings

### Level 2 (Project-specific) - `.cursor/`
- Project-specific governance
- Tool configurations
- Agent rules
- Resource limits
- Audit settings

### Level 3 (Agent-specific)
- Distributed across `.cursor/agents/`
- Can be extended in project-specific locations
- Flexible implementation based on agent type

### Key Configuration Files

#### `.cursor/governance.yaml`
- Project-level governance rules
- Tool requirements
- Resource limits
- Integration settings

#### `.cursor/tools/*.yaml`
- Tool-specific configurations
- Authentication settings
- Usage limits
- Custom parameters

#### `.cursor/agents/*.yaml`
- Agent behavior rules
- Capability definitions
- Interaction patterns
- Resource allocations

#### `.cursor/rules/*.yaml`
- Code style enforcement
- Security checks
- Performance requirements
- Custom rule sets 