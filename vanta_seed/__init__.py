"""
Vanta Seed - Universal Agent Protocol (UAP) Framework
====================================================

Core infrastructure for Level 2 UAP Agent Governance compliance.
Provides standardized agent base classes, protocol handlers, and ecosystem tools.

Version: 2.0
Compliance: Level 2 UAP Agent Standards
"""

__version__ = "2.0.0"
__author__ = "Secrets Agent AI"
__description__ = "Universal Agent Protocol Framework for Multi-Agent Systems"

# Core imports for easy access
from .core.uap_agent_base import UAPAgentBase
from .core.component_registry import COMPONENT_REGISTRY, ProtocolType
from .core.protocol_handlers import MCPHandler, A2AHandler, CrossProtocolHandler
from .core.compliance_validator import COMPLIANCE_VALIDATOR, validate_agent, generate_compliance_summary
from .protocols.message_types import AgentMessage, CascadeContext, CascadeResult

# Governance seeding system for universal synchronization
from .governance import (
    LEVEL2_SEEDING_SYSTEM,
    sync_uap_governance,
    validate_app_compliance,
    get_governance_status,
    initialize_governance_ecosystem
)

__all__ = [
    # Core UAP Framework
    'UAPAgentBase',
    'COMPONENT_REGISTRY', 
    'ProtocolType',
    'MCPHandler',
    'A2AHandler', 
    'CrossProtocolHandler',
    'COMPLIANCE_VALIDATOR',
    'validate_agent',
    'generate_compliance_summary',
    'AgentMessage',
    'CascadeContext',
    'CascadeResult',
    
    # Governance Seeding System (for universal sync)
    'LEVEL2_SEEDING_SYSTEM',
    'sync_uap_governance',
    'validate_app_compliance', 
    'get_governance_status',
    'initialize_governance_ecosystem'
]

# Level 2 Seeding Configuration
SEEDING_CONFIG = {
    "auto_seed_on_import": True,
    "compliance_enforcement": "strict",
    "sync_on_app_start": True,
    "governance_version": "2.0.0",
    "universal_standards": True
}
