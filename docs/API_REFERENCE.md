# VANTA Global Rules System - API Reference

## Overview

The VANTA Global Rules System provides a comprehensive Python API for managing global coding rules, include directives, and format adapters. This document covers all public classes, methods, and their usage.

## Core Classes

### VantaGlobalRules

Main class for the global rules system.

```python
from vanta_global_rules import VantaGlobalRules

rules = VantaGlobalRules(project_root=".")
```

#### Constructor

```python
VantaGlobalRules(project_root: str = ".")
```

**Parameters:**
- `project_root` (str): Path to the project root directory. Defaults to current directory.

#### Methods

##### resolve_includes(rule_file: Path) → ResolvedRule

Resolves all @include directives in a rule file.

```python
resolved = rules.resolve_includes(Path(".cursor/rules/main.mdc"))
print(f"Resolved content: {resolved.content}")
print(f"Includes: {len(resolved.includes)}")
```

**Parameters:**
- `rule_file` (Path): Path to the rule file to resolve

**Returns:**
- `ResolvedRule`: Object containing resolved content and metadata

**Raises:**
- `FileNotFoundError`: If rule file doesn't exist
- `PermissionError`: If file cannot be read

##### install_rule_library(source: str, destination: Optional[str] = None) → bool

Installs a rule library from various sources.

```python
# From Git repository
success = rules.install_rule_library("https://github.com/org/rules.git")

# From local directory
success = rules.install_rule_library("/path/to/local/rules")

# From HTTP archive
success = rules.install_rule_library("https://example.com/rules.zip")
```

**Parameters:**
- `source` (str): Source location (Git URL, HTTP URL, or local path)
- `destination` (Optional[str]): Installation destination. Defaults to `.vanta/global_rules/`

**Returns:**
- `bool`: True if installation succeeded, False otherwise

##### update_rule_libraries(library_name: Optional[str] = None) → bool

Updates installed rule libraries.

```python
# Update all libraries
rules.update_rule_libraries()

# Update specific library
rules.update_rule_libraries("my-rules")
```

**Parameters:**
- `library_name` (Optional[str]): Name of specific library to update. If None, updates all.

**Returns:**
- `bool`: True if update succeeded, False otherwise

##### validate_includes() → Dict[str, Any]

Validates all include directives across all rule files.

```python
results = rules.validate_includes()
print(f"Total files: {results['total_files']}")
print(f"Failed includes: {results['failed_includes']}")
```

**Returns:**
- `Dict[str, Any]`: Validation results with statistics and error details

##### generate_globalrules_synced() → None

Generates globalrules_synced.md for IDE copy/paste activation.

```python
rules.generate_globalrules_synced()
```

##### create_reminder_rule() → None

Creates a reminder rule file to prompt users about global rules activation.

```python
rules.create_reminder_rule()
```

##### list_rule_sources() → None

Displays all configured rule sources in a formatted table.

```python
rules.list_rule_sources()
```

#### Properties

- `project_root` (Path): Project root directory
- `config_path` (Path): Path to .cursor/config.yaml
- `rules_dir` (Path): Path to .cursor/rules directory
- `config` (Dict[str, Any]): Current configuration
- `rule_roots` (List[RuleSource]): List of configured rule sources

### ResolvedRule

Data class representing a rule after include resolution.

```python
@dataclass
class ResolvedRule:
    original_path: str
    format: RuleFormat
    content: str
    includes: List[IncludeDirective]
    metadata: Dict[str, Any]
```

**Attributes:**
- `original_path` (str): Path to the original rule file
- `format` (RuleFormat): Detected format of the rule file
- `content` (str): Rule content with all includes resolved
- `includes` (List[IncludeDirective]): List of include directives found
- `metadata` (Dict[str, Any]): Additional metadata about resolution

### IncludeDirective

Data class representing an @include directive.

```python
@dataclass
class IncludeDirective:
    original_line: str
    file_path: str
    scope: IncludeScope
    line_number: int
    resolved_content: Optional[str] = None
```

**Attributes:**
- `original_line` (str): Original @include line
- `file_path` (str): Path specified in the include
- `scope` (IncludeScope): Scope of the include (ALL_ROOTS or EXTRA_ROOTS_ONLY)
- `line_number` (int): Line number where include was found
- `resolved_content` (Optional[str]): Resolved content if successful

## Format Adapters

### FormatAdapterFactory

Factory class for creating format adapters.

```python
from vanta_format_adapters import FormatAdapterFactory

# Get supported tools
tools = FormatAdapterFactory.get_supported_tools()
print(tools)  # ['cursor', 'vale', 'eslint', 'prettier', 'git-hooks', 'editorconfig']

# Create adapter
adapter = FormatAdapterFactory.create_adapter("cursor")
```

#### Methods

##### get_supported_tools() → List[str]

Returns list of supported tool formats.

```python
tools = FormatAdapterFactory.get_supported_tools()
```

**Returns:**
- `List[str]`: List of supported tool names

##### create_adapter(tool_name: str, config: Optional[AdapterConfig] = None) → FormatAdapter

Creates a format adapter for the specified tool.

```python
adapter = FormatAdapterFactory.create_adapter("cursor")
```

**Parameters:**
- `tool_name` (str): Name of the tool (cursor, vale, eslint, etc.)
- `config` (Optional[AdapterConfig]): Optional configuration for the adapter

**Returns:**
- `FormatAdapter`: Adapter instance for the specified tool

**Raises:**
- `ValueError`: If tool_name is not supported

### FormatAdapter (Base Class)

Abstract base class for all format adapters.

#### Methods

##### convert(resolved_rules: List[ResolvedRule]) → str

Converts resolved rules to tool-specific format.

```python
converted = adapter.convert(resolved_rules)
```

**Parameters:**
- `resolved_rules` (List[ResolvedRule]): List of resolved rules to convert

**Returns:**
- `str`: Converted content in tool-specific format

##### get_file_extension() → str

Returns the appropriate file extension for this format.

```python
extension = adapter.get_file_extension()  # e.g., ".md", ".json", ".yaml"
```

**Returns:**
- `str`: File extension including the dot, or empty string for no extension

### Convenience Functions

#### convert_rules_to_format

Convenience function for converting rules to a specific format.

```python
from vanta_format_adapters import convert_rules_to_format

content = convert_rules_to_format(
    resolved_rules, 
    "cursor", 
    output_path=Path("output.md")
)
```

**Parameters:**
- `resolved_rules` (List[ResolvedRule]): Rules to convert
- `tool_name` (str): Target tool name
- `output_path` (Optional[Path]): Output file path

**Returns:**
- `str`: Converted content

## Standardization Agent

### VantaStandardizationAgent

Agent for automated component discovery and compliance analysis.

```python
from vanta_standardization_agent import VantaStandardizationAgent

agent = VantaStandardizationAgent(project_root=".")
```

#### Constructor

```python
VantaStandardizationAgent(project_root: str = ".")
```

**Parameters:**
- `project_root` (str): Path to project root directory

#### Methods

##### scan_codebase(exclude_dirs: Optional[List[str]] = None) → StandardizationReport

Performs comprehensive codebase scan for components.

```python
report = agent.scan_codebase(
    exclude_dirs=['.git', '__pycache__', 'node_modules']
)
```

**Parameters:**
- `exclude_dirs` (Optional[List[str]]): Directories to exclude from scanning

**Returns:**
- `StandardizationReport`: Comprehensive analysis report

##### display_report(report: StandardizationReport) → None

Displays standardization report in formatted output.

```python
agent.display_report(report)
```

**Parameters:**
- `report` (StandardizationReport): Report to display

##### export_manifests(output_dir: Path) → None

Exports component manifests to JSON files.

```python
agent.export_manifests(Path("manifests"))
```

**Parameters:**
- `output_dir` (Path): Directory to export manifests to

#### Properties

- `project_root` (Path): Project root directory
- `discovered_components` (List[ComponentManifest]): List of discovered components

### StandardizationReport

Data class containing standardization analysis results.

```python
@dataclass
class StandardizationReport:
    scan_timestamp: str
    total_components: int
    components_by_type: Dict[str, int]
    compliance_summary: Dict[str, int]
    discovered_components: List[ComponentManifest]
    standardization_actions: List[str]
    coe_delegation_suggestions: List[str]
```

**Attributes:**
- `scan_timestamp` (str): ISO timestamp of scan
- `total_components` (int): Total number of components found
- `components_by_type` (Dict[str, int]): Count by component type
- `compliance_summary` (Dict[str, int]): Count by compliance level
- `discovered_components` (List[ComponentManifest]): Detailed component information
- `standardization_actions` (List[str]): Recommended standardization actions
- `coe_delegation_suggestions` (List[str]): Cases for Coalition of Experts review

### ComponentManifest

Data class describing a discovered component.

```python
@dataclass
class ComponentManifest:
    name: str
    type: ComponentType
    file_path: str
    line_start: int
    line_end: int
    methods: List[str]
    dependencies: List[str]
    interfaces: List[str]
    metadata: Dict[str, Any]
    compliance_level: ComplianceLevel
    standardization_recommendations: List[str]
```

## Enums

### RuleFormat

Enumeration of supported rule file formats.

```python
class RuleFormat(Enum):
    MARKDOWN = "md"
    YAML = "yaml"
    YML = "yml"
    JSON = "json"
    MDC = "mdc"
    TEXT = "txt"
```

### IncludeScope

Enumeration of include directive scopes.

```python
class IncludeScope(Enum):
    ALL_ROOTS = "all"
    EXTRA_ROOTS_ONLY = "extra"
```

### ComponentType

Enumeration of component types for standardization.

```python
class ComponentType(Enum):
    AGENT = "agent"
    RULE = "rule"
    SCHEDULER = "scheduler"
    WORKFLOW = "workflow"
    HANDLER = "handler"
    VALIDATOR = "validator"
```

### ComplianceLevel

Enumeration of compliance levels.

```python
class ComplianceLevel(Enum):
    COMPLIANT = "compliant"
    PARTIAL = "partial"
    NON_COMPLIANT = "non_compliant"
    UNKNOWN = "unknown"
```

## CLI Interface

The system provides a CLI interface via the `typer` framework.

### Available Commands

```bash
# Initialize system
python -m src.vanta_global_rules init

# Show status
python -m src.vanta_global_rules status

# Install rule library
python -m src.vanta_global_rules install <source> [--to <destination>]

# Update libraries
python -m src.vanta_global_rules update [--all] [<library>]

# Validate includes
python -m src.vanta_global_rules validate

# Sync global rules
python -m src.vanta_global_rules sync

# Export to format
python -m src.vanta_global_rules export <format> [--output <file>] [--all]
```

### CLI Parameters

Most CLI commands accept these common parameters:

- `--help`: Show command help
- `--verbose`: Enable verbose output
- `--quiet`: Suppress non-error output

## Configuration

### Configuration File Structure

The system reads configuration from `.cursor/config.yaml`:

```yaml
rule_roots:
  - "~/.vanta/global_rules"
  - "./local_rules"

vanta:
  auto_sync: true
  validation:
    strict_includes: false
    warn_missing_global: true
```

### Environment Variables

- `CURSOR_RULE_ROOTS`: Colon-separated list of rule root directories
- `VANTA_DEBUG`: Enable debug mode (true/false)
- `VANTA_CONFIG_PATH`: Override config file location

## Error Handling

### Common Exceptions

- `FileNotFoundError`: Rule file or include target not found
- `PermissionError`: Insufficient permissions to read/write files
- `ValueError`: Invalid configuration or parameters
- `yaml.YAMLError`: Invalid YAML configuration
- `json.JSONDecodeError`: Invalid JSON rule content

### Error Recovery

The system implements graceful error recovery:

1. Missing include files are logged but don't stop processing
2. Invalid configuration falls back to defaults
3. Malformed rule files are skipped with warnings
4. Network errors during library installation are retried

## Performance Considerations

### Caching

- Include resolution results are cached automatically
- Cache duration is configurable (default: 1 hour)
- Cache can be disabled for development

### Large Codebases

- Processing is performed in batches
- Memory usage is monitored and limited
- Parallel processing available for multi-core systems

### Optimization Tips

1. Use specific file patterns to reduce scanning scope
2. Exclude build directories and dependencies
3. Enable caching for frequently accessed includes
4. Use local rule libraries when possible

## Extension Points

### Custom Format Adapters

Create custom adapters by extending `FormatAdapter`:

```python
from vanta_format_adapters import FormatAdapter, AdapterConfig

class CustomAdapter(FormatAdapter):
    def convert(self, resolved_rules):
        # Custom conversion logic
        return "converted content"
    
    def get_file_extension(self):
        return ".custom"
```

### Custom Component Types

Extend the standardization agent with custom component types:

```python
class CustomComponentType(Enum):
    CUSTOM = "custom"

# Extend classification logic
def custom_classify_component(self, name, content):
    if "custom_pattern" in content:
        return CustomComponentType.CUSTOM
    return None
```

## Best Practices

### Rule Organization

1. Use descriptive file names for rules
2. Group related rules in subdirectories
3. Use consistent naming conventions
4. Document rule purposes and scope

### Include Management

1. Use relative paths for local includes
2. Use % prefix for organization-wide includes
3. Avoid deep nesting of includes
4. Test include resolution regularly

### Performance

1. Minimize include chains depth
2. Use caching for stable rule sets
3. Exclude irrelevant directories from scanning
4. Monitor memory usage for large projects

### Security

1. Validate rule sources before installation
2. Use HTTPS for remote rule libraries
3. Review rule content before activation
4. Audit rule changes in version control 