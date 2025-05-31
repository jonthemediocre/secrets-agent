#!/usr/bin/env python3
"""
Cursor & Rules Sync Agent
Recursively scans all project directories to analyze, generate, and synchronize
.cursor (dev) and .rules (prod) configuration files.
"""

import os
import json
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Set, Tuple
from dataclasses import dataclass, field
from datetime import datetime
import shutil
import hashlib

from vanta_seed.core.agent_base import VantaAgent
from vanta_seed.core.logging_config import get_logger

logger = get_logger(__name__)


@dataclass
class RuleTemplate:
    """Template for generating rule files based on context."""
    role: str  # agent, processor, ui_component, symbolic_kernel, etc.
    context: str  # runtime_node, cli_tool, api_endpoint, etc.
    base_rules: Dict[str, any] = field(default_factory=dict)
    inherits_from: List[str] = field(default_factory=list)
    
    def to_cursor_format(self) -> Dict[str, any]:
        """Convert to .cursor file format (dev-focused)."""
        return {
            "role": self.role,
            "context": self.context,
            "dev_mode": True,
            "ide_integration": {
                "autocomplete": True,
                "linting": True,
                "formatting": True
            },
            "rules": {
                **self.base_rules,
                "development": {
                    "hot_reload": True,
                    "debug_logging": True,
                    "test_mode": "enabled"
                }
            },
            "inherits": self.inherits_from
        }
    
    def to_rules_format(self) -> Dict[str, any]:
        """Convert to .rules file format (prod-focused)."""
        return {
            "role": self.role,
            "context": self.context,
            "production_mode": True,
            "enforcement": {
                "strict": True,
                "ci_cd_validation": True,
                "runtime_checks": True
            },
            "rules": {
                **self.base_rules,
                "production": {
                    "security": "enforced",
                    "logging": "structured",
                    "monitoring": "enabled"
                }
            },
            "inherits": self.inherits_from,
            "no_cursor_dependency": True
        }


@dataclass
class DirectoryContext:
    """Context information for a directory."""
    path: Path
    has_cursor: bool = False
    has_rules: bool = False
    detected_role: Optional[str] = None
    detected_context: Optional[str] = None
    agent_files: List[str] = field(default_factory=list)
    rule_files: List[str] = field(default_factory=list)
    index_files: List[str] = field(default_factory=list)
    symbolic_nodes: List[str] = field(default_factory=list)


@dataclass
class ScanResult:
    """Results from scanning directories."""
    directories_scanned: List[str] = field(default_factory=list)
    missing_cursor_dirs: List[str] = field(default_factory=list)
    missing_rules_dirs: List[str] = field(default_factory=list)
    inheritance_chains: List[Dict] = field(default_factory=list)


@dataclass
class GenerationResult:
    """Results from generating files."""
    cursor_files_created: int = 0
    rules_files_created: int = 0
    total_files_generated: int = 0


@dataclass
class SyncResult:
    """Results from syncing files."""
    rules_synced: int = 0
    symlinks_created: int = 0
    indexes_updated: int = 0


class CursorRulesSyncAgent(VantaAgent):
    """
    Agent that recursively scans project directories to analyze, generate,
    and synchronize .cursor and .rules files.
    """
    
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.project_root = Path(os.getcwd())
        self.scanned_dirs: Dict[str, DirectoryContext] = {}
        self.symlink_candidates: List[Tuple[Path, Path]] = []
        self.rule_inheritance_graph: Dict[str, Set[str]] = {}
        self.scan_cache: Dict[str, any] = {}
        self.templates = self._init_templates()
        
    def _init_templates(self) -> Dict[str, RuleTemplate]:
        """Initialize default templates for different roles."""
        return {
            "agent": RuleTemplate(
                role="agent",
                context="vanta_agent",
                base_rules={
                    "logging": "required",
                    "error_handling": "structured",
                    "state_management": "persistent",
                    "memory_access": "controlled"
                },
                inherits_from=["base_agent", "vanta_core"]
            ),
            "symbolic_kernel": RuleTemplate(
                role="symbolic_kernel",
                context="kernel_node",
                base_rules={
                    "collapse_protocol": "R->r",
                    "symbolic_trace": "enabled",
                    "resonance_tracking": True,
                    "destiny_alignment": True
                },
                inherits_from=["symbolic_core", "kernel_base"]
            ),
            "ui_component": RuleTemplate(
                role="ui_component",
                context="react_component",
                base_rules={
                    "accessibility": "wcag_aa",
                    "responsive": True,
                    "error_boundaries": "required",
                    "state_management": "context_or_props"
                },
                inherits_from=["ui_base", "react_patterns"]
            ),
            "cli_tool": RuleTemplate(
                role="cli_tool",
                context="command_line",
                base_rules={
                    "argument_parsing": "typer_or_argparse",
                    "error_codes": "standardized",
                    "help_text": "required",
                    "validation": "strict"
                },
                inherits_from=["cli_base", "unix_philosophy"]
            ),
            "processor": RuleTemplate(
                role="processor",
                context="data_processor",
                base_rules={
                    "input_validation": "strict",
                    "output_schema": "defined",
                    "error_handling": "comprehensive",
                    "logging": "structured"
                },
                inherits_from=["processor_base"]
            ),
            "runtime_node": RuleTemplate(
                role="runtime_node",
                context="execution_node",
                base_rules={
                    "lifecycle": "managed",
                    "state_tracking": "enabled",
                    "resource_limits": "defined",
                    "monitoring": "required"
                },
                inherits_from=["runtime_base"]
            )
        }
    
    def setup(self):
        """Initialize the sync agent."""
        logger.info("CursorRulesSyncAgent setup complete")
    
    def process_task(self, task_data: dict) -> dict:
        """
        Main task processor for the sync agent.
        
        Expected task_data:
        - action: "scan" | "generate" | "sync" | "full" | "clear_cache"
        - target_path: Optional[str] - specific path to process
        - options: Dict with configuration options
        """
        action = task_data.get("action", "full")
        target_path = task_data.get("target_path", str(self.project_root))
        options = task_data.get("options", {})
        
        logger.info(f"Processing {action} for path: {target_path}")
        
        try:
            if action == "scan":
                return self._scan_directories(Path(target_path), options)
            elif action == "generate":
                return self._generate_missing_files(options)
            elif action == "sync":
                return self._sync_files(options)
            elif action == "clear_cache":
                self.scan_cache.clear()
                return {"status": "success", "message": "Cache cleared"}
            elif action == "full":
                # Full workflow: scan -> generate -> sync
                scan_result = self._scan_directories(Path(target_path), options)
                gen_result = self._generate_missing_files(options)
                sync_result = self._sync_files(options)
                
                return {
                    "status": "success",
                    "scan": scan_result,
                    "generation": gen_result,
                    "sync": sync_result,
                    "summary": self._generate_summary()
                }
            else:
                return {
                    "status": "error",
                    "error": f"Unknown action: {action}"
                }
                
        except Exception as e:
            logger.error(f"Error processing task: {str(e)}", exc_info=True)
            return {
                "status": "error",
                "error": str(e)
            }
    
    def _scan_directories(self, root_path: Path, options: dict) -> dict:
        """Recursively scan directories for existing files and context."""
        cache_key = f"{root_path}_{str(options)}"
        if cache_key in self.scan_cache:
            logger.info("Using cached scan results")
            return self.scan_cache[cache_key]
            
        logger.info(f"Starting recursive scan from: {root_path}")
        
        excluded_dirs = options.get("exclude_dirs", [".git", "__pycache__", "node_modules", ".venv"])
        scan_result = ScanResult()
        
        for dirpath, dirnames, filenames in os.walk(root_path):
            # Skip excluded directories
            dirnames[:] = [d for d in dirnames if d not in excluded_dirs]
            
            dir_path = Path(dirpath)
            rel_path = dir_path.relative_to(root_path)
            
            # Skip root directory itself
            if dir_path == root_path and not options.get("include_root", False):
                continue
            
            scan_result.directories_scanned.append(str(rel_path))
            
            # Analyze directory context
            context = self._analyze_directory(dir_path, filenames)
            self.scanned_dirs[str(rel_path)] = context
            
            # Track results
            if not context.has_cursor:
                scan_result.missing_cursor_dirs.append(str(rel_path))
                
            if not context.has_rules:
                scan_result.missing_rules_dirs.append(str(rel_path))
        
        logger.info(f"Scan complete. Processed {len(scan_result.directories_scanned)} directories")
        
        result = {
            "status": "success", 
            "output": {
                "scan_result": scan_result.__dict__
            }
        }
        self.scan_cache[cache_key] = result
        return result
    
    def _analyze_directory(self, dir_path: Path, filenames: List[str]) -> DirectoryContext:
        """Analyze a directory to determine its context and existing files."""
        context = DirectoryContext(path=dir_path)
        
        # Check for existing files
        if ".cursor" in filenames or any(f.endswith(".cursor.yaml") for f in filenames):
            context.has_cursor = True
        
        if ".rules" in filenames or any(f.endswith(".rules.yaml") for f in filenames):
            context.has_rules = True
        
        # Detect agent files
        context.agent_files = [f for f in filenames if f.endswith("_agent.py") or "agent" in f.lower()]
        
        # Detect rule files
        context.rule_files = [f for f in filenames if f.endswith(".mdc") or "rule" in f.lower()]
        
        # Detect index files
        context.index_files = [f for f in filenames if "index" in f.lower() and (f.endswith(".yaml") or f.endswith(".md"))]
        
        # Detect symbolic nodes
        context.symbolic_nodes = [f for f in filenames if any(sym in f.lower() for sym in ["symbolic", "kernel", "collapse", "trinity"])]
        
        # Determine role and context
        context.detected_role, context.detected_context = self._detect_role_and_context(dir_path, context)
        
        return context
    
    def _detect_role_and_context(self, dir_path: Path, context: DirectoryContext) -> Tuple[Optional[str], Optional[str]]:
        """Detect the role and context of a directory based on its contents and path."""
        path_parts = dir_path.parts
        
        # Check for agent directories
        if context.agent_files or "agents" in path_parts:
            return "agent", "vanta_agent"
        
        # Check for symbolic/kernel directories
        if context.symbolic_nodes or any(part in ["kernel", "symbolic", "core"] for part in path_parts):
            return "symbolic_kernel", "kernel_node"
        
        # Check for UI components
        if any(part in ["components", "ui", "app"] for part in path_parts):
            if any(f.endswith((".tsx", ".jsx")) for f in os.listdir(dir_path) if os.path.isfile(dir_path / f)):
                return "ui_component", "react_component"
        
        # Check for CLI tools
        if any(part in ["cli", "scripts", "tools"] for part in path_parts):
            if any(f.endswith(".py") and f not in ["__init__.py", "setup.py"] for f in os.listdir(dir_path) if os.path.isfile(dir_path / f)):
                return "cli_tool", "command_line"
        
        # Check for rules directories
        if context.rule_files or "rules" in path_parts:
            return "rules_directory", "mdc_rules"
        
        return None, None
    
    def _generate_missing_files(self, options: dict) -> dict:
        """Generate missing .cursor and .rules files based on detected context."""
        logger.info("Generating missing configuration files")
        
        gen_result = GenerationResult()
        
        for rel_path, context in self.scanned_dirs.items():
            if not context.detected_role:
                continue
            
            # Get appropriate template
            template = self._select_template(str(context.path), context.detected_role)
            
            # Generate .cursor file if missing
            if not context.has_cursor and options.get("generate_cursor", True):
                if not options.get("dry_run", False):
                    cursor_path = context.path / ".cursor"
                    if self._generate_cursor_file(cursor_path, template, context):
                        gen_result.cursor_files_created += 1
                else:
                    gen_result.cursor_files_created += 1
            
            # Generate .rules file if missing
            if not context.has_rules and options.get("generate_rules", True):
                if not options.get("dry_run", False):
                    rules_path = context.path / ".rules"
                    if self._generate_rules_file(rules_path, template, context):
                        gen_result.rules_files_created += 1
                else:
                    gen_result.rules_files_created += 1
        
        gen_result.total_files_generated = gen_result.cursor_files_created + gen_result.rules_files_created
        logger.info(f"Generated {gen_result.cursor_files_created} .cursor and {gen_result.rules_files_created} .rules files")
        
        return {
            "status": "success",
            "output": {
                "generation_result": gen_result.__dict__
            }
        }
    
    def _select_template(self, path: str, filename: str) -> RuleTemplate:
        """Select appropriate template based on context."""
        # This is a simplified version - in reality would have more complex logic
        if filename in self.templates:
            return self.templates[filename]
        return self.templates.get("agent", self.templates["agent"])
    
    def _get_template_for_context(self, context: DirectoryContext) -> RuleTemplate:
        """Get the appropriate template based on directory context."""
        # Use detected role or fall back to a generic template
        if context.detected_role in self.templates:
            template = self.templates[context.detected_role]
        else:
            # Create a generic template
            template = RuleTemplate(
                role=context.detected_role or "generic",
                context=context.detected_context or "unknown",
                base_rules={
                    "logging": "standard",
                    "error_handling": "basic"
                },
                inherits_from=["base"]
            )
        
        # Enhance template based on specific files found
        if context.symbolic_nodes:
            template.base_rules["symbolic_awareness"] = True
            template.base_rules["kernel_integration"] = "enabled"
        
        if context.index_files:
            template.base_rules["index_aware"] = True
            template.inherits_from.append("indexed_component")
        
        return template
    
    def _generate_cursor_file(self, path: Path, template: RuleTemplate, context: DirectoryContext) -> bool:
        """Generate a .cursor file for development."""
        try:
            cursor_config = template.to_cursor_format()
            
            # Add directory-specific metadata
            cursor_config["metadata"] = {
                "generated_by": "CursorRulesSyncAgent",
                "generated_at": datetime.now().isoformat(),
                "directory_context": {
                    "has_agents": len(context.agent_files) > 0,
                    "has_rules": len(context.rule_files) > 0,
                    "has_symbolic": len(context.symbolic_nodes) > 0
                }
            }
            
            # Create directory if it doesn't exist
            path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write as YAML
            with open(path, 'w') as f:
                yaml.dump(cursor_config, f, default_flow_style=False, sort_keys=False)
            
            logger.info(f"Generated .cursor file at: {path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to generate .cursor file at {path}: {str(e)}")
            return False
    
    def _generate_rules_file(self, path: Path, template: RuleTemplate, context: DirectoryContext) -> bool:
        """Generate a .rules file for production."""
        try:
            rules_config = template.to_rules_format()
            
            # Add production-specific metadata
            rules_config["metadata"] = {
                "generated_by": "CursorRulesSyncAgent",
                "generated_at": datetime.now().isoformat(),
                "schema_version": "1.0",
                "enforcement_level": "strict",
                "ci_cd_integration": {
                    "validate_on_commit": True,
                    "block_on_violation": True
                }
            }
            
            # Add checksum for integrity
            config_str = json.dumps(rules_config, sort_keys=True)
            rules_config["metadata"]["checksum"] = hashlib.sha256(config_str.encode()).hexdigest()
            
            # Create directory if it doesn't exist
            path.parent.mkdir(parents=True, exist_ok=True)
            
            # Write as YAML
            with open(path, 'w') as f:
                yaml.dump(rules_config, f, default_flow_style=False, sort_keys=False)
            
            logger.info(f"Generated .rules file at: {path}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to generate .rules file at {path}: {str(e)}")
            return False
    
    def _sync_files(self, options: dict) -> dict:
        """Sync files across directories and create symlinks where appropriate."""
        logger.info("Starting file synchronization")
        
        sync_result = SyncResult()
        
        # Build inheritance graph
        self._build_inheritance_graph()
        
        # Identify symlink candidates
        if options.get("enable_symlinks", True):
            self._identify_symlink_candidates()
            
            # Create symlinks for shared logic
            for source, target in self.symlink_candidates:
                if self._create_symlink(source, target):
                    sync_result.symlinks_created += 1
        
        # Sync rule configurations across related directories
        if options.get("sync_rules", True):
            synced = self._sync_rule_configurations()
            sync_result.rules_synced = len(synced)
        
        logger.info(f"Sync complete. Created {sync_result.symlinks_created} symlinks")
        
        return {
            "status": "success",
            "output": {
                "sync_result": sync_result.__dict__
            }
        }
    
    def _build_inheritance_graph(self):
        """Build a graph of rule inheritance relationships."""
        for rel_path, context in self.scanned_dirs.items():
            inherits = set()
            
            # Check for index files that might define inheritance
            for index_file in context.index_files:
                index_path = context.path / index_file
                if index_path.exists():
                    try:
                        with open(index_path, 'r') as f:
                            if index_file.endswith('.yaml'):
                                data = yaml.safe_load(f)
                                if isinstance(data, dict) and 'inherits' in data:
                                    inherits.update(data['inherits'])
                    except Exception as e:
                        logger.warning(f"Failed to parse index file {index_path}: {str(e)}")
            
            self.rule_inheritance_graph[rel_path] = inherits
    
    def _identify_symlink_candidates(self):
        """Identify directories that could share configuration via symlinks."""
        # Group directories by role and context
        role_groups = {}
        for rel_path, context in self.scanned_dirs.items():
            if context.detected_role:
                key = (context.detected_role, context.detected_context)
                if key not in role_groups:
                    role_groups[key] = []
                role_groups[key].append(context)
        
        # Find candidates within each group
        for (role, ctx), contexts in role_groups.items():
            if len(contexts) > 1:
                # Sort by path depth to find the most "base" directory
                contexts.sort(key=lambda c: len(c.path.parts))
                base_context = contexts[0]
                
                # Check if base has configuration files
                base_cursor = base_context.path / ".cursor"
                base_rules = base_context.path / ".rules"
                
                if base_cursor.exists() or base_rules.exists():
                    # Other directories in group could symlink to base
                    for other_context in contexts[1:]:
                        if base_cursor.exists() and not (other_context.path / ".cursor").exists():
                            self.symlink_candidates.append((base_cursor, other_context.path / ".cursor"))
                        if base_rules.exists() and not (other_context.path / ".rules").exists():
                            self.symlink_candidates.append((base_rules, other_context.path / ".rules"))
    
    def _create_symlink(self, source: Path, target: Path) -> bool:
        """Create a symlink from source to target."""
        try:
            # On Windows, use junction for directories
            if os.name == 'nt' and source.is_dir():
                import subprocess
                subprocess.run(['mklink', '/J', str(target), str(source)], shell=True, check=True)
            else:
                target.symlink_to(source)
            
            logger.info(f"Created symlink: {target} -> {source}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to create symlink {target} -> {source}: {str(e)}")
            return False
    
    def _sync_rule_configurations(self) -> List[str]:
        """Sync rule configurations across related directories."""
        synced = []
        
        # Find directories that should have synchronized rules
        for rel_path, inherits in self.rule_inheritance_graph.items():
            context = self.scanned_dirs[rel_path]
            
            for parent_path in inherits:
                if parent_path in self.scanned_dirs:
                    parent_context = self.scanned_dirs[parent_path]
                    
                    # Sync .rules files if parent has one and child doesn't
                    parent_rules = parent_context.path / ".rules"
                    child_rules = context.path / ".rules"
                    
                    if parent_rules.exists() and not child_rules.exists():
                        try:
                            shutil.copy2(parent_rules, child_rules)
                            synced.append(str(child_rules))
                            logger.info(f"Synced rules from {parent_rules} to {child_rules}")
                        except Exception as e:
                            logger.error(f"Failed to sync rules: {str(e)}")
        
        return synced
    
    def _generate_summary(self) -> dict:
        """Generate a summary of the sync operation."""
        return {
            "total_directories_scanned": len(self.scanned_dirs),
            "directories_by_role": self._count_by_role(),
            "coverage": {
                "cursor_coverage": sum(1 for c in self.scanned_dirs.values() if c.has_cursor) / len(self.scanned_dirs) * 100 if self.scanned_dirs else 0,
                "rules_coverage": sum(1 for c in self.scanned_dirs.values() if c.has_rules) / len(self.scanned_dirs) * 100 if self.scanned_dirs else 0
            },
            "symbolic_nodes_found": sum(len(c.symbolic_nodes) for c in self.scanned_dirs.values()),
            "agents_found": sum(len(c.agent_files) for c in self.scanned_dirs.values()),
            "index_files_found": sum(len(c.index_files) for c in self.scanned_dirs.values())
        }
    
    def _count_by_role(self) -> dict:
        """Count directories by detected role."""
        role_counts = {}
        for context in self.scanned_dirs.values():
            if context.detected_role:
                role_counts[context.detected_role] = role_counts.get(context.detected_role, 0) + 1
        return role_counts
    
    async def teardown(self):
        """Clean up resources."""
        logger.info("CursorRulesSyncAgent teardown complete")


# Agent metadata for registration
AGENT_METADATA = {
    "id": "cursor_rules_sync_agent",
    "name": "Cursor & Rules Sync Agent",
    "description": "Recursively scans project directories to analyze, generate, and synchronize .cursor and .rules files",
    "version": "1.0.0",
    "capabilities": ["scan", "generate", "sync", "audit"],
    "tags": ["automation", "devops", "configuration", "symbolic"],
    "status": "active"
} 

def _create_project_marker(self, path: Path, metadata: dict = None) -> bool:
    """Create a secretsagent.proj marker file with a warning comment and optional metadata."""
    try:
        marker_path = path / "secretsagent.proj"
        with open(marker_path, 'w', encoding='utf-8') as f:
            f.write("# DO NOT PUT SECRETS OR SENSITIVE DATA IN THIS FILE\n")
            f.write("# This file is for project metadata only.\n")
            if metadata:
                import yaml
                yaml.dump(metadata, f, default_flow_style=False, sort_keys=False)
        return True
    except Exception as e:
        logger.error(f"Failed to create secretsagent.proj at {path}: {str(e)}")
        return False 