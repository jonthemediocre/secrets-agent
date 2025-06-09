#!/usr/bin/env python3
"""
🔍 CLI to Web Interface Coverage Audit
======================================

Comprehensive audit to determine if all CLI functions are properly 
represented in the web interface dashboard.

Author: Secrets Agent AI
Version: 1.0.0
"""

import os
import re
import ast
import json
import yaml
from pathlib import Path
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class CLIFunction:
    """Represents a CLI function"""
    name: str
    module: str
    description: str
    parameters: List[str]
    category: str  # 'scan', 'secrets', 'vault', 'mcp', 'domino', 'admin'
    web_equivalent: Optional[str] = None
    is_represented: bool = False
    representation_type: str = "none"  # 'button', 'api', 'form', 'dashboard'
    notes: str = ""

@dataclass
class WebComponent:
    """Represents a web interface component"""
    name: str
    file: str
    type: str  # 'button', 'form', 'api_route', 'dashboard'
    functionality: str
    cli_equivalent: Optional[str] = None

class CLIWebInterfaceAuditor:
    """Audits CLI to Web Interface coverage"""
    
    def __init__(self, root_path: str = "."):
        self.root_path = Path(root_path)
        self.cli_functions: List[CLIFunction] = []
        self.web_components: List[WebComponent] = []
        self.coverage_report: Dict[str, Any] = {}
        
    def discover_cli_functions(self) -> List[CLIFunction]:
        """Discover all CLI functions from Python files"""
        print("🔍 Discovering CLI functions...")
        
        # Main CLI files to analyze
        cli_files = [
            "cli.py",
            "cli_enhanced.py",
            "secrets_agent_launch_wizard.py",
            "vault_api_server.py",
            "vault_api_server_admin.py", 
            "vault_api_server_simple.py"
        ]
        
        for cli_file in cli_files:
            file_path = self.root_path / cli_file
            if file_path.exists():
                self._analyze_cli_file(file_path)
        
        # Additional CLI scripts
        scripts_dir = self.root_path / "scripts"
        if scripts_dir.exists():
            for script_file in scripts_dir.glob("*.py"):
                self._analyze_cli_file(script_file)
                
        return self.cli_functions
    
    def _analyze_cli_file(self, file_path: Path) -> None:
        """Analyze a single CLI file for functions"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Parse CLI functions
            if "click.command" in content or "argparse" in content:
                self._parse_click_commands(content, file_path.name)
            
            # Parse regular Python functions that might be CLI
            if "def cmd_" in content:
                self._parse_cmd_functions(content, file_path.name)
                
        except Exception as e:
            print(f"⚠️ Error analyzing {file_path}: {e}")
    
    def _parse_click_commands(self, content: str, module: str) -> None:
        """Parse Click CLI commands"""
        # Find @cli.command() patterns
        command_pattern = r'@(?:cli|mcp|domino)\.command\(\s*(?:"([^"]*)"|\))\s*\n(?:[^@\n]*\n)*?def\s+(\w+)\s*\([^)]*\):'
        
        matches = re.findall(command_pattern, content, re.MULTILINE)
        for cmd_name, func_name in matches:
            if not cmd_name:
                cmd_name = func_name
                
            # Extract description from docstring
            func_pattern = rf'def\s+{re.escape(func_name)}\s*\([^)]*\):\s*\n\s*"""([^"]*?)"""'
            desc_match = re.search(func_pattern, content, re.MULTILINE)
            description = desc_match.group(1).strip() if desc_match else f"CLI command: {cmd_name}"
            
            # Determine category
            category = self._categorize_command(cmd_name, description)
            
            # Extract parameters
            params = self._extract_click_params(content, func_name)
            
            self.cli_functions.append(CLIFunction(
                name=cmd_name,
                module=module,
                description=description,
                parameters=params,
                category=category
            ))
    
    def _parse_cmd_functions(self, content: str, module: str) -> None:
        """Parse cmd_ prefixed functions"""
        cmd_pattern = r'def\s+(cmd_\w+)\s*\([^)]*\):'
        
        matches = re.findall(cmd_pattern, content)
        for func_name in matches:
            cmd_name = func_name.replace('cmd_', '')
            
            # Extract description from docstring or comments
            func_pattern = rf'def\s+{re.escape(func_name)}\s*\([^)]*\):\s*\n(?:\s*"""([^"]*?)""")?\s*\n'
            desc_match = re.search(func_pattern, content, re.MULTILINE)
            description = desc_match.group(1).strip() if desc_match and desc_match.group(1) else f"Command: {cmd_name}"
            
            category = self._categorize_command(cmd_name, description)
            
            self.cli_functions.append(CLIFunction(
                name=cmd_name,
                module=module,
                description=description,
                parameters=[],
                category=category
            ))
    
    def _extract_click_params(self, content: str, func_name: str) -> List[str]:
        """Extract Click parameters for a function"""
        # Look for @click.option patterns before the function
        func_start = content.find(f"def {func_name}")
        if func_start == -1:
            return []
            
        # Find the section before the function definition
        section = content[:func_start]
        lines = section.split('\n')
        
        params = []
        for line in reversed(lines):
            if '@click.option' in line:
                # Extract parameter name
                param_match = re.search(r"--(\w+)", line)
                if param_match:
                    params.append(param_match.group(1))
            elif '@cli.command' in line or '@mcp.command' in line or '@domino.command' in line:
                break
                
        return list(reversed(params))
    
    def _categorize_command(self, cmd_name: str, description: str) -> str:
        """Categorize CLI command by name and description"""
        cmd_lower = cmd_name.lower()
        desc_lower = description.lower()
        
        if any(word in cmd_lower for word in ['scan', 'detect', 'search', 'find']):
            return 'scan'
        elif any(word in cmd_lower for word in ['secret', 'vault', 'rotate', 'export', 'encrypt']):
            return 'secrets'
        elif any(word in cmd_lower for word in ['mcp', 'tool', 'server']):
            return 'mcp'
        elif any(word in cmd_lower for word in ['domino', 'audit', 'governance']):
            return 'domino'
        elif any(word in cmd_lower for word in ['bootstrap', 'sync', 'link', 'setup', 'config']):
            return 'admin'
        else:
            return 'utility'
    
    def discover_web_components(self) -> List[WebComponent]:
        """Discover web interface components"""
        print("🌐 Discovering web interface components...")
        
        # Web interface files to analyze
        web_dirs = ["app", "components", "pages"]
        
        for web_dir in web_dirs:
            dir_path = self.root_path / web_dir
            if dir_path.exists():
                self._analyze_web_directory(dir_path)
                
        return self.web_components
    
    def _analyze_web_directory(self, dir_path: Path) -> None:
        """Analyze web directory for components"""
        for file_path in dir_path.rglob("*.tsx"):
            self._analyze_web_file(file_path)
        for file_path in dir_path.rglob("*.ts"):
            if "/api/" in str(file_path):
                self._analyze_api_file(file_path)
    
    def _analyze_web_file(self, file_path: Path) -> None:
        """Analyze a web component file"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find buttons and form handlers
            self._find_buttons(content, file_path)
            self._find_forms(content, file_path)
            self._find_dashboards(content, file_path)
            
        except Exception as e:
            print(f"⚠️ Error analyzing {file_path}: {e}")
    
    def _analyze_api_file(self, file_path: Path) -> None:
        """Analyze API route files"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
                
            # Find API handlers
            self._find_api_routes(content, file_path)
            
        except Exception as e:
            print(f"⚠️ Error analyzing {file_path}: {e}")
    
    def _find_buttons(self, content: str, file_path: Path) -> None:
        """Find button components and their handlers"""
        # Look for onClick handlers and button text
        button_patterns = [
            r'onClick=\{[^}]*(\w+)[^}]*\}[^>]*>([^<]+)',
            r'<button[^>]*onClick=\{[^}]*(\w+)[^}]*\}[^>]*>([^<]+)',
            r'handleDeepScan|handleExportEnv|handleRotateSecrets|handleConfigureVault'
        ]
        
        for pattern in button_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for match in matches:
                if isinstance(match, tuple) and len(match) >= 2:
                    handler, text = match[0], match[1]
                    self.web_components.append(WebComponent(
                        name=handler,
                        file=str(file_path.relative_to(self.root_path)),
                        type='button',
                        functionality=text.strip()
                    ))
    
    def _find_forms(self, content: str, file_path: Path) -> None:
        """Find form components"""
        # Look for form submissions and inputs
        if '<form' in content or 'onSubmit' in content:
            self.web_components.append(WebComponent(
                name="form_component",
                file=str(file_path.relative_to(self.root_path)),
                type='form',
                functionality="Form-based input"
            ))
    
    def _find_dashboards(self, content: str, file_path: Path) -> None:
        """Find dashboard components"""
        if any(word in content for word in ['Dashboard', 'Monitor', 'Analytics', 'Overview']):
            dashboard_name = file_path.stem
            self.web_components.append(WebComponent(
                name=dashboard_name,
                file=str(file_path.relative_to(self.root_path)),
                type='dashboard',
                functionality=f"Dashboard component: {dashboard_name}"
            ))
    
    def _find_api_routes(self, content: str, file_path: Path) -> None:
        """Find API route handlers"""
        # Look for HTTP method handlers
        route_patterns = [
            r'export\s+async\s+function\s+(GET|POST|PUT|DELETE)',
            r'app\.(get|post|put|delete)\s*\(',
            r'router\.(get|post|put|delete)\s*\('
        ]
        
        for pattern in route_patterns:
            matches = re.findall(pattern, content, re.IGNORECASE)
            for method in matches:
                if isinstance(method, tuple):
                    method = method[0]
                self.web_components.append(WebComponent(
                    name=f"{method}_{file_path.stem}",
                    file=str(file_path.relative_to(self.root_path)),
                    type='api_route',
                    functionality=f"API {method} endpoint"
                ))
    
    def map_cli_to_web(self) -> None:
        """Map CLI functions to web components"""
        print("🔗 Mapping CLI functions to web interface...")
        
        # Define mapping rules
        mapping_rules = {
            'scan': ['scan', 'deep', 'detect', 'search'],
            'export': ['export', 'download'],
            'rotate': ['rotate', 'refresh'],
            'vault': ['vault', 'secret'],
            'status': ['status', 'health', 'monitor'],
            'bootstrap': ['bootstrap', 'setup', 'init'],
            'mcp': ['mcp', 'tool'],
            'domino': ['domino', 'audit', 'governance']
        }
        
        for cli_func in self.cli_functions:
            cli_name_lower = cli_func.name.lower()
            
            # Check for direct matches in web components
            for web_comp in self.web_components:
                web_name_lower = web_comp.name.lower()
                web_func_lower = web_comp.functionality.lower()
                
                # Direct name match
                if cli_name_lower in web_name_lower or cli_name_lower in web_func_lower:
                    cli_func.web_equivalent = web_comp.name
                    cli_func.is_represented = True
                    cli_func.representation_type = web_comp.type
                    web_comp.cli_equivalent = cli_func.name
                    continue
                
                # Keyword-based matching
                for keyword_group, keywords in mapping_rules.items():
                    if any(kw in cli_name_lower for kw in keywords):
                        if any(kw in web_name_lower or kw in web_func_lower for kw in keywords):
                            cli_func.web_equivalent = web_comp.name
                            cli_func.is_represented = True
                            cli_func.representation_type = web_comp.type
                            web_comp.cli_equivalent = cli_func.name
                            break
    
    def generate_coverage_report(self) -> Dict[str, Any]:
        """Generate comprehensive coverage report"""
        print("📊 Generating coverage report...")
        
        total_cli = len(self.cli_functions)
        represented_cli = sum(1 for f in self.cli_functions if f.is_represented)
        coverage_percentage = (represented_cli / total_cli * 100) if total_cli > 0 else 0
        
        # Group by category
        by_category = {}
        for cli_func in self.cli_functions:
            category = cli_func.category
            if category not in by_category:
                by_category[category] = {
                    'total': 0,
                    'represented': 0,
                    'functions': []
                }
            by_category[category]['total'] += 1
            if cli_func.is_represented:
                by_category[category]['represented'] += 1
            by_category[category]['functions'].append(asdict(cli_func))
        
        # Calculate category coverage
        for category, data in by_category.items():
            data['coverage_percentage'] = (data['represented'] / data['total'] * 100) if data['total'] > 0 else 0
        
        # Missing functions
        missing_functions = [f for f in self.cli_functions if not f.is_represented]
        
        self.coverage_report = {
            'summary': {
                'total_cli_functions': total_cli,
                'represented_functions': represented_cli,
                'missing_functions': len(missing_functions),
                'overall_coverage_percentage': coverage_percentage,
                'audit_timestamp': datetime.now().isoformat()
            },
            'by_category': by_category,
            'missing_functions': [asdict(f) for f in missing_functions],
            'web_components': [asdict(c) for c in self.web_components],
            'recommendations': self._generate_recommendations()
        }
        
        return self.coverage_report
    
    def _generate_recommendations(self) -> List[str]:
        """Generate recommendations for improving coverage"""
        recommendations = []
        
        missing_by_category = {}
        for cli_func in self.cli_functions:
            if not cli_func.is_represented:
                category = cli_func.category
                if category not in missing_by_category:
                    missing_by_category[category] = []
                missing_by_category[category].append(cli_func.name)
        
        for category, missing in missing_by_category.items():
            if len(missing) > 0:
                recommendations.append(f"Add {category} interface components for: {', '.join(missing)}")
        
        # Specific recommendations
        if any(f.name in ['mcp', 'tool', 'server'] for f in self.cli_functions if not f.is_represented):
            recommendations.append("Create MCP tools management interface with server status and tool execution")
        
        if any(f.name in ['domino', 'audit', 'governance'] for f in self.cli_functions if not f.is_represented):
            recommendations.append("Implement governance dashboard with audit trail and approval workflows")
        
        if any(f.name in ['bootstrap', 'sync', 'setup'] for f in self.cli_functions if not f.is_represented):
            recommendations.append("Add setup wizard and configuration management interface")
        
        return recommendations
    
    def save_report(self, filename: str = None) -> str:
        """Save the coverage report to file"""
        if filename is None:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = f"cli_web_coverage_report_{timestamp}.json"
        
        report_path = self.root_path / filename
        with open(report_path, 'w', encoding='utf-8') as f:
            json.dump(self.coverage_report, f, indent=2, ensure_ascii=False)
        
        print(f"📄 Coverage report saved to: {report_path}")
        return str(report_path)
    
    def print_summary(self) -> None:
        """Print audit summary to console"""
        if not self.coverage_report:
            return
            
        summary = self.coverage_report['summary']
        
        print("\n" + "="*80)
        print("🔍 CLI TO WEB INTERFACE COVERAGE AUDIT RESULTS")
        print("="*80)
        
        print(f"\n📊 OVERALL COVERAGE:")
        print(f"   Total CLI Functions: {summary['total_cli_functions']}")
        print(f"   Represented in Web:  {summary['represented_functions']}")
        print(f"   Missing from Web:    {summary['missing_functions']}")
        print(f"   Coverage Percentage: {summary['overall_coverage_percentage']:.1f}%")
        
        print(f"\n📋 COVERAGE BY CATEGORY:")
        for category, data in self.coverage_report['by_category'].items():
            print(f"   {category.upper()}: {data['represented']}/{data['total']} ({data['coverage_percentage']:.1f}%)")
        
        print(f"\n❌ MISSING FROM WEB INTERFACE:")
        for missing in self.coverage_report['missing_functions']:
            print(f"   • {missing['name']} ({missing['category']}) - {missing['description']}")
        
        print(f"\n💡 RECOMMENDATIONS:")
        for rec in self.coverage_report['recommendations']:
            print(f"   • {rec}")
        
        print("\n" + "="*80)

def main():
    """Main execution function"""
    print("🔍 CLI to Web Interface Coverage Auditor")
    print("=" * 60)
    
    auditor = CLIWebInterfaceAuditor()
    
    # Discover CLI functions
    cli_functions = auditor.discover_cli_functions()
    print(f"✅ Discovered {len(cli_functions)} CLI functions")
    
    # Discover web components  
    web_components = auditor.discover_web_components()
    print(f"✅ Discovered {len(web_components)} web components")
    
    # Map CLI to web
    auditor.map_cli_to_web()
    print("✅ Completed CLI to web mapping")
    
    # Generate and save report
    auditor.generate_coverage_report()
    report_file = auditor.save_report()
    
    # Print summary
    auditor.print_summary()
    
    print(f"\n📄 Detailed report available at: {report_file}")

if __name__ == "__main__":
    main() 