# MDC Rules Master Index

Generated: 2025-06-07 14:31:54

## Overview

This index provides a comprehensive overview of all MDC rules organized in 9 categories.

## Statistics

- **Categories**: 9
- **Templates**: 4
- **Example Rules**: 27

## Categories

### Core

**Description**: Core language rules (variables, functions, classes)

**Primary Rule Type**: always

**Example Rules**:
- `variable-naming-always.mdc`
- `function-structure-agent.mdc`
- `class-organization-auto.mdc`

### Language

**Description**: Language-specific rules and patterns

**Primary Rule Type**: auto

**Example Rules**:
- `typescript-strict-auto.mdc`
- `python-typing-agent.mdc`
- `javascript-es6-manual.mdc`

### Framework

**Description**: Framework and library specific rules

**Primary Rule Type**: agent

**Example Rules**:
- `react-hooks-agent.mdc`
- `vue-composition-auto.mdc`
- `express-middleware-manual.mdc`

### Testing

**Description**: Testing patterns and best practices

**Primary Rule Type**: manual

**Example Rules**:
- `unit-test-structure-always.mdc`
- `mock-patterns-agent.mdc`
- `test-naming-auto.mdc`

### Workflow

**Description**: Development workflow and process rules

**Primary Rule Type**: always

**Example Rules**:
- `git-commit-format-always.mdc`
- `branch-naming-auto.mdc`
- `ci-pipeline-agent.mdc`

### Security

**Description**: Security patterns and vulnerability prevention

**Primary Rule Type**: always

**Example Rules**:
- `input-validation-always.mdc`
- `auth-patterns-agent.mdc`
- `secrets-management-auto.mdc`

### Performance

**Description**: Performance optimization and monitoring

**Primary Rule Type**: agent

**Example Rules**:
- `lazy-loading-agent.mdc`
- `memory-optimization-auto.mdc`
- `caching-patterns-manual.mdc`

### Documentation

**Description**: Documentation and comment standards

**Primary Rule Type**: auto

**Example Rules**:
- `jsdoc-format-auto.mdc`
- `readme-structure-agent.mdc`
- `inline-comments-manual.mdc`

### Deployment

**Description**: Deployment and infrastructure rules

**Primary Rule Type**: manual

**Example Rules**:
- `docker-best-practices-agent.mdc`
- `env-config-always.mdc`
- `deployment-checklist-manual.mdc`

## Templates

Available in `templates/` folder:

- `always-template.mdc` - Template for always rules
- `auto-template.mdc` - Template for auto rules
- `agent-template.mdc` - Template for agent rules
- `manual-template.mdc` - Template for manual rules

## Quick Reference

### Creating New Rules

1. **Choose category** based on rule domain
2. **Select rule type** (always/auto/agent/manual)
3. **Copy appropriate template** from `templates/`
4. **Customize** frontmatter and content
5. **Validate** using `mdc_rule_validator.py`

### Rule Type Guidelines

- **Always**: Mandatory, automatically enforced
- **Auto**: Applied based on file patterns
- **Agent**: Guidance for AI assistants
- **Manual**: Requires human review

## Associated Tools

- `mdc_rule_validator.py` - Validate rule format and compliance
- `mdc_rule_generator.py` - Generate new rules from prompts
- `setup_folder_structure.py` - Initialize directory structure
- `mdc_migration_script.py` - Migrate existing rules
