#!/usr/bin/env python3
"""
📊 COHERENCE & COLLAPSE SCORING ENGINE
=====================================

Advanced scoring system to track agent/system coherence and collapse risk.
Provides real-time stability monitoring and predictive collapse detection.

Features:
- Multi-dimensional coherence scoring
- Predictive collapse risk assessment
- Automatic intervention triggers
- Trinity harmony measurement
- Symbolic alignment tracking
- Performance degradation detection
"""

import asyncio
import yaml
import json
import time
import statistics
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
import logging
import math

logger = logging.getLogger(__name__)

class CoherenceCategory(Enum):
    """Categories of coherence measurement"""
    ARCHITECTURAL_FIT = "architectural_fit"
    SYMBOLIC_ALIGNMENT = "symbolic_alignment"
    PERFORMANCE_EFFICIENCY = "performance_efficiency"
    TRINITY_ROLE_HARMONY = "trinity_role_harmony"
    NARRATIVE_CONSISTENCY = "narrative_consistency"
    RESOURCE_UTILIZATION = "resource_utilization"
    COLLABORATION_EFFECTIVENESS = "collaboration_effectiveness"

class CollapseRiskFactor(Enum):
    """Factors contributing to collapse risk"""
    UTILITY_DECLINE = "utility_decline"
    RESOURCE_WASTE = "resource_waste"
    CONFLICT_GENERATION = "conflict_generation"
    OBSOLESCENCE = "obsolescence_indicators"
    COHERENCE_LOSS = "coherence_loss"
    PERFORMANCE_DEGRADATION = "performance_degradation"
    ISOLATION = "isolation_from_system"

@dataclass
class CoherenceMetric:
    """Individual coherence measurement"""
    category: CoherenceCategory
    value: float  # 0.0-1.0
    confidence: float  # 0.0-1.0
    measurement_time: datetime
    contributing_factors: List[str]
    trend_direction: str  # "improving", "stable", "declining"

@dataclass
class CollapseRiskMetric:
    """Individual collapse risk measurement"""
    factor: CollapseRiskFactor
    risk_level: float  # 0.0-1.0
    urgency: float  # 0.0-1.0
    measurement_time: datetime
    indicators: List[str]
    intervention_suggestions: List[str]

@dataclass
class AgentScore:
    """Complete scoring profile for an agent"""
    agent_id: str
    coherence_score: float  # 0.0-1.0
    collapse_score: float  # 0.0-1.0
    coherence_metrics: List[CoherenceMetric]
    collapse_metrics: List[CollapseRiskMetric]
    last_updated: datetime
    score_history: List[Dict[str, Any]] = field(default_factory=list)
    intervention_history: List[Dict[str, Any]] = field(default_factory=list)

class CoherenceAnalyzer:
    """Analyzes various aspects of agent coherence"""
    
    def __init__(self, vanta_path: Path):
        self.vanta_path = vanta_path
        self.scoring_weights = {
            CoherenceCategory.ARCHITECTURAL_FIT: 0.25,
            CoherenceCategory.SYMBOLIC_ALIGNMENT: 0.20,
            CoherenceCategory.PERFORMANCE_EFFICIENCY: 0.20,
            CoherenceCategory.TRINITY_ROLE_HARMONY: 0.15,
            CoherenceCategory.NARRATIVE_CONSISTENCY: 0.10,
            CoherenceCategory.RESOURCE_UTILIZATION: 0.10
        }
    
    async def analyze_agent_coherence(self, agent_id: str, agent_data: Dict[str, Any]) -> List[CoherenceMetric]:
        """Analyze all coherence aspects of an agent"""
        metrics = []
        
        # Architectural fit analysis
        arch_metric = await self._analyze_architectural_fit(agent_id, agent_data)
        metrics.append(arch_metric)
        
        # Symbolic alignment analysis
        symbolic_metric = await self._analyze_symbolic_alignment(agent_id, agent_data)
        metrics.append(symbolic_metric)
        
        # Performance efficiency analysis
        perf_metric = await self._analyze_performance_efficiency(agent_id, agent_data)
        metrics.append(perf_metric)
        
        # Trinity role harmony analysis
        trinity_metric = await self._analyze_trinity_harmony(agent_id, agent_data)
        metrics.append(trinity_metric)
        
        # Narrative consistency analysis
        narrative_metric = await self._analyze_narrative_consistency(agent_id, agent_data)
        metrics.append(narrative_metric)
        
        return metrics
    
    async def _analyze_architectural_fit(self, agent_id: str, agent_data: Dict[str, Any]) -> CoherenceMetric:
        """Analyze how well agent fits into system architecture"""
        contributing_factors = []
        fit_score = 0.0
        
        # Check if agent follows established patterns
        expected_capabilities = agent_data.get('expected_capabilities', [])
        actual_capabilities = agent_data.get('capabilities', [])
        
        if expected_capabilities:
            capability_match = len(set(expected_capabilities) & set(actual_capabilities)) / len(expected_capabilities)
            fit_score += capability_match * 0.4
            contributing_factors.append(f"capability_match: {capability_match:.2f}")
        
        # Check integration with existing agents
        integration_score = agent_data.get('integration_score', 0.5)
        fit_score += integration_score * 0.3
        contributing_factors.append(f"integration_score: {integration_score:.2f}")
        
        # Check adherence to design patterns
        pattern_adherence = agent_data.get('pattern_adherence', 0.7)
        fit_score += pattern_adherence * 0.3
        contributing_factors.append(f"pattern_adherence: {pattern_adherence:.2f}")
        
        # Determine trend
        trend = self._calculate_trend(agent_id, CoherenceCategory.ARCHITECTURAL_FIT, fit_score)
        
        return CoherenceMetric(
            category=CoherenceCategory.ARCHITECTURAL_FIT,
            value=min(fit_score, 1.0),
            confidence=0.85,
            measurement_time=datetime.now(timezone.utc),
            contributing_factors=contributing_factors,
            trend_direction=trend
        )
    
    async def _analyze_symbolic_alignment(self, agent_id: str, agent_data: Dict[str, Any]) -> CoherenceMetric:
        """Analyze symbolic and archetypal alignment"""
        contributing_factors = []
        alignment_score = 0.0
        
        # Check archetypal consistency
        archetype = agent_data.get('archetypal_alignment', 'unknown')
        if archetype != 'unknown':
            archetype_consistency = agent_data.get('archetype_consistency_score', 0.7)
            alignment_score += archetype_consistency * 0.4
            contributing_factors.append(f"archetype_consistency: {archetype_consistency:.2f}")
        
        # Check symbolic pattern adherence
        symbolic_patterns = agent_data.get('symbolic_patterns_followed', 0)
        expected_patterns = agent_data.get('expected_symbolic_patterns', 1)
        pattern_score = symbolic_patterns / max(expected_patterns, 1)
        alignment_score += pattern_score * 0.3
        contributing_factors.append(f"symbolic_patterns: {pattern_score:.2f}")
        
        # Check narrative coherence contribution
        narrative_contribution = agent_data.get('narrative_contribution_score', 0.6)
        alignment_score += narrative_contribution * 0.3
        contributing_factors.append(f"narrative_contribution: {narrative_contribution:.2f}")
        
        trend = self._calculate_trend(agent_id, CoherenceCategory.SYMBOLIC_ALIGNMENT, alignment_score)
        
        return CoherenceMetric(
            category=CoherenceCategory.SYMBOLIC_ALIGNMENT,
            value=min(alignment_score, 1.0),
            confidence=0.75,
            measurement_time=datetime.now(timezone.utc),
            contributing_factors=contributing_factors,
            trend_direction=trend
        )
    
    async def _analyze_performance_efficiency(self, agent_id: str, agent_data: Dict[str, Any]) -> CoherenceMetric:
        """Analyze agent performance and efficiency"""
        contributing_factors = []
        efficiency_score = 0.0
        
        # Check task completion rate
        completion_rate = agent_data.get('task_completion_rate', 0.8)
        efficiency_score += completion_rate * 0.4
        contributing_factors.append(f"completion_rate: {completion_rate:.2f}")
        
        # Check resource utilization efficiency
        resource_efficiency = agent_data.get('resource_efficiency', 0.7)
        efficiency_score += resource_efficiency * 0.3
        contributing_factors.append(f"resource_efficiency: {resource_efficiency:.2f}")
        
        # Check response time performance
        avg_response_time = agent_data.get('avg_response_time_ms', 1000)
        response_score = max(0, 1.0 - (avg_response_time - 100) / 2000)  # Normalize around 100ms baseline
        efficiency_score += response_score * 0.3
        contributing_factors.append(f"response_performance: {response_score:.2f}")
        
        trend = self._calculate_trend(agent_id, CoherenceCategory.PERFORMANCE_EFFICIENCY, efficiency_score)
        
        return CoherenceMetric(
            category=CoherenceCategory.PERFORMANCE_EFFICIENCY,
            value=min(efficiency_score, 1.0),
            confidence=0.90,
            measurement_time=datetime.now(timezone.utc),
            contributing_factors=contributing_factors,
            trend_direction=trend
        )
    
    async def _analyze_trinity_harmony(self, agent_id: str, agent_data: Dict[str, Any]) -> CoherenceMetric:
        """Analyze trinity role harmony and coordination"""
        contributing_factors = []
        harmony_score = 0.0
        
        # Check trinity role fulfillment
        trinity_role = agent_data.get('trinity_role', 'none')
        if trinity_role != 'none':
            role_fulfillment = agent_data.get('role_fulfillment_score', 0.7)
            harmony_score += role_fulfillment * 0.5
            contributing_factors.append(f"role_fulfillment: {role_fulfillment:.2f}")
        
        # Check collaboration with other trinity nodes
        collaboration_score = agent_data.get('trinity_collaboration_score', 0.6)
        harmony_score += collaboration_score * 0.3
        contributing_factors.append(f"trinity_collaboration: {collaboration_score:.2f}")
        
        # Check consensus participation
        consensus_participation = agent_data.get('consensus_participation_rate', 0.8)
        harmony_score += consensus_participation * 0.2
        contributing_factors.append(f"consensus_participation: {consensus_participation:.2f}")
        
        trend = self._calculate_trend(agent_id, CoherenceCategory.TRINITY_ROLE_HARMONY, harmony_score)
        
        return CoherenceMetric(
            category=CoherenceCategory.TRINITY_ROLE_HARMONY,
            value=min(harmony_score, 1.0),
            confidence=0.80,
            measurement_time=datetime.now(timezone.utc),
            contributing_factors=contributing_factors,
            trend_direction=trend
        )
    
    async def _analyze_narrative_consistency(self, agent_id: str, agent_data: Dict[str, Any]) -> CoherenceMetric:
        """Analyze narrative consistency and story coherence"""
        contributing_factors = []
        consistency_score = 0.0
        
        # Check story coherence maintenance
        story_coherence = agent_data.get('story_coherence_score', 0.7)
        consistency_score += story_coherence * 0.5
        contributing_factors.append(f"story_coherence: {story_coherence:.2f}")
        
        # Check identity consistency
        identity_consistency = agent_data.get('identity_consistency_score', 0.8)
        consistency_score += identity_consistency * 0.3
        contributing_factors.append(f"identity_consistency: {identity_consistency:.2f}")
        
        # Check behavior predictability
        behavior_predictability = agent_data.get('behavior_predictability', 0.6)
        consistency_score += behavior_predictability * 0.2
        contributing_factors.append(f"behavior_predictability: {behavior_predictability:.2f}")
        
        trend = self._calculate_trend(agent_id, CoherenceCategory.NARRATIVE_CONSISTENCY, consistency_score)
        
        return CoherenceMetric(
            category=CoherenceCategory.NARRATIVE_CONSISTENCY,
            value=min(consistency_score, 1.0),
            confidence=0.70,
            measurement_time=datetime.now(timezone.utc),
            contributing_factors=contributing_factors,
            trend_direction=trend
        )
    
    def _calculate_trend(self, agent_id: str, category: CoherenceCategory, current_score: float) -> str:
        """Calculate trend direction for a coherence category"""
        # This would look at historical scores to determine trend
        # For demo purposes, we'll simulate trend detection
        
        historical_scores = [0.75, 0.77, 0.79, current_score]  # Simulated history
        
        if len(historical_scores) < 2:
            return "stable"
        
        recent_avg = statistics.mean(historical_scores[-3:])
        older_avg = statistics.mean(historical_scores[:-3] if len(historical_scores) > 3 else historical_scores[:-1])
        
        change_threshold = 0.05
        
        if recent_avg > older_avg + change_threshold:
            return "improving"
        elif recent_avg < older_avg - change_threshold:
            return "declining"
        else:
            return "stable"

class CollapseRiskAnalyzer:
    """Analyzes collapse risk factors for agents"""
    
    def __init__(self, vanta_path: Path):
        self.vanta_path = vanta_path
        self.risk_weights = {
            CollapseRiskFactor.UTILITY_DECLINE: 0.30,
            CollapseRiskFactor.RESOURCE_WASTE: 0.20,
            CollapseRiskFactor.CONFLICT_GENERATION: 0.20,
            CollapseRiskFactor.OBSOLESCENCE: 0.15,
            CollapseRiskFactor.COHERENCE_LOSS: 0.10,
            CollapseRiskFactor.PERFORMANCE_DEGRADATION: 0.05
        }
    
    async def analyze_collapse_risk(self, agent_id: str, agent_data: Dict[str, Any], coherence_metrics: List[CoherenceMetric]) -> List[CollapseRiskMetric]:
        """Analyze all collapse risk factors for an agent"""
        metrics = []
        
        # Utility decline analysis
        utility_metric = await self._analyze_utility_decline(agent_id, agent_data)
        metrics.append(utility_metric)
        
        # Resource waste analysis
        resource_metric = await self._analyze_resource_waste(agent_id, agent_data)
        metrics.append(resource_metric)
        
        # Conflict generation analysis
        conflict_metric = await self._analyze_conflict_generation(agent_id, agent_data)
        metrics.append(conflict_metric)
        
        # Obsolescence analysis
        obsolescence_metric = await self._analyze_obsolescence(agent_id, agent_data)
        metrics.append(obsolescence_metric)
        
        # Coherence loss analysis (based on coherence metrics)
        coherence_loss_metric = await self._analyze_coherence_loss(agent_id, coherence_metrics)
        metrics.append(coherence_loss_metric)
        
        return metrics
    
    async def _analyze_utility_decline(self, agent_id: str, agent_data: Dict[str, Any]) -> CollapseRiskMetric:
        """Analyze utility decline risk"""
        indicators = []
        risk_level = 0.0
        interventions = []
        
        # Check usage frequency
        usage_frequency = agent_data.get('usage_frequency', 1.0)
        if usage_frequency < 0.3:
            risk_level += 0.4
            indicators.append(f"low_usage_frequency: {usage_frequency:.2f}")
            interventions.append("Analyze usage patterns and optimize capabilities")
        
        # Check task success rate
        success_rate = agent_data.get('task_success_rate', 0.8)
        if success_rate < 0.6:
            risk_level += 0.3
            indicators.append(f"low_success_rate: {success_rate:.2f}")
            interventions.append("Improve task execution algorithms")
        
        # Check relevance to current needs
        relevance_score = agent_data.get('relevance_score', 0.7)
        if relevance_score < 0.5:
            risk_level += 0.3
            indicators.append(f"low_relevance: {relevance_score:.2f}")
            interventions.append("Update capabilities to match current needs")
        
        urgency = min(risk_level * 1.2, 1.0)  # Higher urgency for utility issues
        
        return CollapseRiskMetric(
            factor=CollapseRiskFactor.UTILITY_DECLINE,
            risk_level=min(risk_level, 1.0),
            urgency=urgency,
            measurement_time=datetime.now(timezone.utc),
            indicators=indicators,
            intervention_suggestions=interventions
        )
    
    async def _analyze_resource_waste(self, agent_id: str, agent_data: Dict[str, Any]) -> CollapseRiskMetric:
        """Analyze resource waste risk"""
        indicators = []
        risk_level = 0.0
        interventions = []
        
        # Check CPU utilization efficiency
        cpu_efficiency = agent_data.get('cpu_efficiency', 0.7)
        if cpu_efficiency < 0.4:
            risk_level += 0.3
            indicators.append(f"poor_cpu_efficiency: {cpu_efficiency:.2f}")
            interventions.append("Optimize computational algorithms")
        
        # Check memory usage efficiency
        memory_efficiency = agent_data.get('memory_efficiency', 0.8)
        if memory_efficiency < 0.5:
            risk_level += 0.3
            indicators.append(f"poor_memory_efficiency: {memory_efficiency:.2f}")
            interventions.append("Optimize memory usage patterns")
        
        # Check resource utilization vs output
        resource_output_ratio = agent_data.get('resource_output_ratio', 0.6)
        if resource_output_ratio < 0.3:
            risk_level += 0.4
            indicators.append(f"poor_resource_output_ratio: {resource_output_ratio:.2f}")
            interventions.append("Rebalance resource allocation")
        
        urgency = risk_level * 0.8  # Moderate urgency for resource issues
        
        return CollapseRiskMetric(
            factor=CollapseRiskFactor.RESOURCE_WASTE,
            risk_level=min(risk_level, 1.0),
            urgency=urgency,
            measurement_time=datetime.now(timezone.utc),
            indicators=indicators,
            intervention_suggestions=interventions
        )
    
    async def _analyze_conflict_generation(self, agent_id: str, agent_data: Dict[str, Any]) -> CollapseRiskMetric:
        """Analyze conflict generation risk"""
        indicators = []
        risk_level = 0.0
        interventions = []
        
        # Check conflict frequency
        conflict_count = agent_data.get('conflicts_generated_last_week', 0)
        if conflict_count > 3:
            risk_level += 0.5
            indicators.append(f"high_conflict_generation: {conflict_count}")
            interventions.append("Review interaction protocols and conflict resolution")
        
        # Check collaboration issues
        collaboration_problems = agent_data.get('collaboration_issues', 0)
        if collaboration_problems > 2:
            risk_level += 0.3
            indicators.append(f"collaboration_problems: {collaboration_problems}")
            interventions.append("Improve collaboration algorithms")
        
        # Check consensus disruption
        consensus_disruptions = agent_data.get('consensus_disruptions', 0)
        if consensus_disruptions > 1:
            risk_level += 0.2
            indicators.append(f"consensus_disruptions: {consensus_disruptions}")
            interventions.append("Enhance consensus participation protocols")
        
        urgency = min(risk_level * 1.3, 1.0)  # High urgency for conflict issues
        
        return CollapseRiskMetric(
            factor=CollapseRiskFactor.CONFLICT_GENERATION,
            risk_level=min(risk_level, 1.0),
            urgency=urgency,
            measurement_time=datetime.now(timezone.utc),
            indicators=indicators,
            intervention_suggestions=interventions
        )
    
    async def _analyze_obsolescence(self, agent_id: str, agent_data: Dict[str, Any]) -> CollapseRiskMetric:
        """Analyze obsolescence risk"""
        indicators = []
        risk_level = 0.0
        interventions = []
        
        # Check technology stack age
        tech_age_months = agent_data.get('technology_age_months', 6)
        if tech_age_months > 18:
            risk_level += 0.3
            indicators.append(f"outdated_technology: {tech_age_months} months")
            interventions.append("Update to current technology standards")
        
        # Check capability relevance
        capability_relevance = agent_data.get('capability_relevance', 0.8)
        if capability_relevance < 0.4:
            risk_level += 0.4
            indicators.append(f"irrelevant_capabilities: {capability_relevance:.2f}")
            interventions.append("Modernize capabilities to current requirements")
        
        # Check replacement availability
        replacement_available = agent_data.get('replacement_agent_available', False)
        if replacement_available:
            risk_level += 0.3
            indicators.append("replacement_agent_exists")
            interventions.append("Consider graceful migration to newer agent")
        
        urgency = risk_level * 0.6  # Lower urgency for obsolescence
        
        return CollapseRiskMetric(
            factor=CollapseRiskFactor.OBSOLESCENCE,
            risk_level=min(risk_level, 1.0),
            urgency=urgency,
            measurement_time=datetime.now(timezone.utc),
            indicators=indicators,
            intervention_suggestions=interventions
        )
    
    async def _analyze_coherence_loss(self, agent_id: str, coherence_metrics: List[CoherenceMetric]) -> CollapseRiskMetric:
        """Analyze coherence loss risk based on coherence metrics"""
        indicators = []
        risk_level = 0.0
        interventions = []
        
        # Check overall coherence trend
        declining_metrics = [m for m in coherence_metrics if m.trend_direction == "declining"]
        if len(declining_metrics) > len(coherence_metrics) / 2:
            risk_level += 0.5
            indicators.append(f"multiple_declining_coherence_metrics: {len(declining_metrics)}")
            interventions.append("Address declining coherence across multiple dimensions")
        
        # Check for very low coherence scores
        low_coherence_metrics = [m for m in coherence_metrics if m.value < 0.3]
        if low_coherence_metrics:
            risk_level += 0.4
            indicators.append(f"critically_low_coherence: {len(low_coherence_metrics)} metrics")
            interventions.append("Immediate intervention required for low coherence areas")
        
        # Check coherence confidence
        low_confidence_metrics = [m for m in coherence_metrics if m.confidence < 0.5]
        if low_confidence_metrics:
            risk_level += 0.1
            indicators.append(f"uncertain_coherence_measurements: {len(low_confidence_metrics)}")
            interventions.append("Improve coherence measurement accuracy")
        
        urgency = min(risk_level * 1.1, 1.0)
        
        return CollapseRiskMetric(
            factor=CollapseRiskFactor.COHERENCE_LOSS,
            risk_level=min(risk_level, 1.0),
            urgency=urgency,
            measurement_time=datetime.now(timezone.utc),
            indicators=indicators,
            intervention_suggestions=interventions
        )

class CoherenceScoringEngine:
    """Main engine for coherence and collapse scoring"""
    
    def __init__(self, vanta_path: Path):
        self.vanta_path = vanta_path
        self.coherence_analyzer = CoherenceAnalyzer(vanta_path)
        self.collapse_analyzer = CollapseRiskAnalyzer(vanta_path)
        self.scores_path = vanta_path / "runtime" / "coherence_scores"
        self.scores_path.mkdir(parents=True, exist_ok=True)
        
        # Auto-scoring configuration
        self.auto_scoring_enabled = True
        self.scoring_interval = 30 * 60  # 30 minutes
        
        # Start background scoring if enabled
        if self.auto_scoring_enabled:
            asyncio.create_task(self._background_scoring_loop())
    
    async def score_agent(self, agent_id: str, agent_data: Dict[str, Any]) -> AgentScore:
        """Generate complete score for an agent"""
        logger.info(f"📊 Scoring agent: {agent_id}")
        
        # Analyze coherence
        coherence_metrics = await self.coherence_analyzer.analyze_agent_coherence(agent_id, agent_data)
        
        # Analyze collapse risk
        collapse_metrics = await self.collapse_analyzer.analyze_collapse_risk(agent_id, agent_data, coherence_metrics)
        
        # Calculate overall scores
        coherence_score = self._calculate_overall_coherence(coherence_metrics)
        collapse_score = self._calculate_overall_collapse_risk(collapse_metrics)
        
        # Create agent score
        agent_score = AgentScore(
            agent_id=agent_id,
            coherence_score=coherence_score,
            collapse_score=collapse_score,
            coherence_metrics=coherence_metrics,
            collapse_metrics=collapse_metrics,
            last_updated=datetime.now(timezone.utc)
        )
        
        # Save score
        await self._save_agent_score(agent_score)
        
        # Check for intervention triggers
        await self._check_intervention_triggers(agent_score)
        
        logger.info(f"✅ Agent {agent_id} scored: coherence={coherence_score:.2f}, collapse_risk={collapse_score:.2f}")
        return agent_score
    
    def _calculate_overall_coherence(self, coherence_metrics: List[CoherenceMetric]) -> float:
        """Calculate weighted overall coherence score"""
        if not coherence_metrics:
            return 0.0
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for metric in coherence_metrics:
            weight = self.coherence_analyzer.scoring_weights.get(metric.category, 0.1)
            weighted_sum += metric.value * weight * metric.confidence
            total_weight += weight * metric.confidence
        
        return weighted_sum / total_weight if total_weight > 0 else 0.0
    
    def _calculate_overall_collapse_risk(self, collapse_metrics: List[CollapseRiskMetric]) -> float:
        """Calculate weighted overall collapse risk score"""
        if not collapse_metrics:
            return 0.0
        
        weighted_sum = 0.0
        total_weight = 0.0
        
        for metric in collapse_metrics:
            weight = self.collapse_analyzer.risk_weights.get(metric.factor, 0.1)
            # Weight by urgency as well
            effective_weight = weight * (1.0 + metric.urgency)
            weighted_sum += metric.risk_level * effective_weight
            total_weight += effective_weight
        
        return weighted_sum / total_weight if total_weight > 0 else 0.0
    
    async def _save_agent_score(self, agent_score: AgentScore):
        """Save agent score to file"""
        score_file = self.scores_path / f"{agent_score.agent_id}_score.yaml"
        
        # Convert to serializable format
        score_dict = {
            "agent_id": agent_score.agent_id,
            "coherence_score": agent_score.coherence_score,
            "collapse_score": agent_score.collapse_score,
            "last_updated": agent_score.last_updated.isoformat(),
            "coherence_metrics": [
                {
                    "category": metric.category.value,
                    "value": metric.value,
                    "confidence": metric.confidence,
                    "measurement_time": metric.measurement_time.isoformat(),
                    "contributing_factors": metric.contributing_factors,
                    "trend_direction": metric.trend_direction
                }
                for metric in agent_score.coherence_metrics
            ],
            "collapse_metrics": [
                {
                    "factor": metric.factor.value,
                    "risk_level": metric.risk_level,
                    "urgency": metric.urgency,
                    "measurement_time": metric.measurement_time.isoformat(),
                    "indicators": metric.indicators,
                    "intervention_suggestions": metric.intervention_suggestions
                }
                for metric in agent_score.collapse_metrics
            ]
        }
        
        with open(score_file, 'w') as f:
            yaml.dump(score_dict, f, default_flow_style=False)
    
    async def _check_intervention_triggers(self, agent_score: AgentScore):
        """Check if intervention is needed based on scores"""
        intervention_triggers = []
        
        # Critical coherence loss
        if agent_score.coherence_score < 0.3:
            intervention_triggers.append({
                "type": "critical_coherence_loss",
                "urgency": "high",
                "action": "immediate_coherence_restoration_required"
            })
        
        # High collapse risk
        if agent_score.collapse_score > 0.7:
            intervention_triggers.append({
                "type": "high_collapse_risk",
                "urgency": "high",
                "action": "collapse_prevention_measures_required"
            })
        
        # Declining trends
        declining_metrics = [m for m in agent_score.coherence_metrics if m.trend_direction == "declining"]
        if len(declining_metrics) >= 3:
            intervention_triggers.append({
                "type": "multiple_declining_trends",
                "urgency": "medium",
                "action": "trend_reversal_intervention_recommended"
            })
        
        # High urgency collapse factors
        urgent_collapse_factors = [m for m in agent_score.collapse_metrics if m.urgency > 0.8]
        if urgent_collapse_factors:
            intervention_triggers.append({
                "type": "urgent_collapse_factors",
                "urgency": "high",
                "action": "immediate_risk_mitigation_required",
                "factors": [f.factor.value for f in urgent_collapse_factors]
            })
        
        # Log and potentially trigger interventions
        if intervention_triggers:
            await self._log_intervention_triggers(agent_score.agent_id, intervention_triggers)
    
    async def _log_intervention_triggers(self, agent_id: str, triggers: List[Dict[str, Any]]):
        """Log intervention triggers"""
        log_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "agent_id": agent_id,
            "intervention_triggers": triggers
        }
        
        log_file = self.vanta_path / "runtime" / "intervention_log.jsonl"
        with open(log_file, 'a') as f:
            f.write(json.dumps(log_entry) + '\n')
        
        logger.warning(f"⚠️ Intervention triggers for {agent_id}: {len(triggers)} issues detected")
    
    async def _background_scoring_loop(self):
        """Background loop for automatic scoring"""
        while True:
            try:
                await self._score_all_agents()
                await asyncio.sleep(self.scoring_interval)
            except Exception as e:
                logger.error(f"❌ Error in background scoring: {e}")
                await asyncio.sleep(60)  # Wait a minute on error
    
    async def _score_all_agents(self):
        """Score all known agents"""
        # This would load agent data from registry and score each agent
        # For demo purposes, we'll simulate some agents
        
        demo_agents = {
            "SecurityGuardianAgent": {
                "task_completion_rate": 0.9,
                "resource_efficiency": 0.8,
                "avg_response_time_ms": 150,
                "archetypal_alignment": "athena",
                "trinity_role": "cube",
                "usage_frequency": 0.8,
                "conflicts_generated_last_week": 0
            },
            "EvolutionAgent": {
                "task_completion_rate": 0.85,
                "resource_efficiency": 0.7,
                "avg_response_time_ms": 300,
                "archetypal_alignment": "prometheus",
                "trinity_role": "dodecahedron",
                "usage_frequency": 0.6,
                "conflicts_generated_last_week": 1
            }
        }
        
        for agent_id, agent_data in demo_agents.items():
            await self.score_agent(agent_id, agent_data)

# Factory function
def create_coherence_scoring_engine(vanta_path: Path) -> CoherenceScoringEngine:
    """Create coherence scoring engine"""
    return CoherenceScoringEngine(vanta_path)

if __name__ == "__main__":
    async def demo_coherence_scoring():
        """Demo the coherence scoring system"""
        print("📊 Coherence & Collapse Scoring Engine Demo")
        print("=" * 50)
        
        vanta_path = Path(".vanta")
        vanta_path.mkdir(exist_ok=True)
        
        # Create scoring engine
        scoring_engine = create_coherence_scoring_engine(vanta_path)
        
        # Demo agent data
        agent_data = {
            "task_completion_rate": 0.85,
            "resource_efficiency": 0.75,
            "avg_response_time_ms": 200,
            "archetypal_alignment": "athena",
            "trinity_role": "cube",
            "usage_frequency": 0.7,
            "conflicts_generated_last_week": 1,
            "capabilities": ["security_analysis", "threat_detection"],
            "expected_capabilities": ["security_analysis", "threat_detection", "incident_response"]
        }
        
        # Score the agent
        agent_score = await scoring_engine.score_agent("DemoSecurityAgent", agent_data)
        
        print(f"\n✅ Agent Scoring Results:")
        print(f"   🎯 Agent ID: {agent_score.agent_id}")
        print(f"   📈 Coherence Score: {agent_score.coherence_score:.3f}")
        print(f"   ⚠️ Collapse Risk: {agent_score.collapse_score:.3f}")
        print(f"   📊 Coherence Metrics: {len(agent_score.coherence_metrics)}")
        print(f"   🚨 Collapse Metrics: {len(agent_score.collapse_metrics)}")
        
        print(f"\n📋 Coherence Breakdown:")
        for metric in agent_score.coherence_metrics:
            print(f"   - {metric.category.value}: {metric.value:.3f} ({metric.trend_direction})")
        
        print(f"\n⚠️ Collapse Risk Breakdown:")
        for metric in agent_score.collapse_metrics:
            print(f"   - {metric.factor.value}: {metric.risk_level:.3f} (urgency: {metric.urgency:.3f})")
        
        print(f"\n💾 Score saved to: {scoring_engine.scores_path}")
    
    asyncio.run(demo_coherence_scoring())