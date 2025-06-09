#!/usr/bin/env python3
"""
UAP Component Registry
======================

Central registry for agent discovery, capability management, and system coordination.
Implements agent registration, health monitoring, and capability discovery.

Compliance: REG-001, REG-002, MON-001, MON-002
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Set
from dataclasses import dataclass, asdict
from collections import defaultdict
import threading

from ..protocols.message_types import (
    ProtocolType, AgentStatus, AgentCapability, AgentHealthStatus,
    MCPToolDefinition, AgentNotFoundError, CapabilityNotFoundError
)


@dataclass
class AgentRegistration:
    """Agent registration data structure"""
    agent_id: str
    capabilities: List[str]
    supported_protocols: List[ProtocolType]
    tool_definitions: List[MCPToolDefinition]
    dependencies: List[str]
    registration_time: str
    last_heartbeat: str
    health_status: AgentHealthStatus
    metadata: Dict[str, Any]
    
    def is_healthy(self, heartbeat_timeout: float = 60.0) -> bool:
        """Check if agent is considered healthy based on heartbeat"""
        try:
            last_beat = datetime.fromisoformat(self.last_heartbeat)
            now = datetime.now()
            return (now - last_beat).total_seconds() < heartbeat_timeout
        except:
            return False


class ComponentRegistry:
    """
    Central registry for all UAP agents and their capabilities.
    
    Provides:
    - Agent registration and discovery
    - Capability mapping and routing
    - Health monitoring and status tracking
    - Tool definition management
    """
    
    def __init__(self):
        self.agents: Dict[str, AgentRegistration] = {}
        self.capabilities_map: Dict[str, List[str]] = defaultdict(list)
        self.tools_map: Dict[str, str] = {}  # tool_name -> agent_id
        self.protocol_agents: Dict[ProtocolType, Set[str]] = defaultdict(set)
        
        # Performance metrics
        self.registration_count = 0
        self.lookup_count = 0
        self.heartbeat_count = 0
        
        # Thread safety
        self._lock = threading.Lock()
        
        # Setup logging
        self.logger = logging.getLogger(f"UAP.ComponentRegistry")
        
        # Start background maintenance
        self._maintenance_task = None
        self._shutdown_event = threading.Event()
    
    async def start(self):
        """Start the component registry"""
        self.logger.info("🏛️ Starting UAP Component Registry")
        self._maintenance_task = asyncio.create_task(self._maintenance_loop())
    
    async def shutdown(self):
        """Shutdown the component registry"""
        self.logger.info("🏛️ Shutting down UAP Component Registry")
        self._shutdown_event.set()
        if self._maintenance_task:
            self._maintenance_task.cancel()
    
    async def register_agent(
        self,
        agent_id: str,
        capabilities: List[str],
        protocols: List[ProtocolType],
        tools: List[MCPToolDefinition],
        dependencies: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> bool:
        """
        Register an agent with the component registry.
        
        Compliance: REG-001 - Agent Registration
        """
        try:
            with self._lock:
                now = datetime.now().isoformat()
                
                # Create health status
                health_status = AgentHealthStatus(
                    agent_id=agent_id,
                    status=AgentStatus.HEALTHY,
                    last_heartbeat=now
                )
                
                # Create registration
                registration = AgentRegistration(
                    agent_id=agent_id,
                    capabilities=capabilities,
                    supported_protocols=protocols,
                    tool_definitions=tools,
                    dependencies=dependencies or [],
                    registration_time=now,
                    last_heartbeat=now,
                    health_status=health_status,
                    metadata=metadata or {}
                )
                
                # Store registration
                self.agents[agent_id] = registration
                
                # Update capability mappings
                for capability in capabilities:
                    self.capabilities_map[capability].append(agent_id)
                
                # Update tool mappings
                for tool in tools:
                    self.tools_map[tool.name] = agent_id
                
                # Update protocol mappings
                for protocol in protocols:
                    self.protocol_agents[protocol].add(agent_id)
                
                self.registration_count += 1
                
                self.logger.info(
                    f"✅ Registered agent '{agent_id}' with {len(capabilities)} capabilities, "
                    f"{len(tools)} tools, {len(protocols)} protocols"
                )
                
                return True
                
        except Exception as e:
            self.logger.error(f"❌ Error registering agent '{agent_id}': {e}")
            return False
    
    async def unregister_agent(self, agent_id: str) -> bool:
        """Unregister an agent from the registry"""
        try:
            with self._lock:
                if agent_id not in self.agents:
                    return False
                
                registration = self.agents[agent_id]
                
                # Remove from capability mappings
                for capability in registration.capabilities:
                    if agent_id in self.capabilities_map[capability]:
                        self.capabilities_map[capability].remove(agent_id)
                        if not self.capabilities_map[capability]:
                            del self.capabilities_map[capability]
                
                # Remove from tool mappings
                tools_to_remove = [
                    tool_name for tool_name, mapped_agent_id in self.tools_map.items()
                    if mapped_agent_id == agent_id
                ]
                for tool_name in tools_to_remove:
                    del self.tools_map[tool_name]
                
                # Remove from protocol mappings
                for protocol in registration.supported_protocols:
                    self.protocol_agents[protocol].discard(agent_id)
                
                # Remove registration
                del self.agents[agent_id]
                
                self.logger.info(f"✅ Unregistered agent '{agent_id}'")
                return True
                
        except Exception as e:
            self.logger.error(f"❌ Error unregistering agent '{agent_id}': {e}")
            return False
    
    async def heartbeat(self, agent_id: str, health_data: Optional[Dict[str, Any]] = None) -> bool:
        """
        Update agent heartbeat and health status.
        
        Compliance: MON-001 - Telemetry Requirements
        """
        try:
            with self._lock:
                if agent_id not in self.agents:
                    return False
                
                registration = self.agents[agent_id]
                now = datetime.now().isoformat()
                
                # Update heartbeat
                registration.last_heartbeat = now
                registration.health_status.last_heartbeat = now
                
                # Update health data if provided
                if health_data:
                    if 'status' in health_data:
                        registration.health_status.status = AgentStatus(health_data['status'])
                    if 'active_connections' in health_data:
                        registration.health_status.active_connections = health_data['active_connections']
                    if 'processed_requests' in health_data:
                        registration.health_status.processed_requests = health_data['processed_requests']
                    if 'error_count' in health_data:
                        registration.health_status.error_count = health_data['error_count']
                    if 'custom_metrics' in health_data:
                        registration.health_status.custom_metrics.update(health_data['custom_metrics'])
                
                self.heartbeat_count += 1
                return True
                
        except Exception as e:
            self.logger.error(f"❌ Error updating heartbeat for agent '{agent_id}': {e}")
            return False
    
    async def is_registered(self, agent_id: str) -> bool:
        """Check if agent is registered"""
        with self._lock:
            return agent_id in self.agents
    
    async def get_agent_info(self, agent_id: str) -> Optional[AgentRegistration]:
        """Get detailed agent information"""
        with self._lock:
            self.lookup_count += 1
            return self.agents.get(agent_id)
    
    async def find_agents_by_capability(self, capability: str) -> List[str]:
        """
        Find all agents that provide a specific capability.
        
        Compliance: REG-002 - Capability Discovery
        """
        with self._lock:
            self.lookup_count += 1
            return self.capabilities_map.get(capability, []).copy()
    
    async def find_agents_by_protocol(self, protocol: ProtocolType) -> List[str]:
        """Find all agents that support a specific protocol"""
        with self._lock:
            self.lookup_count += 1
            return list(self.protocol_agents.get(protocol, set()))
    
    async def find_tool_agent(self, tool_name: str) -> Optional[str]:
        """Find the agent that provides a specific tool"""
        with self._lock:
            self.lookup_count += 1
            return self.tools_map.get(tool_name)
    
    async def get_all_capabilities(self) -> List[str]:
        """Get list of all available capabilities"""
        with self._lock:
            return list(self.capabilities_map.keys())
    
    async def get_all_tools(self) -> List[MCPToolDefinition]:
        """Get list of all available tools"""
        with self._lock:
            tools = []
            for registration in self.agents.values():
                tools.extend(registration.tool_definitions)
            return tools
    
    async def get_healthy_agents(self, heartbeat_timeout: float = 60.0) -> List[str]:
        """Get list of healthy agents based on heartbeat status"""
        with self._lock:
            healthy_agents = []
            for agent_id, registration in self.agents.items():
                if registration.is_healthy(heartbeat_timeout):
                    healthy_agents.append(agent_id)
            return healthy_agents
    
    async def get_agent_health(self, agent_id: str) -> Optional[AgentHealthStatus]:
        """Get health status for specific agent"""
        with self._lock:
            registration = self.agents.get(agent_id)
            return registration.health_status if registration else None
    
    async def route_capability_request(
        self,
        capability: str,
        preferred_protocol: Optional[ProtocolType] = None
    ) -> Optional[str]:
        """
        Route a capability request to the best available agent.
        
        Returns agent_id of the selected agent or None if no suitable agent found.
        """
        try:
            # Find agents with the capability
            capable_agents = await self.find_agents_by_capability(capability)
            
            if not capable_agents:
                raise CapabilityNotFoundError(capability)
            
            # Filter by healthy agents
            healthy_agents = await self.get_healthy_agents()
            available_agents = [a for a in capable_agents if a in healthy_agents]
            
            if not available_agents:
                self.logger.warning(f"No healthy agents available for capability '{capability}'")
                return None
            
            # If protocol preference specified, filter by protocol support
            if preferred_protocol:
                protocol_agents = await self.find_agents_by_protocol(preferred_protocol)
                available_agents = [a for a in available_agents if a in protocol_agents]
                
                if not available_agents:
                    self.logger.warning(
                        f"No agents with capability '{capability}' support protocol '{preferred_protocol.value}'"
                    )
                    return None
            
            # Simple round-robin selection (could be enhanced with load balancing)
            selected_agent = available_agents[0]
            
            self.logger.info(
                f"🎯 Routed capability '{capability}' to agent '{selected_agent}'"
            )
            
            return selected_agent
            
        except Exception as e:
            self.logger.error(f"❌ Error routing capability request: {e}")
            return None
    
    async def get_registry_stats(self) -> Dict[str, Any]:
        """
        Get registry performance and status statistics.
        
        Compliance: MON-002 - Performance Monitoring
        """
        with self._lock:
            healthy_count = len(await self.get_healthy_agents())
            
            protocol_stats = {}
            for protocol, agents in self.protocol_agents.items():
                protocol_stats[protocol.value] = len(agents)
            
            return {
                "total_agents": len(self.agents),
                "healthy_agents": healthy_count,
                "total_capabilities": len(self.capabilities_map),
                "total_tools": len(self.tools_map),
                "protocol_distribution": protocol_stats,
                "performance_metrics": {
                    "registration_count": self.registration_count,
                    "lookup_count": self.lookup_count,
                    "heartbeat_count": self.heartbeat_count
                }
            }
    
    async def validate_dependencies(self, agent_id: str) -> Dict[str, bool]:
        """Validate that all agent dependencies are available"""
        registration = await self.get_agent_info(agent_id)
        if not registration:
            return {}
        
        dependency_status = {}
        for dependency in registration.dependencies:
            dependency_status[dependency] = await self.is_registered(dependency)
        
        return dependency_status
    
    async def _maintenance_loop(self):
        """Background maintenance tasks"""
        while not self._shutdown_event.is_set():
            try:
                await self._cleanup_stale_agents()
                await asyncio.sleep(30)  # Run every 30 seconds
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"❌ Error in maintenance loop: {e}")
                await asyncio.sleep(30)
    
    async def _cleanup_stale_agents(self):
        """Remove agents that haven't sent heartbeat in reasonable time"""
        stale_timeout = 300.0  # 5 minutes
        stale_agents = []
        
        with self._lock:
            for agent_id, registration in self.agents.items():
                if not registration.is_healthy(stale_timeout):
                    stale_agents.append(agent_id)
        
        for agent_id in stale_agents:
            self.logger.warning(f"⚠️ Removing stale agent '{agent_id}'")
            await self.unregister_agent(agent_id)


# Global registry instance
COMPONENT_REGISTRY = ComponentRegistry()


# Convenience functions for common operations
async def register_agent(agent_id: str, capabilities: List[str], protocols: List[ProtocolType], 
                        tools: List[MCPToolDefinition], **kwargs) -> bool:
    """Convenience function for agent registration"""
    return await COMPONENT_REGISTRY.register_agent(agent_id, capabilities, protocols, tools, **kwargs)


async def find_capability_agent(capability: str, protocol: Optional[ProtocolType] = None) -> Optional[str]:
    """Convenience function for capability routing"""
    return await COMPONENT_REGISTRY.route_capability_request(capability, protocol)


async def agent_heartbeat(agent_id: str, health_data: Optional[Dict[str, Any]] = None) -> bool:
    """Convenience function for agent heartbeat"""
    return await COMPONENT_REGISTRY.heartbeat(agent_id, health_data)


async def get_registry_status() -> Dict[str, Any]:
    """Convenience function for registry status"""
    return await COMPONENT_REGISTRY.get_registry_stats() 