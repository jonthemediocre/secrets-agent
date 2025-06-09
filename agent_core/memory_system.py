"""
Agent Memory System
Provides persistent memory capabilities for VANTA agents including:
- Context storage and retrieval
- Agent state management
- Learning from interactions
- Memory-based decision making

Integrates with existing Redis infrastructure via KEBClient.
"""

import asyncio
import json
import logging
import uuid
from typing import Dict, Any, Optional, List, Union
from datetime import datetime, timedelta
from dataclasses import dataclass, asdict
from enum import Enum
import hashlib

from vanta_seed.core.keb_client import KEBClient

logger = logging.getLogger(__name__)

class MemoryType(Enum):
    """Types of memory storage"""
    SHORT_TERM = "short_term"      # Session-based, expires quickly
    LONG_TERM = "long_term"        # Persistent across sessions
    EPISODIC = "episodic"          # Specific interaction memories
    SEMANTIC = "semantic"          # General knowledge and patterns
    PROCEDURAL = "procedural"      # How-to knowledge and workflows

class MemoryPriority(Enum):
    """Memory importance levels"""
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4
    EPHEMERAL = 5

@dataclass
class MemoryEntry:
    """Individual memory entry"""
    memory_id: str
    agent_id: str
    memory_type: MemoryType
    priority: MemoryPriority
    content: Dict[str, Any]
    tags: List[str]
    created_at: datetime
    accessed_at: datetime
    access_count: int = 0
    expires_at: Optional[datetime] = None
    metadata: Dict[str, Any] = None
    
    def __post_init__(self):
        if self.metadata is None:
            self.metadata = {}
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "memory_id": self.memory_id,
            "agent_id": self.agent_id,
            "memory_type": self.memory_type.value,
            "priority": self.priority.value,
            "content": self.content,
            "tags": self.tags,
            "created_at": self.created_at.isoformat() + "Z",
            "accessed_at": self.accessed_at.isoformat() + "Z",
            "access_count": self.access_count,
            "expires_at": self.expires_at.isoformat() + "Z" if self.expires_at else None,
            "metadata": self.metadata
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'MemoryEntry':
        """Create from dictionary"""
        return cls(
            memory_id=data["memory_id"],
            agent_id=data["agent_id"],
            memory_type=MemoryType(data["memory_type"]),
            priority=MemoryPriority(data["priority"]),
            content=data["content"],
            tags=data["tags"],
            created_at=datetime.fromisoformat(data["created_at"].replace("Z", "+00:00")),
            accessed_at=datetime.fromisoformat(data["accessed_at"].replace("Z", "+00:00")),
            access_count=data.get("access_count", 0),
            expires_at=datetime.fromisoformat(data["expires_at"].replace("Z", "+00:00")) if data.get("expires_at") else None,
            metadata=data.get("metadata", {})
        )

@dataclass
class MemoryQuery:
    """Query for searching memory"""
    agent_id: Optional[str] = None
    memory_types: List[MemoryType] = None
    tags: List[str] = None
    content_keywords: List[str] = None
    time_range: tuple = None  # (start_time, end_time)
    priority_min: MemoryPriority = MemoryPriority.EPHEMERAL
    limit: int = 100
    
    def __post_init__(self):
        if self.memory_types is None:
            self.memory_types = []
        if self.tags is None:
            self.tags = []
        if self.content_keywords is None:
            self.content_keywords = []

class AgentMemorySystem:
    """
    Agent Memory System providing persistent context and learning capabilities.
    Integrates with existing KEBClient Redis infrastructure.
    """
    
    def __init__(self, keb_client: KEBClient, memory_ttl_hours: int = 168):  # 7 days default
        self.keb_client = keb_client
        self.redis = keb_client.redis_client
        self.memory_ttl_seconds = memory_ttl_hours * 3600
        self.system_id = f"memory_system_{uuid.uuid4().hex[:8]}"
        self.running = False
        
        # Memory key prefixes for Redis
        self.MEMORY_PREFIX = "agent_memory"
        self.INDEX_PREFIX = "memory_index"
        self.CONTEXT_PREFIX = "agent_context"
        self.LEARNING_PREFIX = "agent_learning"
        
        # Initialize Redis data structures
        self._setup_memory_streams()
        
    def _setup_memory_streams(self):
        """Setup Redis streams for memory operations"""
        streams = [
            "memory_operations",     # Memory CRUD operations
            "memory_events",         # Memory-related events
            "learning_updates",      # Agent learning events
            "context_changes"        # Context modification events
        ]
        
        for stream in streams:
            group_name = f"{stream}_group"
            if not self.keb_client.create_consumer_group(stream, group_name, start_id='$'):
                logger.warning(f"Failed to create consumer group {group_name} for stream {stream}")
            else:
                logger.debug(f"Created/verified consumer group {group_name} for stream {stream}")
    
    async def start(self):
        """Start the memory system"""
        if self.running:
            logger.warning("AgentMemorySystem already running")
            return
            
        logger.info(f"Starting AgentMemorySystem as {self.system_id}")
        self.running = True
        
        # Start background tasks
        asyncio.create_task(self._cleanup_expired_memories())
        asyncio.create_task(self._update_memory_metrics())
        
        logger.info("AgentMemorySystem started successfully")
    
    async def stop(self):
        """Stop the memory system"""
        if not self.running:
            return
            
        logger.info("Stopping AgentMemorySystem")
        self.running = False
        logger.info("AgentMemorySystem stopped")
    
    async def store_memory(self, agent_id: str, memory_type: MemoryType, 
                          content: Dict[str, Any], tags: List[str] = None,
                          priority: MemoryPriority = MemoryPriority.NORMAL,
                          ttl_hours: Optional[int] = None) -> str:
        """Store a memory entry for an agent"""
        try:
            memory_id = str(uuid.uuid4())
            now = datetime.utcnow()
            
            # Calculate expiration
            expires_at = None
            if ttl_hours:
                expires_at = now + timedelta(hours=ttl_hours)
            elif memory_type == MemoryType.SHORT_TERM:
                expires_at = now + timedelta(hours=24)  # 1 day for short-term
            elif memory_type == MemoryType.EPHEMERAL:
                expires_at = now + timedelta(hours=1)   # 1 hour for ephemeral
            
            # Create memory entry
            memory = MemoryEntry(
                memory_id=memory_id,
                agent_id=agent_id,
                memory_type=memory_type,
                priority=priority,
                content=content,
                tags=tags or [],
                created_at=now,
                accessed_at=now,
                expires_at=expires_at
            )
            
            # Store in Redis
            memory_key = f"{self.MEMORY_PREFIX}:{agent_id}:{memory_id}"
            memory_data = json.dumps(memory.to_dict())
            
            # Set with TTL if specified
            if expires_at:
                ttl_seconds = int((expires_at - now).total_seconds())
                await self.redis.setex(memory_key, ttl_seconds, memory_data)
            else:
                await self.redis.set(memory_key, memory_data)
            
            # Update indexes
            await self._update_memory_indexes(memory)
            
            # Publish memory operation event
            await self._publish_memory_event("memory_stored", {
                "agent_id": agent_id,
                "memory_id": memory_id,
                "memory_type": memory_type.value,
                "priority": priority.value,
                "tags": tags or []
            })
            
            logger.debug(f"Stored memory {memory_id} for agent {agent_id}")
            return memory_id
            
        except Exception as e:
            logger.error(f"Failed to store memory for agent {agent_id}: {e}")
            raise
    
    async def retrieve_memory(self, agent_id: str, memory_id: str) -> Optional[MemoryEntry]:
        """Retrieve a specific memory entry"""
        try:
            memory_key = f"{self.MEMORY_PREFIX}:{agent_id}:{memory_id}"
            memory_data = await self.redis.get(memory_key)
            
            if not memory_data:
                return None
            
            memory_dict = json.loads(memory_data)
            memory = MemoryEntry.from_dict(memory_dict)
            
            # Update access statistics
            memory.accessed_at = datetime.utcnow()
            memory.access_count += 1
            
            # Store updated memory
            updated_data = json.dumps(memory.to_dict())
            await self.redis.set(memory_key, updated_data)
            
            logger.debug(f"Retrieved memory {memory_id} for agent {agent_id}")
            return memory
            
        except Exception as e:
            logger.error(f"Failed to retrieve memory {memory_id} for agent {agent_id}: {e}")
            return None
    
    async def search_memories(self, query: MemoryQuery) -> List[MemoryEntry]:
        """Search for memories matching the query"""
        try:
            memories = []
            
            # Build search pattern
            if query.agent_id:
                pattern = f"{self.MEMORY_PREFIX}:{query.agent_id}:*"
            else:
                pattern = f"{self.MEMORY_PREFIX}:*"
            
            # Get all matching keys
            keys = await self.redis.keys(pattern)
            
            for key in keys:
                try:
                    memory_data = await self.redis.get(key)
                    if memory_data:
                        memory_dict = json.loads(memory_data)
                        memory = MemoryEntry.from_dict(memory_dict)
                        
                        if self._matches_query(memory, query):
                            memories.append(memory)
                            
                except Exception as e:
                    logger.warning(f"Error processing memory key {key}: {e}")
                    continue
            
            # Sort by priority and recency
            memories.sort(key=lambda m: (m.priority.value, -m.accessed_at.timestamp()))
            
            # Apply limit
            return memories[:query.limit]
            
        except Exception as e:
            logger.error(f"Failed to search memories: {e}")
            return []
    
    def _matches_query(self, memory: MemoryEntry, query: MemoryQuery) -> bool:
        """Check if memory matches query criteria"""
        # Check memory types
        if query.memory_types and memory.memory_type not in query.memory_types:
            return False
        
        # Check priority
        if memory.priority.value > query.priority_min.value:
            return False
        
        # Check tags
        if query.tags:
            if not any(tag in memory.tags for tag in query.tags):
                return False
        
        # Check time range
        if query.time_range:
            start_time, end_time = query.time_range
            if not (start_time <= memory.created_at <= end_time):
                return False
        
        # Check content keywords
        if query.content_keywords:
            content_str = json.dumps(memory.content).lower()
            if not any(keyword.lower() in content_str for keyword in query.content_keywords):
                return False
        
        return True
    
    async def store_context(self, agent_id: str, context_key: str, 
                          context_data: Dict[str, Any]) -> bool:
        """Store agent context (current state/session data)"""
        try:
            context_id = f"{self.CONTEXT_PREFIX}:{agent_id}:{context_key}"
            context_value = {
                "data": context_data,
                "updated_at": datetime.utcnow().isoformat() + "Z",
                "version": 1
            }
            
            # Store with TTL (context typically temporary)
            await self.redis.setex(
                context_id, 
                self.memory_ttl_seconds, 
                json.dumps(context_value)
            )
            
            # Publish context change event
            await self._publish_memory_event("context_updated", {
                "agent_id": agent_id,
                "context_key": context_key,
                "timestamp": context_value["updated_at"]
            })
            
            logger.debug(f"Stored context {context_key} for agent {agent_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to store context for agent {agent_id}: {e}")
            return False
    
    async def retrieve_context(self, agent_id: str, context_key: str) -> Optional[Dict[str, Any]]:
        """Retrieve agent context"""
        try:
            context_id = f"{self.CONTEXT_PREFIX}:{agent_id}:{context_key}"
            context_data = await self.redis.get(context_id)
            
            if not context_data:
                return None
            
            context_value = json.loads(context_data)
            return context_value.get("data")
            
        except Exception as e:
            logger.error(f"Failed to retrieve context for agent {agent_id}: {e}")
            return None
    
    async def get_agent_context_summary(self, agent_id: str) -> Dict[str, Any]:
        """Get comprehensive context summary for an agent"""
        try:
            summary = {
                "agent_id": agent_id,
                "total_memories": 0,
                "memory_by_type": {},
                "recent_memories": [],
                "context_keys": [],
                "learning_progress": {}
            }
            
            # Count memories by type
            memory_pattern = f"{self.MEMORY_PREFIX}:{agent_id}:*"
            memory_keys = await self.redis.keys(memory_pattern)
            summary["total_memories"] = len(memory_keys)
            
            # Get recent memories (last 10)
            query = MemoryQuery(agent_id=agent_id, limit=10)
            recent_memories = await self.search_memories(query)
            summary["recent_memories"] = [
                {
                    "memory_id": m.memory_id,
                    "type": m.memory_type.value,
                    "created_at": m.created_at.isoformat() + "Z",
                    "tags": m.tags
                }
                for m in recent_memories
            ]
            
            # Get memory type distribution
            for memory in recent_memories[:50]:  # Sample recent memories
                mem_type = memory.memory_type.value
                summary["memory_by_type"][mem_type] = summary["memory_by_type"].get(mem_type, 0) + 1
            
            # Get active context keys
            context_pattern = f"{self.CONTEXT_PREFIX}:{agent_id}:*"
            context_keys = await self.redis.keys(context_pattern)
            summary["context_keys"] = [key.split(":")[-1] for key in context_keys]
            
            return summary
            
        except Exception as e:
            logger.error(f"Failed to get context summary for agent {agent_id}: {e}")
            return {}
    
    async def record_learning(self, agent_id: str, learning_type: str, 
                            outcome: Dict[str, Any], confidence: float = 1.0) -> str:
        """Record a learning outcome for an agent"""
        try:
            learning_id = str(uuid.uuid4())
            learning_data = {
                "learning_id": learning_id,
                "agent_id": agent_id,
                "learning_type": learning_type,
                "outcome": outcome,
                "confidence": confidence,
                "timestamp": datetime.utcnow().isoformat() + "Z"
            }
            
            # Store as memory
            await self.store_memory(
                agent_id=agent_id,
                memory_type=MemoryType.PROCEDURAL,
                content=learning_data,
                tags=["learning", learning_type],
                priority=MemoryPriority.HIGH
            )
            
            # Update learning index
            learning_key = f"{self.LEARNING_PREFIX}:{agent_id}:{learning_type}"
            learning_index = await self.redis.get(learning_key)
            
            if learning_index:
                index_data = json.loads(learning_index)
            else:
                index_data = {"entries": [], "total_confidence": 0.0, "count": 0}
            
            index_data["entries"].append({
                "learning_id": learning_id,
                "confidence": confidence,
                "timestamp": learning_data["timestamp"]
            })
            index_data["total_confidence"] += confidence
            index_data["count"] += 1
            
            # Keep only recent entries (last 100)
            if len(index_data["entries"]) > 100:
                removed = index_data["entries"].pop(0)
                index_data["total_confidence"] -= removed["confidence"]
                index_data["count"] -= 1
            
            await self.redis.set(learning_key, json.dumps(index_data))
            
            # Publish learning event
            await self._publish_memory_event("learning_recorded", {
                "agent_id": agent_id,
                "learning_id": learning_id,
                "learning_type": learning_type,
                "confidence": confidence
            })
            
            logger.debug(f"Recorded learning {learning_id} for agent {agent_id}")
            return learning_id
            
        except Exception as e:
            logger.error(f"Failed to record learning for agent {agent_id}: {e}")
            raise
    
    async def get_learning_insights(self, agent_id: str, learning_type: str = None) -> Dict[str, Any]:
        """Get learning insights for an agent"""
        try:
            insights = {
                "agent_id": agent_id,
                "learning_types": {},
                "overall_progress": 0.0,
                "confidence_trend": [],
                "recommendations": []
            }
            
            # Get learning patterns
            if learning_type:
                patterns = [learning_type]
            else:
                pattern = f"{self.LEARNING_PREFIX}:{agent_id}:*"
                keys = await self.redis.keys(pattern)
                patterns = [key.split(":")[-1] for key in keys]
            
            total_confidence = 0.0
            total_count = 0
            
            for pattern in patterns:
                learning_key = f"{self.LEARNING_PREFIX}:{agent_id}:{pattern}"
                learning_data = await self.redis.get(learning_key)
                
                if learning_data:
                    data = json.loads(learning_data)
                    avg_confidence = data["total_confidence"] / max(1, data["count"])
                    
                    insights["learning_types"][pattern] = {
                        "count": data["count"],
                        "average_confidence": avg_confidence,
                        "total_confidence": data["total_confidence"],
                        "recent_entries": data["entries"][-10:]  # Last 10
                    }
                    
                    total_confidence += data["total_confidence"]
                    total_count += data["count"]
            
            # Calculate overall progress
            if total_count > 0:
                insights["overall_progress"] = total_confidence / total_count
            
            # Generate recommendations
            insights["recommendations"] = self._generate_learning_recommendations(insights)
            
            return insights
            
        except Exception as e:
            logger.error(f"Failed to get learning insights for agent {agent_id}: {e}")
            return {}
    
    def _generate_learning_recommendations(self, insights: Dict[str, Any]) -> List[str]:
        """Generate learning recommendations based on insights"""
        recommendations = []
        
        overall_progress = insights.get("overall_progress", 0.0)
        learning_types = insights.get("learning_types", {})
        
        if overall_progress < 0.5:
            recommendations.append("Consider increasing training data quality or quantity")
        
        if overall_progress > 0.8:
            recommendations.append("Agent shows strong learning progress - consider advanced tasks")
        
        # Check for learning type imbalances
        if len(learning_types) > 1:
            confidences = [data["average_confidence"] for data in learning_types.values()]
            if max(confidences) - min(confidences) > 0.3:
                recommendations.append("Learning appears uneven across task types - balance training")
        
        if not recommendations:
            recommendations.append("Learning progress appears normal - continue current approach")
        
        return recommendations
    
    async def _update_memory_indexes(self, memory: MemoryEntry):
        """Update memory indexes for efficient searching"""
        try:
            # Tag index
            for tag in memory.tags:
                tag_key = f"{self.INDEX_PREFIX}:tag:{tag}"
                await self.redis.sadd(tag_key, f"{memory.agent_id}:{memory.memory_id}")
                await self.redis.expire(tag_key, self.memory_ttl_seconds)
            
            # Type index
            type_key = f"{self.INDEX_PREFIX}:type:{memory.memory_type.value}"
            await self.redis.sadd(type_key, f"{memory.agent_id}:{memory.memory_id}")
            await self.redis.expire(type_key, self.memory_ttl_seconds)
            
            # Agent index
            agent_key = f"{self.INDEX_PREFIX}:agent:{memory.agent_id}"
            await self.redis.sadd(agent_key, memory.memory_id)
            await self.redis.expire(agent_key, self.memory_ttl_seconds)
            
        except Exception as e:
            logger.error(f"Failed to update memory indexes: {e}")
    
    async def _publish_memory_event(self, event_type: str, event_data: Dict[str, Any]):
        """Publish memory-related events"""
        try:
            event_payload = {
                "event_type": event_type,
                "system_id": self.system_id,
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "data": event_data
            }
            
            self.keb_client.publish("memory_events", event_payload)
            
        except Exception as e:
            logger.error(f"Failed to publish memory event: {e}")
    
    async def _cleanup_expired_memories(self):
        """Background task to clean up expired memories"""
        try:
            while self.running:
                await asyncio.sleep(3600)  # Run every hour
                
                # This is handled automatically by Redis TTL, but we can do additional cleanup
                logger.debug("Running memory cleanup cycle")
                
        except asyncio.CancelledError:
            logger.info("Memory cleanup task cancelled")
        except Exception as e:
            logger.error(f"Error in memory cleanup: {e}")
    
    async def _update_memory_metrics(self):
        """Background task to update memory system metrics"""
        try:
            while self.running:
                await asyncio.sleep(300)  # Run every 5 minutes
                
                # Collect metrics
                metrics = await self.get_system_metrics()
                
                # Publish metrics
                await self._publish_memory_event("metrics_update", metrics)
                
        except asyncio.CancelledError:
            logger.info("Memory metrics task cancelled")
        except Exception as e:
            logger.error(f"Error in memory metrics: {e}")
    
    async def get_system_metrics(self) -> Dict[str, Any]:
        """Get memory system metrics"""
        try:
            metrics = {
                "timestamp": datetime.utcnow().isoformat() + "Z",
                "system_id": self.system_id,
                "total_memory_keys": 0,
                "total_context_keys": 0,
                "total_learning_keys": 0,
                "memory_by_type": {},
                "agents_with_memory": set()
            }
            
            # Count memory keys
            memory_keys = await self.redis.keys(f"{self.MEMORY_PREFIX}:*")
            metrics["total_memory_keys"] = len(memory_keys)
            
            # Count context keys
            context_keys = await self.redis.keys(f"{self.CONTEXT_PREFIX}:*")
            metrics["total_context_keys"] = len(context_keys)
            
            # Count learning keys
            learning_keys = await self.redis.keys(f"{self.LEARNING_PREFIX}:*")
            metrics["total_learning_keys"] = len(learning_keys)
            
            # Extract agent IDs
            for key in memory_keys:
                try:
                    agent_id = key.split(":")[1]
                    metrics["agents_with_memory"].add(agent_id)
                except IndexError:
                    continue
            
            metrics["agents_with_memory"] = len(metrics["agents_with_memory"])
            
            return metrics
            
        except Exception as e:
            logger.error(f"Failed to get system metrics: {e}")
            return {}


# Utility functions for easy integration
async def create_agent_memory_system(keb_client: KEBClient, memory_ttl_hours: int = 168) -> AgentMemorySystem:
    """Factory function to create and initialize AgentMemorySystem"""
    memory_system = AgentMemorySystem(keb_client, memory_ttl_hours)
    await memory_system.start()
    return memory_system 