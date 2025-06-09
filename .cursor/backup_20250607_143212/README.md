# MDC Rules Directory

This directory contains Markdown with Context (MDC) rules organized in a structured hierarchy for maximum efficiency and maintainability.

## Directory Structure

```
rules/
├── core/           # Core language rules (variables, functions, classes)
├── language/       # Language-specific rules and patterns
├── framework/      # Framework and library specific rules
├── testing/        # Testing patterns and best practices
├── workflow/       # Development workflow and process rules
├── security/       # Security patterns and vulnerability prevention
├── performance/    # Performance optimization and monitoring
├── documentation/  # Documentation and comment standards
├── deployment/     # Deployment and infrastructure rules
├── templates/      # Rule templates for creating new rules
├── README.md       # This file
├── USAGE.md        # Detailed usage instructions
└── CONTRIBUTING.md # Guidelines for contributing new rules
```

## Rule Types

### Always Rules (`*-always.mdc`)
- Automatically enforced without exception
- Mandatory compliance required
- No manual override available

### Auto Rules (`*-auto.mdc`)
- Automatically applied based on file patterns
- Triggered by glob pattern matching
- Context-sensitive activation

### Agent Rules (`*-agent.mdc`)
- Provide guidance to AI assistants
- Influence code completion and suggestions
- Support intelligent development tools

### Manual Rules (`*-manual.mdc`)
- Require human judgment and review
- Applied during code reviews
- Context-dependent application

## Quick Start

1. **Browse by Category**: Navigate to the relevant folder for your rule type
2. **Use Templates**: Copy from `templates/` to create new rules
3. **Follow Examples**: Reference existing rules for patterns
4. **Validate Rules**: Use the MDC validator to check compliance

## Statistics

- **Total Folders**: 9
- **Rule Templates**: 4
- **Created**: 2025-06-07

## Tools

This directory works with the following MDC tools:
- **mdc_rule_validator.py**: Validate rule format and compliance
- **mdc_rule_generator.py**: Generate new rules from prompts
- **setup_folder_structure.py**: Initialize directory structure
- **mdc_migration_script.py**: Migrate existing rules

## Getting Help

- Read `USAGE.md` for detailed usage instructions
- Check `CONTRIBUTING.md` for contribution guidelines
- Review templates in `templates/` for rule structure
- Examine examples in each category folder

## Maintenance

This structure is designed for:
- **Scalability**: Easy addition of new rule categories
- **Organization**: Clear separation of concerns
- **Discoverability**: Logical grouping and naming
- **Automation**: Tool-friendly structure and metadata
