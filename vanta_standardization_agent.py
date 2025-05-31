#!/usr/bin/env python3
"""
VANTA Agentic Standardization & Rule Graduation Agent

Implements the comprehensive PRD for scanning, evaluating, and standardizing
all agent, rule, and scheduler logic across the codebase according to the
Universal Agent Protocol (UAP) and Global Rules Layer standards.

Author: VANTA! Coder
Version: 1.0.0
"""

import os
import json
import yaml
import re
import logging
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Set
from dataclasses import dataclass, asdict
from enum import Enum
import asyncio
from datetime import datetime
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from rich.tree import Tree

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

console = Console()

class ComplianceStatus(Enum):
    """Compliance status levels for discovered components"""
    CONFORMANT = "✅ Conformant"
    PROTOTYPE = "🧩 Prototype"
    NONCONFORMANT = "⚠️ Nonconformant"
    ORPHANED = "🔴 Orphaned"

class ComponentType(Enum):
    """Types of components that can be discovered"""
    AGENT = "agent"
    RULE = "rule"
    SCHEDULER = "scheduler"
    MANIFEST = "manifest"

@dataclass
class DiscoveredComponent:
    """Represents a discovered component in the codebase"""
    path: str
    component_type: ComponentType
    name: str
    compliance_status: ComplianceStatus
    issues: List[str]
    uap_compliant: bool = False
    mdc_compliant: bool = False
    manifest_registered: bool = False
    graduation_candidate: bool = False
    metadata: Dict[str, Any] = None

    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}

@dataclass
class StandardizationReport:
    """Complete standardization report"""
    discovered_components: List[DiscoveredComponent]
    uap_violations: List[str]
    graduation_candidates: List[DiscoveredComponent]
    manifest_updates: Dict[str, Any]
    recommendations: List[str]
    timestamp: str = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = datetime.now().isoformat()

class VantaStandardizationAgent:
    """
    Main VANTA Agentic Standardization Agent
    
    Implements the comprehensive PRD for:
    1. Project-wide discovery & classification
    2. Structural & protocol compliance analysis  
    3. Automated UAP refactoring & suggestions
    4. Rule graduation & globalization
    5. Scheduler & manifest standardization
    """

    def __init__(self, project_root: str = "."):
        self.project_root = Path(project_root)
        self.discovered_components: List[DiscoveredComponent] = []
        
        # Canonical locations for agent/rule/scheduler logic
        self.scan_patterns = {
            ComponentType.AGENT: [
                "agents/", "app/agents/", "apps/api/agents/", 
                "*Agent.ts", "*Agent.py", "*_agent.py", "*_agent.ts"
            ],
            ComponentType.RULE: [
                "rules/", "app/rules/", ".cursor/rules/",
                "*.mdc", "*.rule.yaml", "rule_*.py"
            ],
            ComponentType.SCHEDULER: [
                "schedulers/", "app/schedulers/", 
                "*scheduler.py", "*scheduler.ts", "*_scheduler.py"
            ],
            ComponentType.MANIFEST: [
                "agents.index.mpc.json", "rule_manifest.yaml", 
                "agent_manifest.yaml", "*.manifest.json"
            ]
        }

        # UAP compliance patterns
        self.uap_patterns = {
            "init_signature": r"__init__\(self,\s*agent_id,\s*core_config,\s*plugin_manager",
            "async_setup": r"async\s+def\s+setup\(self\)",
            "process_task": r"async\s+def\s+process_task\(self,\s*task_data:\s*dict\)",
            "teardown": r"async\s+def\s+teardown\(self\)",
            "get_status": r"def\s+get_status\(self\)",
            "load_config": r"def\s+load_config\(self,\s*config_data:\s*dict\)"
        }

        # MDC rule compliance patterns
        self.mdc_patterns = {
            "rule_type_header": r"^#\s*RULE TYPE:",
            "file_patterns_header": r"^#\s*FILE PATTERNS:",
            "description_field": r"description:\s*.+",
            "type_field": r"type:\s*(always|context|trigger)"
        }

    async def discover_all_components(self) -> List[DiscoveredComponent]:
        """
        Phase 1: Project-Wide Discovery & Classification
        
        Recursively scans for agent, rule, and scheduler definitions
        in canonical and non-canonical locations.
        """
        console.print("🔍 [bold blue]Phase 1: Project-Wide Discovery & Classification[/bold blue]")
        
        discovered = []
        
        for component_type, patterns in self.scan_patterns.items():
            console.print(f"   Scanning for {component_type.value}s...")
            components = await self._scan_for_components(component_type, patterns)
            discovered.extend(components)
            
        # Detect orphaned logic
        orphaned = await self._detect_orphaned_logic()
        discovered.extend(orphaned)
        
        self.discovered_components = discovered
        
        console.print(f"   ✅ Discovered {len(discovered)} components")
        return discovered

    async def _scan_for_components(self, component_type: ComponentType, patterns: List[str]) -> List[DiscoveredComponent]:
        """Scan for components matching the given patterns"""
        components = []
        
        for pattern in patterns:
            if "/" in pattern:  # Directory pattern
                dir_path = self.project_root / pattern.rstrip("/")
                if dir_path.exists():
                    for file_path in dir_path.rglob("*"):
                        if file_path.is_file():
                            component = await self._analyze_file(file_path, component_type)
                            if component:
                                components.append(component)
            else:  # File pattern
                for file_path in self.project_root.rglob(pattern):
                    if file_path.is_file():
                        component = await self._analyze_file(file_path, component_type)
                        if component:
                            components.append(component)
        
        return components

    async def _analyze_file(self, file_path: Path, component_type: ComponentType) -> Optional[DiscoveredComponent]:
        """Analyze a single file for component compliance"""
        try:
            content = file_path.read_text(encoding='utf-8')
            relative_path = str(file_path.relative_to(self.project_root))
            
            # Extract component name
            name = file_path.stem
            
            # Determine compliance status
            compliance_status, issues = await self._assess_compliance(content, component_type)
            
            # Check UAP compliance for agents
            uap_compliant = False
            if component_type == ComponentType.AGENT:
                uap_compliant = self._check_uap_compliance(content)
            
            # Check MDC compliance for rules
            mdc_compliant = False
            if component_type == ComponentType.RULE and file_path.suffix == ".mdc":
                mdc_compliant = self._check_mdc_compliance(content)
            
            # Check manifest registration
            manifest_registered = await self._check_manifest_registration(name, component_type)
            
            # Check graduation candidate
            graduation_candidate = await self._is_graduation_candidate(file_path, content, component_type)
            
            return DiscoveredComponent(
                path=relative_path,
                component_type=component_type,
                name=name,
                compliance_status=compliance_status,
                issues=issues,
                uap_compliant=uap_compliant,
                mdc_compliant=mdc_compliant,
                manifest_registered=manifest_registered,
                graduation_candidate=graduation_candidate,
                metadata={
                    "file_size": file_path.stat().st_size,
                    "last_modified": datetime.fromtimestamp(file_path.stat().st_mtime).isoformat(),
                    "extension": file_path.suffix
                }
            )
            
        except Exception as e:
            logger.error(f"Error analyzing file {file_path}: {e}")
            return None

    async def _assess_compliance(self, content: str, component_type: ComponentType) -> Tuple[ComplianceStatus, List[str]]:
        """Assess compliance status of a component"""
        issues = []
        
        if component_type == ComponentType.AGENT:
            # Check for basic agent structure
            if "class" not in content:
                issues.append("No class definition found")
            if "__init__" not in content:
                issues.append("No __init__ method found")
            if "async def" not in content:
                issues.append("No async methods found")
                
        elif component_type == ComponentType.RULE:
            if content.strip().startswith("#"):
                # Likely an MDC rule
                if "RULE TYPE:" not in content:
                    issues.append("Missing RULE TYPE header")
                if "FILE PATTERNS:" not in content:
                    issues.append("Missing FILE PATTERNS header")
            else:
                issues.append("Not in MDC format")
                
        elif component_type == ComponentType.SCHEDULER:
            if "schedule" not in content.lower() and "cron" not in content.lower():
                issues.append("No scheduling logic detected")
        
        # Determine status based on issues
        if len(issues) == 0:
            return ComplianceStatus.CONFORMANT, issues
        elif len(issues) <= 2:
            return ComplianceStatus.PROTOTYPE, issues
        else:
            return ComplianceStatus.NONCONFORMANT, issues

    def _check_uap_compliance(self, content: str) -> bool:
        """Check if an agent follows UAP (Universal Agent Protocol)"""
        required_patterns = 0
        
        for pattern_name, pattern in self.uap_patterns.items():
            if re.search(pattern, content, re.MULTILINE):
                required_patterns += 1
        
        # Require at least 4 out of 6 UAP patterns for compliance
        return required_patterns >= 4

    def _check_mdc_compliance(self, content: str) -> bool:
        """Check if a rule follows MDC format"""
        required_patterns = 0
        
        for pattern_name, pattern in self.mdc_patterns.items():
            if re.search(pattern, content, re.MULTILINE):
                required_patterns += 1
        
        # Require at least 2 out of 4 MDC patterns for compliance
        return required_patterns >= 2

    async def _check_manifest_registration(self, name: str, component_type: ComponentType) -> bool:
        """Check if component is registered in relevant manifests"""
        # This would check actual manifest files when they exist
        # For now, return False to encourage manifest creation
        return False

    async def _is_graduation_candidate(self, file_path: Path, content: str, component_type: ComponentType) -> bool:
        """Determine if a rule is a candidate for graduation to global scope"""
        if component_type != ComponentType.RULE:
            return False
            
        # Check for broad applicability indicators
        broad_applicability_keywords = [
            "universal", "global", "system-wide", "cross-project", 
            "reusable", "foundation", "core", "standard"
        ]
        
        content_lower = content.lower()
        keyword_matches = sum(1 for keyword in broad_applicability_keywords if keyword in content_lower)
        
        # Rules in .cursor/rules are potential graduation candidates
        in_cursor_rules = ".cursor/rules" in str(file_path)
        
        return keyword_matches >= 2 or in_cursor_rules

    async def _detect_orphaned_logic(self) -> List[DiscoveredComponent]:
        """Detect orphaned agent, rule, or scheduler logic not following conventions"""
        orphaned = []
        
        # Look for files with agent-like patterns but not in standard locations
        for file_path in self.project_root.rglob("*.py"):
            if any(pattern in str(file_path) for pattern in ["agents/", "schedulers/"]):
                continue  # Skip already scanned locations
                
            try:
                content = file_path.read_text(encoding='utf-8')
                
                # Check for agent-like patterns
                if (re.search(r"class\s+\w*Agent", content) or 
                    re.search(r"async\s+def\s+process", content)):
                    
                    orphaned.append(DiscoveredComponent(
                        path=str(file_path.relative_to(self.project_root)),
                        component_type=ComponentType.AGENT,
                        name=file_path.stem,
                        compliance_status=ComplianceStatus.ORPHANED,
                        issues=["Agent-like logic found outside standard directories"],
                        metadata={"reason": "orphaned_agent_logic"}
                    ))
                    
            except Exception as e:
                logger.debug(f"Could not read {file_path}: {e}")
        
        return orphaned

    async def analyze_compliance(self) -> Dict[str, Any]:
        """
        Phase 2: Structural & Protocol Compliance Analysis
        
        Evaluates each detected element for UAP/MDC compliance.
        """
        console.print("📊 [bold blue]Phase 2: Structural & Protocol Compliance Analysis[/bold blue]")
        
        analysis = {
            "total_components": len(self.discovered_components),
            "conformant": 0,
            "prototype": 0,
            "nonconformant": 0,
            "orphaned": 0,
            "uap_compliant": 0,
            "mdc_compliant": 0,
            "manifest_registered": 0
        }
        
        for component in self.discovered_components:
            # Count by compliance status
            if component.compliance_status == ComplianceStatus.CONFORMANT:
                analysis["conformant"] += 1
            elif component.compliance_status == ComplianceStatus.PROTOTYPE:
                analysis["prototype"] += 1
            elif component.compliance_status == ComplianceStatus.NONCONFORMANT:
                analysis["nonconformant"] += 1
            elif component.compliance_status == ComplianceStatus.ORPHANED:
                analysis["orphaned"] += 1
            
            # Count specific compliance types
            if component.uap_compliant:
                analysis["uap_compliant"] += 1
            if component.mdc_compliant:
                analysis["mdc_compliant"] += 1
            if component.manifest_registered:
                analysis["manifest_registered"] += 1
        
        console.print(f"   📈 Analysis complete: {analysis}")
        return analysis

    async def generate_uap_refactoring_suggestions(self) -> List[Dict[str, Any]]:
        """
        Phase 3: Automated UAP Refactoring & Suggestions
        
        For each non-compliant agent, generates UAP-compliant rewrite suggestions.
        """
        console.print("🔧 [bold blue]Phase 3: Automated UAP Refactoring & Suggestions[/bold blue]")
        
        suggestions = []
        
        for component in self.discovered_components:
            if (component.component_type == ComponentType.AGENT and 
                not component.uap_compliant):
                
                suggestion = await self._generate_uap_suggestion(component)
                suggestions.append(suggestion)
        
        console.print(f"   💡 Generated {len(suggestions)} UAP refactoring suggestions")
        return suggestions

    async def _generate_uap_suggestion(self, component: DiscoveredComponent) -> Dict[str, Any]:
        """Generate a UAP-compliant rewrite suggestion for an agent"""
        
        uap_template = '''"""
VANTA Agent: {{name}}
Refactored to comply with Universal Agent Protocol (UAP)
"""

import asyncio
import logging
from typing import Dict, Any, Optional

logger = logging.getLogger(__name__)

class {{name}}:
    """
    {{name}} - UAP Compliant Agent
    
    Implements the Universal Agent Protocol as defined in 101-vanta-agent-contract.mdc
    """
    
    def __init__(self, agent_id: str, core_config: Dict[str, Any], plugin_manager: Any, **kwargs):
        """
        Standard UAP initialization signature
        
        Args:
            agent_id: Unique identifier for this agent instance
            core_config: Core configuration dictionary
            plugin_manager: Plugin manager instance
            **kwargs: Additional initialization parameters
        """
        self.agent_id = agent_id
        self.core_config = core_config
        self.plugin_manager = plugin_manager
        self.status = "initialized"
        
        # Initialize agent-specific state
        self._setup_logging()
    
    def _setup_logging(self):
        """Setup logging according to VANTA standards"""
        self.logger = logging.getLogger(f"vanta.agents.{{self.agent_id}}")
    
    async def setup(self) -> None:
        """
        One-time asynchronous setup tasks
        
        Performs resource acquisition, connection establishment, etc.
        """
        try:
            self.logger.info(f"Setting up agent {{self.agent_id}}")
            
            # Initialize project scanning capabilities
            self.project_root = Path(self.core_config.get("project_root", "."))
            
            # Set up component discovery patterns
            self.component_patterns = self.core_config.get("component_patterns", {
                "agents": ["**/agents/**/*.py", "**/*agent*.py"],
                "rules": ["**/.cursor/rules/**/*.mdc", "**/rules/**/*.md"],
                "schedulers": ["**/schedulers/**/*.py", "**/*scheduler*.py"]
            })
            
            # Initialize compliance checkers
            self.compliance_thresholds = self.core_config.get("compliance_thresholds", {
                "uap_compliance_min": 0.8,
                "mdc_compliance_min": 0.7,
                "graduation_threshold": 0.9
            })
            
            self.status = "ready"
            self.logger.info(f"Agent {{self.agent_id}} setup complete")
        except Exception as e:
            self.logger.error(f"Setup failed for agent {{self.agent_id}}: {{e}}")
            self.status = "error"
            raise
    
    async def process_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """
        Primary method for handling incoming tasks
        
        Args:
            task_data: Task data dictionary with validated structure
            
        Returns:
            Structured response dictionary with status, output, and any error messages
        """
        try:
            self.logger.info(f"Processing task for agent {{self.agent_id}}")
            
            # Extract task type and parameters
            task_type = task_data.get("task_type", "scan")
            params = task_data.get("parameters", {})
            
            # Route to appropriate handler based on task type
            if task_type == "full_scan":
                result = await self.run_full_standardization()
                output = self._convert_report_to_serializable(result)
            elif task_type == "discover_components":
                components = await self.discover_all_components()
                output = {"components": [self._component_to_dict(c) for c in components]}
            elif task_type == "analyze_compliance":
                analysis = await self.analyze_compliance()
                output = analysis
            elif task_type == "generate_manifests":
                manifests = await self.standardize_manifests()
                output = {"manifests": manifests}
            elif task_type == "identify_graduates":
                candidates = await self.identify_graduation_candidates()
                output = {"graduation_candidates": [self._component_to_dict(c) for c in candidates]}
            else:
                raise ValueError(f"Unknown task type: {{task_type}}")
            
            return {{
                "status": "success",
                "output": output,
                "agent_id": self.agent_id,
                "timestamp": datetime.now().isoformat()
            }}
            
        except Exception as e:
            self.logger.error(f"Task processing failed for agent {{self.agent_id}}: {{e}}")
            return {{
                "status": "error",
                "output": {{}},
                "error_message": str(e),
                "agent_id": self.agent_id
            }}
    
    async def teardown(self) -> None:
        """
        Graceful shutdown and resource cleanup
        """
        try:
            self.logger.info(f"Tearing down agent {{self.agent_id}}")
            
            # Clean up any cached data
            if hasattr(self, 'discovered_components'):
                self.discovered_components.clear()
            
            # Reset status tracking
            self.status = "shutdown"
            
            # Log final statistics
            self.logger.info(f"Agent {{self.agent_id}} processed components and is shutting down")
            self.logger.info(f"Agent {{self.agent_id}} teardown complete")
        except Exception as e:
            self.logger.error(f"Teardown failed for agent {{self.agent_id}}: {{e}}")
    
    def get_status(self) -> Dict[str, Any]:
        """
        Report agent health and current status
        
        Returns:
            Status dictionary with current state information
        """
        return {{
            "agent_id": self.agent_id,
            "status": self.status,
            "timestamp": "2024-01-01T00:00:00Z"
        }}
    
    def load_config(self, config_data: Dict[str, Any]) -> None:
        """
        Dynamic configuration updates
        
        Args:
            config_data: New configuration data to apply
        """
        try:
            self.logger.info(f"Loading new config for agent {{self.agent_id}}")
            
            # Validate configuration structure
            allowed_keys = {"project_root", "component_patterns", "compliance_thresholds", "debug_mode"}
            invalid_keys = set(config_data.keys()) - allowed_keys
            if invalid_keys:
                self.logger.warning(f"Ignoring invalid config keys: {{invalid_keys}}")
                config_data = {k: v for k, v in config_data.items() if k in allowed_keys}
            
            # Update configuration with validation
            old_config = self.core_config.copy()
            self.core_config.update(config_data)
            
            # Reinitialize components if paths changed
            if "project_root" in config_data:
                self.project_root = Path(config_data["project_root"])
                
            # Log configuration changes
            changed_keys = [k for k in config_data.keys() if old_config.get(k) != config_data[k]]
            self.logger.info(f"Updated config keys: {{changed_keys}}")
            self.logger.info(f"Config loaded successfully for agent {{self.agent_id}}")
        except Exception as e:
            self.logger.error(f"Config loading failed for agent {{self.agent_id}}: {{e}}")
            raise
'''

        return {
            "component": component,
            "suggestion_type": "uap_rewrite",
            "original_path": component.path,
            "suggested_rewrite": uap_template.format(name=component.name),
            "changes_required": component.issues,
            "compliance_improvements": [
                "Standardized UAP initialization signature",
                "Async setup/teardown methods",
                "Structured task processing with error handling",
                "Status reporting mechanism",
                "Dynamic configuration loading",
                "VANTA-compliant logging"
            ]
        }

    async def identify_graduation_candidates(self) -> List[DiscoveredComponent]:
        """
        Phase 4: Rule Graduation & Globalization
        
        Analyzes rules for promotion to global scope and recommends manifest updates.
        """
        console.print("🎓 [bold blue]Phase 4: Rule Graduation & Globalization[/bold blue]")
        
        candidates = [c for c in self.discovered_components if c.graduation_candidate]
        
        console.print(f"   🎯 Identified {len(candidates)} graduation candidates")
        
        for candidate in candidates:
            console.print(f"      • {candidate.name} ({candidate.path})")
        
        return candidates

    async def standardize_manifests(self) -> Dict[str, Any]:
        """
        Phase 5: Scheduler & Manifest Standardization
        
        Proposes manifest updates and scheduler refactoring.
        """
        console.print("📋 [bold blue]Phase 5: Scheduler & Manifest Standardization[/bold blue]")
        
        manifest_updates = {
            "agent_manifest.yaml": await self._generate_agent_manifest(),
            "rule_manifest.yaml": await self._generate_rule_manifest(),
            "scheduler_manifest.yaml": await self._generate_scheduler_manifest()
        }
        
        console.print("   📝 Generated standardized manifests")
        return manifest_updates

    async def _generate_agent_manifest(self) -> Dict[str, Any]:
        """Generate standardized agent manifest"""
        agents = [c for c in self.discovered_components if c.component_type == ComponentType.AGENT]
        
        manifest = {
            "version": "1.0.0",
            "generated_at": datetime.now().isoformat(),
            "agents": {}
        }
        
        for agent in agents:
            manifest["agents"][agent.name] = {
                "path": agent.path,
                "type": "agent",
                "uap_compliant": agent.uap_compliant,
                "status": agent.compliance_status.value,
                "issues": agent.issues,
                "metadata": agent.metadata
            }
        
        return manifest

    async def _generate_rule_manifest(self) -> Dict[str, Any]:
        """Generate standardized rule manifest"""
        rules = [c for c in self.discovered_components if c.component_type == ComponentType.RULE]
        
        manifest = {
            "version": "1.0.0",
            "generated_at": datetime.now().isoformat(),
            "rules": {}
        }
        
        for rule in rules:
            manifest["rules"][rule.name] = {
                "path": rule.path,
                "type": "rule",
                "mdc_compliant": rule.mdc_compliant,
                "graduation_candidate": rule.graduation_candidate,
                "status": rule.compliance_status.value,
                "issues": rule.issues,
                "metadata": rule.metadata
            }
        
        return manifest

    async def _generate_scheduler_manifest(self) -> Dict[str, Any]:
        """Generate standardized scheduler manifest"""
        schedulers = [c for c in self.discovered_components if c.component_type == ComponentType.SCHEDULER]
        
        manifest = {
            "version": "1.0.0",
            "generated_at": datetime.now().isoformat(),
            "schedulers": {}
        }
        
        for scheduler in schedulers:
            manifest["schedulers"][scheduler.name] = {
                "path": scheduler.path,
                "type": "scheduler",
                "status": scheduler.compliance_status.value,
                "issues": scheduler.issues,
                "metadata": scheduler.metadata
            }
        
        return manifest

    async def generate_standardization_report(self) -> StandardizationReport:
        """Generate comprehensive standardization report"""
        console.print("📊 [bold blue]Generating Comprehensive Standardization Report[/bold blue]")
        
        # Generate all analysis data
        compliance_analysis = await self.analyze_compliance()
        uap_suggestions = await self.generate_uap_refactoring_suggestions()
        graduation_candidates = await self.identify_graduation_candidates()
        manifest_updates = await self.standardize_manifests()
        
        # Generate recommendations
        recommendations = self._generate_recommendations(compliance_analysis, uap_suggestions)
        
        report = StandardizationReport(
            discovered_components=self.discovered_components,
            uap_violations=[s["component"].path for s in uap_suggestions],
            graduation_candidates=graduation_candidates,
            manifest_updates=manifest_updates,
            recommendations=recommendations
        )
        
        return report

    def _component_to_dict(self, component: DiscoveredComponent) -> Dict[str, Any]:
        """Convert a DiscoveredComponent to a serializable dictionary"""
        return {
            "path": component.path,
            "component_type": component.component_type.value,
            "name": component.name,
            "compliance_status": component.compliance_status.value,
            "issues": component.issues,
            "uap_compliant": component.uap_compliant,
            "mdc_compliant": component.mdc_compliant,
            "manifest_registered": component.manifest_registered,
            "graduation_candidate": component.graduation_candidate,
            "metadata": component.metadata
        }

    def _convert_report_to_serializable(self, report: StandardizationReport) -> Dict[str, Any]:
        """Convert report to JSON-serializable format"""
        def convert_component(component: DiscoveredComponent) -> Dict[str, Any]:
            return {
                "path": component.path,
                "component_type": component.component_type.value,
                "name": component.name,
                "compliance_status": component.compliance_status.value,
                "issues": component.issues,
                "uap_compliant": component.uap_compliant,
                "mdc_compliant": component.mdc_compliant,
                "manifest_registered": component.manifest_registered,
                "graduation_candidate": component.graduation_candidate,
                "metadata": component.metadata
            }
        
        return {
            "discovered_components": [convert_component(c) for c in report.discovered_components],
            "uap_violations": report.uap_violations,
            "graduation_candidates": [convert_component(c) for c in report.graduation_candidates],
            "manifest_updates": report.manifest_updates,
            "recommendations": report.recommendations,
            "timestamp": report.timestamp
        }

    def _generate_recommendations(self, compliance_analysis: Dict[str, Any], uap_suggestions: List[Dict[str, Any]]) -> List[str]:
        """Generate actionable recommendations based on analysis"""
        recommendations = []
        
        # UAP compliance recommendations
        if compliance_analysis["uap_compliant"] < compliance_analysis["total_components"]:
            recommendations.append(
                f"🔧 Refactor {len(uap_suggestions)} agents to UAP compliance for improved interoperability"
            )
        
        # Manifest recommendations
        if compliance_analysis["manifest_registered"] == 0:
            recommendations.append(
                "📋 Create agent and rule manifests for improved discoverability"
            )
        
        # Orphaned component recommendations
        if compliance_analysis["orphaned"] > 0:
            recommendations.append(
                f"📁 Relocate {compliance_analysis['orphaned']} orphaned components to standard directories"
            )
        
        # Rule graduation recommendations
        graduation_count = len([c for c in self.discovered_components if c.graduation_candidate])
        if graduation_count > 0:
            recommendations.append(
                f"🎓 Consider promoting {graduation_count} rules to global scope in globalrules.md"
            )
        
        return recommendations

    def display_report(self, report: StandardizationReport) -> None:
        """Display comprehensive report using Rich formatting"""
        
        # Title panel
        console.print(Panel.fit(
            "🧭 VANTA Agentic Standardization Report",
            style="bold blue"
        ))
        
        # Summary statistics
        summary_table = Table(title="📊 Discovery Summary")
        summary_table.add_column("Component Type", style="cyan")
        summary_table.add_column("Count", justify="right")
        summary_table.add_column("Conformant", justify="right", style="green")
        summary_table.add_column("Non-Conformant", justify="right", style="red")
        
        # Count by type
        type_counts = {}
        for component in report.discovered_components:
            comp_type = component.component_type.value
            if comp_type not in type_counts:
                type_counts[comp_type] = {"total": 0, "conformant": 0}
            
            type_counts[comp_type]["total"] += 1
            if component.compliance_status == ComplianceStatus.CONFORMANT:
                type_counts[comp_type]["conformant"] += 1
        
        for comp_type, counts in type_counts.items():
            non_conformant = counts["total"] - counts["conformant"]
            summary_table.add_row(
                comp_type.capitalize(),
                str(counts["total"]),
                str(counts["conformant"]),
                str(non_conformant)
            )
        
        console.print(summary_table)
        
        # Compliance details
        if report.uap_violations:
            console.print("\n⚠️  [bold red]UAP Compliance Issues:[/bold red]")
            for violation in report.uap_violations:
                console.print(f"   • {violation}")
        
        # Graduation candidates
        if report.graduation_candidates:
            console.print("\n🎓 [bold yellow]Rule Graduation Candidates:[/bold yellow]")
            for candidate in report.graduation_candidates:
                console.print(f"   • {candidate.name} ({candidate.path})")
        
        # Recommendations
        if report.recommendations:
            console.print("\n💡 [bold green]Recommendations:[/bold green]")
            for rec in report.recommendations:
                console.print(f"   {rec}")

    async def run_full_standardization(self) -> StandardizationReport:
        """Run the complete standardization process"""
        console.print(Panel.fit(
            "🧭 VANTA Agentic Standardization & Rule Graduation",
            subtitle="Universal Agent Protocol (UAP) Compliance Analysis",
            style="bold blue"
        ))
        
        # Phase 1: Discovery
        await self.discover_all_components()
        
        # Phase 2: Compliance Analysis  
        await self.analyze_compliance()
        
        # Generate comprehensive report
        report = await self.generate_standardization_report()
        
        # Display results
        self.display_report(report)
        
        # Phase 6: CoE Delegation for complex actions
        coe_actions = await self.suggest_complex_standardization_actions(report)
        if coe_actions["coe_proposals"]:
            await self.trigger_coe_review(coe_actions["coe_proposals"])
        
        return report

    async def suggest_complex_standardization_actions(self, report: StandardizationReport) -> Dict[str, Any]:
        """
        Implement CoE delegation for complex standardization actions
        
        Following 1015-coding_agent-coe_delegation rule: For complex actions like
        rule graduation and UAP refactoring, trigger CoE instead of direct implementation.
        """
        
        # Package complex actions for CoE review
        coe_proposals = []
        
        # High-impact rule graduation proposals
        if len(report.graduation_candidates) > 10:
            coe_proposals.append({
                "type": "rule_graduation",
                "context": {
                    "candidates_count": len(report.graduation_candidates),
                    "scope": "global_rules_layer",
                    "impact_level": "high"
                },
                "proposal": {
                    "action": "graduate_rules_to_global_scope",
                    "candidates": [c.path for c in report.graduation_candidates[:10]],
                    "rationale": "Cross-project applicability and broad system impact"
                },
                "requester_agent": "vanta_standardization_agent"
            })
        
        # Large-scale UAP refactoring proposals
        if len(report.uap_violations) > 20:
            coe_proposals.append({
                "type": "uap_refactoring",
                "context": {
                    "violations_count": len(report.uap_violations),
                    "scope": "codebase_wide",
                    "impact_level": "high"
                },
                "proposal": {
                    "action": "mass_uap_refactoring",
                    "affected_agents": report.uap_violations[:20],
                    "rationale": "Standardize agent architecture for improved interoperability"
                },
                "requester_agent": "vanta_standardization_agent"
            })
        
        # Manifest restructuring proposals
        if len(report.discovered_components) > 200:
            coe_proposals.append({
                "type": "manifest_restructuring",
                "context": {
                    "components_count": len(report.discovered_components),
                    "scope": "project_wide",
                    "impact_level": "medium"
                },
                "proposal": {
                    "action": "implement_manifest_system",
                    "components_affected": "all_discovered_components",
                    "rationale": "Improve discoverability and maintenance"
                },
                "requester_agent": "vanta_standardization_agent"
            })
        
        return {
            "coe_proposals": coe_proposals,
            "delegation_reason": "Complex, high-impact standardization actions require collaborative review",
            "next_steps": [
                "Submit proposals to Coalition of Experts",
                "Await validation and approval",
                "Implement approved changes in phases"
            ]
        }

    async def trigger_coe_review(self, proposals: List[Dict[str, Any]]) -> None:
        """
        Trigger CoE review process following 1016-coding_agent-coe_invocation
        
        Note: In a real implementation, this would interface with an orchestrator
        or event bus system. For now, we'll log the proposals.
        """
        console.print("🏛️  [bold yellow]Triggering Coalition of Experts Review[/bold yellow]")
        
        for i, proposal in enumerate(proposals, 1):
            console.print(f"   📋 Proposal {i}: {proposal['type']}")
            console.print(f"      Impact: {proposal['context']['impact_level']}")
            console.print(f"      Scope: {proposal['context']['scope']}")
            
        console.print(f"   ⚡ {len(proposals)} proposals submitted for expert review")
        console.print("   ⏳ Awaiting CoE validation before implementation")
        
        # In real implementation:
        # self.orchestrator.trigger_coe(proposals)
        # or
        # self.event_bus.publish("coe_review_request", proposals)

# CLI Interface
app = typer.Typer(
    name="vanta-standardization",
    help="VANTA Agentic Standardization & Rule Graduation Tool"
)

@app.command()
def scan(
    project_path: str = typer.Option(".", help="Path to project root"),
    output_file: Optional[str] = typer.Option(None, help="Output report to file"),
    format: str = typer.Option("json", help="Output format: json, yaml, or console")
):
    """Run full standardization scan and analysis"""
    
    async def run_scan():
        agent = VantaStandardizationAgent(project_path)
        report = await agent.run_full_standardization()
        
        if output_file:
            serializable_report = agent._convert_report_to_serializable(report)
            if format == "json":
                with open(output_file, 'w') as f:
                    json.dump(serializable_report, f, indent=2)
            elif format == "yaml":
                with open(output_file, 'w') as f:
                    yaml.dump(serializable_report, f, default_flow_style=False)
            
            console.print(f"📄 Report saved to {output_file}")
    
    asyncio.run(run_scan())

@app.command()
def create_manifests(
    project_path: str = typer.Option(".", help="Path to project root")
):
    """Create standardized manifest files"""
    
    async def run_create():
        agent = VantaStandardizationAgent(project_path)
        await agent.discover_all_components()
        manifests = await agent.standardize_manifests()
        
        for filename, content in manifests.items():
            output_path = Path(project_path) / filename
            with open(output_path, 'w') as f:
                yaml.dump(content, f, default_flow_style=False)
            console.print(f"📋 Created {filename}")
    
    asyncio.run(run_create())

@app.command()
def create_globalrules(
    project_path: str = typer.Option(".", help="Path to project root")
):
    """Create globalrules.md with graduation candidates"""
    
    async def run_globalrules():
        agent = VantaStandardizationAgent(project_path)
        await agent.discover_all_components()
        candidates = await agent.identify_graduation_candidates()
        
        globalrules_content = '''# Global Rules Layer

This file contains rules that have been graduated from local `.cursor/rules/` 
to global scope due to their broad applicability and system-wide importance.

## Graduated Rules

'''
        
        for candidate in candidates:
            globalrules_content += f'''
### {candidate.name}

**Source:** `{candidate.path}`  
**Type:** {candidate.component_type.value}  
**Reason for Graduation:** Broad applicability, cross-project relevance

```
# Rule content will be populated from source file during graduation process
```

'''
        
        output_path = Path(project_path) / "globalrules.md"
        with open(output_path, 'w') as f:
            f.write(globalrules_content)
        
        console.print(f"🎓 Created globalrules.md with {len(candidates)} graduation candidates")
    
    asyncio.run(run_globalrules())

if __name__ == "__main__":
    app() 