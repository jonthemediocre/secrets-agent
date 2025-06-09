#!/usr/bin/env python3
"""
UAP Protocol Message Types
==========================

Standard message types and data structures for Universal Agent Protocol communication.
Supports MCP, A2A, and Cross-Protocol message formats.

Compliance: UAP-002, COM-001, COM-002, COM-003
"""

import uuid
from datetime import datetime
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, field, asdict
from enum import Enum


class ProtocolType(Enum):
    """Supported protocol types for UAP agents"""
    MCP = "MCP"                    # Model Control Protocol
    A2A = "A2A"                    # Agent-to-Agent communication  
    CROSS_PROTOCOL = "CROSS_PROTOCOL"  # Mixed protocol workflows
    HTTP = "HTTP"                  # REST API communication
    WEBSOCKET = "WEBSOCKET"        # WebSocket real-time communication


class MessageType(Enum):
    """Message types for agent communication"""
    REQUEST = "request"
    RESPONSE = "response"
    NOTIFICATION = "notification"
    ERROR = "error"
    HEARTBEAT = "heartbeat"


class AgentStatus(Enum):
    """Agent operational status"""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    STARTING = "starting"
    STOPPING = "stopping"
    OFFLINE = "offline"


@dataclass
class AgentMessage:
    """Base message structure for all UAP communications"""
    agent_id: str
    target_agent: Optional[str] = None
    action: str = ""
    parameters: Dict[str, Any] = field(default_factory=dict)
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    protocol: ProtocolType = ProtocolType.A2A
    message_type: MessageType = MessageType.REQUEST
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert message to dictionary format"""
        result = asdict(self)
        result['protocol'] = self.protocol.value
        result['message_type'] = self.message_type.value
        return result
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'AgentMessage':
        """Create message from dictionary"""
        if 'protocol' in data and isinstance(data['protocol'], str):
            data['protocol'] = ProtocolType(data['protocol'])
        if 'message_type' in data and isinstance(data['message_type'], str):
            data['message_type'] = MessageType(data['message_type'])
        return cls(**data)


@dataclass
class MCPToolDefinition:
    """MCP tool definition structure"""
    name: str
    description: str
    parameters: Dict[str, Any]
    agent_id: str
    required_parameters: List[str] = field(default_factory=list)
    
    def to_mcp_format(self) -> Dict[str, Any]:
        """Convert to standard MCP tool format"""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters,
            "agent_metadata": {
                "agent_id": self.agent_id,
                "required": self.required_parameters
            }
        }


@dataclass
class MCPRequest:
    """MCP tool execution request"""
    tool_name: str
    parameters: Dict[str, Any]
    agent_id: str
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_agent_message(self) -> AgentMessage:
        """Convert to standard agent message"""
        return AgentMessage(
            agent_id=self.agent_id,
            action=self.tool_name,
            parameters=self.parameters,
            correlation_id=self.correlation_id,
            timestamp=self.timestamp,
            protocol=ProtocolType.MCP
        )


@dataclass
class MCPResponse:
    """MCP tool execution response"""
    success: bool
    result: Any = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    errors: Optional[List[str]] = None
    warnings: Optional[List[str]] = None
    execution_time: float = 0.0
    agent_id: str = ""
    tool_name: str = ""
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert response to dictionary format"""
        return {
            "success": self.success,
            "result": self.result,
            "metadata": {
                **self.metadata,
                "execution_time": self.execution_time,
                "agent_id": self.agent_id,
                "tool_name": self.tool_name,
                "timestamp": self.timestamp
            },
            "errors": self.errors,
            "warnings": self.warnings
        }


@dataclass  
class A2AMessage:
    """Agent-to-Agent communication message"""
    source_agent: str
    target_agent: str
    action: str
    parameters: Dict[str, Any] = field(default_factory=dict)
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    timeout_seconds: float = 30.0
    requires_response: bool = True
    
    def to_agent_message(self) -> AgentMessage:
        """Convert to standard agent message"""
        return AgentMessage(
            agent_id=self.source_agent,
            target_agent=self.target_agent,
            action=self.action,
            parameters=self.parameters,
            correlation_id=self.correlation_id,
            timestamp=self.timestamp,
            protocol=ProtocolType.A2A,
            metadata={
                "timeout_seconds": self.timeout_seconds,
                "requires_response": self.requires_response
            }
        )


@dataclass
class CascadeContext:
    """Context for cascade workflow execution"""
    cascade_id: str
    correlation_id: str
    step_number: int
    total_steps: int
    parameters: Dict[str, Any] = field(default_factory=dict)
    previous_results: List[Any] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    timeout_seconds: float = 300.0
    rollback_enabled: bool = True
    
    def next_step(self) -> 'CascadeContext':
        """Create context for next cascade step"""
        return CascadeContext(
            cascade_id=self.cascade_id,
            correlation_id=self.correlation_id,
            step_number=self.step_number + 1,
            total_steps=self.total_steps,
            parameters=self.parameters.copy(),
            previous_results=self.previous_results.copy(),
            metadata=self.metadata.copy(),
            timeout_seconds=self.timeout_seconds,
            rollback_enabled=self.rollback_enabled
        )


@dataclass
class CascadeResult:
    """Result from cascade step execution"""
    success: bool
    result: Any = None
    step_number: int = 0
    execution_time: float = 0.0
    error: Optional[str] = None
    warnings: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    can_rollback: bool = True
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert result to dictionary format"""
        return {
            "success": self.success,
            "result": self.result,
            "step_number": self.step_number,
            "execution_time": self.execution_time,
            "error": self.error,
            "warnings": self.warnings,
            "metadata": self.metadata,
            "can_rollback": self.can_rollback
        }


@dataclass
class CrossProtocolRequest:
    """Request that may use multiple protocols"""
    request_id: str
    initiating_agent: str
    target_capabilities: List[str]
    parameters: Dict[str, Any] = field(default_factory=dict)
    preferred_protocol: Optional[ProtocolType] = None
    requires_tool_call: bool = False
    requires_agent_collaboration: bool = False
    correlation_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    timestamp: str = field(default_factory=lambda: datetime.now().isoformat())
    
    def determine_optimal_protocol(self) -> ProtocolType:
        """Determine optimal protocol based on request characteristics"""
        if self.preferred_protocol:
            return self.preferred_protocol
        
        if self.requires_tool_call and not self.requires_agent_collaboration:
            return ProtocolType.MCP
        elif self.requires_agent_collaboration and not self.requires_tool_call:
            return ProtocolType.A2A
        else:
            return ProtocolType.CROSS_PROTOCOL


@dataclass
class AgentCapability:
    """Agent capability definition"""
    name: str
    description: str
    input_schema: Dict[str, Any]
    output_schema: Dict[str, Any]
    supported_protocols: List[ProtocolType]
    complexity_level: str = "medium"  # low, medium, high
    execution_time_estimate: float = 5.0  # seconds
    
    def supports_protocol(self, protocol: ProtocolType) -> bool:
        """Check if capability supports given protocol"""
        return protocol in self.supported_protocols


@dataclass
class AgentHealthStatus:
    """Agent health and status information"""
    agent_id: str
    status: AgentStatus
    last_heartbeat: str = field(default_factory=lambda: datetime.now().isoformat())
    active_connections: int = 0
    processed_requests: int = 0
    error_count: int = 0
    uptime_seconds: float = 0.0
    cpu_usage: float = 0.0
    memory_usage: float = 0.0
    custom_metrics: Dict[str, float] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert health status to dictionary"""
        result = asdict(self)
        result['status'] = self.status.value
        return result


@dataclass
class ComplianceLevel:
    """UAP compliance level information"""
    level: str  # CRITICAL, MANDATORY, RECOMMENDED
    rule_id: str
    description: str
    implemented: bool = False
    test_passed: bool = False
    
    def is_compliant(self) -> bool:
        """Check if compliance requirement is met"""
        return self.implemented and self.test_passed


# Standard error types for UAP communications
class UAPError(Exception):
    """Base exception for UAP framework errors"""
    pass


class ProtocolError(UAPError):
    """Protocol-specific communication errors"""
    def __init__(self, protocol: ProtocolType, message: str):
        self.protocol = protocol
        super().__init__(f"[{protocol.value}] {message}")


class AgentNotFoundError(UAPError):
    """Agent not found in registry"""
    def __init__(self, agent_id: str):
        super().__init__(f"Agent '{agent_id}' not found in component registry")


class CapabilityNotFoundError(UAPError):
    """Requested capability not available"""
    def __init__(self, capability: str, agent_id: str = ""):
        if agent_id:
            super().__init__(f"Capability '{capability}' not found in agent '{agent_id}'")
        else:
            super().__init__(f"Capability '{capability}' not found in any registered agent")


class ComplianceViolationError(UAPError):
    """UAP compliance rule violation"""
    def __init__(self, rule_id: str, description: str):
        super().__init__(f"Compliance violation [{rule_id}]: {description}") 