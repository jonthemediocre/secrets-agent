#!/usr/bin/env python3
"""
Example UAP Agent Template
==========================

Complete example of a UAP Level 2 compliant agent demonstrating all required features:
- UAPAgentBase inheritance
- Multi-protocol support (MCP, A2A, Cross-Protocol)
- Tool registration and execution
- Cascade workflow compatibility
- Health monitoring and metrics
- Compliance validation

Use this as a template for creating new UAP-compliant agents.
"""

import asyncio
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime

from ..core.uap_agent_base import UAPAgentBase
from ..protocols.message_types import (
    ProtocolType, AgentMessage, MCPToolDefinition, MCPResponse,
    CascadeContext, CascadeResult
)


class ExampleUAPAgent(UAPAgentBase):
    """
    Example UAP Level 2 compliant agent.
    
    Demonstrates proper implementation of all UAP requirements:
    - Protocol support
    - Tool definitions
    - Agent-to-agent communication
    - Cascade compatibility
    - Health monitoring
    """
    
    def __init__(self, agent_id: str = "example_uap_agent", **kwargs):
        """Initialize example UAP agent"""
        super().__init__(agent_id, **kwargs)
        
        # REQUIRED: Set protocol support (UAP-002 compliance)
        self.protocol_support = [
            ProtocolType.MCP,
            ProtocolType.A2A,
            ProtocolType.CROSS_PROTOCOL
        ]
        
        # REQUIRED: Set agent capabilities (REG-002 compliance)
        self.capabilities = [
            "data_processing",
            "text_analysis",
            "example_operations",
            "demonstration"
        ]
        
        # Agent-specific configuration
        self.processing_queue = []
        self.operation_count = 0
        
        self.logger.info(f"🤖 Example UAP Agent '{self.agent_id}' initialized")
    
    # ═══════════════════════════════════════════════════════════════
    # REQUIRED UAP-001 ABSTRACT METHODS
    # ═══════════════════════════════════════════════════════════════
    
    async def startup(self) -> None:
        """
        Agent startup - REQUIRED by UAP-001
        
        MUST call super().startup() for proper UAP registration
        """
        try:
            # Call parent startup for UAP compliance (REG-001)
            await super().startup()
            
            # Agent-specific startup logic
            self.logger.info(f"🚀 {self.agent_id} startup complete")
            
        except Exception as e:
            self.logger.error(f"❌ Startup error: {e}")
            raise
    
    async def shutdown(self) -> None:
        """
        Agent shutdown - REQUIRED by UAP-001
        
        MUST call super().shutdown() for proper cleanup
        """
        try:
            # Agent-specific cleanup
            self.processing_queue.clear()
            
            # Call parent shutdown for UAP compliance
            await super().shutdown()
            
            self.logger.info(f"🛑 {self.agent_id} shutdown complete")
            
        except Exception as e:
            self.logger.error(f"❌ Shutdown error: {e}")
            raise
    
    def get_agent_info(self) -> Dict[str, Any]:
        """
        Get agent information - REQUIRED by UAP-001
        """
        base_info = super().get_agent_info()
        
        # Add agent-specific information
        base_info.update({
            "queue_size": len(self.processing_queue),
            "operation_count": self.operation_count,
            "agent_type": "example",
            "version": "1.0.0"
        })
        
        return base_info
    
    async def handle_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """
        Handle incoming messages - REQUIRED by UAP-001
        
        This is automatically routed by the parent class to appropriate protocol handlers
        """
        return await super().handle_message(message)
    
    # ═══════════════════════════════════════════════════════════════
    # MCP PROTOCOL IMPLEMENTATION (COM-002 Compliance)
    # ═══════════════════════════════════════════════════════════════
    
    async def get_mcp_tools(self) -> List[MCPToolDefinition]:
        """
        Get MCP tool definitions - REQUIRED by COM-002
        """
        return [
            MCPToolDefinition(
                name="process_data",
                description="Process data with various algorithms and return results",
                parameters={
                    "type": "object",
                    "properties": {
                        "data": {
                            "type": "string",
                            "description": "Data to process"
                        },
                        "algorithm": {
                            "type": "string",
                            "description": "Processing algorithm to use",
                            "enum": ["tokenize", "analyze", "summarize"]
                        },
                        "options": {
                            "type": "object",
                            "description": "Optional processing parameters"
                        }
                    },
                    "required": ["data", "algorithm"]
                },
                agent_id=self.agent_id,
                required_parameters=["data", "algorithm"]
            ),
            
            MCPToolDefinition(
                name="analyze_text",
                description="Perform text analysis and return insights",
                parameters={
                    "type": "object",
                    "properties": {
                        "text": {
                            "type": "string",
                            "description": "Text to analyze"
                        },
                        "analysis_type": {
                            "type": "string",
                            "description": "Type of analysis to perform",
                            "enum": ["sentiment", "keywords", "entities", "summary"]
                        }
                    },
                    "required": ["text", "analysis_type"]
                },
                agent_id=self.agent_id,
                required_parameters=["text", "analysis_type"]
            ),
            
            MCPToolDefinition(
                name="demo_operation",
                description="Demonstration operation showing UAP capabilities",
                parameters={
                    "type": "object",
                    "properties": {
                        "operation": {
                            "type": "string",
                            "description": "Operation to demonstrate"
                        },
                        "parameters": {
                            "type": "object",
                            "description": "Operation parameters"
                        }
                    },
                    "required": ["operation"]
                },
                agent_id=self.agent_id,
                required_parameters=["operation"]
            )
        ]
    
    async def execute_mcp_tool(self, tool_name: str, parameters: Dict[str, Any]) -> MCPResponse:
        """
        Execute MCP tool - REQUIRED by COM-002
        
        MUST validate parameters and return MCPResponse format
        """
        try:
            # Parameter validation (TOOL-002 compliance)
            validation_result = await self._validate_tool_parameters(tool_name, parameters)
            if not validation_result["valid"]:
                return MCPResponse(
                    success=False,
                    errors=validation_result["errors"],
                    tool_name=tool_name,
                    agent_id=self.agent_id
                )
            
            self.operation_count += 1
            
            # Route to specific tool implementation
            if tool_name == "process_data":
                result = await self._process_data(parameters)
            elif tool_name == "analyze_text":
                result = await self._analyze_text(parameters)
            elif tool_name == "demo_operation":
                result = await self._demo_operation(parameters)
            else:
                return MCPResponse(
                    success=False,
                    errors=[f"Unknown tool: {tool_name}"],
                    tool_name=tool_name,
                    agent_id=self.agent_id
                )
            
            # TOOL-003 compliance: Standard response format
            return MCPResponse(
                success=True,
                result=result,
                metadata={
                    "tool": tool_name,
                    "agent": self.agent_id,
                    "operation_count": self.operation_count
                },
                agent_id=self.agent_id,
                tool_name=tool_name
            )
            
        except Exception as e:
            self.logger.error(f"❌ Tool execution error [{tool_name}]: {e}")
            return MCPResponse(
                success=False,
                errors=[str(e)],
                tool_name=tool_name,
                agent_id=self.agent_id
            )
    
    async def _validate_tool_parameters(self, tool_name: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Validate tool parameters against schema"""
        tools = await self.get_mcp_tools()
        tool_def = next((t for t in tools if t.name == tool_name), None)
        
        if not tool_def:
            return {"valid": False, "errors": [f"Unknown tool: {tool_name}"]}
        
        errors = []
        
        # Check required parameters
        for required_param in tool_def.required_parameters:
            if required_param not in parameters:
                errors.append(f"Missing required parameter: {required_param}")
        
        return {"valid": len(errors) == 0, "errors": errors}
    
    # ═══════════════════════════════════════════════════════════════
    # TOOL IMPLEMENTATIONS
    # ═══════════════════════════════════════════════════════════════
    
    async def _process_data(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Process data according to specified algorithm"""
        data = parameters["data"]
        algorithm = parameters["algorithm"]
        options = parameters.get("options", {})
        
        # Simulate processing
        await asyncio.sleep(0.1)  # Simulate work
        
        if algorithm == "tokenize":
            tokens = data.split()
            return {
                "algorithm": algorithm,
                "input_length": len(data),
                "tokens": tokens,
                "token_count": len(tokens)
            }
        
        elif algorithm == "analyze":
            return {
                "algorithm": algorithm,
                "input_length": len(data),
                "word_count": len(data.split()),
                "character_distribution": {char: data.count(char) for char in set(data.lower()) if char.isalpha()},
                "analysis_time": datetime.now().isoformat()
            }
        
        elif algorithm == "summarize":
            words = data.split()
            summary = " ".join(words[:min(10, len(words))])
            return {
                "algorithm": algorithm,
                "original_length": len(data),
                "summary": summary,
                "compression_ratio": len(summary) / len(data) if data else 0
            }
        
        else:
            raise ValueError(f"Unknown algorithm: {algorithm}")
    
    async def _analyze_text(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Perform text analysis"""
        text = parameters["text"]
        analysis_type = parameters["analysis_type"]
        
        # Simulate analysis
        await asyncio.sleep(0.1)
        
        if analysis_type == "sentiment":
            # Simple sentiment analysis simulation
            positive_words = ["good", "great", "excellent", "amazing", "wonderful"]
            negative_words = ["bad", "terrible", "awful", "horrible", "disappointing"]
            
            words = text.lower().split()
            positive_count = sum(1 for word in words if word in positive_words)
            negative_count = sum(1 for word in words if word in negative_words)
            
            if positive_count > negative_count:
                sentiment = "positive"
            elif negative_count > positive_count:
                sentiment = "negative"
            else:
                sentiment = "neutral"
            
            return {
                "analysis_type": analysis_type,
                "sentiment": sentiment,
                "positive_words": positive_count,
                "negative_words": negative_count,
                "confidence": abs(positive_count - negative_count) / max(len(words), 1)
            }
        
        elif analysis_type == "keywords":
            words = text.lower().split()
            word_freq = {}
            for word in words:
                if len(word) > 3:  # Skip short words
                    word_freq[word] = word_freq.get(word, 0) + 1
            
            # Get top keywords
            keywords = sorted(word_freq.items(), key=lambda x: x[1], reverse=True)[:5]
            
            return {
                "analysis_type": analysis_type,
                "keywords": [{"word": word, "frequency": freq} for word, freq in keywords],
                "total_words": len(words),
                "unique_words": len(set(words))
            }
        
        elif analysis_type == "entities":
            # Simple entity extraction simulation
            words = text.split()
            entities = []
            
            for word in words:
                if word.istitle() and len(word) > 2:
                    entities.append({
                        "text": word,
                        "type": "PERSON" if word.endswith("son") or word.endswith("sen") else "ENTITY"
                    })
            
            return {
                "analysis_type": analysis_type,
                "entities": entities,
                "entity_count": len(entities)
            }
        
        elif analysis_type == "summary":
            sentences = text.split(".")
            summary = sentences[0] if sentences else text[:100]
            
            return {
                "analysis_type": analysis_type,
                "summary": summary.strip(),
                "original_sentences": len(sentences),
                "summary_ratio": len(summary) / len(text) if text else 0
            }
        
        else:
            raise ValueError(f"Unknown analysis type: {analysis_type}")
    
    async def _demo_operation(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Demonstration operation"""
        operation = parameters["operation"]
        params = parameters.get("parameters", {})
        
        await asyncio.sleep(0.05)  # Simulate work
        
        return {
            "operation": operation,
            "parameters": params,
            "timestamp": datetime.now().isoformat(),
            "agent_id": self.agent_id,
            "status": "completed",
            "demo_data": {
                "random_number": hash(operation) % 1000,
                "operation_length": len(operation),
                "param_count": len(params)
            }
        }
    
    # ═══════════════════════════════════════════════════════════════
    # A2A PROTOCOL IMPLEMENTATION (COM-001 Compliance)
    # ═══════════════════════════════════════════════════════════════
    
    async def handle_a2a_message(self, message: AgentMessage) -> AgentMessage:
        """
        Handle Agent-to-Agent messages - REQUIRED by COM-001
        """
        try:
            action = message.action
            parameters = message.parameters
            
            self.logger.info(f"📥 Handling A2A message: {action}")
            
            if action == "collaborate":
                result = await self._handle_collaboration(parameters)
            elif action == "query_status":
                result = await self._handle_status_query(parameters)
            elif action == "share_data":
                result = await self._handle_data_sharing(parameters)
            elif action == "coordinate_task":
                result = await self._handle_task_coordination(parameters)
            else:
                result = {
                    "error": f"Unknown A2A action: {action}",
                    "supported_actions": ["collaborate", "query_status", "share_data", "coordinate_task"]
                }
            
            return AgentMessage(
                agent_id=self.agent_id,
                target_agent=message.agent_id,
                action=f"{action}_response",
                parameters={
                    "success": "error" not in result,
                    "result": result,
                    "processed_by": self.agent_id
                },
                correlation_id=message.correlation_id,
                protocol=ProtocolType.A2A
            )
            
        except Exception as e:
            self.logger.error(f"❌ A2A message handling error: {e}")
            
            return AgentMessage(
                agent_id=self.agent_id,
                target_agent=message.agent_id,
                action="error",
                parameters={"error": str(e)},
                correlation_id=message.correlation_id,
                protocol=ProtocolType.A2A
            )
    
    async def _handle_collaboration(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle collaboration request"""
        task = parameters.get("task", "unknown")
        data = parameters.get("data", {})
        
        return {
            "collaboration_response": f"Ready to collaborate on {task}",
            "agent_capabilities": self.capabilities,
            "available_tools": [tool.name for tool in await self.get_mcp_tools()],
            "data_received": bool(data)
        }
    
    async def _handle_status_query(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle status query"""
        return {
            "agent_status": self._health_status.value,
            "queue_size": len(self.processing_queue),
            "operation_count": self.operation_count,
            "uptime": (datetime.now() - self._startup_time).total_seconds() if self._startup_time else 0,
            "capabilities": self.capabilities
        }
    
    async def _handle_data_sharing(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle data sharing request"""
        data_type = parameters.get("data_type", "general")
        
        if data_type == "metrics":
            return await self.get_performance_metrics()
        elif data_type == "capabilities":
            return {"capabilities": self.capabilities}
        elif data_type == "tools":
            tools = await self.get_mcp_tools()
            return {"tools": [{"name": t.name, "description": t.description} for t in tools]}
        else:
            return {"shared_data": f"Sample data for type: {data_type}"}
    
    async def _handle_task_coordination(self, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Handle task coordination"""
        task_id = parameters.get("task_id", "unknown")
        task_type = parameters.get("task_type", "general")
        
        # Add to processing queue
        self.processing_queue.append({
            "task_id": task_id,
            "task_type": task_type,
            "timestamp": datetime.now().isoformat(),
            "status": "queued"
        })
        
        return {
            "task_accepted": True,
            "task_id": task_id,
            "queue_position": len(self.processing_queue),
            "estimated_completion": "5-10 seconds"
        }
    
    # ═══════════════════════════════════════════════════════════════
    # CASCADE WORKFLOW SUPPORT (CASCADE-001 Compliance)
    # ═══════════════════════════════════════════════════════════════
    
    async def execute_primary_function(self, **kwargs) -> Any:
        """
        Execute primary function - REQUIRED for cascade compatibility
        """
        operation = kwargs.get("operation", "default_operation")
        data = kwargs.get("data", "sample data")
        
        self.logger.info(f"🔄 Executing primary function: {operation}")
        
        # Simulate primary function execution
        await asyncio.sleep(0.1)
        
        result = {
            "operation": operation,
            "processed_data": f"Processed: {data}",
            "agent_id": self.agent_id,
            "timestamp": datetime.now().isoformat(),
            "success": True
        }
        
        return result
    
    # ═══════════════════════════════════════════════════════════════
    # HEALTH MONITORING (MON-001, MON-002 Compliance)
    # ═══════════════════════════════════════════════════════════════
    
    async def health_check(self) -> Dict[str, Any]:
        """
        Enhanced health check - REQUIRED by MON-001
        """
        base_health = await super().health_check()
        
        # Add agent-specific health metrics
        base_health.update({
            "queue_health": {
                "queue_size": len(self.processing_queue),
                "max_queue_size": 100,
                "queue_utilization": len(self.processing_queue) / 100
            },
            "operation_metrics": {
                "total_operations": self.operation_count,
                "avg_operations_per_minute": self.operation_count / max(
                    (datetime.now() - self._startup_time).total_seconds() / 60, 1
                ) if self._startup_time else 0
            },
            "custom_status": "healthy" if len(self.processing_queue) < 50 else "busy"
        })
        
        return base_health
    
    async def get_performance_metrics(self) -> Dict[str, float]:
        """
        Enhanced performance metrics - REQUIRED by MON-002
        """
        base_metrics = await super().get_performance_metrics()
        
        # Add agent-specific performance metrics
        uptime = (datetime.now() - self._startup_time).total_seconds() if self._startup_time else 1
        
        base_metrics.update({
            "operations_per_second": self.operation_count / uptime,
            "queue_efficiency": 1.0 - (len(self.processing_queue) / 100),
            "tool_utilization": min(self.operation_count / (uptime * 10), 1.0),  # Assume 10 ops/sec max
            "memory_efficiency": 0.85,  # Simulated
            "cpu_efficiency": 0.75  # Simulated
        })
        
        return base_metrics


# ═══════════════════════════════════════════════════════════════
# EXAMPLE USAGE AND TESTING
# ═══════════════════════════════════════════════════════════════

async def demo_uap_agent():
    """Demonstrate UAP agent functionality"""
    
    # Create and start agent
    agent = ExampleUAPAgent("demo_agent_001")
    
    try:
        # Start the agent (triggers UAP registration)
        await agent.startup()
        
        print("🤖 UAP Agent Demo Started")
        print("=" * 50)
        
        # Demo 1: MCP Tool Execution
        print("\n📝 Demo 1: MCP Tool Execution")
        response = await agent.execute_mcp_tool("process_data", {
            "data": "This is sample data to process with the UAP agent",
            "algorithm": "tokenize"
        })
        print(f"Tool Response: {response.to_dict()}")
        
        # Demo 2: A2A Message Handling
        print("\n📤 Demo 2: A2A Message Handling")
        a2a_message = AgentMessage(
            agent_id="test_sender",
            target_agent=agent.agent_id,
            action="collaborate",
            parameters={"task": "data_analysis", "priority": "high"},
            protocol=ProtocolType.A2A
        )
        response = await agent.handle_a2a_message(a2a_message)
        print(f"A2A Response: {response.to_dict()}")
        
        # Demo 3: Cascade Execution
        print("\n🔄 Demo 3: Cascade Execution")
        cascade_context = CascadeContext(
            cascade_id="demo_cascade_001",
            correlation_id="cascade_demo",
            step_number=1,
            total_steps=3,
            parameters={"operation": "cascade_demo", "data": "cascade test data"}
        )
        cascade_result = await agent.execute_in_cascade(cascade_context)
        print(f"Cascade Result: {cascade_result.to_dict()}")
        
        # Demo 4: Health and Performance Monitoring
        print("\n🏥 Demo 4: Health and Performance Monitoring")
        health = await agent.health_check()
        metrics = await agent.get_performance_metrics()
        print(f"Health Status: {health}")
        print(f"Performance Metrics: {metrics}")
        
        # Demo 5: Agent Information
        print("\n📊 Demo 5: Agent Information")
        info = agent.get_agent_info()
        print(f"Agent Info: {info}")
        
        print("\n✅ UAP Agent Demo Complete")
        
    finally:
        # Clean shutdown
        await agent.shutdown()


if __name__ == "__main__":
    # Run the demo
    asyncio.run(demo_uap_agent()) 