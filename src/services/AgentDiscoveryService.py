#!/usr/bin/env python3
"""
Agent Discovery Service - Enhanced with UAP Agent Support

Comprehensive agent discovery and registration system that handles:
- Traditional VANTA agents
- UAP (Universal Agent Protocol) agents 
- Cross-platform agent coordination
- Real-time agent status monitoring
- Agent lifecycle management
"""

import os
import json
import yaml
import asyncio
import logging
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone
from pathlib import Path
import subprocess
import importlib.util

from ..utils.logger import create_logger
from ..agents.AgentBase import AgentBase

class AgentType:
    TRADITIONAL = "traditional"
    UAP_LEVEL_1 = "uap_level_1"
    UAP_LEVEL_2 = "uap_level_2" 
    UAP_LEVEL_3 = "uap_level_3"
    RUNTIME_ORCHESTRATOR = "runtime_orchestrator"
    GOVERNANCE = "governance"

class AgentStatus:
    DISCOVERED = "discovered"
    REGISTERED = "registered"
    ACTIVE = "active"
    INACTIVE = "inactive"
    ERROR = "error"
    UNKNOWN = "unknown"

class AgentDiscoveryService:
    """
    Enhanced Agent Discovery Service with UAP Protocol Support
    
    Capabilities:
    - Discover traditional VANTA agents
    - Discover and register UAP Level 1-3 agents
    - Real-time agent status monitoring
    - Cross-project agent coordination
    - Agent lifecycle management
    - Integration with OperatorOmega runtime orchestrator
    """
    
    def __init__(self, 
                 base_path: str = ".", 
                 config: Optional[Dict[str, Any]] = None):
        self.base_path = Path(base_path)
        self.config = config or {}
        self.logger = create_logger('AgentDiscoveryService')
        
        # Agent registries
        self.discovered_agents: Dict[str, Dict[str, Any]] = {}
        self.uap_agents: Dict[str, Dict[str, Any]] = {}
        self.runtime_orchestrators: Dict[str, Dict[str, Any]] = {}
        self.active_agents: Dict[str, Any] = {}
        
        # Discovery paths
        self.discovery_paths = [
            "src/agents",
            "agents", 
            "UAP/runners",
            "governance/integration",
            "vanta_seed/agents"
        ]
        
        # UAP manifest patterns
        self.uap_manifest_patterns = [
            "**/*.uap.yaml",
            "**/manifests/*.yaml",
            "UAP/manifests/*.yaml"
        ]
        
        # Agent file patterns
        self.agent_patterns = [
            "**/*Agent.py",
            "**/*Agent.ts",
            "**/agents/**/*.py",
            "**/agents/**/*.ts"
        ]
    
    async def discover_all_agents(self) -> Dict[str, Any]:
        """
        Comprehensive agent discovery across all systems
        
        Returns:
            Dictionary containing all discovered agents organized by type
        """
        try:
            self.logger.info("Starting comprehensive agent discovery")
            
            discovery_result = {
                "traditional_agents": [],
                "uap_agents": [],
                "runtime_orchestrators": [],
                "governance_agents": [],
                "discovery_stats": {
                    "total_discovered": 0,
                    "total_registered": 0,
                    "discovery_time": datetime.now(timezone.utc).isoformat(),
                    "discovery_paths_scanned": len(self.discovery_paths)
                }
            }
            
            # 1. Discover traditional VANTA agents
            traditional_agents = await self._discover_traditional_agents()
            discovery_result["traditional_agents"] = traditional_agents
            
            # 2. Discover UAP agents (Level 1-3)
            uap_agents = await self._discover_uap_agents()
            discovery_result["uap_agents"] = uap_agents
            
            # 3. Discover runtime orchestrators (Level 3 UAP)
            runtime_orchestrators = await self._discover_runtime_orchestrators()
            discovery_result["runtime_orchestrators"] = runtime_orchestrators
            
            # 4. Discover governance integration agents
            governance_agents = await self._discover_governance_agents()
            discovery_result["governance_agents"] = governance_agents
            
            # 5. Update agent registry
            await self._update_agent_registry(discovery_result)
            
            # 6. Calculate statistics
            total_discovered = (
                len(traditional_agents) + 
                len(uap_agents) + 
                len(runtime_orchestrators) + 
                len(governance_agents)
            )
            
            discovery_result["discovery_stats"]["total_discovered"] = total_discovered
            
            self.logger.info("Agent discovery completed", {
                "total_discovered": total_discovered,
                "traditional": len(traditional_agents),
                "uap": len(uap_agents),
                "runtime_orchestrators": len(runtime_orchestrators),
                "governance": len(governance_agents)
            })
            
            return discovery_result
            
        except Exception as e:
            self.logger.error(f"Agent discovery failed: {str(e)}")
            raise
    
    async def _discover_traditional_agents(self) -> List[Dict[str, Any]]:
        """Discover traditional VANTA agents"""
        agents = []
        
        for discovery_path in self.discovery_paths:
            full_path = self.base_path / discovery_path
            if not full_path.exists():
                continue
            
            # Find Python agent files
            for pattern in self.agent_patterns:
                for agent_file in full_path.rglob(pattern.split('/')[-1]):
                    if agent_file.name.endswith('Agent.py'):
                        agent_info = await self._analyze_traditional_agent(agent_file)
                        if agent_info:
                            agents.append(agent_info)
        
        return agents
    
    async def _discover_uap_agents(self) -> List[Dict[str, Any]]:
        """Discover UAP (Universal Agent Protocol) agents"""
        uap_agents = []
        
        # Look for UAP manifest files
        for pattern in self.uap_manifest_patterns:
            for manifest_file in self.base_path.rglob(pattern.split('/')[-1]):
                if manifest_file.suffix in ['.yaml', '.yml']:
                    uap_info = await self._analyze_uap_manifest(manifest_file)
                    if uap_info:
                        uap_agents.append(uap_info)
        
        # Also check UAP/runners directory specifically
        uap_runners_path = self.base_path / "UAP" / "runners"
        if uap_runners_path.exists():
            for agent_file in uap_runners_path.rglob("*.py"):
                if "Agent" in agent_file.name:
                    uap_info = await self._analyze_uap_runner(agent_file)
                    if uap_info:
                        uap_agents.append(uap_info)
        
        return uap_agents
    
    async def _discover_runtime_orchestrators(self) -> List[Dict[str, Any]]:
        """Discover UAP Level 3 Runtime Orchestrators"""
        orchestrators = []
        
        # Look for the OperatorOmega agent specifically
        omega_agent_path = self.base_path / "src" / "agents" / "OperatorOmegaAgent.py"
        if omega_agent_path.exists():
            omega_info = await self._analyze_runtime_orchestrator(omega_agent_path)
            if omega_info:
                orchestrators.append(omega_info)
        
        # Look for other potential Level 3 agents
        for discovery_path in self.discovery_paths:
            full_path = self.base_path / discovery_path
            if not full_path.exists():
                continue
            
            for agent_file in full_path.rglob("*Agent.py"):
                # Check if it's a Level 3 agent by looking for UAP imports
                if await self._is_level_3_agent(agent_file):
                    orchestrator_info = await self._analyze_runtime_orchestrator(agent_file)
                    if orchestrator_info and orchestrator_info not in orchestrators:
                        orchestrators.append(orchestrator_info)
        
        return orchestrators
    
    async def _discover_governance_agents(self) -> List[Dict[str, Any]]:
        """Discover governance integration agents"""
        governance_agents = []
        
        governance_path = self.base_path / "governance" / "integration"
        if governance_path.exists():
            for agent_file in governance_path.rglob("*.py"):
                if "executor" in agent_file.name.lower() or "agent" in agent_file.name.lower():
                    gov_info = await self._analyze_governance_agent(agent_file)
                    if gov_info:
                        governance_agents.append(gov_info)
        
        return governance_agents
    
    async def _analyze_traditional_agent(self, agent_file: Path) -> Optional[Dict[str, Any]]:
        """Analyze a traditional VANTA agent file"""
        try:
            with open(agent_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            agent_info = {
                "agent_id": agent_file.stem,
                "name": agent_file.stem,
                "type": AgentType.TRADITIONAL,
                "file_path": str(agent_file.relative_to(self.base_path)),
                "status": AgentStatus.DISCOVERED,
                "capabilities": [],
                "dependencies": [],
                "config_path": None,
                "last_modified": datetime.fromtimestamp(agent_file.stat().st_mtime).isoformat()
            }
            
            # Extract agent information from code
            if "class " in content and "AgentBase" in content:
                agent_info["inherits_agent_base"] = True
                agent_info["vanta_compliant"] = True
            
            # Look for UAP imports
            if "UAPAgentBase" in content:
                agent_info["type"] = AgentType.UAP_LEVEL_2
                agent_info["uap_enabled"] = True
            
            # Look for capabilities in docstring or comments
            if '"""' in content:
                docstring_start = content.find('"""') + 3
                docstring_end = content.find('"""', docstring_start)
                if docstring_end > docstring_start:
                    docstring = content[docstring_start:docstring_end]
                    agent_info["description"] = docstring.strip()
            
            return agent_info
            
        except Exception as e:
            self.logger.warn(f"Failed to analyze agent {agent_file}: {str(e)}")
            return None
    
    async def _analyze_uap_manifest(self, manifest_file: Path) -> Optional[Dict[str, Any]]:
        """Analyze a UAP manifest file"""
        try:
            with open(manifest_file, 'r', encoding='utf-8') as f:
                manifest_data = yaml.safe_load(f)
            
            if not manifest_data or 'title' not in manifest_data:
                return None
            
            uap_info = {
                "agent_id": manifest_file.stem.replace('.uap', ''),
                "name": manifest_data.get('title', manifest_file.stem),
                "type": f"uap_level_{manifest_data.get('level', 1)}",
                "file_path": str(manifest_file.relative_to(self.base_path)),
                "status": AgentStatus.DISCOVERED,
                "uap_level": manifest_data.get('level', 1),
                "version": manifest_data.get('version', '1.0.0'),
                "capabilities": list(manifest_data.get('capabilities', {}).values()),
                "agent_roles": manifest_data.get('agent_roles', {}),
                "symbolic_intent": manifest_data.get('symbolic_intent', {}),
                "last_modified": datetime.fromtimestamp(manifest_file.stat().st_mtime).isoformat()
            }
            
            # Mark Level 3 agents as runtime orchestrators
            if uap_info["uap_level"] == 3:
                uap_info["type"] = AgentType.RUNTIME_ORCHESTRATOR
            
            return uap_info
            
        except Exception as e:
            self.logger.warn(f"Failed to analyze UAP manifest {manifest_file}: {str(e)}")
            return None
    
    async def _analyze_uap_runner(self, agent_file: Path) -> Optional[Dict[str, Any]]:
        """Analyze a UAP runner file"""
        try:
            with open(agent_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Look for UAP base class
            if "UAPAgentBase" not in content:
                return None
            
            uap_info = {
                "agent_id": agent_file.stem,
                "name": agent_file.stem,
                "type": AgentType.UAP_LEVEL_2,  # Default, will be updated based on content
                "file_path": str(agent_file.relative_to(self.base_path)),
                "status": AgentStatus.DISCOVERED,
                "runner_type": "python",
                "capabilities": [],
                "last_modified": datetime.fromtimestamp(agent_file.stat().st_mtime).isoformat()
            }
            
            # Try to determine UAP level from content
            if "level = 3" in content or "Level 3" in content:
                uap_info["type"] = AgentType.RUNTIME_ORCHESTRATOR
                uap_info["uap_level"] = 3
            elif "level = 2" in content or "Level 2" in content:
                uap_info["type"] = AgentType.UAP_LEVEL_2
                uap_info["uap_level"] = 2
            else:
                uap_info["uap_level"] = 1
            
            return uap_info
            
        except Exception as e:
            self.logger.warn(f"Failed to analyze UAP runner {agent_file}: {str(e)}")
            return None
    
    async def _analyze_runtime_orchestrator(self, agent_file: Path) -> Optional[Dict[str, Any]]:
        """Analyze a runtime orchestrator agent"""
        try:
            with open(agent_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            orchestrator_info = {
                "agent_id": agent_file.stem,
                "name": agent_file.stem,
                "type": AgentType.RUNTIME_ORCHESTRATOR,
                "file_path": str(agent_file.relative_to(self.base_path)),
                "status": AgentStatus.DISCOVERED,
                "uap_level": 3,
                "runtime_capabilities": [],
                "ecosystem_scope": None,
                "last_modified": datetime.fromtimestamp(agent_file.stat().st_mtime).isoformat()
            }
            
            # Extract runtime capabilities
            if "ecosystem_management" in content:
                orchestrator_info["runtime_capabilities"].append("ecosystem_management")
            if "cross_project" in content:
                orchestrator_info["runtime_capabilities"].append("cross_project_coordination")
            if "agent_bus" in content:
                orchestrator_info["runtime_capabilities"].append("agent_bus_integration")
            if "vault" in content.lower():
                orchestrator_info["runtime_capabilities"].append("vault_integration")
            
            # Look for ecosystem scope
            if "ecosystem_root" in content:
                orchestrator_info["ecosystem_scope"] = "multi_project"
            
            return orchestrator_info
            
        except Exception as e:
            self.logger.warn(f"Failed to analyze runtime orchestrator {agent_file}: {str(e)}")
            return None
    
    async def _analyze_governance_agent(self, agent_file: Path) -> Optional[Dict[str, Any]]:
        """Analyze a governance integration agent"""
        try:
            with open(agent_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            gov_info = {
                "agent_id": agent_file.stem,
                "name": agent_file.stem,
                "type": AgentType.GOVERNANCE,
                "file_path": str(agent_file.relative_to(self.base_path)),
                "status": AgentStatus.DISCOVERED,
                "governance_scope": [],
                "integration_points": [],
                "last_modified": datetime.fromtimestamp(agent_file.stat().st_mtime).isoformat()
            }
            
            # Extract governance capabilities
            if "policy" in content.lower():
                gov_info["governance_scope"].append("policy_enforcement")
            if "compliance" in content.lower():
                gov_info["governance_scope"].append("compliance_validation")
            if "integration" in content.lower():
                gov_info["governance_scope"].append("integration_management")
            
            return gov_info
            
        except Exception as e:
            self.logger.warn(f"Failed to analyze governance agent {agent_file}: {str(e)}")
            return None
    
    async def _is_level_3_agent(self, agent_file: Path) -> bool:
        """Check if an agent file represents a Level 3 UAP agent"""
        try:
            with open(agent_file, 'r', encoding='utf-8') as f:
                content = f.read()
            
            # Look for Level 3 indicators
            level_3_indicators = [
                "UAP Level 3",
                "Runtime Orchestrator",
                "ecosystem_management",
                "multi_project",
                "cross_project_sync"
            ]
            
            return any(indicator in content for indicator in level_3_indicators)
            
        except Exception:
            return False
    
    async def _update_agent_registry(self, discovery_result: Dict[str, Any]) -> None:
        """Update the central agent registry with discovery results"""
        try:
            registry_path = self.base_path / "src" / "agents" / "index.json"
            
            # Load existing registry
            existing_registry = {}
            if registry_path.exists():
                with open(registry_path, 'r', encoding='utf-8') as f:
                    existing_registry = json.load(f)
            
            # Update with discovered agents
            if "agent_registry" not in existing_registry:
                existing_registry["agent_registry"] = {
                    "version": "1.0.0",
                    "last_updated": datetime.now(timezone.utc).isoformat(),
                    "agents": {}
                }
            
            registry = existing_registry["agent_registry"]
            
            # Add traditional agents
            for agent in discovery_result["traditional_agents"]:
                registry["agents"][agent["agent_id"]] = {
                    "name": agent["name"],
                    "class": agent["agent_id"],
                    "file": agent["file_path"],
                    "level": 2 if agent.get("uap_enabled") else 1,
                    "type": agent["type"],
                    "status": agent["status"],
                    "discovery_method": "traditional_scan",
                    "last_discovered": datetime.now(timezone.utc).isoformat()
                }
            
            # Add UAP agents
            for agent in discovery_result["uap_agents"]:
                registry["agents"][agent["agent_id"]] = {
                    "name": agent["name"],
                    "class": agent["agent_id"],
                    "file": agent["file_path"],
                    "level": agent.get("uap_level", 1),
                    "type": agent["type"],
                    "status": agent["status"],
                    "uap_manifest": True,
                    "capabilities": agent.get("capabilities", []),
                    "discovery_method": "uap_scan",
                    "last_discovered": datetime.now(timezone.utc).isoformat()
                }
            
            # Add runtime orchestrators
            for agent in discovery_result["runtime_orchestrators"]:
                registry["agents"][agent["agent_id"]] = {
                    "name": agent["name"],
                    "class": agent["agent_id"],
                    "file": agent["file_path"],
                    "level": 3,
                    "type": AgentType.RUNTIME_ORCHESTRATOR,
                    "status": agent["status"],
                    "runtime_capabilities": agent.get("runtime_capabilities", []),
                    "ecosystem_scope": agent.get("ecosystem_scope"),
                    "discovery_method": "runtime_orchestrator_scan",
                    "last_discovered": datetime.now(timezone.utc).isoformat()
                }
            
            # Add governance agents
            for agent in discovery_result["governance_agents"]:
                registry["agents"][agent["agent_id"]] = {
                    "name": agent["name"],
                    "class": agent["agent_id"],
                    "file": agent["file_path"],
                    "level": 2,
                    "type": AgentType.GOVERNANCE,
                    "status": agent["status"],
                    "governance_scope": agent.get("governance_scope", []),
                    "discovery_method": "governance_scan",
                    "last_discovered": datetime.now(timezone.utc).isoformat()
                }
            
            # Update metadata
            registry["last_updated"] = datetime.now(timezone.utc).isoformat()
            registry["discovery_stats"] = discovery_result["discovery_stats"]
            
            # Write updated registry
            with open(registry_path, 'w', encoding='utf-8') as f:
                json.dump(existing_registry, f, indent=2)
            
            self.logger.info("Agent registry updated successfully", {
                "registry_path": str(registry_path),
                "total_agents": len(registry["agents"])
            })
            
        except Exception as e:
            self.logger.error(f"Failed to update agent registry: {str(e)}")
    
    async def get_agent_status(self, agent_id: str) -> Dict[str, Any]:
        """Get the current status of a specific agent"""
        try:
            # Check if agent is in registry
            registry_path = self.base_path / "src" / "agents" / "index.json"
            if registry_path.exists():
                with open(registry_path, 'r', encoding='utf-8') as f:
                    registry = json.load(f)
                
                agent_info = registry.get("agent_registry", {}).get("agents", {}).get(agent_id)
                if agent_info:
                    # Try to load and check if agent is actually loadable
                    try:
                        agent_module_path = self.base_path / agent_info["file"]
                        if agent_module_path.exists():
                            agent_info["file_exists"] = True
                            agent_info["status"] = AgentStatus.REGISTERED
                        else:
                            agent_info["file_exists"] = False
                            agent_info["status"] = AgentStatus.ERROR
                    except Exception:
                        agent_info["status"] = AgentStatus.ERROR
                    
                    return agent_info
            
            return {"error": "Agent not found", "agent_id": agent_id}
            
        except Exception as e:
            self.logger.error(f"Failed to get agent status for {agent_id}: {str(e)}")
            return {"error": str(e), "agent_id": agent_id}
    
    async def register_uap_agent(self, 
                                agent_id: str, 
                                manifest_path: str, 
                                agent_file: str) -> Dict[str, Any]:
        """Register a new UAP agent"""
        try:
            self.logger.info(f"Registering UAP agent: {agent_id}")
            
            # Analyze the manifest
            manifest_file = Path(manifest_path)
            uap_info = await self._analyze_uap_manifest(manifest_file)
            
            if not uap_info:
                raise ValueError("Invalid UAP manifest")
            
            # Update registry
            registry_path = self.base_path / "src" / "agents" / "index.json"
            existing_registry = {}
            
            if registry_path.exists():
                with open(registry_path, 'r', encoding='utf-8') as f:
                    existing_registry = json.load(f)
            
            if "agent_registry" not in existing_registry:
                existing_registry["agent_registry"] = {"agents": {}}
            
            # Add the new UAP agent
            existing_registry["agent_registry"]["agents"][agent_id] = {
                "name": uap_info["name"],
                "class": agent_id,
                "file": agent_file,
                "level": uap_info.get("uap_level", 1),
                "type": uap_info["type"],
                "status": AgentStatus.REGISTERED,
                "uap_manifest": manifest_path,
                "capabilities": uap_info.get("capabilities", []),
                "registered_at": datetime.now(timezone.utc).isoformat()
            }
            
            # Save registry
            with open(registry_path, 'w', encoding='utf-8') as f:
                json.dump(existing_registry, f, indent=2)
            
            self.logger.info(f"UAP agent {agent_id} registered successfully")
            return {"success": True, "agent_id": agent_id, "status": "registered"}
            
        except Exception as e:
            self.logger.error(f"Failed to register UAP agent {agent_id}: {str(e)}")
            return {"success": False, "error": str(e)} 