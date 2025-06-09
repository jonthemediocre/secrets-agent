"""
🌐 UNIVERSAL AGENT PLATFORM INTEGRATION - Phase 4.4
=================================================

Integrates intelligent vault with Universal Agent Platform (UAP) for:
- Multi-application secret management across platforms
- Cross-platform intelligence sharing and pattern recognition
- Enterprise-wide governance and compliance coordination
- Scalable deployment and orchestration
- Universal application lifecycle management

Core Purpose: Scale intelligent vault capabilities across entire enterprise ecosystem
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple, Union
from dataclasses import dataclass, field, asdict
from enum import Enum
import uuid

# Import core components
from .intelligent_vault_agent import IntelligentVaultAgent
from .runtime_governance_engine import RuntimeGovernanceEngine
from .simple_memory_system import MemoryType

logger = logging.getLogger(__name__)

class PlatformScope(Enum):
    """Platform integration scope levels"""
    LOCAL = "local"          # Single node
    CLUSTER = "cluster"      # Kubernetes cluster
    ENTERPRISE = "enterprise" # Enterprise-wide
    GLOBAL = "global"        # Multi-region global

class ApplicationType(Enum):
    """Supported application types"""
    WEB_APPLICATION = "web_application"
    MICROSERVICE = "microservice"
    API_GATEWAY = "api_gateway"
    DATABASE = "database"
    AI_AGENT = "ai_agent"
    VAULT_MANAGER = "vault_manager"
    STREAMING_SERVICE = "streaming_service"
    BATCH_PROCESSOR = "batch_processor"

class IntegrationStatus(Enum):
    """Platform integration status"""
    INITIALIZING = "initializing"
    READY = "ready"
    SYNCING = "syncing"
    ERROR = "error"
    MAINTENANCE = "maintenance"

@dataclass
class ApplicationRegistration:
    """Application registration information"""
    app_id: str
    app_name: str
    app_type: ApplicationType
    platform_scope: PlatformScope
    secrets_count: int
    security_level: str
    compliance_requirements: List[str]
    intelligence_sharing: bool
    registration_time: datetime
    last_sync: Optional[datetime] = None
    sync_count: int = 0
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True

@dataclass
class IntelligenceSharing:
    """Cross-platform intelligence sharing record"""
    intelligence_id: str
    intelligence_type: str
    data: Dict[str, Any]
    confidence: float
    source_app: str
    target_apps: List[str]
    propagation_time: datetime
    success_count: int = 0
    failure_count: int = 0
    last_propagation: Optional[datetime] = None

@dataclass
class PlatformMetrics:
    """Universal platform performance metrics"""
    total_applications: int = 0
    active_applications: int = 0
    intelligence_shared: int = 0
    successful_deployments: int = 0
    failed_deployments: int = 0
    platform_efficiency: float = 0.0
    compliance_score: float = 0.0
    security_incidents: int = 0
    last_sync: Optional[datetime] = None
    uptime_hours: float = 0.0

class UniversalPlatformIntegration:
    """
    🌐 UNIVERSAL AGENT PLATFORM INTEGRATION
    
    Enterprise-scale platform integration providing:
    - Multi-application secret management
    - Cross-platform intelligence sharing
    - Enterprise governance coordination
    - Scalable deployment orchestration
    - Universal lifecycle management
    """
    
    def __init__(self, vault_agent: IntelligentVaultAgent, 
                 governance_engine: RuntimeGovernanceEngine,
                 integration_config: Dict[str, Any] = None):
        """Initialize universal platform integration"""
        self.vault_agent = vault_agent
        self.governance_engine = governance_engine
        self.integration_config = integration_config or {}
        
        # Platform identity and configuration
        self.platform_id = f"uap_{int(time.time())}"
        self.platform_scope = PlatformScope(self.integration_config.get("platform_scope", "enterprise"))
        self.integration_status = IntegrationStatus.INITIALIZING
        
        # Application registry
        self.applications: Dict[str, ApplicationRegistration] = {}
        self.intelligence_sharing: Dict[str, IntelligenceSharing] = {}
        
        # Platform configuration
        self.intelligence_sharing_enabled = self.integration_config.get("intelligence_sharing", True)
        self.auto_propagation = self.integration_config.get("auto_propagation", True)
        self.compliance_coordination = self.integration_config.get("compliance_coordination", True)
        
        # Platform metrics
        self.metrics = PlatformMetrics()
        self.start_time = datetime.now(timezone.utc)
        
        # Deployment orchestration
        self.deployment_history: List[Dict[str, Any]] = []
        
        logger.info(f"🌐 Universal Platform Integration initialized: {self.platform_id}")
    
    async def initialize_platform_integration(self) -> Dict[str, Any]:
        """Initialize the universal platform integration"""
        logger.info("🚀 Initializing Universal Agent Platform integration...")
        
        try:
            # Initialize core components
            vault_status = await self._initialize_vault_integration()
            governance_status = await self._initialize_governance_integration()
            
            # Setup intelligence sharing
            intelligence_status = await self._initialize_intelligence_sharing()
            
            # Initialize platform monitoring
            monitoring_status = await self._initialize_platform_monitoring()
            
            # Register vault manager as platform application
            vault_registration = await self._register_vault_manager()
            
            # Determine overall status
            all_systems_ready = all([
                vault_status.get("status") == "ready",
                governance_status.get("status") == "ready",
                intelligence_status.get("status") == "ready",
                monitoring_status.get("status") == "ready"
            ])
            
            self.integration_status = IntegrationStatus.READY if all_systems_ready else IntegrationStatus.ERROR
            
            initialization_result = {
                "status": "success" if all_systems_ready else "partial",
                "platform_id": self.platform_id,
                "integration_status": self.integration_status.value,
                "platform_scope": self.platform_scope.value,
                "registered_applications": len(self.applications),
                "intelligence_sharing": self.intelligence_sharing_enabled,
                "compliance_coordination": self.compliance_coordination,
                "components": {
                    "vault_integration": vault_status,
                    "governance_integration": governance_status,
                    "intelligence_sharing": intelligence_status,
                    "platform_monitoring": monitoring_status
                },
                "initialized_at": datetime.now(timezone.utc).isoformat()
            }
            
            if all_systems_ready:
                logger.info("✅ Universal Platform Integration fully operational")
            else:
                logger.warning("⚠️ Universal Platform Integration partially operational")
            
            return initialization_result
            
        except Exception as e:
            logger.error(f"❌ Platform integration initialization failed: {e}")
            self.integration_status = IntegrationStatus.ERROR
            return {"status": "error", "error": str(e)}
    
    async def register_application(self, app_config: Dict[str, Any]) -> Dict[str, Any]:
        """Register an application with the universal platform"""
        try:
            app_id = app_config["app_id"]
            logger.info(f"📝 Registering application: {app_id}")
            
            # Create application registration
            registration = ApplicationRegistration(
                app_id=app_id,
                app_name=app_config["app_name"],
                app_type=ApplicationType(app_config["app_type"]),
                platform_scope=PlatformScope(app_config["platform_scope"]),
                secrets_count=app_config.get("secrets_count", 0),
                security_level=app_config.get("security_level", "medium"),
                compliance_requirements=app_config.get("compliance_requirements", []),
                intelligence_sharing=app_config.get("intelligence_sharing", True),
                registration_time=datetime.now(timezone.utc),
                metadata=app_config.get("metadata", {})
            )
            
            # Store registration
            self.applications[app_id] = registration
            
            # Update metrics
            self.metrics.total_applications = len(self.applications)
            self.metrics.active_applications = len([app for app in self.applications.values() if app.is_active])
            
            # Store registration in vault agent memory
            self.vault_agent.memory_system.store_memory(
                memory_type=MemoryType.CONFIGURATION,
                content=asdict(registration),
                context={"operation": "app_registration", "platform_scope": registration.platform_scope.value},
                tags=["platform", "registration", app_id]
            )
            
            # Enable intelligence sharing if configured
            intelligence_shared = False
            if registration.intelligence_sharing and self.intelligence_sharing_enabled:
                await self._enable_application_intelligence_sharing(app_id)
                intelligence_shared = True
            
            logger.info(f"✅ Application {app_id} registered successfully")
            return {
                "status": "success",
                "app_id": app_id,
                "platform_id": self.platform_id,
                "intelligence_shared": intelligence_shared,
                "registration_time": registration.registration_time.isoformat()
            }
            
        except Exception as e:
            logger.error(f"❌ Application registration failed: {e}")
            return {"status": "error", "error": str(e)}
    
    async def share_cross_platform_intelligence(self, intelligence_type: str, 
                                              intelligence_data: Dict[str, Any],
                                              target_apps: Optional[List[str]] = None) -> Dict[str, Any]:
        """Share intelligence across registered applications"""
        try:
            intelligence_id = f"intel_{int(time.time() * 1000)}"
            logger.info(f"🧠 Sharing {intelligence_type} intelligence: {intelligence_id}")
            
            # Determine target applications
            if target_apps is None:
                target_apps = [
                    app_id for app_id, app in self.applications.items()
                    if app.intelligence_sharing and app.is_active
                ]
            else:
                # Filter to only registered apps with intelligence sharing enabled
                target_apps = [
                    app_id for app_id in target_apps
                    if app_id in self.applications and self.applications[app_id].intelligence_sharing
                ]
            
            # Create intelligence sharing record
            intelligence_sharing = IntelligenceSharing(
                intelligence_id=intelligence_id,
                intelligence_type=intelligence_type,
                data=intelligence_data,
                confidence=intelligence_data.get("confidence", 0.8),
                source_app=self.vault_agent.agent_id,
                target_apps=target_apps,
                propagation_time=datetime.now(timezone.utc)
            )
            
            # Propagate intelligence to target applications
            success_count = 0
            failure_count = 0
            
            for app_id in target_apps:
                try:
                    propagation_result = await self._propagate_intelligence_to_app(
                        app_id, intelligence_sharing
                    )
                    if propagation_result:
                        success_count += 1
                    else:
                        failure_count += 1
                except Exception as e:
                    logger.warning(f"⚠️ Failed to propagate intelligence to {app_id}: {e}")
                    failure_count += 1
            
            # Update intelligence sharing record
            intelligence_sharing.success_count = success_count
            intelligence_sharing.failure_count = failure_count
            intelligence_sharing.last_propagation = datetime.now(timezone.utc)
            
            # Store intelligence sharing record
            self.intelligence_sharing[intelligence_id] = intelligence_sharing
            
            # Update metrics
            self.metrics.intelligence_shared += 1
            
            # Store in vault agent memory
            self.vault_agent.memory_system.store_memory(
                memory_type=MemoryType.EXPERIENCE,
                content=asdict(intelligence_sharing),
                context={"operation": "intelligence_sharing", "type": intelligence_type},
                tags=["intelligence", "sharing", intelligence_type]
            )
            
            success_rate = success_count / len(target_apps) if target_apps else 1.0
            
            logger.info(f"✅ Intelligence sharing complete: {success_count}/{len(target_apps)} successful")
            return {
                "status": "success",
                "intelligence_id": intelligence_id,
                "propagated_to": success_count,
                "failed_to": failure_count,
                "success_rate": success_rate,
                "target_apps": target_apps
            }
            
        except Exception as e:
            logger.error(f"❌ Intelligence sharing failed: {e}")
            return {"status": "error", "error": str(e)}
    
    async def coordinate_enterprise_governance(self) -> Dict[str, Any]:
        """Coordinate governance policies across enterprise applications"""
        try:
            logger.info("🏛️ Coordinating enterprise governance...")
            
            # Get current governance dashboard
            governance_dashboard = await self.governance_engine.get_governance_dashboard()
            
            coordination_results = {
                "applications_coordinated": 0,
                "policies_synchronized": 0,
                "compliance_aligned": 0,
                "security_coordinated": 0,
                "governance_score": 0.0
            }
            
            # Coordinate governance across applications
            for app_id, app in self.applications.items():
                if not app.is_active:
                    continue
                
                try:
                    # Synchronize governance policies
                    policy_sync = await self._synchronize_governance_policies(app_id, app)
                    if policy_sync:
                        coordination_results["policies_synchronized"] += 1
                    
                    # Align compliance requirements
                    compliance_aligned = await self._align_compliance_requirements(app_id, app)
                    if compliance_aligned:
                        coordination_results["compliance_aligned"] += 1
                    
                    # Coordinate security policies
                    security_coordinated = await self._coordinate_security_policies(app_id, app)
                    if security_coordinated:
                        coordination_results["security_coordinated"] += 1
                    
                    coordination_results["applications_coordinated"] += 1
                    
                except Exception as e:
                    logger.warning(f"⚠️ Failed to coordinate governance for {app_id}: {e}")
            
            # Calculate governance score
            total_apps = len([app for app in self.applications.values() if app.is_active])
            if total_apps > 0:
                policy_score = coordination_results["policies_synchronized"] / total_apps
                compliance_score = coordination_results["compliance_aligned"] / total_apps
                security_score = coordination_results["security_coordinated"] / total_apps
                coordination_results["governance_score"] = (policy_score + compliance_score + security_score) / 3
            
            # Update platform metrics
            self.metrics.compliance_score = coordination_results["governance_score"]
            
            logger.info(f"✅ Enterprise governance coordination complete: {coordination_results}")
            return {"status": "success", **coordination_results}
            
        except Exception as e:
            logger.error(f"❌ Enterprise governance coordination failed: {e}")
            return {"status": "error", "error": str(e)}
    
    async def orchestrate_platform_deployment(self, deployment_config: Dict[str, Any]) -> Dict[str, Any]:
        """Orchestrate deployment across platform applications"""
        try:
            deployment_id = f"deploy_{int(time.time())}"
            logger.info(f"🚀 Orchestrating platform deployment: {deployment_id}")
            
            start_time = time.time()
            deployment_plan = deployment_config.get("deployment_plan", {})
            target_applications = deployment_config.get("target_applications", [])
            strategy = deployment_config.get("strategy", "rolling")
            rollback_enabled = deployment_config.get("rollback_enabled", True)
            
            # Filter target applications to registered and active apps
            target_applications = [
                app_id for app_id in target_applications
                if app_id in self.applications and self.applications[app_id].is_active
            ]
            
            deployment_results = {
                "deployment_id": deployment_id,
                "strategy": strategy,
                "applications_targeted": len(target_applications),
                "applications_deployed": 0,
                "deployment_success_rate": 0.0,
                "rollback_required": False,
                "rollback_performed": False,
                "deployment_items": []
            }
            
            # Execute deployment plan
            successful_deployments = 0
            failed_deployments = 0
            
            for app_id in target_applications:
                try:
                    app_deployment_result = await self._deploy_to_application(
                        app_id, deployment_plan, strategy
                    )
                    
                    if app_deployment_result.get("success", False):
                        successful_deployments += 1
                    else:
                        failed_deployments += 1
                        
                        # Check if rollback is needed
                        if rollback_enabled and app_deployment_result.get("requires_rollback", False):
                            deployment_results["rollback_required"] = True
                    
                    deployment_results["deployment_items"].append({
                        "app_id": app_id,
                        "success": app_deployment_result.get("success", False),
                        "details": app_deployment_result.get("details", {})
                    })
                    
                except Exception as e:
                    logger.warning(f"⚠️ Deployment failed for {app_id}: {e}")
                    failed_deployments += 1
                    deployment_results["deployment_items"].append({
                        "app_id": app_id,
                        "success": False,
                        "error": str(e)
                    })
            
            # Perform rollback if required
            if deployment_results["rollback_required"] and rollback_enabled:
                rollback_success = await self._perform_deployment_rollback(
                    deployment_id, deployment_results["deployment_items"]
                )
                deployment_results["rollback_performed"] = rollback_success
            
            # Calculate deployment metrics
            deployment_results["applications_deployed"] = successful_deployments
            deployment_results["deployment_success_rate"] = (
                successful_deployments / len(target_applications) if target_applications else 1.0
            )
            deployment_results["deployment_time"] = time.time() - start_time
            
            # Update platform metrics
            self.metrics.successful_deployments += successful_deployments
            self.metrics.failed_deployments += failed_deployments
            
            # Store deployment record
            deployment_record = {
                **deployment_results,
                "deployment_config": deployment_config,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            self.deployment_history.append(deployment_record)
            
            logger.info(f"✅ Platform deployment complete: {deployment_results['deployment_success_rate']:.1%} success rate")
            return {"status": "success", **deployment_results}
            
        except Exception as e:
            logger.error(f"❌ Platform deployment orchestration failed: {e}")
            return {"status": "error", "error": str(e)}
    
    async def get_platform_dashboard(self) -> Dict[str, Any]:
        """Generate comprehensive platform dashboard"""
        current_time = datetime.now(timezone.utc)
        uptime = (current_time - self.start_time).total_seconds() / 3600
        
        # Application statistics
        applications_by_type = {}
        applications_by_scope = {}
        intelligence_sharing_enabled = 0
        
        for app in self.applications.values():
            # Count by type
            app_type = app.app_type.value
            applications_by_type[app_type] = applications_by_type.get(app_type, 0) + 1
            
            # Count by scope
            scope = app.platform_scope.value
            applications_by_scope[scope] = applications_by_scope.get(scope, 0) + 1
            
            # Count intelligence sharing
            if app.intelligence_sharing:
                intelligence_sharing_enabled += 1
        
        # Intelligence analytics
        intelligence_by_type = {}
        total_intelligence_shared = len(self.intelligence_sharing)
        recent_intelligence = 0
        total_confidence = 0.0
        
        for intel in self.intelligence_sharing.values():
            intel_type = intel.intelligence_type
            if intel_type not in intelligence_by_type:
                intelligence_by_type[intel_type] = {"count": 0, "total_confidence": 0.0}
            
            intelligence_by_type[intel_type]["count"] += 1
            intelligence_by_type[intel_type]["total_confidence"] += intel.confidence
            total_confidence += intel.confidence
            
            # Recent intelligence (last hour)
            time_diff = (current_time - intel.propagation_time).total_seconds()
            if time_diff < 3600:  # 1 hour
                recent_intelligence += 1
        
        # Calculate average confidence per type
        for intel_type in intelligence_by_type:
            count = intelligence_by_type[intel_type]["count"]
            intelligence_by_type[intel_type]["avg_confidence"] = (
                intelligence_by_type[intel_type]["total_confidence"] / count if count > 0 else 0.0
            )
        
        # Platform efficiency calculation
        active_apps = len([app for app in self.applications.values() if app.is_active])
        total_apps = len(self.applications)
        
        if total_apps > 0:
            application_health = active_apps / total_apps
            deployment_success_rate = (
                self.metrics.successful_deployments / 
                max(1, self.metrics.successful_deployments + self.metrics.failed_deployments)
            )
            intelligence_utilization = intelligence_sharing_enabled / total_apps if total_apps > 0 else 0.0
            
            self.metrics.platform_efficiency = (
                application_health * 0.4 + 
                deployment_success_rate * 0.3 + 
                intelligence_utilization * 0.3
            )
        
        dashboard = {
            "platform_status": {
                "platform_id": self.platform_id,
                "integration_status": self.integration_status.value,
                "platform_scope": self.platform_scope.value,
                "uptime_hours": round(uptime, 2),
                "sync_active": self.intelligence_sharing_enabled,
                "last_sync": current_time.isoformat()
            },
            
            "applications": {
                "total": total_apps,
                "active": active_apps,
                "intelligence_sharing_enabled": intelligence_sharing_enabled,
                "by_type": applications_by_type,
                "by_scope": applications_by_scope
            },
            
            "intelligence": {
                "total_shared": total_intelligence_shared,
                "recent_count": recent_intelligence,
                "cross_platform_patterns": len(intelligence_by_type),
                "average_confidence": total_confidence / max(1, total_intelligence_shared),
                "by_type": intelligence_by_type
            },
            
            "security": {
                "total_secrets_managed": sum(app.secrets_count for app in self.applications.values()),
                "incidents_prevented": self.metrics.security_incidents,
                "security_coordination": self.compliance_coordination,
                "compliance_coordination": self.compliance_coordination
            },
            
            "performance": {
                "platform_efficiency": self.metrics.platform_efficiency,
                "compliance_score": self.metrics.compliance_score,
                "intelligence_propagation_rate": (
                    sum(intel.success_count for intel in self.intelligence_sharing.values()) /
                    max(1, len(self.intelligence_sharing))
                )
            },
            
            "deployments": {
                "total_deployments": len(self.deployment_history),
                "successful_deployments": self.metrics.successful_deployments,
                "failed_deployments": self.metrics.failed_deployments,
                "recent_deployments": len([
                    d for d in self.deployment_history
                    if (current_time - datetime.fromisoformat(d["timestamp"].replace("Z", "+00:00"))).total_seconds() < 3600
                ])
            },
            
            "generated_at": current_time.isoformat()
        }
        
        return dashboard
    
    # === PRIVATE HELPER METHODS ===
    
    async def _initialize_vault_integration(self) -> Dict[str, Any]:
        """Initialize vault integration"""
        try:
            # Get vault status
            vault_dashboard = await self.vault_agent.get_vault_intelligence_dashboard()
            
            return {
                "status": "ready",
                "vault_agent_id": self.vault_agent.agent_id,
                "secrets_managed": vault_dashboard.get("total_secrets", 0),
                "intelligence_active": vault_dashboard.get("intelligent_agent_info", {}).get("symbolic_reasoning_active", False)
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _initialize_governance_integration(self) -> Dict[str, Any]:
        """Initialize governance integration"""
        try:
            # Get governance status
            governance_dashboard = await self.governance_engine.get_governance_dashboard()
            
            return {
                "status": "ready",
                "governance_status": governance_dashboard.get("governance_status", "unknown"),
                "rules_active": governance_dashboard.get("rules", {}).get("total_active", 0),
                "autonomy_level": governance_dashboard.get("current_autonomy_level", "unknown")
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _initialize_intelligence_sharing(self) -> Dict[str, Any]:
        """Initialize intelligence sharing system"""
        try:
            if not self.intelligence_sharing_enabled:
                return {"status": "disabled", "message": "Intelligence sharing disabled"}
            
            return {
                "status": "ready",
                "auto_propagation": self.auto_propagation,
                "sharing_enabled": self.intelligence_sharing_enabled
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _initialize_platform_monitoring(self) -> Dict[str, Any]:
        """Initialize platform monitoring"""
        try:
            return {
                "status": "ready",
                "metrics_active": True,
                "monitoring_scope": self.platform_scope.value
            }
        except Exception as e:
            return {"status": "error", "error": str(e)}
    
    async def _register_vault_manager(self) -> Dict[str, Any]:
        """Register the vault manager as a platform application"""
        vault_app_config = {
            "app_id": self.vault_agent.agent_id,
            "app_name": "Intelligent Vault Manager",
            "app_type": "vault_manager",
            "platform_scope": "enterprise",
            "secrets_count": 100,  # Estimated
            "security_level": "maximum",
            "compliance_requirements": ["SOC2", "ISO27001"],
            "intelligence_sharing": True,
            "metadata": {
                "core_platform_component": True,
                "intelligence_source": True
            }
        }
        
        return await self.register_application(vault_app_config)
    
    async def _enable_application_intelligence_sharing(self, app_id: str) -> bool:
        """Enable intelligence sharing for an application"""
        try:
            logger.info(f"🧠 Enabling intelligence sharing for {app_id}")
            # In a real implementation, this would configure the application
            return True
        except Exception as e:
            logger.warning(f"⚠️ Failed to enable intelligence sharing for {app_id}: {e}")
            return False
    
    async def _propagate_intelligence_to_app(self, app_id: str, intelligence: IntelligenceSharing) -> bool:
        """Propagate intelligence to a specific application"""
        try:
            # In a real implementation, this would send intelligence to the application
            # For demo purposes, we simulate successful propagation
            app = self.applications.get(app_id)
            if not app or not app.is_active:
                return False
            
            # Simulate propagation delay
            await asyncio.sleep(0.1)
            
            # Update app sync information
            app.last_sync = datetime.now(timezone.utc)
            app.sync_count += 1
            
            logger.debug(f"📡 Intelligence propagated to {app_id}")
            return True
            
        except Exception as e:
            logger.warning(f"⚠️ Failed to propagate intelligence to {app_id}: {e}")
            return False
    
    async def _synchronize_governance_policies(self, app_id: str, app: ApplicationRegistration) -> bool:
        """Synchronize governance policies with application"""
        try:
            # Simulate policy synchronization
            return True
        except Exception as e:
            logger.warning(f"⚠️ Failed to synchronize policies for {app_id}: {e}")
            return False
    
    async def _align_compliance_requirements(self, app_id: str, app: ApplicationRegistration) -> bool:
        """Align compliance requirements with application"""
        try:
            # Check if application has compliance requirements
            return len(app.compliance_requirements) > 0
        except Exception as e:
            logger.warning(f"⚠️ Failed to align compliance for {app_id}: {e}")
            return False
    
    async def _coordinate_security_policies(self, app_id: str, app: ApplicationRegistration) -> bool:
        """Coordinate security policies with application"""
        try:
            # Check security level and coordinate
            return app.security_level in ["high", "maximum"]
        except Exception as e:
            logger.warning(f"⚠️ Failed to coordinate security for {app_id}: {e}")
            return False
    
    async def _deploy_to_application(self, app_id: str, deployment_plan: Dict[str, Any], 
                                   strategy: str) -> Dict[str, Any]:
        """Deploy configuration to a specific application"""
        try:
            app = self.applications[app_id]
            deployment_items = deployment_plan.get("items", [])
            
            # Filter deployment items applicable to this app type
            applicable_items = []
            for item in deployment_items:
                applicable_types = item.get("applicable_types", [])
                if not applicable_types or app.app_type.value in applicable_types:
                    applicable_items.append(item)
            
            # Simulate deployment
            await asyncio.sleep(0.2)  # Simulate deployment time
            
            # Most deployments succeed for demo purposes
            success = len(applicable_items) > 0
            
            return {
                "success": success,
                "details": {
                    "items_deployed": len(applicable_items),
                    "strategy": strategy,
                    "app_type": app.app_type.value
                },
                "requires_rollback": not success
            }
            
        except Exception as e:
            logger.warning(f"⚠️ Deployment failed for {app_id}: {e}")
            return {"success": False, "error": str(e), "requires_rollback": True}
    
    async def _perform_deployment_rollback(self, deployment_id: str, 
                                         deployment_items: List[Dict[str, Any]]) -> bool:
        """Perform rollback for failed deployment"""
        try:
            logger.warning(f"🔄 Performing rollback for deployment {deployment_id}")
            
            # Simulate rollback process
            await asyncio.sleep(0.5)
            
            # For demo purposes, rollback usually succeeds
            return True
            
        except Exception as e:
            logger.error(f"❌ Rollback failed for deployment {deployment_id}: {e}")
            return False

# Factory function for easy creation
def create_universal_platform_integration(
    vault_agent: IntelligentVaultAgent, 
    governance_engine: RuntimeGovernanceEngine, 
    integration_config: Dict[str, Any] = None
) -> UniversalPlatformIntegration:
    """Create universal platform integration"""
    return UniversalPlatformIntegration(vault_agent, governance_engine, integration_config)

if __name__ == "__main__":
    # Demo universal platform integration
    async def demo():
        from .intelligent_vault_agent import create_intelligent_vault_agent
        from .runtime_governance_engine import create_runtime_governance_engine
        
        # Create components
        vault_agent = create_intelligent_vault_agent()
        governance_engine = create_runtime_governance_engine("demo_governance")
        
        # Initialize governance
        await governance_engine.initialize_governance()
        
        # Create platform integration
        platform = create_universal_platform_integration(vault_agent, governance_engine)
        
        print("🌐 Universal Platform Integration Demo")
        print("=" * 50)
        
        # Initialize platform
        init_result = await platform.initialize_platform_integration()
        print(f"🚀 Initialization: {init_result['status']}")
        
        # Register a sample application
        app_config = {
            "app_id": "demo_app",
            "app_name": "Demo Application",
            "app_type": "web_application",
            "platform_scope": "local",
            "secrets_count": 5,
            "security_level": "medium",
            "compliance_requirements": ["SOC2"],
            "intelligence_sharing": True
        }
        
        registration = await platform.register_application(app_config)
        print(f"📝 Registration: {registration['status']}")
        
        # Get platform dashboard
        dashboard = await platform.get_platform_dashboard()
        print(f"📊 Applications: {dashboard['applications']['total']}")
        
        print("\n✅ Universal platform integration demo complete!")
    
    asyncio.run(demo()) 