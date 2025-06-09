#!/usr/bin/env python3
"""
🧪 Interface Coverage Audit Agent
===============================

Audits whether every Python-defined feature (agents, tools, rules, utilities) 
is properly represented in the following interfaces:

1. 🧠 Codebase (Python Layer)
2. 🌐 Web App Interface (Next.js/App Router)  
3. 📱 Expo App (React Native)

Author: Secrets Agent AI
Version: 1.0.0
"""

import os
import re
import json
import yaml
import ast
from pathlib import Path
from typing import Dict, List, Set, Optional, Any
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class FeatureDefinition:
    """Represents a Python-defined feature"""
    id: str
    name: str
    type: str  # 'agent', 'tool', 'rule', 'utility', 'symbolic'
    defined_in: str
    description: str
    class_name: Optional[str] = None
    methods: List[str] = None
    dependencies: List[str] = None
    
    def __post_init__(self):
        if self.methods is None:
            self.methods = []
        if self.dependencies is None:
            self.dependencies = []

@dataclass
class InterfaceRepresentation:
    """Represents how a feature is exposed in interfaces"""
    feature_id: str
    exposed_in_web: bool = False
    exposed_in_expo: bool = False
    web_components: List[str] = None
    web_api_routes: List[str] = None
    expo_components: List[str] = None
    expo_screens: List[str] = None
    missing_representation: bool = True
    missing_reason: str = ""
    
    def __post_init__(self):
        if self.web_components is None:
            self.web_components = []
        if self.web_api_routes is None:
            self.web_api_routes = []
        if self.expo_components is None:
            self.expo_components = []
        if self.expo_screens is None:
            self.expo_screens = []
        
        # Auto-calculate missing_representation
        self.missing_representation = not (self.exposed_in_web or self.exposed_in_expo)

class InterfaceCoverageAudit:
    """Main audit engine for interface coverage analysis"""
    
    def __init__(self, root_path: str = "."):
        self.root_path = Path(root_path)
        self.features: Dict[str, FeatureDefinition] = {}
        self.representations: Dict[str, InterfaceRepresentation] = {}
        self.web_files: Set[str] = set()
        self.expo_files: Set[str] = set()
        self.api_routes: Set[str] = set()
        
    def scan_python_features(self) -> None:
        """Scan all Python files for agents, tools, rules, and utilities"""
        print("🔍 Scanning Python features...")
        
        # Core directories to scan
        python_dirs = [
            "agent_core",
            ".",  # Root level Python files
            "mcp_servers", 
            "vault",
            "tests"
        ]
        
        for dir_name in python_dirs:
            dir_path = self.root_path / dir_name
            if dir_path.exists():
                self._scan_directory_for_python(dir_path)
    
    def _scan_directory_for_python(self, directory: Path) -> None:
        """Recursively scan a directory for Python files"""
        for file_path in directory.rglob("*.py"):
            if "__pycache__" in str(file_path):
                continue
            self._analyze_python_file(file_path)
    
    def _analyze_python_file(self, file_path: Path) -> None:
        """Analyze a Python file for features"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Parse AST to extract classes and functions
            try:
                tree = ast.parse(content)
                self._extract_features_from_ast(tree, file_path, content)
            except SyntaxError:
                # Fallback to regex-based analysis
                self._extract_features_with_regex(content, file_path)
                
        except Exception as e:
            print(f"⚠️ Error analyzing {file_path}: {e}")
    
    def _extract_features_from_ast(self, tree: ast.AST, file_path: Path, content: str) -> None:
        """Extract features using AST parsing"""
        relative_path = str(file_path.relative_to(self.root_path))
        
        for node in ast.walk(tree):
            if isinstance(node, ast.ClassDef):
                self._process_class_definition(node, relative_path, content)
            elif isinstance(node, ast.FunctionDef):
                self._process_function_definition(node, relative_path, content)
    
    def _process_class_definition(self, node: ast.ClassDef, file_path: str, content: str) -> None:
        """Process a class definition to extract feature info"""
        class_name = node.name
        
        # Determine feature type based on naming patterns and content
        feature_type = self._classify_feature_type(class_name, content)
        
        # Extract methods
        methods = [m.name for m in node.body if isinstance(m, ast.FunctionDef)]
        
        # Extract docstring
        docstring = ast.get_docstring(node) or ""
        
        # Create feature definition
        feature_id = f"{file_path.replace('/', '_').replace('.py', '')}_{class_name}"
        
        feature = FeatureDefinition(
            id=feature_id,
            name=class_name,
            type=feature_type,
            defined_in=file_path,
            description=docstring[:200] + "..." if len(docstring) > 200 else docstring,
            class_name=class_name,
            methods=methods
        )
        
        self.features[feature_id] = feature
    
    def _process_function_definition(self, node: ast.FunctionDef, file_path: str, content: str) -> None:
        """Process standalone function definitions"""
        func_name = node.name
        
        # Skip private/magic methods
        if func_name.startswith('_'):
            return
            
        # Only include if it looks like a significant feature
        if self._is_significant_function(func_name, content):
            feature_type = self._classify_feature_type(func_name, content)
            docstring = ast.get_docstring(node) or ""
            
            feature_id = f"{file_path.replace('/', '_').replace('.py', '')}_{func_name}"
            
            feature = FeatureDefinition(
                id=feature_id,
                name=func_name,
                type=feature_type,
                defined_in=file_path,
                description=docstring[:200] + "..." if len(docstring) > 200 else docstring
            )
            
            self.features[feature_id] = feature
    
    def _classify_feature_type(self, name: str, content: str) -> str:
        """Classify the type of feature based on naming and content"""
        name_lower = name.lower()
        content_lower = content.lower()
        
        # Agent patterns
        if any(pattern in name_lower for pattern in ['agent', 'bot', 'ai', 'assistant']):
            return 'agent'
        
        # Tool patterns
        if any(pattern in name_lower for pattern in ['tool', 'utility', 'helper', 'processor']):
            return 'tool'
        
        # Rule patterns
        if any(pattern in name_lower for pattern in ['rule', 'policy', 'governance', 'validator']):
            return 'rule'
        
        # Symbolic patterns
        if any(pattern in name_lower for pattern in ['symbolic', 'archetyp', 'conscious', 'evolution']):
            return 'symbolic'
        
        # Engine/System patterns
        if any(pattern in name_lower for pattern in ['engine', 'system', 'manager', 'handler']):
            return 'utility'
        
        # Security patterns
        if any(pattern in name_lower for pattern in ['security', 'auth', 'vault', 'secret']):
            return 'security'
        
        # Default
        return 'utility'
    
    def _is_significant_function(self, func_name: str, content: str) -> bool:
        """Determine if a function is significant enough to include"""
        # Include functions that are likely to be API endpoints or major features
        significant_patterns = [
            'api_', 'handle_', 'process_', 'execute_', 'run_', 'scan_', 
            'generate_', 'create_', 'manage_', 'analyze_', 'validate_'
        ]
        
        return any(pattern in func_name.lower() for pattern in significant_patterns)
    
    def _extract_features_with_regex(self, content: str, file_path: Path) -> None:
        """Fallback regex-based feature extraction"""
        relative_path = str(file_path.relative_to(self.root_path))
        
        # Extract class definitions
        class_pattern = r'class\s+(\w+)\s*\([^)]*\):\s*(?:"""([^"]*?)""")?'
        classes = re.findall(class_pattern, content, re.DOTALL)
        
        for class_name, docstring in classes:
            feature_type = self._classify_feature_type(class_name, content)
            feature_id = f"{relative_path.replace('/', '_').replace('.py', '')}_{class_name}"
            
            feature = FeatureDefinition(
                id=feature_id,
                name=class_name,
                type=feature_type,
                defined_in=relative_path,
                description=docstring.strip()[:200] if docstring else "",
                class_name=class_name
            )
            
            self.features[feature_id] = feature
    
    def scan_web_interface(self) -> None:
        """Scan Next.js app directory for interface representations"""
        print("🌐 Scanning web interface...")
        
        app_dir = self.root_path / "app"
        components_dir = self.root_path / "components"
        
        if app_dir.exists():
            self._scan_directory_for_web(app_dir)
        if components_dir.exists():
            self._scan_directory_for_web(components_dir)
    
    def _scan_directory_for_web(self, directory: Path) -> None:
        """Scan directory for web interface files"""
        for file_path in directory.rglob("*"):
            if file_path.suffix in ['.tsx', '.ts', '.jsx', '.js']:
                self.web_files.add(str(file_path.relative_to(self.root_path)))
                
                # Identify API routes
                if 'api' in str(file_path) and 'route.' in file_path.name:
                    api_route = str(file_path.relative_to(self.root_path / "app"))
                    api_route = api_route.replace('/route.ts', '').replace('/route.tsx', '')
                    self.api_routes.add(api_route)
    
    def scan_expo_interface(self) -> None:
        """Scan for Expo/React Native interface representations"""
        print("📱 Scanning Expo interface...")
        
        # Common Expo directories
        expo_dirs = ["expo", "mobile", "app", "screens", "navigation"]
        
        for dir_name in expo_dirs:
            dir_path = self.root_path / dir_name
            if dir_path.exists():
                self._scan_directory_for_expo(dir_path)
    
    def _scan_directory_for_expo(self, directory: Path) -> None:
        """Scan directory for Expo interface files"""
        for file_path in directory.rglob("*"):
            if file_path.suffix in ['.tsx', '.ts', '.jsx', '.js'] and 'native' in str(file_path).lower():
                self.expo_files.add(str(file_path.relative_to(self.root_path)))
    
    def analyze_coverage(self) -> None:
        """Analyze coverage between Python features and interface representations"""
        print("🔍 Analyzing coverage...")
        
        for feature_id, feature in self.features.items():
            representation = InterfaceRepresentation(feature_id=feature_id)
            
            # Check web interface coverage
            web_coverage = self._check_web_coverage(feature)
            representation.exposed_in_web = web_coverage['exposed']
            representation.web_components = web_coverage['components']
            representation.web_api_routes = web_coverage['api_routes']
            
            # Check Expo coverage
            expo_coverage = self._check_expo_coverage(feature)
            representation.exposed_in_expo = expo_coverage['exposed']
            representation.expo_components = expo_coverage['components']
            representation.expo_screens = expo_coverage['screens']
            
            # Determine missing representation
            if not representation.exposed_in_web and not representation.exposed_in_expo:
                representation.missing_representation = True
                representation.missing_reason = "No UI representation found in web or mobile interfaces"
            elif not representation.exposed_in_web:
                representation.missing_representation = True
                representation.missing_reason = "Missing web interface representation"
            elif not representation.exposed_in_expo:
                representation.missing_representation = True
                representation.missing_reason = "Missing mobile interface representation"
            else:
                representation.missing_representation = False
            
            self.representations[feature_id] = representation
    
    def _check_web_coverage(self, feature: FeatureDefinition) -> Dict[str, Any]:
        """Check if feature is covered in web interface"""
        exposed = False
        components = []
        api_routes = []
        
        # Search patterns based on feature name and type
        search_terms = [
            feature.name.lower(),
            feature.class_name.lower() if feature.class_name else '',
            feature.type.lower()
        ]
        
        # Check web files for references
        for web_file in self.web_files:
            try:
                file_path = self.root_path / web_file
                if file_path.exists():
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read().lower()
                    
                    for term in search_terms:
                        if term and term in content:
                            exposed = True
                            if 'component' in web_file.lower():
                                components.append(web_file)
                            break
            except Exception:
                continue
        
        # Check API routes
        for api_route in self.api_routes:
            for term in search_terms:
                if term and term in api_route.lower():
                    exposed = True
                    api_routes.append(api_route)
                    break
        
        return {
            'exposed': exposed,
            'components': components,
            'api_routes': api_routes
        }
    
    def _check_expo_coverage(self, feature: FeatureDefinition) -> Dict[str, Any]:
        """Check if feature is covered in Expo interface"""
        exposed = False
        components = []
        screens = []
        
        search_terms = [
            feature.name.lower(),
            feature.class_name.lower() if feature.class_name else '',
            feature.type.lower()
        ]
        
        # Check Expo files for references
        for expo_file in self.expo_files:
            try:
                file_path = self.root_path / expo_file
                if file_path.exists():
                    with open(file_path, 'r', encoding='utf-8') as f:
                        content = f.read().lower()
                    
                    for term in search_terms:
                        if term and term in content:
                            exposed = True
                            if 'screen' in expo_file.lower():
                                screens.append(expo_file)
                            else:
                                components.append(expo_file)
                            break
            except Exception:
                continue
        
        return {
            'exposed': exposed,
            'components': components,
            'screens': screens
        }
    
    def generate_report(self) -> Dict[str, Any]:
        """Generate comprehensive coverage report"""
        print("📊 Generating coverage report...")
        
        total_features = len(self.features)
        web_covered = sum(1 for r in self.representations.values() if r.exposed_in_web)
        expo_covered = sum(1 for r in self.representations.values() if r.exposed_in_expo)
        fully_covered = sum(1 for r in self.representations.values() if r.exposed_in_web and r.exposed_in_expo)
        missing_coverage = sum(1 for r in self.representations.values() if r.missing_representation)
        
        # Categorize by feature type
        type_breakdown = {}
        for feature in self.features.values():
            if feature.type not in type_breakdown:
                type_breakdown[feature.type] = {'total': 0, 'web_covered': 0, 'expo_covered': 0}
            
            type_breakdown[feature.type]['total'] += 1
            if self.representations[feature.id].exposed_in_web:
                type_breakdown[feature.type]['web_covered'] += 1
            if self.representations[feature.id].exposed_in_expo:
                type_breakdown[feature.type]['expo_covered'] += 1
        
        report = {
            'audit_metadata': {
                'timestamp': datetime.now().isoformat(),
                'auditor': 'Interface Coverage Audit Agent v1.0.0',
                'scope': 'Python features → Web/Expo interface coverage'
            },
            'summary': {
                'total_features': total_features,
                'web_interface_coverage': {
                    'covered': web_covered,
                    'coverage_percentage': round((web_covered / total_features) * 100, 1) if total_features > 0 else 0
                },
                'expo_interface_coverage': {
                    'covered': expo_covered,
                    'coverage_percentage': round((expo_covered / total_features) * 100, 1) if total_features > 0 else 0
                },
                'full_coverage': {
                    'covered': fully_covered,
                    'coverage_percentage': round((fully_covered / total_features) * 100, 1) if total_features > 0 else 0
                },
                'missing_coverage': {
                    'count': missing_coverage,
                    'percentage': round((missing_coverage / total_features) * 100, 1) if total_features > 0 else 0
                }
            },
            'type_breakdown': type_breakdown,
            'detailed_audit': []
        }
        
        # Add detailed feature audit
        for feature_id in sorted(self.features.keys()):
            feature = self.features[feature_id]
            representation = self.representations[feature_id]
            
            audit_item = {
                'id': feature.id,
                'name': feature.name,
                'type': feature.type,
                'defined_in': feature.defined_in,
                'exposed_in_web': representation.exposed_in_web,
                'exposed_in_expo': representation.exposed_in_expo,
                'web_components': representation.web_components,
                'web_api_routes': representation.web_api_routes,
                'expo_components': representation.expo_components,
                'expo_screens': representation.expo_screens,
                'missing_representation': representation.missing_representation,
                'missing_reason': representation.missing_reason
            }
            
            report['detailed_audit'].append(audit_item)
        
        return report
    
    def run_full_audit(self) -> Dict[str, Any]:
        """Run complete interface coverage audit"""
        print("🧪 Starting Interface Coverage Audit...")
        print("=" * 60)
        
        # Step 1: Scan Python features
        self.scan_python_features()
        print(f"✅ Found {len(self.features)} Python features")
        
        # Step 2: Scan web interface
        self.scan_web_interface()
        print(f"✅ Found {len(self.web_files)} web interface files")
        print(f"✅ Found {len(self.api_routes)} API routes")
        
        # Step 3: Scan Expo interface
        self.scan_expo_interface()
        print(f"✅ Found {len(self.expo_files)} Expo interface files")
        
        # Step 4: Analyze coverage
        self.analyze_coverage()
        print("✅ Coverage analysis complete")
        
        # Step 5: Generate report
        report = self.generate_report()
        print("✅ Report generated")
        
        return report

def main():
    """Main execution function"""
    print("🚀 Interface Coverage Audit Agent")
    print("==================================")
    
    # Initialize and run audit
    auditor = InterfaceCoverageAudit()
    report = auditor.run_full_audit()
    
    # Save report
    timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
    report_file = f"interface_coverage_audit_{timestamp}.json"
    
    with open(report_file, 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=2, ensure_ascii=False)
    
    # Generate YAML summary
    yaml_file = f"interface_coverage_summary_{timestamp}.yaml"
    summary = {
        'audit_summary': report['summary'],
        'type_breakdown': report['type_breakdown'],
        'critical_missing': [
            item for item in report['detailed_audit'] 
            if item['missing_representation'] and item['type'] in ['agent', 'tool']
        ][:10]  # Top 10 critical missing
    }
    
    with open(yaml_file, 'w', encoding='utf-8') as f:
        yaml.dump(summary, f, default_flow_style=False, allow_unicode=True)
    
    # Print summary
    print("\n" + "=" * 60)
    print("📊 AUDIT SUMMARY")
    print("=" * 60)
    print(f"🧠 Total Python Features: {report['summary']['total_features']}")
    print(f"🌐 Web Coverage: {report['summary']['web_interface_coverage']['covered']}/{report['summary']['total_features']} ({report['summary']['web_interface_coverage']['coverage_percentage']}%)")
    print(f"📱 Expo Coverage: {report['summary']['expo_interface_coverage']['covered']}/{report['summary']['total_features']} ({report['summary']['expo_interface_coverage']['coverage_percentage']}%)")
    print(f"✅ Full Coverage: {report['summary']['full_coverage']['covered']}/{report['summary']['total_features']} ({report['summary']['full_coverage']['coverage_percentage']}%)")
    print(f"❌ Missing Coverage: {report['summary']['missing_coverage']['count']}/{report['summary']['total_features']} ({report['summary']['missing_coverage']['percentage']}%)")
    
    print(f"\n📄 Detailed report saved to: {report_file}")
    print(f"📋 Summary saved to: {yaml_file}")
    
    # Show critical missing features
    critical_missing = [
        item for item in report['detailed_audit'] 
        if item['missing_representation'] and item['type'] in ['agent', 'tool']
    ]
    
    if critical_missing:
        print(f"\n⚠️ CRITICAL MISSING FEATURES ({len(critical_missing)}):")
        for item in critical_missing[:5]:  # Show top 5
            print(f"  • {item['name']} ({item['type']}) - {item['missing_reason']}")
        
        if len(critical_missing) > 5:
            print(f"  ... and {len(critical_missing) - 5} more")

if __name__ == "__main__":
    main() 