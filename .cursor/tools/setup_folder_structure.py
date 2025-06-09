#!/usr/bin/env python3
"""
MDC Folder Structure Setup - Step 3 of 4
Creates organized folder structure with templates and examples
"""

import os
import yaml
from pathlib import Path
from typing import Dict, List, Any
from datetime import datetime

class MDCFolderStructure:
    """Sets up organized MDC rule folder structure following UAP Level 2 standards"""
    
    FOLDER_STRUCTURE = {
        'core': {
            'description': 'Core language rules (variables, functions, classes)',
            'examples': ['variable-naming-always', 'function-structure-agent', 'class-organization-auto'],
            'template_type': 'always'
        },
        'language': {
            'description': 'Language-specific rules and patterns',
            'examples': ['typescript-strict-auto', 'python-typing-agent', 'javascript-es6-manual'],
            'template_type': 'auto'
        },
        'framework': {
            'description': 'Framework and library specific rules',
            'examples': ['react-hooks-agent', 'vue-composition-auto', 'express-middleware-manual'],
            'template_type': 'agent'
        },
        'testing': {
            'description': 'Testing patterns and best practices',
            'examples': ['unit-test-structure-always', 'mock-patterns-agent', 'test-naming-auto'],
            'template_type': 'manual'
        },
        'workflow': {
            'description': 'Development workflow and process rules',
            'examples': ['git-commit-format-always', 'branch-naming-auto', 'ci-pipeline-agent'],
            'template_type': 'always'
        },
        'security': {
            'description': 'Security patterns and vulnerability prevention',
            'examples': ['input-validation-always', 'auth-patterns-agent', 'secrets-management-auto'],
            'template_type': 'always'
        },
        'performance': {
            'description': 'Performance optimization and monitoring',
            'examples': ['lazy-loading-agent', 'memory-optimization-auto', 'caching-patterns-manual'],
            'template_type': 'agent'
        },
        'documentation': {
            'description': 'Documentation and comment standards',
            'examples': ['jsdoc-format-auto', 'readme-structure-agent', 'inline-comments-manual'],
            'template_type': 'auto'
        },
        'deployment': {
            'description': 'Deployment and infrastructure rules',
            'examples': ['docker-best-practices-agent', 'env-config-always', 'deployment-checklist-manual'],
            'template_type': 'manual'
        }
    }
    
    TEMPLATES = {
        'always': {
            'frontmatter': {
                'description': 'Template for always-enforced rules',
                'alwaysApply': True,
                'type': 'always',
                'priority': 'high',
                'created': None  # Will be set during generation
            },
            'content': '''# Always Rule Template

## Description

This is a template for creating always-enforced rules. These rules are mandatory and automatically applied in all applicable contexts.

## Enforcement

This rule is **mandatory** and will be enforced automatically without exception.

## Requirements

- Must be followed in all circumstances
- Violations will be flagged immediately
- No manual override available
- Applies to all relevant contexts

## Examples

### Required Pattern

```javascript
// Always use this pattern
const CONSTANT_VALUE = 'required-format';
```

### Prohibited Pattern

```javascript
// Never use this pattern
var variableName = 'prohibited-format';
```

## Rationale

### Why This Rule Exists

This rule exists to enforce critical standards that:
- Prevent common errors
- Ensure consistency across the codebase
- Maintain code quality standards
- Support automated tooling

### Benefits

- **Consistency**: Uniform code patterns across all files
- **Quality**: Prevents low-quality code patterns
- **Automation**: Enables reliable automated checks
- **Maintainability**: Reduces cognitive load for developers

## Implementation

This rule will be automatically enforced by:
- Real-time code analysis
- Pre-commit hooks
- CI/CD pipeline checks
- IDE integrations

## Related Rules

- Link to related always rules
- Reference complementary patterns
- Note any rule hierarchies
'''
        },
        
        'auto': {
            'frontmatter': {
                'description': 'Template for auto-attached rules based on file patterns',
                'globs': ['**/*.js', '**/*.ts'],
                'type': 'auto',
                'autoApply': True,
                'created': None
            },
            'content': '''# Auto-Attached Rule Template

## Description

This is a template for creating auto-attached rules that apply automatically to files matching specific patterns.

## File Patterns

This rule automatically applies to files matching:

- `**/*.js` - JavaScript files
- `**/*.ts` - TypeScript files
- `**/*.jsx` - React JavaScript files
- `**/*.tsx` - React TypeScript files

## Automatic Application

When files matching the above patterns are detected, this rule will be:

- Applied automatically during editing
- Checked during file validation
- Enforced in build processes
- Available to AI assistants for context

## Rule Logic

### Trigger Conditions

The rule activates when:
1. File matches glob patterns
2. File is being edited or created
3. Automated checks are running

### Scope

This rule applies to:
- New file creation
- Existing file modifications
- Bulk operations on matching files

## Examples

### Matching Files

```
src/
├── components/
│   ├── Button.tsx     ✓ Matches
│   ├── Modal.jsx      ✓ Matches
│   └── styles.css     ✗ No match
├── utils/
│   ├── helpers.js     ✓ Matches
│   └── config.json    ✗ No match
```

### Pattern Application

```typescript
// This rule automatically applies to this TypeScript file
interface ComponentProps {
  // Rule-specific requirements here
}
```

## Configuration

### Pattern Customization

You can modify the glob patterns to:
- Include additional file types
- Exclude specific directories
- Add more specific patterns

### Example Patterns

```yaml
globs:
  - "src/**/*.{js,ts,jsx,tsx}"  # Source files only
  - "!**/*.test.*"              # Exclude test files
  - "components/**/*.vue"       # Vue components
```

## Rationale

Auto-attached rules provide:
- **Efficiency**: No manual rule selection needed
- **Coverage**: Automatic application to relevant files
- **Consistency**: Uniform application across file types
- **Integration**: Seamless tool integration

## Related Rules

- Other auto rules for similar file patterns
- Manual rules that complement this automation
- Always rules that take precedence
'''
        },
        
        'agent': {
            'frontmatter': {
                'description': 'Template for AI agent guidance rules',
                'type': 'agent',
                'agents': ['cursor', 'ai-assistant'],
                'complexity': 'medium',
                'created': None
            },
            'content': '''# AI Agent Guidance Rule Template

## Description

This is a template for creating rules that provide guidance to AI assistants and code completion tools.

## AI Assistant Guidance

This rule provides context and guidance to AI assistants for:

- Code generation and completion
- Refactoring suggestions
- Best practice recommendations
- Context-aware assistance

### Target Agents

- **Cursor AI**: Integrated development environment assistance
- **AI Assistant**: General code assistance and completion
- **Code Review Bots**: Automated review guidance
- **Documentation Generators**: Context for documentation

## Guidance Context

### When to Apply

AI assistants should consider this rule when:
- Generating new code
- Suggesting refactoring
- Providing code completion
- Reviewing code changes
- Creating documentation

### Guidance Principles

1. **Context Awareness**: Understand the current codebase context
2. **Best Practices**: Suggest industry-standard patterns
3. **Consistency**: Maintain existing code patterns
4. **Safety**: Avoid potentially problematic patterns

## Examples

### AI Suggestion Context

```typescript
// When user types: "create a user service"
// AI should consider this rule and suggest:

class UserService {
  // Rule-guided implementation
  private readonly repository: UserRepository;
  
  constructor(repository: UserRepository) {
    this.repository = repository;
  }
  
  // Methods following rule guidelines
}
```

### Code Completion Guidance

```typescript
// When user starts typing: "const user"
// AI should suggest patterns that follow this rule:

const userData = await userService.fetchUser(id); // ✓ Good
const user = getUser(id);                         // ✗ Less preferred
```

## Complexity Considerations

### Medium Complexity Rule

This rule requires:
- Understanding of context and patterns
- Balancing multiple considerations
- Nuanced application based on situation

### AI Decision Factors

When applying this rule, AI should consider:
- Existing code patterns in the project
- Framework and library conventions
- Team coding standards
- Performance implications

## Integration Points

### Development Tools

- **IDE Autocomplete**: Influence suggestion ranking
- **Code Generation**: Guide template selection
- **Refactoring Tools**: Inform transformation choices
- **Code Review**: Provide automated feedback

### Workflow Integration

- Real-time suggestions during coding
- Pre-commit guidance and warnings
- Pull request review assistance
- Documentation generation context

## Rationale

AI guidance rules provide:
- **Intelligent Assistance**: Context-aware code suggestions
- **Learning Support**: Help developers learn best practices
- **Consistency**: Maintain team coding standards
- **Productivity**: Reduce manual decision-making

## Related Rules

- Other agent rules for complementary guidance
- Auto rules that may trigger alongside this guidance
- Always rules that take precedence over suggestions
'''
        },
        
        'manual': {
            'frontmatter': {
                'description': 'Template for manual review and consideration rules',
                'type': 'manual',
                'reviewType': 'consideration',
                'priority': 'medium',
                'created': None
            },
            'content': '''# Manual Review Rule Template

## Description

This is a template for creating rules that require manual review and consideration during development.

## Manual Review Process

This rule requires human judgment and should be considered during:

- Code reviews
- Refactoring sessions
- Architecture decisions
- Performance optimization
- Security audits

### Review Triggers

Consider this rule when:
- Writing new functionality
- Modifying existing code
- Planning architecture changes
- Investigating performance issues
- Conducting security reviews

## Review Guidelines

### What to Look For

During manual review, examine:
1. **Pattern Application**: Is the suggested pattern appropriate?
2. **Context Sensitivity**: Does the context warrant special consideration?
3. **Trade-offs**: What are the benefits and costs?
4. **Alternatives**: Are there better approaches?

### Decision Framework

Use this framework for evaluation:

```
1. Assess Current Situation
   ├── Identify applicable patterns
   ├── Evaluate context factors
   └── Consider constraints

2. Evaluate Options
   ├── List possible approaches
   ├── Weigh pros and cons
   └── Consider long-term impact

3. Make Decision
   ├── Choose best approach
   ├── Document reasoning
   └── Plan implementation
```

## Examples

### Review Scenario

```typescript
// Scenario: Choosing between different API patterns

// Option 1: RESTful approach
class UserController {
  async getUser(req: Request, res: Response) {
    // Traditional REST implementation
  }
}

// Option 2: GraphQL approach
class UserResolver {
  async user(args: UserArgs) {
    // GraphQL implementation
  }
}

// Manual consideration needed:
// - Project requirements
// - Team expertise
// - Performance needs
// - Client requirements
```

### Review Checklist

When reviewing code against this rule:

- [ ] Does the implementation follow established patterns?
- [ ] Are there any obvious improvements?
- [ ] Does it handle edge cases appropriately?
- [ ] Is it maintainable and readable?
- [ ] Are there performance considerations?
- [ ] Does it follow security best practices?

## Implementation Guidance

### When to Apply

Apply this rule during:
- **Code Reviews**: As a checklist item
- **Refactoring**: When considering improvements
- **Planning**: During architecture discussions
- **Debugging**: When investigating issues

### Review Depth

The level of review depends on:
- **Criticality**: More critical code needs deeper review
- **Complexity**: Complex changes need more analysis
- **Risk**: High-risk areas need extra attention
- **Impact**: Widespread changes need careful consideration

## Documentation

### Recording Decisions

When applying this rule, document:
- What was considered
- Why decisions were made
- What alternatives were rejected
- Any future considerations

### Example Decision Log

```markdown
## Decision: User Authentication Pattern

### Context
Need to implement user authentication for new feature.

### Options Considered
1. JWT tokens with local storage
2. Session-based authentication
3. OAuth integration

### Decision
Chose session-based authentication because:
- Better security for our use case
- Simpler implementation
- Fits existing infrastructure

### Future Considerations
- Monitor performance impact
- Consider OAuth for v2.0
```

## Rationale

Manual review rules provide:
- **Human Judgment**: Leverage developer expertise
- **Context Sensitivity**: Consider unique situations
- **Quality Assurance**: Catch issues automation might miss
- **Knowledge Sharing**: Promote team learning

## Related Rules

- Always rules that take precedence
- Auto rules that might inform the review
- Other manual rules for comprehensive review
'''
        }
    }
    
    def __init__(self, base_path: str = ".cursor/rules"):
        self.base_path = Path(base_path)
    
    def create_folder_structure(self):
        """Create the complete folder structure with all components"""
        print("Creating MDC Rule Folder Structure...")
        print("=" * 50)
        
        # Create base directory
        self.base_path.mkdir(parents=True, exist_ok=True)
        print(f"✓ Created base directory: {self.base_path}")
        
        # Create folder structure
        self._create_folders()
        
        # Create templates
        self._create_templates()
        
        # Create examples
        self._create_examples()
        
        # Create documentation
        self._create_documentation()
        
        # Create master index
        self._create_master_index()
        
        print("\n✓ Folder structure creation complete!")
        self._print_summary()
    
    def _create_folders(self):
        """Create all category folders with README files"""
        print("\nCreating category folders...")
        
        for folder_name, config in self.FOLDER_STRUCTURE.items():
            folder_path = self.base_path / folder_name
            folder_path.mkdir(exist_ok=True)
            
            # Create README for each folder
            readme_content = self._generate_folder_readme(folder_name, config)
            readme_path = folder_path / "README.md"
            with open(readme_path, 'w', encoding='utf-8') as f:
                f.write(readme_content)
            
            print(f"  ✓ {folder_name}/ - {config['description']}")
    
    def _generate_folder_readme(self, folder_name: str, config: Dict[str, Any]) -> str:
        """Generate README content for a folder"""
        return f"""# {folder_name.title()} Rules

{config['description']}

## Purpose

This folder contains rules related to {config['description'].lower()}.

## Rule Types

This folder primarily contains **{config['template_type']}** rules, but may include other types as appropriate.

## Example Rules

{chr(10).join(f"- `{example}.mdc`" for example in config['examples'])}

## Guidelines

### When to Add Rules Here

Add rules to this folder when they:
- Relate to {config['description'].lower()}
- Follow the {config['template_type']} rule pattern
- Don't fit better in another category

### Naming Conventions

Use descriptive, kebab-case names that include:
- The main concept or pattern
- The rule type suffix (`-{config['template_type']}`)

Example: `concept-name-{config['template_type']}.mdc`

## Related Folders

- **core/**: For fundamental language patterns
- **framework/**: For framework-specific rules
- **testing/**: For test-related patterns
- **security/**: For security considerations

## Contributing

When adding rules to this folder:
1. Follow the {config['template_type']} rule template
2. Include clear examples and rationale
3. Use appropriate frontmatter fields
4. Test the rule before committing

## Last Updated

{datetime.now().strftime("%Y-%m-%d")}
"""
    
    def _create_templates(self):
        """Create rule templates for each type"""
        print("\nCreating rule templates...")
        
        templates_dir = self.base_path / "templates"
        templates_dir.mkdir(exist_ok=True)
        
        for rule_type, template_config in self.TEMPLATES.items():
            # Set creation timestamp
            frontmatter = template_config['frontmatter'].copy()
            frontmatter['created'] = datetime.now().isoformat()
            
            # Generate template content
            frontmatter_yaml = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)
            full_content = f"---\n{frontmatter_yaml}---\n\n{template_config['content']}"
            
            # Save template
            template_path = templates_dir / f"{rule_type}-template.mdc"
            with open(template_path, 'w', encoding='utf-8') as f:
                f.write(full_content)
            
            print(f"  ✓ {rule_type}-template.mdc")
        
        # Create templates README
        templates_readme = self._generate_templates_readme()
        with open(templates_dir / "README.md", 'w', encoding='utf-8') as f:
            f.write(templates_readme)
        
        print(f"  ✓ templates/README.md")
    
    def _generate_templates_readme(self) -> str:
        """Generate README for templates folder"""
        return """# MDC Rule Templates

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
"""
    
    def _create_examples(self):
        """Create example rules for each folder"""
        print("\nCreating example rules...")
        
        for folder_name, config in self.FOLDER_STRUCTURE.items():
            folder_path = self.base_path / folder_name
            
            # Create one example for each rule type, focusing on the primary type
            example_rules = [
                self._create_example_rule(folder_name, config, config['template_type']),
                self._create_example_rule(folder_name, config, 'agent'),  # Always include an agent example
            ]
            
            for rule_name, content in example_rules:
                if content:  # Skip if no content generated
                    rule_path = folder_path / f"{rule_name}.mdc"
                    with open(rule_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    print(f"  ✓ {folder_name}/{rule_name}.mdc")
    
    def _create_example_rule(self, folder_name: str, config: Dict[str, Any], rule_type: str) -> tuple:
        """Create a specific example rule"""
        if rule_type == config['template_type']:
            # Use the primary example for this folder
            rule_name = config['examples'][0]
        elif rule_type == 'agent':
            # Create a generic agent example
            rule_name = f"{folder_name}-guidance-agent"
        else:
            return None, None  # Skip other types for brevity
        
        # Generate appropriate frontmatter
        frontmatter = {
            'description': f'Example {rule_type} rule for {config["description"].lower()}',
            'type': rule_type,
            'created': datetime.now().isoformat(),
            'example': True,
            'category': folder_name
        }
        
        # Add type-specific fields
        if rule_type == 'always':
            frontmatter['alwaysApply'] = True
            frontmatter['priority'] = 'high'
        elif rule_type == 'auto':
            frontmatter['globs'] = self._get_example_globs(folder_name)
        elif rule_type == 'agent':
            frontmatter['agents'] = ['cursor', 'ai-assistant']
            frontmatter['complexity'] = 'medium'
        elif rule_type == 'manual':
            frontmatter['reviewType'] = 'consideration'
        
        # Generate content based on folder and type
        content = self._generate_example_content(folder_name, rule_type, config)
        
        # Combine into full rule
        frontmatter_yaml = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)
        full_content = f"---\n{frontmatter_yaml}---\n\n{content}"
        
        return rule_name, full_content
    
    def _get_example_globs(self, folder_name: str) -> List[str]:
        """Get appropriate glob patterns for folder"""
        folder_globs = {
            'core': ['**/*.js', '**/*.ts', '**/*.py'],
            'language': ['**/*.ts', '**/*.tsx'],
            'framework': ['**/*.jsx', '**/*.tsx', '**/*.vue'],
            'testing': ['**/*.test.*', '**/*.spec.*'],
            'workflow': ['**/package.json', '**/.github/**'],
            'security': ['**/*.js', '**/*.ts', '**/*.py'],
            'performance': ['**/*.js', '**/*.ts'],
            'documentation': ['**/*.md', '**/*.mdx'],
            'deployment': ['**/Dockerfile', '**/*.yml', '**/*.yaml']
        }
        return folder_globs.get(folder_name, ['**/*'])
    
    def _generate_example_content(self, folder_name: str, rule_type: str, config: Dict[str, Any]) -> str:
        """Generate example content for a specific folder and rule type"""
        title = f"{folder_name.title()} {rule_type.title()} Rule Example"
        
        content = f"""# {title}

## Description

This is an example {rule_type} rule for {config['description'].lower()}. It demonstrates the proper structure and content for rules in the {folder_name} category.

## Rule Implementation

{self._get_implementation_text(rule_type)}

## Examples

### Good Pattern

```javascript
// Example of following this rule
const examplePattern = {{
  // Implementation that follows best practices
  property: 'value'
}};
```

### Poor Pattern

```javascript
// Example of violating this rule
var badPattern = {{
  // Implementation that violates the rule
  prop: 'val'
}};
```

## Rationale

This rule exists to:
- Promote best practices in {config['description'].lower()}
- Ensure consistency across the codebase
- Prevent common mistakes and issues
- Support maintainable code patterns

## Related Rules

- See other rules in the {folder_name}/ folder
- Consider complementary rules in related folders
- Review always rules that may take precedence

## Notes

This is an example rule for demonstration purposes. Modify it according to your specific needs and requirements.
"""
        return content
    
    def _get_implementation_text(self, rule_type: str) -> str:
        """Get implementation description for rule type"""
        implementations = {
            'always': 'This rule is automatically enforced and cannot be bypassed. It applies to all relevant code without exception.',
            'auto': 'This rule automatically applies to files matching the specified glob patterns. It activates based on file type and location.',
            'agent': 'This rule provides guidance to AI assistants and code completion tools. It influences suggestions and automated assistance.',
            'manual': 'This rule requires manual review and consideration. Apply it during code reviews and planning sessions.'
        }
        return implementations.get(rule_type, 'Implementation details for this rule type.')
    
    def _create_documentation(self):
        """Create comprehensive documentation"""
        print("\nCreating documentation...")
        
        # Main README
        main_readme = self._generate_main_readme()
        with open(self.base_path / "README.md", 'w', encoding='utf-8') as f:
            f.write(main_readme)
        print("  ✓ README.md")
        
        # Usage guide
        usage_guide = self._generate_usage_guide()
        with open(self.base_path / "USAGE.md", 'w', encoding='utf-8') as f:
            f.write(usage_guide)
        print("  ✓ USAGE.md")
        
        # Contributing guide
        contributing_guide = self._generate_contributing_guide()
        with open(self.base_path / "CONTRIBUTING.md", 'w', encoding='utf-8') as f:
            f.write(contributing_guide)
        print("  ✓ CONTRIBUTING.md")
    
    def _generate_main_readme(self) -> str:
        """Generate main README content"""
        return f"""# MDC Rules Directory

This directory contains Markdown with Context (MDC) rules organized in a structured hierarchy for maximum efficiency and maintainability.

## Directory Structure

```
{self.base_path.name}/
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

- **Total Folders**: {len(self.FOLDER_STRUCTURE)}
- **Rule Templates**: {len(self.TEMPLATES)}
- **Created**: {datetime.now().strftime("%Y-%m-%d")}

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
"""
    
    def _generate_usage_guide(self) -> str:
        """Generate detailed usage guide"""
        return """# MDC Rules Usage Guide

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
"""
    
    def _generate_contributing_guide(self) -> str:
        """Generate contributing guidelines"""
        return r"""# Contributing to MDC Rules

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
"""
    
    def _create_master_index(self):
        """Create master index file with all folder contents"""
        print("\nCreating master index...")
        
        index_content = self._generate_master_index()
        with open(self.base_path / "INDEX.md", 'w', encoding='utf-8') as f:
            f.write(index_content)
        
        print("  ✓ INDEX.md")
    
    def _generate_master_index(self) -> str:
        """Generate comprehensive master index"""
        lines = []
        lines.append("# MDC Rules Master Index")
        lines.append("")
        lines.append(f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
        lines.append("")
        
        # Overview
        lines.append("## Overview")
        lines.append("")
        lines.append(f"This index provides a comprehensive overview of all MDC rules organized in {len(self.FOLDER_STRUCTURE)} categories.")
        lines.append("")
        
        # Statistics
        lines.append("## Statistics")
        lines.append("")
        lines.append(f"- **Categories**: {len(self.FOLDER_STRUCTURE)}")
        lines.append(f"- **Templates**: {len(self.TEMPLATES)}")
        lines.append(f"- **Example Rules**: {sum(len(config['examples']) for config in self.FOLDER_STRUCTURE.values())}")
        lines.append("")
        
        # Category breakdown
        lines.append("## Categories")
        lines.append("")
        
        for folder_name, config in self.FOLDER_STRUCTURE.items():
            lines.append(f"### {folder_name.title()}")
            lines.append("")
            lines.append(f"**Description**: {config['description']}")
            lines.append("")
            lines.append(f"**Primary Rule Type**: {config['template_type']}")
            lines.append("")
            lines.append("**Example Rules**:")
            for example in config['examples']:
                lines.append(f"- `{example}.mdc`")
            lines.append("")
        
        # Templates section
        lines.append("## Templates")
        lines.append("")
        lines.append("Available in `templates/` folder:")
        lines.append("")
        
        for rule_type in self.TEMPLATES.keys():
            lines.append(f"- `{rule_type}-template.mdc` - Template for {rule_type} rules")
        lines.append("")
        
        # Usage instructions
        lines.append("## Quick Reference")
        lines.append("")
        lines.append("### Creating New Rules")
        lines.append("")
        lines.append("1. **Choose category** based on rule domain")
        lines.append("2. **Select rule type** (always/auto/agent/manual)")
        lines.append("3. **Copy appropriate template** from `templates/`")
        lines.append("4. **Customize** frontmatter and content")
        lines.append("5. **Validate** using `mdc_rule_validator.py`")
        lines.append("")
        
        lines.append("### Rule Type Guidelines")
        lines.append("")
        lines.append("- **Always**: Mandatory, automatically enforced")
        lines.append("- **Auto**: Applied based on file patterns")
        lines.append("- **Agent**: Guidance for AI assistants")
        lines.append("- **Manual**: Requires human review")
        lines.append("")
        
        # Tools reference
        lines.append("## Associated Tools")
        lines.append("")
        lines.append("- `mdc_rule_validator.py` - Validate rule format and compliance")
        lines.append("- `mdc_rule_generator.py` - Generate new rules from prompts")
        lines.append("- `setup_folder_structure.py` - Initialize directory structure")
        lines.append("- `mdc_migration_script.py` - Migrate existing rules")
        lines.append("")
        
        return "\n".join(lines)
    
    def _print_summary(self):
        """Print creation summary"""
        print(f"""
📊 CREATION SUMMARY
==================
Base Directory: {self.base_path}
Folders Created: {len(self.FOLDER_STRUCTURE)}
Templates: {len(self.TEMPLATES)}
Documentation Files: 4 (README.md, USAGE.md, CONTRIBUTING.md, INDEX.md)

📁 FOLDER STRUCTURE
==================""")
        
        for folder_name, config in self.FOLDER_STRUCTURE.items():
            print(f"{folder_name:12} - {config['description']}")
        
        print(f"""
🛠️  NEXT STEPS
=============
1. Review the generated structure in {self.base_path}
2. Examine templates in templates/ folder
3. Start creating rules using the templates
4. Use the validation tools to check your rules
5. Refer to USAGE.md for detailed instructions

✨ Your MDC rule system is ready to use!
""")

def main():
    import argparse
    
    parser = argparse.ArgumentParser(description="Setup MDC folder structure")
    parser.add_argument('--base-path', default='.cursor/rules', 
                       help='Base directory for rules (default: .cursor/rules)')
    parser.add_argument('--force', action='store_true',
                       help='Force recreation if directory exists')
    
    args = parser.parse_args()
    
    setup = MDCFolderStructure(args.base_path)
    
    if Path(args.base_path).exists() and not args.force:
        response = input(f"Directory {args.base_path} already exists. Continue? (y/N): ")
        if response.lower() != 'y':
            print("Aborted.")
            return
    
    setup.create_folder_structure()

if __name__ == "__main__":
    main() 