# Language Rules

Language-specific rules and patterns

## Purpose

This folder contains rules related to language-specific rules and patterns.

## Rule Types

This folder primarily contains **auto** rules, but may include other types as appropriate.

## Example Rules

- `typescript-strict-auto.mdc`
- `python-typing-agent.mdc`
- `javascript-es6-manual.mdc`

## Guidelines

### When to Add Rules Here

Add rules to this folder when they:
- Relate to language-specific rules and patterns
- Follow the auto rule pattern
- Don't fit better in another category

### Naming Conventions

Use descriptive, kebab-case names that include:
- The main concept or pattern
- The rule type suffix (`-auto`)

Example: `concept-name-auto.mdc`

## Related Folders

- **core/**: For fundamental language patterns
- **framework/**: For framework-specific rules
- **testing/**: For test-related patterns
- **security/**: For security considerations

## Contributing

When adding rules to this folder:
1. Follow the auto rule template
2. Include clear examples and rationale
3. Use appropriate frontmatter fields
4. Test the rule before committing

## Last Updated

2025-06-07
