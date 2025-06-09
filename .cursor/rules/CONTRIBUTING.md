# Contributing to MDC Rules

Thank you for contributing to the MDC rules collection! This guide will help you create high-quality, consistent rules.

## Before You Start

### Review Existing Rules
- Browse relevant category folders
- Check for similar or overlapping rules
- Understand established patterns and conventions

### Understand Rule Types
- **Always**: Mandatory, automatically enforced
- **Auto**: Applied based on file patterns
- **Agent**: Guidance for AI assistants
- **Manual**: Requires human review

## Contributing Process

### 1. Planning Your Rule

#### Choose the Right Category
- **core/**: Language fundamentals (variables, functions, classes)
- **language/**: Language-specific patterns
- **framework/**: Framework and library rules
- **testing/**: Testing patterns and practices
- **workflow/**: Development process rules
- **security/**: Security patterns
- **performance/**: Optimization rules
- **documentation/**: Documentation standards
- **deployment/**: Infrastructure and deployment

#### Determine Rule Type
- **Always**: Must this be enforced without exception?
- **Auto**: Should this apply to specific file types?
- **Agent**: Is this guidance for AI tools?
- **Manual**: Does this require human judgment?

### 2. Creating Your Rule

#### Use Appropriate Template
```bash
# Copy template to your target folder
cp templates/always-template.mdc core/my-rule-always.mdc
```

#### Follow Naming Convention
- Use kebab-case: `concept-name-type.mdc`
- Include rule type suffix: `-always`, `-auto`, `-agent`, `-manual`
- Be descriptive but concise

#### Write Clear Frontmatter
```yaml
---
description: "Clear, actionable description starting with a verb"
type: always  # or auto, agent, manual
alwaysApply: true  # for always rules
globs: ["**/*.ts"]  # for auto rules
agents: ["cursor"]  # for agent rules
created: 2024-01-01T00:00:00.000Z
tags: ["variables", "const", "immutable"]
---
```

#### Structure Your Content

1. **Title**: Descriptive H1 header
2. **Description**: Expanded explanation
3. **Type-specific sections**: Based on rule type
4. **Examples**: Good and bad patterns
5. **Rationale**: Why the rule exists
6. **Related Rules**: Links to complementary rules

### 3. Writing Effective Content

#### Be Specific and Actionable
```markdown
# Good
Use `const` for variables that are never reassigned

# Bad
Write good variable declarations
```

#### Provide Clear Examples
```markdown
### Good Example
\`\`\`typescript
const API_URL = 'https://api.example.com';
const userConfig = { theme: 'dark' };
\`\`\`

### Bad Example
\`\`\`typescript
let API_URL = 'https://api.example.com';  // Never reassigned
var userConfig = { theme: 'dark' };       // Use const instead
\`\`\`
```

#### Explain the Rationale
- Why does this rule exist?
- What problems does it solve?
- What are the benefits?

### 4. Quality Standards

#### Required Elements
- [ ] Clear, descriptive title
- [ ] Proper YAML frontmatter
- [ ] Detailed description
- [ ] At least one good example
- [ ] At least one bad example
- [ ] Rationale explanation

#### Content Quality
- [ ] Grammar and spelling checked
- [ ] Code examples are syntactically correct
- [ ] Links and references are valid
- [ ] Consistent with existing rules

#### Technical Requirements
- [ ] Passes validation (`mdc_rule_validator.py`)
- [ ] Appropriate file location
- [ ] Correct naming convention
- [ ] Proper rule type classification

### 5. Testing Your Rule

#### Validate Format
```bash
python .cursor/tools/mdc_rule_validator.py path/to/your-rule.mdc
```

#### Test Examples
- Ensure code examples compile/run
- Verify examples demonstrate the concept
- Check that "bad" examples actually violate the rule

#### Review Integration
- Test with relevant development tools
- Verify AI assistant behavior (for agent rules)
- Check auto-application (for auto rules)

### 6. Submission Guidelines

#### Before Submitting
- [ ] Rule passes validation
- [ ] Content is complete and clear
- [ ] Examples are correct and relevant
- [ ] No duplicate or conflicting rules exist

#### Documentation Updates
- Update folder README if adding new concepts
- Consider updating main documentation
- Add to relevant indexes or catalogs

## Advanced Contributions

### Rule Templates
When contributing new templates:
- Follow existing template structure
- Include comprehensive examples
- Document template usage
- Test with multiple scenarios

### Tooling Improvements
- Enhance validation rules
- Improve generation logic
- Add new rule type support
- Optimize categorization

### Documentation
- Improve usage guides
- Add troubleshooting sections
- Create video tutorials
- Translate content

## Code of Conduct

### Quality Over Quantity
- Focus on valuable, actionable rules
- Avoid redundant or overly specific rules
- Ensure rules add clear value

### Collaboration
- Respect existing patterns and conventions
- Provide constructive feedback
- Help maintain consistency
- Share knowledge and best practices

### Maintenance
- Keep rules up to date
- Fix issues promptly
- Respond to feedback
- Monitor rule effectiveness

## Getting Help

### Resources
- Review existing rules for patterns
- Check templates for structure
- Use validation tools
- Consult team members

### Questions?
- Open an issue for clarification
- Ask in team chat or meetings
- Review documentation
- Test with small examples

## Recognition

Contributors will be recognized for:
- High-quality rule submissions
- Helpful feedback and reviews
- Tool and process improvements
- Documentation enhancements

Thank you for helping improve our development standards!
