#!/usr/bin/env python3
"""
MDC Rule Generator - Step 2 of 4
Generates properly formatted MDC rules from user prompts
"""

import os
import re
import yaml
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import textwrap

class MDCRuleGenerator:
    """Intelligent MDC rule generator following UAP Level 2 standards"""
    
    FOLDER_CATEGORIES = {
        'core': {
            'description': 'Core language rules (variables, functions, classes)',
            'keywords': ['variable', 'function', 'class', 'method', 'constant', 'import', 'export']
        },
        'language': {
            'description': 'Language-specific rules and patterns',
            'keywords': ['typescript', 'javascript', 'python', 'java', 'rust', 'go', 'syntax']
        },
        'framework': {
            'description': 'Framework and library specific rules',
            'keywords': ['react', 'vue', 'angular', 'express', 'fastapi', 'django', 'framework']
        },
        'testing': {
            'description': 'Testing patterns and best practices',
            'keywords': ['test', 'spec', 'mock', 'unit', 'integration', 'e2e', 'jest', 'pytest']
        },
        'workflow': {
            'description': 'Development workflow and process rules',
            'keywords': ['git', 'commit', 'branch', 'ci', 'cd', 'deployment', 'workflow']
        },
        'security': {
            'description': 'Security patterns and vulnerability prevention',
            'keywords': ['security', 'auth', 'authentication', 'authorization', 'sanitize', 'validate']
        },
        'performance': {
            'description': 'Performance optimization and monitoring',
            'keywords': ['performance', 'optimize', 'cache', 'memory', 'speed', 'benchmark']
        },
        'documentation': {
            'description': 'Documentation and comment standards',
            'keywords': ['documentation', 'comment', 'docstring', 'readme', 'jsdoc', 'markdown']
        },
        'deployment': {
            'description': 'Deployment and infrastructure rules',
            'keywords': ['deploy', 'docker', 'kubernetes', 'aws', 'cloud', 'infrastructure']
        }
    }
    
    RULE_TYPE_KEYWORDS = {
        'always': ['always', 'enforce', 'mandatory', 'required', 'must'],
        'auto': ['automatic', 'auto', 'files', 'extension', 'pattern', 'glob'],
        'agent': ['agent', 'ai', 'suggest', 'recommend', 'help', 'guide'],
        'manual': ['manual', 'check', 'review', 'consider', 'optional']
    }
    
    def __init__(self, base_path: str = ".cursor/rules"):
        self.base_path = Path(base_path)
        self.ensure_directory_structure()
    
    def ensure_directory_structure(self):
        """Ensure all required directories exist"""
        for folder in self.FOLDER_CATEGORIES.keys():
            folder_path = self.base_path / folder
            folder_path.mkdir(parents=True, exist_ok=True)
    
    def analyze_prompt(self, prompt: str) -> Dict[str, Any]:
        """Analyze user prompt to determine rule characteristics"""
        prompt_lower = prompt.lower()
        
        # Determine rule type
        rule_type = self._determine_rule_type(prompt_lower)
        
        # Determine folder category
        folder = self._determine_folder(prompt_lower)
        
        # Extract key concepts
        concepts = self._extract_concepts(prompt)
        
        # Generate metadata
        metadata = {
            'rule_type': rule_type,
            'folder': folder,
            'concepts': concepts,
            'has_file_patterns': any(ext in prompt_lower for ext in ['.js', '.ts', '.py', '.java', '.go', '.rs']),
            'has_framework_refs': any(fw in prompt_lower for fw in ['react', 'vue', 'angular', 'express', 'django']),
            'complexity': self._assess_complexity(prompt)
        }
        
        return metadata
    
    def _determine_rule_type(self, prompt: str) -> str:
        """Determine rule type based on prompt content"""
        
        # Score each rule type
        scores = {}
        for rule_type, keywords in self.RULE_TYPE_KEYWORDS.items():
            score = sum(1 for keyword in keywords if keyword in prompt)
            scores[rule_type] = score
        
        # Special logic for specific patterns
        if any(pattern in prompt for pattern in ['*.', 'files matching', 'file extension']):
            scores['auto'] += 2
        
        if any(pattern in prompt for pattern in ['must', 'enforce', 'always use', 'never']):
            scores['always'] += 2
        
        if any(pattern in prompt for pattern in ['ai should', 'agent', 'suggest', 'recommend']):
            scores['agent'] += 2
        
        # Return highest scoring type or default to manual
        if scores:
            return max(scores, key=scores.get)
        return 'manual'
    
    def _determine_folder(self, prompt: str) -> str:
        """Determine appropriate folder based on prompt content"""
        
        scores = {}
        for folder, config in self.FOLDER_CATEGORIES.items():
            score = sum(1 for keyword in config['keywords'] if keyword in prompt)
            scores[folder] = score
        
        # Return highest scoring folder or default to core
        if scores and max(scores.values()) > 0:
            return max(scores, key=scores.get)
        return 'core'
    
    def _extract_concepts(self, prompt: str) -> List[str]:
        """Extract key concepts from prompt"""
        # Remove common words and extract meaningful terms
        stop_words = {'the', 'a', 'an', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by', 'should', 'must', 'will', 'can', 'could', 'would'}
        
        words = re.findall(r'\b[a-zA-Z]{3,}\b', prompt.lower())
        concepts = [word for word in words if word not in stop_words]
        
        # Remove duplicates while preserving order
        unique_concepts = []
        seen = set()
        for concept in concepts:
            if concept not in seen:
                unique_concepts.append(concept)
                seen.add(concept)
        
        return unique_concepts[:10]  # Limit to 10 key concepts
    
    def _assess_complexity(self, prompt: str) -> str:
        """Assess rule complexity based on prompt length and content"""
        length = len(prompt)
        
        if length > 500:
            return 'high'
        elif length > 200:
            return 'medium'
        else:
            return 'low'
    
    def generate_rule_name(self, prompt: str, metadata: Dict[str, Any]) -> str:
        """Generate appropriate rule filename"""
        
        # Extract key terms from prompt
        key_terms = []
        
        # Look for specific patterns
        if metadata['has_file_patterns']:
            key_terms.append('file-patterns')
        
        if metadata['has_framework_refs']:
            for fw in ['react', 'vue', 'angular', 'express', 'django']:
                if fw in prompt.lower():
                    key_terms.append(fw)
                    break
        
        # Use top concepts if no specific patterns found
        if not key_terms and metadata['concepts']:
            key_terms = metadata['concepts'][:3]
        
        # Fallback to generic naming
        if not key_terms:
            key_terms = ['custom', 'rule']
        
        # Clean and format terms
        clean_terms = []
        for term in key_terms:
            clean_term = re.sub(r'[^a-zA-Z0-9]', '', term.lower())
            if clean_term and len(clean_term) > 2:
                clean_terms.append(clean_term)
        
        # Join terms and add rule type suffix
        base_name = '-'.join(clean_terms[:3])  # Limit to 3 terms
        return f"{base_name}-{metadata['rule_type']}"
    
    def generate_frontmatter(self, prompt: str, metadata: Dict[str, Any]) -> Dict[str, Any]:
        """Generate appropriate frontmatter for the rule"""
        
        frontmatter = {
            'description': self._generate_description(prompt, metadata),
            'created': datetime.now().isoformat(),
            'type': metadata['rule_type']
        }
        
        # Add rule-type specific fields
        if metadata['rule_type'] == 'always':
            frontmatter['alwaysApply'] = True
        
        elif metadata['rule_type'] == 'auto':
            frontmatter['globs'] = self._generate_globs(prompt, metadata)
        
        elif metadata['rule_type'] == 'agent':
            frontmatter['agents'] = ['cursor', 'ai-assistant']
            if metadata['complexity'] == 'high':
                frontmatter['complexity'] = 'high'
        
        # Add optional metadata
        if metadata['concepts']:
            frontmatter['tags'] = metadata['concepts'][:5]
        
        if metadata['has_framework_refs']:
            frontmatter['framework'] = self._extract_framework(prompt)
        
        return frontmatter
    
    def _generate_description(self, prompt: str, metadata: Dict[str, Any]) -> str:
        """Generate a concise description for the rule"""
        
        # If prompt is already concise, use it directly
        if len(prompt) < 100 and not prompt.endswith('.'):
            return prompt + '.'
        
        # Extract the main intent from longer prompts
        sentences = prompt.split('.')
        if sentences:
            main_sentence = sentences[0].strip()
            if len(main_sentence) < 150:
                return main_sentence + '.'
        
        # Fallback to extracting key concepts
        concepts = metadata['concepts'][:3]
        rule_type = metadata['rule_type']
        
        if concepts:
            return f"Enforce best practices for {', '.join(concepts)} in {rule_type} mode."
        
        return f"Custom {rule_type} rule for improved code quality."
    
    def _generate_globs(self, prompt: str, metadata: Dict[str, Any]) -> List[str]:
        """Generate appropriate glob patterns for auto rules"""
        
        globs = []
        
        # Look for explicit file extensions
        extensions = re.findall(r'\*?\.[a-zA-Z0-9]+', prompt)
        for ext in extensions:
            if not ext.startswith('*'):
                ext = '*' + ext
            globs.append(ext)
        
        # Infer from framework references
        if 'react' in prompt.lower():
            globs.extend(['*.jsx', '*.tsx'])
        elif 'vue' in prompt.lower():
            globs.append('*.vue')
        elif 'python' in prompt.lower():
            globs.append('*.py')
        elif 'typescript' in prompt.lower():
            globs.extend(['*.ts', '*.tsx'])
        elif 'javascript' in prompt.lower():
            globs.extend(['*.js', '*.jsx'])
        
        # Default patterns if none found
        if not globs:
            if metadata['folder'] == 'testing':
                globs = ['*.test.*', '*.spec.*']
            elif metadata['folder'] == 'documentation':
                globs = ['*.md', '*.mdx']
            else:
                globs = ['**/*']  # Apply to all files
        
        return globs
    
    def _extract_framework(self, prompt: str) -> str:
        """Extract framework name from prompt"""
        frameworks = ['react', 'vue', 'angular', 'express', 'django', 'fastapi', 'spring']
        for framework in frameworks:
            if framework in prompt.lower():
                return framework
        return 'general'
    
    def generate_content(self, prompt: str, metadata: Dict[str, Any]) -> str:
        """Generate the main content body for the rule"""
        
        sections = []
        
        # Title
        title = self._generate_title(prompt, metadata)
        sections.append(f"# {title}")
        sections.append("")
        
        # Description section
        sections.append("## Description")
        sections.append("")
        description = self._expand_description(prompt, metadata)
        sections.append(description)
        sections.append("")
        
        # Rule type specific sections
        if metadata['rule_type'] == 'always':
            sections.extend(self._generate_always_content(prompt, metadata))
        elif metadata['rule_type'] == 'auto':
            sections.extend(self._generate_auto_content(prompt, metadata))
        elif metadata['rule_type'] == 'agent':
            sections.extend(self._generate_agent_content(prompt, metadata))
        else:
            sections.extend(self._generate_manual_content(prompt, metadata))
        
        # Common sections
        sections.extend(self._generate_examples(prompt, metadata))
        sections.extend(self._generate_rationale(prompt, metadata))
        
        return "\n".join(sections)
    
    def _generate_title(self, prompt: str, metadata: Dict[str, Any]) -> str:
        """Generate appropriate title for the rule"""
        concepts = metadata['concepts'][:2]
        rule_type = metadata['rule_type'].title()
        
        if concepts:
            title_concepts = [concept.title() for concept in concepts]
            return f"{' '.join(title_concepts)} - {rule_type} Rule"
        
        return f"Custom {rule_type} Rule"
    
    def _expand_description(self, prompt: str, metadata: Dict[str, Any]) -> str:
        """Generate expanded description for the rule body"""
        
        # Use the prompt as base but make it more formal
        base_description = prompt.strip()
        
        # Add context based on rule type
        if metadata['rule_type'] == 'always':
            context = "This rule is automatically enforced and cannot be bypassed."
        elif metadata['rule_type'] == 'auto':
            context = "This rule is automatically applied to matching files."
        elif metadata['rule_type'] == 'agent':
            context = "This rule provides guidance to AI assistants."
        else:
            context = "This rule should be manually reviewed and applied."
        
        return f"{base_description}\n\n{context}"
    
    def _generate_always_content(self, prompt: str, metadata: Dict[str, Any]) -> List[str]:
        """Generate content specific to always rules"""
        sections = []
        
        sections.append("## Enforcement")
        sections.append("")
        sections.append("This rule is **mandatory** and will be enforced automatically in all applicable contexts.")
        sections.append("")
        
        sections.append("## Requirements")
        sections.append("")
        sections.append("- Must be followed without exception")
        sections.append("- Violations will be flagged immediately")
        sections.append("- No manual override available")
        sections.append("")
        
        return sections
    
    def _generate_auto_content(self, prompt: str, metadata: Dict[str, Any]) -> List[str]:
        """Generate content specific to auto rules"""
        sections = []
        
        sections.append("## File Patterns")
        sections.append("")
        sections.append("This rule automatically applies to files matching:")
        sections.append("")
        
        frontmatter = self.generate_frontmatter(prompt, metadata)
        for glob in frontmatter.get('globs', []):
            sections.append(f"- `{glob}`")
        sections.append("")
        
        sections.append("## Automatic Application")
        sections.append("")
        sections.append("When files matching the above patterns are detected, this rule will be:")
        sections.append("- Applied automatically during editing")
        sections.append("- Checked during validation")
        sections.append("- Enforced in relevant contexts")
        sections.append("")
        
        return sections
    
    def _generate_agent_content(self, prompt: str, metadata: Dict[str, Any]) -> List[str]:
        """Generate content specific to agent rules"""
        sections = []
        
        sections.append("## AI Assistant Guidance")
        sections.append("")
        sections.append("This rule provides guidance to AI assistants and code completion tools:")
        sections.append("")
        sections.append("- Suggests best practices during code generation")
        sections.append("- Influences autocomplete and suggestions")
        sections.append("- Provides context for refactoring recommendations")
        sections.append("")
        
        if metadata['complexity'] == 'high':
            sections.append("## Complexity Note")
            sections.append("")
            sections.append("This is a complex rule that may require careful consideration and contextual understanding.")
            sections.append("")
        
        return sections
    
    def _generate_manual_content(self, prompt: str, metadata: Dict[str, Any]) -> List[str]:
        """Generate content specific to manual rules"""
        sections = []
        
        sections.append("## Manual Review")
        sections.append("")
        sections.append("This rule requires manual review and application:")
        sections.append("")
        sections.append("- Review during code reviews")
        sections.append("- Consider during refactoring")
        sections.append("- Apply based on context and judgment")
        sections.append("")
        
        return sections
    
    def _generate_examples(self, prompt: str, metadata: Dict[str, Any]) -> List[str]:
        """Generate example sections"""
        sections = []
        
        sections.append("## Examples")
        sections.append("")
        
        # Try to infer examples from prompt context
        if any(lang in prompt.lower() for lang in ['javascript', 'typescript']):
            sections.extend(self._generate_js_examples(prompt, metadata))
        elif 'python' in prompt.lower():
            sections.extend(self._generate_python_examples(prompt, metadata))
        else:
            sections.extend(self._generate_generic_examples(prompt, metadata))
        
        return sections
    
    def _generate_js_examples(self, prompt: str, metadata: Dict[str, Any]) -> List[str]:
        """Generate JavaScript/TypeScript examples"""
        return [
            "### Good Example",
            "",
            "```typescript",
            "// Following the rule",
            "const example = {",
            "  // Implementation following best practices",
            "};",
            "```",
            "",
            "### Bad Example",
            "",
            "```typescript",
            "// Violating the rule",
            "const bad_example = {",
            "  // Implementation that violates the rule",
            "};",
            "```",
            ""
        ]
    
    def _generate_python_examples(self, prompt: str, metadata: Dict[str, Any]) -> List[str]:
        """Generate Python examples"""
        return [
            "### Good Example",
            "",
            "```python",
            "# Following the rule",
            "def example_function():",
            "    # Implementation following best practices",
            "    pass",
            "```",
            "",
            "### Bad Example",
            "",
            "```python",
            "# Violating the rule",
            "def bad_example():",
            "    # Implementation that violates the rule",
            "    pass",
            "```",
            ""
        ]
    
    def _generate_generic_examples(self, prompt: str, metadata: Dict[str, Any]) -> List[str]:
        """Generate generic examples"""
        return [
            "### Good Practice",
            "",
            "```",
            "// Example of following this rule",
            "```",
            "",
            "### Poor Practice",
            "",
            "```",
            "// Example of violating this rule",
            "```",
            ""
        ]
    
    def _generate_rationale(self, prompt: str, metadata: Dict[str, Any]) -> List[str]:
        """Generate rationale section"""
        sections = []
        
        sections.append("## Rationale")
        sections.append("")
        
        # Generate rationale based on folder category
        folder = metadata['folder']
        if folder == 'security':
            rationale = "This rule helps prevent security vulnerabilities and ensures secure coding practices."
        elif folder == 'performance':
            rationale = "This rule optimizes performance and prevents common performance bottlenecks."
        elif folder == 'testing':
            rationale = "This rule ensures comprehensive testing and maintainable test code."
        elif folder == 'documentation':
            rationale = "This rule improves code documentation and maintainability."
        else:
            rationale = "This rule promotes code quality, readability, and maintainability."
        
        sections.append(rationale)
        sections.append("")
        
        # Add benefits
        sections.append("### Benefits")
        sections.append("")
        sections.append("- Improved code quality")
        sections.append("- Enhanced maintainability")
        sections.append("- Consistent development practices")
        sections.append("- Reduced potential for errors")
        sections.append("")
        
        return sections
    
    def generate_rule(self, prompt: str, custom_name: Optional[str] = None) -> Tuple[str, str]:
        """Generate a complete MDC rule from prompt"""
        
        # Analyze prompt
        metadata = self.analyze_prompt(prompt)
        
        # Generate rule name
        rule_name = custom_name or self.generate_rule_name(prompt, metadata)
        
        # Ensure unique filename
        folder_path = self.base_path / metadata['folder']
        file_path = folder_path / f"{rule_name}.mdc"
        counter = 1
        while file_path.exists():
            base_name = rule_name.rsplit('-', 1)[0] if '-' in rule_name else rule_name
            file_path = folder_path / f"{base_name}-{counter}-{metadata['rule_type']}.mdc"
            counter += 1
        
        # Generate frontmatter
        frontmatter = self.generate_frontmatter(prompt, metadata)
        
        # Generate content
        content = self.generate_content(prompt, metadata)
        
        # Combine into full rule
        frontmatter_yaml = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)
        full_content = f"---\n{frontmatter_yaml}---\n\n{content}"
        
        return str(file_path), full_content
    
    def save_rule(self, file_path: str, content: str) -> bool:
        """Save rule to file"""
        try:
            Path(file_path).parent.mkdir(parents=True, exist_ok=True)
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        except Exception as e:
            print(f"Error saving rule: {e}")
            return False
    
    def generate_and_save(self, prompt: str, custom_name: Optional[str] = None) -> Dict[str, Any]:
        """Generate and save a rule, returning result info"""
        
        file_path, content = self.generate_rule(prompt, custom_name)
        success = self.save_rule(file_path, content)
        
        metadata = self.analyze_prompt(prompt)
        
        return {
            'success': success,
            'file_path': file_path,
            'rule_type': metadata['rule_type'],
            'folder': metadata['folder'],
            'concepts': metadata['concepts'],
            'content_length': len(content),
            'frontmatter_fields': len(self.generate_frontmatter(prompt, metadata))
        }
    
    def interactive_mode(self):
        """Run interactive rule generation"""
        print("MDC Rule Generator - Interactive Mode")
        print("=" * 50)
        print("Enter your rule requirements (or 'quit' to exit)")
        print()
        
        while True:
            prompt = input("Rule prompt: ").strip()
            
            if prompt.lower() in ['quit', 'exit', 'q']:
                break
            
            if not prompt:
                print("Please enter a rule prompt.")
                continue
            
            # Analyze and preview
            metadata = self.analyze_prompt(prompt)
            rule_name = self.generate_rule_name(prompt, metadata)
            
            print(f"\nAnalysis:")
            print(f"  Rule Type: {metadata['rule_type']}")
            print(f"  Folder: {metadata['folder']}")
            print(f"  Suggested Name: {rule_name}")
            print(f"  Key Concepts: {', '.join(metadata['concepts'][:5])}")
            
            # Confirm generation
            confirm = input("\nGenerate this rule? (y/N): ").strip().lower()
            if confirm == 'y':
                custom_name = input("Custom name (press Enter for auto): ").strip()
                if not custom_name:
                    custom_name = None
                
                result = self.generate_and_save(prompt, custom_name)
                
                if result['success']:
                    print(f"✓ Rule generated: {result['file_path']}")
                    print(f"  Type: {result['rule_type']}")
                    print(f"  Folder: {result['folder']}")
                    print(f"  Size: {result['content_length']} characters")
                else:
                    print("✗ Failed to save rule")
            
            print()

def main():
    parser = argparse.ArgumentParser(description="MDC Rule Generator")
    parser.add_argument('prompt', nargs='?', help="Rule generation prompt")
    parser.add_argument('--name', help="Custom rule name")
    parser.add_argument('--base-path', default='.cursor/rules', help="Base rules directory")
    parser.add_argument('--interactive', '-i', action='store_true', help="Interactive mode")
    parser.add_argument('--preview', action='store_true', help="Preview only, don't save")
    parser.add_argument('--batch', help="Batch generate from file (one prompt per line)")
    
    args = parser.parse_args()
    
    generator = MDCRuleGenerator(args.base_path)
    
    if args.interactive:
        generator.interactive_mode()
    elif args.batch:
        with open(args.batch, 'r') as f:
            prompts = [line.strip() for line in f if line.strip()]
        
        print(f"Batch generating {len(prompts)} rules...")
        
        for i, prompt in enumerate(prompts, 1):
            print(f"[{i}/{len(prompts)}] {prompt[:50]}...")
            result = generator.generate_and_save(prompt)
            
            if result['success']:
                print(f"  ✓ Generated: {result['file_path']}")
            else:
                print(f"  ✗ Failed")
    
    elif args.prompt:
        if args.preview:
            file_path, content = generator.generate_rule(args.prompt, args.name)
            print(f"Preview of rule that would be saved to: {file_path}")
            print("=" * 60)
            print(content)
        else:
            result = generator.generate_and_save(args.prompt, args.name)
            
            if result['success']:
                print(f"Rule generated successfully!")
                print(f"File: {result['file_path']}")
                print(f"Type: {result['rule_type']}")
                print(f"Folder: {result['folder']}")
            else:
                print("Failed to generate rule")
    else:
        print("Please provide a prompt or use --interactive mode")
        print("Example: python mdc_rule_generator.py 'Always use const for variables that never change'")

if __name__ == "__main__":
    main() 