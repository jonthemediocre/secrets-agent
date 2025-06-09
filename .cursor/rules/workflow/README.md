# Workflow Rules

Development workflow and process rules

## Purpose

This folder contains rules related to development workflow and process rules.

## Rule Types

This folder primarily contains **always** rules, but may include other types as appropriate.

## Example Rules

- `git-commit-format-always.mdc`
- `branch-naming-auto.mdc`
- `ci-pipeline-agent.mdc`

## Guidelines

### When to Add Rules Here

Add rules to this folder when they:
- Relate to development workflow and process rules
- Follow the always rule pattern
- Don't fit better in another category

### Naming Conventions

Use descriptive, kebab-case names that include:
- The main concept or pattern
- The rule type suffix (`-always`)

Example: `concept-name-always.mdc`

## Related Folders

- **core/**: For fundamental language patterns
- **framework/**: For framework-specific rules
- **testing/**: For test-related patterns
- **security/**: For security considerations

## Contributing

When adding rules to this folder:
1. Follow the always rule template
2. Include clear examples and rationale
3. Use appropriate frontmatter fields
4. Test the rule before committing

## Last Updated

2025-06-07
