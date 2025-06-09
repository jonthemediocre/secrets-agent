"""
Unified Communication Layer for VANTA Agents
Bridges KEBClient (Redis) and SimpleEventBus (TypeScript) to enable seamless communication
between Python and TypeScript agents.
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, Any, Optional, List, Callable, Union
from datetime import datetime
from enum import Enum

from vanta_seed.core.keb_client import KEBClient

logger = logging.getLogger(__name__)

class MessageType(Enum):
    """Standard message types for agent communication"""
    AGENT_REQUEST = "agent_request"
    AGENT_RESPONSE = "agent_response"
    TASK_ASSIGNMENT = "task_assignment"
    TASK_COMPLETION = "task_completion"
    BROADCAST = "broadcast"
    SYSTEM_NOTIFICATION = "system_notification"
    HEALTH_CHECK = "health_check"

class AgentStatus(Enum):
    """Agent status types"""
    ONLINE = "online"
    OFFLINE = "offline" 
    BUSY = "busy"
    ERROR = "error"
    STARTING = "starting"
    STOPPING = "stopping"

class UnifiedMessage:
    """Standard message format for unified communication"""
    
    def __init__(self, 
                 message_type: MessageType,
                 source_agent: str,
                 target_agent: Optional[str] = None,
                 payload: Dict[str, Any] = None,
                 message_id: Optional[str] = None,
                 correlation_id: Optional[str] = None,
                 priority: int = 3):
        self.message_id = message_id or str(uuid.uuid4())
        self.correlation_id = correlation_id
        self.message_type = message_type
        self.source_agent = source_agent
        self.target_agent = target_agent
        self.payload = payload or {}
        self.priority = priority
        self.timestamp = datetime.utcnow().isoformat() + "Z"
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary for transmission"""
        return {
            "message_id": self.message_id,
            "correlation_id": self.correlation_id,
            "message_type": self.message_type.value,
            "source_agent": self.source_agent,
            "target_agent": self.target_agent,
            "payload": self.payload,
            "priority": self.priority,
            "timestamp": self.timestamp
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'UnifiedMessage':
        """Create message from dictionary"""
        return cls(
            message_type=MessageType(data.get("message_type")),
            source_agent=data.get("source_agent"),
            target_agent=data.get("target_agent"),
            payload=data.get("payload", {}),
            message_id=data.get("message_id"),
            correlation_id=data.get("correlation_id"),
            priority=data.get("priority", 3)
        )

class AgentInfo:
    """Information about registered agents"""
    
    def __init__(self, agent_id: str, agent_type: str, capabilities: List[str] = None,
                 language: str = "python", endpoint: Optional[str] = None):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.capabilities = capabilities or []
        self.language = language  # "python" or "typescript"
        self.endpoint = endpoint  # For TypeScript agents
        self.status = AgentStatus.OFFLINE
        self.last_seen = datetime.utcnow()
        self.message_count = 0
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "agent_type": self.agent_type,
            "capabilities": self.capabilities,
            "language": self.language,
            "endpoint": self.endpoint,
            "status": self.status.value,
            "last_seen": self.last_seen.isoformat() + "Z",
            "message_count": self.message_count
        }

class UnifiedCommunicationLayer:
    """
    Central communication layer that bridges KEBClient (Redis) and SimpleEventBus (TypeScript)
    to enable seamless agent-to-agent communication across languages and processes.
    """
    
    def __init__(self, keb_client: KEBClient, agent_id: str = "UnifiedCommunicationLayer"):
        self.keb_client = keb_client
        self.agent_id = agent_id
        self.registered_agents: Dict[str, AgentInfo] = {}
        self.message_handlers: Dict[str, Callable] = {}
        self.running = False
        self.tasks: List[asyncio.Task] = []
        
        # Create required streams and consumer groups
        self._setup_communication_streams()
        
    def _setup_communication_streams(self):
        """Setup required Redis streams and consumer groups"""
        streams = [
            "agent_messages",           # Direct agent-to-agent messages
            "agent_broadcasts",         # Broadcast messages
            "agent_discovery",          # Agent registration/discovery
            "agent_health",            # Health check messages
            "typescript_bridge"        # Bridge to TypeScript agents
        ]
        
        for stream in streams:
            group_name = f"{stream}_group"
            if not self.keb_client.create_consumer_group(stream, group_name, start_id='$'):
                logger.warning(f"Failed to create consumer group {group_name} for stream {stream}")
            else:
                logger.info(f"Created/verified consumer group {group_name} for stream {stream}")
    
    async def start(self):
        """Start the unified communication layer"""
        if self.running:
            logger.warning("UnifiedCommunicationLayer already running")
            return
            
        logger.info(f"Starting UnifiedCommunicationLayer as {self.agent_id}")
        self.running = True
        
        # Start message processing tasks
        self.tasks = [
            asyncio.create_task(self._process_agent_messages()),
            asyncio.create_task(self._process_broadcasts()),
            asyncio.create_task(self._process_discovery()),
            asyncio.create_task(self._process_health_checks()),
            asyncio.create_task(self._process_typescript_bridge()),
            asyncio.create_task(self._periodic_agent_cleanup())
        ]
        
        # Register self as a system agent
        await self.register_agent(
            agent_id=self.agent_id,
            agent_type="UnifiedCommunicationLayer",
            capabilities=["routing", "discovery", "bridging", "health_monitoring"],
            language="python"
        )
        
        logger.info("UnifiedCommunicationLayer started successfully")
    
    async def stop(self):
        """Stop the unified communication layer"""
        if not self.running:
            return
            
        logger.info("Stopping UnifiedCommunicationLayer")
        self.running = False
        
        # Cancel all tasks
        for task in self.tasks:
            task.cancel()
            
        # Wait for tasks to complete
        await asyncio.gather(*self.tasks, return_exceptions=True)
        self.tasks.clear()
        
        logger.info("UnifiedCommunicationLayer stopped")
    
    async def register_agent(self, agent_id: str, agent_type: str, 
                           capabilities: List[str] = None, language: str = "python",
                           endpoint: Optional[str] = None) -> bool:
        """Register an agent with the communication layer"""
        try:
            agent_info = AgentInfo(
                agent_id=agent_id,
                agent_type=agent_type,
                capabilities=capabilities or [],
                language=language,
                endpoint=endpoint
            )
            agent_info.status = AgentStatus.ONLINE
            
            self.registered_agents[agent_id] = agent_info
            
            # Publish agent registration to discovery stream
            discovery_message = {
                "event_type": "agent_registered",
                "agent_info": agent_info.to_dict(),
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            
            self.keb_client.publish("agent_discovery", discovery_message)
            logger.info(f"Registered agent {agent_id} ({agent_type}, {language})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register agent {agent_id}: {e}")
            return False
    
    async def unregister_agent(self, agent_id: str) -> bool:
        """Unregister an agent"""
        try:
            if agent_id in self.registered_agents:
                agent_info = self.registered_agents[agent_id]
                agent_info.status = AgentStatus.OFFLINE
                
                # Publish agent unregistration
                discovery_message = {
                    "event_type": "agent_unregistered", 
                    "agent_id": agent_id,
                    "timestamp": datetime.utcnow().isoformat() + "Z"
                }
                
                self.keb_client.publish("agent_discovery", discovery_message)
                del self.registered_agents[agent_id]
                logger.info(f"Unregistered agent {agent_id}")
                return True
            else:
                logger.warning(f"Agent {agent_id} not found for unregistration")
                return False
                
        except Exception as e:
            logger.error(f"Failed to unregister agent {agent_id}: {e}")
            return False
    
    async def send_message(self, message: UnifiedMessage) -> bool:
        """Send a message to an agent (Python or TypeScript)"""
        try:
            # Update source agent's last seen and message count
            if message.source_agent in self.registered_agents:
                agent_info = self.registered_agents[message.source_agent]
                agent_info.last_seen = datetime.utcnow()
                agent_info.message_count += 1
            
            # Determine routing based on target agent
            if message.target_agent:
                # Direct message to specific agent
                if message.target_agent in self.registered_agents:
                    target_agent = self.registered_agents[message.target_agent]
                    
                    if target_agent.language == "typescript":
                        # Route to TypeScript bridge
                        return await self._route_to_typescript(message)
                    else:
                        # Route to Python agent via KEBClient
                        return await self._route_to_python(message)
                else:
                    logger.warning(f"Target agent {message.target_agent} not found")
                    return False
            else:
                # Broadcast message
                return await self._broadcast_message(message)
                
        except Exception as e:
            logger.error(f"Failed to send message: {e}")
            return False
    
    async def _route_to_python(self, message: UnifiedMessage) -> bool:
        """Route message to Python agent via KEBClient"""
        try:
            self.keb_client.publish("agent_messages", message.to_dict())
            logger.debug(f"Routed message {message.message_id} to Python agent {message.target_agent}")
            return True
        except Exception as e:
            logger.error(f"Failed to route message to Python agent: {e}")
            return False
    
    async def _route_to_typescript(self, message: UnifiedMessage) -> bool:
        """Route message to TypeScript agent via bridge"""
        try:
            # Add routing metadata for TypeScript bridge
            bridge_message = message.to_dict()
            bridge_message["routing"] = {
                "destination": "typescript",
                "target_agent": message.target_agent,
                "bridge_timestamp": datetime.utcnow().isoformat() + "Z"
            }
            
            self.keb_client.publish("typescript_bridge", bridge_message)
            logger.debug(f"Routed message {message.message_id} to TypeScript agent {message.target_agent}")
            return True
        except Exception as e:
            logger.error(f"Failed to route message to TypeScript agent: {e}")
            return False
    
    async def _broadcast_message(self, message: UnifiedMessage) -> bool:
        """Broadcast message to all agents"""
        try:
            self.keb_client.publish("agent_broadcasts", message.to_dict())
            logger.debug(f"Broadcasted message {message.message_id} from {message.source_agent}")
            return True
        except Exception as e:
            logger.error(f"Failed to broadcast message: {e}")
            return False
    
    async def _process_agent_messages(self):
        """Process direct agent-to-agent messages"""
        consumer_name = f"ucl_{self.agent_id}_messages"
        
        try:
            await self.keb_client.subscribe(
                "agent_messages",
                "agent_messages_group", 
                consumer_name,
                self._handle_agent_message
            )
        except asyncio.CancelledError:
            logger.info(f"Agent messages processing cancelled for {consumer_name}")
        except Exception as e:
            logger.error(f"Error in agent messages processing: {e}")
    
    async def _process_broadcasts(self):
        """Process broadcast messages"""
        consumer_name = f"ucl_{self.agent_id}_broadcasts"
        
        try:
            await self.keb_client.subscribe(
                "agent_broadcasts",
                "agent_broadcasts_group",
                consumer_name, 
                self._handle_broadcast_message
            )
        except asyncio.CancelledError:
            logger.info(f"Broadcast processing cancelled for {consumer_name}")
        except Exception as e:
            logger.error(f"Error in broadcast processing: {e}")
    
    async def _process_discovery(self):
        """Process agent discovery messages"""
        consumer_name = f"ucl_{self.agent_id}_discovery"
        
        try:
            await self.keb_client.subscribe(
                "agent_discovery",
                "agent_discovery_group",
                consumer_name,
                self._handle_discovery_message
            )
        except asyncio.CancelledError:
            logger.info(f"Discovery processing cancelled for {consumer_name}")
        except Exception as e:
            logger.error(f"Error in discovery processing: {e}")
    
    async def _process_health_checks(self):
        """Process agent health check messages"""
        consumer_name = f"ucl_{self.agent_id}_health"
        
        try:
            await self.keb_client.subscribe(
                "agent_health",
                "agent_health_group",
                consumer_name,
                self._handle_health_message
            )
        except asyncio.CancelledError:
            logger.info(f"Health check processing cancelled for {consumer_name}")
        except Exception as e:
            logger.error(f"Error in health check processing: {e}")
    
    async def _process_typescript_bridge(self):
        """Process messages from TypeScript bridge"""
        consumer_name = f"ucl_{self.agent_id}_ts_bridge"
        
        try:
            await self.keb_client.subscribe(
                "typescript_bridge",
                "typescript_bridge_group",
                consumer_name,
                self._handle_typescript_bridge_message
            )
        except asyncio.CancelledError:
            logger.info(f"TypeScript bridge processing cancelled for {consumer_name}")
        except Exception as e:
            logger.error(f"Error in TypeScript bridge processing: {e}")
    
    def _handle_agent_message(self, stream_message_id: str, message_data: Dict[str, Any]):
        """Handle direct agent messages"""
        try:
            message = UnifiedMessage.from_dict(message_data)
            logger.debug(f"Received agent message {message.message_id} from {message.source_agent} to {message.target_agent}")
            
            # Invoke registered message handler if exists
            if message.target_agent in self.message_handlers:
                handler = self.message_handlers[message.target_agent]
                asyncio.create_task(handler(message))
            
        except Exception as e:
            logger.error(f"Error handling agent message {stream_message_id}: {e}")
    
    def _handle_broadcast_message(self, stream_message_id: str, message_data: Dict[str, Any]):
        """Handle broadcast messages"""
        try:
            message = UnifiedMessage.from_dict(message_data)
            logger.debug(f"Received broadcast message {message.message_id} from {message.source_agent}")
            
            # Invoke all registered message handlers
            for agent_id, handler in self.message_handlers.items():
                if agent_id != message.source_agent:  # Don't echo back to sender
                    asyncio.create_task(handler(message))
                    
        except Exception as e:
            logger.error(f"Error handling broadcast message {stream_message_id}: {e}")
    
    def _handle_discovery_message(self, stream_message_id: str, message_data: Dict[str, Any]):
        """Handle agent discovery messages"""
        try:
            event_type = message_data.get("event_type")
            
            if event_type == "agent_registered":
                agent_info_data = message_data.get("agent_info", {})
                agent_id = agent_info_data.get("agent_id")
                
                if agent_id and agent_id not in self.registered_agents:
                    # Remote agent registration
                    agent_info = AgentInfo(
                        agent_id=agent_info_data.get("agent_id"),
                        agent_type=agent_info_data.get("agent_type"),
                        capabilities=agent_info_data.get("capabilities", []),
                        language=agent_info_data.get("language", "python"),
                        endpoint=agent_info_data.get("endpoint")
                    )
                    agent_info.status = AgentStatus.ONLINE
                    self.registered_agents[agent_id] = agent_info
                    logger.info(f"Discovered remote agent {agent_id}")
                    
            elif event_type == "agent_unregistered":
                agent_id = message_data.get("agent_id")
                if agent_id in self.registered_agents:
                    del self.registered_agents[agent_id]
                    logger.info(f"Removed unregistered agent {agent_id}")
                    
        except Exception as e:
            logger.error(f"Error handling discovery message {stream_message_id}: {e}")
    
    def _handle_health_message(self, stream_message_id: str, message_data: Dict[str, Any]):
        """Handle health check messages"""
        try:
            agent_id = message_data.get("agent_id")
            status = message_data.get("status")
            
            if agent_id in self.registered_agents:
                agent_info = self.registered_agents[agent_id]
                agent_info.last_seen = datetime.utcnow()
                if status:
                    agent_info.status = AgentStatus(status)
                logger.debug(f"Updated health for agent {agent_id}: {status}")
                
        except Exception as e:
            logger.error(f"Error handling health message {stream_message_id}: {e}")
    
    def _handle_typescript_bridge_message(self, stream_message_id: str, message_data: Dict[str, Any]):
        """Handle messages from TypeScript bridge"""
        try:
            # Remove routing metadata
            routing = message_data.pop("routing", {})
            message = UnifiedMessage.from_dict(message_data)
            
            logger.debug(f"Received TypeScript bridge message {message.message_id}")
            
            # Route to target Python agent if specified
            if message.target_agent and message.target_agent in self.registered_agents:
                target_agent = self.registered_agents[message.target_agent]
                if target_agent.language == "python":
                    if message.target_agent in self.message_handlers:
                        handler = self.message_handlers[message.target_agent]
                        asyncio.create_task(handler(message))
                        
        except Exception as e:
            logger.error(f"Error handling TypeScript bridge message {stream_message_id}: {e}")
    
    async def _periodic_agent_cleanup(self):
        """Periodically clean up inactive agents"""
        try:
            while self.running:
                await asyncio.sleep(60)  # Check every minute
                
                current_time = datetime.utcnow()
                inactive_agents = []
                
                for agent_id, agent_info in self.registered_agents.items():
                    if agent_id == self.agent_id:  # Skip self
                        continue
                        
                    time_since_last_seen = (current_time - agent_info.last_seen).total_seconds()
                    
                    if time_since_last_seen > 300:  # 5 minutes timeout
                        agent_info.status = AgentStatus.OFFLINE
                        inactive_agents.append(agent_id)
                
                # Log inactive agents
                if inactive_agents:
                    logger.info(f"Marked {len(inactive_agents)} agents as offline: {inactive_agents}")
                    
        except asyncio.CancelledError:
            logger.info("Agent cleanup task cancelled")
        except Exception as e:
            logger.error(f"Error in agent cleanup: {e}")
    
    def register_message_handler(self, agent_id: str, handler: Callable):
        """Register a message handler for an agent"""
        self.message_handlers[agent_id] = handler
        logger.info(f"Registered message handler for agent {agent_id}")
    
    def unregister_message_handler(self, agent_id: str):
        """Unregister a message handler"""
        if agent_id in self.message_handlers:
            del self.message_handlers[agent_id]
            logger.info(f"Unregistered message handler for agent {agent_id}")
    
    def get_registered_agents(self) -> Dict[str, AgentInfo]:
        """Get all registered agents"""
        return self.registered_agents.copy()
    
    def get_agent_info(self, agent_id: str) -> Optional[AgentInfo]:
        """Get information about a specific agent"""
        return self.registered_agents.get(agent_id)
    
    def is_agent_online(self, agent_id: str) -> bool:
        """Check if an agent is online"""
        agent_info = self.registered_agents.get(agent_id)
        return agent_info is not None and agent_info.status == AgentStatus.ONLINE


# Utility functions for easy integration
async def create_unified_communication(redis_config: Dict[str, Any] = None) -> UnifiedCommunicationLayer:
    """Factory function to create and initialize UnifiedCommunicationLayer"""
    redis_config = redis_config or {}
    
    keb_client = KEBClient(
        redis_host=redis_config.get('host', 'localhost'),
        redis_port=redis_config.get('port', 6379),
        redis_db=redis_config.get('db', 0)
    )
    
    ucl = UnifiedCommunicationLayer(keb_client)
    await ucl.start()
    return ucl 