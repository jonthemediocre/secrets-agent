"""
🔒 SECRET LIFECYCLE ENGINE - Phase 3.2 Symbolic Secret Management
==============================================================

Applies symbolic reasoning and value gradients to secret lifecycle management.
This enhances our core secrets management with intelligent, autonomous capabilities.

Core Purpose: Enhanced secret security, rotation, and lifecycle management
Based on: ThePlan.md Phase 5-6 + mermaid symbolic architecture
"""

import json
import asyncio
import hashlib
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# Import our identity kernel for symbolic self-awareness
from .identity_kernel import IdentityKernel

logger = logging.getLogger(__name__)

class SecretRiskLevel(Enum):
    """Security risk classification for secrets"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class SecretLifecycleState(Enum):
    """Lifecycle states for secrets"""
    CREATED = "created"
    ACTIVE = "active"
    ROTATION_DUE = "rotation_due"
    ROTATING = "rotating"
    DEPRECATED = "deprecated"
    REVOKED = "revoked"

@dataclass
class SecretMetrics:
    """Value-driven metrics for secret management"""
    access_frequency: float
    security_score: float
    rotation_urgency: float
    compliance_score: float
    business_impact: float
    entropy_level: float

@dataclass
class SecretIntelligence:
    """AI-driven insights about a secret"""
    secret_id: str
    risk_assessment: SecretRiskLevel
    lifecycle_state: SecretLifecycleState
    metrics: SecretMetrics
    recommendations: List[str]
    predicted_rotation_date: str
    anomaly_indicators: List[str]
    compliance_status: Dict[str, bool]

class SecretLifecycleEngine:
    """
    🔒 SECRET LIFECYCLE ENGINE
    
    Applies symbolic reasoning to secret management for:
    - Intelligent rotation scheduling based on usage patterns
    - Risk-aware secret classification and monitoring
    - Value-driven security recommendations
    - Autonomous secret lifecycle management
    - Compliance-aware secret handling
    
    Core Focus: Making our secrets management intelligent and autonomous
    """
    
    def __init__(self, identity_kernel: IdentityKernel, vault_path: str = "vault/"):
        """Initialize with identity awareness"""
        self.identity = identity_kernel
        self.vault_path = vault_path
        
        # Secret intelligence tracking
        self.secret_intelligence: Dict[str, SecretIntelligence] = {}
        self.access_patterns: Dict[str, List[Dict]] = {}
        self.rotation_schedule: Dict[str, str] = {}
        
        # Value system for secret management (from mermaid architecture)
        self.value_weights = {
            "security": 0.4,      # Security is highest priority
            "compliance": 0.25,   # Regulatory compliance
            "availability": 0.2,  # System availability
            "efficiency": 0.15    # Operational efficiency
        }
        
        # Initialize symbolic reasoning for secrets
        self._initialize_secret_reasoning()
        
        logger.info(f"🔒 Secret Lifecycle Engine initialized for {identity_kernel.agent_id}")
    
    def _initialize_secret_reasoning(self):
        """Initialize symbolic reasoning capabilities for secret management"""
        # Update identity to reflect secret management specialization
        if self.identity.symbolic_self:
            secret_capabilities = [
                "secret_lifecycle_management",
                "risk_assessment", 
                "rotation_scheduling",
                "compliance_monitoring",
                "security_intelligence"
            ]
            
            self.identity.evolve_symbolic_self({
                "purpose_vector": "intelligent_secret_manager",
                "capabilities": secret_capabilities,
                "behavioral_patterns": {
                    "security_priority": "paranoid",
                    "rotation_strategy": "predictive",
                    "compliance_approach": "proactive"
                }
            }, "Specialized for intelligent secret lifecycle management")
    
    async def analyze_secret(self, secret_id: str, secret_metadata: Dict[str, Any]) -> SecretIntelligence:
        """Perform comprehensive secret analysis using symbolic reasoning"""
        
        # Calculate security metrics
        metrics = await self._calculate_secret_metrics(secret_id, secret_metadata)
        
        # Assess risk level
        risk_level = self._assess_secret_risk(metrics, secret_metadata)
        
        # Determine lifecycle state
        lifecycle_state = self._determine_lifecycle_state(secret_id, metrics)
        
        # Generate recommendations
        recommendations = self._generate_secret_recommendations(metrics, risk_level, lifecycle_state)
        
        # Predict optimal rotation date
        rotation_date = self._predict_rotation_date(secret_id, metrics, secret_metadata)
        
        # Detect anomalies
        anomalies = self._detect_secret_anomalies(secret_id, metrics)
        
        # Check compliance
        compliance = self._assess_compliance(secret_metadata, risk_level)
        
        intelligence = SecretIntelligence(
            secret_id=secret_id,
            risk_assessment=risk_level,
            lifecycle_state=lifecycle_state,
            metrics=metrics,
            recommendations=recommendations,
            predicted_rotation_date=rotation_date,
            anomaly_indicators=anomalies,
            compliance_status=compliance
        )
        
        # Store intelligence
        self.secret_intelligence[secret_id] = intelligence
        
        logger.info(f"🧠 Analyzed secret {secret_id}: Risk={risk_level.value}, State={lifecycle_state.value}")
        return intelligence
    
    async def _calculate_secret_metrics(self, secret_id: str, metadata: Dict[str, Any]) -> SecretMetrics:
        """Calculate value-driven metrics for secret"""
        
        # Access frequency analysis
        access_freq = self._calculate_access_frequency(secret_id)
        
        # Security score based on entropy, age, usage patterns
        security_score = self._calculate_security_score(secret_id, metadata)
        
        # Rotation urgency (higher = needs rotation sooner)
        rotation_urgency = self._calculate_rotation_urgency(secret_id, metadata)
        
        # Compliance score
        compliance_score = self._calculate_compliance_score(metadata)
        
        # Business impact assessment
        business_impact = self._assess_business_impact(secret_id, metadata)
        
        # Entropy level of the secret value
        entropy_level = self._calculate_entropy_level(metadata)
        
        return SecretMetrics(
            access_frequency=access_freq,
            security_score=security_score,
            rotation_urgency=rotation_urgency,
            compliance_score=compliance_score,
            business_impact=business_impact,
            entropy_level=entropy_level
        )
    
    def _assess_secret_risk(self, metrics: SecretMetrics, metadata: Dict[str, Any]) -> SecretRiskLevel:
        """Assess overall risk level using value-weighted scoring"""
        
        # Weighted risk calculation
        risk_score = (
            (1 - metrics.security_score) * self.value_weights["security"] +
            (1 - metrics.compliance_score) * self.value_weights["compliance"] +
            metrics.rotation_urgency * 0.3 +
            (1 - metrics.entropy_level) * 0.2
        )
        
        # Consider metadata factors
        if metadata.get("contains_prod_access", False):
            risk_score += 0.2
        if metadata.get("external_facing", False):
            risk_score += 0.15
        if metadata.get("privileged_access", False):
            risk_score += 0.25
        
        # Classify risk level
        if risk_score >= 0.8:
            return SecretRiskLevel.CRITICAL
        elif risk_score >= 0.6:
            return SecretRiskLevel.HIGH
        elif risk_score >= 0.4:
            return SecretRiskLevel.MEDIUM
        else:
            return SecretRiskLevel.LOW
    
    def _determine_lifecycle_state(self, secret_id: str, metrics: SecretMetrics) -> SecretLifecycleState:
        """Determine the current lifecycle state of a secret"""
        
        # Check rotation urgency
        if metrics.rotation_urgency > 0.9:
            return SecretLifecycleState.ROTATION_DUE
        elif metrics.rotation_urgency > 0.7:
            return SecretLifecycleState.ROTATING
        
        # Check if secret is being actively used
        if metrics.access_frequency > 0.1:
            return SecretLifecycleState.ACTIVE
        elif metrics.access_frequency == 0:
            # No recent access, might be deprecated
            return SecretLifecycleState.DEPRECATED
        
        # Default to created state for new secrets
        return SecretLifecycleState.CREATED
    
    def _generate_secret_recommendations(self, metrics: SecretMetrics, 
                                       risk: SecretRiskLevel, state: SecretLifecycleState) -> List[str]:
        """Generate intelligent recommendations for secret management"""
        recommendations = []
        
        # Security-based recommendations
        if metrics.security_score < 0.7:
            recommendations.append("🔒 Enhance secret strength - consider longer, more complex value")
        
        if metrics.entropy_level < 0.6:
            recommendations.append("🎲 Increase entropy - current secret predictability is concerning")
        
        # Rotation recommendations
        if metrics.rotation_urgency > 0.7:
            recommendations.append("🔄 Immediate rotation required - security window closing")
        elif metrics.rotation_urgency > 0.5:
            recommendations.append("⏰ Schedule rotation within 7 days")
        
        # Access pattern recommendations
        if metrics.access_frequency > 100:  # High frequency access
            recommendations.append("⚡ Consider caching strategy to reduce direct secret access")
        elif metrics.access_frequency < 0.1:  # Very low access
            recommendations.append("🗑️ Evaluate if secret is still needed - consider deprecation")
        
        # Risk-specific recommendations
        if risk == SecretRiskLevel.CRITICAL:
            recommendations.append("🚨 CRITICAL: Implement additional access controls immediately")
            recommendations.append("📊 Enable enhanced monitoring and alerting")
        elif risk == SecretRiskLevel.HIGH:
            recommendations.append("⚠️ Implement multi-factor authentication for access")
        
        # Compliance recommendations
        if metrics.compliance_score < 0.8:
            recommendations.append("📋 Review compliance requirements - gaps detected")
        
        return recommendations
    
    def _predict_rotation_date(self, secret_id: str, metrics: SecretMetrics, 
                             metadata: Dict[str, Any]) -> str:
        """Predict optimal rotation date using symbolic reasoning"""
        
        # Base rotation interval based on risk and business impact
        base_days = 90  # Default 3 months
        
        # Adjust based on metrics
        if metrics.business_impact > 0.8:
            base_days = 30  # High impact = monthly rotation
        elif metrics.business_impact > 0.6:
            base_days = 60  # Medium impact = bi-monthly
        
        # Security adjustments
        if metrics.security_score < 0.5:
            base_days = min(base_days, 14)  # Force early rotation for weak secrets
        
        # Access pattern adjustments
        if metrics.access_frequency > 50:
            base_days = max(base_days - 15, 7)  # More frequent access = more frequent rotation
        
        # Compliance requirements
        compliance_required_days = metadata.get("compliance_rotation_days", base_days)
        base_days = min(base_days, compliance_required_days)
        
        # Calculate target date
        target_date = datetime.now(timezone.utc) + timedelta(days=base_days)
        return target_date.isoformat()
    
    def _detect_secret_anomalies(self, secret_id: str, metrics: SecretMetrics) -> List[str]:
        """Detect anomalous patterns in secret usage"""
        anomalies = []
        
        # Get recent access patterns
        recent_access = self.access_patterns.get(secret_id, [])
        
        if len(recent_access) > 0:
            # Detect unusual access spikes
            avg_daily_access = sum(a.get('daily_count', 0) for a in recent_access[-7:]) / 7
            if any(a.get('daily_count', 0) > avg_daily_access * 3 for a in recent_access[-2:]):
                anomalies.append("📈 Unusual access spike detected in last 48 hours")
            
            # Detect access from new locations/systems
            recent_sources = set(a.get('source_system', 'unknown') for a in recent_access[-10:])
            if len(recent_sources) > len(set(a.get('source_system', 'unknown') for a in recent_access[-30:])):
                anomalies.append("🌍 New access sources detected")
        
        # Metric-based anomalies
        if metrics.rotation_urgency > 0.9:
            anomalies.append("⏰ Rotation window critically overdue")
        
        if metrics.security_score < 0.3:
            anomalies.append("🔴 Security score critically low")
        
        return anomalies
    
    def _assess_compliance(self, metadata: Dict[str, Any], risk: SecretRiskLevel) -> Dict[str, bool]:
        """Assess compliance with various security standards"""
        compliance = {}
        
        # SOC2 compliance checks
        compliance["soc2_rotation"] = metadata.get("last_rotated_days", 365) < 90
        compliance["soc2_access_logging"] = metadata.get("access_logging_enabled", False)
        compliance["soc2_encryption"] = metadata.get("encrypted_at_rest", False)
        
        # PCI DSS compliance (if applicable)
        if metadata.get("pci_scope", False):
            compliance["pci_quarterly_rotation"] = metadata.get("last_rotated_days", 365) < 90
            compliance["pci_strong_crypto"] = metadata.get("encryption_strength", "") in ["AES-256", "RSA-2048"]
        
        # GDPR compliance (for EU data)
        if metadata.get("contains_personal_data", False):
            compliance["gdpr_data_protection"] = metadata.get("personal_data_encrypted", False)
            compliance["gdpr_access_controls"] = metadata.get("role_based_access", False)
        
        # High-risk secret requirements
        if risk in [SecretRiskLevel.HIGH, SecretRiskLevel.CRITICAL]:
            compliance["high_risk_mfa"] = metadata.get("mfa_required", False)
            compliance["high_risk_monitoring"] = metadata.get("enhanced_monitoring", False)
        
        return compliance
    
    # Helper calculation methods
    def _calculate_access_frequency(self, secret_id: str) -> float:
        """Calculate access frequency per day"""
        access_history = self.access_patterns.get(secret_id, [])
        if not access_history:
            return 0.0
        
        total_access = sum(entry.get('daily_count', 0) for entry in access_history[-30:])
        return total_access / min(30, len(access_history))
    
    def _calculate_security_score(self, secret_id: str, metadata: Dict[str, Any]) -> float:
        """Calculate overall security score (0-1, higher is better)"""
        score = 0.5  # Base score
        
        # Age factor (newer is better)
        days_old = metadata.get("age_days", 0)
        age_score = max(0, 1 - (days_old / 365))  # Degrade over a year
        score += age_score * 0.2
        
        # Encryption factors
        if metadata.get("encrypted_at_rest", False):
            score += 0.2
        if metadata.get("encrypted_in_transit", False):
            score += 0.1
        
        # Access control factors
        if metadata.get("role_based_access", False):
            score += 0.1
        if metadata.get("mfa_required", False):
            score += 0.1
        
        return min(1.0, score)
    
    def _calculate_rotation_urgency(self, secret_id: str, metadata: Dict[str, Any]) -> float:
        """Calculate rotation urgency (0-1, higher means more urgent)"""
        days_since_rotation = metadata.get("last_rotated_days", 365)
        max_age = metadata.get("max_age_policy", 90)
        
        urgency = days_since_rotation / max_age
        return min(1.0, urgency)
    
    def _calculate_compliance_score(self, metadata: Dict[str, Any]) -> float:
        """Calculate compliance score (0-1, higher is better)"""
        score = 0.5
        
        if metadata.get("access_logging_enabled", False):
            score += 0.2
        if metadata.get("encryption_compliant", False):
            score += 0.2
        if metadata.get("retention_policy_compliant", False):
            score += 0.1
        
        return min(1.0, score)
    
    def _assess_business_impact(self, secret_id: str, metadata: Dict[str, Any]) -> float:
        """Assess business impact of secret compromise (0-1, higher is more impact)"""
        impact = 0.3  # Base impact
        
        if metadata.get("production_system", False):
            impact += 0.3
        if metadata.get("customer_facing", False):
            impact += 0.2
        if metadata.get("financial_system", False):
            impact += 0.2
        
        return min(1.0, impact)
    
    def _calculate_entropy_level(self, metadata: Dict[str, Any]) -> float:
        """Calculate entropy level of secret (0-1, higher is better)"""
        # This would analyze the actual secret in a real implementation
        # For now, use metadata hints
        length = metadata.get("secret_length", 20)
        charset_size = metadata.get("charset_complexity", 62)  # alphanumeric
        
        # Simplified entropy calculation
        entropy_bits = length * (charset_size.bit_length() - 1)
        max_entropy = 128  # Reasonable max for comparison
        
        return min(1.0, entropy_bits / max_entropy)
    
    async def schedule_autonomous_rotation(self, secret_id: str) -> bool:
        """Schedule autonomous rotation for a secret"""
        intelligence = self.secret_intelligence.get(secret_id)
        if not intelligence:
            logger.error(f"❌ No intelligence available for secret {secret_id}")
            return False
        
        # For high-risk secrets, trigger CoE review (following cursor rules)
        if intelligence.risk_assessment in [SecretRiskLevel.HIGH, SecretRiskLevel.CRITICAL]:
            rotation_proposal = {
                "type": "secret_rotation_request",
                "context": {
                    "secret_id": secret_id,
                    "risk_level": intelligence.risk_assessment.value,
                    "urgency": intelligence.metrics.rotation_urgency,
                    "business_impact": intelligence.metrics.business_impact
                },
                "proposal": {
                    "action": "autonomous_secret_rotation",
                    "predicted_date": intelligence.predicted_rotation_date,
                    "recommendations": intelligence.recommendations
                },
                "requester_agent": self.identity.agent_id
            }
            
            # Trigger CoE review instead of direct action (cursor rule 1015)
            logger.info(f"🧠 Triggering CoE review for high-risk secret rotation: {secret_id}")
            # In real implementation: self.event_bus.publish("coe_review_request", rotation_proposal)
            return True
        
        # For low-medium risk, schedule directly
        self.rotation_schedule[secret_id] = intelligence.predicted_rotation_date
        logger.info(f"📅 Scheduled rotation for {secret_id} on {intelligence.predicted_rotation_date}")
        return True

    def get_secret_dashboard(self) -> Dict[str, Any]:
        """Get comprehensive secret management dashboard"""
        total_secrets = len(self.secret_intelligence)
        
        risk_distribution = {}
        for risk_level in SecretRiskLevel:
            count = sum(1 for intel in self.secret_intelligence.values() 
                       if intel.risk_assessment == risk_level)
            risk_distribution[risk_level.value] = count
        
        rotation_due = sum(1 for intel in self.secret_intelligence.values()
                          if intel.lifecycle_state == SecretLifecycleState.ROTATION_DUE)
        
        compliance_issues = sum(1 for intel in self.secret_intelligence.values()
                               if not all(intel.compliance_status.values()))
        
        return {
            "total_secrets": total_secrets,
            "risk_distribution": risk_distribution,
            "rotation_due_count": rotation_due,
            "compliance_issues": compliance_issues,
            "agent_identity": self.identity.get_identity_summary(),
            "recommendations": self._get_global_recommendations()
        }
    
    def _get_global_recommendations(self) -> List[str]:
        """Get system-wide recommendations"""
        recommendations = []
        
        critical_count = sum(1 for intel in self.secret_intelligence.values()
                           if intel.risk_assessment == SecretRiskLevel.CRITICAL)
        
        if critical_count > 0:
            recommendations.append(f"🚨 {critical_count} critical risk secrets require immediate attention")
        
        rotation_overdue = sum(1 for intel in self.secret_intelligence.values()
                             if intel.metrics.rotation_urgency > 1.0)
        
        if rotation_overdue > 0:
            recommendations.append(f"⏰ {rotation_overdue} secrets are overdue for rotation")
        
        return recommendations

# Factory function
def create_secret_lifecycle_engine(agent_id: str) -> SecretLifecycleEngine:
    """Create secret lifecycle engine with identity"""
    from .identity_kernel import create_identity_kernel
    identity = create_identity_kernel(agent_id)
    return SecretLifecycleEngine(identity)

if __name__ == "__main__":
    # Demo the secret lifecycle engine
    import asyncio
    
    async def demo():
        engine = create_secret_lifecycle_engine("secret_manager_001")
        
        # Analyze a sample secret
        secret_metadata = {
            "age_days": 120,
            "last_rotated_days": 85,
            "production_system": True,
            "encrypted_at_rest": True,
            "access_logging_enabled": True,
            "secret_length": 32,
            "charset_complexity": 94
        }
        
        intelligence = await engine.analyze_secret("prod_db_password", secret_metadata)
        print(f"🔒 Secret Analysis: {intelligence.secret_id}")
        print(f"   Risk: {intelligence.risk_assessment.value}")
        print(f"   Recommendations: {intelligence.recommendations}")
        
        dashboard = engine.get_secret_dashboard()
        print(f"\n📊 Dashboard: {dashboard}")
    
    asyncio.run(demo()) 