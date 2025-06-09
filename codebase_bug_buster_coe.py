#!/usr/bin/env python3
"""
🐛 Codebase Bug Buster Coalition of Experts (CoE)
=================================================

Comprehensive bug detection and code analysis system following CoE delegation pattern.
Analyzes entire Secrets Agent codebase for bugs, vulnerabilities, and improvements.

Following Cursor Rules:
- 1015: CoE delegation for complex actions
- 1016: CoE invocation via orchestrator

Author: Secrets Agent AI
Version: 1.0.0
"""

import os
import ast
import re
import json
import sys
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime
from functools import lru_cache
from concurrent.futures import ThreadPoolExecutor, as_completed
import traceback
from collections import defaultdict

@dataclass
class BugReport:
    """Bug report following CoE pattern"""
    file_path: str
    line_number: int
    bug_type: str
    severity: str  # critical, high, medium, low
    description: str
    code_snippet: str
    suggested_fix: str
    expert_agent: str
    confidence: float = 0.9

@dataclass
class CodeAnalysisProposal:
    """Code analysis proposal following CoE pattern"""
    type: str
    context: Dict[str, Any]
    proposal: str
    requester_agent: str
    priority: str = "medium"
    estimated_effort: str = "medium"
    dependencies: List[str] = None
    
    def __post_init__(self):
        if self.dependencies is None:
            self.dependencies = []

class CodebaseBugBusterCoE:
    """Coalition of Experts for Codebase Bug Detection"""
    
    def __init__(self, root_path: str = "."):
        self.root_path = Path(root_path)
        self.bug_reports: List[BugReport] = []
        self.analysis_proposals: List[CodeAnalysisProposal] = []
        self.execution_log: List[Dict[str, Any]] = []
        
        # Performance optimization
        self._file_cache: Dict[str, str] = {}
        self._ast_cache: Dict[str, ast.AST] = {}
        
        # Bug pattern definitions
        self.bug_patterns = self._load_bug_patterns()
        
    def trigger_coe_review(self, analysis_type: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Trigger CoE review process following cursor rule 1015"""
        proposal = CodeAnalysisProposal(
            type=analysis_type,
            context=context,
            proposal=f"Analyze {analysis_type} in codebase",
            requester_agent="bug_buster_orchestrator"
        )
        
        self.analysis_proposals.append(proposal)
        
        # Delegate to specialized agents based on analysis type
        if analysis_type == "syntax_errors":
            return self._delegate_to_syntax_expert(context)
        elif analysis_type == "logic_bugs":
            return self._delegate_to_logic_expert(context)
        elif analysis_type == "security_vulnerabilities":
            return self._delegate_to_security_expert(context)
        elif analysis_type == "performance_issues":
            return self._delegate_to_performance_expert(context)
        elif analysis_type == "code_smells":
            return self._delegate_to_quality_expert(context)
        elif analysis_type == "dependency_issues":
            return self._delegate_to_dependency_expert(context)
        else:
            return self._delegate_to_general_expert(context)
    
    def _delegate_to_syntax_expert(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Syntax analysis specialist agent"""
        print("🔍 Syntax Expert: Analyzing syntax errors and parsing issues...")
        
        python_files = self._find_python_files()
        syntax_issues = []
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(self._check_syntax_errors, file_path)
                for file_path in python_files
            ]
            
            for future in as_completed(futures):
                try:
                    issues = future.result()
                    syntax_issues.extend(issues)
                except Exception as e:
                    print(f"Error in syntax analysis: {e}")
        
        self.bug_reports.extend(syntax_issues)
        
        return {
            'expert': 'syntax',
            'issues_found': len(syntax_issues),
            'files_analyzed': len(python_files),
            'status': 'completed'
        }
    
    def _delegate_to_logic_expert(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Logic bug detection specialist agent"""
        print("🧠 Logic Expert: Analyzing logic bugs and flow issues...")
        
        python_files = self._find_python_files()
        logic_issues = []
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(self._check_logic_bugs, file_path)
                for file_path in python_files
            ]
            
            for future in as_completed(futures):
                try:
                    issues = future.result()
                    logic_issues.extend(issues)
                except Exception as e:
                    print(f"Error in logic analysis: {e}")
        
        self.bug_reports.extend(logic_issues)
        
        return {
            'expert': 'logic',
            'issues_found': len(logic_issues),
            'files_analyzed': len(python_files),
            'status': 'completed'
        }
    
    def _delegate_to_security_expert(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Security vulnerability specialist agent"""
        print("🔒 Security Expert: Analyzing security vulnerabilities...")
        
        python_files = self._find_python_files()
        security_issues = []
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(self._check_security_vulnerabilities, file_path)
                for file_path in python_files
            ]
            
            for future in as_completed(futures):
                try:
                    issues = future.result()
                    security_issues.extend(issues)
                except Exception as e:
                    print(f"Error in security analysis: {e}")
        
        self.bug_reports.extend(security_issues)
        
        return {
            'expert': 'security',
            'issues_found': len(security_issues),
            'files_analyzed': len(python_files),
            'status': 'completed'
        }
    
    def _delegate_to_performance_expert(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Performance analysis specialist agent"""
        print("⚡ Performance Expert: Analyzing performance issues...")
        
        python_files = self._find_python_files()
        performance_issues = []
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(self._check_performance_issues, file_path)
                for file_path in python_files
            ]
            
            for future in as_completed(futures):
                try:
                    issues = future.result()
                    performance_issues.extend(issues)
                except Exception as e:
                    print(f"Error in performance analysis: {e}")
        
        self.bug_reports.extend(performance_issues)
        
        return {
            'expert': 'performance',
            'issues_found': len(performance_issues),
            'files_analyzed': len(python_files),
            'status': 'completed'
        }
    
    def _delegate_to_quality_expert(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Code quality specialist agent"""
        print("✨ Quality Expert: Analyzing code smells and quality issues...")
        
        python_files = self._find_python_files()
        quality_issues = []
        
        with ThreadPoolExecutor(max_workers=4) as executor:
            futures = [
                executor.submit(self._check_code_smells, file_path)
                for file_path in python_files
            ]
            
            for future in as_completed(futures):
                try:
                    issues = future.result()
                    quality_issues.extend(issues)
                except Exception as e:
                    print(f"Error in quality analysis: {e}")
        
        self.bug_reports.extend(quality_issues)
        
        return {
            'expert': 'quality',
            'issues_found': len(quality_issues),
            'files_analyzed': len(python_files),
            'status': 'completed'
        }
    
    def _delegate_to_dependency_expert(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Dependency analysis specialist agent"""
        print("📦 Dependency Expert: Analyzing dependency issues...")
        
        dependency_issues = []
        
        # Check requirements files
        req_files = ['requirements.txt', 'setup.py', 'pyproject.toml', 'Pipfile']
        for req_file in req_files:
            if (self.root_path / req_file).exists():
                issues = self._check_dependency_issues(req_file)
                dependency_issues.extend(issues)
        
        # Check import issues
        python_files = self._find_python_files()
        for file_path in python_files[:10]:  # Limit for performance
            import_issues = self._check_import_issues(file_path)
            dependency_issues.extend(import_issues)
        
        self.bug_reports.extend(dependency_issues)
        
        return {
            'expert': 'dependency',
            'issues_found': len(dependency_issues),
            'status': 'completed'
        }
    
    def _delegate_to_general_expert(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """General analysis specialist"""
        print("⚙️ General Expert: Analyzing general issues...")
        
        python_files = self._find_python_files()
        general_issues = []
        
        for file_path in python_files[:5]:  # Limit for performance
            issues = self._check_general_issues(file_path)
            general_issues.extend(issues)
        
        self.bug_reports.extend(general_issues)
        
        return {
            'expert': 'general',
            'issues_found': len(general_issues),
            'status': 'completed'
        }
    
    def _find_python_files(self) -> List[Path]:
        """Find all Python files in the codebase"""
        python_files = []
        for path in self.root_path.rglob("*.py"):
            if not any(exclude in str(path) for exclude in ['.git', '__pycache__', '.venv', 'venv']):
                python_files.append(path)
        return python_files
    
    @lru_cache(maxsize=256)
    def _read_file_cached(self, file_path: Path) -> str:
        """Cached file reading"""
        try:
            with open(file_path, 'r', encoding='utf-8') as f:
                return f.read()
        except Exception as e:
            print(f"Error reading {file_path}: {e}")
            return ""
    
    def _get_ast_cached(self, file_path: Path) -> Optional[ast.AST]:
        """Cached AST parsing"""
        file_key = str(file_path)
        if file_key not in self._ast_cache:
            try:
                content = self._read_file_cached(file_path)
                self._ast_cache[file_key] = ast.parse(content, filename=str(file_path))
            except Exception as e:
                print(f"AST parsing error for {file_path}: {e}")
                self._ast_cache[file_key] = None
        return self._ast_cache[file_key]
    
    def _check_syntax_errors(self, file_path: Path) -> List[BugReport]:
        """Check for syntax errors"""
        issues = []
        content = self._read_file_cached(file_path)
        
        try:
            ast.parse(content, filename=str(file_path))
        except SyntaxError as e:
            issues.append(BugReport(
                file_path=str(file_path),
                line_number=e.lineno or 0,
                bug_type="syntax_error",
                severity="critical",
                description=f"Syntax error: {e.msg}",
                code_snippet=e.text or "",
                suggested_fix="Fix syntax according to Python grammar rules",
                expert_agent="syntax_expert"
            ))
        except Exception as e:
            issues.append(BugReport(
                file_path=str(file_path),
                line_number=0,
                bug_type="parsing_error",
                severity="high",
                description=f"Failed to parse file: {str(e)}",
                code_snippet="",
                suggested_fix="Check file encoding and structure",
                expert_agent="syntax_expert"
            ))
        
        return issues
    
    def _check_logic_bugs(self, file_path: Path) -> List[BugReport]:
        """Check for logic bugs"""
        issues = []
        content = self._read_file_cached(file_path)
        lines = content.split('\n')
        
        tree = self._get_ast_cached(file_path)
        if not tree:
            return issues
        
        class LogicBugVisitor(ast.NodeVisitor):
            def __init__(self, issues_list, file_path, lines):
                self.issues = issues_list
                self.file_path = file_path
                self.lines = lines
            
            def visit_FunctionDef(self, node):
                # Check for missing return statements
                if not self._has_return_statement(node):
                    self.issues.append(BugReport(
                        file_path=str(self.file_path),
                        line_number=node.lineno,
                        bug_type="missing_return",
                        severity="medium",
                        description=f"Function '{node.name}' may be missing return statement",
                        code_snippet=self.lines[node.lineno-1] if node.lineno-1 < len(self.lines) else "",
                        suggested_fix="Add explicit return statement or ensure all code paths return a value",
                        expert_agent="logic_expert"
                    ))
                
                # Check for unreachable code
                self._check_unreachable_code(node)
                self.generic_visit(node)
            
            def visit_Compare(self, node):
                # Check for assignment in comparison (= vs ==)
                line_content = self.lines[node.lineno-1] if node.lineno-1 < len(self.lines) else ""
                if '=' in line_content and '==' not in line_content and '!=' not in line_content:
                    # This is a rough check - more sophisticated analysis would be needed
                    pass
                self.generic_visit(node)
            
            def _has_return_statement(self, func_node):
                """Check if function has return statement"""
                for node in ast.walk(func_node):
                    if isinstance(node, ast.Return):
                        return True
                return False
            
            def _check_unreachable_code(self, func_node):
                """Check for unreachable code after return/raise"""
                for i, stmt in enumerate(func_node.body):
                    if isinstance(stmt, (ast.Return, ast.Raise)):
                        if i + 1 < len(func_node.body):
                            next_stmt = func_node.body[i + 1]
                            self.issues.append(BugReport(
                                file_path=str(self.file_path),
                                line_number=next_stmt.lineno,
                                bug_type="unreachable_code",
                                severity="medium",
                                description="Unreachable code after return/raise statement",
                                code_snippet=self.lines[next_stmt.lineno-1] if next_stmt.lineno-1 < len(self.lines) else "",
                                suggested_fix="Remove unreachable code or restructure logic",
                                expert_agent="logic_expert"
                            ))
        
        visitor = LogicBugVisitor(issues, file_path, lines)
        visitor.visit(tree)
        
        return issues
    
    def _check_security_vulnerabilities(self, file_path: Path) -> List[BugReport]:
        """Check for security vulnerabilities"""
        issues = []
        content = self._read_file_cached(file_path)
        lines = content.split('\n')
        
        # Check for common security issues
        security_patterns = [
            (r'eval\s*\(', "code_injection", "Use of eval() can lead to code injection"),
            (r'exec\s*\(', "code_injection", "Use of exec() can lead to code injection"),
            (r'shell=True', "command_injection", "shell=True in subprocess calls can be dangerous"),
            (r'password\s*=\s*["\'][^"\']*["\']', "hardcoded_password", "Hardcoded password detected"),
            (r'api_key\s*=\s*["\'][^"\']*["\']', "hardcoded_api_key", "Hardcoded API key detected"),
            (r'os\.system\s*\(', "command_injection", "os.system() can be vulnerable to injection"),
        ]
        
        for line_num, line in enumerate(lines, 1):
            for pattern, vuln_type, description in security_patterns:
                if re.search(pattern, line, re.IGNORECASE):
                    issues.append(BugReport(
                        file_path=str(file_path),
                        line_number=line_num,
                        bug_type=vuln_type,
                        severity="high",
                        description=description,
                        code_snippet=line.strip(),
                        suggested_fix=self._get_security_fix_suggestion(vuln_type),
                        expert_agent="security_expert"
                    ))
        
        return issues
    
    def _check_performance_issues(self, file_path: Path) -> List[BugReport]:
        """Check for performance issues"""
        issues = []
        content = self._read_file_cached(file_path)
        lines = content.split('\n')
        
        # Check for performance anti-patterns
        perf_patterns = [
            (r'\.append\s*\(.*\)\s*$', "inefficient_list_append", "Consider list comprehension or extend() for better performance"),
            (r'for\s+\w+\s+in\s+range\s*\(\s*len\s*\(', "inefficient_iteration", "Use direct iteration over container instead of range(len())"),
            (r'\.keys\s*\(\s*\)\s*:', "inefficient_dict_iteration", "Iterate over dict directly instead of .keys()"),
        ]
        
        for line_num, line in enumerate(lines, 1):
            for pattern, issue_type, description in perf_patterns:
                if re.search(pattern, line):
                    issues.append(BugReport(
                        file_path=str(file_path),
                        line_number=line_num,
                        bug_type=issue_type,
                        severity="low",
                        description=description,
                        code_snippet=line.strip(),
                        suggested_fix=self._get_performance_fix_suggestion(issue_type),
                        expert_agent="performance_expert"
                    ))
        
        return issues
    
    def _check_code_smells(self, file_path: Path) -> List[BugReport]:
        """Check for code smells"""
        issues = []
        content = self._read_file_cached(file_path)
        lines = content.split('\n')
        
        tree = self._get_ast_cached(file_path)
        if not tree:
            return issues
        
        class CodeSmellVisitor(ast.NodeVisitor):
            def __init__(self, issues_list, file_path, lines):
                self.issues = issues_list
                self.file_path = file_path
                self.lines = lines
            
            def visit_FunctionDef(self, node):
                # Check function length
                if len(node.body) > 50:
                    self.issues.append(BugReport(
                        file_path=str(self.file_path),
                        line_number=node.lineno,
                        bug_type="long_function",
                        severity="medium",
                        description=f"Function '{node.name}' is too long ({len(node.body)} statements)",
                        code_snippet=self.lines[node.lineno-1] if node.lineno-1 < len(self.lines) else "",
                        suggested_fix="Break function into smaller, more focused functions",
                        expert_agent="quality_expert"
                    ))
                
                # Check parameter count
                if len(node.args.args) > 5:
                    self.issues.append(BugReport(
                        file_path=str(self.file_path),
                        line_number=node.lineno,
                        bug_type="too_many_parameters",
                        severity="medium",
                        description=f"Function '{node.name}' has too many parameters ({len(node.args.args)})",
                        code_snippet=self.lines[node.lineno-1] if node.lineno-1 < len(self.lines) else "",
                        suggested_fix="Consider using a configuration object or breaking the function apart",
                        expert_agent="quality_expert"
                    ))
                
                self.generic_visit(node)
        
        visitor = CodeSmellVisitor(issues, file_path, lines)
        visitor.visit(tree)
        
        return issues
    
    def _check_dependency_issues(self, req_file: str) -> List[BugReport]:
        """Check for dependency issues"""
        issues = []
        
        try:
            content = self._read_file_cached(self.root_path / req_file)
            lines = content.split('\n')
            
            for line_num, line in enumerate(lines, 1):
                line = line.strip()
                if line and not line.startswith('#'):
                    # Check for unpinned versions
                    if '==' not in line and '>=' not in line and '~=' not in line:
                        issues.append(BugReport(
                            file_path=req_file,
                            line_number=line_num,
                            bug_type="unpinned_dependency",
                            severity="medium",
                            description=f"Unpinned dependency: {line}",
                            code_snippet=line,
                            suggested_fix="Pin dependency versions for reproducible builds",
                            expert_agent="dependency_expert"
                        ))
                        
        except Exception as e:
            issues.append(BugReport(
                file_path=req_file,
                line_number=0,
                bug_type="dependency_file_error",
                severity="high",
                description=f"Error reading dependency file: {e}",
                code_snippet="",
                suggested_fix="Check file format and accessibility",
                expert_agent="dependency_expert"
            ))
        
        return issues
    
    def _check_import_issues(self, file_path: Path) -> List[BugReport]:
        """Check for import issues"""
        issues = []
        content = self._read_file_cached(file_path)
        lines = content.split('\n')
        
        # Check for unused imports (basic check)
        imports = []
        for line_num, line in enumerate(lines, 1):
            if line.strip().startswith(('import ', 'from ')):
                imports.append((line_num, line.strip()))
        
        # This is a simplified check - a full implementation would use AST analysis
        for line_num, import_line in imports:
            if 'import *' in import_line:
                issues.append(BugReport(
                    file_path=str(file_path),
                    line_number=line_num,
                    bug_type="wildcard_import",
                    severity="medium",
                    description="Wildcard import can pollute namespace",
                    code_snippet=import_line,
                    suggested_fix="Import specific names or use qualified imports",
                    expert_agent="dependency_expert"
                ))
        
        return issues
    
    def _check_general_issues(self, file_path: Path) -> List[BugReport]:
        """Check for general issues"""
        issues = []
        content = self._read_file_cached(file_path)
        lines = content.split('\n')
        
        # Check for common issues
        for line_num, line in enumerate(lines, 1):
            # Check for print statements (may be debug code)
            if re.search(r'\bprint\s*\(', line) and 'main' not in str(file_path).lower():
                issues.append(BugReport(
                    file_path=str(file_path),
                    line_number=line_num,
                    bug_type="debug_print",
                    severity="low",
                    description="Print statement found (possible debug code)",
                    code_snippet=line.strip(),
                    suggested_fix="Remove debug prints or use proper logging",
                    expert_agent="general_expert"
                ))
            
            # Check for TODO/FIXME comments
            if re.search(r'#.*\b(TODO|FIXME|XXX|HACK)\b', line, re.IGNORECASE):
                issues.append(BugReport(
                    file_path=str(file_path),
                    line_number=line_num,
                    bug_type="todo_comment",
                    severity="low",
                    description="TODO/FIXME comment found",
                    code_snippet=line.strip(),
                    suggested_fix="Address the TODO item or create a proper issue tracker entry",
                    expert_agent="general_expert"
                ))
        
        return issues
    
    def _get_security_fix_suggestion(self, vuln_type: str) -> str:
        """Get security fix suggestions"""
        fixes = {
            "code_injection": "Use ast.literal_eval() for safe evaluation or validate input thoroughly",
            "command_injection": "Use parameterized commands and avoid shell=True",
            "hardcoded_password": "Use environment variables or secure configuration",
            "hardcoded_api_key": "Use environment variables or secure key management"
        }
        return fixes.get(vuln_type, "Review security implications and apply appropriate mitigations")
    
    def _get_performance_fix_suggestion(self, issue_type: str) -> str:
        """Get performance fix suggestions"""
        fixes = {
            "inefficient_list_append": "Use list comprehension: [item for item in iterable]",
            "inefficient_iteration": "Use: for item in container instead of for i in range(len(container))",
            "inefficient_dict_iteration": "Use: for key in dict instead of for key in dict.keys()"
        }
        return fixes.get(issue_type, "Review for performance optimization opportunities")
    
    def _load_bug_patterns(self) -> Dict[str, Any]:
        """Load bug detection patterns"""
        return {
            "syntax": ["SyntaxError", "IndentationError"],
            "logic": ["UnboundLocalError", "NameError"],
            "security": ["eval", "exec", "shell=True"],
            "performance": ["nested_loops", "inefficient_data_structures"]
        }
    
    def execute_comprehensive_analysis(self) -> Dict[str, Any]:
        """Execute comprehensive codebase analysis following CoE pattern"""
        print("🐛 Starting Comprehensive Codebase Bug Analysis CoE")
        print("=" * 60)
        
        start_time = datetime.now()
        results = {}
        
        # Define analysis context
        analysis_context = {
            'codebase_path': str(self.root_path),
            'analysis_scope': 'full_codebase',
            'target_language': 'python',
            'priority_areas': ['security', 'logic', 'performance']
        }
        
        # Execute each analysis via CoE delegation
        analysis_types = [
            'syntax_errors',
            'logic_bugs',
            'security_vulnerabilities',
            'performance_issues',
            'code_smells',
            'dependency_issues'
        ]
        
        for analysis_type in analysis_types:
            print(f"\n🔄 Processing {analysis_type}...")
            results[analysis_type] = self.trigger_coe_review(analysis_type, analysis_context)
        
        execution_time = (datetime.now() - start_time).total_seconds()
        
        # Generate summary statistics
        total_issues = len(self.bug_reports)
        severity_counts = defaultdict(int)
        type_counts = defaultdict(int)
        
        for bug in self.bug_reports:
            severity_counts[bug.severity] += 1
            type_counts[bug.bug_type] += 1
        
        summary = {
            'total_execution_time': round(execution_time, 2),
            'total_issues_found': total_issues,
            'severity_breakdown': dict(severity_counts),
            'issue_type_breakdown': dict(type_counts),
            'analyses_completed': len(results),
            'proposals_processed': len(self.analysis_proposals)
        }
        
        final_result = {
            'summary': summary,
            'analysis_results': results,
            'bug_reports': [asdict(bug) for bug in self.bug_reports],
            'coe_proposals': [asdict(p) for p in self.analysis_proposals]
        }
        
        # Save analysis report
        self._save_analysis_report(final_result)
        
        print(f"\n✅ Codebase analysis completed in {execution_time:.2f} seconds")
        print(f"🐛 Found {total_issues} issues across {len(results)} analysis types")
        print(f"📊 Severity breakdown: {dict(severity_counts)}")
        
        return final_result
    
    def _save_analysis_report(self, results: Dict[str, Any]) -> None:
        """Save analysis report"""
        report_file = f"codebase_bug_analysis_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(results, f, indent=2, ensure_ascii=False)
            print(f"📊 Bug analysis report saved: {report_file}")
        except Exception as e:
            print(f"⚠️ Error saving report: {e}")

def main():
    """Main execution following CoE delegation pattern"""
    print("🐛 Codebase Bug Buster Coalition of Experts")
    print("Following Cursor Rules 1015 & 1016 for CoE delegation")
    
    analyzer = CodebaseBugBusterCoE()
    results = analyzer.execute_comprehensive_analysis()
    
    print(f"\n🎉 Bug Analysis Complete!")
    print(f"📊 Summary: {results['summary']}")

if __name__ == "__main__":
    main() 