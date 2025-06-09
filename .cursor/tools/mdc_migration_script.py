#!/usr/bin/env python3
"""
MDC Migration Script - Step 4 of 4
Migrates existing rules to proper format and organization
"""

import os
import re
import yaml
import shutil
import argparse
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from datetime import datetime
import json

class MDCMigrationScript:
    """Migrates existing MDC rules to proper format and organization"""
    
    FOLDER_MAPPING = {
        # Keywords that suggest appropriate folders
        'variable': 'core',
        'function': 'core', 
        'class': 'core',
        'method': 'core',
        'constant': 'core',
        'import': 'core',
        'export': 'core',
        'typescript': 'language',
        'javascript': 'language',
        'python': 'language',
        'java': 'language',
        'rust': 'language',
        'go': 'language',
        'react': 'framework',
        'vue': 'framework',
        'angular': 'framework',
        'express': 'framework',
        'fastapi': 'framework',
        'django': 'framework',
        'test': 'testing',
        'spec': 'testing',
        'mock': 'testing',
        'unit': 'testing',
        'integration': 'testing',
        'e2e': 'testing',
        'jest': 'testing',
        'pytest': 'testing',
        'git': 'workflow',
        'commit': 'workflow',
        'branch': 'workflow',
        'ci': 'workflow',
        'cd': 'workflow',
        'deployment': 'workflow',
        'security': 'security',
        'auth': 'security',
        'authentication': 'security',
        'authorization': 'security',
        'sanitize': 'security',
        'validate': 'security',
        'performance': 'performance',
        'optimize': 'performance',
        'cache': 'performance',
        'memory': 'performance',
        'speed': 'performance',
        'benchmark': 'performance',
        'documentation': 'documentation',
        'comment': 'documentation',
        'docstring': 'documentation',
        'readme': 'documentation',
        'jsdoc': 'documentation',
        'markdown': 'documentation',
        'deploy': 'deployment',
        'docker': 'deployment',
        'kubernetes': 'deployment',
        'aws': 'deployment',
        'cloud': 'deployment',
        'infrastructure': 'deployment'
    }
    
    RULE_TYPE_DETECTION = {
        'always': [
            r'RULE TYPE:\s*Always',
            r'alwaysApply:\s*true',
            r'type:\s*always',
            r'must\s+always',
            r'enforce',
            r'mandatory'
        ],
        'auto': [
            r'RULE TYPE:\s*Auto',
            r'globs:\s*\[',
            r'type:\s*auto',
            r'files?\s+matching',
            r'applies?\s+to.*\*\.'
        ],
        'agent': [
            r'RULE TYPE:\s*Agent',
            r'agents:\s*\[',
            r'type:\s*agent',
            r'ai\s+should',
            r'assistant',
            r'suggest',
            r'recommend'
        ],
        'manual': [
            r'RULE TYPE:\s*Manual',
            r'type:\s*manual',
            r'manual\s+review',
            r'consider',
            r'review'
        ]
    }
    
    def __init__(self, source_dir: str, target_dir: str = ".cursor/rules", backup_dir: Optional[str] = None):
        self.source_dir = Path(source_dir)
        self.target_dir = Path(target_dir)
        self.backup_dir = Path(backup_dir) if backup_dir else self.source_dir.parent / f"backup_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        
        self.migration_stats = {
            'total_files': 0,
            'migrated_files': 0,
            'failed_files': 0,
            'skipped_files': 0,
            'created_backups': 0,
            'folder_distribution': {},
            'rule_type_distribution': {},
            'fixes_applied': {},
            'migration_time': None
        }
        
        self.migration_log = []
        
    def analyze_existing_structure(self) -> Dict[str, Any]:
        """Analyze existing rule structure to understand current state"""
        analysis = {
            'total_files': 0,
            'mdc_files': 0,
            'non_mdc_files': 0,
            'has_frontmatter': 0,
            'missing_frontmatter': 0,
            'rule_types_found': {},
            'common_issues': {},
            'folder_structure': {},
            'large_files': [],
            'timestamp': datetime.now().isoformat()
        }
        
        print("Analyzing existing rule structure...")
        
        if not self.source_dir.exists():
            analysis['error'] = f"Source directory {self.source_dir} does not exist"
            return analysis
        
        for file_path in self.source_dir.rglob('*'):
            if file_path.is_file():
                analysis['total_files'] += 1
                
                relative_path = file_path.relative_to(self.source_dir)
                folder = str(relative_path.parent) if relative_path.parent != Path('.') else 'root'
                
                if folder not in analysis['folder_structure']:
                    analysis['folder_structure'][folder] = 0
                analysis['folder_structure'][folder] += 1
                
                if file_path.suffix.lower() == '.mdc':
                    analysis['mdc_files'] += 1
                    
                    # Analyze file content
                    try:
                        with open(file_path, 'r', encoding='utf-8') as f:
                            content = f.read()
                        
                        # Check for frontmatter
                        if content.startswith('---'):
                            analysis['has_frontmatter'] += 1
                            
                            # Extract and analyze frontmatter
                            parts = content.split('---', 2)
                            if len(parts) >= 3:
                                try:
                                    frontmatter = yaml.safe_load(parts[1])
                                    if isinstance(frontmatter, dict):
                                        rule_type = self._detect_rule_type(content, frontmatter)
                                        if rule_type:
                                            analysis['rule_types_found'][rule_type] = analysis['rule_types_found'].get(rule_type, 0) + 1
                                except yaml.YAMLError:
                                    analysis['common_issues']['invalid_yaml'] = analysis['common_issues'].get('invalid_yaml', 0) + 1
                        else:
                            analysis['missing_frontmatter'] += 1
                            analysis['common_issues']['missing_frontmatter'] = analysis['common_issues'].get('missing_frontmatter', 0) + 1
                        
                        # Check file size
                        if len(content) > 10000:  # Large files (>10KB)
                            analysis['large_files'].append(str(relative_path))
                        
                        # Check for common issues
                        if 'alwaysApply' not in content and 'globs' not in content:
                            analysis['common_issues']['missing_key_fields'] = analysis['common_issues'].get('missing_key_fields', 0) + 1
                        
                    except Exception as e:
                        analysis['common_issues']['read_errors'] = analysis['common_issues'].get('read_errors', 0) + 1
                
                else:
                    analysis['non_mdc_files'] += 1
        
        return analysis
    
    def create_backup(self) -> bool:
        """Create backup of source directory"""
        try:
            if self.backup_dir.exists():
                shutil.rmtree(self.backup_dir)
            
            shutil.copytree(self.source_dir, self.backup_dir)
            self.migration_stats['created_backups'] = len(list(self.backup_dir.rglob('*')))
            
            print(f"✓ Backup created: {self.backup_dir}")
            return True
            
        except Exception as e:
            print(f"✗ Failed to create backup: {e}")
            return False
    
    def migrate_file(self, source_file: Path) -> Dict[str, Any]:
        """Migrate a single file to the new structure"""
        result = {
            'source': str(source_file),
            'target': None,
            'success': False,
            'rule_type': None,
            'target_folder': None,
            'fixes_applied': [],
            'errors': [],
            'warnings': []
        }
        
        try:
            # Read source file
            with open(source_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Analyze and fix content
            fixed_content, fixes = self._fix_content_issues(content)
            result['fixes_applied'] = fixes
            
            # Extract or create frontmatter
            frontmatter, body = self._extract_or_create_frontmatter(fixed_content, source_file)
            
            # Determine rule type and target folder
            rule_type = self._detect_rule_type(fixed_content, frontmatter)
            target_folder = self._determine_target_folder(fixed_content, frontmatter, source_file)
            
            result['rule_type'] = rule_type
            result['target_folder'] = target_folder
            
            # Generate target file path
            target_file = self._generate_target_path(source_file, rule_type, target_folder)
            result['target'] = str(target_file)
            
            # Ensure target directory exists
            target_file.parent.mkdir(parents=True, exist_ok=True)
            
            # Write migrated file
            migrated_content = self._generate_migrated_content(frontmatter, body, fixes)
            
            with open(target_file, 'w', encoding='utf-8') as f:
                f.write(migrated_content)
            
            result['success'] = True
            
        except Exception as e:
            result['errors'].append(str(e))
        
        return result
    
    def _fix_content_issues(self, content: str) -> Tuple[str, List[str]]:
        """Fix common content issues"""
        fixes = []
        fixed_content = content
        
        # Fix missing frontmatter delimiters
        if not content.startswith('---'):
            # Try to detect if there's YAML-like content at the start
            lines = content.split('\n')
            yaml_end = -1
            
            for i, line in enumerate(lines):
                if line.strip() and not (line.strip().startswith('#') or ':' in line):
                    yaml_end = i
                    break
            
            if yaml_end > 0:
                # Looks like there might be frontmatter without delimiters
                yaml_content = '\n'.join(lines[:yaml_end])
                body_content = '\n'.join(lines[yaml_end:])
                fixed_content = f"---\n{yaml_content}\n---\n{body_content}"
                fixes.append("Added missing frontmatter delimiters")
        
        # Fix common YAML issues
        lines = fixed_content.split('\n')
        in_frontmatter = False
        yaml_lines = []
        
        for i, line in enumerate(lines):
            if line.strip() == '---':
                if not in_frontmatter:
                    in_frontmatter = True
                    yaml_lines.append(line)
                else:
                    in_frontmatter = False
                    yaml_lines.append(line)
                    break
            elif in_frontmatter:
                # Fix common YAML formatting issues
                if ':' in line and not line.strip().startswith('#'):
                    # Ensure space after colon
                    if re.match(r'^([^:]+):([^:\s])', line):
                        line = re.sub(r'^([^:]+):([^:\s])', r'\1: \2', line)
                        fixes.append("Fixed YAML formatting (added space after colon)")
                
                yaml_lines.append(line)
            else:
                yaml_lines.append(line)
        
        if fixes:
            fixed_content = '\n'.join(yaml_lines)
        
        return fixed_content, fixes
    
    def _extract_or_create_frontmatter(self, content: str, source_file: Path) -> Tuple[Dict[str, Any], str]:
        """Extract existing frontmatter or create new one"""
        if content.startswith('---'):
            parts = content.split('---', 2)
            if len(parts) >= 3:
                try:
                    frontmatter = yaml.safe_load(parts[1])
                    if isinstance(frontmatter, dict):
                        body = parts[2].strip()
                        return frontmatter, body
                except yaml.YAMLError:
                    pass
        
        # Create basic frontmatter
        frontmatter = {
            'description': self._generate_description_from_file(source_file, content),
            'created': datetime.now().isoformat(),
            'migrated': True,
            'original_file': str(source_file.relative_to(self.source_dir))
        }
        
        return frontmatter, content
    
    def _generate_description_from_file(self, file_path: Path, content: str) -> str:
        """Generate description from filename and content"""
        # Try to extract from first heading
        lines = content.split('\n')
        for line in lines:
            if line.strip().startswith('#'):
                title = line.strip().lstrip('#').strip()
                if title and len(title) < 200:
                    return title
        
        # Generate from filename
        filename = file_path.stem
        # Convert from kebab-case to title case
        words = filename.replace('-', ' ').replace('_', ' ').split()
        description = ' '.join(word.capitalize() for word in words)
        
        # Add rule suffix if not present
        if not any(word in description.lower() for word in ['rule', 'pattern', 'standard', 'guideline']):
            description += ' Rule'
        
        return description
    
    def _detect_rule_type(self, content: str, frontmatter: Dict[str, Any]) -> str:
        """Detect rule type from content and frontmatter"""
        # Check frontmatter first
        if 'type' in frontmatter:
            return frontmatter['type']
        
        # Check for explicit markers in content
        content_lower = content.lower()
        
        # Score each rule type
        scores = {}
        for rule_type, patterns in self.RULE_TYPE_DETECTION.items():
            score = 0
            for pattern in patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    score += 1
            scores[rule_type] = score
        
        # Check frontmatter indicators
        if frontmatter.get('alwaysApply') is True:
            scores['always'] = scores.get('always', 0) + 2
        
        if 'globs' in frontmatter:
            scores['auto'] = scores.get('auto', 0) + 2
        
        if any(key in frontmatter for key in ['agents', 'agent']):
            scores['agent'] = scores.get('agent', 0) + 2
        
        # Return highest scoring type
        if scores and max(scores.values()) > 0:
            return max(scores, key=scores.get)
        
        return 'manual'  # Default fallback
    
    def _determine_target_folder(self, content: str, frontmatter: Dict[str, Any], source_file: Path) -> str:
        """Determine appropriate target folder"""
        content_lower = content.lower()
        filename_lower = source_file.name.lower()
        
        # Score each folder based on content and filename
        scores = {}
        for keyword, folder in self.FOLDER_MAPPING.items():
            score = 0
            
            # Check content
            if keyword in content_lower:
                score += content_lower.count(keyword)
            
            # Check filename
            if keyword in filename_lower:
                score += 2
            
            # Check frontmatter
            if 'tags' in frontmatter and isinstance(frontmatter['tags'], list):
                for tag in frontmatter['tags']:
                    if keyword in str(tag).lower():
                        score += 1
            
            if score > 0:
                scores[folder] = scores.get(folder, 0) + score
        
        # Return highest scoring folder
        if scores:
            return max(scores, key=scores.get)
        
        return 'core'  # Default fallback
    
    def _generate_target_path(self, source_file: Path, rule_type: str, target_folder: str) -> Path:
        """Generate target file path"""
        filename = source_file.stem
        
        # Ensure rule type suffix
        type_suffixes = ['-always', '-auto', '-agent', '-manual']
        has_suffix = any(filename.endswith(suffix) for suffix in type_suffixes)
        
        if not has_suffix:
            filename = f"{filename}-{rule_type}"
        
        # Ensure .mdc extension
        filename = f"{filename}.mdc"
        
        target_path = self.target_dir / target_folder / filename
        
        # Handle name conflicts
        counter = 1
        while target_path.exists():
            base_name = source_file.stem
            if not has_suffix:
                base_name = f"{base_name}-{rule_type}"
            
            filename = f"{base_name}-{counter}.mdc"
            target_path = self.target_dir / target_folder / filename
            counter += 1
        
        return target_path
    
    def _generate_migrated_content(self, frontmatter: Dict[str, Any], body: str, fixes: List[str]) -> str:
        """Generate final migrated content"""
        # Enhance frontmatter
        if 'type' not in frontmatter and self._detect_rule_type(body, frontmatter):
            frontmatter['type'] = self._detect_rule_type(body, frontmatter)
        
        if 'migrated' not in frontmatter:
            frontmatter['migrated'] = True
            frontmatter['migration_date'] = datetime.now().isoformat()
        
        if fixes:
            frontmatter['migration_fixes'] = fixes
        
        # Generate YAML frontmatter
        frontmatter_yaml = yaml.dump(frontmatter, default_flow_style=False, sort_keys=False)
        
        # Combine with body
        return f"---\n{frontmatter_yaml}---\n\n{body.strip()}\n"
    
    def migrate_all(self, dry_run: bool = False) -> Dict[str, Any]:
        """Migrate all rules from source to target directory"""
        start_time = datetime.now()
        
        print(f"Starting migration from {self.source_dir} to {self.target_dir}")
        if dry_run:
            print("DRY RUN MODE - No files will be modified")
        
        # Analyze existing structure
        analysis = self.analyze_existing_structure()
        print(f"Found {analysis['mdc_files']} MDC files to migrate")
        
        # Create backup unless dry run
        if not dry_run:
            if not self.create_backup():
                return {'error': 'Failed to create backup'}
        
        # Find all MDC files
        mdc_files = list(self.source_dir.rglob('*.mdc'))
        self.migration_stats['total_files'] = len(mdc_files)
        
        # Migrate each file
        results = []
        for i, source_file in enumerate(mdc_files, 1):
            print(f"[{i}/{len(mdc_files)}] Migrating {source_file.name}...")
            
            if not dry_run:
                result = self.migrate_file(source_file)
                results.append(result)
                
                if result['success']:
                    self.migration_stats['migrated_files'] += 1
                    
                    # Update distribution stats
                    folder = result['target_folder']
                    rule_type = result['rule_type']
                    
                    self.migration_stats['folder_distribution'][folder] = \
                        self.migration_stats['folder_distribution'].get(folder, 0) + 1
                    
                    self.migration_stats['rule_type_distribution'][rule_type] = \
                        self.migration_stats['rule_type_distribution'].get(rule_type, 0) + 1
                    
                    # Track fixes
                    for fix in result['fixes_applied']:
                        self.migration_stats['fixes_applied'][fix] = \
                            self.migration_stats['fixes_applied'].get(fix, 0) + 1
                    
                    print(f"  ✓ Migrated to {result['target_folder']}/{Path(result['target']).name}")
                else:
                    self.migration_stats['failed_files'] += 1
                    print(f"  ✗ Failed: {', '.join(result['errors'])}")
            else:
                # Dry run - just analyze
                try:
                    with open(source_file, 'r', encoding='utf-8') as f:
                        content = f.read()
                    
                    frontmatter, _ = self._extract_or_create_frontmatter(content, source_file)
                    rule_type = self._detect_rule_type(content, frontmatter)
                    target_folder = self._determine_target_folder(content, frontmatter, source_file)
                    target_path = self._generate_target_path(source_file, rule_type, target_folder)
                    
                    print(f"  → Would migrate to {target_folder}/{target_path.name} as {rule_type} rule")
                    
                except Exception as e:
                    print(f"  ✗ Analysis failed: {e}")
        
        self.migration_stats['migration_time'] = (datetime.now() - start_time).total_seconds()
        
        return {
            'analysis': analysis,
            'results': results if not dry_run else [],
            'stats': self.migration_stats,
            'dry_run': dry_run
        }
    
    def generate_migration_report(self, migration_result: Dict[str, Any], output_file: Optional[str] = None) -> str:
        """Generate comprehensive migration report"""
        lines = []
        lines.append("=" * 70)
        lines.append("MDC MIGRATION REPORT")
        lines.append("=" * 70)
        lines.append(f"Generated: {datetime.now().isoformat()}")
        lines.append("")
        
        # Migration summary
        stats = migration_result['stats']
        lines.append("MIGRATION SUMMARY")
        lines.append("-" * 20)
        lines.append(f"Source Directory: {self.source_dir}")
        lines.append(f"Target Directory: {self.target_dir}")
        lines.append(f"Backup Directory: {self.backup_dir}")
        lines.append(f"Migration Time: {stats.get('migration_time', 0):.2f} seconds")
        lines.append("")
        
        # File statistics
        lines.append("FILE STATISTICS")
        lines.append("-" * 15)
        lines.append(f"Total Files: {stats['total_files']}")
        lines.append(f"Successfully Migrated: {stats['migrated_files']}")
        lines.append(f"Failed: {stats['failed_files']}")
        lines.append(f"Skipped: {stats['skipped_files']}")
        
        if stats['total_files'] > 0:
            success_rate = (stats['migrated_files'] / stats['total_files']) * 100
            lines.append(f"Success Rate: {success_rate:.1f}%")
        lines.append("")
        
        # Distribution analysis
        if stats['folder_distribution']:
            lines.append("FOLDER DISTRIBUTION")
            lines.append("-" * 19)
            for folder, count in sorted(stats['folder_distribution'].items()):
                lines.append(f"{folder:12}: {count}")
            lines.append("")
        
        if stats['rule_type_distribution']:
            lines.append("RULE TYPE DISTRIBUTION")
            lines.append("-" * 22)
            for rule_type, count in sorted(stats['rule_type_distribution'].items()):
                lines.append(f"{rule_type:8}: {count}")
            lines.append("")
        
        # Fixes applied
        if stats['fixes_applied']:
            lines.append("FIXES APPLIED")
            lines.append("-" * 13)
            for fix, count in sorted(stats['fixes_applied'].items(), key=lambda x: x[1], reverse=True):
                lines.append(f"{count:3}x {fix}")
            lines.append("")
        
        # Analysis results
        analysis = migration_result['analysis']
        lines.append("PRE-MIGRATION ANALYSIS")
        lines.append("-" * 22)
        lines.append(f"Total Files Found: {analysis['total_files']}")
        lines.append(f"MDC Files: {analysis['mdc_files']}")
        lines.append(f"Files with Frontmatter: {analysis['has_frontmatter']}")
        lines.append(f"Files Missing Frontmatter: {analysis['missing_frontmatter']}")
        lines.append("")
        
        if analysis['rule_types_found']:
            lines.append("Rule Types Found:")
            for rule_type, count in sorted(analysis['rule_types_found'].items()):
                lines.append(f"  {rule_type}: {count}")
            lines.append("")
        
        if analysis['common_issues']:
            lines.append("Common Issues:")
            for issue, count in sorted(analysis['common_issues'].items(), key=lambda x: x[1], reverse=True):
                lines.append(f"  {issue}: {count}")
            lines.append("")
        
        # Individual file results (if not dry run)
        if not migration_result.get('dry_run', False) and migration_result.get('results'):
            lines.append("INDIVIDUAL FILE RESULTS")
            lines.append("-" * 25)
            
            for result in migration_result['results']:
                status = "✓" if result['success'] else "✗"
                source_name = Path(result['source']).name
                
                if result['success']:
                    target_info = f"{result['target_folder']}/{Path(result['target']).name}"
                    lines.append(f"{status} {source_name:30} → {target_info} ({result['rule_type']})")
                    
                    if result['fixes_applied']:
                        for fix in result['fixes_applied']:
                            lines.append(f"    Fix: {fix}")
                else:
                    lines.append(f"{status} {source_name:30} → FAILED")
                    for error in result['errors']:
                        lines.append(f"    Error: {error}")
                
                if result['warnings']:
                    for warning in result['warnings']:
                        lines.append(f"    Warning: {warning}")
                
                lines.append("")
        
        # Recommendations
        lines.append("RECOMMENDATIONS")
        lines.append("-" * 15)
        
        if stats['failed_files'] > 0:
            lines.append("• Review failed migrations and fix manually")
        
        if analysis['missing_frontmatter'] > 0:
            lines.append("• Validate migrated files with mdc_rule_validator.py")
        
        lines.append("• Review rule categorization and adjust if needed")
        lines.append("• Update any references to old file paths")
        lines.append("• Test rules with development tools")
        lines.append("")
        
        report = "\n".join(lines)
        
        if output_file:
            with open(output_file, 'w', encoding='utf-8') as f:
                f.write(report)
            print(f"Migration report written to: {output_file}")
        
        return report

def main():
    parser = argparse.ArgumentParser(description="MDC Migration Script")
    parser.add_argument('source', help="Source directory containing rules to migrate")
    parser.add_argument('--target', default='.cursor/rules', help="Target directory for migrated rules")
    parser.add_argument('--backup', help="Backup directory (default: auto-generated)")
    parser.add_argument('--dry-run', action='store_true', help="Preview migration without making changes")
    parser.add_argument('--report', help="Output file for migration report")
    parser.add_argument('--analyze-only', action='store_true', help="Only analyze existing structure")
    
    args = parser.parse_args()
    
    migrator = MDCMigrationScript(args.source, args.target, args.backup)
    
    if args.analyze_only:
        analysis = migrator.analyze_existing_structure()
        
        print("\nANALYSIS RESULTS")
        print("=" * 50)
        print(f"Total Files: {analysis['total_files']}")
        print(f"MDC Files: {analysis['mdc_files']}")
        print(f"Files with Frontmatter: {analysis['has_frontmatter']}")
        print(f"Files Missing Frontmatter: {analysis['missing_frontmatter']}")
        
        if analysis['rule_types_found']:
            print("\nRule Types Found:")
            for rule_type, count in sorted(analysis['rule_types_found'].items()):
                print(f"  {rule_type}: {count}")
        
        if analysis['common_issues']:
            print("\nCommon Issues:")
            for issue, count in sorted(analysis['common_issues'].items(), key=lambda x: x[1], reverse=True):
                print(f"  {issue}: {count}")
        
        if analysis.get('error'):
            print(f"\nError: {analysis['error']}")
        
    else:
        # Perform migration
        result = migrator.migrate_all(dry_run=args.dry_run)
        
        if 'error' in result:
            print(f"Migration failed: {result['error']}")
            return
        
        # Generate and display report
        report = migrator.generate_migration_report(result, args.report)
        
        if not args.report:
            print(report)

if __name__ == "__main__":
    main() 