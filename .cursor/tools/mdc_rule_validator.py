#!/usr/bin/env python3
"""
MDC Rule Validator - Step 1 of 4
Validates MDC rule files for format compliance and best practices
"""

import os
import re
import yaml
import json
import argparse
import glob
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime

@dataclass
class ValidationResult:
    file_path: str
    is_valid: bool
    rule_type: Optional[str] = None
    errors: List[str] = None
    warnings: List[str] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.errors is None:
            self.errors = []
        if self.warnings is None:
            self.warnings = []
        if self.metadata is None:
            self.metadata = {}

class MDCRuleValidator:
    """Comprehensive MDC Rule Validator following UAP Level 2 standards"""
    
    REQUIRED_FRONTMATTER_FIELDS = {
        'always': ['description', 'alwaysApply'],
        'auto': ['description', 'globs'],
        'agent': ['description'],
        'manual': ['description']
    }
    
    RULE_TYPE_PATTERNS = {
        'always': [
            r'RULE TYPE:\s*Always',
            r'alwaysApply:\s*true',
            r'type:\s*always'
        ],
        'auto': [
            r'RULE TYPE:\s*Auto',
            r'globs:\s*\[',
            r'type:\s*auto'
        ],
        'agent': [
            r'RULE TYPE:\s*Agent',
            r'agents:\s*\[',
            r'type:\s*agent'
        ],
        'manual': [
            r'RULE TYPE:\s*Manual',
            r'type:\s*manual'
        ]
    }
    
    def __init__(self, verbose: bool = False):
        self.verbose = verbose
        self.validation_stats = {
            'total_files': 0,
            'valid_files': 0,
            'invalid_files': 0,
            'rule_types': {},
            'common_errors': {},
            'validation_time': None
        }
    
    def validate_file(self, file_path: str) -> ValidationResult:
        """Validate a single MDC rule file"""
        result = ValidationResult(file_path=file_path, is_valid=False)
        
        try:
            if not os.path.exists(file_path):
                result.errors.append(f"File does not exist: {file_path}")
                return result
            
            with open(file_path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Check if file is empty
            if not content.strip():
                result.errors.append("File is empty")
                return result
            
            # Validate frontmatter
            frontmatter_result = self._validate_frontmatter(content)
            if frontmatter_result['errors']:
                result.errors.extend(frontmatter_result['errors'])
            if frontmatter_result['warnings']:
                result.warnings.extend(frontmatter_result['warnings'])
            
            # Determine rule type
            rule_type = self._determine_rule_type(content, frontmatter_result.get('frontmatter', {}))
            result.rule_type = rule_type
            
            # Validate rule-specific requirements
            type_validation = self._validate_rule_type_requirements(content, rule_type, frontmatter_result.get('frontmatter', {}))
            if type_validation['errors']:
                result.errors.extend(type_validation['errors'])
            if type_validation['warnings']:
                result.warnings.extend(type_validation['warnings'])
            
            # Validate content structure
            content_validation = self._validate_content_structure(content)
            if content_validation['errors']:
                result.errors.extend(content_validation['errors'])
            if content_validation['warnings']:
                result.warnings.extend(content_validation['warnings'])
            
            # Validate glob patterns if present
            if 'globs' in frontmatter_result.get('frontmatter', {}):
                glob_validation = self._validate_glob_patterns(frontmatter_result['frontmatter']['globs'])
                if glob_validation['errors']:
                    result.errors.extend(glob_validation['errors'])
                if glob_validation['warnings']:
                    result.warnings.extend(glob_validation['warnings'])
            
            # Set metadata
            result.metadata = {
                'file_size': len(content),
                'line_count': len(content.splitlines()),
                'has_frontmatter': frontmatter_result.get('has_frontmatter', False),
                'frontmatter_fields': list(frontmatter_result.get('frontmatter', {}).keys()),
                'rule_type': rule_type,
                'last_modified': datetime.fromtimestamp(os.path.getmtime(file_path)).isoformat()
            }
            
            # Final validation status
            result.is_valid = len(result.errors) == 0
            
        except Exception as e:
            result.errors.append(f"Validation error: {str(e)}")
        
        return result
    
    def _validate_frontmatter(self, content: str) -> Dict[str, Any]:
        """Validate YAML frontmatter"""
        result = {'has_frontmatter': False, 'frontmatter': {}, 'errors': [], 'warnings': []}
        
        # Check for frontmatter delimiters
        if not content.startswith('---'):
            result['warnings'].append("No YAML frontmatter found (recommended for better organization)")
            return result
        
        # Extract frontmatter
        parts = content.split('---', 2)
        if len(parts) < 3:
            result['errors'].append("Invalid frontmatter structure - missing closing ---")
            return result
        
        try:
            frontmatter = yaml.safe_load(parts[1])
            if not isinstance(frontmatter, dict):
                result['errors'].append("Frontmatter must be a YAML dictionary")
                return result
            
            result['has_frontmatter'] = True
            result['frontmatter'] = frontmatter
            
            # Validate common frontmatter fields
            if 'description' not in frontmatter:
                result['warnings'].append("Missing 'description' field in frontmatter")
            
            if 'globs' in frontmatter and not isinstance(frontmatter['globs'], (list, str)):
                result['errors'].append("'globs' field must be a string or list")
            
            if 'alwaysApply' in frontmatter and not isinstance(frontmatter['alwaysApply'], bool):
                result['errors'].append("'alwaysApply' field must be a boolean")
            
        except yaml.YAMLError as e:
            result['errors'].append(f"Invalid YAML in frontmatter: {str(e)}")
        
        return result
    
    def _determine_rule_type(self, content: str, frontmatter: Dict[str, Any]) -> Optional[str]:
        """Determine the type of MDC rule"""
        
        # Check frontmatter type field first
        if 'type' in frontmatter:
            return frontmatter['type']
        
        # Check for explicit rule type declarations
        for rule_type, patterns in self.RULE_TYPE_PATTERNS.items():
            for pattern in patterns:
                if re.search(pattern, content, re.IGNORECASE):
                    return rule_type
        
        # Infer from frontmatter fields
        if frontmatter.get('alwaysApply') is True:
            return 'always'
        elif 'globs' in frontmatter:
            return 'auto'
        elif 'agents' in frontmatter:
            return 'agent'
        else:
            return 'manual'  # Default fallback
    
    def _validate_rule_type_requirements(self, content: str, rule_type: str, frontmatter: Dict[str, Any]) -> Dict[str, Any]:
        """Validate requirements specific to each rule type"""
        result = {'errors': [], 'warnings': []}
        
        if not rule_type:
            result['warnings'].append("Could not determine rule type")
            return result
        
        required_fields = self.REQUIRED_FRONTMATTER_FIELDS.get(rule_type, [])
        for field in required_fields:
            if field not in frontmatter:
                result['errors'].append(f"Missing required field '{field}' for {rule_type} rule")
        
        # Type-specific validations
        if rule_type == 'always':
            if not frontmatter.get('alwaysApply'):
                result['errors'].append("Always rules must have 'alwaysApply: true' in frontmatter")
        
        elif rule_type == 'auto':
            if 'globs' not in frontmatter:
                result['errors'].append("Auto rules must specify 'globs' in frontmatter")
        
        elif rule_type == 'agent':
            if 'agents' not in frontmatter and 'agent' not in frontmatter:
                result['warnings'].append("Agent rules should specify target agents")
        
        return result
    
    def _validate_content_structure(self, content: str) -> Dict[str, Any]:
        """Validate the overall content structure"""
        result = {'errors': [], 'warnings': []}
        
        lines = content.splitlines()
        
        # Check for minimum content
        if len(lines) < 5:
            result['warnings'].append("Rule content seems very short")
        
        # Check for headings
        has_headings = any(line.strip().startswith('#') for line in lines)
        if not has_headings:
            result['warnings'].append("No markdown headings found - consider adding structure")
        
        # Check for examples
        has_examples = any('example' in line.lower() for line in lines)
        if not has_examples:
            result['warnings'].append("No examples found - consider adding usage examples")
        
        # Check for common markdown issues
        for i, line in enumerate(lines, 1):
            if line.strip().endswith('  ') and not line.strip().endswith('  '):
                result['warnings'].append(f"Line {i}: Trailing whitespace")
        
        return result
    
    def _validate_glob_patterns(self, globs: Any) -> Dict[str, Any]:
        """Validate glob patterns"""
        result = {'errors': [], 'warnings': []}
        
        if isinstance(globs, str):
            globs = [globs]
        elif not isinstance(globs, list):
            result['errors'].append("Globs must be a string or list of strings")
            return result
        
        for glob_pattern in globs:
            if not isinstance(glob_pattern, str):
                result['errors'].append(f"Invalid glob pattern (not a string): {glob_pattern}")
                continue
            
            # Check for common glob pattern issues
            if glob_pattern.startswith('/'):
                result['warnings'].append(f"Absolute path in glob pattern: {glob_pattern}")
            
            if '..' in glob_pattern:
                result['warnings'].append(f"Parent directory reference in glob: {glob_pattern}")
        
        return result
    
    def validate_directory(self, directory: str, pattern: str = "*.mdc") -> List[ValidationResult]:
        """Validate all MDC files in a directory"""
        results = []
        
        if not os.path.exists(directory):
            return [ValidationResult(file_path=directory, is_valid=False, errors=[f"Directory does not exist: {directory}"])]
        
        # Find all matching files
        search_pattern = os.path.join(directory, "**", pattern)
        files = glob.glob(search_pattern, recursive=True)
        
        self.validation_stats['total_files'] = len(files)
        start_time = datetime.now()
        
        for file_path in files:
            if self.verbose:
                print(f"Validating: {file_path}")
            
            result = self.validate_file(file_path)
            results.append(result)
            
            # Update stats
            if result.is_valid:
                self.validation_stats['valid_files'] += 1
            else:
                self.validation_stats['invalid_files'] += 1
            
            # Track rule types
            if result.rule_type:
                self.validation_stats['rule_types'][result.rule_type] = \
                    self.validation_stats['rule_types'].get(result.rule_type, 0) + 1
            
            # Track common errors
            for error in result.errors:
                self.validation_stats['common_errors'][error] = \
                    self.validation_stats['common_errors'].get(error, 0) + 1
        
        self.validation_stats['validation_time'] = (datetime.now() - start_time).total_seconds()
        return results
    
    def generate_report(self, results: List[ValidationResult], output_format: str = 'text') -> str:
        """Generate a validation report"""
        
        if output_format == 'json':
            return self._generate_json_report(results)
        else:
            return self._generate_text_report(results)
    
    def _generate_text_report(self, results: List[ValidationResult]) -> str:
        """Generate a human-readable text report"""
        lines = []
        lines.append("=" * 60)
        lines.append("MDC Rule Validation Report")
        lines.append("=" * 60)
        lines.append(f"Generated: {datetime.now().isoformat()}")
        lines.append("")
        
        # Summary
        lines.append("SUMMARY")
        lines.append("-" * 20)
        lines.append(f"Total files: {self.validation_stats['total_files']}")
        lines.append(f"Valid files: {self.validation_stats['valid_files']}")
        lines.append(f"Invalid files: {self.validation_stats['invalid_files']}")
        
        if self.validation_stats['total_files'] > 0:
            health_score = (self.validation_stats['valid_files'] / self.validation_stats['total_files']) * 100
            lines.append(f"Health Score: {health_score:.1f}%")
        
        lines.append(f"Validation time: {self.validation_stats.get('validation_time', 0):.2f}s")
        lines.append("")
        
        # Rule type distribution
        if self.validation_stats['rule_types']:
            lines.append("RULE TYPE DISTRIBUTION")
            lines.append("-" * 25)
            for rule_type, count in sorted(self.validation_stats['rule_types'].items()):
                lines.append(f"{rule_type:10}: {count}")
            lines.append("")
        
        # Common errors
        if self.validation_stats['common_errors']:
            lines.append("COMMON ERRORS")
            lines.append("-" * 15)
            for error, count in sorted(self.validation_stats['common_errors'].items(), 
                                     key=lambda x: x[1], reverse=True)[:10]:
                lines.append(f"{count:3}x {error}")
            lines.append("")
        
        # Individual file results
        lines.append("DETAILED RESULTS")
        lines.append("-" * 20)
        
        for result in results:
            status = "✓ VALID" if result.is_valid else "✗ INVALID"
            lines.append(f"{status:10} {result.file_path}")
            
            if result.rule_type:
                lines.append(f"           Type: {result.rule_type}")
            
            for error in result.errors:
                lines.append(f"           ERROR: {error}")
            
            for warning in result.warnings:
                lines.append(f"           WARN:  {warning}")
            
            lines.append("")
        
        return "\n".join(lines)
    
    def _generate_json_report(self, results: List[ValidationResult]) -> str:
        """Generate a JSON report"""
        report = {
            'timestamp': datetime.now().isoformat(),
            'summary': self.validation_stats,
            'results': [asdict(result) for result in results]
        }
        return json.dumps(report, indent=2)

def main():
    parser = argparse.ArgumentParser(description="MDC Rule Validator")
    parser.add_argument('path', help="File or directory to validate")
    parser.add_argument('--pattern', default="*.mdc", help="File pattern to match (default: *.mdc)")
    parser.add_argument('--format', choices=['text', 'json'], default='text', help="Output format")
    parser.add_argument('--output', help="Output file (default: stdout)")
    parser.add_argument('--verbose', '-v', action='store_true', help="Verbose output")
    
    args = parser.parse_args()
    
    validator = MDCRuleValidator(verbose=args.verbose)
    
    if os.path.isfile(args.path):
        results = [validator.validate_file(args.path)]
        validator.validation_stats['total_files'] = 1
        if results[0].is_valid:
            validator.validation_stats['valid_files'] = 1
        else:
            validator.validation_stats['invalid_files'] = 1
    else:
        results = validator.validate_directory(args.path, args.pattern)
    
    report = validator.generate_report(results, args.format)
    
    if args.output:
        with open(args.output, 'w') as f:
            f.write(report)
        print(f"Report written to: {args.output}")
    else:
        print(report)

if __name__ == "__main__":
    main() 