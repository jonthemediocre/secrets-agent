"""
🏛️ RUNTIME GOVERNANCE ENGINE - Phase 4.3
=======================================

Level 3 Runtime Governance: Autonomous self-management and behavioral evolution
- Real-time rule adaptation based on operational conditions
- Self-modifying behaviors with safety constraints
- Autonomous decision-making for complex scenarios
- Dynamic optimization and performance tuning
- Self-healing and error recovery mechanisms

Core Purpose: Enable autonomous runtime governance with intelligent self-evolution
"""

import asyncio
import json
import logging
import time
import traceback
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import hashlib
import copy

# Set up logging
logger = logging.getLogger(__name__)

class GovernanceLevel(Enum):
    """Governance rule hierarchy levels"""
    GLOBAL = "global"          # Immutable universal laws (Level 1)
    OPERATIONAL = "operational" # Adaptive operational rules (Level 2)
    TACTICAL = "tactical"      # Dynamic tactical adjustments (Level 3)

class AutonomyLevel(Enum):
    """Agent autonomy levels for decision-making"""
    MANUAL = "manual"          # Requires human approval
    GUIDED = "guided"          # Autonomous with oversight
    AUTONOMOUS = "autonomous"  # Fully autonomous within bounds
    EMERGENT = "emergent"      # Self-evolving autonomous behavior

class DecisionContext(Enum):
    """Context types for governance decisions"""
    SECURITY = "security"
    COMPLIANCE = "compliance"
    PERFORMANCE = "performance"
    OPERATIONS = "operations"
    EMERGENCY = "emergency"
    EVOLUTION = "evolution"

@dataclass
class GovernanceRule:
    """Individual governance rule with metadata"""
    rule_id: str
    level: GovernanceLevel
    context: DecisionContext
    condition: str              # Condition logic (Python expression)
    action: str                # Action to take when condition is met
    priority: int              # Rule priority (higher = more important)
    autonomy_level: AutonomyLevel
    created_at: datetime
    last_modified: datetime
    modification_count: int = 0
    success_rate: float = 0.0
    application_count: int = 0
    is_active: bool = True
    safety_constraints: List[str] = field(default_factory=list)
    dependencies: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class GovernanceDecision:
    """Record of a governance decision and its outcome"""
    decision_id: str
    rule_id: str
    context: DecisionContext
    condition_met: bool
    action_taken: str
    outcome: str
    success: bool
    execution_time: float
    timestamp: datetime
    autonomy_level: AutonomyLevel
    impact_assessment: Dict[str, Any] = field(default_factory=dict)
    learned_patterns: List[str] = field(default_factory=list)

@dataclass
class RuntimeMetrics:
    """Runtime performance and governance metrics"""
    total_decisions: int = 0
    successful_decisions: int = 0
    failed_decisions: int = 0
    average_decision_time: float = 0.0
    rules_evolved: int = 0
    autonomy_improvements: int = 0
    safety_violations: int = 0
    performance_optimizations: int = 0
    last_evolution: Optional[datetime] = None
    uptime_hours: float = 0.0
    efficiency_score: float = 0.0

class RuntimeGovernanceEngine:
    """
    Level 3 Runtime Governance Engine
    
    Provides autonomous runtime governance with:
    - Real-time rule adaptation
    - Self-modifying behaviors
    - Autonomous decision-making
    - Performance optimization
    - Safety enforcement
    """
    
    def __init__(self, agent_id: str, governance_config: Optional[Dict[str, Any]] = None):
        self.agent_id = agent_id
        self.governance_config = governance_config or {}
        
        # Core governance state
        self.rules: Dict[str, GovernanceRule] = {}
        self.decision_history: List[GovernanceDecision] = []
        self.metrics = RuntimeMetrics()
        self.start_time = datetime.now(timezone.utc)
        
        # Runtime state
        self.is_active = False
        self.autonomy_level = AutonomyLevel.GUIDED
        self.safety_mode = True
        self.learning_enabled = True
        self.evolution_enabled = True
        
        # Context and capabilities
        self.operational_context: Dict[str, Any] = {}
        self.performance_baselines: Dict[str, float] = {}
        self.learned_patterns: Dict[str, Any] = {}
        
        # Safety and constraints
        self.global_constraints = [
            "Never compromise security",
            "Maintain data integrity",
            "Respect compliance requirements",
            "Preserve system stability",
            "Human oversight for critical changes"
        ]
        
        logger.info(f"🏛️ Runtime Governance Engine initialized for {agent_id}")
    
    async def initialize_governance(self) -> Dict[str, Any]:
        """Initialize the governance engine with baseline rules"""
        logger.info("🚀 Initializing Level 3 Runtime Governance...")
        
        try:
            # Load default governance rules
            await self._load_default_rules()
            
            # Establish performance baselines
            await self._establish_baselines()
            
            # Initialize learning systems
            await self._initialize_learning()
            
            # Start governance loop
            self.is_active = True
            
            initialization_status = {
                "status": "success",
                "governance_level": "Level 3",
                "autonomy_level": self.autonomy_level.value,
                "rules_loaded": len(self.rules),
                "safety_mode": self.safety_mode,
                "learning_enabled": self.learning_enabled,
                "evolution_enabled": self.evolution_enabled,
                "global_constraints": len(self.global_constraints),
                "initialized_at": self.start_time.isoformat()
            }
            
            logger.info("✅ Runtime Governance Engine fully operational")
            return initialization_status
            
        except Exception as e:
            logger.error(f"❌ Governance initialization failed: {e}")
            return {"status": "error", "error": str(e)}
    
    async def make_governance_decision(
        self, 
        context: DecisionContext, 
        situation: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Make an autonomous governance decision"""
        decision_start = time.time()
        decision_id = f"decision_{int(time.time() * 1000)}"
        
        logger.info(f"🤔 Making governance decision for {context.value} context")
        
        try:
            # Evaluate applicable rules
            applicable_rules = await self._evaluate_rules(context, situation)
            
            if not applicable_rules:
                logger.info("📋 No applicable governance rules found")
                return {
                    "decision_id": decision_id,
                    "action": "no_action",
                    "reason": "No applicable rules",
                    "autonomy_level": "manual"
                }
            
            # Select best rule based on priority and success rate
            selected_rule = self._select_optimal_rule(applicable_rules)
            
            # Validate safety constraints
            safety_check = await self._validate_safety_constraints(selected_rule, situation)
            if not safety_check["safe"]:
                logger.warning(f"⚠️ Safety constraint violation: {safety_check['reason']}")
                return {
                    "decision_id": decision_id,
                    "action": "safety_block",
                    "reason": safety_check["reason"],
                    "autonomy_level": "manual"
                }
            
            # Execute decision based on autonomy level
            execution_result = await self._execute_governance_action(
                selected_rule, situation, decision_id
            )
            
            # Record decision
            decision_time = time.time() - decision_start
            decision_record = GovernanceDecision(
                decision_id=decision_id,
                rule_id=selected_rule.rule_id,
                context=context,
                condition_met=True,
                action_taken=execution_result["action"],
                outcome=execution_result["outcome"],
                success=execution_result["success"],
                execution_time=decision_time,
                timestamp=datetime.now(timezone.utc),
                autonomy_level=selected_rule.autonomy_level
            )
            
            self.decision_history.append(decision_record)
            await self._update_metrics(decision_record)
            
            # Learn from decision
            if self.learning_enabled:
                await self._learn_from_decision(decision_record, situation)
            
            logger.info(f"✅ Governance decision completed: {execution_result['action']}")
            return {
                "decision_id": decision_id,
                "rule_id": selected_rule.rule_id,
                "action": execution_result["action"],
                "outcome": execution_result["outcome"],
                "success": execution_result["success"],
                "autonomy_level": selected_rule.autonomy_level.value,
                "execution_time": decision_time,
                "learned_patterns": decision_record.learned_patterns
            }
            
        except Exception as e:
            logger.error(f"❌ Governance decision failed: {e}")
            error_decision = GovernanceDecision(
                decision_id=decision_id,
                rule_id="error",
                context=context,
                condition_met=False,
                action_taken="error_handling",
                outcome=f"Error: {str(e)}",
                success=False,
                execution_time=time.time() - decision_start,
                timestamp=datetime.now(timezone.utc),
                autonomy_level=AutonomyLevel.MANUAL
            )
            self.decision_history.append(error_decision)
            
            return {
                "decision_id": decision_id,
                "action": "error",
                "error": str(e),
                "autonomy_level": "manual"
            }
    
    async def evolve_governance_rules(self) -> Dict[str, Any]:
        """Autonomous evolution of governance rules based on performance"""
        if not self.evolution_enabled:
            return {"status": "disabled", "message": "Evolution is disabled"}
        
        logger.info("🧬 Initiating autonomous governance rule evolution...")
        
        try:
            evolution_results = {
                "evolved_rules": 0,
                "new_rules": 0,
                "optimized_rules": 0,
                "retired_rules": 0,
                "performance_improvements": [],
                "safety_validations": 0
            }
            
            # Analyze rule performance
            rule_performance = await self._analyze_rule_performance()
            
            # Evolve underperforming rules
            for rule_id, performance in rule_performance.items():
                if performance["success_rate"] < 0.7 and performance["application_count"] > 5:
                    evolved_rule = await self._evolve_rule(self.rules[rule_id], performance)
                    if evolved_rule:
                        self.rules[rule_id] = evolved_rule
                        evolution_results["evolved_rules"] += 1
                        logger.info(f"🔄 Evolved rule {rule_id}")
            
            # Generate new rules from patterns
            new_rules = await self._generate_rules_from_patterns()
            for new_rule in new_rules:
                self.rules[new_rule.rule_id] = new_rule
                evolution_results["new_rules"] += 1
                logger.info(f"✨ Generated new rule {new_rule.rule_id}")
            
            # Optimize high-performing rules
            optimized_count = await self._optimize_successful_rules()
            evolution_results["optimized_rules"] = optimized_count
            
            # Update evolution metrics
            self.metrics.rules_evolved += evolution_results["evolved_rules"]
            self.metrics.last_evolution = datetime.now(timezone.utc)
            
            logger.info(f"✅ Governance evolution complete: {evolution_results}")
            return {"status": "success", **evolution_results}
            
        except Exception as e:
            logger.error(f"❌ Governance evolution failed: {e}")
            return {"status": "error", "error": str(e)}
    
    async def get_governance_dashboard(self) -> Dict[str, Any]:
        """Generate comprehensive governance dashboard"""
        current_time = datetime.now(timezone.utc)
        uptime = (current_time - self.start_time).total_seconds() / 3600
        
        # Calculate efficiency score
        efficiency_score = 0.0
        if self.metrics.total_decisions > 0:
            success_rate = self.metrics.successful_decisions / self.metrics.total_decisions
            avg_time_score = max(0, 1 - (self.metrics.average_decision_time / 10))  # Normalize to 10s max
            efficiency_score = (success_rate * 0.7) + (avg_time_score * 0.3)
        
        # Active rules by level
        rules_by_level = {}
        for level in GovernanceLevel:
            rules_by_level[level.value] = len([
                r for r in self.rules.values() 
                if r.level == level and r.is_active
            ])
        
        # Recent decisions analysis
        recent_decisions = [
            d for d in self.decision_history 
            if (current_time - d.timestamp).total_seconds() < 3600  # Last hour
        ]
        
        # Autonomy distribution
        autonomy_distribution = {}
        for level in AutonomyLevel:
            autonomy_distribution[level.value] = len([
                d for d in recent_decisions 
                if d.autonomy_level == level
            ])
        
        dashboard = {
            "governance_status": "active" if self.is_active else "inactive",
            "current_autonomy_level": self.autonomy_level.value,
            "uptime_hours": round(uptime, 2),
            "efficiency_score": round(efficiency_score, 3),
            
            # Rule statistics
            "rules": {
                "total_active": len([r for r in self.rules.values() if r.is_active]),
                "by_level": rules_by_level,
                "recently_evolved": self.metrics.rules_evolved,
                "last_evolution": self.metrics.last_evolution.isoformat() if self.metrics.last_evolution else None
            },
            
            # Decision metrics
            "decisions": {
                "total": self.metrics.total_decisions,
                "successful": self.metrics.successful_decisions,
                "failed": self.metrics.failed_decisions,
                "success_rate": round(
                    self.metrics.successful_decisions / max(1, self.metrics.total_decisions), 3
                ),
                "average_time": round(self.metrics.average_decision_time, 3),
                "recent_count": len(recent_decisions),
                "autonomy_distribution": autonomy_distribution
            },
            
            # Performance indicators
            "performance": {
                "efficiency_score": round(efficiency_score, 3),
                "autonomy_improvements": self.metrics.autonomy_improvements,
                "performance_optimizations": self.metrics.performance_optimizations,
                "safety_violations": self.metrics.safety_violations
            },
            
            # Learning and evolution
            "evolution": {
                "learning_enabled": self.learning_enabled,
                "evolution_enabled": self.evolution_enabled,
                "patterns_learned": len(self.learned_patterns),
                "performance_baselines": len(self.performance_baselines)
            },
            
            # Safety and constraints
            "safety": {
                "safety_mode": self.safety_mode,
                "global_constraints": len(self.global_constraints),
                "recent_violations": self.metrics.safety_violations,
                "constraint_effectiveness": "high" if self.metrics.safety_violations == 0 else "moderate"
            },
            
            "generated_at": current_time.isoformat()
        }
        
        return dashboard
    
    # === PRIVATE METHODS ===
    
    async def _load_default_rules(self):
        """Load default governance rules"""
        default_rules = [
            # Security governance rules
            GovernanceRule(
                rule_id="security_threat_response",
                level=GovernanceLevel.GLOBAL,
                context=DecisionContext.SECURITY,
                condition="threat_level >= 'HIGH'",
                action="escalate_security_response",
                priority=100,
                autonomy_level=AutonomyLevel.AUTONOMOUS,
                created_at=datetime.now(timezone.utc),
                last_modified=datetime.now(timezone.utc),
                safety_constraints=["maintain_data_integrity", "log_all_actions"]
            ),
            
            # Performance optimization rules
            GovernanceRule(
                rule_id="performance_optimization",
                level=GovernanceLevel.OPERATIONAL,
                context=DecisionContext.PERFORMANCE,
                condition="response_time > baseline * 1.5",
                action="optimize_performance",
                priority=70,
                autonomy_level=AutonomyLevel.GUIDED,
                created_at=datetime.now(timezone.utc),
                last_modified=datetime.now(timezone.utc),
                safety_constraints=["preserve_system_stability"]
            ),
            
            # Compliance monitoring rules
            GovernanceRule(
                rule_id="compliance_monitoring",
                level=GovernanceLevel.GLOBAL,
                context=DecisionContext.COMPLIANCE,
                condition="compliance_score < 0.8",
                action="enhance_compliance_measures",
                priority=90,
                autonomy_level=AutonomyLevel.AUTONOMOUS,
                created_at=datetime.now(timezone.utc),
                last_modified=datetime.now(timezone.utc),
                safety_constraints=["maintain_audit_trail", "preserve_data_privacy"]
            ),
            
            # Emergency response rules
            GovernanceRule(
                rule_id="emergency_response",
                level=GovernanceLevel.GLOBAL,
                context=DecisionContext.EMERGENCY,
                condition="system_health < 0.5",
                action="activate_emergency_protocols",
                priority=150,
                autonomy_level=AutonomyLevel.AUTONOMOUS,
                created_at=datetime.now(timezone.utc),
                last_modified=datetime.now(timezone.utc),
                safety_constraints=["notify_human_operators", "preserve_critical_data"]
            )
        ]
        
        for rule in default_rules:
            self.rules[rule.rule_id] = rule
        
        logger.info(f"📋 Loaded {len(default_rules)} default governance rules")
    
    async def _establish_baselines(self):
        """Establish performance baselines"""
        self.performance_baselines = {
            "response_time": 2.0,  # seconds
            "success_rate": 0.95,
            "efficiency_score": 0.85,
            "compliance_score": 0.9,
            "security_score": 0.95
        }
        logger.info("📊 Performance baselines established")
    
    async def _initialize_learning(self):
        """Initialize learning systems"""
        self.learned_patterns = {
            "decision_patterns": {},
            "performance_patterns": {},
            "failure_patterns": {},
            "optimization_opportunities": []
        }
        logger.info("🧠 Learning systems initialized")
    
    async def _evaluate_rules(self, context: DecisionContext, situation: Dict[str, Any]) -> List[GovernanceRule]:
        """Evaluate which rules apply to the current situation"""
        applicable_rules = []
        
        for rule in self.rules.values():
            if not rule.is_active or rule.context != context:
                continue
            
            try:
                # Evaluate rule condition
                condition_met = await self._evaluate_condition(rule.condition, situation)
                if condition_met:
                    applicable_rules.append(rule)
            except Exception as e:
                logger.warning(f"⚠️ Failed to evaluate rule {rule.rule_id}: {e}")
        
        # Sort by priority
        applicable_rules.sort(key=lambda r: r.priority, reverse=True)
        return applicable_rules
    
    async def _evaluate_condition(self, condition: str, situation: Dict[str, Any]) -> bool:
        """Safely evaluate a rule condition"""
        try:
            # Create safe evaluation context
            eval_context = {
                **situation,
                "datetime": datetime,
                "time": time
            }
            
            # Simple condition evaluation (in production, use a safer approach)
            return eval(condition, {"__builtins__": {}}, eval_context)
        except:
            return False
    
    def _select_optimal_rule(self, rules: List[GovernanceRule]) -> GovernanceRule:
        """Select the optimal rule based on priority and performance"""
        if not rules:
            raise ValueError("No rules provided")
        
        # Score rules based on priority and success rate
        scored_rules = []
        for rule in rules:
            priority_score = rule.priority / 100.0
            performance_score = rule.success_rate if rule.application_count > 0 else 0.5
            total_score = (priority_score * 0.6) + (performance_score * 0.4)
            scored_rules.append((rule, total_score))
        
        # Return highest scoring rule
        return max(scored_rules, key=lambda x: x[1])[0]
    
    async def _validate_safety_constraints(self, rule: GovernanceRule, situation: Dict[str, Any]) -> Dict[str, Any]:
        """Validate that executing the rule won't violate safety constraints"""
        if not self.safety_mode:
            return {"safe": True, "reason": "Safety mode disabled"}
        
        # Check global constraints
        for constraint in self.global_constraints:
            if await self._violates_constraint(constraint, rule, situation):
                return {"safe": False, "reason": f"Violates global constraint: {constraint}"}
        
        # Check rule-specific constraints
        for constraint in rule.safety_constraints:
            if await self._violates_constraint(constraint, rule, situation):
                return {"safe": False, "reason": f"Violates rule constraint: {constraint}"}
        
        return {"safe": True, "reason": "All safety constraints satisfied"}
    
    async def _violates_constraint(self, constraint: str, rule: GovernanceRule, situation: Dict[str, Any]) -> bool:
        """Check if executing the rule would violate a specific constraint"""
        # Simplified constraint checking (expand based on needs)
        constraint_checks = {
            "Never compromise security": lambda: situation.get("security_impact", "none") == "negative",
            "Maintain data integrity": lambda: situation.get("data_risk", "low") == "high",
            "Respect compliance requirements": lambda: situation.get("compliance_impact", "none") == "negative",
            "Preserve system stability": lambda: situation.get("stability_risk", "low") == "high",
            "Human oversight for critical changes": lambda: rule.autonomy_level == AutonomyLevel.MANUAL and situation.get("critical", False)
        }
        
        check_func = constraint_checks.get(constraint)
        if check_func:
            try:
                return check_func()
            except:
                return True  # Conservative: assume violation if check fails
        
        return False
    
    async def _execute_governance_action(self, rule: GovernanceRule, situation: Dict[str, Any], decision_id: str) -> Dict[str, Any]:
        """Execute the governance action specified by the rule"""
        action_start = time.time()
        
        try:
            # Map actions to implementations
            action_handlers = {
                "escalate_security_response": self._handle_security_escalation,
                "optimize_performance": self._handle_performance_optimization,
                "enhance_compliance_measures": self._handle_compliance_enhancement,
                "activate_emergency_protocols": self._handle_emergency_response
            }
            
            handler = action_handlers.get(rule.action)
            if not handler:
                # Generic action handling
                result = await self._handle_generic_action(rule.action, situation)
            else:
                result = await handler(situation, rule)
            
            execution_time = time.time() - action_start
            
            # Update rule performance
            rule.application_count += 1
            if result.get("success", False):
                rule.success_rate = (rule.success_rate * (rule.application_count - 1) + 1.0) / rule.application_count
            else:
                rule.success_rate = (rule.success_rate * (rule.application_count - 1)) / rule.application_count
            
            return {
                "action": rule.action,
                "outcome": result.get("outcome", "completed"),
                "success": result.get("success", True),
                "execution_time": execution_time,
                "details": result.get("details", {})
            }
            
        except Exception as e:
            logger.error(f"❌ Action execution failed: {e}")
            return {
                "action": rule.action,
                "outcome": f"Error: {str(e)}",
                "success": False,
                "execution_time": time.time() - action_start
            }
    
    # Action handlers
    async def _handle_security_escalation(self, situation: Dict[str, Any], rule: GovernanceRule) -> Dict[str, Any]:
        """Handle security threat escalation"""
        threat_level = situation.get("threat_level", "UNKNOWN")
        logger.warning(f"🚨 Security escalation triggered for {threat_level} threat")
        
        return {
            "success": True,
            "outcome": f"Security escalation activated for {threat_level} threat",
            "details": {"threat_level": threat_level, "escalation_time": datetime.now(timezone.utc)}
        }
    
    async def _handle_performance_optimization(self, situation: Dict[str, Any], rule: GovernanceRule) -> Dict[str, Any]:
        """Handle performance optimization"""
        current_performance = situation.get("response_time", 0)
        baseline = self.performance_baselines.get("response_time", 2.0)
        
        logger.info(f"⚡ Performance optimization triggered: {current_performance}s vs {baseline}s baseline")
        
        return {
            "success": True,
            "outcome": "Performance optimization initiated",
            "details": {"current_performance": current_performance, "baseline": baseline}
        }
    
    async def _handle_compliance_enhancement(self, situation: Dict[str, Any], rule: GovernanceRule) -> Dict[str, Any]:
        """Handle compliance enhancement"""
        compliance_score = situation.get("compliance_score", 0.0)
        logger.info(f"📋 Compliance enhancement triggered: {compliance_score:.2f} score")
        
        return {
            "success": True,
            "outcome": "Compliance enhancement measures activated",
            "details": {"compliance_score": compliance_score}
        }
    
    async def _handle_emergency_response(self, situation: Dict[str, Any], rule: GovernanceRule) -> Dict[str, Any]:
        """Handle emergency response protocols"""
        system_health = situation.get("system_health", 1.0)
        logger.critical(f"🚨 Emergency protocols activated: {system_health:.2f} system health")
        
        return {
            "success": True,
            "outcome": "Emergency protocols activated",
            "details": {"system_health": system_health, "emergency_time": datetime.now(timezone.utc)}
        }
    
    async def _handle_generic_action(self, action: str, situation: Dict[str, Any]) -> Dict[str, Any]:
        """Handle generic actions"""
        logger.info(f"🔧 Executing generic action: {action}")
        
        return {
            "success": True,
            "outcome": f"Generic action '{action}' completed",
            "details": {"action": action, "situation_keys": list(situation.keys())}
        }
    
    async def _update_metrics(self, decision: GovernanceDecision):
        """Update governance metrics"""
        self.metrics.total_decisions += 1
        
        if decision.success:
            self.metrics.successful_decisions += 1
        else:
            self.metrics.failed_decisions += 1
        
        # Update average decision time
        total_time = self.metrics.average_decision_time * (self.metrics.total_decisions - 1) + decision.execution_time
        self.metrics.average_decision_time = total_time / self.metrics.total_decisions
    
    async def _learn_from_decision(self, decision: GovernanceDecision, situation: Dict[str, Any]):
        """Learn patterns from governance decisions"""
        if not self.learning_enabled:
            return
        
        # Extract patterns from successful decisions
        if decision.success:
            pattern_key = f"{decision.context.value}_{decision.rule_id}"
            if pattern_key not in self.learned_patterns["decision_patterns"]:
                self.learned_patterns["decision_patterns"][pattern_key] = {
                    "success_count": 0,
                    "total_count": 0,
                    "average_time": 0.0,
                    "common_situations": []
                }
            
            pattern = self.learned_patterns["decision_patterns"][pattern_key]
            pattern["success_count"] += 1
            pattern["total_count"] += 1
            pattern["average_time"] = (pattern["average_time"] * (pattern["total_count"] - 1) + decision.execution_time) / pattern["total_count"]
            
            # Record situation characteristics
            situation_summary = {k: v for k, v in situation.items() if isinstance(v, (str, int, float, bool))}
            pattern["common_situations"].append(situation_summary)
    
    async def _analyze_rule_performance(self) -> Dict[str, Dict[str, Any]]:
        """Analyze performance of governance rules"""
        performance_analysis = {}
        
        for rule_id, rule in self.rules.items():
            if rule.application_count > 0:
                performance_analysis[rule_id] = {
                    "success_rate": rule.success_rate,
                    "application_count": rule.application_count,
                    "modification_count": rule.modification_count,
                    "priority": rule.priority,
                    "autonomy_level": rule.autonomy_level.value,
                    "last_modified": rule.last_modified.isoformat()
                }
        
        return performance_analysis
    
    async def _evolve_rule(self, rule: GovernanceRule, performance: Dict[str, Any]) -> Optional[GovernanceRule]:
        """Evolve a governance rule based on performance analysis"""
        if performance["success_rate"] >= 0.7:
            return None  # Rule is performing well
        
        # Create evolved version
        evolved_rule = copy.deepcopy(rule)
        evolved_rule.modification_count += 1
        evolved_rule.last_modified = datetime.now(timezone.utc)
        
        # Evolution strategies based on performance issues
        if performance["success_rate"] < 0.5:
            # Poor performance: adjust priority or autonomy level
            evolved_rule.priority = max(1, evolved_rule.priority - 10)
            if evolved_rule.autonomy_level == AutonomyLevel.AUTONOMOUS:
                evolved_rule.autonomy_level = AutonomyLevel.GUIDED
        
        logger.info(f"🧬 Evolved rule {rule.rule_id}: priority {rule.priority} -> {evolved_rule.priority}")
        return evolved_rule
    
    async def _generate_rules_from_patterns(self) -> List[GovernanceRule]:
        """Generate new rules from learned patterns"""
        new_rules = []
        
        # Analyze successful patterns
        for pattern_key, pattern_data in self.learned_patterns["decision_patterns"].items():
            if (pattern_data["success_count"] > 5 and 
                pattern_data["success_count"] / pattern_data["total_count"] > 0.8):
                
                # Generate new rule from successful pattern
                context_str, rule_base = pattern_key.split("_", 1)
                context = DecisionContext(context_str)
                
                new_rule = GovernanceRule(
                    rule_id=f"learned_{pattern_key}_{int(time.time())}",
                    level=GovernanceLevel.TACTICAL,
                    context=context,
                    condition="True",  # Simplified for demo
                    action=f"apply_learned_pattern_{pattern_key}",
                    priority=50,
                    autonomy_level=AutonomyLevel.GUIDED,
                    created_at=datetime.now(timezone.utc),
                    last_modified=datetime.now(timezone.utc),
                    metadata={"learned_from": pattern_key, "pattern_success_rate": pattern_data["success_count"] / pattern_data["total_count"]}
                )
                
                new_rules.append(new_rule)
        
        return new_rules
    
    async def _optimize_successful_rules(self) -> int:
        """Optimize rules that are performing well"""
        optimized_count = 0
        
        for rule in self.rules.values():
            if rule.success_rate > 0.9 and rule.application_count > 10:
                # Increase autonomy level for highly successful rules
                if rule.autonomy_level == AutonomyLevel.GUIDED:
                    rule.autonomy_level = AutonomyLevel.AUTONOMOUS
                    rule.modification_count += 1
                    rule.last_modified = datetime.now(timezone.utc)
                    optimized_count += 1
                    logger.info(f"⚡ Optimized rule {rule.rule_id}: promoted to autonomous")
        
        return optimized_count

def create_runtime_governance_engine(agent_id: str, governance_config: Optional[Dict[str, Any]] = None) -> RuntimeGovernanceEngine:
    """Factory function to create a runtime governance engine"""
    return RuntimeGovernanceEngine(agent_id, governance_config)

# === EXAMPLE USAGE ===
async def demo_runtime_governance():
    """Demonstrate runtime governance capabilities"""
    
    print("🏛️ RUNTIME GOVERNANCE ENGINE DEMO")
    print("=" * 50)
    
    # Create governance engine
    governance = create_runtime_governance_engine("governance_demo")
    
    # Initialize governance
    init_result = await governance.initialize_governance()
    print(f"📋 Initialization: {init_result['status']}")
    print(f"   Rules loaded: {init_result['rules_loaded']}")
    print(f"   Autonomy level: {init_result['autonomy_level']}")
    
    # Make governance decisions
    situations = [
        {
            "context": DecisionContext.SECURITY,
            "situation": {"threat_level": "HIGH", "security_impact": "neutral", "data_risk": "low"}
        },
        {
            "context": DecisionContext.PERFORMANCE,
            "situation": {"response_time": 3.5, "baseline": 2.0, "stability_risk": "low"}
        },
        {
            "context": DecisionContext.COMPLIANCE,
            "situation": {"compliance_score": 0.75, "compliance_impact": "neutral"}
        }
    ]
    
    for scenario in situations:
        decision = await governance.make_governance_decision(
            scenario["context"], 
            scenario["situation"]
        )
        print(f"\n🤔 Decision for {scenario['context'].value}:")
        print(f"   Action: {decision['action']}")
        print(f"   Success: {decision['success']}")
        print(f"   Autonomy: {decision['autonomy_level']}")
    
    # Evolve governance rules
    evolution = await governance.evolve_governance_rules()
    print(f"\n🧬 Evolution Results:")
    print(f"   Evolved rules: {evolution['evolved_rules']}")
    print(f"   New rules: {evolution['new_rules']}")
    
    # Generate dashboard
    dashboard = await governance.get_governance_dashboard()
    print(f"\n📊 Governance Dashboard:")
    print(f"   Efficiency score: {dashboard['efficiency_score']}")
    print(f"   Total decisions: {dashboard['decisions']['total']}")
    print(f"   Success rate: {dashboard['decisions']['success_rate']}")
    print(f"   Safety violations: {dashboard['performance']['safety_violations']}")

if __name__ == "__main__":
    asyncio.run(demo_runtime_governance()) 