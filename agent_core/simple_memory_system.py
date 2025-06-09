"""
🧠 SIMPLE MEMORY SYSTEM - Phase 3 Lightweight Memory
==================================================

A simplified memory system that works independently without external dependencies.
Provides basic memory capabilities for the intelligent vault agent.

Core Purpose: Enable learning and memory without complex infrastructure dependencies
Based on: agent_core/memory_system.py (simplified version)
"""

import json
import sqlite3
import uuid
from datetime import datetime, timezone, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

class MemoryType(Enum):
    """Types of memory storage"""
    SHORT_TERM = "short_term"      # Session-based, expires quickly
    LONG_TERM = "long_term"        # Persistent across sessions
    EPISODIC = "episodic"          # Specific interaction memories
    SEMANTIC = "semantic"          # General knowledge and patterns
    PROCEDURAL = "procedural"      # How-to knowledge and workflows
    CONFIGURATION = "configuration" # System configuration memories
    EXPERIENCE = "experience"      # Learning from experiences
    EPHEMERAL = "ephemeral"        # Very short-lived memories

class MemoryPriority(Enum):
    """Memory importance levels"""
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4
    EPHEMERAL = 5

@dataclass
class SimpleMemoryEntry:
    """Simplified memory entry"""
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
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for storage"""
        return {
            "memory_id": self.memory_id,
            "agent_id": self.agent_id,
            "memory_type": self.memory_type.value,
            "priority": self.priority.value,
            "content": json.dumps(self.content),  # Store as JSON string
            "tags": json.dumps(self.tags),       # Store as JSON string
            "created_at": self.created_at.isoformat(),
            "accessed_at": self.accessed_at.isoformat(),
            "access_count": self.access_count,
            "expires_at": self.expires_at.isoformat() if self.expires_at else None
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'SimpleMemoryEntry':
        """Create from dictionary"""
        return cls(
            memory_id=data["memory_id"],
            agent_id=data["agent_id"],
            memory_type=MemoryType(data["memory_type"]),
            priority=MemoryPriority(data["priority"]),
            content=json.loads(data["content"]) if isinstance(data["content"], str) else data["content"],
            tags=json.loads(data["tags"]) if isinstance(data["tags"], str) else data["tags"],
            created_at=datetime.fromisoformat(data["created_at"]),
            accessed_at=datetime.fromisoformat(data["accessed_at"]),
            access_count=data.get("access_count", 0),
            expires_at=datetime.fromisoformat(data["expires_at"]) if data.get("expires_at") else None
        )

class SimpleMemorySystem:
    """
    🧠 SIMPLE MEMORY SYSTEM
    
    Lightweight memory system using SQLite for storage.
    Provides basic memory functionality without external dependencies.
    """
    
    def __init__(self, db_path: str, agent_id: str):
        """Initialize simple memory system"""
        self.db_path = db_path
        self.agent_id = agent_id
        
        # Ensure directory exists
        Path(db_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Initialize database
        self._init_database()
        
        logger.info(f"🧠 Simple Memory System initialized for {agent_id} at {db_path}")
    
    def _init_database(self):
        """Initialize SQLite database"""
        with sqlite3.connect(self.db_path) as conn:
            conn.execute("""
                CREATE TABLE IF NOT EXISTS memories (
                    memory_id TEXT PRIMARY KEY,
                    agent_id TEXT NOT NULL,
                    memory_type TEXT NOT NULL,
                    priority INTEGER NOT NULL,
                    content TEXT NOT NULL,
                    tags TEXT NOT NULL,
                    created_at TEXT NOT NULL,
                    accessed_at TEXT NOT NULL,
                    access_count INTEGER DEFAULT 0,
                    expires_at TEXT
                )
            """)
            
            # Create indexes separately
            conn.execute("CREATE INDEX IF NOT EXISTS idx_agent_id ON memories(agent_id)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_memory_type ON memories(memory_type)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_created_at ON memories(created_at)")
            conn.execute("CREATE INDEX IF NOT EXISTS idx_expires_at ON memories(expires_at)")
            
            conn.commit()
    
    def store_memory(self, memory_type: MemoryType, content: Dict[str, Any], 
                    context: Dict[str, Any] = None, tags: List[str] = None,
                    priority: MemoryPriority = MemoryPriority.NORMAL,
                    ttl_hours: Optional[int] = None) -> str:
        """Store a memory entry"""
        try:
            memory_id = str(uuid.uuid4())
            now = datetime.now(timezone.utc)
            
            # Calculate expiration
            expires_at = None
            if ttl_hours:
                expires_at = now + timedelta(hours=ttl_hours)
            elif memory_type == MemoryType.SHORT_TERM:
                expires_at = now + timedelta(hours=24)  # 1 day
            elif memory_type == MemoryType.EPHEMERAL:
                expires_at = now + timedelta(hours=1)   # 1 hour
            
            # Add context to content if provided
            if context:
                content = {**content, "context": context}
            
            # Create memory entry
            memory = SimpleMemoryEntry(
                memory_id=memory_id,
                agent_id=self.agent_id,
                memory_type=memory_type,
                priority=priority,
                content=content,
                tags=tags or [],
                created_at=now,
                accessed_at=now,
                expires_at=expires_at
            )
            
            # Store in database
            with sqlite3.connect(self.db_path) as conn:
                memory_data = memory.to_dict()
                conn.execute("""
                    INSERT INTO memories 
                    (memory_id, agent_id, memory_type, priority, content, tags, 
                     created_at, accessed_at, access_count, expires_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    memory_data["memory_id"],
                    memory_data["agent_id"],
                    memory_data["memory_type"],
                    memory_data["priority"],
                    memory_data["content"],
                    memory_data["tags"],
                    memory_data["created_at"],
                    memory_data["accessed_at"],
                    memory_data["access_count"],
                    memory_data["expires_at"]
                ))
                conn.commit()
            
            logger.debug(f"Stored memory {memory_id} for agent {self.agent_id}")
            return memory_id
            
        except Exception as e:
            logger.error(f"Failed to store memory: {e}")
            raise
    
    def retrieve_memory(self, memory_id: str) -> Optional[SimpleMemoryEntry]:
        """Retrieve a specific memory entry"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute("""
                    SELECT * FROM memories 
                    WHERE memory_id = ? AND agent_id = ?
                """, (memory_id, self.agent_id))
                
                row = cursor.fetchone()
                if not row:
                    return None
                
                # Convert row to dict
                memory_dict = dict(row)
                memory = SimpleMemoryEntry.from_dict(memory_dict)
                
                # Update access statistics
                memory.accessed_at = datetime.now(timezone.utc)
                memory.access_count += 1
                
                # Update in database
                conn.execute("""
                    UPDATE memories 
                    SET accessed_at = ?, access_count = ? 
                    WHERE memory_id = ?
                """, (memory.accessed_at.isoformat(), memory.access_count, memory_id))
                conn.commit()
                
                return memory
                
        except Exception as e:
            logger.error(f"Failed to retrieve memory {memory_id}: {e}")
            return None
    
    def retrieve_memories(self, query: str = None, memory_types: List[MemoryType] = None,
                         tags: List[str] = None, limit: int = 100) -> List[SimpleMemoryEntry]:
        """Retrieve memories matching criteria"""
        try:
            conditions = ["agent_id = ?"]
            params = [self.agent_id]
            
            # Add memory type filter
            if memory_types:
                type_placeholders = ",".join("?" * len(memory_types))
                conditions.append(f"memory_type IN ({type_placeholders})")
                params.extend([mt.value for mt in memory_types])
            
            # Add tag filter (simple contains check)
            if tags:
                for tag in tags:
                    conditions.append("tags LIKE ?")
                    params.append(f"%{tag}%")
            
            # Add content search (simple contains check)
            if query:
                conditions.append("content LIKE ?")
                params.append(f"%{query}%")
            
            # Add expiration filter
            conditions.append("(expires_at IS NULL OR expires_at > ?)")
            params.append(datetime.now(timezone.utc).isoformat())
            
            query_sql = f"""
                SELECT * FROM memories 
                WHERE {' AND '.join(conditions)}
                ORDER BY priority ASC, accessed_at DESC
                LIMIT ?
            """
            params.append(limit)
            
            with sqlite3.connect(self.db_path) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.execute(query_sql, params)
                
                memories = []
                for row in cursor.fetchall():
                    memory_dict = dict(row)
                    memory = SimpleMemoryEntry.from_dict(memory_dict)
                    memories.append(memory)
                
                return memories
                
        except Exception as e:
            logger.error(f"Failed to retrieve memories: {e}")
            return []
    
    def cleanup_expired_memories(self) -> int:
        """Clean up expired memories"""
        try:
            now = datetime.now(timezone.utc).isoformat()
            
            with sqlite3.connect(self.db_path) as conn:
                cursor = conn.execute("""
                    DELETE FROM memories 
                    WHERE expires_at IS NOT NULL AND expires_at <= ?
                """, (now,))
                
                deleted_count = cursor.rowcount
                conn.commit()
                
                if deleted_count > 0:
                    logger.info(f"Cleaned up {deleted_count} expired memories")
                
                return deleted_count
                
        except Exception as e:
            logger.error(f"Failed to cleanup expired memories: {e}")
            return 0
    
    def get_memory_stats(self) -> Dict[str, Any]:
        """Get memory system statistics"""
        try:
            with sqlite3.connect(self.db_path) as conn:
                # Total memories
                cursor = conn.execute("SELECT COUNT(*) FROM memories WHERE agent_id = ?", (self.agent_id,))
                total_memories = cursor.fetchone()[0]
                
                # Memory by type
                cursor = conn.execute("""
                    SELECT memory_type, COUNT(*) 
                    FROM memories 
                    WHERE agent_id = ? 
                    GROUP BY memory_type
                """, (self.agent_id,))
                
                memory_by_type = dict(cursor.fetchall())
                
                # Recent activity
                one_day_ago = (datetime.now(timezone.utc) - timedelta(days=1)).isoformat()
                cursor = conn.execute("""
                    SELECT COUNT(*) 
                    FROM memories 
                    WHERE agent_id = ? AND created_at > ?
                """, (self.agent_id, one_day_ago))
                
                recent_memories = cursor.fetchone()[0]
                
                return {
                    "total_memories": total_memories,
                    "memory_by_type": memory_by_type,
                    "recent_memories_24h": recent_memories,
                    "agent_id": self.agent_id
                }
                
        except Exception as e:
            logger.error(f"Failed to get memory stats: {e}")
            return {"error": str(e)}

# Factory function for easy creation
def create_simple_memory_system(db_path: str, agent_id: str) -> SimpleMemorySystem:
    """Create a simple memory system"""
    return SimpleMemorySystem(db_path, agent_id)

if __name__ == "__main__":
    # Demo the simple memory system
    memory_system = create_simple_memory_system("demo_memory.db", "test_agent")
    
    # Store some memories
    mem_id1 = memory_system.store_memory(
        MemoryType.EXPERIENCE,
        {"operation": "secret_analysis", "result": "success", "insights": ["high_risk_detected"]},
        context={"timestamp": datetime.now().isoformat()},
        tags=["analysis", "security"]
    )
    
    mem_id2 = memory_system.store_memory(
        MemoryType.PROCEDURAL,
        {"procedure": "rotation_scheduling", "steps": ["assess_risk", "schedule_rotation", "notify"]},
        context={"operation": "autonomous_optimization"},
        tags=["rotation", "automation"]
    )
    
    # Retrieve memories
    memories = memory_system.retrieve_memories(query="security", limit=10)
    print(f"🧠 Found {len(memories)} memories related to security")
    
    # Get stats
    stats = memory_system.get_memory_stats()
    print(f"📊 Memory stats: {stats}")
    
    print("✅ Simple Memory System demo complete!") 