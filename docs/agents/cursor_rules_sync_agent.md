# Cursor & Rules Sync Agent

## Overview

The **Cursor & Rules Sync Agent** is a specialized VANTA agent that recursively scans all project directories to analyze, generate, and synchronize `.cursor` (development) and `.rules` (production) configuration files. This agent ensures consistent scaffolding across all project components while maintaining clear boundaries between development tools and production governance.

## Purpose

This agent addresses the need for:

1. **Recursive Project Audit** - Comprehensive scanning of all subfolders including agents, rules, indexes, and symbolic node trees
2. **Automatic File Generation** - Creation of baseline `.cursor` files for local development and `.rules` files for production
3. **Smart Synchronization** - Intelligent syncing and symlinking of shared configurations
4. **Cursor AI Decoupling** - Clear separation between IDE-specific `.cursor` files and production-ready `.rules` files

## Architecture

### Key Components

- **Scanner Module** - Recursively traverses directory structures
- **Template Engine** - Generates appropriate configurations based on context
- **Sync Manager** - Handles file synchronization and symlink creation
- **Inheritance Resolver** - Manages rule inheritance and index stitching

### Template System

The agent uses context-aware templates:

- **agent** - For agent directories and files
- **processor** - For data processing components
- **ui_component** - For UI/frontend components
- **symbolic_kernel** - For symbolic kernel components
- **runtime_node** - For runtime execution nodes
- **cli_tool** - For command-line tools

## Usage

### Via Cascade

The agent can be triggered through two cascade profiles:

1. **Full Audit Cascade** (`cursor_rules_sync_full_audit_cascade`)
   ```yaml
   trigger: cursor_rules_sync_full_audit_cascade
   parameters:
     target_path: "."  # Optional, defaults to project root
     options:
       exclude_dirs: [".git", "node_modules"]
   ```

2. **Quick Scan Cascade** (`cursor_rules_quick_scan_cascade`)
   - Triggered as a whisper when configuration files change
   - Performs scan-only operation without modifications

### Manual Execution

Use the provided script for manual operations:

```bash
# Scan only
python scripts/run_cursor_rules_sync.py scan

# Generate missing files
python scripts/run_cursor_rules_sync.py generate

# Sync configurations
python scripts/run_cursor_rules_sync.py sync

# Full workflow (scan -> generate -> sync)
python scripts/run_cursor_rules_sync.py full

# With options
python scripts/run_cursor_rules_sync.py full --dry-run --enable-symlinks
```

### Direct Agent Usage

```python
from vanta_seed.agents.cursor_rules_sync_agent import CursorRulesSyncAgent

# Initialize agent
agent = CursorRulesSyncAgent(
    agent_id="cursor_sync",
    core_config={},
    plugin_manager=plugin_manager
)

# Scan directories
result = agent.process_task({
    "action": "scan",
    "target_path": "/path/to/project",
    "options": {
        "exclude_dirs": [".git", "__pycache__"],
        "include_root": False
    }
})

# Generate missing files
result = agent.process_task({
    "action": "generate",
    "options": {
        "generate_cursor": True,
        "generate_rules": True,
        "dry_run": False
    }
})

# Sync configurations
result = agent.process_task({
    "action": "sync",
    "options": {
        "enable_symlinks": True,
        "sync_rules": True
    }
})
```

## Actions

### scan

Recursively scans directories to identify:
- Missing `.cursor` directories
- Missing `.rules` directories
- Existing configuration files
- Inheritance patterns
- Potential sync opportunities

**Parameters:**
- `target_path` (str): Root path to start scanning
- `options.exclude_dirs` (list): Directories to exclude
- `options.include_root` (bool): Whether to include root directory

**Returns:** `ScanResult` with directories scanned, missing files, and inheritance chains

### generate

Creates missing configuration files based on context and templates.

**Parameters:**
- `options.generate_cursor` (bool): Generate `.cursor` files
- `options.generate_rules` (bool): Generate `.rules` files
- `options.dry_run` (bool): Preview without creating files

**Returns:** `GenerationResult` with counts of files created

### sync

Synchronizes configurations across directories and creates symlinks for shared files.

**Parameters:**
- `options.enable_symlinks` (bool): Create symlinks for shared configs
- `options.sync_rules` (bool): Sync rule configurations

**Returns:** `SyncResult` with sync statistics

### clear_cache

Clears the internal scan cache.

**Parameters:** None

**Returns:** Success status

## File Structure

### .cursor Files (Development)

Generated in each relevant directory:
```
agents/.cursor/
├── rules/
│   ├── index.mdc         # Rule index with inheritance
│   └── agent-specific.mdc # Context-specific rules
└── config.yaml           # IDE-specific configuration
```

### .rules Files (Production)

Generated for production governance:
```
agents/.rules/
├── agent_rules.yaml      # Agent-specific production rules
├── validation.yaml       # Validation schemas
└── deployment.yaml       # Deployment configurations
```

## Template Examples

### Agent Template
```yaml
# Generated .cursor/rules/index.mdc for agent directory
---
inherits: ../../.cursor/rules/index.mdc
rules:
  - agent-base-contract
  - logging-requirements
  - testing-protocol
tags: [agent, vanta, autonomous]
---
# Agent-Specific Rules

This directory contains agent implementations following VANTA standards.
```

### Symbolic Kernel Template
```yaml
# Generated .rules/kernel_rules.yaml for symbolic components
type: symbolic_kernel
version: 1.0
metadata:
  role: kernel
  context: symbolic_processing
  
validation:
  required_methods: [process, collapse, resolve]
  memory_principles: true
  
governance:
  access_level: restricted
  audit_level: verbose
```

## Integration Points

### With VantaMasterCore
- Registered in agent registry
- Can be triggered via cascades
- Logs to agentic replay log

### With Other Agents
- Can trigger logging via `detailed_event_logger_agent`
- May interact with validation agents
- Provides configuration foundation for all agents

## Best Practices

1. **Regular Audits** - Run full audits periodically to maintain consistency
2. **Dry Run First** - Use `--dry-run` to preview changes before applying
3. **Exclude Patterns** - Configure appropriate exclude patterns for your project
4. **Symlink Strategy** - Use symlinks for truly shared configurations only
5. **Inheritance Chains** - Leverage inheritance for DRY principle

## Configuration

### Agent Registry Entry
```yaml
- id: cursor_rules_sync_agent
  name: "Cursor & Rules Sync Agent"
  type: agent
  class_path: "vanta_seed.agents.cursor_rules_sync_agent.CursorRulesSyncAgent"
  capabilities:
    - directory_scanning
    - file_generation
    - template_management
    - symlink_creation
    - rule_inheritance
```

### Default Options
```yaml
exclude_dirs: [".git", "__pycache__", "node_modules", ".venv", ".next", "coverage"]
scan_patterns:
  cursor_files: ["**/.cursor/**/*.mdc"]
  rules_files: ["**/.rules/**/*.yaml"]
  agent_files: ["**/agents/*.py"]
```

## Troubleshooting

### Common Issues

1. **Permission Errors**
   - Ensure write permissions for target directories
   - Run with appropriate user privileges

2. **Symlink Failures**
   - May require admin rights on Windows
   - Use `--no-symlinks` if problematic

3. **Template Not Found**
   - Check template mappings in agent configuration
   - Verify context detection logic

### Debug Mode

Enable debug logging:
```python
import logging
logging.getLogger("vanta_seed.agents.cursor_rules_sync_agent").setLevel(logging.DEBUG)
```

## Future Enhancements

- [ ] Watch mode for real-time synchronization
- [ ] Git integration for tracking changes
- [ ] Custom template support
- [ ] Rule validation and linting
- [ ] Merge conflict resolution
- [ ] Visual mapping of inheritance chains 