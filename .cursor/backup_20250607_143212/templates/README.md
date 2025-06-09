# MDC Rule Templates

This folder contains templates for creating new MDC rules. Each template provides a structured starting point for different rule types.

## Available Templates

### always-template.mdc
Template for creating always-enforced rules that are mandatory and automatically applied.

**Use when:**
- The rule must be followed without exception
- Automatic enforcement is required
- No manual override should be possible

### auto-template.mdc
Template for creating auto-attached rules that apply based on file patterns.

**Use when:**
- The rule should apply to specific file types
- Automatic application based on file patterns is desired
- Context-sensitive rule application is needed

### agent-template.mdc
Template for creating AI agent guidance rules that help assistants make better suggestions.

**Use when:**
- Providing guidance to AI assistants
- Influencing code completion and suggestions
- Creating context for automated tools

### manual-template.mdc
Template for creating manual review rules that require human judgment.

**Use when:**
- Human judgment is required
- Context-sensitive decision making is needed
- Manual review processes are appropriate

## Using Templates

1. Copy the appropriate template to your target folder
2. Rename the file with a descriptive name
3. Modify the frontmatter fields as needed
4. Replace template content with your specific rule
5. Add relevant examples and rationale

## Template Structure

Each template includes:
- **Frontmatter**: YAML metadata with rule configuration
- **Description**: Clear explanation of the rule's purpose
- **Type-specific sections**: Content relevant to the rule type
- **Examples**: Code examples showing good and bad patterns
- **Rationale**: Explanation of why the rule exists
- **Implementation**: How the rule is applied

## Contributing

When improving templates:
- Maintain backward compatibility
- Add clear documentation
- Include comprehensive examples
- Test with real-world scenarios
