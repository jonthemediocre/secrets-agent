#!/usr/bin/env python3
"""
UAP Protocol Handlers
=====================

Protocol-specific handlers for MCP, A2A, and Cross-Protocol communication.
Provides standardized interfaces for different communication patterns.

Compliance: COM-001, COM-002, COM-003
"""

import asyncio
import logging
import time
from typing import Dict, List, Any, Optional, Union
from dataclasses import asdict

from ..protocols.message_types import (
    ProtocolType, AgentMessage, MCPRequest, MCPResponse, A2AMessage,
    CrossProtocolRequest, MessageType, UAPError, ProtocolError
)
from .component_registry import COMPONENT_REGISTRY


class MCPHandler:
    """
    Model Control Protocol handler.
    
    Handles MCP tool registration, discovery, and execution.
    Compliance: COM-002 - MCP Tool Integration
    """
    
    def __init__(self):
        self.logger = logging.getLogger("UAP.MCPHandler")
        self._tool_cache: Dict[str, str] = {}  # tool_name -> agent_id
        self._last_cache_update = 0
        self._cache_ttl = 60  # seconds
    
    async def register_tool(self, agent_id: str, tool_name: str) -> bool:
        """Register a tool with the MCP handler"""
        try:
            self._tool_cache[tool_name] = agent_id
            self.logger.info(f"📝 Registered MCP tool '{tool_name}' from agent '{agent_id}'")
            return True
        except Exception as e:
            self.logger.error(f"❌ Error registering tool '{tool_name}': {e}")
            return False
    
    async def discover_tools(self, capability_filter: Optional[str] = None) -> List[Dict[str, Any]]:
        """
        Discover available MCP tools.
        
        Args:
            capability_filter: Optional capability to filter tools by
        
        Returns:
            List of tool definitions
        """
        try:
            # Refresh tool cache if needed
            await self._refresh_tool_cache()
            
            tools = await COMPONENT_REGISTRY.get_all_tools()
            
            if capability_filter:
                # Filter tools by capability
                filtered_tools = []
                for tool in tools:
                    agent_registration = await COMPONENT_REGISTRY.get_agent_info(tool.agent_id)
                    if agent_registration and capability_filter in agent_registration.capabilities:
                        filtered_tools.append(tool.to_mcp_format())
                return filtered_tools
            
            return [tool.to_mcp_format() for tool in tools]
            
        except Exception as e:
            self.logger.error(f"❌ Error discovering tools: {e}")
            return []
    
    async def execute_tool(
        self,
        tool_name: str,
        parameters: Dict[str, Any],
        requesting_agent: str = "unknown"
    ) -> MCPResponse:
        """
        Execute an MCP tool.
        
        Args:
            tool_name: Name of the tool to execute
            parameters: Tool parameters
            requesting_agent: Agent requesting the execution
        
        Returns:
            MCPResponse with execution results
        """
        start_time = time.time()
        
        try:
            # Find agent that provides this tool
            agent_id = await COMPONENT_REGISTRY.find_tool_agent(tool_name)
            
            if not agent_id:
                return MCPResponse(
                    success=False,
                    errors=[f"Tool '{tool_name}' not found"],
                    tool_name=tool_name,
                    execution_time=time.time() - start_time
                )
            
            # Validate agent is healthy
            healthy_agents = await COMPONENT_REGISTRY.get_healthy_agents()
            if agent_id not in healthy_agents:
                return MCPResponse(
                    success=False,
                    errors=[f"Agent '{agent_id}' providing tool '{tool_name}' is not healthy"],
                    tool_name=tool_name,
                    execution_time=time.time() - start_time
                )
            
            # Create MCP request message
            message = AgentMessage(
                agent_id=requesting_agent,
                target_agent=agent_id,
                action=tool_name,
                parameters=parameters,
                protocol=ProtocolType.MCP
            )
            
            self.logger.info(f"🔧 Executing MCP tool '{tool_name}' on agent '{agent_id}'")
            
            # In a real implementation, this would route through a message bus
            # For now, we'll simulate successful execution
            execution_time = time.time() - start_time
            
            return MCPResponse(
                success=True,
                result={
                    "tool": tool_name,
                    "agent": agent_id,
                    "status": "executed",
                    "parameters": parameters
                },
                metadata={
                    "requesting_agent": requesting_agent,
                    "target_agent": agent_id
                },
                execution_time=execution_time,
                agent_id=agent_id,
                tool_name=tool_name
            )
            
        except Exception as e:
            execution_time = time.time() - start_time
            self.logger.error(f"❌ Error executing tool '{tool_name}': {e}")
            
            return MCPResponse(
                success=False,
                errors=[str(e)],
                tool_name=tool_name,
                execution_time=execution_time
            )
    
    async def validate_tool_parameters(
        self,
        tool_name: str,
        parameters: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Validate tool parameters against schema.
        
        Compliance: TOOL-002 - Tool Parameter Validation
        """
        try:
            tools = await self.discover_tools()
            tool_def = next((t for t in tools if t["name"] == tool_name), None)
            
            if not tool_def:
                return {"valid": False, "errors": [f"Tool '{tool_name}' not found"]}
            
            # Basic parameter validation
            tool_params = tool_def.get("parameters", {})
            required_params = tool_params.get("required", [])
            
            errors = []
            
            # Check required parameters
            for param in required_params:
                if param not in parameters:
                    errors.append(f"Missing required parameter: {param}")
            
            # Check parameter types (basic validation)
            param_properties = tool_params.get("properties", {})
            for param_name, param_value in parameters.items():
                if param_name in param_properties:
                    expected_type = param_properties[param_name].get("type")
                    if expected_type and not self._validate_parameter_type(param_value, expected_type):
                        errors.append(f"Parameter '{param_name}' has incorrect type")
            
            return {
                "valid": len(errors) == 0,
                "errors": errors,
                "tool_definition": tool_def
            }
            
        except Exception as e:
            return {
                "valid": False,
                "errors": [f"Validation error: {str(e)}"]
            }
    
    def _validate_parameter_type(self, value: Any, expected_type: str) -> bool:
        """Basic type validation helper"""
        type_map = {
            "string": str,
            "number": (int, float),
            "integer": int,
            "boolean": bool,
            "array": list,
            "object": dict
        }
        
        expected_python_type = type_map.get(expected_type)
        if expected_python_type:
            return isinstance(value, expected_python_type)
        
        return True  # Unknown type, pass validation
    
    async def _refresh_tool_cache(self):
        """Refresh the tool cache from registry"""
        current_time = time.time()
        if current_time - self._last_cache_update > self._cache_ttl:
            try:
                tools = await COMPONENT_REGISTRY.get_all_tools()
                self._tool_cache = {tool.name: tool.agent_id for tool in tools}
                self._last_cache_update = current_time
            except Exception as e:
                self.logger.error(f"❌ Error refreshing tool cache: {e}")


class A2AHandler:
    """
    Agent-to-Agent communication handler.
    
    Handles direct agent communication and collaboration.
    Compliance: COM-001 - A2A Communication Standard
    """
    
    def __init__(self):
        self.logger = logging.getLogger("UAP.A2AHandler")
        self._message_timeout = 30.0  # seconds
        self._pending_messages: Dict[str, asyncio.Future] = {}
    
    async def send_message(
        self,
        source_agent: str,
        target_agent: str,
        action: str,
        parameters: Dict[str, Any],
        timeout_seconds: float = 30.0,
        requires_response: bool = True
    ) -> AgentMessage:
        """
        Send A2A message between agents.
        
        Args:
            source_agent: ID of sending agent
            target_agent: ID of target agent
            action: Action to perform
            parameters: Message parameters
            timeout_seconds: Message timeout
            requires_response: Whether response is expected
        
        Returns:
            Response message from target agent
        """
        try:
            # Validate target agent exists and is healthy
            target_registration = await COMPONENT_REGISTRY.get_agent_info(target_agent)
            if not target_registration:
                raise ProtocolError(ProtocolType.A2A, f"Target agent '{target_agent}' not found")
            
            healthy_agents = await COMPONENT_REGISTRY.get_healthy_agents()
            if target_agent not in healthy_agents:
                raise ProtocolError(ProtocolType.A2A, f"Target agent '{target_agent}' is not healthy")
            
            # Create A2A message
            message = A2AMessage(
                source_agent=source_agent,
                target_agent=target_agent,
                action=action,
                parameters=parameters,
                timeout_seconds=timeout_seconds,
                requires_response=requires_response
            )
            
            self.logger.info(f"📤 Sending A2A message: {source_agent} → {target_agent} [{action}]")
            
            if requires_response:
                # Create future for response
                response_future = asyncio.Future()
                self._pending_messages[message.correlation_id] = response_future
                
                try:
                    # In a real implementation, this would send through message bus
                    # For now, simulate successful delivery
                    await asyncio.sleep(0.1)  # Simulate network delay
                    
                    # Simulate response
                    response = AgentMessage(
                        agent_id=target_agent,
                        target_agent=source_agent,
                        action=f"{action}_response",
                        parameters={
                            "success": True,
                            "result": f"Action '{action}' processed by {target_agent}",
                            "original_parameters": parameters
                        },
                        correlation_id=message.correlation_id,
                        protocol=ProtocolType.A2A,
                        message_type=MessageType.RESPONSE
                    )
                    
                    response_future.set_result(response)
                    return await asyncio.wait_for(response_future, timeout=timeout_seconds)
                    
                finally:
                    # Clean up pending message
                    self._pending_messages.pop(message.correlation_id, None)
            
            else:
                # Fire-and-forget message
                return AgentMessage(
                    agent_id=target_agent,
                    target_agent=source_agent,
                    action="message_sent",
                    parameters={"acknowledged": True},
                    correlation_id=message.correlation_id,
                    protocol=ProtocolType.A2A,
                    message_type=MessageType.NOTIFICATION
                )
                
        except asyncio.TimeoutError:
            raise ProtocolError(ProtocolType.A2A, f"Message timeout after {timeout_seconds} seconds")
        except Exception as e:
            self.logger.error(f"❌ Error sending A2A message: {e}")
            raise ProtocolError(ProtocolType.A2A, str(e))
    
    async def handle_response(self, response: AgentMessage) -> bool:
        """Handle incoming A2A response"""
        try:
            correlation_id = response.correlation_id
            
            if correlation_id in self._pending_messages:
                future = self._pending_messages[correlation_id]
                if not future.done():
                    future.set_result(response)
                    self.logger.info(f"📥 Received A2A response for correlation {correlation_id}")
                    return True
            
            self.logger.warning(f"⚠️ Received response for unknown correlation ID: {correlation_id}")
            return False
            
        except Exception as e:
            self.logger.error(f"❌ Error handling A2A response: {e}")
            return False
    
    async def broadcast_message(
        self,
        source_agent: str,
        capability: str,
        action: str,
        parameters: Dict[str, Any]
    ) -> List[AgentMessage]:
        """
        Broadcast message to all agents with specific capability.
        
        Args:
            source_agent: ID of sending agent
            capability: Target capability
            action: Action to perform
            parameters: Message parameters
        
        Returns:
            List of responses from target agents
        """
        try:
            # Find agents with the capability
            target_agents = await COMPONENT_REGISTRY.find_agents_by_capability(capability)
            
            if not target_agents:
                self.logger.warning(f"⚠️ No agents found with capability '{capability}'")
                return []
            
            # Filter by healthy agents
            healthy_agents = await COMPONENT_REGISTRY.get_healthy_agents()
            target_agents = [agent for agent in target_agents if agent in healthy_agents]
            
            if not target_agents:
                self.logger.warning(f"⚠️ No healthy agents found with capability '{capability}'")
                return []
            
            self.logger.info(f"📢 Broadcasting to {len(target_agents)} agents with capability '{capability}'")
            
            # Send messages concurrently
            tasks = []
            for target_agent in target_agents:
                if target_agent != source_agent:  # Don't send to self
                    task = self.send_message(
                        source_agent=source_agent,
                        target_agent=target_agent,
                        action=action,
                        parameters=parameters,
                        timeout_seconds=10.0  # Shorter timeout for broadcast
                    )
                    tasks.append(task)
            
            if not tasks:
                return []
            
            # Wait for all responses
            responses = await asyncio.gather(*tasks, return_exceptions=True)
            
            # Filter out exceptions
            valid_responses = []
            for response in responses:
                if isinstance(response, AgentMessage):
                    valid_responses.append(response)
                elif isinstance(response, Exception):
                    self.logger.warning(f"⚠️ Broadcast error: {response}")
            
            self.logger.info(f"✅ Broadcast complete: {len(valid_responses)}/{len(tasks)} responses")
            return valid_responses
            
        except Exception as e:
            self.logger.error(f"❌ Error broadcasting message: {e}")
            return []


class CrossProtocolHandler:
    """
    Cross-protocol communication handler.
    
    Handles mixed protocol workflows and optimal protocol selection.
    Compliance: COM-003 - Cross-Protocol Orchestration
    """
    
    def __init__(self, mcp_handler: MCPHandler, a2a_handler: A2AHandler):
        self.mcp_handler = mcp_handler
        self.a2a_handler = a2a_handler
        self.logger = logging.getLogger("UAP.CrossProtocolHandler")
    
    async def execute_request(
        self,
        request: CrossProtocolRequest,
        requesting_agent: str = "orchestrator"
    ) -> Dict[str, Any]:
        """
        Execute a cross-protocol request using optimal protocol selection.
        
        Args:
            request: Cross-protocol request specification
            requesting_agent: Agent making the request
        
        Returns:
            Execution results
        """
        try:
            start_time = time.time()
            
            # Determine optimal protocol
            optimal_protocol = request.determine_optimal_protocol()
            
            self.logger.info(
                f"🔄 Executing cross-protocol request using {optimal_protocol.value} protocol"
            )
            
            result = None
            
            if optimal_protocol == ProtocolType.MCP:
                result = await self._execute_via_mcp(request, requesting_agent)
            
            elif optimal_protocol == ProtocolType.A2A:
                result = await self._execute_via_a2a(request, requesting_agent)
            
            elif optimal_protocol == ProtocolType.CROSS_PROTOCOL:
                result = await self._execute_mixed_protocol(request, requesting_agent)
            
            execution_time = time.time() - start_time
            
            return {
                "success": True,
                "result": result,
                "protocol_used": optimal_protocol.value,
                "execution_time": execution_time,
                "request_id": request.request_id
            }
            
        except Exception as e:
            execution_time = time.time() - start_time
            self.logger.error(f"❌ Cross-protocol execution error: {e}")
            
            return {
                "success": False,
                "error": str(e),
                "execution_time": execution_time,
                "request_id": request.request_id
            }
    
    async def _execute_via_mcp(
        self,
        request: CrossProtocolRequest,
        requesting_agent: str
    ) -> Any:
        """Execute request via MCP protocol"""
        # Find best tool for the capabilities
        tools = await self.mcp_handler.discover_tools()
        
        matching_tools = []
        for tool in tools:
            tool_agent = tool.get("agent_metadata", {}).get("agent_id")
            if tool_agent:
                agent_info = await COMPONENT_REGISTRY.get_agent_info(tool_agent)
                if agent_info:
                    # Check if agent has any of the target capabilities
                    if any(cap in agent_info.capabilities for cap in request.target_capabilities):
                        matching_tools.append(tool)
        
        if not matching_tools:
            raise UAPError("No suitable MCP tools found for capabilities")
        
        # Use the first matching tool
        selected_tool = matching_tools[0]
        tool_name = selected_tool["name"]
        
        # Execute the tool
        response = await self.mcp_handler.execute_tool(
            tool_name=tool_name,
            parameters=request.parameters,
            requesting_agent=requesting_agent
        )
        
        if not response.success:
            raise UAPError(f"MCP tool execution failed: {response.errors}")
        
        return response.result
    
    async def _execute_via_a2a(
        self,
        request: CrossProtocolRequest,
        requesting_agent: str
    ) -> Any:
        """Execute request via A2A protocol"""
        # Find agents with the required capabilities
        target_agents = []
        for capability in request.target_capabilities:
            agents = await COMPONENT_REGISTRY.find_agents_by_capability(capability)
            target_agents.extend(agents)
        
        # Remove duplicates and requesting agent
        target_agents = list(set(target_agents))
        if requesting_agent in target_agents:
            target_agents.remove(requesting_agent)
        
        if not target_agents:
            raise UAPError("No suitable agents found for capabilities")
        
        # Send to first available agent
        target_agent = target_agents[0]
        
        response = await self.a2a_handler.send_message(
            source_agent=requesting_agent,
            target_agent=target_agent,
            action="cross_protocol_request",
            parameters=request.parameters
        )
        
        return response.parameters
    
    async def _execute_mixed_protocol(
        self,
        request: CrossProtocolRequest,
        requesting_agent: str
    ) -> Any:
        """Execute request using mixed protocols"""
        results = []
        
        # If both tool calls and agent collaboration are needed
        if request.requires_tool_call:
            try:
                mcp_result = await self._execute_via_mcp(request, requesting_agent)
                results.append({
                    "protocol": "MCP",
                    "result": mcp_result
                })
            except Exception as e:
                self.logger.warning(f"⚠️ MCP execution failed: {e}")
        
        if request.requires_agent_collaboration:
            try:
                a2a_result = await self._execute_via_a2a(request, requesting_agent)
                results.append({
                    "protocol": "A2A",
                    "result": a2a_result
                })
            except Exception as e:
                self.logger.warning(f"⚠️ A2A execution failed: {e}")
        
        if not results:
            raise UAPError("All protocol executions failed")
        
        return {
            "mixed_protocol_results": results,
            "protocols_used": [r["protocol"] for r in results]
        }
    
    async def optimize_protocol_selection(
        self,
        capabilities: List[str],
        requires_tool_call: bool,
        requires_agent_collaboration: bool
    ) -> ProtocolType:
        """
        Optimize protocol selection based on current system state.
        
        Considers:
        - Agent availability
        - Tool availability  
        - System load
        - Network conditions
        """
        try:
            # Check MCP tool availability
            mcp_available = False
            if requires_tool_call:
                tools = await self.mcp_handler.discover_tools()
                for tool in tools:
                    tool_agent = tool.get("agent_metadata", {}).get("agent_id")
                    if tool_agent:
                        agent_info = await COMPONENT_REGISTRY.get_agent_info(tool_agent)
                        if agent_info and any(cap in agent_info.capabilities for cap in capabilities):
                            mcp_available = True
                            break
            
            # Check A2A agent availability
            a2a_available = False
            if requires_agent_collaboration:
                for capability in capabilities:
                    agents = await COMPONENT_REGISTRY.find_agents_by_capability(capability)
                    healthy_agents = await COMPONENT_REGISTRY.get_healthy_agents()
                    available_agents = [a for a in agents if a in healthy_agents]
                    if available_agents:
                        a2a_available = True
                        break
            
            # Select optimal protocol
            if requires_tool_call and requires_agent_collaboration:
                if mcp_available and a2a_available:
                    return ProtocolType.CROSS_PROTOCOL
                elif mcp_available:
                    return ProtocolType.MCP
                elif a2a_available:
                    return ProtocolType.A2A
            elif requires_tool_call and mcp_available:
                return ProtocolType.MCP
            elif requires_agent_collaboration and a2a_available:
                return ProtocolType.A2A
            
            # Default fallback
            return ProtocolType.CROSS_PROTOCOL
            
        except Exception as e:
            self.logger.error(f"❌ Error optimizing protocol selection: {e}")
            return ProtocolType.CROSS_PROTOCOL 