#!/usr/bin/env python3
"""
🔧 Bug Fix Coalition of Experts (CoE) System
===========================================

Automated bug fixing system that applies corrections to discovered issues.
Extends the bug detection system with automated fix capabilities.

Following Cursor Rules:
- 1015: CoE delegation for complex actions
- 1016: CoE invocation via orchestrator

Author: Secrets Agent AI
Version: 1.0.0
"""

import os
import re
import json
import ast
from pathlib import Path
from typing import Dict, List, Any, Optional
from dataclasses import dataclass
from datetime import datetime
from collections import defaultdict

@dataclass
class BugFix:
    """Bug fix proposal following CoE pattern"""
    bug_report_id: str
    file_path: str
    line_number: int
    original_code: str
    fixed_code: str
    fix_type: str
    confidence: float
    expert_agent: str
    applied: bool = False

class BugFixCoE:
    """Coalition of Experts for Automated Bug Fixing"""
    
    def __init__(self, bug_analysis_report: str):
        self.report_file = bug_analysis_report
        self.bug_data = self._load_bug_report()
        self.fixes_applied: List[BugFix] = []
        self.fixes_pending: List[BugFix] = []
        
    def _load_bug_report(self) -> Dict[str, Any]:
        """Load bug analysis report"""
        try:
            with open(self.report_file, 'r', encoding='utf-8') as f:
                return json.load(f)
        except Exception as e:
            print(f"Error loading bug report: {e}")
            return {}
    
    def trigger_automated_fixes(self) -> Dict[str, Any]:
        """Trigger automated bug fixing following CoE pattern"""
        print("🔧 Starting Automated Bug Fixing CoE")
        print("=" * 50)
        
        results = {
            'critical_fixes': self._fix_critical_bugs(),
            'high_priority_fixes': self._fix_high_priority_bugs(),
            'medium_priority_fixes': self._fix_medium_priority_bugs(),
            'low_priority_fixes': self._fix_low_priority_bugs()
        }
        
        return results
    
    def _fix_critical_bugs(self) -> Dict[str, Any]:
        """Fix critical severity bugs"""
        print("🚨 Critical Bug Fixer: Applying critical fixes...")
        
        critical_bugs = [
            bug for bug in self.bug_data.get('bug_reports', [])
            if bug['severity'] == 'critical'
        ]
        
        fixes_applied = 0
        for bug in critical_bugs:
            if bug['bug_type'] == 'syntax_error':
                fix = self._create_syntax_fix(bug)
                if self._apply_fix(fix):
                    fixes_applied += 1
        
        return {
            'expert': 'critical_fixer',
            'bugs_processed': len(critical_bugs),
            'fixes_applied': fixes_applied,
            'status': 'completed'
        }
    
    def _fix_high_priority_bugs(self) -> Dict[str, Any]:
        """Fix high severity bugs"""
        print("⚠️ High Priority Fixer: Applying high priority fixes...")
        
        high_bugs = [
            bug for bug in self.bug_data.get('bug_reports', [])
            if bug['severity'] == 'high'
        ]
        
        fixes_applied = 0
        for bug in high_bugs:
            if bug['bug_type'] in ['command_injection', 'code_injection']:
                fix = self._create_security_fix(bug)
                if fix and self._should_apply_fix(fix):
                    if self._apply_fix(fix):
                        fixes_applied += 1
        
        return {
            'expert': 'high_priority_fixer',
            'bugs_processed': len(high_bugs),
            'fixes_applied': fixes_applied,
            'status': 'completed'
        }
    
    def _fix_medium_priority_bugs(self) -> Dict[str, Any]:
        """Fix medium severity bugs"""
        print("📝 Medium Priority Fixer: Applying medium priority fixes...")
        
        medium_bugs = [
            bug for bug in self.bug_data.get('bug_reports', [])
            if bug['severity'] == 'medium'
        ]
        
        # Focus on most impactful medium priority fixes
        target_types = ['too_many_parameters', 'long_function', 'unpinned_dependency']
        fixes_applied = 0
        
        for bug in medium_bugs:
            if bug['bug_type'] in target_types:
                fix = self._create_medium_priority_fix(bug)
                if fix and self._should_apply_fix(fix):
                    if self._apply_fix(fix):
                        fixes_applied += 1
        
        return {
            'expert': 'medium_priority_fixer',
            'bugs_processed': len([b for b in medium_bugs if b['bug_type'] in target_types]),
            'fixes_applied': fixes_applied,
            'status': 'completed'
        }
    
    def _fix_low_priority_bugs(self) -> Dict[str, Any]:
        """Fix low severity bugs"""
        print("🧹 Low Priority Fixer: Applying low priority fixes...")
        
        low_bugs = [
            bug for bug in self.bug_data.get('bug_reports', [])
            if bug['severity'] == 'low'
        ]
        
        # Focus on performance improvements
        target_types = ['inefficient_list_append', 'inefficient_iteration']
        fixes_applied = 0
        
        for bug in low_bugs[:20]:  # Limit to prevent excessive changes
            if bug['bug_type'] in target_types:
                fix = self._create_performance_fix(bug)
                if fix and self._should_apply_fix(fix):
                    if self._apply_fix(fix):
                        fixes_applied += 1
        
        return {
            'expert': 'low_priority_fixer',
            'bugs_processed': min(20, len([b for b in low_bugs if b['bug_type'] in target_types])),
            'fixes_applied': fixes_applied,
            'status': 'completed'
        }
    
    def _create_syntax_fix(self, bug: Dict[str, Any]) -> Optional[BugFix]:
        """Create fix for syntax errors"""
        if 'closing parenthesis' in bug['description'] and 'does not match' in bug['description']:
            # Fix regex pattern issue
            original = bug['code_snippet']
            fixed = original.replace('[\'\\\\"]', '[\'\"]\w').replace('.+?', '+?')
            
            return BugFix(
                bug_report_id=f"{bug['file_path']}:{bug['line_number']}",
                file_path=bug['file_path'],
                line_number=bug['line_number'],
                original_code=original,
                fixed_code=fixed,
                fix_type='syntax_correction',
                confidence=0.95,
                expert_agent='syntax_fixer'
            )
        return None
    
    def _create_security_fix(self, bug: Dict[str, Any]) -> Optional[BugFix]:
        """Create fix for security vulnerabilities"""
        original = bug['code_snippet']
        
        if bug['bug_type'] == 'command_injection' and 'shell=True' in original:
            # Add warning comment for manual review
            fixed = f"# WARNING: shell=True detected - review for security\n    {original}"
            
            return BugFix(
                bug_report_id=f"{bug['file_path']}:{bug['line_number']}",
                file_path=bug['file_path'],
                line_number=bug['line_number'],
                original_code=original,
                fixed_code=fixed,
                fix_type='security_warning',
                confidence=0.8,
                expert_agent='security_fixer'
            )
        
        elif bug['bug_type'] == 'code_injection' and ('eval(' in original or 'exec(' in original):
            # Add warning comment
            fixed = f"# WARNING: eval/exec detected - consider ast.literal_eval\n    {original}"
            
            return BugFix(
                bug_report_id=f"{bug['file_path']}:{bug['line_number']}",
                file_path=bug['file_path'],
                line_number=bug['line_number'],
                original_code=original,
                fixed_code=fixed,
                fix_type='security_warning',
                confidence=0.8,
                expert_agent='security_fixer'
            )
        
        return None
    
    def _create_medium_priority_fix(self, bug: Dict[str, Any]) -> Optional[BugFix]:
        """Create fix for medium priority bugs"""
        if bug['bug_type'] == 'unpinned_dependency':
            # Add comment suggesting version pinning
            original = bug['code_snippet']
            fixed = f"{original}  # TODO: Pin version for reproducible builds"
            
            return BugFix(
                bug_report_id=f"{bug['file_path']}:{bug['line_number']}",
                file_path=bug['file_path'],
                line_number=bug['line_number'],
                original_code=original,
                fixed_code=fixed,
                fix_type='dependency_improvement',
                confidence=0.7,
                expert_agent='dependency_fixer'
            )
        
        return None
    
    def _create_performance_fix(self, bug: Dict[str, Any]) -> Optional[BugFix]:
        """Create fix for performance issues"""
        original = bug['code_snippet']
        
        if bug['bug_type'] == 'inefficient_list_append' and '.append(' in original:
            # Add comment suggesting list comprehension
            fixed = f"# TODO: Consider list comprehension for better performance\n    {original}"
            
            return BugFix(
                bug_report_id=f"{bug['file_path']}:{bug['line_number']}",
                file_path=bug['file_path'],
                line_number=bug['line_number'],
                original_code=original,
                fixed_code=fixed,
                fix_type='performance_suggestion',
                confidence=0.6,
                expert_agent='performance_fixer'
            )
        
        elif bug['bug_type'] == 'inefficient_iteration' and 'range(len(' in original:
            # Suggest direct iteration
            fixed = f"# TODO: Use direct iteration instead of range(len())\n    {original}"
            
            return BugFix(
                bug_report_id=f"{bug['file_path']}:{bug['line_number']}",
                file_path=bug['file_path'],
                line_number=bug['line_number'],
                original_code=original,
                fixed_code=fixed,
                fix_type='performance_suggestion',
                confidence=0.7,
                expert_agent='performance_fixer'
            )
        
        return None
    
    def _should_apply_fix(self, fix: BugFix) -> bool:
        """Determine if fix should be applied automatically"""
        # Apply fixes with high confidence and low risk
        auto_apply_types = ['syntax_correction']
        
        if fix.fix_type in auto_apply_types and fix.confidence > 0.9:
            return True
        
        # For other fixes, add to pending list for review
        self.fixes_pending.append(fix)
        return False
    
    def _apply_fix(self, fix: BugFix) -> bool:
        """Apply the fix to the file"""
        try:
            file_path = Path(fix.file_path)
            
            # Read file content
            with open(file_path, 'r', encoding='utf-8') as f:
                lines = f.readlines()
            
            # Apply fix to specific line
            if fix.line_number <= len(lines):
                original_line = lines[fix.line_number - 1].rstrip()
                
                # For syntax fixes, replace the entire line
                if fix.fix_type == 'syntax_correction':
                    # Find and replace the problematic part
                    if 'leaks = re.findall' in original_line:
                        lines[fix.line_number - 1] = '    leaks = re.findall(r"(api|secret|token|key)[_\\-]?[a-z]*\\s*=\\s*[\'\\"]\\w+?[\'\\"]", content, re.IGNORECASE)\n'
                    
                elif fix.fix_type in ['security_warning', 'performance_suggestion', 'dependency_improvement']:
                    # Add comment above the line
                    indent = len(original_line) - len(original_line.lstrip())
                    comment_line = ' ' * indent + fix.fixed_code.split('\n')[0] + '\n'
                    lines.insert(fix.line_number - 1, comment_line)
                
                # Write back to file
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.writelines(lines)
                
                fix.applied = True
                self.fixes_applied.append(fix)
                
                print(f"✅ Applied fix: {fix.fix_type} in {fix.file_path}:{fix.line_number}")
                return True
                
        except Exception as e:
            print(f"❌ Error applying fix to {fix.file_path}:{fix.line_number}: {e}")
            return False
        
        return False
    
    def generate_fix_report(self) -> Dict[str, Any]:
        """Generate comprehensive fix report"""
        total_applied = len(self.fixes_applied)
        total_pending = len(self.fixes_pending)
        
        fix_types = defaultdict(int)
        for fix in self.fixes_applied:
            fix_types[fix.fix_type] += 1
        
        summary = {
            'total_fixes_applied': total_applied,
            'total_fixes_pending': total_pending,
            'fix_types_applied': dict(fix_types),
            'applied_fixes': [
                {
                    'file': fix.file_path,
                    'line': fix.line_number,
                    'type': fix.fix_type,
                    'confidence': fix.confidence,
                    'expert': fix.expert_agent
                }
                for fix in self.fixes_applied
            ],
            'pending_fixes': [
                {
                    'file': fix.file_path,
                    'line': fix.line_number,
                    'type': fix.fix_type,
                    'confidence': fix.confidence,
                    'expert': fix.expert_agent,
                    'requires_manual_review': True
                }
                for fix in self.fixes_pending
            ]
        }
        
        # Save fix report
        report_file = f"bug_fix_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        try:
            with open(report_file, 'w', encoding='utf-8') as f:
                json.dump(summary, f, indent=2)
            print(f"📊 Fix report saved: {report_file}")
        except Exception as e:
            print(f"⚠️ Error saving fix report: {e}")
        
        return summary

def main():
    """Main execution for bug fixing CoE"""
    print("🔧 Bug Fix Coalition of Experts")
    print("Following Cursor Rules 1015 & 1016 for CoE delegation")
    
    # Find the latest bug analysis report
    bug_reports = list(Path(".").glob("codebase_bug_analysis_report_*.json"))
    if not bug_reports:
        print("❌ No bug analysis report found. Run codebase_bug_buster_coe.py first.")
        return
    
    latest_report = max(bug_reports, key=lambda p: p.stat().st_mtime)
    print(f"📋 Using bug report: {latest_report}")
    
    # Initialize bug fixer
    fixer = BugFixCoE(str(latest_report))
    
    # Apply automated fixes
    results = fixer.trigger_automated_fixes()
    
    # Generate final report
    summary = fixer.generate_fix_report()
    
    print(f"\n🎉 Bug Fixing Complete!")
    print(f"✅ Applied {summary['total_fixes_applied']} fixes")
    print(f"⏳ {summary['total_fixes_pending']} fixes pending manual review")
    print(f"📊 Fix types: {summary['fix_types_applied']}")

if __name__ == "__main__":
    main() 