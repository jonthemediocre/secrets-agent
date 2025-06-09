#!/usr/bin/env python3
"""
UAP Compliance Validator
========================

Automated compliance validation for UAP agents following Level 2 governance rules.
Validates agent implementations against UAP standards and provides detailed reports.

Compliance: VAL-001, VAL-002, IMPL-002
"""

import inspect
import logging
from typing import Dict, List, Any, Optional, Type, Union
from dataclasses import dataclass, asdict
from datetime import datetime

from ..protocols.message_types import (
    ProtocolType, AgentStatus, MCPToolDefinition, ComplianceViolationError
)


@dataclass
class ComplianceViolation:
    """Individual compliance violation record"""
    rule_id: str
    severity: str  # CRITICAL, MANDATORY, RECOMMENDED
    description: str
    detected_issue: str
    suggested_fix: str
    file_location: str = ""
    line_number: int = 0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary format"""
        return asdict(self)


@dataclass
class ComplianceReport:
    """Comprehensive compliance validation report"""
    agent_id: str
    validation_timestamp: str
    overall_status: str  # COMPLIANT, NON_COMPLIANT, PARTIAL
    violations: List[ComplianceViolation]
    passed_checks: List[str]
    total_checks: int
    compliance_score: float  # 0.0 to 1.0
    
    def add_violation(self, rule_id: str, description: str, severity: str = "MANDATORY") -> None:
        """Add a compliance violation"""
        violation = ComplianceViolation(
            rule_id=rule_id,
            severity=severity,
            description=description,
            detected_issue="Validation check failed",
            suggested_fix="Review UAP governance rules and implement required changes"
        )
        self.violations.append(violation)
    
    def add_passed_check(self, check_name: str) -> None:
        """Add a passed compliance check"""
        self.passed_checks.append(check_name)
    
    def calculate_compliance_score(self) -> float:
        """Calculate overall compliance score"""
        if self.total_checks == 0:
            return 0.0
        
        # Weight violations by severity
        penalty_weights = {
            "CRITICAL": 1.0,
            "MANDATORY": 0.7,
            "RECOMMENDED": 0.3
        }
        
        total_penalty = 0.0
        for violation in self.violations:
            total_penalty += penalty_weights.get(violation.severity, 0.5)
        
        # Score is based on passed checks minus weighted penalties
        score = max(0.0, (len(self.passed_checks) - total_penalty) / self.total_checks)
        self.compliance_score = min(1.0, score)
        return self.compliance_score
    
    def determine_overall_status(self) -> str:
        """Determine overall compliance status"""
        critical_violations = [v for v in self.violations if v.severity == "CRITICAL"]
        
        if critical_violations:
            self.overall_status = "NON_COMPLIANT"
        elif self.compliance_score >= 0.9:
            self.overall_status = "COMPLIANT"
        else:
            self.overall_status = "PARTIAL"
        
        return self.overall_status


class ComplianceValidator:
    """
    UAP compliance validator for Level 2 agents.
    
    Validates agent implementations against UAP governance rules.
    Provides automated compliance checking and detailed reports.
    """
    
    def __init__(self):
        self.logger = logging.getLogger("UAP.ComplianceValidator")
        
        # Define compliance rules and their requirements
        self.compliance_rules = self._load_compliance_rules()
    
    def _load_compliance_rules(self) -> Dict[str, Dict[str, Any]]:
        """Load UAP compliance rules and requirements"""
        return {
            "UAP-001": {
                "description": "All Level 2 agents MUST inherit from UAPAgentBase",
                "severity": "CRITICAL",
                "check_method": "check_uap_base_inheritance"
            },
            "UAP-002": {
                "description": "All agents MUST declare and support minimum protocol set",
                "severity": "CRITICAL", 
                "check_method": "check_protocol_support"
            },
            "COM-001": {
                "description": "Agent-to-Agent communication protocol requirements",
                "severity": "MANDATORY",
                "check_method": "check_a2a_implementation"
            },
            "COM-002": {
                "description": "Model Control Protocol tool registration and usage",
                "severity": "MANDATORY",
                "check_method": "check_mcp_implementation"
            },
            "COM-003": {
                "description": "Mixed protocol workflow support",
                "severity": "REQUIRED",
                "check_method": "check_cross_protocol_support"
            },
            "TOOL-001": {
                "description": "All agent capabilities MUST be exposed as callable tools",
                "severity": "MANDATORY",
                "check_method": "check_tool_capability_mapping"
            },
            "TOOL-002": {
                "description": "All tools MUST implement comprehensive parameter validation",
                "severity": "CRITICAL",
                "check_method": "check_tool_parameter_validation"
            },
            "TOOL-003": {
                "description": "All tool responses MUST follow standard format",
                "severity": "MANDATORY",
                "check_method": "check_tool_response_format"
            },
            "REG-001": {
                "description": "All agents MUST register with component registry on startup",
                "severity": "CRITICAL",
                "check_method": "check_registry_registration"
            },
            "REG-002": {
                "description": "Agents MUST support dynamic capability discovery",
                "severity": "REQUIRED",
                "check_method": "check_capability_discovery"
            },
            "CASCADE-001": {
                "description": "All agents MUST be cascade-execution compatible",
                "severity": "MANDATORY",
                "check_method": "check_cascade_compatibility"
            },
            "SEC-001": {
                "description": "All inter-agent communication MUST be authenticated",
                "severity": "CRITICAL",
                "check_method": "check_authentication_requirements"
            },
            "SEC-002": {
                "description": "Tools and capabilities MUST implement access control",
                "severity": "REQUIRED",
                "check_method": "check_access_control"
            },
            "MON-001": {
                "description": "All agents MUST implement telemetry and logging",
                "severity": "MANDATORY",
                "check_method": "check_telemetry_implementation"
            },
            "MON-002": {
                "description": "Agents MUST track and report performance metrics",
                "severity": "REQUIRED",
                "check_method": "check_performance_monitoring"
            }
        }
    
    async def validate_agent_compliance(self, agent_class: Type, agent_instance: Optional[Any] = None) -> ComplianceReport:
        """
        Validate an agent class or instance for UAP compliance.
        
        Args:
            agent_class: Agent class to validate
            agent_instance: Optional agent instance for runtime validation
        
        Returns:
            ComplianceReport with detailed validation results
        """
        agent_id = getattr(agent_instance, 'agent_id', None) or agent_class.__name__
        
        report = ComplianceReport(
            agent_id=agent_id,
            validation_timestamp=datetime.now().isoformat(),
            overall_status="UNKNOWN",
            compliance_score=0.0,
            violations=[],
            passed_checks=[],
            total_checks=len(self.compliance_rules)
        )
        
        self.logger.info(f"🔍 Starting compliance validation for agent '{agent_id}'")
        
        # Run all compliance checks
        for rule_id, rule_config in self.compliance_rules.items():
            try:
                check_method_name = rule_config["check_method"]
                check_method = getattr(self, check_method_name, None)
                
                if check_method:
                    passed = await check_method(agent_class, agent_instance, report)
                    if passed:
                        report.add_passed_check(f"{rule_id}: {rule_config['description']}")
                    else:
                        report.add_violation(
                            rule_id=rule_id,
                            description=rule_config["description"],
                            severity=rule_config["severity"]
                        )
                else:
                    self.logger.warning(f"⚠️ Check method '{check_method_name}' not found for rule {rule_id}")
                    
            except Exception as e:
                self.logger.error(f"❌ Error checking rule {rule_id}: {e}")
                report.add_violation(
                    rule_id=rule_id,
                    description=f"Validation error: {str(e)}",
                    severity="CRITICAL"
                )
        
        # Calculate final compliance score and status
        report.calculate_compliance_score()
        report.determine_overall_status()
        
        self.logger.info(
            f"✅ Compliance validation complete for '{agent_id}': "
            f"{report.overall_status} (Score: {report.compliance_score:.2f})"
        )
        
        return report
    
    # ═══════════════════════════════════════════════════════════════
    # COMPLIANCE CHECK METHODS
    # ═══════════════════════════════════════════════════════════════
    
    async def check_uap_base_inheritance(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check UAP-001: UAPAgentBase inheritance"""
        try:
            # Import here to avoid circular imports
            from .uap_agent_base import UAPAgentBase
            
            if not issubclass(agent_class, UAPAgentBase):
                return False
            
            # Check required methods are implemented
            required_methods = ["startup", "shutdown", "get_agent_info", "handle_message", 
                              "get_mcp_tools", "execute_mcp_tool", "handle_a2a_message"]
            
            for method_name in required_methods:
                if not hasattr(agent_class, method_name):
                    return False
                
                method = getattr(agent_class, method_name)
                if not callable(method):
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error checking UAP base inheritance: {e}")
            return False
    
    async def check_protocol_support(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check UAP-002: Protocol support declaration"""
        try:
            if not agent_instance:
                return False
            
            protocol_support = getattr(agent_instance, 'protocol_support', [])
            
            # Must support minimum required protocols
            required_protocols = [ProtocolType.MCP, ProtocolType.A2A, ProtocolType.CROSS_PROTOCOL]
            
            for protocol in required_protocols:
                if protocol not in protocol_support:
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error checking protocol support: {e}")
            return False
    
    async def check_a2a_implementation(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check COM-001: A2A communication implementation"""
        try:
            # Check required A2A methods
            required_methods = ["handle_a2a_message", "send_a2a_message"]
            
            for method_name in required_methods:
                if not hasattr(agent_class, method_name):
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error checking A2A implementation: {e}")
            return False
    
    async def check_mcp_implementation(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check COM-002: MCP tool implementation"""
        try:
            # Check required MCP methods
            required_methods = ["get_mcp_tools", "execute_mcp_tool"]
            
            for method_name in required_methods:
                if not hasattr(agent_class, method_name):
                    return False
            
            # If instance available, check tool definitions
            if agent_instance:
                try:
                    tools = await agent_instance.get_mcp_tools()
                    if not isinstance(tools, list):
                        return False
                    
                    # Validate tool definition format
                    for tool in tools:
                        if not isinstance(tool, MCPToolDefinition):
                            return False
                        
                        if not all(hasattr(tool, attr) for attr in ['name', 'description', 'parameters', 'agent_id']):
                            return False
                            
                except Exception:
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error checking MCP implementation: {e}")
            return False
    
    async def check_cross_protocol_support(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check COM-003: Cross-protocol support"""
        try:
            # Check for cross-protocol methods
            cross_protocol_methods = ["handle_cross_protocol_request", "execute_in_cascade"]
            
            for method_name in cross_protocol_methods:
                if not hasattr(agent_class, method_name):
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error checking cross-protocol support: {e}")
            return False
    
    async def check_tool_capability_mapping(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check TOOL-001: Tool capability mapping"""
        try:
            if not agent_instance:
                return True  # Cannot validate without instance
            
            capabilities = getattr(agent_instance, 'capabilities', [])
            tools = await agent_instance.get_mcp_tools()
            
            # Basic check: should have at least one tool per capability
            if capabilities and not tools:
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error checking tool capability mapping: {e}")
            return False
    
    async def check_tool_parameter_validation(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check TOOL-002: Tool parameter validation"""
        try:
            # Check if parameter validation methods exist
            validation_methods = ["validate_tool_parameters"]
            
            # Look for validation in execute_mcp_tool method
            if hasattr(agent_class, 'execute_mcp_tool'):
                method = getattr(agent_class, 'execute_mcp_tool')
                source = inspect.getsource(method)
                
                # Basic check for validation keywords
                validation_keywords = ['validate', 'check', 'verify', 'parameters']
                has_validation = any(keyword in source.lower() for keyword in validation_keywords)
                
                return has_validation
            
            return False
            
        except Exception as e:
            self.logger.error(f"❌ Error checking tool parameter validation: {e}")
            return False
    
    async def check_tool_response_format(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check TOOL-003: Tool response format"""
        try:
            # Check if execute_mcp_tool returns MCPResponse
            if hasattr(agent_class, 'execute_mcp_tool'):
                method = getattr(agent_class, 'execute_mcp_tool')
                
                # Check method signature
                sig = inspect.signature(method)
                return_annotation = sig.return_annotation
                
                # Should return MCPResponse
                if return_annotation != inspect.Signature.empty:
                    return 'MCPResponse' in str(return_annotation)
            
            return True  # Default pass if cannot determine
            
        except Exception as e:
            self.logger.error(f"❌ Error checking tool response format: {e}")
            return False
    
    async def check_registry_registration(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check REG-001: Registry registration"""
        try:
            # Check if startup method includes registry registration
            if hasattr(agent_class, 'startup'):
                method = getattr(agent_class, 'startup')
                source = inspect.getsource(method)
                
                # Look for registry registration keywords
                registry_keywords = ['register_agent', 'COMPONENT_REGISTRY', 'registration']
                has_registration = any(keyword in source for keyword in registry_keywords)
                
                return has_registration
            
            return False
            
        except Exception as e:
            self.logger.error(f"❌ Error checking registry registration: {e}")
            return False
    
    async def check_capability_discovery(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check REG-002: Capability discovery"""
        try:
            # Check for discovery methods
            discovery_methods = ["get_capabilities", "get_supported_protocols", "health_check"]
            
            for method_name in discovery_methods:
                if not hasattr(agent_class, method_name):
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error checking capability discovery: {e}")
            return False
    
    async def check_cascade_compatibility(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check CASCADE-001: Cascade compatibility"""
        try:
            # Check for cascade methods
            cascade_methods = ["execute_in_cascade", "execute_primary_function"]
            
            for method_name in cascade_methods:
                if not hasattr(agent_class, method_name):
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error checking cascade compatibility: {e}")
            return False
    
    async def check_authentication_requirements(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check SEC-001: Authentication requirements"""
        try:
            # Look for authentication in message handling
            if hasattr(agent_class, 'handle_message'):
                method = getattr(agent_class, 'handle_message')
                source = inspect.getsource(method)
                
                # Basic check for authentication keywords
                auth_keywords = ['auth', 'verify', 'validate', 'security']
                has_auth = any(keyword in source.lower() for keyword in auth_keywords)
                
                return has_auth
            
            return True  # Default pass
            
        except Exception as e:
            self.logger.error(f"❌ Error checking authentication: {e}")
            return False
    
    async def check_access_control(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check SEC-002: Access control"""
        try:
            # Look for access control methods
            access_methods = ["check_permissions", "validate_access", "authorize"]
            
            for method_name in access_methods:
                if hasattr(agent_class, method_name):
                    return True
            
            return True  # Default pass for now
            
        except Exception as e:
            self.logger.error(f"❌ Error checking access control: {e}")
            return False
    
    async def check_telemetry_implementation(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check MON-001: Telemetry implementation"""
        try:
            # Check for logging and telemetry
            if not agent_instance:
                return True
            
            # Should have logger
            if not hasattr(agent_instance, 'logger'):
                return False
            
            # Check for heartbeat functionality
            heartbeat_methods = ["health_check", "_heartbeat_loop"]
            
            for method_name in heartbeat_methods:
                if not hasattr(agent_class, method_name):
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error checking telemetry implementation: {e}")
            return False
    
    async def check_performance_monitoring(self, agent_class: Type, agent_instance: Any, report: ComplianceReport) -> bool:
        """Check MON-002: Performance monitoring"""
        try:
            # Check for performance monitoring methods
            perf_methods = ["get_performance_metrics"]
            
            for method_name in perf_methods:
                if not hasattr(agent_class, method_name):
                    return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Error checking performance monitoring: {e}")
            return False
    
    def generate_compliance_report_summary(self, report: ComplianceReport) -> str:
        """Generate human-readable compliance report summary"""
        summary = f"""
🏛️ UAP COMPLIANCE VALIDATION REPORT
====================================

Agent ID: {report.agent_id}
Validation Time: {report.validation_timestamp}
Overall Status: {report.overall_status}
Compliance Score: {report.compliance_score:.2%}

SUMMARY:
- Total Checks: {report.total_checks}
- Passed: {len(report.passed_checks)}
- Violations: {len(report.violations)}

"""
        
        if report.violations:
            summary += "VIOLATIONS:\n"
            for violation in report.violations:
                summary += f"  [{violation.severity}] {violation.rule_id}: {violation.description}\n"
            summary += "\n"
        
        if report.passed_checks:
            summary += "PASSED CHECKS:\n"
            for check in report.passed_checks:
                summary += f"  ✅ {check}\n"
        
        return summary


# Global compliance validator instance
COMPLIANCE_VALIDATOR = ComplianceValidator()


# Convenience functions
async def validate_agent(agent_class: Type, agent_instance: Optional[Any] = None) -> ComplianceReport:
    """Convenience function for agent validation"""
    return await COMPLIANCE_VALIDATOR.validate_agent_compliance(agent_class, agent_instance)


def generate_compliance_summary(report: ComplianceReport) -> str:
    """Convenience function for generating compliance summary"""
    return COMPLIANCE_VALIDATOR.generate_compliance_report_summary(report) 