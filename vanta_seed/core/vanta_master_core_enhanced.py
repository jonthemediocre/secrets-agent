"""
Enhanced VANTA Master Core
Builds on the existing vanta_master_core.py but integrates with:
- UnifiedCommunicationLayer for cross-language agent communication
- EnhancedAgentRouter for intelligent task routing and load balancing

This maintains backward compatibility while adding enterprise-grade features.
"""

import logging
import asyncio
import uuid
from typing import Dict, Any, Optional, List
from datetime import datetime
import json
import hashlib

# Import existing VMC components
from .vanta_master_core import VantaMasterCore
from .keb_client import KEBClient

# Import new enhanced components
from agent_core.unified_communication import (
    UnifiedCommunicationLayer, 
    UnifiedMessage, 
    MessageType,
    AgentStatus,
    create_unified_communication
)
from agent_core.enhanced_router import (
    EnhancedAgentRouter,
    Task,
    TaskPriority,
    TaskResult,
    create_enhanced_router
)
from agent_core.memory_system import (
    AgentMemorySystem,
    MemoryEntry,
    MemoryType,
    MemoryPriority,
    MemoryQuery,
    create_agent_memory_system
)

logger = logging.getLogger(__name__)

class VantaMasterCoreEnhanced(VantaMasterCore):
    """
    Enhanced VANTA Master Core with unified communication and intelligent routing.
    Extends the existing VMC while maintaining full backward compatibility.
    """
    
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        # Initialize base VMC
        super().__init__(config)
        
        # Enhanced components
        self.ucl: Optional[UnifiedCommunicationLayer] = None
        self.enhanced_router: Optional[EnhancedAgentRouter] = None
        self.memory_system: Optional[AgentMemorySystem] = None
        self.enhanced_mode = config.get('enhanced_mode', True) if config else True
        
        # Agent integration tracking
        self.enhanced_agents: Dict[str, Dict[str, Any]] = {}
        self.agent_capabilities: Dict[str, List[str]] = {}
        
        logger.info(f"VantaMasterCoreEnhanced initialized - Enhanced mode: {self.enhanced_mode}")

    async def startup(self):
        """Enhanced startup that initializes both classic and enhanced systems"""
        logger.info("VantaMasterCoreEnhanced starting up...")
        
        # Start base VMC
        await super().startup()
        
        if self.enhanced_mode:
            await self._startup_enhanced_systems()
        
        logger.info("VantaMasterCoreEnhanced startup sequence completed.")

    async def _startup_enhanced_systems(self):
        """Start the enhanced communication and routing systems"""
        try:
            redis_config = self.config.get('redis_keb', {})
            
            # Initialize Unified Communication Layer
            logger.info("Initializing Unified Communication Layer...")
            self.ucl = await create_unified_communication(redis_config)
            
            # Register VMC as an enhanced agent
            await self.ucl.register_agent(
                agent_id="VantaMasterCoreEnhanced",
                agent_type="VantaMasterCore",
                capabilities=["orchestration", "agent_management", "task_dispatch", "cascade_execution"],
                language="python"
            )
            
            # Set up message handler for unified communication
            self.ucl.register_message_handler("VantaMasterCoreEnhanced", self._handle_enhanced_message)
            
            # Initialize Enhanced Router
            logger.info("Initializing Enhanced Agent Router...")
            self.enhanced_router = await create_enhanced_router(redis_config)
            
            # Initialize Agent Memory System
            logger.info("Initializing Agent Memory System...")
            self.memory_system = await create_agent_memory_system(
                self.ucl.keb_client, 
                memory_ttl_hours=self.config.get('memory_ttl_hours', 168)
            )
            
            # Migrate existing agents to enhanced system
            await self._migrate_existing_agents()
            
            logger.info("Enhanced systems initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize enhanced systems: {e}")
            # Fallback to classic mode
            self.enhanced_mode = False
            logger.warning("Falling back to classic VMC mode due to enhanced system initialization failure")

    async def _migrate_existing_agents(self):
        """Migrate existing agents to the enhanced communication system"""
        try:
            for agent_id, agent_instance in self.agents.items():
                # Determine agent capabilities
                capabilities = []
                
                # Inspect agent for capabilities
                if hasattr(agent_instance, 'capabilities'):
                    capabilities = agent_instance.capabilities
                elif hasattr(agent_instance, 'process_task'):
                    capabilities = ['task_processing']
                    
                # Determine agent type
                agent_type = type(agent_instance).__name__
                
                # Register with unified communication
                await self.ucl.register_agent(
                    agent_id=agent_id,
                    agent_type=agent_type,
                    capabilities=capabilities,
                    language="python"
                )
                
                # Store enhanced agent info
                self.enhanced_agents[agent_id] = {
                    'instance': agent_instance,
                    'capabilities': capabilities,
                    'agent_type': agent_type,
                    'integrated': True
                }
                self.agent_capabilities[agent_id] = capabilities
                
                logger.info(f"Migrated agent {agent_id} to enhanced system")
                
        except Exception as e:
            logger.error(f"Error migrating existing agents: {e}")

    async def shutdown(self):
        """Enhanced shutdown that properly cleans up all systems"""
        logger.info("VantaMasterCoreEnhanced shutting down...")
        
        if self.enhanced_mode:
            await self._shutdown_enhanced_systems()
        
        # Shutdown base VMC
        await super().shutdown()
        
        logger.info("VantaMasterCoreEnhanced shutdown complete.")

    async def _shutdown_enhanced_systems(self):
        """Shutdown enhanced systems"""
        try:
            if self.enhanced_router:
                logger.info("Shutting down Enhanced Router...")
                await self.enhanced_router.stop()
                
            if self.memory_system:
                logger.info("Shutting down Agent Memory System...")
                await self.memory_system.stop()
                
            if self.ucl:
                logger.info("Shutting down Unified Communication Layer...")
                await self.ucl.stop()
                
        except Exception as e:
            logger.error(f"Error shutting down enhanced systems: {e}")

    def register_agent(self, agent_id: str, agent_instance: Any):
        """Enhanced agent registration that supports both classic and enhanced modes"""
        # Register with base VMC
        super().register_agent(agent_id, agent_instance)
        
        if self.enhanced_mode and self.ucl:
            # Enhanced registration
            asyncio.create_task(self._register_agent_enhanced(agent_id, agent_instance))

    async def _register_agent_enhanced(self, agent_id: str, agent_instance: Any):
        """Register agent with enhanced systems"""
        try:
            # Determine capabilities
            capabilities = []
            if hasattr(agent_instance, 'capabilities'):
                capabilities = agent_instance.capabilities
            elif hasattr(agent_instance, 'process_task'):
                capabilities = ['task_processing']
                
            agent_type = type(agent_instance).__name__
            
            # Register with unified communication
            await self.ucl.register_agent(
                agent_id=agent_id,
                agent_type=agent_type,
                capabilities=capabilities,
                language="python"
            )
            
            # Set up message handler for this agent
            self.ucl.register_message_handler(agent_id, 
                lambda msg: self._handle_agent_message(agent_id, msg))
            
            # Store enhanced agent info
            self.enhanced_agents[agent_id] = {
                'instance': agent_instance,
                'capabilities': capabilities,
                'agent_type': agent_type,
                'integrated': True
            }
            self.agent_capabilities[agent_id] = capabilities
            
            logger.info(f"Enhanced registration completed for agent {agent_id}")
            
        except Exception as e:
            logger.error(f"Failed to register agent {agent_id} with enhanced systems: {e}")

    async def dispatch_task_enhanced(self, task_id: str, task_type: str, task_parameters: Dict[str, Any], 
                                   priority: TaskPriority = TaskPriority.NORMAL,
                                   requested_agent: Optional[str] = None,
                                   required_capabilities: List[str] = None,
                                   timeout_seconds: int = 300) -> TaskResult:
        """
        Enhanced task dispatch using the intelligent router with load balancing
        """
        if not self.enhanced_mode or not self.enhanced_router:
            # Fallback to classic dispatch
            result = self.dispatch_task_to_agent(requested_agent or "unknown", task_type, task_parameters, task_id)
            return TaskResult(
                task_id=task_id,
                success=result.get("status") == "success",
                result=result.get("result"),
                error=result.get("message") if result.get("status") != "success" else None
            )
        
        try:
            # Create task for enhanced router
            task = Task(
                task_id=task_id,
                task_type=task_type,
                parameters=task_parameters,
                priority=priority,
                requested_agent=requested_agent,
                required_capabilities=required_capabilities or [],
                timeout_seconds=timeout_seconds
            )
            
            # Submit to enhanced router
            submitted_task_id = await self.enhanced_router.submit_task(task)
            
            # Wait for result
            result = await self.enhanced_router.get_task_result(submitted_task_id, timeout_seconds)
            
            if result:
                logger.info(f"Enhanced task {task_id} completed - Success: {result.success}")
                return result
            else:
                logger.warning(f"Enhanced task {task_id} timed out")
                return TaskResult(
                    task_id=task_id,
                    success=False,
                    error="Task execution timed out"
                )
                
        except Exception as e:
            logger.error(f"Error in enhanced task dispatch for {task_id}: {e}")
            return TaskResult(
                task_id=task_id,
                success=False,
                error=f"Enhanced dispatch error: {str(e)}"
            )

    async def _handle_enhanced_message(self, message: UnifiedMessage):
        """Handle messages received via unified communication"""
        try:
            logger.debug(f"VMC received enhanced message: {message.message_type} from {message.source_agent}")
            
            if message.message_type == MessageType.AGENT_REQUEST:
                await self._handle_agent_request(message)
            elif message.message_type == MessageType.SYSTEM_NOTIFICATION:
                await self._handle_system_notification(message)
            elif message.message_type == MessageType.HEALTH_CHECK:
                await self._handle_health_check(message)
            else:
                logger.debug(f"Unhandled enhanced message type: {message.message_type}")
                
        except Exception as e:
            logger.error(f"Error handling enhanced message {message.message_id}: {e}")

    async def _handle_agent_message(self, agent_id: str, message: UnifiedMessage):
        """Handle messages for specific agents"""
        try:
            if message.message_type == MessageType.TASK_ASSIGNMENT:
                await self._handle_task_assignment(agent_id, message)
            else:
                logger.debug(f"Agent {agent_id} received message: {message.message_type}")
                
        except Exception as e:
            logger.error(f"Error handling message for agent {agent_id}: {e}")

    async def _handle_task_assignment(self, agent_id: str, message: UnifiedMessage):
        """Handle task assignment to an agent"""
        try:
            payload = message.payload
            task_id = payload.get("task_id")
            task_type = payload.get("task_type")
            parameters = payload.get("parameters", {})
            
            logger.info(f"Assigning task {task_id} ({task_type}) to agent {agent_id}")
            
            # Store task assignment in memory if available
            if self.enhanced_mode and self.memory_system:
                await self.store_agent_memory(
                    agent_id=agent_id,
                    memory_type=MemoryType.EPISODIC,
                    content={
                        "event": "task_assignment",
                        "task_id": task_id,
                        "task_type": task_type,
                        "parameters": parameters,
                        "source": message.source_agent
                    },
                    tags=["task_assignment", task_type],
                    priority=MemoryPriority.NORMAL
                )
            
            # Get agent instance
            agent_info = self.enhanced_agents.get(agent_id)
            if not agent_info:
                # Fallback to classic agent lookup
                agent_instance = self.agents.get(agent_id)
                if not agent_instance:
                    await self._send_task_completion(message.source_agent, task_id, False, 
                                                   error=f"Agent {agent_id} not found")
                    return
            else:
                agent_instance = agent_info['instance']
            
            # Execute task
            start_time = datetime.utcnow()
            try:
                if hasattr(agent_instance, 'process_task'):
                    result = agent_instance.process_task(task_type, parameters)
                else:
                    result = {"status": "error", "message": "Agent does not support task processing"}
                
                execution_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                success = result.get("status") == "success"
                
                # Store task completion in memory and record learning
                if self.enhanced_mode and self.memory_system:
                    # Store completion memory
                    await self.store_agent_memory(
                        agent_id=agent_id,
                        memory_type=MemoryType.EPISODIC,
                        content={
                            "event": "task_completion",
                            "task_id": task_id,
                            "task_type": task_type,
                            "success": success,
                            "result": result.get("result"),
                            "error": result.get("message") if not success else None,
                            "execution_time_ms": execution_time_ms
                        },
                        tags=["task_completion", task_type, "success" if success else "error"],
                        priority=MemoryPriority.HIGH if success else MemoryPriority.CRITICAL
                    )
                    
                    # Record learning outcome
                    learning_outcome = {
                        "task_type": task_type,
                        "success": success,
                        "execution_time_ms": execution_time_ms,
                        "parameters_hash": hashlib.md5(json.dumps(parameters, sort_keys=True).encode()).hexdigest()[:8]
                    }
                    
                    # Calculate confidence based on success and execution time
                    if success:
                        # Higher confidence for faster successful executions
                        base_confidence = 0.8
                        time_bonus = max(0.0, min(0.2, (10000 - execution_time_ms) / 50000))  # Bonus for < 10s
                        confidence = base_confidence + time_bonus
                    else:
                        confidence = 0.2  # Low confidence for failures
                    
                    await self.record_agent_learning(
                        agent_id=agent_id,
                        learning_type=f"task_execution_{task_type}",
                        outcome=learning_outcome,
                        confidence=confidence
                    )
                
                # Send completion
                await self._send_task_completion(
                    message.source_agent, 
                    task_id, 
                    success,
                    result=result.get("result"),
                    error=result.get("message") if not success else None,
                    execution_time_ms=execution_time_ms
                )
                
            except Exception as e:
                execution_time_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                # Store error in memory and record negative learning
                if self.enhanced_mode and self.memory_system:
                    await self.store_agent_memory(
                        agent_id=agent_id,
                        memory_type=MemoryType.EPISODIC,
                        content={
                            "event": "task_error",
                            "task_id": task_id,
                            "task_type": task_type,
                            "error": str(e),
                            "execution_time_ms": execution_time_ms
                        },
                        tags=["task_error", task_type, "exception"],
                        priority=MemoryPriority.CRITICAL
                    )
                    
                    # Record learning from failure
                    await self.record_agent_learning(
                        agent_id=agent_id,
                        learning_type=f"task_execution_{task_type}",
                        outcome={
                            "task_type": task_type,
                            "success": False,
                            "error_type": type(e).__name__,
                            "execution_time_ms": execution_time_ms
                        },
                        confidence=0.1  # Very low confidence for exceptions
                    )
                
                await self._send_task_completion(
                    message.source_agent,
                    task_id,
                    False,
                    error=str(e),
                    execution_time_ms=execution_time_ms
                )
                
        except Exception as e:
            logger.error(f"Error handling task assignment: {e}")

    async def _send_task_completion(self, router_agent: str, task_id: str, success: bool,
                                  result: Any = None, error: str = None, execution_time_ms: int = 0):
        """Send task completion message back to router"""
        try:
            completion_message = UnifiedMessage(
                message_type=MessageType.TASK_COMPLETION,
                source_agent="VantaMasterCoreEnhanced",
                target_agent=router_agent,
                payload={
                    "task_id": task_id,
                    "success": success,
                    "result": result,
                    "error": error,
                    "execution_time_ms": execution_time_ms
                }
            )
            
            if self.ucl:
                await self.ucl.send_message(completion_message)
                
        except Exception as e:
            logger.error(f"Error sending task completion: {e}")

    async def _handle_agent_request(self, message: UnifiedMessage):
        """Handle general agent requests"""
        try:
            request_type = message.payload.get("request_type")
            
            if request_type == "agent_list":
                # Send list of available agents
                agent_list = {
                    "agents": [
                        {
                            "agent_id": agent_id,
                            "agent_type": info.get("agent_type", "unknown"),
                            "capabilities": info.get("capabilities", [])
                        }
                        for agent_id, info in self.enhanced_agents.items()
                    ]
                }
                
                response = UnifiedMessage(
                    message_type=MessageType.AGENT_RESPONSE,
                    source_agent="VantaMasterCoreEnhanced",
                    target_agent=message.source_agent,
                    payload=agent_list,
                    correlation_id=message.correlation_id
                )
                
                await self.ucl.send_message(response)
                
        except Exception as e:
            logger.error(f"Error handling agent request: {e}")

    async def _handle_system_notification(self, message: UnifiedMessage):
        """Handle system notifications"""
        try:
            notification_type = message.payload.get("notification_type")
            logger.info(f"Received system notification: {notification_type} from {message.source_agent}")
            
        except Exception as e:
            logger.error(f"Error handling system notification: {e}")

    async def _handle_health_check(self, message: UnifiedMessage):
        """Handle health check requests"""
        try:
            # Respond with VMC health status
            health_status = {
                "status": "healthy",
                "enhanced_mode": self.enhanced_mode,
                "registered_agents": len(self.agents),
                "enhanced_agents": len(self.enhanced_agents),
                "uptime_seconds": (datetime.utcnow() - datetime.utcnow()).total_seconds(),  # Placeholder
                "capabilities": ["orchestration", "agent_management", "task_dispatch"]
            }
            
            response = UnifiedMessage(
                message_type=MessageType.HEALTH_CHECK,
                source_agent="VantaMasterCoreEnhanced",
                target_agent=message.source_agent,
                payload=health_status,
                correlation_id=message.correlation_id
            )
            
            await self.ucl.send_message(response)
            
        except Exception as e:
            logger.error(f"Error handling health check: {e}")

    def get_enhanced_stats(self) -> Dict[str, Any]:
        """Get comprehensive stats including enhanced features"""
        base_stats = {
            "classic_agents": len(self.agents),
            "enhanced_mode": self.enhanced_mode,
            "enhanced_agents": len(self.enhanced_agents),
        }
        
        if self.enhanced_router:
            base_stats["router_stats"] = self.enhanced_router.get_router_stats()
            
        if self.ucl:
            base_stats["communication_stats"] = {
                "registered_agents": len(self.ucl.get_registered_agents()),
                "agent_discovery": [
                    {
                        "agent_id": agent_id,
                        "status": agent_info.status.value,
                        "language": agent_info.language,
                        "capabilities": agent_info.capabilities
                    }
                    for agent_id, agent_info in self.ucl.get_registered_agents().items()
                ]
            }
            
        if self.memory_system:
            base_stats["memory_stats"] = asyncio.create_task(
                self.memory_system.get_system_metrics()
            )
            
        return base_stats

    # Memory-enabled agent methods
    async def store_agent_memory(self, agent_id: str, memory_type: MemoryType,
                               content: Dict[str, Any], tags: List[str] = None,
                               priority: MemoryPriority = MemoryPriority.NORMAL) -> Optional[str]:
        """Store memory for an agent"""
        if not self.enhanced_mode or not self.memory_system:
            logger.warning("Memory system not available - enhanced mode disabled")
            return None
            
        try:
            memory_id = await self.memory_system.store_memory(
                agent_id=agent_id,
                memory_type=memory_type,
                content=content,
                tags=tags,
                priority=priority
            )
            
            logger.info(f"Stored memory {memory_id} for agent {agent_id}")
            return memory_id
            
        except Exception as e:
            logger.error(f"Failed to store memory for agent {agent_id}: {e}")
            return None

    async def get_agent_memories(self, agent_id: str, memory_types: List[MemoryType] = None,
                               tags: List[str] = None, limit: int = 50) -> List[MemoryEntry]:
        """Retrieve memories for an agent"""
        if not self.enhanced_mode or not self.memory_system:
            return []
            
        try:
            query = MemoryQuery(
                agent_id=agent_id,
                memory_types=memory_types,
                tags=tags,
                limit=limit
            )
            
            memories = await self.memory_system.search_memories(query)
            logger.debug(f"Retrieved {len(memories)} memories for agent {agent_id}")
            return memories
            
        except Exception as e:
            logger.error(f"Failed to retrieve memories for agent {agent_id}: {e}")
            return []

    async def update_agent_context(self, agent_id: str, context_key: str,
                                 context_data: Dict[str, Any]) -> bool:
        """Update agent context"""
        if not self.enhanced_mode or not self.memory_system:
            return False
            
        try:
            success = await self.memory_system.store_context(
                agent_id=agent_id,
                context_key=context_key,
                context_data=context_data
            )
            
            if success:
                logger.debug(f"Updated context {context_key} for agent {agent_id}")
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to update context for agent {agent_id}: {e}")
            return False

    async def get_agent_context(self, agent_id: str, context_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve agent context"""
        if not self.enhanced_mode or not self.memory_system:
            return None
            
        try:
            context = await self.memory_system.retrieve_context(agent_id, context_key)
            if context:
                logger.debug(f"Retrieved context {context_key} for agent {agent_id}")
            
            return context
            
        except Exception as e:
            logger.error(f"Failed to retrieve context for agent {agent_id}: {e}")
            return None

    async def record_agent_learning(self, agent_id: str, learning_type: str,
                                  outcome: Dict[str, Any], confidence: float = 1.0) -> Optional[str]:
        """Record learning outcome for an agent"""
        if not self.enhanced_mode or not self.memory_system:
            return None
            
        try:
            learning_id = await self.memory_system.record_learning(
                agent_id=agent_id,
                learning_type=learning_type,
                outcome=outcome,
                confidence=confidence
            )
            
            logger.info(f"Recorded learning {learning_id} for agent {agent_id}")
            return learning_id
            
        except Exception as e:
            logger.error(f"Failed to record learning for agent {agent_id}: {e}")
            return None

    async def get_agent_learning_insights(self, agent_id: str, learning_type: str = None) -> Dict[str, Any]:
        """Get learning insights for an agent"""
        if not self.enhanced_mode or not self.memory_system:
            return {}
            
        try:
            insights = await self.memory_system.get_learning_insights(agent_id, learning_type)
            logger.debug(f"Retrieved learning insights for agent {agent_id}")
            return insights
            
        except Exception as e:
            logger.error(f"Failed to get learning insights for agent {agent_id}: {e}")
            return {}

    async def get_comprehensive_agent_summary(self, agent_id: str) -> Dict[str, Any]:
        """Get comprehensive summary of agent including memory, context, and learning"""
        summary = {
            "agent_id": agent_id,
            "enhanced_mode": self.enhanced_mode,
            "classic_agent_registered": agent_id in self.agents,
            "enhanced_agent_registered": agent_id in self.enhanced_agents
        }
        
        if agent_id in self.enhanced_agents:
            agent_info = self.enhanced_agents[agent_id]
            summary.update({
                "agent_type": agent_info.get("agent_type"),
                "capabilities": agent_info.get("capabilities", []),
                "integrated": agent_info.get("integrated", False)
            })
        
        if self.enhanced_mode and self.memory_system:
            try:
                # Get memory summary
                memory_summary = await self.memory_system.get_agent_context_summary(agent_id)
                summary["memory_summary"] = memory_summary
                
                # Get learning insights
                learning_insights = await self.get_agent_learning_insights(agent_id)
                summary["learning_insights"] = learning_insights
                
            except Exception as e:
                logger.error(f"Failed to get comprehensive summary for agent {agent_id}: {e}")
                summary["error"] = str(e)
        
        return summary

    # Backward compatibility methods - delegate to original implementations
    def dispatch_task_to_agent(self, agent_id: str, task_type: str, task_parameters: Dict[str, Any], 
                             original_task_id: Optional[str] = None) -> Dict[str, Any]:
        """Backward compatible task dispatch"""
        return super().dispatch_task_to_agent(agent_id, task_type, task_parameters, original_task_id)

    def handle_control_event(self, stream_message_id: str, event_payload: Dict[str, Any]):
        """Backward compatible control event handling"""
        super().handle_control_event(stream_message_id, event_payload)

    def trigger_cascade_from_signal(self, cascade_id: str, initial_data: Optional[Dict[str, Any]] = None):
        """Backward compatible cascade triggering"""
        return super().trigger_cascade_from_signal(cascade_id, initial_data)


# Factory function for easy initialization
async def create_enhanced_vmc(config: Optional[Dict[str, Any]] = None) -> VantaMasterCoreEnhanced:
    """Create and initialize Enhanced VANTA Master Core"""
    vmc = VantaMasterCoreEnhanced(config)
    await vmc.startup()
    return vmc 