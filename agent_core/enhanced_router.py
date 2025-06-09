"""
Enhanced Agent Router
Builds on the existing router.py but adds intelligent routing, load balancing,
and integration with the UnifiedCommunicationLayer.
"""

import asyncio
import logging
import json
from typing import Dict, Any, Optional, List
from datetime import datetime
from queue import PriorityQueue
from dataclasses import dataclass, field
import threading
from enum import Enum

from .unified_communication import (
    UnifiedCommunicationLayer, 
    UnifiedMessage, 
    MessageType, 
    AgentStatus,
    create_unified_communication
)

logger = logging.getLogger(__name__)

class TaskPriority(Enum):
    """Task priority levels"""
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4
    BACKGROUND = 5

@dataclass
class Task:
    """Task definition for agent routing"""
    task_id: str
    task_type: str
    parameters: Dict[str, Any]
    priority: TaskPriority = TaskPriority.NORMAL
    requested_agent: Optional[str] = None
    required_capabilities: List[str] = field(default_factory=list)
    timeout_seconds: int = 300
    created_at: datetime = field(default_factory=datetime.utcnow)
    correlation_id: Optional[str] = None
    
    def __lt__(self, other):
        """For priority queue ordering"""
        return self.priority.value < other.priority.value

@dataclass 
class TaskResult:
    """Result of task execution"""
    task_id: str
    success: bool
    result: Optional[Dict[str, Any]] = None
    error: Optional[str] = None
    assigned_agent: Optional[str] = None
    execution_time_ms: int = 0
    timestamp: datetime = field(default_factory=datetime.utcnow)

class AgentLoadInfo:
    """Information about agent load and performance"""
    
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.active_tasks = 0
        self.total_tasks_completed = 0
        self.total_execution_time_ms = 0
        self.last_task_completed = datetime.utcnow()
        self.error_count = 0
        self.success_rate = 1.0
        self.average_execution_time_ms = 0
        self.load_score = 0.0
        
    def add_task_start(self):
        """Record task start"""
        self.active_tasks += 1
        self._update_load_score()
        
    def add_task_completion(self, execution_time_ms: int, success: bool):
        """Record task completion"""
        self.active_tasks = max(0, self.active_tasks - 1)
        self.total_tasks_completed += 1
        self.total_execution_time_ms += execution_time_ms
        self.last_task_completed = datetime.utcnow()
        
        if not success:
            self.error_count += 1
            
        # Update metrics
        self.success_rate = (self.total_tasks_completed - self.error_count) / max(1, self.total_tasks_completed)
        self.average_execution_time_ms = self.total_execution_time_ms / max(1, self.total_tasks_completed)
        self._update_load_score()
        
    def _update_load_score(self):
        """Calculate load score for load balancing (lower is better)"""
        # Factors: active tasks, success rate, average execution time
        base_load = self.active_tasks
        performance_penalty = (1.0 - self.success_rate) * 10  # High penalty for errors
        speed_penalty = self.average_execution_time_ms / 1000.0  # Convert to seconds
        
        self.load_score = base_load + performance_penalty + speed_penalty

class EnhancedAgentRouter:
    """
    Enhanced agent router with intelligent routing, load balancing,
    and unified communication integration.
    """
    
    def __init__(self, redis_config: Dict[str, Any] = None):
        self.redis_config = redis_config or {}
        self.ucl: Optional[UnifiedCommunicationLayer] = None
        self.task_queue = PriorityQueue()
        self.pending_tasks: Dict[str, Task] = {}
        self.task_results: Dict[str, TaskResult] = {}
        self.agent_loads: Dict[str, AgentLoadInfo] = {}
        self.running = False
        self.router_id = f"enhanced_router_{datetime.utcnow().timestamp()}"
        self.worker_task: Optional[asyncio.Task] = None
        self.lock = threading.Lock()
        
    async def start(self):
        """Start the enhanced router"""
        if self.running:
            logger.warning("EnhancedAgentRouter already running")
            return
            
        logger.info("Starting EnhancedAgentRouter")
        
        try:
            # Initialize unified communication layer
            self.ucl = await create_unified_communication(self.redis_config)
            
            # Register router as an agent
            await self.ucl.register_agent(
                agent_id=self.router_id,
                agent_type="EnhancedAgentRouter",
                capabilities=["routing", "load_balancing", "task_management"],
                language="python"
            )
            
            # Register message handler
            self.ucl.register_message_handler(self.router_id, self._handle_unified_message)
            
            self.running = True
            
            # Start task processing worker
            self.worker_task = asyncio.create_task(self._process_task_queue())
            
            logger.info("EnhancedAgentRouter started successfully")
            
        except Exception as e:
            logger.error(f"Failed to start EnhancedAgentRouter: {e}")
            raise
    
    async def stop(self):
        """Stop the enhanced router"""
        if not self.running:
            return
            
        logger.info("Stopping EnhancedAgentRouter")
        self.running = False
        
        if self.worker_task:
            self.worker_task.cancel()
            try:
                await self.worker_task
            except asyncio.CancelledError:
                pass
                
        if self.ucl:
            await self.ucl.unregister_agent(self.router_id)
            await self.ucl.stop()
            
        logger.info("EnhancedAgentRouter stopped")
    
    async def submit_task(self, task: Task) -> str:
        """Submit a task for routing and execution"""
        try:
            with self.lock:
                self.pending_tasks[task.task_id] = task
                
            # Add to priority queue
            await asyncio.get_event_loop().run_in_executor(
                None, self.task_queue.put, task
            )
            
            logger.info(f"Submitted task {task.task_id} (type: {task.task_type}, priority: {task.priority.name})")
            return task.task_id
            
        except Exception as e:
            logger.error(f"Failed to submit task {task.task_id}: {e}")
            raise
    
    async def get_task_result(self, task_id: str, timeout: float = None) -> Optional[TaskResult]:
        """Get the result of a task (blocks until completion or timeout)"""
        start_time = datetime.utcnow()
        
        while self.running:
            with self.lock:
                if task_id in self.task_results:
                    return self.task_results[task_id]
                    
            if timeout:
                elapsed = (datetime.utcnow() - start_time).total_seconds()
                if elapsed >= timeout:
                    logger.warning(f"Timeout waiting for task result {task_id}")
                    return None
                    
            await asyncio.sleep(0.1)  # Check every 100ms
            
        return None
    
    async def route_task(self, task: Task) -> Optional[str]:
        """Route a task to the best available agent"""
        try:
            # Get available agents
            agents = self.ucl.get_registered_agents()
            
            # Filter agents by capabilities if required
            eligible_agents = []
            for agent_id, agent_info in agents.items():
                if agent_id == self.router_id:  # Skip self
                    continue
                    
                if agent_info.status != AgentStatus.ONLINE:
                    continue
                    
                # Check if specific agent requested
                if task.requested_agent and agent_id != task.requested_agent:
                    continue
                    
                # Check capabilities
                if task.required_capabilities:
                    if not all(cap in agent_info.capabilities for cap in task.required_capabilities):
                        continue
                        
                eligible_agents.append(agent_id)
            
            if not eligible_agents:
                logger.warning(f"No eligible agents found for task {task.task_id}")
                return None
                
            # Load balance among eligible agents
            best_agent = self._select_best_agent(eligible_agents)
            
            if best_agent:
                # Update load tracking
                load_info = self.agent_loads.setdefault(best_agent, AgentLoadInfo(best_agent))
                load_info.add_task_start()
                
                logger.info(f"Routed task {task.task_id} to agent {best_agent}")
                
            return best_agent
            
        except Exception as e:
            logger.error(f"Failed to route task {task.task_id}: {e}")
            return None
    
    def _select_best_agent(self, eligible_agents: List[str]) -> Optional[str]:
        """Select the best agent based on load balancing"""
        if not eligible_agents:
            return None
            
        if len(eligible_agents) == 1:
            return eligible_agents[0]
            
        # Calculate load scores for all eligible agents
        agent_scores = []
        for agent_id in eligible_agents:
            load_info = self.agent_loads.get(agent_id)
            if load_info:
                score = load_info.load_score
            else:
                score = 0.0  # New agent, give priority
                
            agent_scores.append((score, agent_id))
            
        # Sort by score (lower is better) and return best agent
        agent_scores.sort(key=lambda x: x[0])
        return agent_scores[0][1]
    
    async def _process_task_queue(self):
        """Process tasks from the priority queue"""
        logger.info("Started task queue processing")
        
        try:
            while self.running:
                try:
                    # Get next task (with timeout to allow clean shutdown)
                    task = await asyncio.get_event_loop().run_in_executor(
                        None, lambda: self.task_queue.get(timeout=1)
                    )
                    
                    await self._execute_task(task)
                    
                except Exception as e:
                    if self.running:  # Only log if not shutting down
                        logger.error(f"Error processing task queue: {e}")
                        await asyncio.sleep(1)  # Brief delay before retry
                        
        except asyncio.CancelledError:
            logger.info("Task queue processing cancelled")
        except Exception as e:
            logger.error(f"Critical error in task queue processing: {e}")
        finally:
            logger.info("Task queue processing stopped")
    
    async def _execute_task(self, task: Task):
        """Execute a task by routing it to an agent"""
        start_time = datetime.utcnow()
        
        try:
            # Route task to agent
            assigned_agent = await self.route_task(task)
            
            if not assigned_agent:
                # No agent available - create error result
                result = TaskResult(
                    task_id=task.task_id,
                    success=False,
                    error="No eligible agents available",
                    execution_time_ms=0
                )
                
                with self.lock:
                    self.task_results[task.task_id] = result
                    if task.task_id in self.pending_tasks:
                        del self.pending_tasks[task.task_id]
                        
                logger.error(f"Failed to route task {task.task_id}: No agents available")
                return
            
            # Send task to agent via unified communication
            message = UnifiedMessage(
                message_type=MessageType.TASK_ASSIGNMENT,
                source_agent=self.router_id,
                target_agent=assigned_agent,
                payload={
                    "task_id": task.task_id,
                    "task_type": task.task_type,
                    "parameters": task.parameters,
                    "timeout_seconds": task.timeout_seconds,
                    "correlation_id": task.correlation_id
                },
                correlation_id=task.correlation_id
            )
            
            success = await self.ucl.send_message(message)
            
            if not success:
                # Failed to send message - create error result
                result = TaskResult(
                    task_id=task.task_id,
                    success=False,
                    error="Failed to send task to agent",
                    assigned_agent=assigned_agent,
                    execution_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
                )
                
                with self.lock:
                    self.task_results[task.task_id] = result
                    if task.task_id in self.pending_tasks:
                        del self.pending_tasks[task.task_id]
                        
                # Update load tracking for failed send
                load_info = self.agent_loads.get(assigned_agent)
                if load_info:
                    load_info.add_task_completion(result.execution_time_ms, False)
                    
                logger.error(f"Failed to send task {task.task_id} to agent {assigned_agent}")
                
        except Exception as e:
            # Unexpected error - create error result
            result = TaskResult(
                task_id=task.task_id,
                success=False,
                error=f"Unexpected error during task execution: {str(e)}",
                execution_time_ms=int((datetime.utcnow() - start_time).total_seconds() * 1000)
            )
            
            with self.lock:
                self.task_results[task.task_id] = result
                if task.task_id in self.pending_tasks:
                    del self.pending_tasks[task.task_id]
                    
            logger.error(f"Unexpected error executing task {task.task_id}: {e}")
    
    async def _handle_unified_message(self, message: UnifiedMessage):
        """Handle messages received via unified communication"""
        try:
            if message.message_type == MessageType.TASK_COMPLETION:
                await self._handle_task_completion(message)
            elif message.message_type == MessageType.AGENT_RESPONSE:
                await self._handle_agent_response(message)
            else:
                logger.debug(f"Received unhandled message type: {message.message_type}")
                
        except Exception as e:
            logger.error(f"Error handling unified message {message.message_id}: {e}")
    
    async def _handle_task_completion(self, message: UnifiedMessage):
        """Handle task completion message from agent"""
        try:
            payload = message.payload
            task_id = payload.get("task_id")
            success = payload.get("success", False)
            result_data = payload.get("result")
            error = payload.get("error")
            execution_time_ms = payload.get("execution_time_ms", 0)
            
            if not task_id:
                logger.warning("Received task completion without task_id")
                return
                
            # Create task result
            result = TaskResult(
                task_id=task_id,
                success=success,
                result=result_data,
                error=error,
                assigned_agent=message.source_agent,
                execution_time_ms=execution_time_ms
            )
            
            with self.lock:
                self.task_results[task_id] = result
                if task_id in self.pending_tasks:
                    del self.pending_tasks[task_id]
            
            # Update load tracking
            load_info = self.agent_loads.get(message.source_agent)
            if load_info:
                load_info.add_task_completion(execution_time_ms, success)
                
            logger.info(f"Task {task_id} completed by {message.source_agent} - Success: {success}")
            
        except Exception as e:
            logger.error(f"Error handling task completion: {e}")
    
    async def _handle_agent_response(self, message: UnifiedMessage):
        """Handle general agent response message"""
        try:
            # Process agent responses (can be extended for specific response types)
            logger.debug(f"Received agent response from {message.source_agent}: {message.payload}")
            
        except Exception as e:
            logger.error(f"Error handling agent response: {e}")
    
    def get_router_stats(self) -> Dict[str, Any]:
        """Get router statistics"""
        with self.lock:
            return {
                "router_id": self.router_id,
                "running": self.running,
                "pending_tasks": len(self.pending_tasks),
                "completed_tasks": len(self.task_results),
                "queue_size": self.task_queue.qsize(),
                "registered_agents": len(self.ucl.get_registered_agents()) if self.ucl else 0,
                "agent_loads": {
                    agent_id: {
                        "active_tasks": load.active_tasks,
                        "total_completed": load.total_tasks_completed,
                        "success_rate": load.success_rate,
                        "average_execution_time_ms": load.average_execution_time_ms,
                        "load_score": load.load_score
                    }
                    for agent_id, load in self.agent_loads.items()
                }
            }
    
    def get_agent_loads(self) -> Dict[str, AgentLoadInfo]:
        """Get current agent load information"""
        return self.agent_loads.copy()


# Utility functions for easy integration
async def create_enhanced_router(redis_config: Dict[str, Any] = None) -> EnhancedAgentRouter:
    """Factory function to create and start EnhancedAgentRouter"""
    router = EnhancedAgentRouter(redis_config)
    await router.start()
    return router 