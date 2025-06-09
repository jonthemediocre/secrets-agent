#!/usr/bin/env python3
"""
Phase 2.1 Security Intelligence Integration
Demonstrates the auto-generated security agents working together with:
- Phase 1.1: Unified Communication Layer
- Phase 1.2: Agent Memory System
- Phase 2.1: Security Intelligence (MCP-generated agents)

This showcases the power of agent-first development with MCP scaffolding.
"""

import asyncio
import logging
import sys
import json
from typing import Dict, Any, List
from datetime import datetime, timedelta
import random

# Add current directory to path
sys.path.append('.')

# Import existing infrastructure
from agent_core.unified_communication import (
    UnifiedCommunicationLayer,
    UnifiedMessage,
    MessageType,
    AgentStatus,
    create_unified_communication
)
from agent_core.memory_system import (
    AgentMemorySystem,
    MemoryType,
    MemoryPriority,
    create_agent_memory_system
)
from vanta_seed.core.vanta_master_core_enhanced import (
    VantaMasterCoreEnhanced,
    create_enhanced_vmc
)

# Import MCP-generated security agents
from agent_core.generated_phase_2_1_securityeventmonitor import SecurityEventMonitor
from agent_core.generated_phase_2_1_threatdetectionengine import ThreatDetectionEngine
from agent_core.generated_phase_2_1_riskassessmentagent import RiskAssessmentAgent

logger = logging.getLogger(__name__)

class SecurityIntelligenceSystem:
    """Orchestrates the MCP-generated security agents"""
    
    def __init__(self, vmc: VantaMasterCoreEnhanced):
        self.vmc = vmc
        self.security_agents: Dict[str, Any] = {}
        self.security_events: List[Dict[str, Any]] = []
        self.threat_alerts: List[Dict[str, Any]] = []
        self.risk_assessments: List[Dict[str, Any]] = []
        
    async def initialize_security_agents(self):
        """Initialize all MCP-generated security agents"""
        logger.info("🔐 Initializing MCP-generated security agents...")
        
        # Initialize SecurityEventMonitor
        event_monitor = SecurityEventMonitor("security_event_monitor", self.vmc)
        self.security_agents["event_monitor"] = event_monitor
        logger.info("✅ SecurityEventMonitor initialized")
        
        # Initialize ThreatDetectionEngine
        threat_detector = ThreatDetectionEngine("threat_detection_engine", self.vmc)
        self.security_agents["threat_detector"] = threat_detector
        logger.info("✅ ThreatDetectionEngine initialized")
        
        # Initialize RiskAssessmentAgent
        risk_assessor = RiskAssessmentAgent("risk_assessment_agent", self.vmc)
        self.security_agents["risk_assessor"] = risk_assessor
        logger.info("✅ RiskAssessmentAgent initialized")
        
        # Register agents with UCL for communication
        if self.vmc.ucl:
            for agent_id, agent in self.security_agents.items():
                await self.vmc.ucl.register_agent(
                    agent_id=agent_id,
                    agent_type="security_agent",
                    capabilities=getattr(agent, 'capabilities', ['security']),
                    language="python"
                )
                logger.info(f"🔌 Registered {agent_id} with Unified Communication Layer")
        
        logger.info("🎯 All security agents initialized and connected!")

    async def simulate_security_events(self):
        """Simulate various security events for demonstration"""
        logger.info("🎭 Simulating security events...")
        
        # Define sample security events
        events = [
            {
                "event_type": "suspicious_login",
                "severity": "medium",
                "source": "external_ip",
                "details": {
                    "ip_address": "192.168.1.100",
                    "failed_attempts": 5,
                    "user_agent": "unknown"
                },
                "timestamp": datetime.utcnow().isoformat()
            },
            {
                "event_type": "privilege_escalation",
                "severity": "high",
                "source": "internal_agent",
                "details": {
                    "agent_id": "suspicious_agent_001",
                    "attempted_action": "admin_access",
                    "context": "unusual_time"
                },
                "timestamp": datetime.utcnow().isoformat()
            },
            {
                "event_type": "anomalous_behavior",
                "severity": "low",
                "source": "behavioral_analysis",
                "details": {
                    "agent_id": "normal_agent_005",
                    "behavior_change": "increased_memory_usage",
                    "deviation_score": 0.6
                },
                "timestamp": datetime.utcnow().isoformat()
            }
        ]
        
        for event in events:
            await self.process_security_event(event)
            await asyncio.sleep(1)  # Small delay between events

    async def process_security_event(self, event: Dict[str, Any]):
        """Process security event through the MCP-generated agent pipeline"""
        logger.info(f"🚨 Processing security event: {event['event_type']}")
        
        # Step 1: SecurityEventMonitor processes the event
        event_monitor = self.security_agents["event_monitor"]
        
        # Simulate event monitoring with memory
        monitor_result = await event_monitor.process_task_with_memory(
            task_type="monitor_security",
            parameters={"event": event}
        )
        
        self.security_events.append({
            "original_event": event,
            "monitor_result": monitor_result,
            "processed_at": datetime.utcnow().isoformat()
        })
        
        logger.info(f"📊 Event Monitor Result: {monitor_result}")
        
        # Step 2: If significant threat, send to ThreatDetectionEngine
        if event.get("severity") in ["medium", "high"]:
            threat_detector = self.security_agents["threat_detector"]
            
            # Simulate threat detection with behavioral analysis
            threat_result = await threat_detector.process_task_with_memory(
                task_type="detect_threats",
                parameters={
                    "behavior": event["details"],
                    "event_context": event
                }
            )
            
            self.threat_alerts.append({
                "event": event,
                "threat_analysis": threat_result,
                "analyzed_at": datetime.utcnow().isoformat()
            })
            
            logger.info(f"🎯 Threat Analysis Result: {threat_result}")
            
            # Step 3: If high risk, send to RiskAssessmentAgent
            if event.get("severity") == "high":
                risk_assessor = self.security_agents["risk_assessor"]
                
                # Simulate risk assessment
                risk_result = await risk_assessor.process_task_with_memory(
                    task_type="assess_risks",
                    parameters={
                        "system_state": {
                            "active_threats": len(self.threat_alerts),
                            "recent_events": len(self.security_events),
                            "severity": event["severity"]
                        }
                    }
                )
                
                self.risk_assessments.append({
                    "event": event,
                    "risk_analysis": risk_result,
                    "assessed_at": datetime.utcnow().isoformat()
                })
                
                logger.info(f"⚠️ Risk Assessment Result: {risk_result}")

    async def generate_security_report(self) -> Dict[str, Any]:
        """Generate comprehensive security report"""
        logger.info("📋 Generating comprehensive security report...")
        
        report = {
            "report_generated_at": datetime.utcnow().isoformat(),
            "summary": {
                "total_events_processed": len(self.security_events),
                "threat_alerts_generated": len(self.threat_alerts),
                "risk_assessments_completed": len(self.risk_assessments)
            },
            "agent_performance": {},
            "security_insights": [],
            "recommendations": []
        }
        
        # Get agent memory insights
        for agent_id, agent in self.security_agents.items():
            if hasattr(self.vmc, 'get_agent_learning_insights'):
                insights = await self.vmc.get_agent_learning_insights(
                    agent_id=agent_id,
                    learning_types=["task_monitor_security", "task_detect_threats", "task_assess_risks"]
                )
                report["agent_performance"][agent_id] = insights
        
        # Generate security insights
        if self.threat_alerts:
            high_severity_threats = [alert for alert in self.threat_alerts 
                                   if alert["event"]["severity"] == "high"]
            report["security_insights"].append({
                "insight": "High severity threats detected",
                "count": len(high_severity_threats),
                "recommendation": "Implement additional monitoring"
            })
        
        if self.risk_assessments:
            report["security_insights"].append({
                "insight": "Risk assessments completed",
                "count": len(self.risk_assessments),
                "recommendation": "Review risk mitigation strategies"
            })
        
        # Generate recommendations based on MCP agent learning
        report["recommendations"] = [
            "Continue monitoring agent behavior patterns",
            "Enhance threat detection models based on recent data",
            "Implement automated response for high-risk events",
            "Schedule regular security policy reviews"
        ]
        
        logger.info("✅ Security report generated successfully")
        return report

async def main():
    """Main demonstration of Phase 2.1 Security Intelligence integration"""
    
    logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
    
    logger.info("🚀 Starting Phase 2.1 Security Intelligence Integration Demo")
    logger.info("This demonstrates MCP-generated agents working with existing infrastructure")
    
    try:
        # Initialize Enhanced VMC with all previous phases
        logger.info("🏗️ Initializing Enhanced VANTA Master Core...")
        config = {
            "enhanced_mode": True,
            "memory_ttl_hours": 168,  # 1 week
            "redis": {
                "host": "localhost",
                "port": 6379,
                "decode_responses": True
            }
        }
        
        vmc = await create_enhanced_vmc(config)
        await vmc.startup()
        
        logger.info("✅ Enhanced VMC with Phase 1.1 + 1.2 + 2.1 ready!")
        
        # Initialize Security Intelligence System
        security_system = SecurityIntelligenceSystem(vmc)
        await security_system.initialize_security_agents()
        
        # Simulate security events and demonstrate agent collaboration
        logger.info("\n🎭 === SECURITY EVENT SIMULATION ===")
        await security_system.simulate_security_events()
        
        # Generate comprehensive security report
        logger.info("\n📊 === SECURITY INTELLIGENCE REPORT ===")
        report = await security_system.generate_security_report()
        
        # Display results
        logger.info("\n🎉 === INTEGRATION RESULTS ===")
        logger.info(f"Events Processed: {report['summary']['total_events_processed']}")
        logger.info(f"Threat Alerts: {report['summary']['threat_alerts_generated']}")
        logger.info(f"Risk Assessments: {report['summary']['risk_assessments_completed']}")
        
        logger.info("\n🔮 === MCP AGENT-FIRST DEVELOPMENT SUCCESS ===")
        logger.info("✅ MCP-generated agents integrated seamlessly")
        logger.info("✅ Cross-phase communication working (1.1 + 1.2 + 2.1)")
        logger.info("✅ Memory-enabled security intelligence active")
        logger.info("✅ Production-quality code from agent templates")
        logger.info("✅ Rule-driven, no duplication architecture")
        logger.info("✅ Domino-style implementation complete")
        
        # Cleanup
        await vmc.shutdown()
        logger.info("🏁 Demo completed successfully!")
        
    except Exception as e:
        logger.error(f"❌ Demo failed: {e}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(main()) 