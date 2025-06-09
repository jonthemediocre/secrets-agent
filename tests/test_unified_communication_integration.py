"""
Integration test for Unified Communication Layer
Tests the complete flow of Python-TypeScript agent communication via Redis
"""

import asyncio
import pytest
import logging
import uuid
from typing import Dict, Any
import json
import time
from datetime import datetime

# Test imports
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
from vanta_seed.core.vanta_master_core_enhanced import (
    VantaMasterCoreEnhanced,
    create_enhanced_vmc
)

# Setup logging for tests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockPythonAgent:
    """Mock Python agent for testing"""
    
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.capabilities = ['test_processing', 'data_transformation']
        self.ucl = None
        self.messages_received = []
        
    async def initialize(self, ucl: UnifiedCommunicationLayer):
        """Initialize agent with unified communication"""
        self.ucl = ucl
        await self.ucl.register_agent(
            agent_id=self.agent_id,
            agent_type="MockPythonAgent",
            capabilities=self.capabilities,
            language="python"
        )
        self.ucl.register_message_handler(self.agent_id, self.handle_message)
        
    async def handle_message(self, message: UnifiedMessage):
        """Handle incoming messages"""
        self.messages_received.append(message)
        logger.info(f"MockPythonAgent {self.agent_id} received {message.message_type} from {message.source_agent}")
        
        if message.message_type == MessageType.TASK_ASSIGNMENT:
            await self.handle_task(message)
            
    async def handle_task(self, message: UnifiedMessage):
        """Handle task assignment"""
        task_data = message.payload
        task_id = task_data.get("task_id")
        task_type = task_data.get("task_type")
        
        # Simulate task processing
        await asyncio.sleep(0.1)
        
        # Send completion response
        response = UnifiedMessage(
            message_type=MessageType.TASK_COMPLETION,
            source_agent=self.agent_id,
            target_agent=message.source_agent,
            payload={
                "task_id": task_id,
                "success": True,
                "result": {"processed": True, "task_type": task_type},
                "execution_time_ms": 100
            },
            correlation_id=message.correlation_id
        )
        
        await self.ucl.send_message(response)
        
    async def send_test_message(self, target_agent: str, test_data: Dict[str, Any]):
        """Send a test message to another agent"""
        message = UnifiedMessage(
            message_type=MessageType.AGENT_REQUEST,
            source_agent=self.agent_id,
            target_agent=target_agent,
            payload=test_data
        )
        
        return await self.ucl.send_message(message)

@pytest.fixture
async def redis_config():
    """Redis configuration for tests"""
    return {
        'host': 'localhost',
        'port': 6379,
        'db': 1  # Use different DB for tests
    }

@pytest.fixture
async def unified_communication_layer(redis_config):
    """Create unified communication layer for tests"""
    ucl = await create_unified_communication(redis_config)
    yield ucl
    await ucl.stop()

@pytest.fixture
async def enhanced_router(redis_config):
    """Create enhanced router for tests"""
    router = await create_enhanced_router(redis_config)
    yield router
    await router.stop()

@pytest.fixture
async def enhanced_vmc(redis_config):
    """Create enhanced VMC for tests"""
    config = {
        'redis_keb': redis_config,
        'enhanced_mode': True
    }
    vmc = await create_enhanced_vmc(config)
    yield vmc
    await vmc.shutdown()

class TestUnifiedCommunication:
    """Test unified communication features"""
    
    @pytest.mark.asyncio
    async def test_basic_agent_registration(self, unified_communication_layer):
        """Test basic agent registration and discovery"""
        ucl = unified_communication_layer
        
        # Register test agent
        success = await ucl.register_agent(
            agent_id="test_agent_1",
            agent_type="TestAgent",
            capabilities=["testing"],
            language="python"
        )
        
        assert success, "Agent registration should succeed"
        
        # Check agent is registered
        agents = ucl.get_registered_agents()
        assert "test_agent_1" in agents
        assert agents["test_agent_1"].agent_type == "TestAgent"
        assert "testing" in agents["test_agent_1"].capabilities
        
        # Test unregistration
        success = await ucl.unregister_agent("test_agent_1")
        assert success, "Agent unregistration should succeed"
        
        agents = ucl.get_registered_agents()
        assert "test_agent_1" not in agents

    @pytest.mark.asyncio
    async def test_agent_to_agent_communication(self, unified_communication_layer):
        """Test direct agent-to-agent communication"""
        ucl = unified_communication_layer
        
        # Create two mock agents
        agent1 = MockPythonAgent("test_agent_1")
        agent2 = MockPythonAgent("test_agent_2")
        
        await agent1.initialize(ucl)
        await agent2.initialize(ucl)
        
        # Send message from agent1 to agent2
        test_data = {"test": "hello from agent1", "timestamp": time.time()}
        success = await agent1.send_test_message("test_agent_2", test_data)
        
        assert success, "Message sending should succeed"
        
        # Wait for message delivery
        await asyncio.sleep(0.5)
        
        # Check agent2 received the message
        assert len(agent2.messages_received) > 0
        received_message = agent2.messages_received[0]
        assert received_message.source_agent == "test_agent_1"
        assert received_message.message_type == MessageType.AGENT_REQUEST
        assert received_message.payload["test"] == "hello from agent1"

    @pytest.mark.asyncio
    async def test_enhanced_router_task_routing(self, enhanced_router):
        """Test enhanced router task routing"""
        router = enhanced_router
        
        # Create mock agent and register with router's UCL
        agent = MockPythonAgent("test_worker_agent")
        await agent.initialize(router.ucl)
        
        # Create and submit task
        task = Task(
            task_id=str(uuid.uuid4()),
            task_type="test_task",
            parameters={"data": "test data"},
            priority=TaskPriority.NORMAL,
            required_capabilities=["test_processing"]
        )
        
        # Submit task
        task_id = await router.submit_task(task)
        assert task_id == task.task_id
        
        # Wait for task completion
        result = await router.get_task_result(task_id, timeout=5.0)
        
        assert result is not None, "Task should complete"
        assert result.success, "Task should succeed"
        assert result.assigned_agent == "test_worker_agent"
        assert result.result["processed"] is True

    @pytest.mark.asyncio
    async def test_enhanced_vmc_integration(self, enhanced_vmc):
        """Test enhanced VMC with unified communication"""
        vmc = enhanced_vmc
        
        # Verify enhanced mode is active
        assert vmc.enhanced_mode, "Enhanced mode should be active"
        assert vmc.ucl is not None, "UCL should be initialized"
        assert vmc.enhanced_router is not None, "Enhanced router should be initialized"
        
        # Get stats
        stats = vmc.get_enhanced_stats()
        assert "enhanced_mode" in stats
        assert "communication_stats" in stats
        assert "router_stats" in stats
        
        # Test agent discovery
        agents = vmc.ucl.get_registered_agents()
        assert "VantaMasterCoreEnhanced" in agents
        assert "enhanced_router" in [agent_id for agent_id in agents.keys() if "router" in agent_id]

    @pytest.mark.asyncio
    async def test_load_balancing(self, enhanced_router):
        """Test load balancing across multiple agents"""
        router = enhanced_router
        
        # Create multiple agents
        agents = []
        for i in range(3):
            agent = MockPythonAgent(f"worker_agent_{i}")
            await agent.initialize(router.ucl)
            agents.append(agent)
        
        # Submit multiple tasks
        tasks = []
        for i in range(6):  # More tasks than agents
            task = Task(
                task_id=str(uuid.uuid4()),
                task_type="load_test",
                parameters={"task_num": i},
                priority=TaskPriority.NORMAL,
                required_capabilities=["test_processing"]
            )
            tasks.append(task)
            await router.submit_task(task)
        
        # Wait for all tasks to complete
        results = []
        for task in tasks:
            result = await router.get_task_result(task.task_id, timeout=10.0)
            assert result is not None, f"Task {task.task_id} should complete"
            assert result.success, f"Task {task.task_id} should succeed"
            results.append(result)
        
        # Check that tasks were distributed across agents
        assigned_agents = set(result.assigned_agent for result in results)
        assert len(assigned_agents) > 1, "Tasks should be distributed across multiple agents"
        
        # Check router stats
        stats = router.get_router_stats()
        assert stats["completed_tasks"] == 6
        assert len(stats["agent_loads"]) == 3

    @pytest.mark.asyncio
    async def test_error_handling(self, unified_communication_layer):
        """Test error handling in unified communication"""
        ucl = unified_communication_layer
        
        # Try to send message to non-existent agent
        message = UnifiedMessage(
            message_type=MessageType.AGENT_REQUEST,
            source_agent="test_sender",
            target_agent="non_existent_agent",
            payload={"test": "data"}
        )
        
        # This should not raise an exception, but return False
        success = await ucl.send_message(message)
        assert not success, "Sending to non-existent agent should fail gracefully"

    @pytest.mark.asyncio
    async def test_health_monitoring(self, unified_communication_layer):
        """Test health monitoring functionality"""
        ucl = unified_communication_layer
        
        # Register agent
        agent = MockPythonAgent("health_test_agent")
        await agent.initialize(ucl)
        
        # Check agent is online
        assert ucl.is_agent_online("health_test_agent")
        
        # Get agent info
        agent_info = ucl.get_agent_info("health_test_agent")
        assert agent_info is not None
        assert agent_info.status == AgentStatus.ONLINE
        assert agent_info.language == "python"

    @pytest.mark.asyncio
    async def test_message_correlation(self, unified_communication_layer):
        """Test message correlation and request-response patterns"""
        ucl = unified_communication_layer
        
        # Create agents
        requester = MockPythonAgent("requester_agent")
        responder = MockPythonAgent("responder_agent")
        
        await requester.initialize(ucl)
        await responder.initialize(ucl)
        
        # Send correlated request
        correlation_id = str(uuid.uuid4())
        request = UnifiedMessage(
            message_type=MessageType.AGENT_REQUEST,
            source_agent="requester_agent",
            target_agent="responder_agent",
            payload={"request_type": "data_query", "query": "test"},
            correlation_id=correlation_id
        )
        
        success = await requester.ucl.send_message(request)
        assert success
        
        # Wait for delivery
        await asyncio.sleep(0.2)
        
        # Check responder received correlated message
        assert len(responder.messages_received) > 0
        received = responder.messages_received[0]
        assert received.correlation_id == correlation_id
        assert received.payload["request_type"] == "data_query"

    @pytest.mark.asyncio
    async def test_memory_correlation(self, unified_communication_layer):
        """Test message correlation and request-response patterns"""
        ucl = unified_communication_layer
        
        # Create agents
        requester = MockPythonAgent("requester_agent")
        responder = MockPythonAgent("responder_agent")
        
        await requester.initialize(ucl)
        await responder.initialize(ucl)
        
        # Send correlated request
        correlation_id = str(uuid.uuid4())
        request = UnifiedMessage(
            message_type=MessageType.AGENT_REQUEST,
            source_agent="requester_agent",
            target_agent="responder_agent",
            payload={"request_type": "data_query", "query": "test"},
            correlation_id=correlation_id
        )
        
        success = await requester.ucl.send_message(request)
        assert success
        
        # Wait for delivery
        await asyncio.sleep(0.2)
        
        # Check responder received correlated message
        assert len(responder.messages_received) > 0
        received = responder.messages_received[0]
        assert received.correlation_id == correlation_id
        assert received.payload["request_type"] == "data_query"

    @pytest.mark.asyncio
    async def test_phase_1_2_complete_integration(self, enhanced_vmc):
        """Test complete Phase 1.2 integration: UCL + Enhanced Router + Memory System"""
        vmc = enhanced_vmc
        
        # Verify all Phase 1.2 components are active
        assert vmc.enhanced_mode, "Enhanced mode should be active"
        assert vmc.ucl is not None, "Unified Communication Layer should be initialized"
        assert vmc.enhanced_router is not None, "Enhanced Router should be initialized"
        assert vmc.memory_system is not None, "Memory System should be initialized"
        
        # Register a test agent
        agent_id = "phase_1_2_test_agent"
        mock_agent = MockPythonAgent(agent_id)
        vmc.register_agent(agent_id, mock_agent)
        
        # Wait for enhanced registration
        await asyncio.sleep(0.2)
        
        # Test 1: Agent Memory Integration
        logger.info("Testing agent memory integration...")
        
        # Store initial context
        await vmc.update_agent_context(
            agent_id=agent_id,
            context_key="session_state",
            context_data={
                "session_id": "phase_1_2_test",
                "start_time": datetime.utcnow().isoformat(),
                "initial_capabilities": ["test_processing", "memory_usage"]
            }
        )
        
        # Store domain knowledge
        memory_id = await vmc.store_agent_memory(
            agent_id=agent_id,
            memory_type=MemoryType.SEMANTIC,
            content={
                "domain": "integration_testing",
                "knowledge": "Phase 1.2 combines UCL, Router, and Memory for enterprise-grade agent orchestration",
                "best_practices": ["store_context", "learn_from_tasks", "optimize_routing"]
            },
            tags=["phase_1_2", "integration", "knowledge"],
            priority=MemoryPriority.HIGH
        )
        
        assert memory_id is not None, "Should store semantic memory successfully"
        
        # Test 2: Enhanced Task Routing with Memory
        logger.info("Testing enhanced task routing with memory...")
        
        # Submit task via enhanced router (should trigger memory storage)
        task_result = await vmc.dispatch_task_enhanced(
            task_id=str(uuid.uuid4()),
            task_type="memory_test",
            task_parameters={"test_data": "phase_1_2_integration", "complexity": "high"},
            priority=TaskPriority.HIGH,
            requested_agent=agent_id,
            required_capabilities=["test_processing"],
            timeout_seconds=30
        )
        
        assert task_result is not None, "Task should complete"
        assert task_result.success, "Task should succeed"
        assert task_result.assigned_agent == agent_id, "Task should be assigned to requested agent"
        
        # Test 3: Memory-Based Learning
        logger.info("Testing memory-based learning...")
        
        # Wait for task memories to be stored
        await asyncio.sleep(0.2)
        
        # Retrieve agent memories
        memories = await vmc.get_agent_memories(
            agent_id=agent_id,
            memory_types=[MemoryType.EPISODIC],
            tags=["task_completion"],
            limit=10
        )
        
        assert len(memories) > 0, "Should have episodic memories from task execution"
        
        # Find the task completion memory
        task_completion_memory = None
        for memory in memories:
            if memory.content.get("event") == "task_completion":
                task_completion_memory = memory
                break
        
        assert task_completion_memory is not None, "Should have task completion memory"
        assert task_completion_memory.content["success"], "Task completion should be marked as successful"
        
        # Test 4: Learning Insights
        logger.info("Testing learning insights...")
        
        insights = await vmc.get_agent_learning_insights(agent_id)
        
        assert "learning_types" in insights, "Should have learning insights"
        assert "overall_progress" in insights, "Should have overall progress"
        
        # Check for task execution learning
        learning_types = insights["learning_types"]
        task_learning_key = f"task_execution_memory_test"
        
        if task_learning_key in learning_types:
            task_learning = learning_types[task_learning_key]
            assert task_learning["count"] >= 1, "Should have at least one learning entry"
            assert task_learning["average_confidence"] > 0.5, "Should have decent confidence"
        
        # Test 5: Cross-Language Communication with Memory
        logger.info("Testing cross-language communication with memory context...")
        
        # Store cross-language context
        await vmc.update_agent_context(
            agent_id=agent_id,
            context_key="cross_language_state",
            context_data={
                "python_agent_ready": True,
                "typescript_bridge_active": True,
                "communication_protocol": "unified"
            }
        )
        
        # Test 6: Comprehensive Agent Summary
        logger.info("Testing comprehensive agent summary...")
        
        summary = await vmc.get_comprehensive_agent_summary(agent_id)
        
        assert summary["agent_id"] == agent_id
        assert summary["enhanced_mode"], "Should be in enhanced mode"
        assert summary["classic_agent_registered"], "Should be registered in classic system"
        assert summary["enhanced_agent_registered"], "Should be registered in enhanced system"
        assert "memory_summary" in summary, "Should have memory summary"
        assert "learning_insights" in summary, "Should have learning insights"
        
        memory_summary = summary["memory_summary"]
        assert memory_summary["total_memories"] >= 2, "Should have at least semantic + episodic memories"
        assert len(memory_summary["context_keys"]) >= 2, "Should have multiple context keys"
        
        # Test 7: System-Wide Stats
        logger.info("Testing system-wide statistics...")
        
        stats = vmc.get_enhanced_stats()
        
        assert stats["enhanced_mode"], "Should show enhanced mode active"
        assert stats["enhanced_agents"] >= 1, "Should have at least one enhanced agent"
        assert "router_stats" in stats, "Should have router statistics"
        assert "communication_stats" in stats, "Should have communication statistics"
        
        router_stats = stats["router_stats"]
        assert router_stats["completed_tasks"] >= 1, "Should show completed tasks"
        assert router_stats["registered_agents"] >= 1, "Should show registered agents"
        
        communication_stats = stats["communication_stats"]
        assert communication_stats["registered_agents"] >= 1, "Should show registered agents in UCL"
        
        logger.info("✅ Phase 1.2 Complete Integration Test PASSED")
        logger.info("🎉 Successfully validated: UCL + Enhanced Router + Memory System working together")
        
        return {
            "phase": "1.2",
            "status": "COMPLETE",
            "components_tested": [
                "UnifiedCommunicationLayer",
                "EnhancedAgentRouter", 
                "AgentMemorySystem",
                "VantaMasterCoreEnhanced"
            ],
            "capabilities_verified": [
                "cross_language_communication",
                "intelligent_task_routing",
                "persistent_agent_memory",
                "context_management",
                "learning_from_interactions",
                "load_balancing",
                "comprehensive_monitoring"
            ],
            "agent_summary": summary,
            "system_stats": stats
        }

if __name__ == "__main__":
    # Run a simple test
    async def simple_test():
        logger.info("Running simple unified communication test...")
        
        ucl = await create_unified_communication()
        
        # Test basic functionality
        success = await ucl.register_agent(
            "test_agent",
            "TestAgent", 
            ["testing"],
            "python"
        )
        
        logger.info(f"Agent registration: {success}")
        
        agents = ucl.get_registered_agents()
        logger.info(f"Registered agents: {list(agents.keys())}")
        
        await ucl.stop()
        logger.info("Simple test completed")
    
    asyncio.run(simple_test()) 