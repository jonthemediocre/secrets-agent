#!/usr/bin/env python3
"""
VANTA Global Rules System - Basic Usage Examples

This file demonstrates the core functionality of the VANTA Global Rules system
including rule creation, include directives, library management, and format export.
"""

import sys
from pathlib import Path

# Add src to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from vanta_global_rules import VantaGlobalRules, RuleFormat
from vanta_format_adapters import FormatAdapterFactory, convert_rules_to_format
from vanta_standardization_agent import VantaStandardizationAgent

def example_1_basic_rule_creation():
    """Example 1: Creating basic rules with includes"""
    print("🔧 Example 1: Basic Rule Creation and Include Resolution")
    print("=" * 60)
    
    # Initialize the system
    rules_system = VantaGlobalRules(".")
    
    # Create a rule file with includes
    rules_dir = Path(".cursor/rules")
    rules_dir.mkdir(parents=True, exist_ok=True)
    
    # Create a base rules file
    base_rules = rules_dir / "base.md"
    base_content = """
## Base Development Standards

- Write clear, readable code
- Add meaningful comments
- Use consistent naming conventions
- Follow established patterns
"""
    base_rules.write_text(base_content)
    
    # Create a main rule file that includes the base rules
    main_rule = rules_dir / "python_standards.mdc"
    main_content = """# RULE TYPE: Always
# FILE PATTERNS: **/*.py

## Python Development Standards

@include base.md

### Python-specific additions:
- Use type hints for function parameters and return values
- Follow PEP 8 formatting guidelines
- Add docstrings to all public functions and classes
- Use f-strings for string formatting
"""
    main_rule.write_text(main_content)
    
    # Resolve includes and display result
    resolved = rules_system.resolve_includes(main_rule)
    
    print(f"Original rule: {resolved.original_path}")
    print(f"Format detected: {resolved.format.value}")
    print(f"Number of includes: {len(resolved.includes)}")
    print("\nResolved content:")
    print("-" * 40)
    print(resolved.content[:500] + "..." if len(resolved.content) > 500 else resolved.content)
    
    print("\n✅ Example 1 completed successfully!\n")

def example_2_global_scope_includes():
    """Example 2: Using global scope includes with % prefix"""
    print("🌍 Example 2: Global Scope Includes")
    print("=" * 60)
    
    rules_system = VantaGlobalRules(".")
    
    # Create global rules directory
    global_rules_dir = Path(".vanta/global_rules/org")
    global_rules_dir.mkdir(parents=True, exist_ok=True)
    
    # Create organizational security rules
    security_rules = global_rules_dir / "security.yaml"
    security_content = """
security_standards:
  authentication:
    - Always validate user input
    - Use parameterized queries for database access
    - Implement proper session management
  authorization:
    - Apply principle of least privilege
    - Validate permissions on every request
    - Log security-relevant events
"""
    security_rules.write_text(security_content)
    
    # Create a local rule that includes global security rules
    rules_dir = Path(".cursor/rules")
    rules_dir.mkdir(parents=True, exist_ok=True)
    
    api_rules = rules_dir / "api_security.mdc"
    api_content = """# RULE TYPE: Always
# FILE PATTERNS: **/api/**/*.py

## API Security Standards

@include %security.yaml

### API-specific security requirements:
- Validate all input parameters
- Implement rate limiting
- Use HTTPS for all endpoints
- Return consistent error responses
"""
    api_rules.write_text(api_content)
    
    # Configure rule roots to include global rules
    config_data = {
        "rule_roots": [str(global_rules_dir)]
    }
    
    # Update system configuration
    rules_system.config.update(config_data)
    rules_system._save_config()
    rules_system.rule_roots = rules_system._get_rule_roots()
    
    # Resolve includes
    resolved = rules_system.resolve_includes(api_rules)
    
    print(f"Rule with global includes: {resolved.original_path}")
    print(f"Includes resolved: {len(resolved.includes)}")
    print(f"Global scope include found: {'security.yaml' in resolved.content}")
    
    print("\n✅ Example 2 completed successfully!\n")

def example_3_library_management():
    """Example 3: Installing and managing rule libraries"""
    print("📦 Example 3: Rule Library Management")
    print("=" * 60)
    
    rules_system = VantaGlobalRules(".")
    
    # Simulate installing a rule library from a local source
    # In real usage, this would be a Git repo or HTTP URL
    
    # Create a sample library source
    library_source = Path("temp_library")
    library_source.mkdir(exist_ok=True)
    
    # Create sample library rules
    lib_python = library_source / "python.mdc"
    lib_python.write_text("""# RULE TYPE: Always
# FILE PATTERNS: **/*.py

## Library Python Standards
- Use virtual environments
- Pin dependency versions
- Include comprehensive tests
""")
    
    lib_js = library_source / "javascript.json"
    lib_js.write_text("""{
  "eslint": {
    "semi": ["error", "always"],
    "quotes": ["error", "single"]
  }
}""")
    
    # Install the library
    print("Installing rule library...")
    success = rules_system.install_rule_library(str(library_source))
    
    if success:
        print("✅ Library installed successfully!")
        
        # List all rule sources
        print("\nConfigured rule sources:")
        rules_system.list_rule_sources()
    else:
        print("❌ Library installation failed")
    
    # Cleanup
    import shutil
    if library_source.exists():
        shutil.rmtree(library_source)
    
    print("\n✅ Example 3 completed successfully!\n")

def example_4_format_export():
    """Example 4: Exporting rules to different tool formats"""
    print("🔄 Example 4: Format Export to Different Tools")
    print("=" * 60)
    
    rules_system = VantaGlobalRules(".")
    
    # Create sample rules for export
    rules_dir = Path(".cursor/rules")
    rules_dir.mkdir(parents=True, exist_ok=True)
    
    # Python rules
    python_rules = rules_dir / "python_export.mdc"
    python_content = """# RULE TYPE: Always
# FILE PATTERNS: **/*.py

## Python Code Quality

- Use meaningful variable names
- Add type hints to function signatures
- Follow PEP 8 formatting (line length: 88 characters)
- Use single quotes for strings
- Always include docstrings
"""
    python_rules.write_text(python_content)
    
    # JavaScript rules  
    js_rules = rules_dir / "javascript_export.json"
    js_content = """{
  "eslint": {
    "semi": ["error", "always"],
    "quotes": ["error", "single"],
    "indent": ["error", 2],
    "max-len": ["error", {"code": 100}]
  }
}"""
    js_rules.write_text(js_content)
    
    # Get all resolved rules
    all_rules = []
    for rule_file in rules_dir.glob("*_export.*"):
        resolved = rules_system.resolve_includes(rule_file)
        all_rules.append(resolved)
    
    # Export to different formats
    output_dir = Path("examples/output")
    output_dir.mkdir(exist_ok=True)
    
    formats_to_export = [
        ("cursor", "cursor_rules.md"),
        ("prettier", "prettier.json"),
        ("eslint", "eslint.json"),
        ("editorconfig", ".editorconfig")
    ]
    
    for format_name, filename in formats_to_export:
        try:
            output_path = output_dir / filename
            converted = convert_rules_to_format(all_rules, format_name, output_path)
            
            print(f"✅ Exported to {format_name}: {output_path}")
            print(f"   Content size: {len(converted)} characters")
            
        except Exception as e:
            print(f"❌ Failed to export to {format_name}: {e}")
    
    print("\n✅ Example 4 completed successfully!\n")

def example_5_validation_and_status():
    """Example 5: Validating rules and checking system status"""
    print("🔍 Example 5: Validation and System Status")
    print("=" * 60)
    
    rules_system = VantaGlobalRules(".")
    
    # Create a mix of valid and invalid rules for testing
    rules_dir = Path(".cursor/rules")
    rules_dir.mkdir(parents=True, exist_ok=True)
    
    # Valid rule
    valid_rule = rules_dir / "valid.mdc"
    valid_rule.write_text("""# RULE TYPE: Always
# FILE PATTERNS: **/*.py

@include ../../../src/vanta_global_rules.py

Valid rule content here.""")
    
    # Invalid rule (missing include)
    invalid_rule = rules_dir / "invalid.mdc"
    invalid_rule.write_text("""# RULE TYPE: Always
# FILE PATTERNS: **/*.py

@include nonexistent_file.md

Invalid rule with missing include.""")
    
    # Rule without includes
    simple_rule = rules_dir / "simple.mdc"
    simple_rule.write_text("""# RULE TYPE: OnChange
# FILE PATTERNS: **/*.js

Simple rule without includes.""")
    
    # Validate all includes
    print("Validating include directives...")
    validation_results = rules_system.validate_includes()
    
    print(f"Validation Results:")
    print(f"  📁 Total files scanned: {validation_results['total_files']}")
    print(f"  📋 Files with includes: {validation_results['files_with_includes']}")
    print(f"  🔗 Total includes: {validation_results['total_includes']}")
    print(f"  ✅ Successful: {validation_results['successful_includes']}")
    print(f"  ❌ Failed: {validation_results['failed_includes']}")
    
    if validation_results["errors"]:
        print("\nInclude Errors:")
        for error in validation_results["errors"]:
            print(f"  • {error}")
    
    print("\n" + "=" * 40)
    print("System Status:")
    print("=" * 40)
    
    # Generate system sync files
    rules_system.generate_globalrules_synced()
    rules_system.create_reminder_rule()
    
    print("✅ Generated globalrules_synced.md")
    print("✅ Created global rules reminder")
    
    print("\n✅ Example 5 completed successfully!\n")

def example_6_standardization_agent():
    """Example 6: Using the standardization agent"""
    print("🤖 Example 6: Automated Standardization Analysis")
    print("=" * 60)
    
    # Create a standardization agent
    agent = VantaStandardizationAgent(".")
    
    # Create sample code files for analysis
    sample_dir = Path("examples/sample_code")
    sample_dir.mkdir(exist_ok=True)
    
    # Create a compliant agent
    compliant_agent = sample_dir / "compliant_agent.py"
    compliant_content = """
class CompliantAgent:
    \"\"\"A well-structured agent following UAP standards\"\"\"
    
    def __init__(self):
        self.name = "CompliantAgent"
    
    def initialize(self):
        \"\"\"Initialize the agent\"\"\"
        print("Agent initialized")
    
    def execute(self, task):
        \"\"\"Execute the given task\"\"\"
        return f"Executed: {task}"
    
    def validate(self, input_data):
        \"\"\"Validate input data\"\"\"
        return input_data is not None
    
    def cleanup(self):
        \"\"\"Clean up resources\"\"\"
        print("Agent cleaned up")
"""
    compliant_agent.write_text(compliant_content)
    
    # Create a non-compliant agent
    noncompliant_agent = sample_dir / "noncompliant_agent.py"
    noncompliant_content = """
class NonCompliantAgent:
    def __init__(self):
        self.name = "NonCompliantAgent"
    
    def do_something(self):
        pass
"""
    noncompliant_agent.write_text(noncompliant_content)
    
    # Create a rule file
    sample_rule = sample_dir / "sample_rule.mdc"
    sample_rule.write_text("""# RULE TYPE: Always
# FILE PATTERNS: **/*.py

Sample rule for analysis""")
    
    # Run standardization analysis
    print("Running codebase analysis...")
    report = agent.scan_codebase()
    
    # Display results
    agent.display_report(report)
    
    # Export manifests
    manifest_dir = Path("examples/manifests")
    manifest_dir.mkdir(exist_ok=True)
    agent.export_manifests(manifest_dir)
    
    print(f"\n📋 Manifests exported to: {manifest_dir}")
    
    print("\n✅ Example 6 completed successfully!\n")

def main():
    """Run all examples"""
    print("🌟 VANTA Global Rules System - Usage Examples")
    print("=" * 80)
    print()
    
    # Run all examples
    try:
        example_1_basic_rule_creation()
        example_2_global_scope_includes()
        example_3_library_management()
        example_4_format_export()
        example_5_validation_and_status()
        example_6_standardization_agent()
        
        print("🎉 All examples completed successfully!")
        print("\nNext steps:")
        print("1. Review the generated files in .cursor/, .vanta/, and examples/")
        print("2. Try the CLI commands: python -m src.vanta_global_rules --help")
        print("3. Integrate with your development workflow")
        print("4. Create your own rule libraries and share them")
        
    except Exception as e:
        print(f"❌ Example failed with error: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    main() 