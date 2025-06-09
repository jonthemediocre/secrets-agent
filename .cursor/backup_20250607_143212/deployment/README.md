# Deployment Rules

Deployment and infrastructure rules

## Purpose

This folder contains rules related to deployment and infrastructure rules.

## Rule Types

This folder primarily contains **manual** rules, but may include other types as appropriate.

## Example Rules

- `docker-best-practices-agent.mdc`
- `env-config-always.mdc`
- `deployment-checklist-manual.mdc`

## Guidelines

### When to Add Rules Here

Add rules to this folder when they:
- Relate to deployment and infrastructure rules
- Follow the manual rule pattern
- Don't fit better in another category

### Naming Conventions

Use descriptive, kebab-case names that include:
- The main concept or pattern
- The rule type suffix (`-manual`)

Example: `concept-name-manual.mdc`

## Related Folders

- **core/**: For fundamental language patterns
- **framework/**: For framework-specific rules
- **testing/**: For test-related patterns
- **security/**: For security considerations

## Contributing

When adding rules to this folder:
1. Follow the manual rule template
2. Include clear examples and rationale
3. Use appropriate frontmatter fields
4. Test the rule before committing

## Last Updated

2025-06-07
