#!/usr/bin/env python3
"""
VANTA Global Rule Library & Include-Directives System

Implementation of the comprehensive PRD for global rule management,
include directives, multi-format support, and tool integration.

Author: VANTA! Coder
Version: 1.0.0
"""

import os
import re
import json
import yaml
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Union, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.tree import Tree
import subprocess
import shutil
from urllib.parse import urlparse
import requests

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

console = Console()

class RuleFormat(Enum):
    """Supported rule file formats"""
    MARKDOWN = "md"
    YAML = "yaml"
    YML = "yml" 
    JSON = "json"
    MDC = "mdc"
    TEXT = "txt"

class IncludeScope(Enum):
    """Include directive scope types"""
    ALL_ROOTS = "all"
    EXTRA_ROOTS_ONLY = "extra"

@dataclass
class RuleSource:
    """Represents a rule source location"""
    path: str
    is_remote: bool = False
    is_symlink: bool = False
    priority: int = 0

@dataclass
class IncludeDirective:
    """Represents an @include directive found in a rule file"""
    original_line: str
    file_path: str
    scope: IncludeScope
    line_number: int
    resolved_content: Optional[str] = None

@dataclass
class ResolvedRule:
    """A rule file after include resolution"""
    original_path: str
    format: RuleFormat
    content: str
    includes: List[IncludeDirective]
    metadata: Dict[str, Any]

class VantaGlobalRules:
    """
    Main Global Rule Library & Include-Directives System
    
    Implements:
    - FR1: rule_roots config in .cursor/config.yaml, CLI, ENV
    - FR2: @include [%]path/to/file.ext parsing
    - FR3: % prefix restriction to extra roots
    - FR4: Multi-format recognition (.md, .yaml, .yml, .json, .mdc, .txt)
    - FR5: Clear error messages for missing includes
    - FR6-7: CLI install/update commands
    - FR8: Format adapters for tool-specific output
    - FR9-10: Global rules sync and reminder system
    """

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.config_path = self.project_root / ".cursor" / "config.yaml"
        self.rules_dir = self.project_root / ".cursor" / "rules"
        
        # Initialize configuration
        self.config = self._load_config()
        self.rule_roots = self._get_rule_roots()
        
        # Include directive pattern: @include [%]path/to/file.ext
        self.include_pattern = re.compile(
            r'^@include\s+(%?)([^\s]+(?:\.[a-zA-Z0-9]+)?)\s*$',
            re.MULTILINE
        )
        
        # Cache for resolved rules
        self._resolution_cache: Dict[str, ResolvedRule] = {}

    def _load_config(self) -> Dict[str, Any]:
        """Load configuration from .cursor/config.yaml"""
        try:
            if self.config_path.exists():
                with open(self.config_path, 'r') as f:
                    return yaml.safe_load(f) or {}
            return {}
        except Exception as e:
            logger.warning(f"Failed to load config from {self.config_path}: {e}")
            return {}

    def _save_config(self) -> None:
        """Save configuration to .cursor/config.yaml"""
        try:
            self.config_path.parent.mkdir(parents=True, exist_ok=True)
            with open(self.config_path, 'w') as f:
                yaml.dump(self.config, f, default_flow_style=False)
        except Exception as e:
            logger.error(f"Failed to save config to {self.config_path}: {e}")

    def _get_rule_roots(self) -> List[RuleSource]:
        """
        FR1: Get rule_roots from config, CLI args, and ENV vars
        Priority: CLI > ENV > Config > Default
        """
        rule_roots = []
        
        # Default: local .cursor/rules
        rule_roots.append(RuleSource(
            path=str(self.rules_dir),
            priority=0
        ))
        
        # From config file
        config_roots = self.config.get('rule_roots', [])
        for i, root in enumerate(config_roots):
            rule_roots.append(RuleSource(
                path=str(Path(root).expanduser().resolve()),
                priority=10 + i
            ))
        
        # From environment variable
        env_roots = os.getenv('CURSOR_RULE_ROOTS', '').split(':')
        for i, root in enumerate(env_roots):
            if root.strip():
                rule_roots.append(RuleSource(
                    path=str(Path(root.strip()).expanduser().resolve()),
                    priority=20 + i
                ))
        
        # Sort by priority (higher priority last, so they override)
        rule_roots.sort(key=lambda x: x.priority)
        
        return rule_roots

    def _detect_format(self, file_path: Path) -> RuleFormat:
        """FR4: Detect rule format based on file extension"""
        suffix = file_path.suffix.lower().lstrip('.')
        
        format_map = {
            'md': RuleFormat.MARKDOWN,
            'mdc': RuleFormat.MDC,
            'yaml': RuleFormat.YAML,
            'yml': RuleFormat.YML,
            'json': RuleFormat.JSON,
            'txt': RuleFormat.TEXT
        }
        
        return format_map.get(suffix, RuleFormat.TEXT)

    def _find_include_file(self, include_path: str, scope: IncludeScope, 
                          requesting_file: str) -> Optional[Path]:
        """
        FR2-3: Find include file based on scope and search strategy
        """
        include_file = Path(include_path)
        
        # If absolute path, use directly
        if include_file.is_absolute():
            return include_file if include_file.exists() else None
        
        # Search strategy based on scope
        search_roots = []
        
        if scope == IncludeScope.EXTRA_ROOTS_ONLY:
            # % prefix: only search extra roots (skip default .cursor/rules)
            search_roots = [r for r in self.rule_roots if r.priority > 0]
        else:
            # No prefix: search all roots
            search_roots = self.rule_roots
        
        # Add the directory of the requesting file for relative includes
        requesting_dir = Path(requesting_file).parent
        search_roots.insert(0, RuleSource(path=str(requesting_dir), priority=-1))
        
        # Search each root in priority order
        for root in search_roots:
            candidate = Path(root.path) / include_path
            if candidate.exists() and candidate.is_file():
                return candidate
        
        return None

    def _parse_includes(self, content: str, file_path: str) -> List[IncludeDirective]:
        """FR2: Parse @include directives from rule content"""
        includes = []
        
        for match in self.include_pattern.finditer(content):
            prefix = match.group(1)  # % or empty
            path = match.group(2)
            
            scope = IncludeScope.EXTRA_ROOTS_ONLY if prefix == '%' else IncludeScope.ALL_ROOTS
            
            # Find line number
            line_number = content[:match.start()].count('\n') + 1
            
            includes.append(IncludeDirective(
                original_line=match.group(0),
                file_path=path,
                scope=scope,
                line_number=line_number
            ))
        
        return includes

    def resolve_includes(self, rule_file: Path) -> ResolvedRule:
        """
        FR2-5: Resolve all @include directives in a rule file
        """
        cache_key = str(rule_file)
        if cache_key in self._resolution_cache:
            return self._resolution_cache[cache_key]
        
        try:
            # Read the original file
            content = rule_file.read_text(encoding='utf-8')
            format = self._detect_format(rule_file)
            
            # Parse includes
            includes = self._parse_includes(content, str(rule_file))
            
            # Resolve each include
            resolved_content = content
            resolution_errors = []
            
            for include in includes:
                include_file = self._find_include_file(
                    include.file_path, 
                    include.scope, 
                    str(rule_file)
                )
                
                if include_file:
                    # Recursively resolve the included file
                    included_rule = self.resolve_includes(include_file)
                    include.resolved_content = included_rule.content
                    
                    # Replace the @include directive with the resolved content
                    resolved_content = resolved_content.replace(
                        include.original_line,
                        f"# Included from: {include.file_path}\n{included_rule.content}\n# End include: {include.file_path}"
                    )
                else:
                    # FR5: Clear error for missing includes
                    error_msg = f"Include not found: {include.file_path} (scope: {include.scope.value})"
                    resolution_errors.append(error_msg)
                    logger.error(f"[{rule_file}:{include.line_number}] {error_msg}")
            
            resolved_rule = ResolvedRule(
                original_path=str(rule_file),
                format=format,
                content=resolved_content,
                includes=includes,
                metadata={
                    "resolution_errors": resolution_errors,
                    "original_size": len(content),
                    "resolved_size": len(resolved_content),
                    "include_count": len(includes)
                }
            )
            
            # Cache the result
            self._resolution_cache[cache_key] = resolved_rule
            
            return resolved_rule
            
        except Exception as e:
            logger.error(f"Failed to resolve includes for {rule_file}: {e}")
            # Return a basic resolved rule with error
            return ResolvedRule(
                original_path=str(rule_file),
                format=self._detect_format(rule_file),
                content=f"# ERROR: Failed to resolve includes: {e}",
                includes=[],
                metadata={"error": str(e)}
            )

    def install_rule_library(self, source: str, destination: Optional[str] = None) -> bool:
        """
        FR6: Install rule library from source
        """
        console.print(f"📦 [bold blue]Installing rule library from: {source}[/bold blue]")
        
        try:
            # Determine if source is remote or local
            is_remote = self._is_remote_source(source)
            
            if destination is None:
                # Default destination: .vanta/global_rules/
                destination = str(self.project_root / ".vanta" / "global_rules" / self._get_library_name(source))
            
            dest_path = Path(destination)
            dest_path.mkdir(parents=True, exist_ok=True)
            
            if is_remote:
                success = self._install_remote_library(source, dest_path)
            else:
                success = self._install_local_library(source, dest_path)
            
            if success:
                # Add to rule_roots in config
                self._add_rule_root(str(dest_path))
                console.print(f"✅ Successfully installed to: {dest_path}")
                return True
            else:
                console.print(f"❌ Failed to install from: {source}")
                return False
                
        except Exception as e:
            logger.error(f"Installation failed: {e}")
            console.print(f"❌ Installation error: {e}")
            return False

    def update_rule_libraries(self, library_name: Optional[str] = None) -> bool:
        """
        FR7: Update rule libraries
        """
        console.print("🔄 [bold blue]Updating rule libraries[/bold blue]")
        
        try:
            if library_name:
                # Update specific library
                return self._update_specific_library(library_name)
            else:
                # Update all libraries
                return self._update_all_libraries()
                
        except Exception as e:
            logger.error(f"Update failed: {e}")
            console.print(f"❌ Update error: {e}")
            return False

    def _is_remote_source(self, source: str) -> bool:
        """Check if source is a remote URL"""
        parsed = urlparse(source)
        return parsed.scheme in ['http', 'https', 'git']

    def _get_library_name(self, source: str) -> str:
        """Extract library name from source"""
        if self._is_remote_source(source):
            return Path(urlparse(source).path).stem
        else:
            return Path(source).name

    def _install_remote_library(self, source: str, dest_path: Path) -> bool:
        """Install from remote source (git, http, etc.)"""
        if source.endswith('.git') or 'github.com' in source:
            # Git repository
            try:
                subprocess.run(['git', 'clone', source, str(dest_path)], 
                             check=True, capture_output=True)
                return True
            except subprocess.CalledProcessError as e:
                logger.error(f"Git clone failed: {e}")
                return False
        else:
            # HTTP download
            try:
                response = requests.get(source)
                response.raise_for_status()
                
                # Assume it's a zip or tar file
                import tempfile
                with tempfile.NamedTemporaryFile(delete=False) as tmp:
                    tmp.write(response.content)
                    tmp_path = tmp.name
                
                # Extract archive
                shutil.unpack_archive(tmp_path, dest_path)
                os.unlink(tmp_path)
                return True
                
            except Exception as e:
                logger.error(f"HTTP download failed: {e}")
                return False

    def _install_local_library(self, source: str, dest_path: Path) -> bool:
        """Install from local source"""
        source_path = Path(source)
        
        if source_path.is_dir():
            # Copy directory
            shutil.copytree(source_path, dest_path, dirs_exist_ok=True)
            return True
        elif source_path.is_file():
            # Copy single file
            shutil.copy2(source_path, dest_path)
            return True
        else:
            logger.error(f"Source not found: {source}")
            return False

    def _add_rule_root(self, path: str) -> None:
        """Add rule root to configuration"""
        if 'rule_roots' not in self.config:
            self.config['rule_roots'] = []
        
        if path not in self.config['rule_roots']:
            self.config['rule_roots'].append(path)
            self._save_config()

    def _update_specific_library(self, library_name: str) -> bool:
        """Update a specific library"""
        # Find library in rule_roots
        for root in self.rule_roots:
            if library_name in root.path:
                return self._update_library_at_path(Path(root.path))
        
        console.print(f"❌ Library not found: {library_name}")
        return False

    def _update_all_libraries(self) -> bool:
        """Update all libraries"""
        success_count = 0
        total_count = 0
        
        for root in self.rule_roots:
            if root.priority > 0:  # Skip default local rules
                total_count += 1
                if self._update_library_at_path(Path(root.path)):
                    success_count += 1
        
        console.print(f"✅ Updated {success_count}/{total_count} libraries")
        return success_count == total_count

    def _update_library_at_path(self, path: Path) -> bool:
        """Update library at specific path"""
        try:
            if (path / '.git').exists():
                # Git repository - pull latest
                result = subprocess.run(['git', 'pull'], 
                                      cwd=path, 
                                      check=True, 
                                      capture_output=True)
                console.print(f"📥 Updated git library: {path}")
                return True
            else:
                console.print(f"⚠️  Manual update required: {path}")
                return True
                
        except subprocess.CalledProcessError as e:
            logger.error(f"Failed to update {path}: {e}")
            return False

    def generate_globalrules_synced(self) -> None:
        """
        FR9: Generate/maintain globalrules_synced.md for copy/paste activation
        """
        console.print("📄 [bold blue]Generating globalrules_synced.md[/bold blue]")
        
        # Read the canonical globalrules.md
        globalrules_path = self.project_root / "globalrules.md"
        
        if not globalrules_path.exists():
            console.print("⚠️  globalrules.md not found, creating basic version")
            self._create_basic_globalrules()
        
        try:
            canonical_content = globalrules_path.read_text(encoding='utf-8')
            
            # Create synced version with copy/paste instructions
            synced_content = f"""# Global Rules (IDE Copy/Paste Ready)

**INSTRUCTIONS FOR CURSOR IDE:**
1. Copy the entire rules section below
2. Go to Cursor Settings → Rules → Global Rules
3. Paste this content into the global rules text area
4. Save settings

**INSTRUCTIONS FOR OTHER IDEs:**
- VSCode: Add to .vscode/settings.json under "cursor.rules.global"
- JetBrains: Add to .idea/cursor_rules.md
- Vim/Neovim: Add to .vim/cursor_rules.md

---

{canonical_content}

---

**Last Synced:** {self._get_timestamp()}
**Source:** globalrules.md
**Auto-generated by:** VANTA Global Rules System

**NOTE:** This file is auto-generated. Edit globalrules.md instead.
"""
            
            synced_path = self.project_root / "globalrules_synced.md"
            synced_path.write_text(synced_content, encoding='utf-8')
            
            console.print(f"✅ Generated: {synced_path}")
            
        except Exception as e:
            logger.error(f"Failed to generate globalrules_synced.md: {e}")

    def create_reminder_rule(self) -> None:
        """
        FR10: Add .cursor/rules/999-global-rules-reminder.mdc to prompt users
        """
        console.print("🔔 [bold blue]Creating global rules reminder[/bold blue]")
        
        reminder_content = """# RULE TYPE: Always
# FILE PATTERNS: **/*

## Global Rules Activation Reminder

**IMPORTANT:** This project uses global rules that need to be activated in your IDE.

### Quick Setup for Cursor IDE:
1. Open the file `globalrules_synced.md` in this repository
2. Copy the entire rules content 
3. Go to Cursor Settings → Rules → Global Rules
4. Paste the content and save

### Alternative Method:
- Set your Cursor IDE to use global rules from: `globalrules.md`
- Or configure `CURSOR_RULE_ROOTS` environment variable

### Why This Matters:
- **Consistency:** Ensures all team members use the same coding standards
- **Quality:** Automated enforcement of best practices and patterns
- **Efficiency:** Reduces code review overhead and catches issues early

### Files to Check:
- `globalrules.md` - Canonical global rules
- `globalrules_synced.md` - Copy/paste ready version
- `.cursor/config.yaml` - Local rule roots configuration

**Please activate global rules before starting development!**

---

*This reminder will disappear once global rules are properly configured.*
"""
        
        self.rules_dir.mkdir(parents=True, exist_ok=True)
        reminder_path = self.rules_dir / "999-global-rules-reminder.mdc"
        
        reminder_path.write_text(reminder_content, encoding='utf-8')
        console.print(f"✅ Created reminder: {reminder_path}")

    def _create_basic_globalrules(self) -> None:
        """Create a basic globalrules.md if it doesn't exist"""
        basic_content = """# Global Rules

This file contains the canonical global rules for this organization/project.

## Core Development Standards

### Code Quality
- Follow consistent naming conventions
- Add meaningful comments for complex logic
- Ensure proper error handling
- Write tests for new functionality

### Git Practices  
- Use descriptive commit messages
- Keep commits atomic and focused
- Include issue numbers in commit messages
- Review code before merging

### Documentation
- Update README.md for significant changes
- Document API changes
- Keep inline documentation current
- Include examples for complex features

---

**Note:** Edit this file to customize global rules for your organization.
Rules added here will be synchronized to `globalrules_synced.md` for IDE activation.
"""
        
        globalrules_path = self.project_root / "globalrules.md"
        globalrules_path.write_text(basic_content, encoding='utf-8')
        console.print(f"✅ Created basic globalrules.md")

    def _get_timestamp(self) -> str:
        """Get current timestamp for sync tracking"""
        from datetime import datetime
        return datetime.now().isoformat()

    def list_rule_sources(self) -> None:
        """Display all configured rule sources"""
        console.print("📋 [bold blue]Configured Rule Sources[/bold blue]")
        
        table = Table(title="Rule Roots")
        table.add_column("Priority", justify="right")
        table.add_column("Path", style="cyan")
        table.add_column("Type")
        table.add_column("Status")
        
        for root in self.rule_roots:
            path_obj = Path(root.path)
            
            if path_obj.exists():
                status = "✅ Active"
                rule_count = len(list(path_obj.glob("*.mdc")) + 
                               list(path_obj.glob("*.md")) + 
                               list(path_obj.glob("*.yaml")) +
                               list(path_obj.glob("*.yml")) +
                               list(path_obj.glob("*.json")))
                status += f" ({rule_count} rules)"
            else:
                status = "❌ Missing"
            
            root_type = "Default" if root.priority == 0 else "Global"
            if root.is_symlink:
                root_type += " (symlink)"
            if root.is_remote:
                root_type += " (remote)"
                
            table.add_row(
                str(root.priority),
                str(root.path),
                root_type,
                status
            )
        
        console.print(table)

    def validate_includes(self) -> Dict[str, Any]:
        """Validate all include directives in rule files"""
        console.print("🔍 [bold blue]Validating Include Directives[/bold blue]")
        
        validation_results = {
            "total_files": 0,
            "files_with_includes": 0,
            "total_includes": 0,
            "successful_includes": 0,
            "failed_includes": 0,
            "errors": []
        }
        
        # Scan all rule files in all roots
        for root in self.rule_roots:
            root_path = Path(root.path)
            if not root_path.exists():
                continue
                
            for rule_file in root_path.rglob("*"):
                if rule_file.is_file() and rule_file.suffix in ['.mdc', '.md', '.yaml', '.yml', '.json']:
                    validation_results["total_files"] += 1
                    
                    try:
                        resolved = self.resolve_includes(rule_file)
                        
                        if resolved.includes:
                            validation_results["files_with_includes"] += 1
                            validation_results["total_includes"] += len(resolved.includes)
                            
                            for include in resolved.includes:
                                if include.resolved_content:
                                    validation_results["successful_includes"] += 1
                                else:
                                    validation_results["failed_includes"] += 1
                                    validation_results["errors"].append(f"{rule_file}: {include.file_path}")
                    
                    except Exception as e:
                        validation_results["errors"].append(f"{rule_file}: {e}")
        
        # Display results
        console.print(f"📊 Validation Results:")
        console.print(f"   • Total files scanned: {validation_results['total_files']}")
        console.print(f"   • Files with includes: {validation_results['files_with_includes']}")
        console.print(f"   • Total includes: {validation_results['total_includes']}")
        console.print(f"   • Successful: {validation_results['successful_includes']}")
        console.print(f"   • Failed: {validation_results['failed_includes']}")
        
        if validation_results["errors"]:
            console.print("\n❌ [bold red]Include Errors:[/bold red]")
            for error in validation_results["errors"]:
                console.print(f"   • {error}")
        
        return validation_results

# CLI Interface
app = typer.Typer(
    name="vanta-global-rules",
    help="VANTA Global Rule Library & Include-Directives System"
)

@app.command()
def install(
    source: str = typer.Argument(help="Rule library source (URL, git repo, or local path)"),
    destination: Optional[str] = typer.Option(None, "--to", help="Installation destination")
):
    """FR6: Install rule library from source"""
    rules_system = VantaGlobalRules()
    success = rules_system.install_rule_library(source, destination)
    if not success:
        raise typer.Exit(1)

@app.command()
def update(
    library: Optional[str] = typer.Option(None, help="Specific library to update"),
    all: bool = typer.Option(False, "--all", help="Update all libraries")
):
    """FR7: Update rule libraries"""
    rules_system = VantaGlobalRules()
    
    if all or library is None:
        success = rules_system.update_rule_libraries()
    else:
        success = rules_system.update_rule_libraries(library)
    
    if not success:
        raise typer.Exit(1)

@app.command()
def sync():
    """FR9: Generate globalrules_synced.md for IDE activation"""
    rules_system = VantaGlobalRules()
    rules_system.generate_globalrules_synced()

@app.command()
def init():
    """Initialize global rules system in current project"""
    rules_system = VantaGlobalRules()
    
    console.print("🚀 [bold blue]Initializing VANTA Global Rules System[/bold blue]")
    
    # Create basic structure
    rules_system.generate_globalrules_synced()
    rules_system.create_reminder_rule()
    
    # Create basic .cursor/config.yaml if it doesn't exist
    if not rules_system.config_path.exists():
        rules_system.config_path.parent.mkdir(parents=True, exist_ok=True)
        basic_config = {
            "rule_roots": [
                "~/.vanta/global_rules",
                "./.vanta/local_rules"
            ]
        }
        with open(rules_system.config_path, 'w') as f:
            yaml.dump(basic_config, f, default_flow_style=False)
        console.print(f"✅ Created: {rules_system.config_path}")
    
    console.print("✅ Global rules system initialized!")
    console.print("\n📋 Next steps:")
    console.print("   1. Review globalrules_synced.md")
    console.print("   2. Copy rules to your IDE global settings")
    console.print("   3. Use 'vanta rules install <source>' to add rule libraries")

@app.command()
def status():
    """Show status of global rules system"""
    rules_system = VantaGlobalRules()
    
    console.print("📊 [bold blue]VANTA Global Rules Status[/bold blue]")
    
    # Show rule sources
    rules_system.list_rule_sources()
    
    # Validate includes
    console.print("\n")
    validation_results = rules_system.validate_includes()
    
    # Show key files status
    console.print("\n📁 [bold blue]Key Files Status[/bold blue]")
    
    key_files = [
        ("globalrules.md", "Canonical global rules"),
        ("globalrules_synced.md", "IDE copy/paste ready"),
        (".cursor/config.yaml", "Rule roots configuration"),
        (".cursor/rules/999-global-rules-reminder.mdc", "User reminder")
    ]
    
    for filename, description in key_files:
        file_path = rules_system.project_root / filename
        status = "✅ Exists" if file_path.exists() else "❌ Missing"
        console.print(f"   • {filename:<40} {status:<10} {description}")

@app.command()
def validate():
    """Validate all include directives"""
    rules_system = VantaGlobalRules()
    validation_results = rules_system.validate_includes()
    
    if validation_results["failed_includes"] > 0:
        raise typer.Exit(1)

@app.command()
def export(
    format: str = typer.Argument(help="Target format (cursor, vale, eslint, prettier, git-hooks, editorconfig)"),
    output_file: Optional[str] = typer.Option(None, "--output", help="Output file path"),
    include_all: bool = typer.Option(False, "--all", help="Include all rule files")
):
    """FR8: Export rules to tool-specific format"""
    rules_system = VantaGlobalRules()
    
    console.print(f"📤 [bold blue]Exporting rules to {format} format[/bold blue]")
    
    try:
        # Import here to avoid circular imports
        from vanta_format_adapters import FormatAdapterFactory, convert_rules_to_format
        
        # Get all rule files
        resolved_rules = []
        
        for root in rules_system.rule_roots:
            root_path = Path(root.path)
            if not root_path.exists():
                continue
                
            for rule_file in root_path.rglob("*"):
                if rule_file.is_file() and rule_file.suffix in ['.mdc', '.md', '.yaml', '.yml', '.json']:
                    try:
                        resolved = rules_system.resolve_includes(rule_file)
                        resolved_rules.append(resolved)
                    except Exception as e:
                        logger.warning(f"Failed to resolve {rule_file}: {e}")
        
        if not resolved_rules:
            console.print("⚠️  No rules found to export")
            return
        
        # Determine output path
        if output_file is None:
            adapter = FormatAdapterFactory.create_adapter(format)
            extension = adapter.get_file_extension()
            output_file = f"exported_rules_{format}{extension}"
        
        output_path = Path(output_file)
        
        # Convert and save
        converted_content = convert_rules_to_format(resolved_rules, format, output_path)
        
        console.print(f"✅ Exported {len(resolved_rules)} rules to: {output_path}")
        console.print(f"📊 Content size: {len(converted_content)} characters")
        
    except ImportError as e:
        console.print(f"❌ Format adapters not available: {e}")
        raise typer.Exit(1)
    except Exception as e:
        console.print(f"❌ Export failed: {e}")
        raise typer.Exit(1)

if __name__ == "__main__":
    app() 