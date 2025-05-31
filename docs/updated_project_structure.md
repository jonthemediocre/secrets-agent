# Updated Project Structure

```
project-root/
├── globalrules.md                    # Level 1: Canonical system governance spec
│
├── .cursor/                          # Level 2: Project-specific configuration
│   ├── config.yaml                   # Core cursor configuration
│   │
│   ├── tools/                        # Tool configurations
│   │   ├── firecrawl.yaml           # Web crawling tool config
│   │   ├── memory-bank.yaml         # Storage tool config
│   │   └── tool_registry.yaml       # Central tool registry
│   │
│   ├── schemas/                      # JSON schemas for validation
│   │   ├── tools/                   # Tool schemas
│   │   ├── rules/                   # Rule schemas
│   │   └── agents/                  # Agent schemas
│   │
│   ├── rules/                        # Rule definitions
│   │   ├── code_style.yaml          # Code style rules
│   │   ├── security.yaml            # Security rules
│   │   ├── performance.yaml         # Performance rules
│   │   └── rules_merge.yaml         # Rule merging logic
│   │
│   ├── references/                   # Reference documentation
│   │   ├── tools/                   # Tool documentation
│   │   ├── rules/                   # Rule documentation
│   │   └── agents/                  # Agent documentation
│   │
│   ├── mdc/                         # Model-Driven Configuration
│   │   ├── templates/               # Configuration templates
│   │   └── generators/              # Config generators
│   │
│   ├── agents/                       # Level 3: Agent-specific configurations
│   │   ├── manifest.yaml            # Agent registry and capabilities
│   │   ├── code_assistant/          # Code assistant agent
│   │   │   ├── config.yaml         # Agent configuration
│   │   │   └── rules.yaml          # Agent-specific rules
│   │   └── secrets_agent/          # Secrets management agent
│   │       ├── config.yaml         # Agent configuration
│   │       └── rules.yaml          # Agent-specific rules
│   │
│   ├── scripts/                      # Automation scripts
│   │   ├── setup/                   # Setup scripts
│   │   └── maintenance/             # Maintenance scripts
│   │
│   ├── scheduler/                    # Task scheduling
│   │   ├── jobs/                    # Job definitions
│   │   └── triggers/                # Event triggers
│   │
│   ├── rituals/                      # Agent rituals and patterns
│   │   ├── startup/                 # Startup rituals
│   │   └── maintenance/             # Maintenance rituals
│   │
│   ├── releases/                     # Release management
│   │   ├── templates/               # Release templates
│   │   └── history/                 # Release history
│   │
│   ├── logs/                         # Logging and audit
│   │   ├── tool_execution/          # Tool execution logs
│   │   ├── agent_actions/           # Agent action logs
│   │   └── rule_violations/         # Rule violation logs
│   │
│   └── .stfolder/                    # Syncthing folder
│
├── mcp/                              # MCP Runtime Configuration
│   ├── tools/                        # MCP tool definitions
│   │   ├── filesystem/
│   │   │   ├── read_file.yaml
│   │   │   └── write_file.yaml
│   │   └── runtime/
│   │       └── exec_with_env.yaml
│   ├── tool_index.yaml              # Tool registry index
│   └── runtime_config.yaml          # Runtime configuration
│
├── secrets/                          # Secrets Management
│   ├── .vault.yaml                  # Decrypted working vault
│   ├── .vault.sops.yaml             # Encrypted SOPS version
│   └── env.overlay.yaml             # Environment overlay
│
├── .symbols/                         # Symbolic Runtime
│   ├── memory/                      # Agent memory storage
│   ├── tags/                        # Tag definitions
│   └── rituals/                     # Ritual seeds
│
├── kernel/                           # Core System Components
│   ├── rules_engine/                # Rules processing
│   ├── delta_compression/           # Delta compression logic
│   └── vanta_core/                  # VantaMasterCore
│
└── _compiled/                        # Compiled Outputs
    ├── rules/                       # Compiled rules
    ├── snapshots/                   # System snapshots
    └── plans/                       # Frozen plans

## Key Changes and Improvements

1. **Level 1 Anchoring**
   - Added `globalrules.md` as the canonical system governance spec
   - All other governance files are now treated as operational overlays

2. **Enhanced Agent Management**
   - Structured `.cursor/agents/` with per-agent subdirectories
   - Added `manifest.yaml` for centralized agent registry
   - Separated configuration from rules for each agent

3. **MCP Runtime Integration**
   - Added dedicated `mcp/` directory for tool definitions
   - Structured tool definitions with clear namespacing
   - Added tool registry and runtime configuration

4. **Secrets and Environment Management**
   - Added `secrets/` directory with vault integration
   - Implemented environment overlay system
   - SOPS encryption support

5. **Symbolic Runtime Support**
   - Added `.symbols/` for agent memory and ritual seeds
   - Support for tag-based operations
   - Ritual pattern storage

6. **Core System Components**
   - Added `kernel/` for core system functionality
   - Implemented rules engine and delta compression
   - VantaMasterCore integration

7. **Compilation and Output**
   - Added `_compiled/` for build outputs
   - Support for rule compilation
   - System snapshots and frozen plans

## Runtime Rule Merging

The rule merging logic in `.cursor/rules/rules_merge.yaml` follows this precedence:

1. Level 1 (`globalrules.md`) - Base rules
2. Level 2 (`.cursor/rules/*.yaml`) - Project overlays
3. Level 3 (`.cursor/agents/*/rules.yaml`) - Agent-specific rules

Conflict resolution:
- Security rules: Most restrictive wins
- Resource limits: Most restrictive wins
- Tool configurations: Agent-specific overrides if explicitly allowed
- Permissions: Explicit denials override permits 