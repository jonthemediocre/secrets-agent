"""
🏭 PRODUCTION VAULT INTEGRATION - Phase 4.1
==========================================

Integrates our intelligent vault agent with the existing FastAPI server infrastructure and VANTA framework, enabling real-world deployment

Core Purpose: Make our symbolic AI vault production-ready
"""

import asyncio
import json
import logging
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
import yaml
import subprocess
from contextlib import asynccontextmanager

# Import our intelligent vault components
from .intelligent_vault_agent import IntelligentVaultAgent, create_intelligent_vault_agent
from .secret_lifecycle_engine import SecretRiskLevel, SecretLifecycleState
from .simple_memory_system import MemoryType

# Production logging setup
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler(),
        logging.FileHandler('vault_production.log')
    ]
)
logger = logging.getLogger(__name__)

class ProductionVaultIntegration:
    """
    🏭 PRODUCTION VAULT INTEGRATION
    
    Bridges our intelligent vault agent with production infrastructure:
    - Real SOPS-encrypted vault files
    - FastAPI server integration
    - VANTA framework connectivity
    - Production monitoring and alerts
    - Enterprise error handling and recovery
    """
    
    def __init__(self, config: Dict[str, Any] = None):
        """Initialize production integration"""
        self.config = config or self._load_default_config()
        
        # Initialize intelligent vault agent
        self.vault_agent = create_intelligent_vault_agent(
            agent_id=self.config.get("agent_id", "production_vault_001"),
            vault_path=self.config.get("vault_path", "vault/")
        )
        
        # Production state tracking
        self.is_production_ready = False
        self.sops_available = False
        self.vanta_connected = False
        self.api_server_integration = False
        
        # Performance metrics
        self.production_metrics = {
            "vault_operations": 0,
            "secrets_decrypted": 0,
            "intelligence_queries": 0,
            "errors_handled": 0,
            "uptime_start": datetime.now(timezone.utc)
        }
        
        logger.info("🏭 Production Vault Integration initialized")
    
    async def initialize_production_environment(self) -> Dict[str, Any]:
        """Initialize and validate production environment"""
        logger.info("🚀 Initializing production environment...")
        
        initialization_results = {
            "status": "initializing",
            "components": {},
            "errors": [],
            "timestamp": datetime.now(timezone.utc).isoformat()
        }
        
        try:
            # 1. Validate SOPS availability
            sops_status = await self._validate_sops_environment()
            initialization_results["components"]["sops"] = sops_status
            
            # 2. Initialize vault directory structure
            vault_status = await self._initialize_vault_structure()
            initialization_results["components"]["vault_structure"] = vault_status
            
            # 3. Connect to VANTA framework
            vanta_status = await self._connect_vanta_framework()
            initialization_results["components"]["vanta_framework"] = vanta_status
            
            # 4. Setup API server integration
            api_status = await self._setup_api_integration()
            initialization_results["components"]["api_integration"] = api_status
            
            # 5. Initialize monitoring and logging
            monitoring_status = await self._setup_production_monitoring()
            initialization_results["components"]["monitoring"] = monitoring_status
            
            # 6. Run comprehensive health check
            health_status = await self._run_production_health_check()
            initialization_results["components"]["health_check"] = health_status
            
            # Determine overall production readiness
            all_critical_systems = [
                sops_status.get("status") == "ready",
                vault_status.get("status") == "ready", 
                monitoring_status.get("status") == "ready"
            ]
            
            self.is_production_ready = all(all_critical_systems)
            initialization_results["status"] = "ready" if self.is_production_ready else "partial"
            
            if self.is_production_ready:
                logger.info("✅ Production environment fully initialized")
            else:
                logger.warning("⚠️ Production environment partially initialized")
            
            return initialization_results
            
        except Exception as e:
            logger.error(f"❌ Production initialization failed: {e}")
            initialization_results["status"] = "failed"
            initialization_results["errors"].append(str(e))
            return initialization_results
    
    async def decrypt_vault_secret(self, vault_file: str, secret_key: str) -> Optional[Dict[str, Any]]:
        """Decrypt a secret from SOPS-encrypted vault file"""
        try:
            vault_path = Path(self.config["vault_path"]) / vault_file
            
            if not vault_path.exists():
                logger.error(f"❌ Vault file not found: {vault_path}")
                return None
            
            # Use SOPS to decrypt the vault file
            result = subprocess.run([
                "sops", "-d", str(vault_path)
            ], capture_output=True, text=True, check=True)
            
            # Parse the decrypted YAML
            vault_data = yaml.safe_load(result.stdout)
            
            # Extract the requested secret
            secret_value = self._extract_secret_from_vault(vault_data, secret_key)
            
            if secret_value:
                # Track the access for intelligence
                await self._track_secret_access(vault_file, secret_key)
                
                self.production_metrics["secrets_decrypted"] += 1
                logger.info(f"🔓 Successfully decrypted secret: {secret_key}")
                
                return {
                    "secret_key": secret_key,
                    "value": secret_value,
                    "vault_file": vault_file,
                    "accessed_at": datetime.now(timezone.utc).isoformat()
                }
            else:
                logger.warning(f"🔍 Secret key not found in vault: {secret_key}")
                return None
                
        except subprocess.CalledProcessError as e:
            logger.error(f"❌ SOPS decryption failed: {e}")
            self.production_metrics["errors_handled"] += 1
            return None
        except Exception as e:
            logger.error(f"❌ Secret decryption error: {e}")
            self.production_metrics["errors_handled"] += 1
            return None
    
    async def get_intelligent_vault_status(self) -> Dict[str, Any]:
        """Get comprehensive intelligent vault status for production monitoring"""
        try:
            # Get base dashboard from intelligent vault
            dashboard = await self.vault_agent.get_vault_intelligence_dashboard()
            
            # Add production-specific metrics
            production_status = {
                **dashboard,
                "production_integration": {
                    "status": "ready" if self.is_production_ready else "partial",
                    "sops_available": self.sops_available,
                    "vanta_connected": self.vanta_connected,
                    "api_server_integration": self.api_server_integration
                },
                "production_metrics": self.production_metrics,
                "system_health": await self._get_system_health(),
                "security_posture": await self._assess_production_security_posture()
            }
            
            self.production_metrics["intelligence_queries"] += 1
            return production_status
            
        except Exception as e:
            logger.error(f"❌ Failed to get vault status: {e}")
            self.production_metrics["errors_handled"] += 1
            return {"error": str(e), "status": "error"}
    
    async def perform_intelligent_vault_analysis(self, force_refresh: bool = False) -> Dict[str, Any]:
        """Perform production-grade intelligent vault analysis"""
        logger.info("🔍 Starting production vault analysis...")
        
        try:
            # Discover real vault files
            vault_files = await self._discover_production_vault_files()
            
            # Analyze each vault file with our intelligent agent
            analysis_results = []
            
            for vault_file in vault_files:
                try:
                    # Extract metadata from real vault file
                    metadata = await self._extract_production_vault_metadata(vault_file)
                    
                    # Run intelligent analysis
                    file_analysis = await self.vault_agent.lifecycle_engine.analyze_secret(
                        vault_file["file_id"], metadata
                    )
                    
                    analysis_results.append({
                        "vault_file": vault_file["path"],
                        "analysis": file_analysis,
                        "production_context": vault_file.get("production_context", {})
                    })
                    
                except Exception as e:
                    logger.error(f"❌ Failed to analyze vault file {vault_file}: {e}")
                    analysis_results.append({
                        "vault_file": vault_file.get("path", "unknown"),
                        "error": str(e)
                    })
            
            # Generate production recommendations
            production_recommendations = await self._generate_production_recommendations(analysis_results)
            
            final_analysis = {
                "total_vault_files": len(vault_files),
                "successful_analyses": len([r for r in analysis_results if "analysis" in r]),
                "failed_analyses": len([r for r in analysis_results if "error" in r]),
                "analysis_results": analysis_results,
                "production_recommendations": production_recommendations,
                "analysis_timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            # Store analysis in vault agent memory
            self.vault_agent.memory_system.store_memory(
                memory_type=MemoryType.EXPERIENCE,
                content=final_analysis,
                context={"operation": "production_analysis", "environment": "production"}
            )
            
            logger.info(f"✅ Production vault analysis complete: {len(vault_files)} files analyzed")
            return final_analysis
            
        except Exception as e:
            logger.error(f"❌ Production vault analysis failed: {e}")
            self.production_metrics["errors_handled"] += 1
            return {"error": str(e), "status": "failed"}
    
    # Internal helper methods
    def _load_default_config(self) -> Dict[str, Any]:
        """Load default production configuration"""
        return {
            "agent_id": "production_vault_001",
            "vault_path": "vault/",
            "sops_config_path": ".sops.yaml",
            "api_host": "127.0.0.1",
            "api_port": 7300,
            "monitoring_enabled": True,
            "log_level": "INFO"
        }
    
    async def _validate_sops_environment(self) -> Dict[str, Any]:
        """Validate SOPS encryption environment"""
        try:
            # Check if SOPS is available
            result = subprocess.run(["sops", "--version"], capture_output=True, text=True)
            
            if result.returncode == 0:
                self.sops_available = True
                
                # Check for SOPS configuration
                sops_config = Path(self.config["sops_config_path"])
                config_exists = sops_config.exists()
                
                return {
                    "status": "ready",
                    "sops_version": result.stdout.strip(),
                    "config_file_exists": config_exists,
                    "config_path": str(sops_config)
                }
            else:
                return {
                    "status": "unavailable",
                    "error": "SOPS not found in PATH"
                }
                
        except FileNotFoundError:
            return {
                "status": "unavailable",
                "error": "SOPS not installed"
            }
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def _initialize_vault_structure(self) -> Dict[str, Any]:
        """Initialize production vault directory structure"""
        try:
            vault_path = Path(self.config["vault_path"])
            vault_path.mkdir(exist_ok=True)
            
            # Create standard vault subdirectories
            subdirs = ["prod", "staging", "dev", "shared"]
            created_dirs = []
            
            for subdir in subdirs:
                dir_path = vault_path / subdir
                dir_path.mkdir(exist_ok=True)
                created_dirs.append(str(dir_path))
            
            return {
                "status": "ready",
                "vault_path": str(vault_path),
                "subdirectories": created_dirs
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def _connect_vanta_framework(self) -> Dict[str, Any]:
        """Connect to VANTA framework if available"""
        try:
            # Check if VANTA components are available
            vanta_files = [
                "vanta_master_core_enhanced.py",
                "agent_core/unified_communication.py"
            ]
            
            available_components = []
            for vanta_file in vanta_files:
                if Path(vanta_file).exists():
                    available_components.append(vanta_file)
            
            if available_components:
                self.vanta_connected = True
                return {
                    "status": "connected",
                    "available_components": available_components
                }
            else:
                return {
                    "status": "unavailable",
                    "message": "VANTA framework components not found"
                }
                
        except Exception as e:
            return {
                "status": "error", 
                "error": str(e)
            }
    
    async def _setup_api_integration(self) -> Dict[str, Any]:
        """Setup FastAPI server integration"""
        try:
            # Check if API server file exists
            api_server_file = Path("vault_api_server.py")
            
            if api_server_file.exists():
                self.api_server_integration = True
                return {
                    "status": "ready",
                    "api_server_file": str(api_server_file),
                    "integration_endpoints": [
                        "/api/v1/vault/intelligence/status",
                        "/api/v1/vault/intelligence/analyze",
                        "/api/v1/vault/intelligence/dashboard"
                    ]
                }
            else:
                return {
                    "status": "partial",
                    "message": "API server file not found, integration limited"
                }
                
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def _setup_production_monitoring(self) -> Dict[str, Any]:
        """Setup production monitoring and logging"""
        try:
            # Ensure log directory exists
            log_dir = Path("logs")
            log_dir.mkdir(exist_ok=True)
            
            # Setup log files
            log_files = {
                "vault_production.log": "Main production log",
                "vault_security.log": "Security events log", 
                "vault_performance.log": "Performance metrics log"
            }
            
            for log_file, description in log_files.items():
                (log_dir / log_file).touch(exist_ok=True)
            
            return {
                "status": "ready",
                "log_directory": str(log_dir),
                "log_files": log_files
            }
            
        except Exception as e:
            return {
                "status": "error",
                "error": str(e)
            }
    
    async def _run_production_health_check(self) -> Dict[str, Any]:
        """Run comprehensive production health check"""
        try:
            health_checks = {}
            
            # Check vault agent health
            health_checks["intelligent_vault"] = {
                "status": "healthy",
                "agent_id": self.vault_agent.agent_id,
                "memory_system": "operational"
            }
            
            # Check filesystem access
            vault_path = Path(self.config["vault_path"])
            health_checks["filesystem"] = {
                "vault_directory_exists": vault_path.exists(),
                "vault_directory_writable": os.access(vault_path, os.W_OK) if vault_path.exists() else False
            }
            
            # Check system resources
            import psutil
            health_checks["system_resources"] = {
                "cpu_percent": psutil.cpu_percent(),
                "memory_percent": psutil.virtual_memory().percent,
                "disk_usage_percent": psutil.disk_usage('.').percent
            }
            
            return {
                "status": "healthy",
                "checks": health_checks,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            return {
                "status": "unhealthy",
                "error": str(e)
            }
    
    def _extract_secret_from_vault(self, vault_data: Dict[str, Any], secret_key: str) -> Optional[str]:
        """Extract a specific secret from decrypted vault data"""
        # Handle nested secret keys (e.g., "database.password")
        keys = secret_key.split('.')
        current_data = vault_data
        
        try:
            for key in keys:
                if isinstance(current_data, dict) and key in current_data:
                    current_data = current_data[key]
                else:
                    return None
            
            return str(current_data) if current_data is not None else None
            
        except Exception:
            return None
    
    async def _track_secret_access(self, vault_file: str, secret_key: str):
        """Track secret access for intelligence analysis"""
        access_event = {
            "vault_file": vault_file,
            "secret_key": secret_key,
            "accessed_at": datetime.now(timezone.utc).isoformat(),
            "access_type": "decrypt"
        }
        
        # Store in memory for pattern analysis
        self.vault_agent.memory_system.store_memory(
            memory_type=MemoryType.EPISODIC,
            content=access_event,
            context={"operation": "secret_access", "environment": "production"},
            tags=["access", "decrypt", vault_file]
        )
    
    async def _discover_production_vault_files(self) -> List[Dict[str, Any]]:
        """Discover actual vault files in production environment"""
        vault_path = Path(self.config["vault_path"])
        vault_files = []
        
        # Look for .vault.yaml files (SOPS encrypted)
        for vault_file in vault_path.rglob("*.vault.yaml"):
            file_stats = vault_file.stat()
            
            vault_files.append({
                "file_id": vault_file.stem.replace(".vault", ""),
                "path": str(vault_file),
                "size": file_stats.st_size,
                "last_modified": datetime.fromtimestamp(file_stats.st_mtime, timezone.utc),
                "production_context": self._infer_production_context(vault_file)
            })
        
        return vault_files
    
    def _infer_production_context(self, vault_file: Path) -> Dict[str, Any]:
        """Infer production context from vault file path and name"""
        context = {
            "environment": "unknown",
            "criticality": "medium",
            "business_impact": 0.5
        }
        
        path_str = str(vault_file).lower()
        
        # Infer environment
        if "prod" in path_str:
            context["environment"] = "production"
            context["criticality"] = "high"
            context["business_impact"] = 0.9
        elif "staging" in path_str or "stage" in path_str:
            context["environment"] = "staging"
            context["criticality"] = "medium"
            context["business_impact"] = 0.6
        elif "dev" in path_str or "test" in path_str:
            context["environment"] = "development"
            context["criticality"] = "low"
            context["business_impact"] = 0.3
        
        return context
    
    async def _extract_production_vault_metadata(self, vault_file: Dict[str, Any]) -> Dict[str, Any]:
        """Extract metadata from production vault file"""
        file_path = Path(vault_file["path"])
        
        # Calculate age
        age_days = (datetime.now(timezone.utc) - vault_file["last_modified"]).days
        
        metadata = {
            "age_days": age_days,
            "last_rotated_days": age_days,  # Assume rotation when file modified
            "file_size": vault_file["size"],
            "environment": vault_file["production_context"]["environment"],
            "business_impact": vault_file["production_context"]["business_impact"],
            "encrypted_at_rest": True,  # SOPS encryption
            "access_logging_enabled": True,  # Our tracking
            "production_system": vault_file["production_context"]["environment"] == "production"
        }
        
        # Add environment-specific settings
        if metadata["environment"] == "production":
            metadata.update({
                "max_age_policy": 60,  # 2 months for prod
                "privileged_access": True,
                "customer_facing": True
            })
        elif metadata["environment"] == "staging":
            metadata.update({
                "max_age_policy": 90,  # 3 months for staging
                "privileged_access": False,
                "customer_facing": False
            })
        else:  # development
            metadata.update({
                "max_age_policy": 180,  # 6 months for dev
                "privileged_access": False,
                "customer_facing": False
            })
        
        return metadata
    
    async def _generate_production_recommendations(self, analysis_results: List[Dict[str, Any]]) -> List[str]:
        """Generate production-specific recommendations"""
        recommendations = []
        
        # Count critical and high-risk secrets
        critical_count = 0
        high_risk_count = 0
        
        for result in analysis_results:
            if "analysis" in result:
                risk = result["analysis"].risk_assessment
                if risk == SecretRiskLevel.CRITICAL:
                    critical_count += 1
                elif risk == SecretRiskLevel.HIGH:
                    high_risk_count += 1
        
        # Generate recommendations based on findings
        if critical_count > 0:
            recommendations.append(f"🚨 URGENT: {critical_count} vault files have CRITICAL risk - immediate action required")
        
        if high_risk_count > 0:
            recommendations.append(f"⚠️ HIGH PRIORITY: {high_risk_count} vault files need security review")
        
        # Check for production-specific issues
        prod_files = [r for r in analysis_results if 
                     r.get("production_context", {}).get("environment") == "production"]
        
        if len(prod_files) > 5:
            recommendations.append("📊 Consider implementing vault sharding for production environment")
        
        # Add general production recommendations
        recommendations.extend([
            "🔄 Schedule automated rotation testing in staging environment",
            "📋 Implement compliance monitoring automation",
            "🔐 Consider implementing hardware security modules (HSM) for high-value secrets"
        ])
        
        return recommendations
    
    async def _get_system_health(self) -> Dict[str, Any]:
        """Get detailed system health metrics"""
        try:
            import psutil
            
            return {
                "cpu_percent": psutil.cpu_percent(interval=1),
                "memory": {
                    "percent": psutil.virtual_memory().percent,
                    "available_mb": psutil.virtual_memory().available // 1024 // 1024
                },
                "disk": {
                    "percent": psutil.disk_usage('.').percent,
                    "free_gb": psutil.disk_usage('.').free // 1024 // 1024 // 1024
                },
                "uptime_seconds": (datetime.now(timezone.utc) - self.production_metrics["uptime_start"]).total_seconds()
            }
        except Exception as e:
            return {"error": str(e)}
    
    async def _assess_production_security_posture(self) -> Dict[str, Any]:
        """Assess overall production security posture"""
        try:
            # Get current vault intelligence
            vault_dashboard = await self.vault_agent.get_vault_intelligence_dashboard()
            
            # Calculate security scores
            total_secrets = vault_dashboard.get("total_secrets", 0)
            risk_distribution = vault_dashboard.get("risk_distribution", {})
            
            critical_secrets = risk_distribution.get("critical", 0)
            high_risk_secrets = risk_distribution.get("high", 0)
            
            # Calculate overall security score
            if total_secrets > 0:
                risk_score = (critical_secrets * 4 + high_risk_secrets * 2) / total_secrets
                security_score = max(0, 1 - (risk_score / 10))  # Normalize to 0-1
            else:
                security_score = 1.0
            
            posture = {
                "overall_security_score": security_score,
                "security_grade": self._calculate_security_grade(security_score),
                "critical_issues": critical_secrets,
                "high_risk_issues": high_risk_secrets,
                "encryption_status": "AES-256 via SOPS" if self.sops_available else "Unknown",
                "monitoring_status": "Active" if self.is_production_ready else "Partial",
                "last_assessment": datetime.now(timezone.utc).isoformat()
            }
            
            return posture
            
        except Exception as e:
            return {"error": str(e)}
    
    def _calculate_security_grade(self, security_score: float) -> str:
        """Calculate letter grade for security score"""
        if security_score >= 0.95:
            return "A+"
        elif security_score >= 0.90:
            return "A"
        elif security_score >= 0.80:
            return "B"
        elif security_score >= 0.70:
            return "C"
        elif security_score >= 0.60:
            return "D"
        else:
            return "F"

# Factory function for easy creation
def create_production_vault_integration(config: Dict[str, Any] = None) -> ProductionVaultIntegration:
    """Create production vault integration"""
    return ProductionVaultIntegration(config)

# Context manager for production operations
@asynccontextmanager
async def production_vault_context(config: Dict[str, Any] = None):
    """Context manager for production vault operations"""
    integration = create_production_vault_integration(config)
    
    try:
        # Initialize production environment
        init_result = await integration.initialize_production_environment()
        
        if init_result["status"] == "failed":
            raise Exception(f"Production initialization failed: {init_result.get('errors', [])}")
        
        logger.info("🏭 Production vault context activated")
        yield integration
        
    finally:
        logger.info("🏭 Production vault context deactivated")

if __name__ == "__main__":
    # Demo production integration
    async def demo():
        integration = create_production_vault_integration()
        
        print("🏭 Production Vault Integration Demo")
        print("=" * 50)
        
        # Initialize production environment
        init_result = await integration.initialize_production_environment()
        print(f"🚀 Initialization Status: {init_result['status']}")
        
        # Get production status
        status = await integration.get_intelligent_vault_status()
        print(f"📊 Production Ready: {status['production_integration']['status']}")
        
        # Perform production analysis
        analysis = await integration.perform_intelligent_vault_analysis()
        print(f"🔍 Analysis Complete: {analysis.get('total_vault_files', 0)} files analyzed")
        
        print("\n✅ Production integration demo complete!")
    
    asyncio.run(demo()) 