#!/usr/bin/env python3
"""
UAP Level 2 Seeding Validation System
=====================================

Comprehensive validation to ensure UAP Level 2 governance standards
are properly seeded and ready for universal synchronization across
all applications in the ecosystem.

This validates:
- Governance rule completeness
- Seeding system integrity  
- Synchronization readiness
- Universal compliance enforcement
- Application integration points

Run this before deploying UAP standards to ensure proper seeding.
"""

import asyncio
import logging
import json
import sys
from datetime import datetime
from typing import Dict, List, Any
from pathlib import Path

# Configure detailed logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s | %(name)s | %(levelname)s | %(message)s',
    handlers=[
        logging.StreamHandler(sys.stdout),
        logging.FileHandler('level2_seeding_validation.log')
    ]
)

logger = logging.getLogger("UAP.SeedingValidation")


class Level2SeedingValidator:
    """
    Comprehensive validator for UAP Level 2 seeding system.
    
    Ensures the governance framework is properly seeded and ready
    for universal synchronization across applications.
    """
    
    def __init__(self):
        self.logger = logging.getLogger("UAP.SeedingValidator")
        self.validation_results = {
            "overall_status": "UNKNOWN",
            "seeding_ready": False,
            "sync_ready": False,
            "governance_valid": False,
            "framework_complete": False
        }
    
    async def validate_complete_seeding(self) -> Dict[str, Any]:
        """Run comprehensive seeding validation"""
        
        self.logger.info("🌱 STARTING UAP LEVEL 2 SEEDING VALIDATION")
        self.logger.info("=" * 60)
        
        validation_start = datetime.now()
        
        try:
            # Phase 1: Framework Structure Validation
            framework_valid = await self._validate_framework_structure()
            
            # Phase 2: Governance Rules Validation  
            governance_valid = await self._validate_governance_rules()
            
            # Phase 3: Seeding System Validation
            seeding_valid = await self._validate_seeding_system()
            
            # Phase 4: Synchronization Readiness
            sync_ready = await self._validate_sync_readiness()
            
            # Phase 5: Universal Compliance Enforcement
            compliance_ready = await self._validate_compliance_system()
            
            # Phase 6: Integration Points Validation
            integration_ready = await self._validate_integration_points()
            
            # Calculate overall seeding status
            validation_time = (datetime.now() - validation_start).total_seconds()
            
            overall_valid = all([
                framework_valid,
                governance_valid,
                seeding_valid,
                sync_ready,
                compliance_ready,
                integration_ready
            ])
            
            self.validation_results.update({
                "overall_status": "READY" if overall_valid else "NOT_READY",
                "seeding_ready": seeding_valid,
                "sync_ready": sync_ready,
                "governance_valid": governance_valid,
                "framework_complete": framework_valid,
                "compliance_ready": compliance_ready,
                "integration_ready": integration_ready,
                "validation_time": validation_time
            })
            
            # Generate comprehensive report
            report = await self._generate_seeding_report()
            
            self.logger.info("=" * 60)
            self.logger.info("🎯 UAP LEVEL 2 SEEDING VALIDATION COMPLETE")
            self.logger.info("=" * 60)
            
            if overall_valid:
                self.logger.info("✅ SEEDING VALIDATION: PASSED")
                self.logger.info("🌱 UAP Level 2 standards are properly seeded")
                self.logger.info("🔄 Ready for universal synchronization")
            else:
                self.logger.error("❌ SEEDING VALIDATION: FAILED")
                self.logger.error("🚨 UAP Level 2 seeding requires attention")
            
            return report
            
        except Exception as e:
            self.logger.error(f"❌ Critical validation error: {e}")
            return {
                "overall_status": "ERROR",
                "error": str(e),
                "validation_time": (datetime.now() - validation_start).total_seconds()
            }
    
    async def _validate_framework_structure(self) -> bool:
        """Validate UAP framework structure completeness"""
        
        self.logger.info("🏗️ Phase 1: Framework Structure Validation")
        
        required_components = [
            "vanta_seed/__init__.py",
            "vanta_seed/core/__init__.py", 
            "vanta_seed/core/uap_agent_base.py",
            "vanta_seed/core/component_registry.py",
            "vanta_seed/core/protocol_handlers.py",
            "vanta_seed/core/compliance_validator.py",
            "vanta_seed/protocols/message_types.py",
            "vanta_seed/templates/example_uap_agent.py",
            "vanta_seed/governance/__init__.py",
            "vanta_seed/governance/level2_seeding_system.py"
        ]
        
        missing_components = []
        
        for component in required_components:
            if not Path(component).exists():
                missing_components.append(component)
                self.logger.error(f"  ❌ Missing: {component}")
            else:
                self.logger.info(f"  ✅ Found: {component}")
        
        framework_complete = len(missing_components) == 0
        
        if framework_complete:
            self.logger.info("✅ Framework structure validation PASSED")
        else:
            self.logger.error(f"❌ Framework structure validation FAILED: {len(missing_components)} missing components")
        
        return framework_complete
    
    async def _validate_governance_rules(self) -> bool:
        """Validate governance rules completeness"""
        
        self.logger.info("📋 Phase 2: Governance Rules Validation")
        
        try:
            # Import and initialize governance system
            from vanta_seed.governance import LEVEL2_SEEDING_SYSTEM, initialize_governance_ecosystem
            
            # Initialize governance seeds
            seed_result = await initialize_governance_ecosystem()
            
            expected_rules = [
                "UAP-001", "UAP-002", "COM-001", "COM-002", "COM-003",
                "TOOL-001", "TOOL-002", "TOOL-003", "REG-001", "REG-002", 
                "CASCADE-001", "SEC-001", "SEC-002", "MON-001", "MON-002"
            ]
            
            total_rules = seed_result.get("total_rules", 0)
            validation_result = seed_result.get("validation", {})
            
            rules_valid = (
                total_rules >= len(expected_rules) and
                validation_result.get("integrity_valid", False) and
                validation_result.get("checksum_valid", False)
            )
            
            self.logger.info(f"  📊 Total rules loaded: {total_rules}")
            self.logger.info(f"  🔍 Integrity valid: {validation_result.get('integrity_valid', False)}")
            self.logger.info(f"  🔒 Checksum valid: {validation_result.get('checksum_valid', False)}")
            
            if rules_valid:
                self.logger.info("✅ Governance rules validation PASSED")
            else:
                self.logger.error("❌ Governance rules validation FAILED")
            
            return rules_valid
            
        except Exception as e:
            self.logger.error(f"❌ Governance validation error: {e}")
            return False
    
    async def _validate_seeding_system(self) -> bool:
        """Validate seeding system functionality"""
        
        self.logger.info("🌱 Phase 3: Seeding System Validation")
        
        try:
            from vanta_seed.governance import LEVEL2_SEEDING_SYSTEM
            
            # Test seeding system initialization
            if not hasattr(LEVEL2_SEEDING_SYSTEM, 'governance_rules'):
                self.logger.error("  ❌ Seeding system not properly initialized")
                return False
            
            # Test governance manifest creation
            await LEVEL2_SEEDING_SYSTEM._load_level2_rules()
            manifest = await LEVEL2_SEEDING_SYSTEM._create_governance_manifest()
            
            required_manifest_fields = [
                "governance_version", "total_rules", "rules_by_category", 
                "rules_by_severity", "sync_requirements", "checksum"
            ]
            
            manifest_valid = all(field in manifest for field in required_manifest_fields)
            
            # Test seed integrity validation
            integrity_result = await LEVEL2_SEEDING_SYSTEM._validate_seed_integrity()
            integrity_valid = integrity_result.get("integrity_valid", False)
            
            seeding_functional = manifest_valid and integrity_valid
            
            self.logger.info(f"  📋 Manifest valid: {manifest_valid}")
            self.logger.info(f"  🔍 Integrity valid: {integrity_valid}")
            
            if seeding_functional:
                self.logger.info("✅ Seeding system validation PASSED")
            else:
                self.logger.error("❌ Seeding system validation FAILED")
            
            return seeding_functional
            
        except Exception as e:
            self.logger.error(f"❌ Seeding system validation error: {e}")
            return False
    
    async def _validate_sync_readiness(self) -> bool:
        """Validate synchronization readiness"""
        
        self.logger.info("🔄 Phase 4: Synchronization Readiness Validation")
        
        try:
            from vanta_seed.governance import sync_uap_governance, get_governance_status
            
            # Test sync function availability
            if not callable(sync_uap_governance):
                self.logger.error("  ❌ Sync function not available")
                return False
            
            # Test governance status retrieval
            status = await get_governance_status()
            
            required_status_fields = [
                "ecosystem_overview", "governance_rules", "application_status"
            ]
            
            status_valid = all(field in status for field in required_status_fields)
            
            # Test that seeding configuration is available
            try:
                from vanta_seed import SEEDING_CONFIG
                config_valid = (
                    SEEDING_CONFIG.get("universal_standards", False) and
                    SEEDING_CONFIG.get("governance_version") == "2.0.0"
                )
            except ImportError:
                config_valid = False
            
            sync_ready = status_valid and config_valid
            
            self.logger.info(f"  📊 Status valid: {status_valid}")
            self.logger.info(f"  ⚙️ Config valid: {config_valid}")
            
            if sync_ready:
                self.logger.info("✅ Synchronization readiness PASSED")
            else:
                self.logger.error("❌ Synchronization readiness FAILED")
            
            return sync_ready
            
        except Exception as e:
            self.logger.error(f"❌ Sync readiness validation error: {e}")
            return False
    
    async def _validate_compliance_system(self) -> bool:
        """Validate compliance enforcement system"""
        
        self.logger.info("🔍 Phase 5: Compliance System Validation")
        
        try:
            from vanta_seed import COMPLIANCE_VALIDATOR, validate_agent
            from vanta_seed.templates.example_uap_agent import ExampleUAPAgent
            
            # Test compliance validator functionality
            if not hasattr(COMPLIANCE_VALIDATOR, 'compliance_rules'):
                self.logger.error("  ❌ Compliance validator not initialized")
                return False
            
            # Test agent validation
            example_agent = ExampleUAPAgent("validation_test_agent")
            
            # Run compliance validation
            compliance_report = await validate_agent(ExampleUAPAgent, example_agent)
            
            compliance_score = compliance_report.compliance_score
            overall_status = compliance_report.overall_status
            
            compliance_valid = (
                compliance_score >= 0.8 and 
                overall_status in ["COMPLIANT", "PARTIAL", "NON_COMPLIANT"]
            )
            
            self.logger.info(f"  📊 Compliance score: {compliance_score:.1%}")
            self.logger.info(f"  📋 Overall status: {overall_status}")
            
            if compliance_valid:
                self.logger.info("✅ Compliance system validation PASSED")
            else:
                self.logger.error("❌ Compliance system validation FAILED")
            
            return compliance_valid
            
        except Exception as e:
            self.logger.error(f"❌ Compliance validation error: {e}")
            return False
    
    async def _validate_integration_points(self) -> bool:
        """Validate integration points for applications"""
        
        self.logger.info("🔗 Phase 6: Integration Points Validation")
        
        try:
            # Test main package imports
            import vanta_seed
            
            required_exports = [
                'UAPAgentBase', 'COMPONENT_REGISTRY', 'COMPLIANCE_VALIDATOR',
                'sync_uap_governance', 'validate_app_compliance', 'initialize_governance_ecosystem'
            ]
            
            missing_exports = []
            for export in required_exports:
                if not hasattr(vanta_seed, export):
                    missing_exports.append(export)
                    self.logger.error(f"  ❌ Missing export: {export}")
                else:
                    self.logger.info(f"  ✅ Export available: {export}")
            
            # Test seeding configuration
            seeding_config = getattr(vanta_seed, 'SEEDING_CONFIG', {})
            config_complete = (
                seeding_config.get("universal_standards", False) and
                seeding_config.get("governance_version") == "2.0.0"
            )
            
            integration_ready = len(missing_exports) == 0 and config_complete
            
            self.logger.info(f"  ⚙️ Config complete: {config_complete}")
            
            if integration_ready:
                self.logger.info("✅ Integration points validation PASSED")
            else:
                self.logger.error("❌ Integration points validation FAILED")
            
            return integration_ready
            
        except Exception as e:
            self.logger.error(f"❌ Integration validation error: {e}")
            return False
    
    async def _generate_seeding_report(self) -> Dict[str, Any]:
        """Generate comprehensive seeding validation report"""
        
        return {
            "seeding_validation_report": {
                "timestamp": datetime.now().isoformat(),
                "overall_status": self.validation_results["overall_status"],
                "validation_results": self.validation_results,
                "seeding_readiness": {
                    "framework_complete": self.validation_results["framework_complete"],
                    "governance_valid": self.validation_results["governance_valid"],
                    "seeding_system_ready": self.validation_results["seeding_ready"],
                    "sync_ready": self.validation_results["sync_ready"],
                    "compliance_ready": self.validation_results["compliance_ready"],
                    "integration_ready": self.validation_results["integration_ready"]
                },
                "universal_sync_status": {
                    "ready_for_deployment": self.validation_results["overall_status"] == "READY",
                    "governance_version": "2.0.0",
                    "standards_seeded": self.validation_results["governance_valid"],
                    "universal_compliance": self.validation_results["compliance_ready"]
                },
                "next_steps": [
                    "Deploy UAP framework to target applications",
                    "Run sync_uap_governance() for each application",
                    "Validate compliance using validate_app_compliance()",
                    "Monitor governance status with get_governance_status()",
                    "Maintain 90%+ compliance across ecosystem"
                ] if self.validation_results["overall_status"] == "READY" else [
                    "Review failed validation phases",
                    "Fix missing components or configurations", 
                    "Re-run validation until all phases pass",
                    "Ensure framework structure is complete",
                    "Verify governance rules are properly loaded"
                ]
            }
        }


async def main():
    """Main validation function"""
    
    print("🌱 UAP LEVEL 2 SEEDING VALIDATION")
    print("=" * 50)
    print("Validating governance standards are ready for universal sync")
    print("=" * 50)
    
    validator = Level2SeedingValidator()
    
    try:
        # Run comprehensive validation
        report = await validator.validate_complete_seeding()
        
        # Print summary
        overall_status = report["seeding_validation_report"]["overall_status"]
        
        print(f"\n🎯 VALIDATION RESULT: {overall_status}")
        
        if overall_status == "READY":
            print("✅ UAP Level 2 standards are properly seeded")
            print("🔄 Ready for universal synchronization")
            print("🌍 All applications can now adopt UAP standards")
        else:
            print("❌ Seeding validation failed")
            print("🔧 Review validation report for required fixes")
        
        # Save detailed report
        report_file = f"level2_seeding_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        with open(report_file, 'w') as f:
            json.dump(report, f, indent=2)
        
        print(f"📋 Detailed report saved: {report_file}")
        
        return overall_status == "READY"
        
    except Exception as e:
        print(f"❌ Validation failed with error: {e}")
        return False


if __name__ == "__main__":
    success = asyncio.run(main())
    
    if success:
        print("\n🎉 UAP Level 2 seeding validation SUCCESSFUL!")
        print("✨ Framework ready for universal deployment")
        sys.exit(0)
    else:
        print("\n🚨 UAP Level 2 seeding validation FAILED!")
        print("🔧 Fix issues before deploying standards")
        sys.exit(1) 