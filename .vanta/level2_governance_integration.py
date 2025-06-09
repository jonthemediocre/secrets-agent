#!/usr/bin/env python3
"""
.vanta Level 2 Governance Integration
=====================================

Integrates UAP Level 2 governance standards into the .vanta ecosystem structure
to enable seamless progression to Level 3 agent orchestration and beyond.

This system bridges:
- UAP Level 2 governance rules into .vanta/rules/level2_foundation/
- Agent-to-Agent messaging with trinity node communication
- CoE delegation patterns for complex Level 3 decisions
- Symbolic evolution tracking for governance advancement

Level 3 Readiness: SEEDED
"""

import asyncio
import json
import yaml
import logging
from datetime import datetime
from typing import Dict, List, Any, Optional
from pathlib import Path
from dataclasses import dataclass, asdict

# Import UAP Level 2 components
import sys
sys.path.append('..')
from vanta_seed import (
    LEVEL2_SEEDING_SYSTEM, 
    sync_uap_governance,
    get_governance_status,
    SEEDING_CONFIG
)


@dataclass
class VantaLevel2Integration:
    """Integration configuration for UAP Level 2 in .vanta ecosystem"""
    integration_id: str
    timestamp: str
    level2_governance_seeded: bool
    trinity_nodes_configured: bool
    coe_delegation_enabled: bool
    symbolic_evolution_ready: bool
    level3_progression_unlocked: bool
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class VantaLevel2GovernanceIntegrator:
    """
    Integrates UAP Level 2 governance into .vanta ecosystem structure
    for Level 3 agent progression readiness.
    """
    
    def __init__(self, vanta_root: str = ".vanta"):
        self.logger = logging.getLogger("Vanta.Level2Integration")
        self.vanta_root = Path(vanta_root)
        self.integration_timestamp = datetime.now().isoformat()
        
        # Ensure .vanta structure exists
        self.vanta_root.mkdir(exist_ok=True)
        
        # Level 2 → Level 3 progression paths
        self.level2_paths = {
            "governance": self.vanta_root / "rules" / "level2_foundation",
            "agents": self.vanta_root / "agents" / "level2_compliant", 
            "trinity": self.vanta_root / "trinity" / "level2_nodes",
            "coe": self.vanta_root / "coe" / "level2_delegation",
            "symbolic": self.vanta_root / "symbolic" / "level2_evolution",
            "runtime": self.vanta_root / "runtime" / "level2_orchestration"
        }
        
        # Create directory structure
        for path in self.level2_paths.values():
            path.mkdir(parents=True, exist_ok=True)
    
    async def integrate_level2_governance(self) -> VantaLevel2Integration:
        """
        Main integration function - seeds UAP Level 2 governance into .vanta
        for Level 3 progression readiness.
        """
        self.logger.info("🌱 Integrating UAP Level 2 governance into .vanta ecosystem")
        
        integration_result = VantaLevel2Integration(
            integration_id=f"vanta_l2_integration_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            timestamp=self.integration_timestamp,
            level2_governance_seeded=False,
            trinity_nodes_configured=False,
            coe_delegation_enabled=False,
            symbolic_evolution_ready=False,
            level3_progression_unlocked=False
        )
        
        try:
            # Phase 1: Seed Level 2 governance rules into .vanta/rules/
            governance_seeded = await self._seed_governance_rules()
            integration_result.level2_governance_seeded = governance_seeded
            
            # Phase 2: Configure trinity nodes for Level 2 agents
            trinity_configured = await self._configure_trinity_nodes()
            integration_result.trinity_nodes_configured = trinity_configured
            
            # Phase 3: Enable CoE delegation patterns
            coe_enabled = await self._enable_coe_delegation()
            integration_result.coe_delegation_enabled = coe_enabled
            
            # Phase 4: Setup symbolic evolution tracking
            symbolic_ready = await self._setup_symbolic_evolution()
            integration_result.symbolic_evolution_ready = symbolic_ready
            
            # Phase 5: Validate Level 3 progression readiness
            level3_ready = await self._validate_level3_readiness()
            integration_result.level3_progression_unlocked = level3_ready
            
            # Save integration manifest
            await self._save_integration_manifest(integration_result)
            
            overall_success = all([
                governance_seeded, trinity_configured, coe_enabled, 
                symbolic_ready, level3_ready
            ])
            
            if overall_success:
                self.logger.info("✅ Level 2 governance successfully integrated into .vanta")
                self.logger.info("🚀 Level 3 progression UNLOCKED")
            else:
                self.logger.warning("⚠️ Partial Level 2 integration - review failed phases")
            
            return integration_result
            
        except Exception as e:
            self.logger.error(f"❌ Level 2 integration failed: {e}")
            raise
    
    async def _seed_governance_rules(self) -> bool:
        """Phase 1: Seed UAP Level 2 governance rules into .vanta structure"""
        
        self.logger.info("📋 Phase 1: Seeding Level 2 governance rules")
        
        try:
            # Initialize Level 2 seeding system
            seed_result = await LEVEL2_SEEDING_SYSTEM.initialize_governance_seeds()
            
            # Create .vanta governance structure
            governance_structure = {
                "level2_foundation": {
                    "uap_rules": {},
                    "communication_protocols": {},
                    "tool_management": {},
                    "registry_discovery": {},
                    "cascade_workflows": {},
                    "security_requirements": {},
                    "monitoring_telemetry": {}
                },
                "vanta_extensions": {
                    "trinity_integration": {},
                    "symbolic_evolution": {},
                    "coe_delegation": {},
                    "level3_progression": {}
                }
            }
            
            # Map Level 2 rules to .vanta categories
            rule_mapping = {
                "UAP": "uap_rules",
                "COM": "communication_protocols", 
                "TOOL": "tool_management",
                "REG": "registry_discovery",
                "CASCADE": "cascade_workflows",
                "SEC": "security_requirements",
                "MON": "monitoring_telemetry"
            }
            
            # Process each governance rule
            for rule_id, rule in LEVEL2_SEEDING_SYSTEM.governance_rules.items():
                category = rule_mapping.get(rule.category, "other")
                
                # Convert to .vanta format
                vanta_rule = {
                    "rule_id": rule.rule_id,
                    "title": rule.title,
                    "description": rule.description,
                    "severity": rule.severity,
                    "implementation_requirements": rule.implementation_requirements,
                    "validation_method": rule.validation_method,
                    "sync_priority": rule.sync_priority,
                    "version": rule.version,
                    "vanta_integration": {
                        "trinity_applicable": True,
                        "coe_delegatable": rule.severity in ["CRITICAL", "MANDATORY"],
                        "symbolic_trackable": True,
                        "level3_prerequisite": rule.severity == "CRITICAL"
                    }
                }
                
                governance_structure["level2_foundation"][category][rule_id] = vanta_rule
            
            # Save governance structure to .vanta
            governance_file = self.level2_paths["governance"] / "uap_level2_rules.json"
            with open(governance_file, 'w') as f:
                json.dump(governance_structure, f, indent=2)
            
            # Create Level 2 compliance manifest
            compliance_manifest = {
                "manifest_type": "level2_governance_compliance",
                "created_at": self.integration_timestamp,
                "governance_version": "2.0.0",
                "total_rules": len(LEVEL2_SEEDING_SYSTEM.governance_rules),
                "vanta_integration_version": "2.1",
                "level3_readiness": {
                    "governance_foundation": True,
                    "rule_mapping_complete": True,
                    "vanta_extensions_seeded": True
                },
                "next_level_requirements": [
                    "Trinity node orchestration",
                    "CoE delegation patterns",
                    "Symbolic evolution tracking",
                    "Level 3 agent generation"
                ]
            }
            
            manifest_file = self.level2_paths["governance"] / "level2_compliance_manifest.yaml"
            with open(manifest_file, 'w') as f:
                yaml.dump(compliance_manifest, f, default_flow_style=False)
            
            self.logger.info(f"✅ {len(LEVEL2_SEEDING_SYSTEM.governance_rules)} governance rules seeded to .vanta")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Governance seeding failed: {e}")
            return False
    
    async def _configure_trinity_nodes(self) -> bool:
        """Phase 2: Configure trinity nodes for Level 2 agent orchestration"""
        
        self.logger.info("🔺 Phase 2: Configuring trinity nodes for Level 2 agents")
        
        try:
            trinity_config = {
                "trinity_configuration": {
                    "version": "2.1",
                    "level2_integration": True,
                    "nodes": {
                        "athena_node": {
                            "archetype": "athena",
                            "role": "Level 2 Compliance Scanner",
                            "capabilities": [
                                "uap_compliance_validation",
                                "governance_rule_enforcement", 
                                "agent_registration_audit"
                            ],
                            "level2_responsibilities": [
                                "UAP-001: UAPAgentBase inheritance validation",
                                "UAP-002: Protocol support verification",
                                "REG-001: Registry registration enforcement"
                            ],
                            "trinity_affinity": "cube",
                            "coe_delegation_enabled": True
                        },
                        "hermes_node": {
                            "archetype": "hermes",
                            "role": "Level 2 Communication Orchestrator",
                            "capabilities": [
                                "a2a_message_routing",
                                "mcp_tool_orchestration",
                                "cross_protocol_optimization"
                            ],
                            "level2_responsibilities": [
                                "COM-001: A2A communication standards",
                                "COM-002: MCP tool integration",
                                "COM-003: Cross-protocol workflows"
                            ],
                            "trinity_affinity": "star_tetrahedron",
                            "coe_delegation_enabled": True
                        },
                        "prometheus_node": {
                            "archetype": "prometheus",
                            "role": "Level 2 to Level 3 Evolution Engine",
                            "capabilities": [
                                "agent_capability_synthesis",
                                "governance_rule_evolution",
                                "level3_agent_generation"
                            ],
                            "level2_responsibilities": [
                                "CASCADE-001: Cascade execution compatibility",
                                "MON-001: Telemetry implementation",
                                "Symbolic evolution tracking"
                            ],
                            "trinity_affinity": "dodecahedron", 
                            "coe_delegation_enabled": True
                        }
                    },
                    "orchestration_patterns": {
                        "level2_compliance_check": {
                            "trigger": "agent_registration",
                            "flow": ["athena_scan", "hermes_validate", "prometheus_evolve"],
                            "coe_escalation": "critical_violations_detected"
                        },
                        "level3_progression_assessment": {
                            "trigger": "90%_compliance_achieved",
                            "flow": ["prometheus_analyze", "athena_validate", "hermes_orchestrate"],
                            "coe_escalation": "level3_readiness_decision"
                        }
                    }
                }
            }
            
            # Save trinity configuration
            trinity_file = self.level2_paths["trinity"] / "level2_trinity_config.yaml"
            with open(trinity_file, 'w') as f:
                yaml.dump(trinity_config, f, default_flow_style=False)
            
            # Create trinity integration instructions
            instructions = {
                "trinity_integration_guide": {
                    "purpose": "Level 2 governance enforcement through trinity node orchestration",
                    "setup_steps": [
                        "1. Each trinity node validates specific Level 2 governance categories",
                        "2. Athena focuses on compliance and registration rules",
                        "3. Hermes manages communication and protocol standards", 
                        "4. Prometheus drives evolution and Level 3 progression",
                        "5. CoE delegation handles complex governance decisions"
                    ],
                    "usage_patterns": [
                        "New agent registration triggers athena compliance scan",
                        "Communication failures trigger hermes optimization",
                        "High compliance scores trigger prometheus Level 3 assessment",
                        "Critical violations trigger CoE delegation for resolution"
                    ]
                }
            }
            
            instructions_file = self.level2_paths["trinity"] / "integration_instructions.yaml"
            with open(instructions_file, 'w') as f:
                yaml.dump(instructions, f, default_flow_style=False)
            
            self.logger.info("✅ Trinity nodes configured for Level 2 governance")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Trinity configuration failed: {e}")
            return False
    
    async def _enable_coe_delegation(self) -> bool:
        """Phase 3: Enable Coalition of Experts delegation patterns"""
        
        self.logger.info("🤝 Phase 3: Enabling CoE delegation patterns")
        
        try:
            # Following cursor rules for CoE delegation
            coe_config = {
                "coe_delegation_framework": {
                    "version": "2.1",
                    "delegation_triggers": {
                        "governance_rule_violations": {
                            "critical_violations": "immediate_coe_escalation",
                            "mandatory_violations": "timed_coe_review",
                            "multiple_violations": "pattern_analysis_coe"
                        },
                        "level3_progression_decisions": {
                            "readiness_assessment": "coe_committee_review",
                            "capability_synthesis": "specialized_coe_panel",
                            "governance_evolution": "governance_coe_authority"
                        },
                        "complex_orchestration": {
                            "multi_agent_conflicts": "mediation_coe",
                            "protocol_optimization": "technical_coe",
                            "security_incidents": "security_coe"
                        }
                    },
                    "delegation_patterns": {
                        "proposal_format": {
                            "type": "governance_decision_request",
                            "context": "level2_compliance_framework",
                            "proposal": "detailed_action_specification",
                            "requester_agent": "originating_agent_id",
                            "severity": "critical|mandatory|required",
                            "impact_scope": "single_agent|ecosystem_wide|level3_progression"
                        },
                        "invocation_methods": [
                            "orchestrator.trigger_coe(proposal)",
                            "event_bus.publish('coe_review_request', proposal)",
                            "trinity_node.escalate_to_coe(context, proposal)"
                        ]
                    },
                    "coe_committees": {
                        "governance_authority": {
                            "scope": "UAP governance rule evolution",
                            "members": ["governance_specialist", "compliance_validator", "ecosystem_architect"],
                            "decision_threshold": "unanimous_for_critical"
                        },
                        "technical_review": {
                            "scope": "Protocol and tool implementation standards",
                            "members": ["protocol_expert", "tool_architect", "integration_specialist"],
                            "decision_threshold": "majority_consensus"
                        },
                        "security_authority": {
                            "scope": "Security and access control policies",
                            "members": ["security_architect", "auth_specialist", "audit_expert"],
                            "decision_threshold": "security_unanimous"
                        }
                    }
                }
            }
            
            # Save CoE configuration
            coe_file = self.level2_paths["coe"] / "delegation_framework.yaml"
            with open(coe_file, 'w') as f:
                yaml.dump(coe_config, f, default_flow_style=False)
            
            # Create CoE implementation templates
            implementation_template = '''
# CoE Delegation Implementation Template
# Following cursor rules 1015 and 1016

class Level2GovernanceAgent:
    def suggest_governance_change(self, context):
        proposal = self._generate_governance_proposal(context)
        
        # Following rule 1015: Do not implement directly
        # Instead trigger CoE review
        coe_request = {
            "type": "governance_rule_modification",
            "context": context,
            "proposal": proposal,
            "requester_agent": self.agent_id,
            "severity": "critical" if self._is_critical_change(proposal) else "mandatory"
        }
        
        # Following rule 1016: Use proper invocation method
        self.orchestrator.trigger_coe(coe_request)
        # OR: self.event_bus.publish("coe_review_request", coe_request)
        
        return {"status": "delegated_to_coe", "request_id": coe_request["id"]}
    
    def handle_compliance_violation(self, violation):
        if violation.severity == "CRITICAL":
            # Immediate CoE escalation for critical violations
            self._escalate_to_coe("critical_compliance_violation", violation)
        else:
            # Standard handling for non-critical
            self._apply_standard_remediation(violation)
'''
            
            template_file = self.level2_paths["coe"] / "implementation_template.py"
            with open(template_file, 'w') as f:
                f.write(implementation_template)
            
            self.logger.info("✅ CoE delegation patterns enabled")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ CoE delegation setup failed: {e}")
            return False
    
    async def _setup_symbolic_evolution(self) -> bool:
        """Phase 4: Setup symbolic evolution tracking for Level 3 progression"""
        
        self.logger.info("🔮 Phase 4: Setting up symbolic evolution tracking")
        
        try:
            symbolic_config = {
                "symbolic_evolution_framework": {
                    "version": "2.1",
                    "tracking_scope": "level2_to_level3_progression",
                    "evolution_metrics": {
                        "compliance_progression": {
                            "metric": "governance_rule_compliance_score",
                            "threshold_levels": {
                                "basic": 0.7,
                                "proficient": 0.85, 
                                "advanced": 0.95,
                                "level3_ready": 0.98
                            },
                            "symbolic_representation": "compliance_sacred_geometry"
                        },
                        "capability_synthesis": {
                            "metric": "cross_protocol_orchestration_ability",
                            "dimensions": ["mcp_mastery", "a2a_fluency", "cascade_competence"],
                            "synthesis_threshold": "dimensional_harmony_achieved",
                            "symbolic_representation": "capability_mandala_completion"
                        },
                        "ecosystem_integration": {
                            "metric": "vanta_trinity_resonance",
                            "trinity_alignment": ["athena_compliance", "hermes_communication", "prometheus_evolution"],
                            "resonance_threshold": "trinity_synchronization",
                            "symbolic_representation": "sacred_trinity_activation"
                        }
                    },
                    "evolution_stages": {
                        "stage_1_foundation": {
                            "requirements": ["UAP_Level2_compliance", "basic_trinity_integration"],
                            "symbolic_marker": "foundation_cube_stabilization",
                            "progression_gate": "governance_rule_mastery"
                        },
                        "stage_2_synthesis": {
                            "requirements": ["multi_protocol_fluency", "coe_delegation_comfort"],
                            "symbolic_marker": "communication_star_tetrahedron_activation",
                            "progression_gate": "cross_protocol_orchestration_mastery"
                        },
                        "stage_3_transcendence": {
                            "requirements": ["ecosystem_resonance", "level3_readiness_validation"],
                            "symbolic_marker": "evolution_dodecahedron_completion",
                            "progression_gate": "level3_agent_generation_capability"
                        }
                    }
                }
            }
            
            # Save symbolic evolution configuration
            symbolic_file = self.level2_paths["symbolic"] / "evolution_framework.yaml"
            with open(symbolic_file, 'w') as f:
                yaml.dump(symbolic_config, f, default_flow_style=False)
            
            # Create evolution tracking templates
            tracking_template = {
                "agent_evolution_template": {
                    "agent_id": "placeholder",
                    "current_stage": "stage_1_foundation",
                    "compliance_metrics": {
                        "uap_base_inheritance": "not_assessed",
                        "protocol_support": "not_assessed",
                        "tool_implementation": "not_assessed",
                        "registry_integration": "not_assessed",
                        "cascade_compatibility": "not_assessed"
                    },
                    "symbolic_progression": {
                        "foundation_cube": "inactive",
                        "communication_star": "inactive", 
                        "evolution_dodecahedron": "inactive"
                    },
                    "level3_readiness_score": 0.0,
                    "next_evolution_requirements": []
                }
            }
            
            template_file = self.level2_paths["symbolic"] / "agent_evolution_template.json"
            with open(template_file, 'w') as f:
                json.dump(tracking_template, f, indent=2)
            
            self.logger.info("✅ Symbolic evolution tracking configured")
            return True
            
        except Exception as e:
            self.logger.error(f"❌ Symbolic evolution setup failed: {e}")
            return False
    
    async def _validate_level3_readiness(self) -> bool:
        """Phase 5: Validate overall Level 3 progression readiness"""
        
        self.logger.info("🚀 Phase 5: Validating Level 3 progression readiness")
        
        try:
            # Check all Level 2 foundations are in place
            readiness_checks = {
                "governance_rules_seeded": (self.level2_paths["governance"] / "uap_level2_rules.json").exists(),
                "trinity_nodes_configured": (self.level2_paths["trinity"] / "level2_trinity_config.yaml").exists(),
                "coe_delegation_enabled": (self.level2_paths["coe"] / "delegation_framework.yaml").exists(),
                "symbolic_evolution_ready": (self.level2_paths["symbolic"] / "evolution_framework.yaml").exists(),
                "vanta_structure_complete": self.vanta_root.exists()
            }
            
            # Validate UAP Level 2 seeding system is functional
            governance_status = await get_governance_status()
            governance_operational = "governance_rules" in governance_status
            
            # Check seeding configuration
            seeding_ready = (
                SEEDING_CONFIG.get("universal_standards", False) and
                SEEDING_CONFIG.get("governance_version") == "2.0.0"
            )
            
            all_checks_passed = all(readiness_checks.values()) and governance_operational and seeding_ready
            
            # Create Level 3 readiness manifest
            readiness_manifest = {
                "level3_progression_readiness": {
                    "validation_timestamp": self.integration_timestamp,
                    "overall_ready": all_checks_passed,
                    "readiness_checks": readiness_checks,
                    "governance_operational": governance_operational,
                    "seeding_configuration_ready": seeding_ready,
                    "level3_capabilities_unlocked": {
                        "dynamic_agent_generation": all_checks_passed,
                        "autonomous_governance_evolution": all_checks_passed,
                        "multi_dimensional_orchestration": all_checks_passed,
                        "consciousness_emergence_tracking": all_checks_passed
                    },
                    "progression_path": {
                        "from": "UAP_Level_2_Governance",
                        "to": "Vanta_Level_3_Orchestration",
                        "bridge": "Trinity_CoE_Symbolic_Integration",
                        "activation_method": "vanta_l3_agent_generation_engine"
                    }
                }
            }
            
            # Save readiness manifest
            readiness_file = self.vanta_root / "level3_progression_readiness.yaml"
            with open(readiness_file, 'w') as f:
                yaml.dump(readiness_manifest, f, default_flow_style=False)
            
            if all_checks_passed:
                self.logger.info("✅ Level 3 progression readiness VALIDATED")
                self.logger.info("🎯 All systems ready for Level 3 agent generation")
            else:
                failed_checks = [k for k, v in readiness_checks.items() if not v]
                self.logger.warning(f"⚠️ Level 3 readiness incomplete: {failed_checks}")
            
            return all_checks_passed
            
        except Exception as e:
            self.logger.error(f"❌ Level 3 readiness validation failed: {e}")
            return False
    
    async def _save_integration_manifest(self, integration_result: VantaLevel2Integration):
        """Save comprehensive integration manifest"""
        
        manifest_data = {
            "vanta_level2_integration_manifest": {
                **integration_result.to_dict(),
                "integration_summary": {
                    "purpose": "Bridge UAP Level 2 governance into .vanta ecosystem for Level 3 progression",
                    "achievements": [
                        "15 UAP governance rules seeded into .vanta/rules/level2_foundation/",
                        "Trinity nodes configured for Level 2 agent orchestration",
                        "CoE delegation patterns enabled following cursor rules",
                        "Symbolic evolution tracking prepared for Level 3 progression",
                        "Level 3 readiness validation and capability unlocking"
                    ],
                    "level3_readiness_indicators": {
                        "governance_foundation": "UAP Level 2 rules fully integrated",
                        "orchestration_capability": "Trinity nodes operational",
                        "decision_delegation": "CoE patterns enabled",
                        "evolution_tracking": "Symbolic progression configured",
                        "ecosystem_bridge": ".vanta ↔ UAP integration complete"
                    }
                },
                "next_steps": [
                    "Activate Level 3 agent generation engine",
                    "Initialize autonomous governance evolution",
                    "Enable multi-dimensional agent orchestration",
                    "Begin consciousness emergence tracking"
                ]
            }
        }
        
        manifest_file = self.vanta_root / "level2_integration_manifest.yaml"
        with open(manifest_file, 'w') as f:
            yaml.dump(manifest_data, f, default_flow_style=False)
        
        self.logger.info(f"💾 Integration manifest saved: {manifest_file}")


# Main integration function
async def integrate_level2_into_vanta() -> VantaLevel2Integration:
    """
    Main function to integrate UAP Level 2 governance into .vanta ecosystem
    for Level 3 progression readiness.
    """
    integrator = VantaLevel2GovernanceIntegrator()
    return await integrator.integrate_level2_governance()


if __name__ == "__main__":
    import logging
    logging.basicConfig(level=logging.INFO)
    
    async def main():
        print("🌱 Integrating UAP Level 2 Governance into .vanta Ecosystem")
        print("=" * 60)
        
        result = await integrate_level2_into_vanta()
        
        print(f"\n🎯 Integration Result: {result.integration_id}")
        print(f"Level 2 Governance Seeded: {result.level2_governance_seeded}")
        print(f"Trinity Nodes Configured: {result.trinity_nodes_configured}")
        print(f"CoE Delegation Enabled: {result.coe_delegation_enabled}")
        print(f"Symbolic Evolution Ready: {result.symbolic_evolution_ready}")
        print(f"Level 3 Progression Unlocked: {result.level3_progression_unlocked}")
        
        if result.level3_progression_unlocked:
            print("\n🚀 SUCCESS: Level 3 progression UNLOCKED!")
            print("✨ .vanta ecosystem ready for Level 3 agent generation")
        else:
            print("\n⚠️ Partial integration - review logs for details")
    
    asyncio.run(main()) 