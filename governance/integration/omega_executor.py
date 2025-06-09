#!/usr/bin/env python3
"""
Omega Executor - Governance Integration Module

This module provides the governance integration layer for the OperatorOmega Agent,
ensuring that all orchestration activities comply with project governance rules
and integration requirements.

Used by the OperatorOmega Agent for:
- Governance compliance validation
- Integration policy enforcement
- Cross-project coordination
- Architectural standard verification
"""

import os
import json
import asyncio
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone
from pathlib import Path

# Governance imports
from ..rules.governance_rules import GovernanceRuleEngine
from ...src.utils.logger import create_logger

class OmegaExecutor:
    """
    Governance integration executor for OperatorOmega Agent
    
    Responsibilities:
    - Validate governance compliance before agent actions
    - Enforce integration policies
    - Coordinate with governance systems
    - Provide governance-aware orchestration
    """
    
    def __init__(self, project_root: str = None, governance_config: Dict[str, Any] = None):
        self.project_root = project_root or os.getcwd()
        self.governance_config = governance_config or {}
        self.logger = create_logger('OmegaExecutor')
        
        # Governance state
        self.governance_rules = None
        self.compliance_cache = {}
        self.integration_policies = {}
        
        self.logger.info("OmegaExecutor initialized")

    async def initialize(self) -> None:
        """Initialize the governance integration system"""
        try:
            self.logger.info("Initializing OmegaExecutor governance system...")
            
            # 1. Load governance rules
            await self._load_governance_rules()
            
            # 2. Load integration policies
            await self._load_integration_policies()
            
            # 3. Initialize compliance monitoring
            await self._initialize_compliance_monitoring()
            
            self.logger.info("OmegaExecutor initialization completed")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize OmegaExecutor: {str(e)}")
            raise

    async def validate_governance_compliance(self, 
                                           agent_action: Dict[str, Any], 
                                           context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Validate that a proposed agent action complies with governance rules
        
        Args:
            agent_action: The action the agent wants to perform
            context: Current project context
            
        Returns:
            Compliance validation result
        """
        self.logger.info("Validating governance compliance...")
        
        compliance_result = {
            'compliant': True,
            'violations': [],
            'recommendations': [],
            'required_approvals': [],
            'compliance_score': 1.0
        }
        
        try:
            # 1. Check against governance rules
            rule_violations = await self._check_governance_rules(agent_action, context)
            if rule_violations:
                compliance_result['violations'].extend(rule_violations)
                compliance_result['compliant'] = False
            
            # 2. Validate integration policies
            policy_violations = await self._check_integration_policies(agent_action, context)
            if policy_violations:
                compliance_result['violations'].extend(policy_violations)
                compliance_result['compliant'] = False
            
            # 3. Check for required approvals
            required_approvals = await self._check_required_approvals(agent_action)
            if required_approvals:
                compliance_result['required_approvals'] = required_approvals
                compliance_result['compliant'] = False
            
            # 4. Calculate compliance score
            compliance_result['compliance_score'] = await self._calculate_compliance_score(
                compliance_result
            )
            
            # 5. Generate recommendations
            compliance_result['recommendations'] = await self._generate_compliance_recommendations(
                compliance_result, agent_action, context
            )
            
            self.logger.info(f"Governance compliance check completed: {compliance_result['compliant']}")
            return compliance_result
            
        except Exception as e:
            self.logger.error(f"Failed to validate governance compliance: {str(e)}")
            return {
                'compliant': False,
                'violations': [{'type': 'validation_error', 'message': str(e)}],
                'recommendations': [],
                'required_approvals': [],
                'compliance_score': 0.0
            }

    async def enforce_integration_policies(self, 
                                         orchestration_plan: Dict[str, Any], 
                                         context: Dict[str, Any]) -> Dict[str, Any]:
        """
        Enforce integration policies on orchestration plans
        
        Args:
            orchestration_plan: The plan to be enforced
            context: Current project context
            
        Returns:
            Enforcement result with modified plan if necessary
        """
        self.logger.info("Enforcing integration policies...")
        
        enforcement_result = {
            'enforced': True,
            'modifications': [],
            'policy_violations': [],
            'enhanced_plan': orchestration_plan.copy()
        }
        
        try:
            # 1. Check multi-agent coordination policies
            coordination_mods = await self._enforce_coordination_policies(
                orchestration_plan, context
            )
            if coordination_mods:
                enforcement_result['modifications'].extend(coordination_mods)
                self._apply_modifications(enforcement_result['enhanced_plan'], coordination_mods)
            
            # 2. Enforce security policies
            security_mods = await self._enforce_security_policies(
                orchestration_plan, context
            )
            if security_mods:
                enforcement_result['modifications'].extend(security_mods)
                self._apply_modifications(enforcement_result['enhanced_plan'], security_mods)
            
            # 3. Enforce architectural consistency
            arch_mods = await self._enforce_architectural_policies(
                orchestration_plan, context
            )
            if arch_mods:
                enforcement_result['modifications'].extend(arch_mods)
                self._apply_modifications(enforcement_result['enhanced_plan'], arch_mods)
            
            self.logger.info(f"Integration policy enforcement completed with {len(enforcement_result['modifications'])} modifications")
            return enforcement_result
            
        except Exception as e:
            self.logger.error(f"Failed to enforce integration policies: {str(e)}")
            return {
                'enforced': False,
                'modifications': [],
                'policy_violations': [{'type': 'enforcement_error', 'message': str(e)}],
                'enhanced_plan': orchestration_plan
            }

    async def coordinate_governance_integration(self, 
                                              agents: List[str], 
                                              coordination_plan: Dict[str, Any]) -> Dict[str, Any]:
        """
        Coordinate governance aspects of multi-agent integration
        
        Args:
            agents: List of agents to coordinate
            coordination_plan: The coordination plan
            
        Returns:
            Governance coordination result
        """
        self.logger.info("Coordinating governance integration...")
        
        coordination_result = {
            'coordination_approved': True,
            'governance_requirements': [],
            'integration_constraints': [],
            'monitoring_requirements': []
        }
        
        try:
            # 1. Check governance requirements for each agent
            for agent in agents:
                agent_requirements = await self._get_agent_governance_requirements(agent)
                coordination_result['governance_requirements'].extend(agent_requirements)
            
            # 2. Identify integration constraints
            constraints = await self._identify_integration_constraints(agents, coordination_plan)
            coordination_result['integration_constraints'] = constraints
            
            # 3. Set up monitoring requirements
            monitoring = await self._setup_governance_monitoring(agents, coordination_plan)
            coordination_result['monitoring_requirements'] = monitoring
            
            self.logger.info("Governance integration coordination completed")
            return coordination_result
            
        except Exception as e:
            self.logger.error(f"Failed to coordinate governance integration: {str(e)}")
            return {
                'coordination_approved': False,
                'governance_requirements': [],
                'integration_constraints': [],
                'monitoring_requirements': [],
                'error': str(e)
            }

    # Private implementation methods
    
    async def _load_governance_rules(self) -> None:
        """Load governance rules from configuration"""
        rules_file = os.path.join(self.project_root, 'governance', 'rules', 'governance.yaml')
        if os.path.exists(rules_file):
            try:
                import yaml
                with open(rules_file, 'r') as f:
                    rules_data = yaml.safe_load(f)
                    self.governance_rules = GovernanceRuleEngine(rules_data)
            except Exception as e:
                self.logger.warning(f"Failed to load governance rules: {str(e)}")
                self.governance_rules = GovernanceRuleEngine({})  # Empty rules
        else:
            self.logger.info("No governance rules file found, using defaults")
            self.governance_rules = GovernanceRuleEngine({})

    async def _load_integration_policies(self) -> None:
        """Load integration policies"""
        policies_file = os.path.join(self.project_root, 'governance', 'integration', 'policies.json')
        if os.path.exists(policies_file):
            try:
                with open(policies_file, 'r') as f:
                    self.integration_policies = json.load(f)
            except Exception as e:
                self.logger.warning(f"Failed to load integration policies: {str(e)}")
                self.integration_policies = {}
        else:
            self.logger.info("No integration policies file found, using defaults")
            self.integration_policies = {
                'default_security_level': 'medium',
                'require_approval_for': ['high_risk_actions'],
                'coordination_timeout': 300
            }

    async def _initialize_compliance_monitoring(self) -> None:
        """Initialize compliance monitoring"""
        self.compliance_cache = {
            'last_check': datetime.now(timezone.utc),
            'compliance_history': [],
            'active_violations': []
        }

    async def _check_governance_rules(self, action: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check action against governance rules"""
        violations = []
        
        if self.governance_rules:
            try:
                rule_result = await self.governance_rules.evaluate_action(action, context)
                if not rule_result.get('compliant', True):
                    violations.extend(rule_result.get('violations', []))
            except Exception as e:
                violations.append({
                    'type': 'rule_evaluation_error',
                    'message': f"Failed to evaluate governance rules: {str(e)}"
                })
        
        return violations

    async def _check_integration_policies(self, action: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check action against integration policies"""
        violations = []
        
        # Check security level requirements
        action_risk = action.get('risk_level', 'medium')
        required_security = self.integration_policies.get('default_security_level', 'medium')
        
        if self._get_risk_level_value(action_risk) > self._get_risk_level_value(required_security):
            violations.append({
                'type': 'security_policy_violation',
                'message': f"Action risk level {action_risk} exceeds policy requirement {required_security}"
            })
        
        return violations

    async def _check_required_approvals(self, action: Dict[str, Any]) -> List[str]:
        """Check if action requires approvals"""
        required_approvals = []
        
        action_type = action.get('type', '')
        high_risk_actions = self.integration_policies.get('require_approval_for', [])
        
        if any(risk_type in action_type for risk_type in high_risk_actions):
            required_approvals.append('governance_team')
        
        if action.get('affects_security', False):
            required_approvals.append('security_team')
        
        return required_approvals

    async def _calculate_compliance_score(self, compliance_result: Dict[str, Any]) -> float:
        """Calculate overall compliance score"""
        base_score = 1.0
        
        # Deduct for violations
        violations = len(compliance_result.get('violations', []))
        base_score -= violations * 0.2
        
        # Deduct for required approvals
        approvals = len(compliance_result.get('required_approvals', []))
        base_score -= approvals * 0.1
        
        return max(0.0, min(1.0, base_score))

    async def _generate_compliance_recommendations(self, 
                                                 compliance_result: Dict[str, Any],
                                                 action: Dict[str, Any], 
                                                 context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Generate recommendations for compliance improvement"""
        recommendations = []
        
        if not compliance_result['compliant']:
            recommendations.append({
                'type': 'compliance_improvement',
                'priority': 'high',
                'description': 'Address governance violations before proceeding'
            })
        
        if compliance_result['required_approvals']:
            recommendations.append({
                'type': 'approval_workflow',
                'priority': 'critical',
                'description': f"Obtain approvals from: {', '.join(compliance_result['required_approvals'])}"
            })
        
        return recommendations

    def _get_risk_level_value(self, risk_level: str) -> int:
        """Convert risk level to numeric value for comparison"""
        risk_values = {'low': 1, 'medium': 2, 'high': 3, 'critical': 4}
        return risk_values.get(risk_level.lower(), 2)

    def _apply_modifications(self, plan: Dict[str, Any], modifications: List[Dict[str, Any]]) -> None:
        """Apply policy modifications to the plan"""
        for mod in modifications:
            mod_type = mod.get('type')
            if mod_type == 'add_security_check':
                self._add_security_check(plan, mod)
            elif mod_type == 'enforce_coordination':
                self._enforce_coordination_modification(plan, mod)
            # Add more modification types as needed

    def _add_security_check(self, plan: Dict[str, Any], modification: Dict[str, Any]) -> None:
        """Add security check to plan"""
        if 'security_checks' not in plan:
            plan['security_checks'] = []
        plan['security_checks'].append(modification.get('security_requirement'))

    def _enforce_coordination_modification(self, plan: Dict[str, Any], modification: Dict[str, Any]) -> None:
        """Enforce coordination modification"""
        if 'coordination_requirements' not in plan:
            plan['coordination_requirements'] = []
        plan['coordination_requirements'].append(modification.get('coordination_rule'))

    # Additional stub methods for policy enforcement
    async def _enforce_coordination_policies(self, plan: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Enforce coordination policies"""
        return []  # Stub implementation

    async def _enforce_security_policies(self, plan: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Enforce security policies"""
        return []  # Stub implementation

    async def _enforce_architectural_policies(self, plan: Dict[str, Any], context: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Enforce architectural policies"""
        return []  # Stub implementation

    async def _get_agent_governance_requirements(self, agent: str) -> List[Dict[str, Any]]:
        """Get governance requirements for an agent"""
        return []  # Stub implementation

    async def _identify_integration_constraints(self, agents: List[str], plan: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Identify integration constraints"""
        return []  # Stub implementation

    async def _setup_governance_monitoring(self, agents: List[str], plan: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Setup governance monitoring"""
        return []  # Stub implementation


# Stub for GovernanceRuleEngine
class GovernanceRuleEngine:
    """Simple governance rule engine"""
    
    def __init__(self, rules_data: Dict[str, Any]):
        self.rules = rules_data
    
    async def evaluate_action(self, action: Dict[str, Any], context: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate action against rules"""
        return {
            'compliant': True,
            'violations': []
        } 