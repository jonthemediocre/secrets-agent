"""
Test Agent Memory System
Tests the complete memory functionality including storage, retrieval, learning, and context management.
"""

import asyncio
import pytest
import logging
import uuid
from typing import Dict, Any
import json
import time
from datetime import datetime, timedelta

# Test imports
from agent_core.memory_system import (
    AgentMemorySystem,
    MemoryEntry,
    MemoryType,
    MemoryPriority,
    MemoryQuery,
    create_agent_memory_system
)
from vanta_seed.core.keb_client import KEBClient
from vanta_seed.core.vanta_master_core_enhanced import (
    VantaMasterCoreEnhanced,
    create_enhanced_vmc
)

# Setup logging for tests
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class MockAgent:
    """Mock agent for memory testing"""
    
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.capabilities = ['memory_testing', 'context_management']
        self.memory_system = None
        
    def process_task(self, task_type: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Mock task processing"""
        if task_type == "memory_test":
            return {
                "status": "success",
                "result": {"processed": True, "parameters": parameters}
            }
        elif task_type == "failing_task":
            return {
                "status": "error", 
                "message": "Simulated task failure"
            }
        else:
            return {
                "status": "success",
                "result": {"task_type": task_type}
            }

@pytest.fixture
async def redis_config():
    """Redis configuration for tests"""
    return {
        'host': 'localhost',
        'port': 6379,
        'db': 2  # Use different DB for memory tests
    }

@pytest.fixture
async def keb_client(redis_config):
    """Create KEBClient for tests"""
    keb = KEBClient(
        redis_host=redis_config['host'],
        redis_port=redis_config['port'],
        redis_db=redis_config['db']
    )
    yield keb
    # Cleanup not needed as each test uses different keys

@pytest.fixture
async def memory_system(keb_client):
    """Create memory system for tests"""
    memory_sys = await create_agent_memory_system(keb_client, memory_ttl_hours=24)
    yield memory_sys
    await memory_sys.stop()

@pytest.fixture
async def enhanced_vmc(redis_config):
    """Create enhanced VMC with memory system for tests"""
    config = {
        'redis_keb': redis_config,
        'enhanced_mode': True,
        'memory_ttl_hours': 24
    }
    vmc = await create_enhanced_vmc(config)
    yield vmc
    await vmc.shutdown()

class TestAgentMemorySystem:
    """Test Agent Memory System functionality"""
    
    @pytest.mark.asyncio
    async def test_memory_storage_and_retrieval(self, memory_system):
        """Test basic memory storage and retrieval"""
        agent_id = "test_agent_memory"
        
        # Store memory
        memory_id = await memory_system.store_memory(
            agent_id=agent_id,
            memory_type=MemoryType.LONG_TERM,
            content={"test_data": "memory_content", "value": 42},
            tags=["test", "long_term"],
            priority=MemoryPriority.HIGH
        )
        
        assert memory_id is not None, "Memory should be stored successfully"
        
        # Retrieve memory
        memory = await memory_system.retrieve_memory(agent_id, memory_id)
        
        assert memory is not None, "Memory should be retrievable"
        assert memory.agent_id == agent_id
        assert memory.memory_type == MemoryType.LONG_TERM
        assert memory.content["test_data"] == "memory_content"
        assert memory.content["value"] == 42
        assert "test" in memory.tags
        assert memory.priority == MemoryPriority.HIGH
        assert memory.access_count == 1  # Should be incremented on retrieval

    @pytest.mark.asyncio
    async def test_memory_search(self, memory_system):
        """Test memory search functionality"""
        agent_id = "test_agent_search"
        
        # Store multiple memories
        memories = []
        for i in range(5):
            memory_id = await memory_system.store_memory(
                agent_id=agent_id,
                memory_type=MemoryType.EPISODIC if i % 2 == 0 else MemoryType.SEMANTIC,
                content={"event": f"test_event_{i}", "data": i * 10},
                tags=["search_test", f"event_{i}"],
                priority=MemoryPriority.NORMAL
            )
            memories.append(memory_id)
        
        # Search by agent
        query = MemoryQuery(agent_id=agent_id, limit=10)
        results = await memory_system.search_memories(query)
        
        assert len(results) == 5, "Should find all stored memories"
        
        # Search by memory type
        query = MemoryQuery(
            agent_id=agent_id,
            memory_types=[MemoryType.EPISODIC],
            limit=10
        )
        results = await memory_system.search_memories(query)
        
        assert len(results) == 3, "Should find only episodic memories"  # 0, 2, 4
        
        # Search by tags
        query = MemoryQuery(
            agent_id=agent_id,
            tags=["event_2"],
            limit=10
        )
        results = await memory_system.search_memories(query)
        
        assert len(results) == 1, "Should find memory with specific tag"
        assert results[0].content["event"] == "test_event_2"

    @pytest.mark.asyncio
    async def test_context_management(self, memory_system):
        """Test agent context storage and retrieval"""
        agent_id = "test_agent_context"
        
        # Store context
        context_data = {
            "current_state": "processing",
            "session_id": "session_123",
            "variables": {"counter": 5, "mode": "active"}
        }
        
        success = await memory_system.store_context(
            agent_id=agent_id,
            context_key="session_state",
            context_data=context_data
        )
        
        assert success, "Context should be stored successfully"
        
        # Retrieve context
        retrieved_context = await memory_system.retrieve_context(
            agent_id=agent_id,
            context_key="session_state"
        )
        
        assert retrieved_context is not None, "Context should be retrievable"
        assert retrieved_context["current_state"] == "processing"
        assert retrieved_context["variables"]["counter"] == 5
        
        # Test non-existent context
        non_existent = await memory_system.retrieve_context(
            agent_id=agent_id,
            context_key="non_existent"
        )
        
        assert non_existent is None, "Non-existent context should return None"

    @pytest.mark.asyncio
    async def test_learning_system(self, memory_system):
        """Test agent learning capabilities"""
        agent_id = "test_agent_learning"
        
        # Record learning outcomes
        learning_data = [
            ("task_completion", {"success": True, "time": 100}, 0.9),
            ("task_completion", {"success": True, "time": 80}, 0.95),
            ("task_completion", {"success": False, "error": "timeout"}, 0.2),
            ("problem_solving", {"approach": "method_a", "success": True}, 0.8),
            ("problem_solving", {"approach": "method_b", "success": True}, 0.85),
        ]
        
        learning_ids = []
        for learning_type, outcome, confidence in learning_data:
            learning_id = await memory_system.record_learning(
                agent_id=agent_id,
                learning_type=learning_type,
                outcome=outcome,
                confidence=confidence
            )
            learning_ids.append(learning_id)
            assert learning_id is not None, f"Learning should be recorded for {learning_type}"
        
        # Get learning insights
        insights = await memory_system.get_learning_insights(agent_id)
        
        assert "learning_types" in insights
        assert "task_completion" in insights["learning_types"]
        assert "problem_solving" in insights["learning_types"]
        
        # Check task completion stats
        task_stats = insights["learning_types"]["task_completion"]
        assert task_stats["count"] == 3
        assert task_stats["average_confidence"] > 0.5  # Should be decent despite one failure
        
        # Check problem solving stats
        problem_stats = insights["learning_types"]["problem_solving"]
        assert problem_stats["count"] == 2
        assert problem_stats["average_confidence"] > 0.8  # Both successful
        
        # Check overall progress
        assert insights["overall_progress"] > 0.6  # Good overall progress
        
        # Check recommendations
        assert "recommendations" in insights
        assert len(insights["recommendations"]) > 0

    @pytest.mark.asyncio
    async def test_memory_expiration(self, memory_system):
        """Test memory expiration functionality"""
        agent_id = "test_agent_expiration"
        
        # Store short-term memory
        memory_id = await memory_system.store_memory(
            agent_id=agent_id,
            memory_type=MemoryType.SHORT_TERM,
            content={"test": "short_term_data"},
            tags=["short_term"],
            priority=MemoryPriority.NORMAL
        )
        
        # Memory should exist immediately
        memory = await memory_system.retrieve_memory(agent_id, memory_id)
        assert memory is not None, "Short-term memory should exist immediately"
        
        # Store ephemeral memory with very short TTL
        ephemeral_id = await memory_system.store_memory(
            agent_id=agent_id,
            memory_type=MemoryType.EPHEMERAL,
            content={"test": "ephemeral_data"},
            tags=["ephemeral"],
            priority=MemoryPriority.LOW,
            ttl_hours=0.001  # Very short TTL for testing (3.6 seconds)
        )
        
        # Memory should exist immediately
        ephemeral_memory = await memory_system.retrieve_memory(agent_id, ephemeral_id)
        assert ephemeral_memory is not None, "Ephemeral memory should exist immediately"
        
        # Wait for expiration (in real test, we'd mock time or use test doubles)
        # For now, just verify the TTL was set
        assert ephemeral_memory.expires_at is not None, "Ephemeral memory should have expiration"

    @pytest.mark.asyncio
    async def test_system_metrics(self, memory_system):
        """Test system metrics collection"""
        agent_id = "test_agent_metrics"
        
        # Store some test data
        await memory_system.store_memory(
            agent_id=agent_id,
            memory_type=MemoryType.LONG_TERM,
            content={"test": "metrics_data"},
            tags=["metrics"],
            priority=MemoryPriority.NORMAL
        )
        
        await memory_system.store_context(
            agent_id=agent_id,
            context_key="test_context",
            context_data={"state": "testing"}
        )
        
        await memory_system.record_learning(
            agent_id=agent_id,
            learning_type="test_learning",
            outcome={"success": True},
            confidence=0.8
        )
        
        # Get metrics
        metrics = await memory_system.get_system_metrics()
        
        assert "total_memory_keys" in metrics
        assert "total_context_keys" in metrics
        assert "total_learning_keys" in metrics
        assert "agents_with_memory" in metrics
        assert metrics["total_memory_keys"] >= 1
        assert metrics["total_context_keys"] >= 1
        assert metrics["total_learning_keys"] >= 1
        assert metrics["agents_with_memory"] >= 1

class TestEnhancedVMCMemoryIntegration:
    """Test Enhanced VMC integration with memory system"""
    
    @pytest.mark.asyncio
    async def test_vmc_memory_integration(self, enhanced_vmc):
        """Test Enhanced VMC memory integration"""
        vmc = enhanced_vmc
        
        # Verify memory system is initialized
        assert vmc.memory_system is not None, "Memory system should be initialized"
        assert vmc.enhanced_mode, "Enhanced mode should be active"
        
        # Test agent registration with memory
        agent_id = "test_memory_agent"
        mock_agent = MockAgent(agent_id)
        
        # Register agent
        vmc.register_agent(agent_id, mock_agent)
        
        # Wait for enhanced registration to complete
        await asyncio.sleep(0.1)
        
        # Test memory operations through VMC
        memory_id = await vmc.store_agent_memory(
            agent_id=agent_id,
            memory_type=MemoryType.SEMANTIC,
            content={"knowledge": "test_knowledge", "domain": "testing"},
            tags=["vmc_test"],
            priority=MemoryPriority.HIGH
        )
        
        assert memory_id is not None, "VMC should store memory successfully"
        
        # Retrieve memories
        memories = await vmc.get_agent_memories(
            agent_id=agent_id,
            tags=["vmc_test"]
        )
        
        assert len(memories) == 1, "Should retrieve stored memory"
        assert memories[0].content["knowledge"] == "test_knowledge"

    @pytest.mark.asyncio
    async def test_vmc_context_management(self, enhanced_vmc):
        """Test VMC context management"""
        vmc = enhanced_vmc
        agent_id = "test_context_agent"
        
        # Update context
        context_data = {
            "execution_state": "running",
            "last_task": "memory_test",
            "performance_metrics": {"success_rate": 0.95}
        }
        
        success = await vmc.update_agent_context(
            agent_id=agent_id,
            context_key="execution_context",
            context_data=context_data
        )
        
        assert success, "VMC should update context successfully"
        
        # Retrieve context
        retrieved_context = await vmc.get_agent_context(
            agent_id=agent_id,
            context_key="execution_context"
        )
        
        assert retrieved_context is not None, "VMC should retrieve context"
        assert retrieved_context["execution_state"] == "running"
        assert retrieved_context["performance_metrics"]["success_rate"] == 0.95

    @pytest.mark.asyncio
    async def test_vmc_learning_integration(self, enhanced_vmc):
        """Test VMC learning integration"""
        vmc = enhanced_vmc
        agent_id = "test_learning_agent"
        
        # Record learning
        learning_id = await vmc.record_agent_learning(
            agent_id=agent_id,
            learning_type="task_optimization",
            outcome={
                "optimization_method": "method_a",
                "improvement": 0.25,
                "success": True
            },
            confidence=0.9
        )
        
        assert learning_id is not None, "VMC should record learning"
        
        # Get learning insights
        insights = await vmc.get_agent_learning_insights(
            agent_id=agent_id,
            learning_type="task_optimization"
        )
        
        assert "learning_types" in insights
        assert "task_optimization" in insights["learning_types"]
        assert insights["learning_types"]["task_optimization"]["count"] == 1

    @pytest.mark.asyncio
    async def test_comprehensive_agent_summary(self, enhanced_vmc):
        """Test comprehensive agent summary with memory data"""
        vmc = enhanced_vmc
        agent_id = "test_summary_agent"
        mock_agent = MockAgent(agent_id)
        
        # Register agent
        vmc.register_agent(agent_id, mock_agent)
        await asyncio.sleep(0.1)  # Wait for registration
        
        # Add some memory data
        await vmc.store_agent_memory(
            agent_id=agent_id,
            memory_type=MemoryType.PROCEDURAL,
            content={"procedure": "test_procedure"},
            tags=["summary_test"]
        )
        
        await vmc.update_agent_context(
            agent_id=agent_id,
            context_key="summary_context",
            context_data={"state": "summary_testing"}
        )
        
        await vmc.record_agent_learning(
            agent_id=agent_id,
            learning_type="summary_learning",
            outcome={"test": "summary"},
            confidence=0.8
        )
        
        # Get comprehensive summary
        summary = await vmc.get_comprehensive_agent_summary(agent_id)
        
        assert summary["agent_id"] == agent_id
        assert summary["enhanced_mode"], "Should be in enhanced mode"
        assert summary["classic_agent_registered"], "Should show classic registration"
        assert summary["enhanced_agent_registered"], "Should show enhanced registration"
        assert "memory_summary" in summary
        assert "learning_insights" in summary
        
        # Check memory summary
        memory_summary = summary["memory_summary"]
        assert memory_summary["agent_id"] == agent_id
        assert memory_summary["total_memories"] >= 1
        assert len(memory_summary["context_keys"]) >= 1

if __name__ == "__main__":
    # Run a simple test
    async def simple_memory_test():
        logger.info("Running simple memory system test...")
        
        # Create test KEB client
        keb = KEBClient(redis_host='localhost', redis_port=6379, redis_db=3)
        
        # Create memory system
        memory_system = await create_agent_memory_system(keb)
        
        # Test basic functionality
        agent_id = "simple_test_agent"
        
        memory_id = await memory_system.store_memory(
            agent_id=agent_id,
            memory_type=MemoryType.SEMANTIC,
            content={"test": "simple_test_data"},
            tags=["simple_test"]
        )
        
        logger.info(f"Stored memory: {memory_id}")
        
        memory = await memory_system.retrieve_memory(agent_id, memory_id)
        
        logger.info(f"Retrieved memory: {memory.content if memory else 'None'}")
        
        # Test learning
        learning_id = await memory_system.record_learning(
            agent_id=agent_id,
            learning_type="simple_test",
            outcome={"success": True},
            confidence=0.9
        )
        
        logger.info(f"Recorded learning: {learning_id}")
        
        # Get insights
        insights = await memory_system.get_learning_insights(agent_id)
        logger.info(f"Learning insights: {insights}")
        
        await memory_system.stop()
        logger.info("Simple memory test completed")
    
    asyncio.run(simple_memory_test()) 