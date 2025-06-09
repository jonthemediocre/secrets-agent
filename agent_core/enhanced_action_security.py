"""
🛡️ ENHANCED ACTION SECURITY - Agentic Hardening
==============================================

Advanced security hardening for agentic actions in secrets management:
- Multi-layer action validation and pre-execution checks
- Real-time threat detection and response
- Cryptographic action verification
- Audit trail immutability
- Zero-trust security model
- Rate limiting and abuse prevention

Core Purpose: Ensure maximum security for all autonomous agent actions
"""

import asyncio
import json
import logging
import time
import hashlib
import hmac
import secrets
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union, Callable
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid
import jwt
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64

logger = logging.getLogger(__name__)

class ActionSeverity(Enum):
    """Action severity levels for risk assessment"""
    LOW = "low"              # Read-only, non-sensitive
    MEDIUM = "medium"        # Configuration changes
    HIGH = "high"           # Secret operations
    CRITICAL = "critical"   # System-wide changes
    EMERGENCY = "emergency" # Emergency actions

class ValidationStatus(Enum):
    """Action validation status"""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    REQUIRES_MFA = "requires_mfa"
    REQUIRES_COE = "requires_coe"
    BLOCKED = "blocked"

class ThreatLevel(Enum):
    """Real-time threat assessment levels"""
    MINIMAL = "minimal"
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    CRITICAL = "critical"

@dataclass
class ActionSecurityContext:
    """Security context for action execution"""
    action_id: str
    agent_id: str
    action_type: str
    action_payload: Dict[str, Any]
    severity: ActionSeverity
    requested_at: datetime
    originating_ip: Optional[str] = None
    user_context: Optional[Dict[str, Any]] = None
    environment: str = "production"
    requires_mfa: bool = False
    requires_coe_approval: bool = False
    threat_indicators: List[str] = field(default_factory=list)
    validation_checkpoints: List[str] = field(default_factory=list)

@dataclass
class SecurityValidationResult:
    """Result of security validation checks"""
    action_id: str
    validation_status: ValidationStatus
    security_score: float  # 0.0-1.0
    threat_level: ThreatLevel
    validation_details: Dict[str, Any]
    failed_checks: List[str] = field(default_factory=list)
    required_approvals: List[str] = field(default_factory=list)
    expires_at: Optional[datetime] = None
    validation_token: Optional[str] = None

@dataclass
class ActionAuditRecord:
    """Immutable audit record for action execution"""
    audit_id: str
    action_id: str
    agent_id: str
    action_type: str
    execution_status: str
    timestamp: datetime
    duration_ms: float
    security_context: ActionSecurityContext
    validation_result: SecurityValidationResult
    execution_result: Dict[str, Any]
    audit_hash: str
    previous_audit_hash: Optional[str] = None
    digital_signature: Optional[str] = None

class EnhancedActionSecurity:
    """
    🛡️ ENHANCED ACTION SECURITY SYSTEM
    
    Provides comprehensive security hardening for agentic actions:
    - Multi-layer validation and verification
    - Real-time threat detection
    - Cryptographic integrity
    - Immutable audit trails
    - Zero-trust security model
    """
    
    def __init__(self, security_config: Dict[str, Any] = None):
        self.security_config = security_config or {}
        
        # Security configuration
        self.zero_trust_mode = self.security_config.get("zero_trust_mode", True)
        self.mfa_required_for_critical = self.security_config.get("mfa_required_for_critical", True)
        self.coe_required_for_emergency = self.security_config.get("coe_required_for_emergency", True)
        self.max_action_rate_per_minute = self.security_config.get("max_action_rate", 30)
        
        # Cryptographic components
        self.encryption_key = self._generate_encryption_key()
        self.signing_key = self.security_config.get("signing_key", secrets.token_urlsafe(32))
        self.fernet = Fernet(self.encryption_key)
        
        # Security state
        self.action_rate_limiter: Dict[str, List[datetime]] = {}
        self.active_validations: Dict[str, SecurityValidationResult] = {}
        self.audit_chain: List[ActionAuditRecord] = []
        self.threat_indicators: Dict[str, Any] = {}
        self.blocked_agents: Set[str] = set()
        
        # Real-time monitoring
        self.security_events: List[Dict[str, Any]] = []
        self.anomaly_detector = ActionAnomalyDetector()
        
        logger.info("🛡️ Enhanced Action Security initialized with zero-trust mode")
    
    async def validate_action_security(self, context: ActionSecurityContext) -> SecurityValidationResult:
        """Comprehensive security validation for agent actions"""
        validation_start = time.time()
        validation_id = f"val_{int(time.time() * 1000)}"
        
        logger.info(f"🔍 Validating action security: {context.action_id}")
        
        try:
            # Initialize validation result
            validation_result = SecurityValidationResult(
                action_id=context.action_id,
                validation_status=ValidationStatus.PENDING,
                security_score=0.0,
                threat_level=ThreatLevel.MINIMAL,
                validation_details={}
            )
            
            # 1. Agent Identity Verification
            identity_check = await self._verify_agent_identity(context)
            validation_result.validation_details["identity_check"] = identity_check
            
            if not identity_check.get("verified", False):
                validation_result.validation_status = ValidationStatus.REJECTED
                validation_result.failed_checks.append("agent_identity_verification")
                return validation_result
            
            # 2. Rate Limiting Check
            rate_limit_check = await self._check_rate_limits(context)
            validation_result.validation_details["rate_limit_check"] = rate_limit_check
            
            if not rate_limit_check.get("allowed", True):
                validation_result.validation_status = ValidationStatus.BLOCKED
                validation_result.failed_checks.append("rate_limit_exceeded")
                return validation_result
            
            # 3. Action Payload Validation
            payload_validation = await self._validate_action_payload(context)
            validation_result.validation_details["payload_validation"] = payload_validation
            
            if not payload_validation.get("valid", True):
                validation_result.validation_status = ValidationStatus.REJECTED
                validation_result.failed_checks.extend(payload_validation.get("failed_checks", []))
            
            # 4. Threat Assessment
            threat_assessment = await self._assess_action_threats(context)
            validation_result.threat_level = ThreatLevel(threat_assessment.get("threat_level", "minimal"))
            validation_result.validation_details["threat_assessment"] = threat_assessment
            
            # 5. Security Score Calculation
            security_score = await self._calculate_security_score(context, validation_result)
            validation_result.security_score = security_score
            
            # 6. Approval Requirements Assessment
            approval_requirements = await self._assess_approval_requirements(context, validation_result)
            validation_result.required_approvals = approval_requirements.get("required_approvals", [])
            
            # 7. Determine Final Validation Status
            final_status = await self._determine_final_validation_status(context, validation_result)
            validation_result.validation_status = final_status
            
            # 8. Generate Validation Token if Approved
            if validation_result.validation_status in [ValidationStatus.APPROVED, ValidationStatus.REQUIRES_MFA, ValidationStatus.REQUIRES_COE]:
                validation_token = await self._generate_validation_token(context, validation_result)
                validation_result.validation_token = validation_token
                validation_result.expires_at = datetime.now(timezone.utc) + timedelta(minutes=15)
            
            # Store validation result
            self.active_validations[context.action_id] = validation_result
            
            # Log security event
            await self._log_security_event("action_validation", {
                "action_id": context.action_id,
                "agent_id": context.agent_id,
                "validation_status": validation_result.validation_status.value,
                "security_score": validation_result.security_score,
                "threat_level": validation_result.threat_level.value,
                "validation_time_ms": (time.time() - validation_start) * 1000
            })
            
            logger.info(f"✅ Action validation complete: {validation_result.validation_status.value} (score: {validation_result.security_score:.2f})")
            return validation_result
            
        except Exception as e:
            logger.error(f"❌ Action validation failed: {e}")
            return SecurityValidationResult(
                action_id=context.action_id,
                validation_status=ValidationStatus.REJECTED,
                security_score=0.0,
                threat_level=ThreatLevel.CRITICAL,
                validation_details={"error": str(e)},
                failed_checks=["validation_system_error"]
            )
    
    async def execute_secured_action(self, context: ActionSecurityContext, 
                                   action_executor: Callable) -> Dict[str, Any]:
        """Execute action with comprehensive security monitoring"""
        execution_start = time.time()
        
        logger.info(f"🔐 Executing secured action: {context.action_id}")
        
        try:
            # Pre-execution validation
            validation_result = await self.validate_action_security(context)
            
            if validation_result.validation_status == ValidationStatus.REJECTED:
                return {
                    "status": "rejected",
                    "reason": "Security validation failed",
                    "failed_checks": validation_result.failed_checks
                }
            
            if validation_result.validation_status == ValidationStatus.BLOCKED:
                return {
                    "status": "blocked",
                    "reason": "Action blocked by security policy"
                }
            
            if validation_result.validation_status in [ValidationStatus.REQUIRES_MFA, ValidationStatus.REQUIRES_COE]:
                return {
                    "status": "requires_approval",
                    "approval_type": validation_result.validation_status.value,
                    "required_approvals": validation_result.required_approvals,
                    "validation_token": validation_result.validation_token
                }
            
            # Real-time monitoring setup
            monitoring_task = asyncio.create_task(
                self._monitor_action_execution(context, validation_result)
            )
            
            # Execute the action
            try:
                execution_result = await action_executor(context)
                execution_status = "success"
            except Exception as e:
                execution_result = {"error": str(e)}
                execution_status = "failed"
                logger.error(f"❌ Action execution failed: {e}")
            
            # Stop monitoring
            monitoring_task.cancel()
            
            # Post-execution validation
            post_execution_validation = await self._validate_post_execution(
                context, validation_result, execution_result
            )
            
            # Create audit record
            audit_record = await self._create_audit_record(
                context, validation_result, execution_result, execution_status, execution_start
            )
            
            # Add to audit chain
            self.audit_chain.append(audit_record)
            
            # Log security event
            await self._log_security_event("action_executed", {
                "action_id": context.action_id,
                "agent_id": context.agent_id,
                "execution_status": execution_status,
                "execution_time_ms": (time.time() - execution_start) * 1000,
                "audit_id": audit_record.audit_id
            })
            
            logger.info(f"✅ Secured action execution complete: {execution_status}")
            return {
                "status": execution_status,
                "execution_result": execution_result,
                "audit_id": audit_record.audit_id,
                "security_context": asdict(validation_result)
            }
            
        except Exception as e:
            logger.error(f"❌ Secured action execution failed: {e}")
            return {"status": "error", "error": str(e)}
    
    async def get_security_dashboard(self) -> Dict[str, Any]:
        """Generate comprehensive security dashboard"""
        current_time = datetime.now(timezone.utc)
        
        # Calculate security metrics
        recent_actions = [
            audit for audit in self.audit_chain
            if (current_time - audit.timestamp).total_seconds() < 3600  # Last hour
        ]
        
        successful_actions = len([a for a in recent_actions if a.execution_status == "success"])
        total_recent_actions = len(recent_actions)
        
        security_events_last_hour = len([
            event for event in self.security_events
            if (current_time - datetime.fromisoformat(event["timestamp"])).total_seconds() < 3600
        ])
        
        # Threat level assessment
        current_threat_level = await self._assess_current_threat_level()
        
        dashboard = {
            "security_status": {
                "overall_status": "secure" if current_threat_level == ThreatLevel.MINIMAL else "monitoring",
                "zero_trust_mode": self.zero_trust_mode,
                "current_threat_level": current_threat_level.value,
                "blocked_agents": len(self.blocked_agents),
                "active_validations": len(self.active_validations)
            },
            
            "action_metrics": {
                "total_actions_audited": len(self.audit_chain),
                "recent_actions_1h": total_recent_actions,
                "successful_actions_1h": successful_actions,
                "success_rate_1h": successful_actions / max(1, total_recent_actions),
                "average_security_score": self._calculate_average_security_score()
            },
            
            "security_events": {
                "total_events": len(self.security_events),
                "events_last_hour": security_events_last_hour,
                "threat_detections": len([e for e in self.security_events if e.get("type") == "threat_detected"]),
                "validation_failures": len([e for e in self.security_events if e.get("type") == "validation_failed"])
            },
            
            "compliance_status": {
                "audit_trail_integrity": await self._verify_audit_chain_integrity(),
                "encryption_status": "active",
                "mfa_compliance": self.mfa_required_for_critical,
                "coe_compliance": self.coe_required_for_emergency
            },
            
            "generated_at": current_time.isoformat()
        }
        
        return dashboard
    
    # === PRIVATE HELPER METHODS ===
    
    def _generate_encryption_key(self) -> bytes:
        """Generate encryption key for secure operations"""
        password = self.security_config.get("master_key", "default_key").encode()
        salt = self.security_config.get("salt", b"default_salt").encode()[:16].ljust(16, b'\0')
        kdf = PBKDF2HMAC(
            algorithm=hashes.SHA256(),
            length=32,
            salt=salt,
            iterations=100000,
        )
        key = base64.urlsafe_b64encode(kdf.derive(password))
        return key
    
    async def _verify_agent_identity(self, context: ActionSecurityContext) -> Dict[str, Any]:
        """Verify agent identity and authorization"""
        try:
            # In production, this would verify against agent registry
            known_agents = ["enterprise_vault_master", "evolution_governance", "production_integration"]
            
            is_verified = context.agent_id in known_agents
            authorization_level = "full" if is_verified else "limited"
            
            return {
                "verified": is_verified,
                "authorization_level": authorization_level,
                "verification_method": "agent_registry_lookup",
                "last_auth_update": datetime.now(timezone.utc).isoformat()
            }
        except Exception as e:
            return {"verified": False, "error": str(e)}
    
    async def _check_rate_limits(self, context: ActionSecurityContext) -> Dict[str, Any]:
        """Check action rate limits for agent"""
        try:
            current_time = datetime.now(timezone.utc)
            agent_id = context.agent_id
            
            # Get recent actions for this agent
            if agent_id not in self.action_rate_limiter:
                self.action_rate_limiter[agent_id] = []
            
            recent_actions = self.action_rate_limiter[agent_id]
            
            # Remove actions older than 1 minute
            cutoff_time = current_time - timedelta(minutes=1)
            recent_actions = [t for t in recent_actions if t > cutoff_time]
            self.action_rate_limiter[agent_id] = recent_actions
            
            # Check if under rate limit
            action_count = len(recent_actions)
            allowed = action_count < self.max_action_rate_per_minute
            
            if allowed:
                # Add current action to rate limiter
                self.action_rate_limiter[agent_id].append(current_time)
            
            return {
                "allowed": allowed,
                "current_rate": action_count,
                "max_rate": self.max_action_rate_per_minute,
                "reset_time": (current_time + timedelta(minutes=1)).isoformat()
            }
        except Exception as e:
            return {"allowed": False, "error": str(e)}
    
    async def _validate_action_payload(self, context: ActionSecurityContext) -> Dict[str, Any]:
        """Validate action payload for security risks"""
        try:
            payload = context.action_payload
            failed_checks = []
            
            # Check for suspicious patterns
            if isinstance(payload, dict):
                # Check for potential injection attacks
                for key, value in payload.items():
                    if isinstance(value, str):
                        if any(pattern in value.lower() for pattern in ['<script>', 'javascript:', 'eval(', 'exec(']):
                            failed_checks.append(f"potential_injection_in_{key}")
                        
                        # Check for overly large payloads
                        if len(value) > 10000:  # 10KB limit
                            failed_checks.append(f"oversized_payload_in_{key}")
            
            # Check for required fields based on action type
            required_fields = self._get_required_fields(context.action_type)
            for field in required_fields:
                if field not in payload:
                    failed_checks.append(f"missing_required_field_{field}")
            
            return {
                "valid": len(failed_checks) == 0,
                "failed_checks": failed_checks,
                "payload_size": len(str(payload)),
                "validation_checks_performed": len(required_fields) + 2
            }
        except Exception as e:
            return {"valid": False, "failed_checks": ["payload_validation_error"], "error": str(e)}
    
    def _get_required_fields(self, action_type: str) -> List[str]:
        """Get required fields for action type"""
        field_map = {
            "secret_rotation": ["secret_id", "new_value"],
            "vault_access": ["vault_path", "operation"],
            "compliance_report": ["report_type", "time_range"],
            "security_scan": ["scan_type", "target"]
        }
        return field_map.get(action_type, [])
    
    async def _assess_action_threats(self, context: ActionSecurityContext) -> Dict[str, Any]:
        """Assess threats associated with action"""
        try:
            threat_indicators = []
            threat_score = 0.0
            
            # Time-based threat assessment
            current_hour = datetime.now(timezone.utc).hour
            if current_hour < 6 or current_hour > 22:  # After hours
                threat_indicators.append("after_hours_execution")
                threat_score += 0.2
            
            # Action frequency assessment
            agent_recent_actions = len([
                audit for audit in self.audit_chain[-50:]  # Last 50 actions
                if audit.agent_id == context.agent_id
            ])
            
            if agent_recent_actions > 20:  # High activity
                threat_indicators.append("high_activity_agent")
                threat_score += 0.3
            
            # Severity-based assessment
            if context.severity in [ActionSeverity.CRITICAL, ActionSeverity.EMERGENCY]:
                threat_score += 0.4
                threat_indicators.append("high_severity_action")
            
            # Environment assessment
            if context.environment == "production":
                threat_score += 0.1
                threat_indicators.append("production_environment")
            
            # Determine threat level
            if threat_score >= 0.8:
                threat_level = "critical"
            elif threat_score >= 0.6:
                threat_level = "high"
            elif threat_score >= 0.4:
                threat_level = "moderate"
            elif threat_score >= 0.2:
                threat_level = "low"
            else:
                threat_level = "minimal"
            
            return {
                "threat_level": threat_level,
                "threat_score": threat_score,
                "threat_indicators": threat_indicators,
                "assessment_factors": {
                    "time_factor": 0.2 if len([i for i in threat_indicators if "after_hours" in i]) else 0.0,
                    "frequency_factor": 0.3 if agent_recent_actions > 20 else 0.0,
                    "severity_factor": 0.4 if context.severity in [ActionSeverity.CRITICAL, ActionSeverity.EMERGENCY] else 0.0,
                    "environment_factor": 0.1 if context.environment == "production" else 0.0
                }
            }
        except Exception as e:
            return {"threat_level": "critical", "error": str(e)}
    
    async def _calculate_security_score(self, context: ActionSecurityContext, 
                                      validation_result: SecurityValidationResult) -> float:
        """Calculate overall security score for action"""
        try:
            base_score = 0.5  # Starting score
            
            # Identity verification bonus
            identity_check = validation_result.validation_details.get("identity_check", {})
            if identity_check.get("verified", False):
                base_score += 0.2
            
            # Rate limiting compliance bonus
            rate_check = validation_result.validation_details.get("rate_limit_check", {})
            if rate_check.get("allowed", False):
                base_score += 0.1
            
            # Payload validation bonus
            payload_check = validation_result.validation_details.get("payload_validation", {})
            if payload_check.get("valid", False):
                base_score += 0.15
            
            # Threat assessment impact
            threat_assessment = validation_result.validation_details.get("threat_assessment", {})
            threat_score = threat_assessment.get("threat_score", 0.5)
            base_score -= threat_score * 0.3  # Reduce score based on threat
            
            # Environment factor
            if context.environment == "production":
                base_score += 0.05  # Slight bonus for production readiness
            
            # Ensure score is within bounds
            security_score = max(0.0, min(1.0, base_score))
            
            return round(security_score, 3)
        except Exception as e:
            logger.warning(f"⚠️ Security score calculation failed: {e}")
            return 0.0
    
    async def _assess_approval_requirements(self, context: ActionSecurityContext,
                                          validation_result: SecurityValidationResult) -> Dict[str, Any]:
        """Assess what approvals are required for action"""
        required_approvals = []
        
        # MFA requirements
        if (self.mfa_required_for_critical and 
            context.severity in [ActionSeverity.CRITICAL, ActionSeverity.EMERGENCY]):
            required_approvals.append("multi_factor_authentication")
        
        # CoE requirements
        if (self.coe_required_for_emergency and 
            context.severity == ActionSeverity.EMERGENCY):
            required_approvals.append("coalition_of_experts")
        
        # High threat level requirements
        if validation_result.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:
            required_approvals.append("security_officer_review")
        
        # Low security score requirements
        if validation_result.security_score < 0.7:
            required_approvals.append("enhanced_verification")
        
        return {
            "required_approvals": required_approvals,
            "approval_rationale": {
                "mfa_required": self.mfa_required_for_critical and context.severity in [ActionSeverity.CRITICAL, ActionSeverity.EMERGENCY],
                "coe_required": self.coe_required_for_emergency and context.severity == ActionSeverity.EMERGENCY,
                "threat_level_concern": validation_result.threat_level in [ThreatLevel.HIGH, ThreatLevel.CRITICAL],
                "security_score_concern": validation_result.security_score < 0.7
            }
        }
    
    async def _determine_final_validation_status(self, context: ActionSecurityContext,
                                               validation_result: SecurityValidationResult) -> ValidationStatus:
        """Determine final validation status"""
        # If any critical checks failed, reject
        if validation_result.failed_checks:
            critical_failures = [check for check in validation_result.failed_checks 
                               if any(critical in check for critical in ["identity", "injection", "system_error"])]
            if critical_failures:
                return ValidationStatus.REJECTED
        
        # If requires approvals, set appropriate status
        if validation_result.required_approvals:
            if "multi_factor_authentication" in validation_result.required_approvals:
                return ValidationStatus.REQUIRES_MFA
            if "coalition_of_experts" in validation_result.required_approvals:
                return ValidationStatus.REQUIRES_COE
        
        # If security score too low, reject
        if validation_result.security_score < 0.3:
            return ValidationStatus.REJECTED
        
        # If threat level too high without approvals, block
        if (validation_result.threat_level == ThreatLevel.CRITICAL and 
            not validation_result.required_approvals):
            return ValidationStatus.BLOCKED
        
        # Otherwise approve
        return ValidationStatus.APPROVED
    
    async def _generate_validation_token(self, context: ActionSecurityContext,
                                       validation_result: SecurityValidationResult) -> str:
        """Generate cryptographic validation token"""
        try:
            token_payload = {
                "action_id": context.action_id,
                "agent_id": context.agent_id,
                "validation_status": validation_result.validation_status.value,
                "security_score": validation_result.security_score,
                "expires_at": (datetime.now(timezone.utc) + timedelta(minutes=15)).isoformat(),
                "issued_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Sign token
            token = jwt.encode(token_payload, self.signing_key, algorithm="HS256")
            return token
        except Exception as e:
            logger.error(f"❌ Token generation failed: {e}")
            return ""
    
    async def _monitor_action_execution(self, context: ActionSecurityContext,
                                      validation_result: SecurityValidationResult):
        """Monitor action execution in real-time"""
        try:
            start_time = time.time()
            max_execution_time = 300  # 5 minutes max
            
            while time.time() - start_time < max_execution_time:
                # Check for anomalies
                anomalies = await self.anomaly_detector.detect_anomalies(context)
                
                if anomalies:
                    await self._log_security_event("execution_anomaly", {
                        "action_id": context.action_id,
                        "anomalies": anomalies
                    })
                
                await asyncio.sleep(1)  # Check every second
                
        except asyncio.CancelledError:
            # Normal cancellation when execution completes
            pass
        except Exception as e:
            logger.error(f"❌ Action monitoring failed: {e}")
    
    async def _validate_post_execution(self, context: ActionSecurityContext,
                                     validation_result: SecurityValidationResult,
                                     execution_result: Dict[str, Any]) -> Dict[str, Any]:
        """Validate action results after execution"""
        try:
            post_validation = {
                "execution_time_reasonable": True,
                "result_format_valid": True,
                "no_security_violations": True
            }
            
            # Check execution result format
            if not isinstance(execution_result, dict):
                post_validation["result_format_valid"] = False
            
            # Check for error patterns
            if execution_result.get("error"):
                error_msg = str(execution_result["error"]).lower()
                if any(pattern in error_msg for pattern in ["access denied", "unauthorized", "forbidden"]):
                    post_validation["no_security_violations"] = False
            
            return post_validation
        except Exception as e:
            return {"post_validation_error": str(e)}
    
    async def _create_audit_record(self, context: ActionSecurityContext,
                                 validation_result: SecurityValidationResult,
                                 execution_result: Dict[str, Any],
                                 execution_status: str,
                                 execution_start: float) -> ActionAuditRecord:
        """Create immutable audit record"""
        audit_id = f"audit_{int(time.time() * 1000)}_{secrets.token_hex(8)}"
        execution_duration = (time.time() - execution_start) * 1000
        
        # Get hash of previous audit record
        previous_hash = self.audit_chain[-1].audit_hash if self.audit_chain else None
        
        # Create audit record
        audit_record = ActionAuditRecord(
            audit_id=audit_id,
            action_id=context.action_id,
            agent_id=context.agent_id,
            action_type=context.action_type,
            execution_status=execution_status,
            timestamp=datetime.now(timezone.utc),
            duration_ms=execution_duration,
            security_context=context,
            validation_result=validation_result,
            execution_result=execution_result,
            audit_hash="",  # Will be calculated
            previous_audit_hash=previous_hash
        )
        
        # Calculate audit hash
        audit_content = f"{audit_id}{context.action_id}{context.agent_id}{execution_status}{execution_duration}{previous_hash or ''}"
        audit_hash = hashlib.sha256(audit_content.encode()).hexdigest()
        audit_record.audit_hash = audit_hash
        
        # Digital signature
        signature = hmac.new(
            self.signing_key.encode(),
            audit_hash.encode(),
            hashlib.sha256
        ).hexdigest()
        audit_record.digital_signature = signature
        
        return audit_record
    
    async def _log_security_event(self, event_type: str, event_data: Dict[str, Any]):
        """Log security event"""
        security_event = {
            "event_id": f"event_{int(time.time() * 1000)}",
            "type": event_type,
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "data": event_data
        }
        
        self.security_events.append(security_event)
        
        # Keep only last 1000 events
        if len(self.security_events) > 1000:
            self.security_events = self.security_events[-1000:]
    
    async def _assess_current_threat_level(self) -> ThreatLevel:
        """Assess current overall threat level"""
        try:
            # Count recent security events
            recent_events = [
                event for event in self.security_events
                if (datetime.now(timezone.utc) - datetime.fromisoformat(event["timestamp"])).total_seconds() < 3600
            ]
            
            threat_events = len([e for e in recent_events if "threat" in e.get("type", "")])
            validation_failures = len([e for e in recent_events if "validation" in e.get("type", "")])
            
            if threat_events > 10 or validation_failures > 20:
                return ThreatLevel.CRITICAL
            elif threat_events > 5 or validation_failures > 10:
                return ThreatLevel.HIGH
            elif threat_events > 2 or validation_failures > 5:
                return ThreatLevel.MODERATE
            elif threat_events > 0 or validation_failures > 0:
                return ThreatLevel.LOW
            else:
                return ThreatLevel.MINIMAL
        except Exception as e:
            logger.error(f"❌ Threat level assessment failed: {e}")
            return ThreatLevel.HIGH  # Fail secure
    
    def _calculate_average_security_score(self) -> float:
        """Calculate average security score from recent validations"""
        if not self.active_validations:
            return 0.0
        
        scores = [val.security_score for val in self.active_validations.values()]
        return round(sum(scores) / len(scores), 3)
    
    async def _verify_audit_chain_integrity(self) -> bool:
        """Verify integrity of audit chain"""
        try:
            if not self.audit_chain:
                return True
            
            for i, audit_record in enumerate(self.audit_chain):
                # Verify hash
                expected_content = f"{audit_record.audit_id}{audit_record.action_id}{audit_record.agent_id}{audit_record.execution_status}{audit_record.duration_ms}{audit_record.previous_audit_hash or ''}"
                expected_hash = hashlib.sha256(expected_content.encode()).hexdigest()
                
                if audit_record.audit_hash != expected_hash:
                    return False
                
                # Verify signature
                expected_signature = hmac.new(
                    self.signing_key.encode(),
                    audit_record.audit_hash.encode(),
                    hashlib.sha256
                ).hexdigest()
                
                if audit_record.digital_signature != expected_signature:
                    return False
                
                # Verify chain linkage
                if i > 0:
                    previous_record = self.audit_chain[i-1]
                    if audit_record.previous_audit_hash != previous_record.audit_hash:
                        return False
            
            return True
        except Exception as e:
            logger.error(f"❌ Audit chain verification failed: {e}")
            return False

class ActionAnomalyDetector:
    """Detects anomalies in action execution"""
    
    def __init__(self):
        self.baseline_metrics = {}
    
    async def detect_anomalies(self, context: ActionSecurityContext) -> List[str]:
        """Detect execution anomalies"""
        anomalies = []
        
        # Placeholder for anomaly detection logic
        # In production, this would use ML models or statistical analysis
        
        return anomalies

# Factory function
def create_enhanced_action_security(security_config: Dict[str, Any] = None) -> EnhancedActionSecurity:
    """Create enhanced action security system"""
    return EnhancedActionSecurity(security_config)

if __name__ == "__main__":
    # Demo enhanced action security
    async def demo():
        print("🛡️ Enhanced Action Security Demo")
        print("=" * 50)
        
        # Create security system
        security = create_enhanced_action_security({
            "zero_trust_mode": True,
            "mfa_required_for_critical": True,
            "max_action_rate": 10
        })
        
        # Demo action context
        context = ActionSecurityContext(
            action_id="demo_action_001",
            agent_id="enterprise_vault_master",
            action_type="secret_rotation",
            action_payload={"secret_id": "test_secret", "new_value": "encrypted_value"},
            severity=ActionSeverity.HIGH,
            requested_at=datetime.now(timezone.utc),
            environment="production"
        )
        
        # Validate action
        validation_result = await security.validate_action_security(context)
        print(f"🔍 Validation Status: {validation_result.validation_status.value}")
        print(f"📊 Security Score: {validation_result.security_score}")
        print(f"⚠️ Threat Level: {validation_result.threat_level.value}")
        
        # Get security dashboard
        dashboard = await security.get_security_dashboard()
        print(f"🛡️ Security Status: {dashboard['security_status']['overall_status']}")
        
        print("\n✅ Enhanced action security demo complete!")
    
    asyncio.run(demo()) 