# Framework Rules

Framework and library specific rules

## Purpose

This folder contains rules related to framework and library specific rules.

## Rule Types

This folder primarily contains **agent** rules, but may include other types as appropriate.

## Example Rules

- `react-hooks-agent.mdc`
- `vue-composition-auto.mdc`
- `express-middleware-manual.mdc`

## Guidelines

### When to Add Rules Here

Add rules to this folder when they:
- Relate to framework and library specific rules
- Follow the agent rule pattern
- Don't fit better in another category

### Naming Conventions

Use descriptive, kebab-case names that include:
- The main concept or pattern
- The rule type suffix (`-agent`)

Example: `concept-name-agent.mdc`

## Related Folders

- **core/**: For fundamental language patterns
- **framework/**: For framework-specific rules
- **testing/**: For test-related patterns
- **security/**: For security considerations

## Contributing

When adding rules to this folder:
1. Follow the agent rule template
2. Include clear examples and rationale
3. Use appropriate frontmatter fields
4. Test the rule before committing

## Last Updated

2025-06-07
