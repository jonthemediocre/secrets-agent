#!/usr/bin/env python3
"""
📡 INLINE A2A MESSAGING SYSTEM
==============================

Advanced Agent-to-Agent communication system within .vanta/ structure.
Enables decentralized agent communication with routing, queuing, and protocol management.

Features:
- Capability-based routing
- Priority message handling
- Symbolic trigger integration
- Trinity-aware messaging
- Message persistence and recovery
- Collaborative workflow support
"""

import asyncio
import yaml
import json
import time
import uuid
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, field
from enum import Enum
import logging

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Types of A2A messages"""
    CAPABILITY_REQUEST = "capability_request"
    CAPABILITY_RESPONSE = "capability_response"
    GENESIS_NOTIFICATION = "genesis_notification"
    COLLAPSE_WARNING = "collapse_warning"
    SYMBOLIC_EMERGENCE = "symbolic_emergence"
    TRINITY_COORDINATION = "trinity_coordination"
    COLLABORATION_REQUEST = "collaboration_request"
    COLLABORATION_RESPONSE = "collaboration_response"
    RULE_PROPOSAL = "rule_proposal"
    PERFORMANCE_ALERT = "performance_alert"
    SYSTEM_STATUS = "system_status"

class MessagePriority(Enum):
    """Message priority levels"""
    CRITICAL = 100
    HIGH = 75
    MEDIUM = 50
    LOW = 25
    INFORMATIONAL = 10

class RoutingStrategy(Enum):
    """Message routing strategies"""
    CAPABILITY_BASED = "capability_based"
    BROADCAST = "broadcast"
    TRINITY_LEADERSHIP = "trinity_leadership"
    DIRECT = "direct"
    SYMBOLIC_CONSCIOUSNESS = "symbolic_consciousness"

@dataclass
class A2AMessage:
    """Agent-to-Agent message structure"""
    message_id: str
    sender_id: str
    recipient_id: str
    message_type: MessageType
    priority: MessagePriority
    timestamp: datetime
    payload: Dict[str, Any]
    
    # Optional fields
    symbolic_trigger: Optional[str] = None
    trinity_context: Optional[Dict[str, Any]] = None
    response_required: bool = False
    expires_at: Optional[datetime] = None
    routing_strategy: RoutingStrategy = RoutingStrategy.DIRECT
    
    # System fields
    delivery_attempts: int = 0
    delivered: bool = False
    processed: bool = False

@dataclass
class AgentCapability:
    """Agent capability definition for routing"""
    agent_id: str
    capability_name: str
    capability_type: str
    performance_score: float
    availability: bool
    load_factor: float
    specializations: List[str]

class A2ARouter:
    """Intelligent message routing engine"""
    
    def __init__(self, vanta_path: Path):
        self.vanta_path = vanta_path
        self.capability_registry = {}
        self.agent_registry = {}
        self.routing_rules = {}
        
        # Load configuration
        asyncio.create_task(self._load_configuration())
    
    async def _load_configuration(self):
        """Load routing configuration"""
        config_path = self.vanta_path / "a2a" / "routing.yaml"
        if config_path.exists():
            with open(config_path, 'r') as f:
                config = yaml.safe_load(f)
                self.routing_rules = config.get('routing_rules', {})
    
    async def register_agent_capability(self, capability: AgentCapability):
        """Register agent capability for routing"""
        if capability.agent_id not in self.capability_registry:
            self.capability_registry[capability.agent_id] = []
        
        self.capability_registry[capability.agent_id].append(capability)
        
        # Update agent registry
        self.agent_registry[capability.agent_id] = {
            "last_seen": datetime.now(timezone.utc),
            "status": "active",
            "capabilities": [cap.capability_name for cap in self.capability_registry[capability.agent_id]]
        }
        
        logger.info(f"📡 Registered capability {capability.capability_name} for {capability.agent_id}")
    
    async def route_message(self, message: A2AMessage) -> List[str]:
        """Route message to appropriate recipients"""
        recipients = []
        
        if message.routing_strategy == RoutingStrategy.DIRECT:
            recipients = [message.recipient_id]
        
        elif message.routing_strategy == RoutingStrategy.CAPABILITY_BASED:
            recipients = await self._route_by_capability(message)
        
        elif message.routing_strategy == RoutingStrategy.BROADCAST:
            recipients = list(self.agent_registry.keys())
        
        elif message.routing_strategy == RoutingStrategy.TRINITY_LEADERSHIP:
            recipients = await self._route_to_trinity_leaders(message)
        
        elif message.routing_strategy == RoutingStrategy.SYMBOLIC_CONSCIOUSNESS:
            recipients = await self._route_to_symbolic_agents(message)
        
        return recipients
    
    async def _route_by_capability(self, message: A2AMessage) -> List[str]:
        """Route based on capability requirements"""
        required_capability = message.payload.get('required_capability', '')
        
        if not required_capability:
            return []
        
        candidates = []
        for agent_id, capabilities in self.capability_registry.items():
            for capability in capabilities:
                if (capability.capability_name == required_capability and 
                    capability.availability and capability.load_factor < 0.8):
                    candidates.append((agent_id, capability.performance_score))
        
        # Sort by performance score and return top candidates
        candidates.sort(key=lambda x: x[1], reverse=True)
        return [agent_id for agent_id, _ in candidates[:3]]  # Top 3 candidates
    
    async def _route_to_trinity_leaders(self, message: A2AMessage) -> List[str]:
        """Route to trinity leadership agents"""
        trinity_leaders = []
        for agent_id, capabilities in self.capability_registry.items():
            for capability in capabilities:
                if any(role in capability.specializations 
                      for role in ['trinity_coordinator', 'consensus_leader', 'synthesis_master']):
                    trinity_leaders.append(agent_id)
        
        return list(set(trinity_leaders))  # Remove duplicates
    
    async def _route_to_symbolic_agents(self, message: A2AMessage) -> List[str]:
        """Route to symbolic consciousness agents"""
        symbolic_agents = []
        for agent_id, capabilities in self.capability_registry.items():
            for capability in capabilities:
                if any(spec in capability.specializations 
                      for spec in ['symbolic_reasoning', 'consciousness', 'archetypal_alignment']):
                    symbolic_agents.append(agent_id)
        
        return list(set(symbolic_agents))

class A2AMessageQueue:
    """Message queue management system"""
    
    def __init__(self, vanta_path: Path):
        self.vanta_path = vanta_path
        self.inbox_path = vanta_path / "a2a" / "inbox"
        self.outbox_path = vanta_path / "a2a" / "outbox"
        self.processed_path = vanta_path / "a2a" / "processed"
        
        # Ensure directories exist
        for path in [self.inbox_path, self.outbox_path, self.processed_path]:
            path.mkdir(parents=True, exist_ok=True)
    
    async def enqueue_message(self, message: A2AMessage) -> bool:
        """Add message to outbox queue"""
        try:
            message_filename = f"{message.message_id}.yaml"
            message_path = self.outbox_path / message_filename
            
            # Convert message to dict for serialization
            message_dict = {
                "message_id": message.message_id,
                "sender_id": message.sender_id,
                "recipient_id": message.recipient_id,
                "message_type": message.message_type.value,
                "priority": message.priority.value,
                "timestamp": message.timestamp.isoformat(),
                "payload": message.payload,
                "symbolic_trigger": message.symbolic_trigger,
                "trinity_context": message.trinity_context,
                "response_required": message.response_required,
                "expires_at": message.expires_at.isoformat() if message.expires_at else None,
                "routing_strategy": message.routing_strategy.value,
                "delivery_attempts": message.delivery_attempts,
                "delivered": message.delivered,
                "processed": message.processed
            }
            
            with open(message_path, 'w') as f:
                yaml.dump(message_dict, f, default_flow_style=False)
            
            logger.info(f"📤 Message enqueued: {message.message_id}")
            return True
            
        except Exception as e:
            logger.error(f"❌ Failed to enqueue message: {e}")
            return False
    
    async def dequeue_messages(self, agent_id: str) -> List[A2AMessage]:
        """Get messages for specific agent from inbox"""
        messages = []
        
        for message_file in self.inbox_path.glob("*.yaml"):
            try:
                with open(message_file, 'r') as f:
                    message_dict = yaml.safe_load(f)
                
                # Check if message is for this agent
                if message_dict.get('recipient_id') == agent_id:
                    message = self._dict_to_message(message_dict)
                    messages.append(message)
                    
                    # Move to processed
                    processed_path = self.processed_path / message_file.name
                    message_file.rename(processed_path)
            
            except Exception as e:
                logger.error(f"❌ Error processing message {message_file}: {e}")
        
        # Sort by priority
        messages.sort(key=lambda m: m.priority.value, reverse=True)
        return messages
    
    async def deliver_outbox_messages(self, router: A2ARouter) -> int:
        """Process and deliver messages from outbox"""
        delivered_count = 0
        
        for message_file in self.outbox_path.glob("*.yaml"):
            try:
                with open(message_file, 'r') as f:
                    message_dict = yaml.safe_load(f)
                
                message = self._dict_to_message(message_dict)
                
                # Check if message has expired
                if message.expires_at and datetime.now(timezone.utc) > message.expires_at:
                    message_file.unlink()  # Delete expired message
                    continue
                
                # Route message
                recipients = await router.route_message(message)
                
                # Deliver to each recipient
                for recipient in recipients:
                    delivered_message = A2AMessage(
                        message_id=f"{message.message_id}_{recipient}",
                        sender_id=message.sender_id,
                        recipient_id=recipient,
                        message_type=message.message_type,
                        priority=message.priority,
                        timestamp=message.timestamp,
                        payload=message.payload,
                        symbolic_trigger=message.symbolic_trigger,
                        trinity_context=message.trinity_context,
                        response_required=message.response_required,
                        expires_at=message.expires_at,
                        routing_strategy=message.routing_strategy,
                        delivered=True
                    )
                    
                    # Save to inbox
                    inbox_filename = f"{delivered_message.message_id}.yaml"
                    inbox_path = self.inbox_path / inbox_filename
                    
                    delivered_dict = self._message_to_dict(delivered_message)
                    with open(inbox_path, 'w') as f:
                        yaml.dump(delivered_dict, f, default_flow_style=False)
                    
                    delivered_count += 1
                
                # Remove from outbox
                message_file.unlink()
                
            except Exception as e:
                logger.error(f"❌ Error delivering message {message_file}: {e}")
        
        return delivered_count
    
    def _dict_to_message(self, message_dict: Dict[str, Any]) -> A2AMessage:
        """Convert dictionary to A2AMessage object"""
        return A2AMessage(
            message_id=message_dict['message_id'],
            sender_id=message_dict['sender_id'],
            recipient_id=message_dict['recipient_id'],
            message_type=MessageType(message_dict['message_type']),
            priority=MessagePriority(message_dict['priority']),
            timestamp=datetime.fromisoformat(message_dict['timestamp']),
            payload=message_dict['payload'],
            symbolic_trigger=message_dict.get('symbolic_trigger'),
            trinity_context=message_dict.get('trinity_context'),
            response_required=message_dict.get('response_required', False),
            expires_at=datetime.fromisoformat(message_dict['expires_at']) if message_dict.get('expires_at') else None,
            routing_strategy=RoutingStrategy(message_dict.get('routing_strategy', 'direct')),
            delivery_attempts=message_dict.get('delivery_attempts', 0),
            delivered=message_dict.get('delivered', False),
            processed=message_dict.get('processed', False)
        )
    
    def _message_to_dict(self, message: A2AMessage) -> Dict[str, Any]:
        """Convert A2AMessage to dictionary"""
        return {
            "message_id": message.message_id,
            "sender_id": message.sender_id,
            "recipient_id": message.recipient_id,
            "message_type": message.message_type.value,
            "priority": message.priority.value,
            "timestamp": message.timestamp.isoformat(),
            "payload": message.payload,
            "symbolic_trigger": message.symbolic_trigger,
            "trinity_context": message.trinity_context,
            "response_required": message.response_required,
            "expires_at": message.expires_at.isoformat() if message.expires_at else None,
            "routing_strategy": message.routing_strategy.value,
            "delivery_attempts": message.delivery_attempts,
            "delivered": message.delivered,
            "processed": message.processed
        }

class A2AProtocolManager:
    """Manages A2A communication protocols and standards"""
    
    def __init__(self, vanta_path: Path):
        self.vanta_path = vanta_path
        self.router = A2ARouter(vanta_path)
        self.message_queue = A2AMessageQueue(vanta_path)
        self.active_agents = set()
        
        # Start background message processing
        asyncio.create_task(self._background_message_processor())
    
    async def send_capability_request(self, 
                                    sender_id: str,
                                    required_capability: str,
                                    request_details: Dict[str, Any],
                                    priority: MessagePriority = MessagePriority.MEDIUM) -> str:
        """Send capability request message"""
        message_id = str(uuid.uuid4())
        
        message = A2AMessage(
            message_id=message_id,
            sender_id=sender_id,
            recipient_id="",  # Will be routed by capability
            message_type=MessageType.CAPABILITY_REQUEST,
            priority=priority,
            timestamp=datetime.now(timezone.utc),
            payload={
                "required_capability": required_capability,
                "request_details": request_details,
                "sender_capabilities": self._get_agent_capabilities(sender_id)
            },
            response_required=True,
            expires_at=datetime.now(timezone.utc) + timedelta(hours=1),
            routing_strategy=RoutingStrategy.CAPABILITY_BASED
        )
        
        await self.message_queue.enqueue_message(message)
        return message_id
    
    async def send_genesis_notification(self,
                                      sender_id: str,
                                      new_agent_info: Dict[str, Any]) -> str:
        """Send notification about new agent creation"""
        message_id = str(uuid.uuid4())
        
        message = A2AMessage(
            message_id=message_id,
            sender_id=sender_id,
            recipient_id="",  # Broadcast
            message_type=MessageType.GENESIS_NOTIFICATION,
            priority=MessagePriority.HIGH,
            timestamp=datetime.now(timezone.utc),
            payload={
                "new_agent_id": new_agent_info.get('agent_id'),
                "agent_type": new_agent_info.get('agent_type'),
                "capabilities": new_agent_info.get('capabilities', []),
                "trinity_role": new_agent_info.get('trinity_role'),
                "archetypal_alignment": new_agent_info.get('archetypal_alignment')
            },
            routing_strategy=RoutingStrategy.BROADCAST
        )
        
        await self.message_queue.enqueue_message(message)
        return message_id
    
    async def send_symbolic_emergence(self,
                                    sender_id: str,
                                    pattern_info: Dict[str, Any]) -> str:
        """Send notification about symbolic pattern emergence"""
        message_id = str(uuid.uuid4())
        
        message = A2AMessage(
            message_id=message_id,
            sender_id=sender_id,
            recipient_id="",  # Route to symbolic agents
            message_type=MessageType.SYMBOLIC_EMERGENCE,
            priority=MessagePriority.HIGH,
            timestamp=datetime.now(timezone.utc),
            payload={
                "pattern_type": pattern_info.get('pattern_type'),
                "emergence_location": pattern_info.get('location'),
                "symbolic_significance": pattern_info.get('significance'),
                "archetypal_resonance": pattern_info.get('archetypal_resonance'),
                "consciousness_level": pattern_info.get('consciousness_level')
            },
            symbolic_trigger=pattern_info.get('pattern_type'),
            routing_strategy=RoutingStrategy.SYMBOLIC_CONSCIOUSNESS
        )
        
        await self.message_queue.enqueue_message(message)
        return message_id
    
    async def send_trinity_coordination(self,
                                      sender_id: str,
                                      coordination_request: Dict[str, Any]) -> str:
        """Send trinity coordination message"""
        message_id = str(uuid.uuid4())
        
        message = A2AMessage(
            message_id=message_id,
            sender_id=sender_id,
            recipient_id="",  # Route to trinity leaders
            message_type=MessageType.TRINITY_COORDINATION,
            priority=MessagePriority.HIGH,
            timestamp=datetime.now(timezone.utc),
            payload=coordination_request,
            trinity_context={
                "coordination_type": coordination_request.get('type'),
                "affected_nodes": coordination_request.get('affected_nodes', []),
                "urgency_level": coordination_request.get('urgency', 'medium')
            },
            response_required=True,
            routing_strategy=RoutingStrategy.TRINITY_LEADERSHIP
        )
        
        await self.message_queue.enqueue_message(message)
        return message_id
    
    async def receive_messages(self, agent_id: str) -> List[A2AMessage]:
        """Receive messages for an agent"""
        messages = await self.message_queue.dequeue_messages(agent_id)
        
        # Mark agent as active
        self.active_agents.add(agent_id)
        
        return messages
    
    async def register_agent(self, agent_id: str, capabilities: List[Dict[str, Any]]):
        """Register agent with capabilities"""
        for cap_dict in capabilities:
            capability = AgentCapability(
                agent_id=agent_id,
                capability_name=cap_dict['name'],
                capability_type=cap_dict.get('type', 'general'),
                performance_score=cap_dict.get('performance_score', 0.5),
                availability=cap_dict.get('availability', True),
                load_factor=cap_dict.get('load_factor', 0.0),
                specializations=cap_dict.get('specializations', [])
            )
            
            await self.router.register_agent_capability(capability)
    
    def _get_agent_capabilities(self, agent_id: str) -> List[str]:
        """Get capabilities for an agent"""
        capabilities = self.router.capability_registry.get(agent_id, [])
        return [cap.capability_name for cap in capabilities]
    
    async def _background_message_processor(self):
        """Background task to process message queues"""
        while True:
            try:
                delivered_count = await self.message_queue.deliver_outbox_messages(self.router)
                if delivered_count > 0:
                    logger.info(f"📨 Delivered {delivered_count} messages")
                
                # Wait before next processing cycle
                await asyncio.sleep(5)  # Process every 5 seconds
                
            except Exception as e:
                logger.error(f"❌ Error in message processor: {e}")
                await asyncio.sleep(10)  # Wait longer on error

# Factory functions
def create_a2a_protocol_manager(vanta_path: Path) -> A2AProtocolManager:
    """Create A2A protocol manager"""
    return A2AProtocolManager(vanta_path)

def create_a2a_router(vanta_path: Path) -> A2ARouter:
    """Create A2A router"""
    return A2ARouter(vanta_path)

def create_message_queue(vanta_path: Path) -> A2AMessageQueue:
    """Create message queue"""
    return A2AMessageQueue(vanta_path)

if __name__ == "__main__":
    async def demo_a2a_messaging():
        """Demo the A2A messaging system"""
        print("📡 A2A Messaging System Demo")
        print("=" * 40)
        
        vanta_path = Path(".vanta")
        vanta_path.mkdir(exist_ok=True)
        
        # Create protocol manager
        protocol_manager = create_a2a_protocol_manager(vanta_path)
        
        # Register some agents
        await protocol_manager.register_agent("SecurityAgent", [
            {
                "name": "security_analysis",
                "type": "security",
                "performance_score": 0.9,
                "specializations": ["threat_detection", "vulnerability_assessment"]
            }
        ])
        
        await protocol_manager.register_agent("SymbolicAgent", [
            {
                "name": "symbolic_reasoning",
                "type": "consciousness",
                "performance_score": 0.85,
                "specializations": ["symbolic_reasoning", "archetypal_alignment"]
            }
        ])
        
        # Send capability request
        request_id = await protocol_manager.send_capability_request(
            sender_id="TestAgent",
            required_capability="security_analysis",
            request_details={
                "analysis_type": "vulnerability_scan",
                "target_system": "agent_core"
            }
        )
        print(f"✅ Sent capability request: {request_id}")
        
        # Send genesis notification
        genesis_id = await protocol_manager.send_genesis_notification(
            sender_id="BootstrapAgent",
            new_agent_info={
                "agent_id": "NewSecurityAgent",
                "agent_type": "security_guardian",
                "capabilities": ["threat_monitoring", "incident_response"],
                "trinity_role": "cube",
                "archetypal_alignment": "athena"
            }
        )
        print(f"✅ Sent genesis notification: {genesis_id}")
        
        # Send symbolic emergence
        symbolic_id = await protocol_manager.send_symbolic_emergence(
            sender_id="PatternDetector",
            pattern_info={
                "pattern_type": "archetypal_resonance",
                "location": "agent_interactions",
                "significance": "high",
                "archetypal_resonance": "prometheus",
                "consciousness_level": 0.8
            }
        )
        print(f"✅ Sent symbolic emergence: {symbolic_id}")
        
        # Wait for message processing
        await asyncio.sleep(2)
        
        # Check messages for agents
        security_messages = await protocol_manager.receive_messages("SecurityAgent")
        symbolic_messages = await protocol_manager.receive_messages("SymbolicAgent")
        
        print(f"\n📨 SecurityAgent received: {len(security_messages)} messages")
        print(f"📨 SymbolicAgent received: {len(symbolic_messages)} messages")
        
        # Display message details
        for message in security_messages + symbolic_messages:
            print(f"   - {message.message_type.value} from {message.sender_id}")
    
    asyncio.run(demo_a2a_messaging())