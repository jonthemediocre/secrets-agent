# MDC Rules Usage Guide

This guide explains how to effectively use the MDC rules directory structure.

## Understanding the Organization

### Folder Categories

Each folder represents a specific domain of rules:

- **core/**: Fundamental language constructs (variables, functions, classes)
- **language/**: Language-specific patterns (TypeScript, Python, etc.)
- **framework/**: Framework-specific rules (React, Vue, Express, etc.)
- **testing/**: Test-related patterns and practices
- **workflow/**: Development process and tooling rules
- **security/**: Security patterns and vulnerability prevention
- **performance/**: Optimization and performance rules
- **documentation/**: Documentation standards and practices
- **deployment/**: Infrastructure and deployment rules

### Rule Types in Practice

#### Always Rules
```yaml
---
description: "Variables must use const when value never changes"
alwaysApply: true
type: always
priority: high
---
```

**Use for:**
- Critical coding standards
- Security requirements
- Mandatory patterns

#### Auto Rules
```yaml
---
description: "Apply TypeScript strict mode to all TS files"
globs: ["**/*.ts", "**/*.tsx"]
type: auto
---
```

**Use for:**
- File-type specific rules
- Automatic application based on patterns
- Context-sensitive enforcement

#### Agent Rules
```yaml
---
description: "Guide AI to suggest React hooks best practices"
type: agent
agents: ["cursor", "ai-assistant"]
complexity: medium
---
```

**Use for:**
- AI assistant guidance
- Code completion improvements
- Intelligent suggestions

#### Manual Rules
```yaml
---
description: "Review API design for consistency"
type: manual
reviewType: consideration
priority: medium
---
```

**Use for:**
- Human judgment requirements
- Code review checklists
- Contextual decisions

## Creating New Rules

### Method 1: Using Templates

1. Copy appropriate template from `templates/`
2. Rename with descriptive name and rule type suffix
3. Modify frontmatter and content
4. Place in appropriate category folder

### Method 2: Using Generator Tool

```bash
python .cursor/tools/mdc_rule_generator.py "Always use const for variables that never change"
```

### Method 3: Manual Creation

1. Choose appropriate folder
2. Create new `.mdc` file
3. Add YAML frontmatter
4. Write rule content with examples

## Naming Conventions

### File Names
- Use kebab-case: `variable-naming-always.mdc`
- Include rule type suffix: `-always`, `-auto`, `-agent`, `-manual`
- Be descriptive: `react-hooks-best-practices-agent.mdc`

### Rule Descriptions
- Start with verb: "Enforce...", "Guide...", "Require..."
- Be specific: "Use const for immutable variables"
- Avoid vague terms: "Good code" → "Consistent naming"

## Rule Content Structure

### Required Sections

1. **Title**: Clear, descriptive heading
2. **Description**: Detailed explanation of the rule
3. **Examples**: Good and bad code patterns
4. **Rationale**: Why the rule exists

### Optional Sections

- **Implementation**: How the rule is enforced
- **Configuration**: Customization options
- **Related Rules**: Links to complementary rules
- **Notes**: Additional considerations

## Best Practices

### Writing Effective Rules

1. **Be Specific**: Clear, actionable guidance
2. **Provide Examples**: Show both good and bad patterns
3. **Explain Why**: Include rationale and benefits
4. **Consider Context**: Account for different scenarios

### Organizing Rules

1. **Single Responsibility**: One concept per rule
2. **Appropriate Category**: Place in most relevant folder
3. **Avoid Duplication**: Check for existing similar rules
4. **Consistent Style**: Follow established patterns

### Testing Rules

1. **Validate Format**: Use `mdc_rule_validator.py`
2. **Test Examples**: Ensure code examples are correct
3. **Check References**: Verify links and related rules
4. **Review Impact**: Consider rule interactions

## Working with Tools

### Validation
```bash
# Validate single rule
python .cursor/tools/mdc_rule_validator.py path/to/rule.mdc

# Validate entire directory
python .cursor/tools/mdc_rule_validator.py .cursor/rules/
```

### Generation
```bash
# Interactive mode
python .cursor/tools/mdc_rule_generator.py --interactive

# Direct generation
python .cursor/tools/mdc_rule_generator.py "Rule description here"
```

### Migration
```bash
# Migrate existing rules
python .cursor/tools/mdc_migration_script.py --source old_rules/ --target .cursor/rules/
```

## Troubleshooting

### Common Issues

1. **Validation Errors**: Check YAML frontmatter syntax
2. **Wrong Category**: Review folder descriptions
3. **Naming Conflicts**: Use more specific names
4. **Missing Examples**: Add practical code examples

### Getting Help

1. Check existing rules for patterns
2. Review templates for structure
3. Use validation tools for format checking
4. Consult contributing guidelines

## Integration

### IDE Integration
- Rules provide context to AI assistants
- Auto rules trigger based on file patterns
- Always rules enforce standards automatically

### CI/CD Integration
- Validate rules in build pipeline
- Check rule compliance in pull requests
- Generate reports on rule coverage

### Team Workflow
- Review rules during code review
- Update rules based on team feedback
- Maintain rule documentation
