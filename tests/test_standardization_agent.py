#!/usr/bin/env python3
"""
Test suite for VANTA Standardization Agent

Tests automated component discovery, compliance analysis, and standardization.
"""

import pytest
import tempfile
import shutil
from pathlib import Path
from unittest.mock import Mock, patch
import json

import sys
sys.path.insert(0, str(Path(__file__).parent.parent / "src"))

from vanta_standardization_agent import (
    VantaStandardizationAgent, ComponentType, ComplianceLevel,
    ComponentManifest, StandardizationReport
)

class TestVantaStandardizationAgent:
    """Test cases for the standardization agent"""

    @pytest.fixture
    def temp_project(self):
        """Create temporary project for testing"""
        temp_dir = tempfile.mkdtemp()
        project_path = Path(temp_dir) / "test_project"
        project_path.mkdir()
        yield project_path
        shutil.rmtree(temp_dir)

    @pytest.fixture
    def agent(self, temp_project):
        """Create standardization agent instance"""
        return VantaStandardizationAgent(str(temp_project))

    def test_initialization(self, agent, temp_project):
        """Test proper initialization"""
        assert agent.project_root == temp_project
        assert isinstance(agent.discovered_components, list)
        assert len(agent.discovered_components) == 0

    def test_component_classification(self, agent):
        """Test component classification logic"""
        test_cases = [
            ("MyAgent", "agent code here", ComponentType.AGENT),
            ("DataHandler", "handler implementation", ComponentType.AGENT),
            ("TaskScheduler", "schedule.every().minute", ComponentType.SCHEDULER),
            ("CronJob", "@scheduled decorator", ComponentType.SCHEDULER),
            ("ValidationRule", "rule type: always", ComponentType.RULE),
            ("WorkflowManager", "workflow steps", ComponentType.WORKFLOW),
            ("RandomClass", "random content", None)
        ]
        
        for name, content, expected in test_cases:
            result = agent._classify_component(name, content)
            assert result == expected

    def test_uap_compliance_checking(self, agent):
        """Test UAP compliance analysis"""
        test_cases = [
            # All required methods present
            (["execute", "validate", "initialize", "cleanup", "extra_method"], 
             ComplianceLevel.COMPLIANT),
            
            # Missing one method
            (["execute", "validate", "initialize"], 
             ComplianceLevel.PARTIAL),
            
            # Missing many methods
            (["execute"], 
             ComplianceLevel.NON_COMPLIANT),
            
            # No required methods
            (["random_method", "another_method"], 
             ComplianceLevel.NON_COMPLIANT)
        ]
        
        for methods, expected in test_cases:
            result = agent._check_uap_compliance(methods, "test content")
            assert result == expected

    def test_mdc_compliance_checking(self, agent):
        """Test MDC format compliance analysis"""
        test_cases = [
            # Compliant MDC format
            ("""# RULE TYPE: Always
# FILE PATTERNS: **/*.py

Rule content here""", ComplianceLevel.COMPLIANT),
            
            # Missing one header
            ("""# RULE TYPE: Always

Rule content here""", ComplianceLevel.PARTIAL),
            
            # Missing both headers
            ("""Rule content without headers""", ComplianceLevel.NON_COMPLIANT)
        ]
        
        for content, expected in test_cases:
            result = agent._check_mdc_compliance(content)
            assert result == expected

    def test_python_file_scanning(self, agent, temp_project):
        """Test scanning of Python files for components"""
        # Create test Python file
        python_file = temp_project / "test_agent.py"
        python_content = '''
class DataProcessingAgent:
    """A test agent for data processing"""
    
    def __init__(self):
        self.name = "DataProcessingAgent"
    
    def execute(self, data):
        """Process the data"""
        return data.upper()
    
    def validate(self, data):
        """Validate input data"""
        return isinstance(data, str)

def helper_function():
    """A helper function"""
    pass

class RegularClass:
    """Not an agent class"""
    
    def regular_method(self):
        pass
'''
        python_file.write_text(python_content)
        
        # Scan the file
        agent._scan_file(python_file)
        
        # Should discover the agent class
        assert len(agent.discovered_components) >= 1
        
        agent_component = next(
            (c for c in agent.discovered_components if c.name == "DataProcessingAgent"),
            None
        )
        
        assert agent_component is not None
        assert agent_component.type == ComponentType.AGENT
        assert "execute" in agent_component.methods
        assert "validate" in agent_component.methods

    def test_rule_file_scanning(self, agent, temp_project):
        """Test scanning of rule files"""
        # Create test rule file
        rule_file = temp_project / "test_rule.mdc"
        rule_content = '''# RULE TYPE: Always
# FILE PATTERNS: **/*.py

## Python Coding Standards

- Use meaningful variable names
- Add docstrings to all functions
- Follow PEP 8 formatting guidelines
'''
        rule_file.write_text(rule_content)
        
        # Scan the file
        agent._scan_file(rule_file)
        
        # Should discover the rule
        assert len(agent.discovered_components) >= 1
        
        rule_component = next(
            (c for c in agent.discovered_components if c.name == "test_rule"),
            None
        )
        
        assert rule_component is not None
        assert rule_component.type == ComponentType.RULE
        assert rule_component.compliance_level == ComplianceLevel.COMPLIANT
        assert rule_component.metadata["rule_type"] == "Always"
        assert rule_component.metadata["file_patterns"] == "**/*.py"

    def test_config_file_scanning(self, agent, temp_project):
        """Test scanning of configuration files"""
        # Create test config file
        config_file = temp_project / "workflow.yaml"
        config_content = '''
name: test_workflow
agents:
  - name: processor
    type: DataAgent
  - name: validator
    type: ValidationAgent
scheduler:
  cron: "0 */6 * * *"
'''
        config_file.write_text(config_content)
        
        # Scan the file
        agent._scan_file(config_file)
        
        # Should discover workflow component
        assert len(agent.discovered_components) >= 1
        
        workflow_component = next(
            (c for c in agent.discovered_components if c.name == "workflow"),
            None
        )
        
        assert workflow_component is not None
        assert workflow_component.type == ComponentType.WORKFLOW

    def test_full_codebase_scan(self, agent, temp_project):
        """Test complete codebase scanning"""
        # Create a complex project structure
        
        # Python agents
        agents_dir = temp_project / "agents"
        agents_dir.mkdir()
        
        agent_file = agents_dir / "my_agent.py"
        agent_content = '''
class MyCustomAgent:
    def execute(self):
        pass
    
    def validate(self):
        pass
        
class IncompleteAgent:
    def execute(self):
        pass
'''
        agent_file.write_text(agent_content)
        
        # Rule files
        rules_dir = temp_project / ".cursor" / "rules"
        rules_dir.mkdir(parents=True)
        
        rule_file = rules_dir / "python_rules.mdc"
        rule_content = '''# RULE TYPE: Always
# FILE PATTERNS: **/*.py

Python development standards'''
        rule_file.write_text(rule_content)
        
        incomplete_rule = rules_dir / "incomplete.mdc"
        incomplete_rule.write_text("Missing headers")
        
        # Scheduler file
        scheduler_file = temp_project / "scheduler.py"
        scheduler_content = '''
import schedule

class TaskScheduler:
    def __init__(self):
        schedule.every().hour.do(self.run_task)
    
    def run_task(self):
        pass
'''
        scheduler_file.write_text(scheduler_content)
        
        # Run full scan
        report = agent.scan_codebase()
        
        # Verify comprehensive results
        assert report.total_components >= 4
        assert ComponentType.AGENT.value in report.components_by_type
        assert ComponentType.RULE.value in report.components_by_type
        assert ComponentType.SCHEDULER.value in report.components_by_type
        
        # Check compliance levels
        assert ComplianceLevel.COMPLIANT.value in report.compliance_summary
        assert ComplianceLevel.PARTIAL.value in report.compliance_summary
        assert ComplianceLevel.NON_COMPLIANT.value in report.compliance_summary

    def test_recommendation_generation(self, agent):
        """Test standardization recommendation generation"""
        # Test agent recommendations
        agent_recommendations = agent._generate_recommendations(
            ComponentType.AGENT, 
            ["execute", "validate"],  # Missing some UAP methods
            "class TestAgent: pass"
        )
        
        assert len(agent_recommendations) > 0
        assert any("initialize" in rec for rec in agent_recommendations)
        assert any("cleanup" in rec for rec in agent_recommendations)
        
        # Test rule recommendations
        rule_recommendations = agent._generate_mdc_recommendations(
            "Rule content without proper headers"
        )
        
        assert len(rule_recommendations) > 0
        assert any("RULE TYPE" in rec for rec in rule_recommendations)
        assert any("FILE PATTERNS" in rec for rec in rule_recommendations)

    def test_manifest_export(self, agent, temp_project):
        """Test exporting component manifests"""
        # Add some test components
        test_manifest = ComponentManifest(
            name="TestAgent",
            type=ComponentType.AGENT,
            file_path=str(temp_project / "test.py"),
            line_start=1,
            line_end=10,
            methods=["execute", "validate"],
            dependencies=["BaseAgent"],
            interfaces=["AgentInterface"],
            metadata={"source_type": "python_class"},
            compliance_level=ComplianceLevel.PARTIAL,
            standardization_recommendations=["Add initialize method"]
        )
        
        agent.discovered_components.append(test_manifest)
        
        # Export manifests
        output_dir = temp_project / "manifests"
        agent.export_manifests(output_dir)
        
        # Check that files were created
        assert output_dir.exists()
        manifest_files = list(output_dir.glob("*.json"))
        assert len(manifest_files) >= 1
        
        # Check report file
        report_file = output_dir / "standardization_report.json"
        assert report_file.exists()
        
        # Verify content
        with open(report_file) as f:
            report_data = json.load(f)
        
        assert "total_components" in report_data
        assert "components_by_type" in report_data

    def test_error_handling_invalid_python(self, agent, temp_project):
        """Test handling of invalid Python files"""
        # Create invalid Python file
        invalid_file = temp_project / "invalid.py"
        invalid_file.write_text("invalid python syntax [[[")
        
        # Should not crash
        agent._scan_file(invalid_file)
        
        # May or may not find components via pattern matching
        # But should not raise exceptions

    def test_recursive_directory_scanning(self, agent, temp_project):
        """Test recursive directory structure scanning"""
        # Create nested structure
        nested_dirs = [
            "src/agents",
            "src/rules", 
            "tests/unit",
            "tests/integration",
            "config/environments"
        ]
        
        for dir_path in nested_dirs:
            (temp_project / dir_path).mkdir(parents=True)
        
        # Add files in various locations
        files_to_create = [
            ("src/agents/processor.py", "class ProcessorAgent: pass"),
            ("src/rules/quality.mdc", "# RULE TYPE: Always\n# FILE PATTERNS: **/*"),
            ("tests/unit/test_agent.py", "class TestAgent: pass"),
            ("config/environments/prod.yaml", "agent_config: true")
        ]
        
        for file_path, content in files_to_create:
            (temp_project / file_path).write_text(content)
        
        # Scan should find components in all locations
        report = agent.scan_codebase()
        
        assert report.total_components >= len(files_to_create)

    def test_coe_delegation_suggestions(self, agent):
        """Test Coalition of Experts delegation logic"""
        # Create component with many recommendations (complex case)
        complex_manifest = ComponentManifest(
            name="ComplexAgent",
            type=ComponentType.AGENT,
            file_path="complex.py",
            line_start=1,
            line_end=100,
            methods=["execute"],
            dependencies=[],
            interfaces=[],
            metadata={},
            compliance_level=ComplianceLevel.NON_COMPLIANT,
            standardization_recommendations=[
                "Add initialize method",
                "Add cleanup method", 
                "Add validate method",
                "Implement error handling",
                "Add logging",
                "Add documentation",
                "Refactor large methods",
                "Add unit tests"  # 8 recommendations - should trigger CoE
            ]
        )
        
        agent.discovered_components.append(complex_manifest)
        
        report = agent._generate_standardization_report()
        
        assert len(report.coe_delegation_suggestions) > 0
        assert any("CoE" in suggestion for suggestion in report.coe_delegation_suggestions)

    def test_pattern_based_fallback_scanning(self, agent, temp_project):
        """Test pattern-based scanning fallback for unparseable files"""
        # Create file with syntax errors but detectable patterns
        pattern_file = temp_project / "pattern_test.py"
        pattern_content = '''
# This file has syntax errors but contains patterns

class SomeAgent:  # Should be detected
    def __init__(self
        # Syntax error - missing closing paren

def some_agent_function():  # Should be detected
    pass

# @scheduled decorator should be detected
@scheduled
def scheduled_task():
    pass
'''
        pattern_file.write_text(pattern_content)
        
        # Should fall back to pattern scanning
        agent._scan_file(pattern_file)
        
        # Should find components via patterns
        agent_components = [c for c in agent.discovered_components 
                           if c.type == ComponentType.AGENT]
        scheduler_components = [c for c in agent.discovered_components 
                              if c.type == ComponentType.SCHEDULER]
        
        assert len(agent_components) >= 1
        assert len(scheduler_components) >= 1

    def test_interface_extraction(self, agent, temp_project):
        """Test extraction of interface information"""
        interface_file = temp_project / "interfaces.py"
        interface_content = '''
from abc import ABC, abstractmethod

class AgentInterface(ABC):
    
    @abstractmethod
    def execute(self):
        pass
        
    @abstractmethod
    def validate(self):
        pass

class ConcreteAgent(AgentInterface):
    
    def execute(self):
        return "executed"
    
    def validate(self):
        return True
        
    @interface
    def custom_interface_method(self):
        pass
'''
        interface_file.write_text(interface_content)
        
        agent._scan_file(interface_file)
        
        # Find the concrete agent
        concrete_agent = next(
            (c for c in agent.discovered_components if c.name == "ConcreteAgent"),
            None
        )
        
        assert concrete_agent is not None
        assert len(concrete_agent.interfaces) >= 1

class TestStandardizationReport:
    """Test standardization report functionality"""

    def test_report_generation(self):
        """Test generation of comprehensive reports"""
        # Create mock agent with sample components
        agent = VantaStandardizationAgent()
        
        # Add sample components
        sample_components = [
            ComponentManifest(
                name="Agent1", type=ComponentType.AGENT, 
                file_path="agent1.py", line_start=1, line_end=10,
                methods=[], dependencies=[], interfaces=[], metadata={},
                compliance_level=ComplianceLevel.COMPLIANT,
                standardization_recommendations=[]
            ),
            ComponentManifest(
                name="Agent2", type=ComponentType.AGENT,
                file_path="agent2.py", line_start=1, line_end=10,
                methods=[], dependencies=[], interfaces=[], metadata={},
                compliance_level=ComplianceLevel.NON_COMPLIANT,
                standardization_recommendations=["Fix compliance"]
            ),
            ComponentManifest(
                name="Rule1", type=ComponentType.RULE,
                file_path="rule1.mdc", line_start=1, line_end=5,
                methods=[], dependencies=[], interfaces=[], metadata={},
                compliance_level=ComplianceLevel.PARTIAL,
                standardization_recommendations=[]
            )
        ]
        
        agent.discovered_components = sample_components
        
        report = agent._generate_standardization_report()
        
        assert report.total_components == 3
        assert report.components_by_type[ComponentType.AGENT.value] == 2
        assert report.components_by_type[ComponentType.RULE.value] == 1
        assert report.compliance_summary[ComplianceLevel.COMPLIANT.value] == 1
        assert report.compliance_summary[ComplianceLevel.NON_COMPLIANT.value] == 1
        assert report.compliance_summary[ComplianceLevel.PARTIAL.value] == 1

    def test_report_display(self, capsys):
        """Test report display functionality"""
        agent = VantaStandardizationAgent()
        
        # Create sample report
        report = StandardizationReport(
            scan_timestamp="2024-01-01T00:00:00",
            total_components=5,
            components_by_type={
                ComponentType.AGENT.value: 3,
                ComponentType.RULE.value: 2
            },
            compliance_summary={
                ComplianceLevel.COMPLIANT.value: 3,
                ComplianceLevel.PARTIAL.value: 1,
                ComplianceLevel.NON_COMPLIANT.value: 1
            },
            discovered_components=[],
            standardization_actions=["Standardize 1 non-compliant component"],
            coe_delegation_suggestions=["Complex case needs CoE review"]
        )
        
        agent.display_report(report)
        
        # Capture output would normally be tested here
        # For now, just verify no exceptions are raised

if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 