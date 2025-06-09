#!/usr/bin/env python3
"""
UAP Agent Base Class
===================

Universal Agent Protocol base class that all Level 2 agents must inherit from.
Provides standardized lifecycle, communication, and compliance features.

Compliance: UAP-001, UAP-002, COM-001, COM-002, COM-003, CASCADE-001
"""

import asyncio
import logging
import time
import traceback
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from dataclasses import asdict

from ..protocols.message_types import (
    ProtocolType, AgentMessage, MCPToolDefinition, MCPRequest, MCPResponse,
    A2AMessage, CascadeContext, CascadeResult, CrossProtocolRequest,
    AgentHealthStatus, AgentStatus, MessageType, UAPError
)
from .component_registry import COMPONENT_REGISTRY, AgentRegistration


class UAPAgentBase(ABC):
    """
    Universal Agent Protocol base class for all Level 2 agents.
    
    Provides:
    - Standardized agent lifecycle (startup/shutdown)
    - Multi-protocol communication (MCP, A2A, Cross-Protocol)
    - Automatic registry registration
    - Health monitoring and heartbeat
    - Cascade workflow support
    - Compliance validation
    
    Compliance: UAP-001 - All Level 2 agents MUST inherit from this class
    """
    
    def __init__(self, agent_id: str, **kwargs):
        """
        Initialize UAP agent with required components.
        
        Args:
            agent_id: Unique identifier for this agent
            **kwargs: Additional agent-specific configuration
        """
        # Core agent properties (REQUIRED by UAP-001)
        self.agent_id = agent_id
        self.protocol_support: List[ProtocolType] = []  # To be set by subclass
        self.capabilities: List[str] = []  # To be set by subclass
        
        # Agent lifecycle state
        self._startup_time = None
        self._shutdown_requested = False
        self._health_status = AgentStatus.STARTING
        
        # Performance metrics
        self._request_count = 0
        self._error_count = 0
        self._last_heartbeat = datetime.now()
        
        # Communication components
        self._message_handlers: Dict[str, callable] = {}
        self._cascade_context: Optional[CascadeContext] = None
        
        # Setup logging
        self.logger = logging.getLogger(f"UAP.{agent_id}")
        
        # Agent configuration
        self.config = kwargs
        
        # Initialize heartbeat task
        self._heartbeat_task: Optional[asyncio.Task] = None
    
    # ═══════════════════════════════════════════════════════════════
    # REQUIRED ABSTRACT METHODS (UAP-001 Compliance)
    # ═══════════════════════════════════════════════════════════════
    
    @abstractmethod
    async def startup(self) -> None:
        """
        Agent startup lifecycle method.
        
        MUST be implemented by all UAP agents.
        Should call super().startup() to ensure proper registration.
        
        Compliance: UAP-001 - Required method
        """
        try:
            self.logger.info(f"🚀 Starting UAP agent '{self.agent_id}'")
            self._startup_time = datetime.now()
            self._health_status = AgentStatus.HEALTHY
            
            # Validate protocol support (UAP-002 compliance)
            required_protocols = [ProtocolType.MCP, ProtocolType.A2A, ProtocolType.CROSS_PROTOCOL]
            for protocol in required_protocols:
                if protocol not in self.protocol_support:
                    raise UAPError(f"Agent must support required protocol: {protocol.value}")
            
            # Register with component registry (REG-001 compliance)
            tools = await self.get_mcp_tools()
            success = await COMPONENT_REGISTRY.register_agent(
                agent_id=self.agent_id,
                capabilities=self.capabilities,
                protocols=self.protocol_support,
                tools=tools,
                metadata=self.get_agent_metadata()
            )
            
            if not success:
                raise UAPError(f"Failed to register agent '{self.agent_id}' with component registry")
            
            # Start heartbeat monitoring (MON-001 compliance)
            self._heartbeat_task = asyncio.create_task(self._heartbeat_loop())
            
            self.logger.info(f"✅ UAP agent '{self.agent_id}' started successfully")
            
        except Exception as e:
            self.logger.error(f"❌ Error starting agent '{self.agent_id}': {e}")
            self._health_status = AgentStatus.UNHEALTHY
            raise
    
    @abstractmethod
    async def shutdown(self) -> None:
        """
        Agent shutdown lifecycle method.
        
        MUST be implemented by all UAP agents.
        Should call super().shutdown() to ensure proper cleanup.
        
        Compliance: UAP-001 - Required method
        """
        try:
            self.logger.info(f"🛑 Shutting down UAP agent '{self.agent_id}'")
            self._shutdown_requested = True
            self._health_status = AgentStatus.STOPPING
            
            # Cancel heartbeat task
            if self._heartbeat_task:
                self._heartbeat_task.cancel()
                try:
                    await self._heartbeat_task
                except asyncio.CancelledError:
                    pass
            
            # Unregister from component registry
            await COMPONENT_REGISTRY.unregister_agent(self.agent_id)
            
            self._health_status = AgentStatus.OFFLINE
            self.logger.info(f"✅ UAP agent '{self.agent_id}' shutdown complete")
            
        except Exception as e:
            self.logger.error(f"❌ Error shutting down agent '{self.agent_id}': {e}")
            raise
    
    @abstractmethod
    def get_agent_info(self) -> Dict[str, Any]:
        """
        Get agent information for discovery and monitoring.
        
        MUST be implemented by all UAP agents.
        
        Compliance: UAP-001 - Required method
        """
        uptime = 0
        if self._startup_time:
            uptime = (datetime.now() - self._startup_time).total_seconds()
        
        return {
            "agent_id": self.agent_id,
            "capabilities": self.capabilities,
            "protocol_support": [p.value for p in self.protocol_support],
            "status": self._health_status.value,
            "uptime_seconds": uptime,
            "request_count": self._request_count,
            "error_count": self._error_count,
            "last_heartbeat": self._last_heartbeat.isoformat()
        }
    
    @abstractmethod
    async def handle_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """
        Handle incoming agent messages.
        
        MUST be implemented by all UAP agents.
        
        Compliance: UAP-001 - Required method
        """
        try:
            self._request_count += 1
            
            # Route to appropriate handler based on protocol
            if message.protocol == ProtocolType.MCP:
                return await self._handle_mcp_message(message)
            elif message.protocol == ProtocolType.A2A:
                return await self._handle_a2a_message(message)
            elif message.protocol == ProtocolType.CROSS_PROTOCOL:
                return await self._handle_cross_protocol_message(message)
            else:
                raise UAPError(f"Unsupported protocol: {message.protocol}")
                
        except Exception as e:
            self._error_count += 1
            self.logger.error(f"❌ Error handling message: {e}")
            
            # Return error response
            return AgentMessage(
                agent_id=self.agent_id,
                target_agent=message.agent_id,
                action="error",
                parameters={"error": str(e), "original_action": message.action},
                correlation_id=message.correlation_id,
                protocol=message.protocol,
                message_type=MessageType.ERROR
            )
    
    # ═══════════════════════════════════════════════════════════════
    # MCP PROTOCOL IMPLEMENTATION (COM-002 Compliance)
    # ═══════════════════════════════════════════════════════════════
    
    @abstractmethod
    async def get_mcp_tools(self) -> List[MCPToolDefinition]:
        """
        Get MCP tool definitions for this agent.
        
        MUST be implemented by all UAP agents.
        
        Compliance: COM-002 - MCP Tool Integration
        """
        pass
    
    @abstractmethod
    async def execute_mcp_tool(self, tool_name: str, parameters: Dict[str, Any]) -> MCPResponse:
        """
        Execute an MCP tool.
        
        MUST be implemented by all UAP agents.
        
        Compliance: COM-002 - MCP Tool Integration
        """
        pass
    
    async def _handle_mcp_message(self, message: AgentMessage) -> AgentMessage:
        """Handle MCP protocol messages"""
        try:
            start_time = time.time()
            
            # Execute MCP tool
            response = await self.execute_mcp_tool(message.action, message.parameters)
            
            # Update execution time
            response.execution_time = time.time() - start_time
            response.agent_id = self.agent_id
            response.tool_name = message.action
            
            # Convert to agent message
            return AgentMessage(
                agent_id=self.agent_id,
                target_agent=message.agent_id,
                action="mcp_response",
                parameters=response.to_dict(),
                correlation_id=message.correlation_id,
                protocol=ProtocolType.MCP,
                message_type=MessageType.RESPONSE
            )
            
        except Exception as e:
            return AgentMessage(
                agent_id=self.agent_id,
                target_agent=message.agent_id,
                action="mcp_error",
                parameters={
                    "success": False,
                    "error": str(e),
                    "tool_name": message.action
                },
                correlation_id=message.correlation_id,
                protocol=ProtocolType.MCP,
                message_type=MessageType.ERROR
            )
    
    # ═══════════════════════════════════════════════════════════════
    # A2A PROTOCOL IMPLEMENTATION (COM-001 Compliance)
    # ═══════════════════════════════════════════════════════════════
    
    @abstractmethod
    async def handle_a2a_message(self, message: AgentMessage) -> AgentMessage:
        """
        Handle Agent-to-Agent communication messages.
        
        MUST be implemented by all UAP agents.
        
        Compliance: COM-001 - A2A Communication Standard
        """
        pass
    
    async def send_a2a_message(
        self,
        target_agent: str,
        action: str,
        parameters: Dict[str, Any],
        timeout_seconds: float = 30.0
    ) -> AgentMessage:
        """
        Send A2A message to another agent.
        
        Compliance: COM-001 - A2A Communication Standard
        """
        message = AgentMessage(
            agent_id=self.agent_id,
            target_agent=target_agent,
            action=action,
            parameters=parameters,
            protocol=ProtocolType.A2A,
            metadata={"timeout_seconds": timeout_seconds}
        )
        
        # This would typically be sent through a message bus
        # For now, we'll implement direct routing via registry
        target_registration = await COMPONENT_REGISTRY.get_agent_info(target_agent)
        if not target_registration:
            raise UAPError(f"Target agent '{target_agent}' not found")
        
        self.logger.info(f"📤 Sending A2A message to '{target_agent}': {action}")
        
        # In a real implementation, this would be routed through the message bus
        # For now, return a placeholder response
        return AgentMessage(
            agent_id=target_agent,
            target_agent=self.agent_id,
            action="a2a_ack",
            parameters={"acknowledged": True},
            protocol=ProtocolType.A2A,
            message_type=MessageType.RESPONSE
        )
    
    async def _handle_a2a_message(self, message: AgentMessage) -> AgentMessage:
        """Handle A2A protocol messages"""
        return await self.handle_a2a_message(message)
    
    # ═══════════════════════════════════════════════════════════════
    # CROSS-PROTOCOL IMPLEMENTATION (COM-003 Compliance)
    # ═══════════════════════════════════════════════════════════════
    
    async def handle_cross_protocol_request(self, request: CrossProtocolRequest) -> Dict[str, Any]:
        """
        Handle cross-protocol requests that may use multiple protocols.
        
        Compliance: COM-003 - Cross-Protocol Orchestration
        """
        optimal_protocol = request.determine_optimal_protocol()
        
        if optimal_protocol == ProtocolType.MCP and request.requires_tool_call:
            # Execute as MCP tool call
            tools = await self.get_mcp_tools()
            matching_tools = [t for t in tools if any(cap in request.target_capabilities for cap in self.capabilities)]
            
            if matching_tools:
                response = await self.execute_mcp_tool(matching_tools[0].name, request.parameters)
                return response.to_dict()
        
        elif optimal_protocol == ProtocolType.A2A and request.requires_agent_collaboration:
            # Execute as A2A collaboration
            message = AgentMessage(
                agent_id=request.initiating_agent,
                target_agent=self.agent_id,
                action="collaborate",
                parameters=request.parameters,
                protocol=ProtocolType.A2A
            )
            
            response = await self.handle_a2a_message(message)
            return response.to_dict()
        
        else:
            # Mixed protocol workflow
            return {
                "success": True,
                "result": "Cross-protocol request processed",
                "protocol_used": optimal_protocol.value
            }
    
    async def _handle_cross_protocol_message(self, message: AgentMessage) -> AgentMessage:
        """Handle cross-protocol messages"""
        try:
            # Extract cross-protocol request from message
            request = CrossProtocolRequest(
                request_id=message.correlation_id,
                initiating_agent=message.agent_id,
                target_capabilities=message.parameters.get("capabilities", []),
                parameters=message.parameters.get("parameters", {}),
                requires_tool_call=message.parameters.get("requires_tool_call", False),
                requires_agent_collaboration=message.parameters.get("requires_agent_collaboration", False)
            )
            
            result = await self.handle_cross_protocol_request(request)
            
            return AgentMessage(
                agent_id=self.agent_id,
                target_agent=message.agent_id,
                action="cross_protocol_response",
                parameters=result,
                correlation_id=message.correlation_id,
                protocol=ProtocolType.CROSS_PROTOCOL,
                message_type=MessageType.RESPONSE
            )
            
        except Exception as e:
            return AgentMessage(
                agent_id=self.agent_id,
                target_agent=message.agent_id,
                action="cross_protocol_error",
                parameters={"error": str(e)},
                correlation_id=message.correlation_id,
                protocol=ProtocolType.CROSS_PROTOCOL,
                message_type=MessageType.ERROR
            )
    
    # ═══════════════════════════════════════════════════════════════
    # CASCADE WORKFLOW SUPPORT (CASCADE-001 Compliance)
    # ═══════════════════════════════════════════════════════════════
    
    async def execute_in_cascade(self, cascade_context: CascadeContext) -> CascadeResult:
        """
        Execute agent functionality within a cascade workflow.
        
        Compliance: CASCADE-001 - Cascade Compatibility
        """
        try:
            self._cascade_context = cascade_context
            start_time = time.time()
            
            self.logger.info(
                f"🔄 Executing cascade step {cascade_context.step_number}/{cascade_context.total_steps}"
            )
            
            # Execute primary function with cascade parameters
            result = await self.execute_primary_function(**cascade_context.parameters)
            
            execution_time = time.time() - start_time
            
            return CascadeResult(
                success=True,
                result=result,
                step_number=cascade_context.step_number,
                execution_time=execution_time,
                metadata={
                    "agent_id": self.agent_id,
                    "cascade_id": cascade_context.cascade_id
                }
            )
            
        except Exception as e:
            self.logger.error(f"❌ Cascade execution error: {e}")
            
            if cascade_context.rollback_enabled:
                await self.handle_cascade_rollback(e, cascade_context)
            
            return CascadeResult(
                success=False,
                error=str(e),
                step_number=cascade_context.step_number,
                can_rollback=cascade_context.rollback_enabled
            )
        finally:
            self._cascade_context = None
    
    async def execute_primary_function(self, **kwargs) -> Any:
        """
        Execute the agent's primary function.
        Should be overridden by subclasses to implement actual functionality.
        """
        return f"Primary function executed by {self.agent_id}"
    
    async def handle_cascade_rollback(self, error: Exception, context: CascadeContext) -> None:
        """
        Handle rollback operations for cascade failures.
        Can be overridden by subclasses for custom rollback logic.
        """
        self.logger.warning(f"⏪ Performing cascade rollback for step {context.step_number}")
        # Default rollback implementation - override for custom behavior
    
    # ═══════════════════════════════════════════════════════════════
    # HEALTH MONITORING (MON-001, MON-002 Compliance)
    # ═══════════════════════════════════════════════════════════════
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Perform agent health check.
        
        Compliance: REG-002 - Discovery Methods
        """
        return {
            "status": self._health_status.value,
            "last_heartbeat": self._last_heartbeat.isoformat(),
            "active_connections": 0,  # Override in subclass if needed
            "processed_requests": self._request_count,
            "error_count": self._error_count,
            "uptime_seconds": (datetime.now() - self._startup_time).total_seconds() if self._startup_time else 0,
            "cpu_usage": 0.0,  # Override in subclass if monitoring is available
            "memory_usage": 0.0  # Override in subclass if monitoring is available
        }
    
    async def get_performance_metrics(self) -> Dict[str, float]:
        """
        Get performance metrics for monitoring.
        
        Compliance: MON-002 - Performance Monitoring
        """
        uptime = (datetime.now() - self._startup_time).total_seconds() if self._startup_time else 1
        
        return {
            "avg_response_time": 0.0,  # Override in subclass for actual measurement
            "requests_per_second": self._request_count / uptime,
            "success_rate": (self._request_count - self._error_count) / max(self._request_count, 1),
            "error_rate": self._error_count / max(self._request_count, 1)
        }
    
    async def _heartbeat_loop(self):
        """Background heartbeat monitoring loop"""
        while not self._shutdown_requested:
            try:
                self._last_heartbeat = datetime.now()
                
                health_data = await self.health_check()
                await COMPONENT_REGISTRY.heartbeat(self.agent_id, health_data)
                
                await asyncio.sleep(30)  # Heartbeat every 30 seconds
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"❌ Heartbeat error: {e}")
                await asyncio.sleep(30)
    
    # ═══════════════════════════════════════════════════════════════
    # UTILITY METHODS
    # ═══════════════════════════════════════════════════════════════
    
    def get_agent_metadata(self) -> Dict[str, Any]:
        """Get agent metadata for registration"""
        return {
            "version": "2.0.0",
            "framework": "UAP",
            "compliance_level": "Level 2",
            "startup_time": self._startup_time.isoformat() if self._startup_time else None,
            **self.config
        }
    
    def get_capabilities(self) -> List[str]:
        """Get agent capabilities (REG-002 compliance)"""
        return self.capabilities.copy()
    
    def get_supported_protocols(self) -> List[ProtocolType]:
        """Get supported protocols (REG-002 compliance)"""
        return self.protocol_support.copy()
    
    def get_available_tools(self) -> List[Dict[str, Any]]:
        """Get available tools in dictionary format"""
        # This would normally call get_mcp_tools() but we need to handle it synchronously
        return [
            {
                "name": f"{self.agent_id}_primary_function",
                "description": f"Primary function of {self.agent_id}",
                "agent_id": self.agent_id
            }
        ]
    
    def get_agent_status(self) -> AgentStatus:
        """Get current agent status (REG-002 compliance)"""
        return self._health_status 