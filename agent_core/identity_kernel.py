"""
🧬 IDENTITY KERNEL - Phase 3.1 Symbolic Foundation
=================================================

Implements symbolic self-awareness, anchor traits, and mutation lineage
as defined in the agent system architecture diagram.

This provides persistent identity for agents across modifications, enabling
symbolic reasoning about self and evolution tracking.

Based on: theplanmermaid/agent_system_architecture.mmd
Component: IDENTITY["🧬 IDENTITY KERNEL"]
"""

import json
import hashlib
from datetime import datetime, timezone
from typing import Dict, List, Any, Optional, Union
from dataclasses import dataclass, asdict
from pathlib import Path
import logging

# Setup logging
logger = logging.getLogger(__name__)

@dataclass
class MutationRecord:
    """Records a single mutation in agent evolution"""
    mutation_id: str
    timestamp: str
    mutation_type: str  # 'capability_add', 'behavior_modify', 'architecture_change'
    description: str
    impact_assessment: Dict[str, Any]
    rollback_data: Optional[Dict[str, Any]] = None
    success: bool = True

@dataclass
class AnchorTrait:
    """Immutable core identity trait"""
    trait_id: str
    name: str
    value: Any
    description: str
    immutable_reason: str
    established_at: str

@dataclass
class SymbolicSelf:
    """Agent's symbolic understanding of itself"""
    purpose_vector: str
    core_values: List[str]
    capabilities: List[str]
    behavioral_patterns: Dict[str, Any]
    interaction_preferences: Dict[str, Any]
    learning_style: str
    symbolic_representation: str

class IdentityKernel:
    """
    🧬 IDENTITY KERNEL
    
    Maintains persistent agent identity through all mutations, providing:
    - Symbolic self-awareness and representation
    - Immutable anchor traits that define core identity
    - Complete mutation lineage for evolution tracking  
    - MCP protocol context integration
    - Identity validation and integrity checks
    """
    
    def __init__(self, agent_id: str, identity_store_path: Optional[str] = None):
        """Initialize identity kernel for an agent"""
        self.agent_id = agent_id
        self.identity_store_path = identity_store_path or f"vault/identity_{agent_id}.json"
        
        # Core identity components (from mermaid architecture)
        self.anchor_traits: Dict[str, AnchorTrait] = {}
        self.mutation_lineage: List[MutationRecord] = []
        self.symbolic_self: Optional[SymbolicSelf] = None
        self.mcp_context: Dict[str, Any] = {}
        
        # Identity integrity
        self.identity_hash: Optional[str] = None
        self.created_at: str = datetime.now(timezone.utc).isoformat()
        self.last_validated: Optional[str] = None
        
        # Load existing identity or initialize new
        self._load_or_initialize_identity()
        
        logger.info(f"🧬 Identity Kernel initialized for agent {agent_id}")
    
    def _load_or_initialize_identity(self):
        """Load existing identity or create new one"""
        try:
            if Path(self.identity_store_path).exists():
                with open(self.identity_store_path, 'r', encoding='utf-8') as f:
                    data = json.load(f)
                    self._deserialize_identity(data)
                    logger.info(f"✅ Loaded existing identity for {self.agent_id}")
            else:
                self._initialize_new_identity()
                logger.info(f"🆕 Initialized new identity for {self.agent_id}")
        except Exception as e:
            logger.error(f"❌ Failed to load identity for {self.agent_id}: {e}")
            self._initialize_new_identity()
    
    def _initialize_new_identity(self):
        """Create new identity with basic anchors"""
        # Establish core anchor traits
        self.add_anchor_trait(
            trait_id="agent_id",
            name="Agent Identifier", 
            value=self.agent_id,
            description="Unique identifier for this agent",
            immutable_reason="Core identity reference - cannot change without losing identity"
        )
        
        self.add_anchor_trait(
            trait_id="creation_timestamp",
            name="Creation Timestamp",
            value=self.created_at,
            description="When this agent identity was first established",
            immutable_reason="Historical record - defines identity origin point"
        )
        
        # Initialize symbolic self
        self.symbolic_self = SymbolicSelf(
            purpose_vector="general_agent",
            core_values=["efficiency", "learning", "cooperation"],
            capabilities=["communication", "task_execution"],
            behavioral_patterns={},
            interaction_preferences={"protocol": "mcp", "communication_style": "professional"},
            learning_style="adaptive",
            symbolic_representation=f"Agent({self.agent_id})"
        )
        
        # Set initial MCP context
        self.mcp_context = {
            "protocol_version": "1.0",
            "supported_tools": [],
            "resource_permissions": [],
            "communication_endpoints": []
        }
        
        self._update_identity_hash()
        self._save_identity()
    
    def add_anchor_trait(self, trait_id: str, name: str, value: Any, 
                        description: str, immutable_reason: str) -> bool:
        """Add an immutable anchor trait"""
        if trait_id in self.anchor_traits:
            logger.warning(f"⚠️ Anchor trait {trait_id} already exists - cannot modify")
            return False
        
        trait = AnchorTrait(
            trait_id=trait_id,
            name=name,
            value=value,
            description=description,
            immutable_reason=immutable_reason,
            established_at=datetime.now(timezone.utc).isoformat()
        )
        
        self.anchor_traits[trait_id] = trait
        self._record_mutation("anchor_trait_add", f"Added anchor trait: {name}")
        self._update_identity_hash()
        self._save_identity()
        
        logger.info(f"🔒 Added anchor trait: {name}")
        return True
    
    def evolve_symbolic_self(self, updates: Dict[str, Any], 
                           mutation_description: str) -> bool:
        """Evolve the symbolic self while maintaining identity"""
        if not self.symbolic_self:
            logger.error("❌ No symbolic self to evolve")
            return False
        
        # Validate evolution doesn't violate anchor traits
        if not self._validate_evolution_safety(updates):
            logger.error("❌ Evolution violates anchor traits")
            return False
        
        # Create rollback data
        rollback_data = asdict(self.symbolic_self)
        
        # Apply updates
        for key, value in updates.items():
            if hasattr(self.symbolic_self, key):
                setattr(self.symbolic_self, key, value)
                logger.info(f"🔄 Updated symbolic self: {key}")
        
        # Record mutation
        self._record_mutation(
            "symbolic_self_evolution", 
            mutation_description,
            rollback_data=rollback_data
        )
        
        self._update_identity_hash()
        self._save_identity()
        return True
    
    def update_mcp_context(self, context_updates: Dict[str, Any]) -> bool:
        """Update MCP protocol context"""
        self.mcp_context.update(context_updates)
        self._record_mutation("mcp_context_update", f"Updated MCP context: {list(context_updates.keys())}")
        self._update_identity_hash()
        self._save_identity()
        
        logger.info(f"🔧 Updated MCP context: {list(context_updates.keys())}")
        return True
    
    def _validate_evolution_safety(self, updates: Dict[str, Any]) -> bool:
        """Validate that evolution doesn't violate identity integrity"""
        # Check if updates conflict with anchor traits
        for trait in self.anchor_traits.values():
            if trait.trait_id in updates:
                logger.warning(f"⚠️ Attempted to modify anchor trait: {trait.name}")
                return False
        
        # Validate purpose vector coherence
        if 'purpose_vector' in updates:
            new_purpose = updates['purpose_vector']
            if not isinstance(new_purpose, str) or len(new_purpose) == 0:
                logger.warning("⚠️ Invalid purpose vector format")
                return False
        
        return True
    
    def _record_mutation(self, mutation_type: str, description: str, 
                        rollback_data: Optional[Dict[str, Any]] = None):
        """Record a mutation in the lineage"""
        mutation = MutationRecord(
            mutation_id=f"{self.agent_id}_{len(self.mutation_lineage)}_{int(datetime.now(timezone.utc).timestamp())}",
            timestamp=datetime.now(timezone.utc).isoformat(),
            mutation_type=mutation_type,
            description=description,
            impact_assessment={"identity_hash_changed": True},
            rollback_data=rollback_data,
            success=True
        )
        
        self.mutation_lineage.append(mutation)
        logger.info(f"📝 Recorded mutation: {description}")
    
    def _update_identity_hash(self):
        """Update identity integrity hash"""
        # Create canonical representation for hashing
        canonical_data = {
            "agent_id": self.agent_id,
            "anchor_traits": {k: asdict(v) for k, v in self.anchor_traits.items()},
            "symbolic_self": asdict(self.symbolic_self) if self.symbolic_self else None,
            "mcp_context": self.mcp_context
        }
        
        canonical_json = json.dumps(canonical_data, sort_keys=True)
        self.identity_hash = hashlib.sha256(canonical_json.encode()).hexdigest()
        self.last_validated = datetime.now(timezone.utc).isoformat()
    
    def validate_identity_integrity(self) -> bool:
        """Validate identity integrity using hash"""
        current_hash = self.identity_hash
        self._update_identity_hash()
        
        if current_hash != self.identity_hash:
            logger.error(f"❌ Identity integrity violation for {self.agent_id}")
            return False
        
        logger.info(f"✅ Identity integrity validated for {self.agent_id}")
        return True
    
    def get_identity_summary(self) -> Dict[str, Any]:
        """Get comprehensive identity summary"""
        return {
            "agent_id": self.agent_id,
            "identity_hash": self.identity_hash,
            "created_at": self.created_at,
            "last_validated": self.last_validated,
            "anchor_traits_count": len(self.anchor_traits),
            "mutation_count": len(self.mutation_lineage),
            "symbolic_self": asdict(self.symbolic_self) if self.symbolic_self else None,
            "mcp_context": self.mcp_context,
            "integrity_status": "valid" if self.validate_identity_integrity() else "compromised"
        }
    
    def rollback_to_mutation(self, mutation_id: str) -> bool:
        """Rollback to a specific mutation point"""
        # Find the mutation
        target_mutation = None
        for mutation in self.mutation_lineage:
            if mutation.mutation_id == mutation_id:
                target_mutation = mutation
                break
        
        if not target_mutation or not target_mutation.rollback_data:
            logger.error(f"❌ Cannot rollback to mutation {mutation_id}")
            return False
        
        # Apply rollback
        if target_mutation.mutation_type == "symbolic_self_evolution":
            self.symbolic_self = SymbolicSelf(**target_mutation.rollback_data)
            
        # Record rollback as new mutation
        self._record_mutation(
            "rollback",
            f"Rolled back to mutation: {mutation_id}"
        )
        
        self._update_identity_hash()
        self._save_identity()
        
        logger.info(f"🔄 Rolled back to mutation: {mutation_id}")
        return True
    
    def _serialize_identity(self) -> Dict[str, Any]:
        """Serialize identity for storage"""
        return {
            "agent_id": self.agent_id,
            "identity_hash": self.identity_hash,
            "created_at": self.created_at,
            "last_validated": self.last_validated,
            "anchor_traits": {k: asdict(v) for k, v in self.anchor_traits.items()},
            "mutation_lineage": [asdict(m) for m in self.mutation_lineage],
            "symbolic_self": asdict(self.symbolic_self) if self.symbolic_self else None,
            "mcp_context": self.mcp_context
        }
    
    def _deserialize_identity(self, data: Dict[str, Any]):
        """Deserialize identity from storage"""
        self.identity_hash = data.get("identity_hash")
        self.created_at = data.get("created_at", self.created_at)
        self.last_validated = data.get("last_validated")
        
        # Deserialize anchor traits
        for trait_id, trait_data in data.get("anchor_traits", {}).items():
            self.anchor_traits[trait_id] = AnchorTrait(**trait_data)
        
        # Deserialize mutation lineage
        for mutation_data in data.get("mutation_lineage", []):
            self.mutation_lineage.append(MutationRecord(**mutation_data))
        
        # Deserialize symbolic self
        symbolic_data = data.get("symbolic_self")
        if symbolic_data:
            self.symbolic_self = SymbolicSelf(**symbolic_data)
        
        # Deserialize MCP context
        self.mcp_context = data.get("mcp_context", {})
    
    def _save_identity(self):
        """Save identity to persistent storage"""
        try:
            # Ensure directory exists
            Path(self.identity_store_path).parent.mkdir(parents=True, exist_ok=True)
            
            with open(self.identity_store_path, 'w', encoding='utf-8') as f:
                json.dump(self._serialize_identity(), f, indent=2, ensure_ascii=False)
            
            logger.debug(f"💾 Saved identity for {self.agent_id}")
        except Exception as e:
            logger.error(f"❌ Failed to save identity for {self.agent_id}: {e}")

# Factory function for easy creation
def create_identity_kernel(agent_id: str, **kwargs) -> IdentityKernel:
    """Factory function to create an identity kernel"""
    return IdentityKernel(agent_id, **kwargs)

if __name__ == "__main__":
    # Demo the identity kernel
    import sys
    sys.path.append('.')
    
    # Create test identity
    identity = create_identity_kernel("test_agent_001")
    
    # Evolve symbolic self
    identity.evolve_symbolic_self({
        "purpose_vector": "security_specialist",
        "core_values": ["security", "privacy", "vigilance"],
        "capabilities": ["threat_detection", "risk_assessment", "incident_response"]
    }, "Specialized for security intelligence")
    
    # Update MCP context
    identity.update_mcp_context({
        "supported_tools": ["threat_scanner", "log_analyzer", "alert_system"],
        "protocol_version": "1.1"
    })
    
    # Display summary
    summary = identity.get_identity_summary()
    print("🧬 Identity Kernel Demo:")
    print(json.dumps(summary, indent=2)) 