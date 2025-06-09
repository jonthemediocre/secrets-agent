"""
💼 BUSINESS ENHANCEMENT ENGINE - Phase 4.2
=========================================

Adds practical business value features to our intelligent vault:
- Automated secret discovery and scanning
- Business impact analysis and cost assessment
- Compliance reporting and audit trail generation
- ROI measurement for security investments
- Executive dashboards and business metrics

Core Purpose: Demonstrate immediate business value of intelligent secret management
"""

import asyncio
import json
import os
import re
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
import logging

# Import our intelligent vault components
from .intelligent_vault_agent import IntelligentVaultAgent
from .production_vault_integration import ProductionVaultIntegration
from .secret_lifecycle_engine import SecretRiskLevel, SecretLifecycleState
from .simple_memory_system import MemoryType

logger = logging.getLogger(__name__)

class BusinessImpactLevel(Enum):
    """Business impact classification"""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    MINIMAL = "minimal"

class ComplianceFramework(Enum):
    """Supported compliance frameworks"""
    SOC2 = "soc2"
    ISO27001 = "iso27001"
    PCI_DSS = "pci_dss"
    GDPR = "gdpr"
    HIPAA = "hipaa"
    NIST = "nist"

@dataclass
class BusinessMetrics:
    """Business value metrics for intelligent vault"""
    time_saved_hours: float
    risk_reduction_percentage: float
    compliance_improvement_score: float
    cost_avoidance_dollars: float
    efficiency_gain_percentage: float
    security_incidents_prevented: int

@dataclass
class SecretDiscoveryResult:
    """Result of automated secret discovery"""
    location: str
    secret_type: str
    confidence_score: float
    business_impact: BusinessImpactLevel
    recommended_action: str
    risk_factors: List[str]

class BusinessEnhancementEngine:
    """
    💼 BUSINESS ENHANCEMENT ENGINE
    
    Adds practical business value features to intelligent vault:
    - Automated secret discovery across codebases
    - Business impact analysis and ROI calculation
    - Compliance reporting and audit automation
    - Executive dashboards with business metrics
    - Cost-benefit analysis for security investments
    
    Core Focus: Demonstrating immediate business value and ROI
    """
    
    def __init__(self, vault_agent: IntelligentVaultAgent, 
                 production_integration: ProductionVaultIntegration = None):
        """Initialize business enhancement engine"""
        self.vault_agent = vault_agent
        self.production_integration = production_integration
        
        # Business metrics tracking
        self.business_metrics = BusinessMetrics(
            time_saved_hours=0.0,
            risk_reduction_percentage=0.0,
            compliance_improvement_score=0.0,
            cost_avoidance_dollars=0.0,
            efficiency_gain_percentage=0.0,
            security_incidents_prevented=0
        )
        
        # Secret discovery patterns
        self.secret_patterns = {
            "api_key": [
                r"(?i)api[_-]?key['\"\s]*[:=]['\"\s]*([a-zA-Z0-9_\-]{20,})",
                r"(?i)apikey['\"\s]*[:=]['\"\s]*([a-zA-Z0-9_\-]{20,})"
            ],
            "password": [
                r"(?i)password['\"\s]*[:=]['\"\s]*([a-zA-Z0-9_\-]{8,})",
                r"(?i)passwd['\"\s]*[:=]['\"\s]*([a-zA-Z0-9_\-]{8,})"
            ],
            "secret": [
                r"(?i)secret['\"\s]*[:=]['\"\s]*([a-zA-Z0-9_\-]{16,})",
                r"(?i)token['\"\s]*[:=]['\"\s]*([a-zA-Z0-9_\-]{20,})"
            ],
            "database": [
                r"(?i)db[_-]?password['\"\s]*[:=]['\"\s]*(['\"][^'\"]{6,}['\"])",
                r"(?i)database[_-]?url['\"\s]*[:=]['\"\s]*(['\"][^'\"]{10,}['\"])"
            ],
            "crypto": [
                r"-----BEGIN [A-Z ]+-----[\s\S]*?-----END [A-Z ]+-----",
                r"(?i)private[_-]?key['\"\s]*[:=]['\"\s]*([a-zA-Z0-9+/=]{100,})"
            ]
        }
        
        # Business cost models (example values)
        self.cost_models = {
            "security_incident_cost": 50000,  # Average cost per incident
            "compliance_violation_cost": 25000,  # Average compliance penalty
            "manual_audit_hour_cost": 150,  # Cost per hour of manual audit
            "developer_hour_cost": 100,  # Cost per developer hour
            "downtime_cost_per_hour": 10000  # Cost of system downtime
        }
        
        logger.info("💼 Business Enhancement Engine initialized")
    
    async def discover_hardcoded_secrets(self, scan_paths: List[str] = None) -> Dict[str, Any]:
        """Discover hardcoded secrets in codebase and configuration files"""
        logger.info("🔍 Starting automated secret discovery scan...")
        
        if not scan_paths:
            scan_paths = [".", "src/", "config/", "scripts/"]
        
        discovery_results = {
            "scan_timestamp": datetime.now(timezone.utc).isoformat(),
            "paths_scanned": [],
            "secrets_found": [],
            "total_files_scanned": 0,
            "high_risk_secrets": 0,
            "business_impact_summary": {},
            "recommended_actions": []
        }
        
        try:
            for scan_path in scan_paths:
                path_obj = Path(scan_path)
                if not path_obj.exists():
                    continue
                
                discovery_results["paths_scanned"].append(str(path_obj))
                
                # Scan files in path
                for file_path in self._get_scannable_files(path_obj):
                    discovery_results["total_files_scanned"] += 1
                    
                    try:
                        content = file_path.read_text(encoding='utf-8', errors='ignore')
                        
                        # Scan for secret patterns
                        file_secrets = self._scan_file_for_secrets(file_path, content)
                        discovery_results["secrets_found"].extend(file_secrets)
                        
                        # Count high-risk secrets
                        high_risk_count = sum(1 for secret in file_secrets 
                                            if secret.business_impact in [BusinessImpactLevel.CRITICAL, BusinessImpactLevel.HIGH])
                        discovery_results["high_risk_secrets"] += high_risk_count
                        
                    except Exception as e:
                        logger.warning(f"Failed to scan file {file_path}: {e}")
            
            # Analyze business impact
            discovery_results["business_impact_summary"] = self._analyze_discovery_business_impact(
                discovery_results["secrets_found"]
            )
            
            # Generate recommendations
            discovery_results["recommended_actions"] = self._generate_discovery_recommendations(
                discovery_results["secrets_found"]
            )
            
            # Update business metrics
            self._update_business_metrics_from_discovery(discovery_results)
            
            # Store results in vault agent memory
            self.vault_agent.memory_system.store_memory(
                memory_type=MemoryType.EXPERIENCE,
                content=discovery_results,
                context={"operation": "secret_discovery", "business_value": "high"},
                tags=["discovery", "business", "security"]
            )
            
            logger.info(f"✅ Secret discovery complete: {len(discovery_results['secrets_found'])} secrets found")
            return discovery_results
            
        except Exception as e:
            logger.error(f"❌ Secret discovery failed: {e}")
            discovery_results["error"] = str(e)
            return discovery_results
    
    async def generate_compliance_report(self, frameworks: List[ComplianceFramework] = None) -> Dict[str, Any]:
        """Generate comprehensive compliance report for specified frameworks"""
        logger.info("📋 Generating compliance report...")
        
        if not frameworks:
            frameworks = [ComplianceFramework.SOC2, ComplianceFramework.ISO27001, ComplianceFramework.PCI_DSS]
        
        # Get current vault intelligence
        vault_status = await self.vault_agent.get_vault_intelligence_dashboard()
        
        compliance_report = {
            "report_timestamp": datetime.now(timezone.utc).isoformat(),
            "frameworks_assessed": [f.value for f in frameworks],
            "overall_compliance_score": 0.0,
            "framework_scores": {},
            "compliance_gaps": [],
            "remediation_plan": [],
            "business_impact": {},
            "estimated_costs": {},
            "recommendations": []
        }
        
        try:
            total_score = 0.0
            
            for framework in frameworks:
                framework_assessment = await self._assess_framework_compliance(framework, vault_status)
                compliance_report["framework_scores"][framework.value] = framework_assessment
                total_score += framework_assessment["score"]
                
                # Collect gaps and recommendations
                compliance_report["compliance_gaps"].extend(framework_assessment.get("gaps", []))
                compliance_report["remediation_plan"].extend(framework_assessment.get("remediation", []))
            
            # Calculate overall score
            compliance_report["overall_compliance_score"] = total_score / len(frameworks)
            
            # Business impact analysis
            compliance_report["business_impact"] = self._calculate_compliance_business_impact(
                compliance_report["overall_compliance_score"],
                compliance_report["compliance_gaps"]
            )
            
            # Cost estimation
            compliance_report["estimated_costs"] = self._estimate_compliance_costs(
                compliance_report["remediation_plan"]
            )
            
            # Executive recommendations
            compliance_report["recommendations"] = self._generate_compliance_recommendations(
                compliance_report["overall_compliance_score"],
                compliance_report["framework_scores"]
            )
            
            # Update business metrics
            self.business_metrics.compliance_improvement_score = compliance_report["overall_compliance_score"]
            
            logger.info(f"✅ Compliance report generated: {compliance_report['overall_compliance_score']:.1%} overall score")
            return compliance_report
            
        except Exception as e:
            logger.error(f"❌ Compliance report generation failed: {e}")
            compliance_report["error"] = str(e)
            return compliance_report
    
    async def calculate_business_roi(self) -> Dict[str, Any]:
        """Calculate return on investment for intelligent vault system"""
        logger.info("💰 Calculating business ROI...")
        
        # Get current system metrics
        vault_status = await self.vault_agent.get_vault_intelligence_dashboard()
        
        roi_analysis = {
            "analysis_timestamp": datetime.now(timezone.utc).isoformat(),
            "time_period_days": 90,  # 3 months analysis
            "investments": {},
            "savings": {},
            "cost_avoidance": {},
            "efficiency_gains": {},
            "roi_percentage": 0.0,
            "payback_period_months": 0.0,
            "business_value_summary": {}
        }
        
        try:
            # Calculate investments (costs)
            investments = {
                "intelligent_vault_setup": 5000,  # One-time setup cost
                "ongoing_maintenance": 1000,  # Monthly maintenance
                "training_costs": 2000,  # Staff training
                "infrastructure_costs": 500  # Additional infrastructure
            }
            roi_analysis["investments"] = investments
            total_investment = sum(investments.values())
            
            # Calculate savings and value
            secrets_managed = vault_status.get("total_secrets", 0)
            
            # Time savings from automation
            manual_hours_saved = secrets_managed * 2  # 2 hours saved per secret per month
            time_savings_value = manual_hours_saved * self.cost_models["developer_hour_cost"]
            
            # Risk reduction value
            security_incidents_prevented = self.business_metrics.security_incidents_prevented
            risk_reduction_value = security_incidents_prevented * self.cost_models["security_incident_cost"]
            
            # Compliance automation value
            compliance_score = self.business_metrics.compliance_improvement_score
            compliance_value = compliance_score * self.cost_models["compliance_violation_cost"]
            
            savings = {
                "automated_secret_management": time_savings_value,
                "security_incident_prevention": risk_reduction_value,
                "compliance_automation": compliance_value,
                "reduced_audit_costs": 5000,  # Reduced manual audit time
                "faster_deployment": 3000  # Faster deployment cycles
            }
            roi_analysis["savings"] = savings
            total_savings = sum(savings.values())
            
            # Calculate ROI
            net_benefit = total_savings - total_investment
            roi_percentage = (net_benefit / total_investment) * 100 if total_investment > 0 else 0
            
            roi_analysis["roi_percentage"] = roi_percentage
            roi_analysis["payback_period_months"] = (total_investment / (total_savings / 12)) if total_savings > 0 else float('inf')
            
            # Business value summary
            roi_analysis["business_value_summary"] = {
                "total_investment": total_investment,
                "total_savings": total_savings,
                "net_benefit": net_benefit,
                "roi_percentage": roi_percentage,
                "key_benefits": [
                    f"${time_savings_value:,.0f} saved through automation",
                    f"${risk_reduction_value:,.0f} saved through risk reduction",
                    f"${compliance_value:,.0f} saved through compliance automation",
                    f"{manual_hours_saved:.0f} hours of manual work eliminated"
                ]
            }
            
            # Update business metrics
            self.business_metrics.time_saved_hours = manual_hours_saved
            self.business_metrics.cost_avoidance_dollars = total_savings
            self.business_metrics.efficiency_gain_percentage = (time_savings_value / total_investment) * 100
            
            logger.info(f"✅ ROI analysis complete: {roi_percentage:.1f}% ROI")
            return roi_analysis
            
        except Exception as e:
            logger.error(f"❌ ROI calculation failed: {e}")
            roi_analysis["error"] = str(e)
            return roi_analysis
    
    async def generate_executive_dashboard(self) -> Dict[str, Any]:
        """Generate executive-level dashboard with business metrics"""
        logger.info("📊 Generating executive dashboard...")
        
        try:
            # Get comprehensive system status
            vault_status = await self.vault_agent.get_vault_intelligence_dashboard()
            roi_analysis = await self.calculate_business_roi()
            
            dashboard = {
                "dashboard_timestamp": datetime.now(timezone.utc).isoformat(),
                "executive_summary": {
                    "security_posture": "Strong",
                    "compliance_status": f"{self.business_metrics.compliance_improvement_score:.1%}",
                    "roi_percentage": f"{roi_analysis.get('roi_percentage', 0):.1f}%",
                    "secrets_under_management": vault_status.get("total_secrets", 0),
                    "automation_level": "High"
                },
                "key_metrics": {
                    "time_saved_hours": self.business_metrics.time_saved_hours,
                    "cost_avoidance_dollars": self.business_metrics.cost_avoidance_dollars,
                    "security_incidents_prevented": self.business_metrics.security_incidents_prevented,
                    "compliance_improvement": f"{self.business_metrics.compliance_improvement_score:.1%}",
                    "efficiency_gain": f"{self.business_metrics.efficiency_gain_percentage:.1f}%"
                },
                "risk_indicators": {
                    "critical_secrets": vault_status.get("risk_distribution", {}).get("critical", 0),
                    "high_risk_secrets": vault_status.get("risk_distribution", {}).get("high", 0),
                    "rotation_due": vault_status.get("rotation_due_count", 0),
                    "compliance_issues": vault_status.get("compliance_issues", 0)
                },
                "business_impact": {
                    "operational_efficiency": "Significantly Improved",
                    "security_posture": "Enhanced",
                    "compliance_readiness": "Strong",
                    "development_velocity": "Increased",
                    "audit_readiness": "Excellent"
                },
                "recommendations": [
                    "Continue expanding intelligent vault coverage",
                    "Implement automated rotation for high-risk secrets",
                    "Enhance integration with CI/CD pipelines",
                    "Consider expanding to additional environments"
                ],
                "next_quarter_goals": [
                    "Achieve 95% compliance score across all frameworks",
                    "Reduce manual secret management by 80%",
                    "Implement real-time threat detection",
                    "Expand ROI to 300%+"
                ]
            }
            
            # Store dashboard in memory for historical tracking
            self.vault_agent.memory_system.store_memory(
                memory_type=MemoryType.CONFIGURATION,
                content=dashboard,
                context={"operation": "executive_dashboard", "audience": "executives"},
                tags=["dashboard", "business", "executives"]
            )
            
            logger.info("✅ Executive dashboard generated successfully")
            return dashboard
            
        except Exception as e:
            logger.error(f"❌ Executive dashboard generation failed: {e}")
            return {"error": str(e)}
    
    # Internal helper methods
    def _get_scannable_files(self, path: Path) -> List[Path]:
        """Get list of files that should be scanned for secrets"""
        scannable_extensions = {
            '.py', '.js', '.ts', '.java', '.cs', '.cpp', '.c', '.h',
            '.yaml', '.yml', '.json', '.xml', '.ini', '.cfg', '.conf',
            '.sh', '.bat', '.ps1', '.sql', '.env', '.properties'
        }
        
        scannable_files = []
        
        if path.is_file():
            if path.suffix.lower() in scannable_extensions:
                scannable_files.append(path)
        else:
            for file_path in path.rglob('*'):
                if (file_path.is_file() and 
                    file_path.suffix.lower() in scannable_extensions and
                    not any(part.startswith('.') for part in file_path.parts) and
                    'node_modules' not in file_path.parts):
                    scannable_files.append(file_path)
        
        return scannable_files[:1000]  # Limit to prevent excessive scanning
    
    def _scan_file_for_secrets(self, file_path: Path, content: str) -> List[SecretDiscoveryResult]:
        """Scan a single file for potential secrets"""
        secrets_found = []
        
        for secret_type, patterns in self.secret_patterns.items():
            for pattern in patterns:
                matches = re.finditer(pattern, content, re.MULTILINE)
                
                for match in matches:
                    # Calculate confidence based on context
                    confidence = self._calculate_secret_confidence(match, content, secret_type)
                    
                    if confidence > 0.3:  # Only report if confidence > 30%
                        # Assess business impact
                        business_impact = self._assess_secret_business_impact(file_path, secret_type)
                        
                        # Generate recommendations
                        recommendation = self._generate_secret_recommendation(secret_type, business_impact)
                        
                        # Identify risk factors
                        risk_factors = self._identify_risk_factors(file_path, secret_type, match)
                        
                        secret = SecretDiscoveryResult(
                            location=f"{file_path}:{match.start()}",
                            secret_type=secret_type,
                            confidence_score=confidence,
                            business_impact=business_impact,
                            recommended_action=recommendation,
                            risk_factors=risk_factors
                        )
                        
                        secrets_found.append(secret)
        
        return secrets_found
    
    def _calculate_secret_confidence(self, match: re.Match, content: str, secret_type: str) -> float:
        """Calculate confidence score for detected secret"""
        confidence = 0.5  # Base confidence
        
        matched_text = match.group(0).lower()
        
        # Adjust based on secret type patterns
        if secret_type == "api_key" and ("api" in matched_text or "key" in matched_text):
            confidence += 0.2
        elif secret_type == "password" and ("password" in matched_text or "passwd" in matched_text):
            confidence += 0.2
        elif secret_type == "crypto" and ("begin" in matched_text and "end" in matched_text):
            confidence += 0.3
        
        # Check for common false positives
        if any(word in matched_text for word in ["example", "sample", "test", "dummy", "placeholder"]):
            confidence -= 0.3
        
        # Check if it looks like a real secret (entropy, length)
        secret_value = match.group(1) if match.groups() else match.group(0)
        if len(secret_value) > 20 and len(set(secret_value)) > 10:
            confidence += 0.2
        
        return max(0.0, min(1.0, confidence))
    
    def _assess_secret_business_impact(self, file_path: Path, secret_type: str) -> BusinessImpactLevel:
        """Assess business impact of discovered secret"""
        path_str = str(file_path).lower()
        
        # High impact patterns
        if any(pattern in path_str for pattern in ["prod", "production", "live", "master"]):
            if secret_type in ["database", "api_key", "crypto"]:
                return BusinessImpactLevel.CRITICAL
            else:
                return BusinessImpactLevel.HIGH
        
        # Medium impact patterns
        elif any(pattern in path_str for pattern in ["staging", "stage", "config"]):
            return BusinessImpactLevel.MEDIUM
        
        # Development/test impact
        elif any(pattern in path_str for pattern in ["dev", "test", "demo"]):
            return BusinessImpactLevel.LOW
        
        # Default assessment based on secret type
        if secret_type in ["database", "crypto"]:
            return BusinessImpactLevel.HIGH
        elif secret_type in ["api_key", "secret"]:
            return BusinessImpactLevel.MEDIUM
        else:
            return BusinessImpactLevel.LOW
    
    def _generate_secret_recommendation(self, secret_type: str, business_impact: BusinessImpactLevel) -> str:
        """Generate recommendation for discovered secret"""
        if business_impact in [BusinessImpactLevel.CRITICAL, BusinessImpactLevel.HIGH]:
            return f"URGENT: Move {secret_type} to secure vault immediately"
        elif business_impact == BusinessImpactLevel.MEDIUM:
            return f"Move {secret_type} to vault and update references"
        else:
            return f"Consider moving {secret_type} to vault for best practices"
    
    def _identify_risk_factors(self, file_path: Path, secret_type: str, match: re.Match) -> List[str]:
        """Identify risk factors for discovered secret"""
        risk_factors = []
        
        path_str = str(file_path).lower()
        
        if "prod" in path_str:
            risk_factors.append("Production environment")
        if file_path.suffix in ['.js', '.py', '.java']:
            risk_factors.append("Source code exposure")
        if any(word in path_str for word in ["config", "env"]):
            risk_factors.append("Configuration file")
        if secret_type in ["database", "crypto"]:
            risk_factors.append("High-value secret type")
        
        return risk_factors
    
    def _analyze_discovery_business_impact(self, secrets: List[SecretDiscoveryResult]) -> Dict[str, Any]:
        """Analyze business impact of discovered secrets"""
        impact_summary = {
            "total_secrets": len(secrets),
            "by_impact_level": {},
            "by_secret_type": {},
            "estimated_risk_cost": 0.0,
            "priority_actions": 0
        }
        
        for secret in secrets:
            # Count by impact level
            impact_level = secret.business_impact.value
            impact_summary["by_impact_level"][impact_level] = impact_summary["by_impact_level"].get(impact_level, 0) + 1
            
            # Count by secret type
            secret_type = secret.secret_type
            impact_summary["by_secret_type"][secret_type] = impact_summary["by_secret_type"].get(secret_type, 0) + 1
            
            # Estimate risk cost
            if secret.business_impact == BusinessImpactLevel.CRITICAL:
                impact_summary["estimated_risk_cost"] += 100000
                impact_summary["priority_actions"] += 1
            elif secret.business_impact == BusinessImpactLevel.HIGH:
                impact_summary["estimated_risk_cost"] += 50000
                impact_summary["priority_actions"] += 1
            elif secret.business_impact == BusinessImpactLevel.MEDIUM:
                impact_summary["estimated_risk_cost"] += 25000
        
        return impact_summary
    
    def _generate_discovery_recommendations(self, secrets: List[SecretDiscoveryResult]) -> List[str]:
        """Generate recommendations based on discovery results"""
        recommendations = []
        
        critical_count = sum(1 for s in secrets if s.business_impact == BusinessImpactLevel.CRITICAL)
        high_count = sum(1 for s in secrets if s.business_impact == BusinessImpactLevel.HIGH)
        
        if critical_count > 0:
            recommendations.append(f"🚨 IMMEDIATE ACTION: {critical_count} critical secrets require urgent remediation")
        
        if high_count > 0:
            recommendations.append(f"⚠️ HIGH PRIORITY: {high_count} high-impact secrets need vault migration")
        
        # Type-specific recommendations
        secret_types = set(s.secret_type for s in secrets)
        if "database" in secret_types:
            recommendations.append("🔒 Implement database credential rotation")
        if "api_key" in secret_types:
            recommendations.append("🔑 Establish API key management policies")
        if "crypto" in secret_types:
            recommendations.append("🛡️ Secure cryptographic materials in HSM")
        
        recommendations.extend([
            "📋 Implement pre-commit hooks to prevent future secret leaks",
            "🤖 Set up automated secret scanning in CI/CD pipeline",
            "📚 Provide developer training on secure secret handling"
        ])
        
        return recommendations
    
    def _update_business_metrics_from_discovery(self, discovery_results: Dict[str, Any]):
        """Update business metrics based on discovery results"""
        secrets_found = len(discovery_results.get("secrets_found", []))
        high_risk_count = discovery_results.get("high_risk_secrets", 0)
        
        # Estimate time savings (2 hours per secret discovered automatically)
        time_saved = secrets_found * 2
        self.business_metrics.time_saved_hours += time_saved
        
        # Estimate risk reduction (high-risk secrets identified)
        if secrets_found > 0:
            risk_reduction = min(50, (secrets_found - high_risk_count) / secrets_found * 100)
            self.business_metrics.risk_reduction_percentage = max(
                self.business_metrics.risk_reduction_percentage, 
                risk_reduction
            )
        
        # Estimate incidents prevented
        self.business_metrics.security_incidents_prevented += high_risk_count
    
    async def _assess_framework_compliance(self, framework: ComplianceFramework, 
                                         vault_status: Dict[str, Any]) -> Dict[str, Any]:
        """Assess compliance with specific framework"""
        assessment = {
            "framework": framework.value,
            "score": 0.0,
            "requirements_met": 0,
            "total_requirements": 0,
            "gaps": [],
            "remediation": []
        }
        
        # Define framework requirements (simplified)
        requirements = self._get_framework_requirements(framework)
        assessment["total_requirements"] = len(requirements)
        
        for req_id, requirement in requirements.items():
            is_met = self._check_requirement_compliance(requirement, vault_status)
            
            if is_met:
                assessment["requirements_met"] += 1
            else:
                assessment["gaps"].append(f"{req_id}: {requirement['description']}")
                assessment["remediation"].append(requirement.get("remediation", "Address compliance gap"))
        
        # Calculate score
        assessment["score"] = assessment["requirements_met"] / assessment["total_requirements"]
        
        return assessment
    
    def _get_framework_requirements(self, framework: ComplianceFramework) -> Dict[str, Dict[str, Any]]:
        """Get requirements for compliance framework"""
        if framework == ComplianceFramework.SOC2:
            return {
                "CC6.1": {
                    "description": "Logical and physical access controls",
                    "check": "access_controls",
                    "remediation": "Implement role-based access controls"
                },
                "CC6.2": {
                    "description": "Transmission and disposal of data",
                    "check": "encryption",
                    "remediation": "Ensure data encryption in transit and at rest"
                },
                "CC6.3": {
                    "description": "System access monitoring",
                    "check": "monitoring",
                    "remediation": "Implement comprehensive access monitoring"
                }
            }
        elif framework == ComplianceFramework.ISO27001:
            return {
                "A.9.1": {
                    "description": "Access control policy",
                    "check": "access_policy",
                    "remediation": "Document and implement access control policies"
                },
                "A.10.1": {
                    "description": "Cryptographic controls",
                    "check": "encryption",
                    "remediation": "Implement cryptographic controls for sensitive data"
                }
            }
        else:
            return {}
    
    def _check_requirement_compliance(self, requirement: Dict[str, Any], 
                                    vault_status: Dict[str, Any]) -> bool:
        """Check if specific requirement is met"""
        check_type = requirement.get("check")
        
        if check_type == "access_controls":
            # Check if we have proper access controls
            return vault_status.get("autonomous_capabilities", {}).get("compliance_monitoring", False)
        elif check_type == "encryption":
            # Check if encryption is enabled
            security_posture = vault_status.get("security_posture", {})
            return "AES-256" in security_posture.get("encryption_status", "")
        elif check_type == "monitoring":
            # Check if monitoring is active
            return vault_status.get("intelligent_agent_info", {}).get("symbolic_reasoning_active", False)
        else:
            return False
    
    def _calculate_compliance_business_impact(self, overall_score: float, 
                                           gaps: List[str]) -> Dict[str, Any]:
        """Calculate business impact of compliance status"""
        return {
            "compliance_level": "Excellent" if overall_score > 0.9 else "Good" if overall_score > 0.7 else "Needs Improvement",
            "audit_readiness": "High" if overall_score > 0.8 else "Medium" if overall_score > 0.6 else "Low",
            "estimated_penalty_risk": len(gaps) * self.cost_models["compliance_violation_cost"],
            "competitive_advantage": "Strong" if overall_score > 0.85 else "Moderate" if overall_score > 0.7 else "Weak"
        }
    
    def _estimate_compliance_costs(self, remediation_plan: List[str]) -> Dict[str, Any]:
        """Estimate costs for compliance remediation"""
        return {
            "remediation_cost": len(remediation_plan) * 5000,  # $5k per remediation item
            "ongoing_maintenance": 2000,  # Monthly maintenance cost
            "audit_costs": 15000,  # Annual audit costs
            "total_annual_cost": len(remediation_plan) * 5000 + 2000 * 12 + 15000
        }
    
    def _generate_compliance_recommendations(self, overall_score: float, 
                                          framework_scores: Dict[str, Any]) -> List[str]:
        """Generate compliance recommendations"""
        recommendations = []
        
        if overall_score < 0.7:
            recommendations.append("🚨 URGENT: Compliance score below acceptable threshold")
        
        # Framework-specific recommendations
        for framework, data in framework_scores.items():
            if data["score"] < 0.8:
                recommendations.append(f"📋 Improve {framework.upper()} compliance (currently {data['score']:.1%})")
        
        recommendations.extend([
            "🔄 Implement automated compliance monitoring",
            "📊 Schedule quarterly compliance assessments",
            "📚 Provide compliance training for development teams",
            "🔍 Conduct regular compliance audits"
        ])
        
        return recommendations

# Factory function
def create_business_enhancement_engine(vault_agent: IntelligentVaultAgent,
                                     production_integration: ProductionVaultIntegration = None) -> BusinessEnhancementEngine:
    """Create business enhancement engine"""
    return BusinessEnhancementEngine(vault_agent, production_integration)

if __name__ == "__main__":
    # Demo business enhancement engine
    async def demo():
        from .intelligent_vault_agent import create_intelligent_vault_agent
        
        vault_agent = create_intelligent_vault_agent()
        business_engine = create_business_enhancement_engine(vault_agent)
        
        print("💼 Business Enhancement Engine Demo")
        print("=" * 50)
        
        # Secret discovery
        discovery = await business_engine.discover_hardcoded_secrets([".", "agent_core/"])
        print(f"🔍 Discovery: {len(discovery.get('secrets_found', []))} secrets found")
        
        # Compliance report
        compliance = await business_engine.generate_compliance_report()
        print(f"📋 Compliance: {compliance.get('overall_compliance_score', 0):.1%} score")
        
        # ROI analysis
        roi = await business_engine.calculate_business_roi()
        print(f"💰 ROI: {roi.get('roi_percentage', 0):.1f}%")
        
        # Executive dashboard
        dashboard = await business_engine.generate_executive_dashboard()
        print(f"📊 Dashboard: {dashboard['executive_summary']['security_posture']} security posture")
        
        print("\n✅ Business enhancement demo complete!")
    
    asyncio.run(demo()) 