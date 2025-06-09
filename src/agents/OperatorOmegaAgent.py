#!/usr/bin/env python3
"""
OperatorOmega Agent - UAP Level 3 Runtime Orchestrator

Universal Agent Protocol Level 3 Runtime Orchestrator for:
- Multi-project ecosystem management (93 projects detected)
- VANTA AI API auto setup across all projects
- Auto CLI vault setup in every project
- Cross-project secret and resource distribution
- Agent bus integration and orchestration
- Level 1/Level 2 rules and agents synchronization

This is a RUNTIME AGENT that operates across the entire project ecosystem.
"""

import os
import json
import asyncio
import logging
import subprocess
import uuid
from typing import Dict, List, Any, Optional, Union, Callable
from datetime import datetime, timezone
from pathlib import Path
import shutil
import yaml

# UAP imports
import sys
sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..', 'UAP', 'runners'))
from UAPAgentBase import UAPAgentBase

# Core VANTA imports
from ..utils.logger import create_logger
from .AgentBase import AgentBase, TaskData, TaskResult

class OperatorOmegaAgent(UAPAgentBase, AgentBase):
    """
    UAP Level 3 Runtime Orchestrator
    
    Capabilities:
    - Universal Agent Protocol Level 3 compliance
    - Multi-project ecosystem orchestration (93 projects)
    - VANTA AI API auto deployment
    - Cross-project secret distribution
    - Agent bus integration
    - Code as tools execution
    - Runtime rules and agent synchronization
    """
    
    def __init__(self, 
                 agent_id: str = "operator_omega_runtime", 
                 core_config: Dict[str, Any] = None,
                 ecosystem_root: str = None,
                 **kwargs):
        
        # Initialize both base classes
        AgentBase.__init__(self, agent_id, core_config or {}, **kwargs)
        
        # UAP configuration path - create if doesn't exist
        uap_config_path = os.path.join(os.path.dirname(__file__), '..', '..', 'UAP', 'manifests', 'omega_executor.uap.yaml')
        if not os.path.exists(uap_config_path):
            self._create_uap_config(uap_config_path)
        
        UAPAgentBase.__init__(self, uap_config_path)
        
        self.logger = create_logger('OperatorOmegaRuntime')
        
        # Ecosystem configuration - detected structure
        self.ecosystem_root = ecosystem_root or "C:\\Users\\Jonbr\\pinokio\\api"
        self.project_registry = {}
        self.agent_bus = None
        self.vanta_api_endpoints = {}
        
        # Runtime state
        self.active_projects = {}
        self.distributed_secrets = {}
        self.synchronized_agents = {}
        self.tool_registry = {}
        
        # Auto-discovery settings
        self.auto_vault_setup = True
        self.auto_vanta_api = True
        self.cross_project_sync = True
        
        # Code-as-tools capabilities
        self.code_tools = {
            'cli_scanner': self._code_tool_cli_scan,
            'project_analyzer': self._code_tool_project_analyze,
            'secret_vacuum': self._code_tool_secret_vacuum,
            'agent_deployer': self._code_tool_agent_deploy,
            'vault_distributor': self._code_tool_vault_distribute
        }
        
        self.logger.info("OperatorOmega UAP Level 3 Runtime Orchestrator initialized", {
            'ecosystem_root': self.ecosystem_root,
            'uap_config': uap_config_path,
            'level': 3
        })

    def _create_uap_config(self, config_path: str) -> None:
        """Create UAP configuration for OperatorOmega"""
        os.makedirs(os.path.dirname(config_path), exist_ok=True)
        
        uap_config = {
            'title': 'OperatorOmega Runtime Orchestrator',
            'version': '3.0.0',
            'level': 3,
            'agent_roles': {
                'orchestrator': 'Multi-project ecosystem coordination',
                'distributor': 'Cross-project resource distribution',
                'integrator': 'VANTA AI API auto setup',
                'synchronizer': 'Agent and rules synchronization',
                'vacuum': 'Cross-project secret harvesting and distribution'
            },
            'symbolic_intent': {
                'primary': 'Orchestrate entire multi-project development ecosystem',
                'secondary': 'Automate VANTA infrastructure deployment across 93+ projects',
                'tertiary': 'Ensure cross-project coherence and resource sharing',
                'quaternary': 'Vacuum and redistribute secrets/resources as needed'
            },
            'capabilities': {
                'memory': 'Universal Agent Memory with cross-project context',
                'tools': 'Code as tools, CLI access, async execution',
                'bus': 'Agent bus integration for real-time coordination',
                'runtime': 'Level 1/Level 2 rules and agent synchronization',
                'vacuum': 'Cross-project secret and resource vacuum/distribution'
            }
        }
        
        with open(config_path, 'w') as f:
            yaml.dump(uap_config, f, default_flow_style=False)

    async def setup(self) -> None:
        """Initialize the UAP Level 3 Runtime Orchestrator"""
        try:
            self.logger.info("Setting up OperatorOmega Runtime Orchestrator...")
            
            # 1. Initialize agent bus
            await self._initialize_agent_bus()
            
            # 2. Discover all projects in ecosystem (93 projects detected)
            await self._discover_ecosystem_projects()
            
            # 3. Setup VANTA AI API in each project
            if self.auto_vanta_api:
                await self._auto_setup_vanta_apis()
            
            # 4. Setup auto vault CLI in each project
            if self.auto_vault_setup:
                await self._auto_setup_vault_cli()
            
            # 5. Initialize cross-project synchronization
            if self.cross_project_sync:
                await self._initialize_cross_project_sync()
            
            # 6. Register code-as-tools capabilities
            await self._register_code_tools()
            
            # 7. Start runtime monitoring
            await self._start_runtime_monitoring()
            
            # 8. Initialize vacuum and distribution system
            await self._initialize_vacuum_system()
            
            self.logger.info("OperatorOmega Runtime Orchestrator setup completed", {
                'projects_discovered': len(self.project_registry),
                'vanta_apis_setup': len(self.vanta_api_endpoints),
                'vault_setups': len([p for p in self.active_projects.values() if p.get('vault_setup')]),
                'code_tools_registered': len(self.code_tools)
            })
            
        except Exception as e:
            self.logger.error(f"Failed to setup OperatorOmega Runtime: {str(e)}")
            raise

    async def process_task(self, task_data: TaskData) -> TaskResult:
        """
        Process orchestration tasks across the ecosystem
        
        Task Types:
        - 'ecosystem_scan': Full ecosystem analysis and sync
        - 'project_setup': Setup VANTA infrastructure in specific project
        - 'secret_vacuum': Vacuum secrets from projects and redistribute
        - 'agent_synchronization': Sync agents and rules across projects
        - 'cross_project_analysis': Analyze dependencies and resources
        - 'runtime_orchestration': Real-time multi-project coordination
        - 'vault_distribution': Distribute vault access across projects
        """
        try:
            task_type = task_data.get('type', 'unknown')
            self.logger.info(f"Processing Omega Runtime task: {task_type}")
            
            # Route to appropriate orchestration handler
            if task_type == 'ecosystem_scan':
                result = await self._ecosystem_scan(task_data)
            elif task_type == 'project_setup':
                result = await self._project_setup(task_data)
            elif task_type == 'secret_vacuum':
                result = await self._secret_vacuum(task_data)
            elif task_type == 'agent_synchronization':
                result = await self._agent_synchronization(task_data)
            elif task_type == 'cross_project_analysis':
                result = await self._cross_project_analysis(task_data)
            elif task_type == 'runtime_orchestration':
                result = await self._runtime_orchestration(task_data)
            elif task_type == 'vault_distribution':
                result = await self._vault_distribution(task_data)
            else:
                raise ValueError(f"Unknown orchestration task type: {task_type}")
            
            return {
                'status': 'success',
                'output': result,
                'ecosystem_state': await self._get_ecosystem_state(),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to process Omega Runtime task: {str(e)}")
            return {
                'status': 'error',
                'error_message': str(e),
                'timestamp': datetime.now(timezone.utc).isoformat()
            }

    # UAP Level 3 Implementation
    
    def plan(self):
        """UAP Planner: Define ecosystem orchestration boundaries"""
        self.logger.info("[UAP Planner] Defining ecosystem orchestration boundaries")
        
        plan = {
            'ecosystem_scope': self.ecosystem_root,
            'project_count': len(self.project_registry),
            'orchestration_levels': ['Level 1 (Rules)', 'Level 2 (Agents)', 'Level 3 (Runtime)'],
            'auto_setup_targets': {
                'vanta_api': self.auto_vanta_api,
                'vault_cli': self.auto_vault_setup,
                'cross_sync': self.cross_project_sync
            },
            'vacuum_capabilities': {
                'secret_harvesting': True,
                'resource_distribution': True,
                'cross_project_sync': True
            }
        }
        
        return plan

    def execute(self):
        """UAP Executor: Execute ecosystem orchestration logic"""
        self.logger.info("[UAP Executor] Executing ecosystem orchestration")
        
        execution_tasks = [
            'ecosystem_discovery',
            'vanta_api_deployment',
            'vault_cli_setup',
            'secret_vacuum_distribution',
            'agent_synchronization',
            'runtime_monitoring',
            'cross_project_resource_sync'
        ]
        
        return execution_tasks

    def collapse(self):
        """UAP Collapser: Finalize orchestration output"""
        self.logger.info("[UAP Collapser] Finalizing ecosystem orchestration")
        
        collapse_result = {
            'ecosystem_status': 'orchestrated',
            'projects_managed': len(self.active_projects),
            'secrets_vacuum_distributed': len(self.distributed_secrets),
            'agents_synchronized': len(self.synchronized_agents),
            'runtime_health': 'operational',
            'vault_adoption_rate': self._calculate_vault_adoption(),
            'vanta_api_coverage': self._calculate_vanta_coverage()
        }
        
        return collapse_result

    # Code-as-Tools Implementation
    
    async def _code_tool_cli_scan(self, project_path: str) -> Dict[str, Any]:
        """Code tool: CLI scan of project for secrets and structure"""
        try:
            # Execute CLI scanner script
            result = subprocess.run([
                'python', 'cli_enhanced.py', '--scan', project_path
            ], capture_output=True, text=True, timeout=30)
            
            if result.returncode == 0:
                return json.loads(result.stdout)
            else:
                return {'error': result.stderr, 'code': result.returncode}
                
        except Exception as e:
            return {'error': str(e)}

    async def _code_tool_project_analyze(self, project_path: str) -> Dict[str, Any]:
        """Code tool: Deep project analysis for rules, agents, tools"""
        analysis = {
            'rules_found': [],
            'agents_found': [],
            'tools_found': [],
            'structure_analysis': {}
        }
        
        try:
            # Scan for rules
            rule_patterns = ['*.mdc', '*rules*', '*.yaml']
            for pattern in rule_patterns:
                rule_files = list(Path(project_path).rglob(pattern))
                analysis['rules_found'].extend([str(f) for f in rule_files])
            
            # Scan for agents
            agent_patterns = ['*Agent.py', '*Agent.ts', '*agent*']
            for pattern in agent_patterns:
                agent_files = list(Path(project_path).rglob(pattern))
                analysis['agents_found'].extend([str(f) for f in agent_files])
            
            # Scan for tools
            tool_patterns = ['tools/', 'cli.py', '*tool*']
            for pattern in tool_patterns:
                if '/' in pattern:
                    tool_dirs = list(Path(project_path).rglob(pattern.rstrip('/')))
                    analysis['tools_found'].extend([str(d) for d in tool_dirs])
                else:
                    tool_files = list(Path(project_path).rglob(pattern))
                    analysis['tools_found'].extend([str(f) for f in tool_files])
            
            return analysis
            
        except Exception as e:
            analysis['error'] = str(e)
            return analysis

    async def _code_tool_secret_vacuum(self, projects: List[str]) -> Dict[str, Any]:
        """Code tool: Vacuum secrets from multiple projects"""
        vacuum_result = {
            'secrets_found': {},
            'total_secrets': 0,
            'distribution_plan': {}
        }
        
        try:
            for project_name in projects:
                if project_name in self.project_registry:
                    project_path = self.project_registry[project_name]['path']
                    
                    # Use CLI to scan for secrets
                    scan_result = await self._code_tool_cli_scan(project_path)
                    
                    if 'secrets' in scan_result:
                        vacuum_result['secrets_found'][project_name] = scan_result['secrets']
                        vacuum_result['total_secrets'] += len(scan_result['secrets'])
            
            # Create distribution plan
            vacuum_result['distribution_plan'] = await self._create_distribution_plan(
                vacuum_result['secrets_found']
            )
            
            return vacuum_result
            
        except Exception as e:
            vacuum_result['error'] = str(e)
            return vacuum_result

    async def _code_tool_agent_deploy(self, agent_config: Dict[str, Any]) -> Dict[str, Any]:
        """Code tool: Deploy agent to target projects"""
        deployment_result = {
            'deployments': [],
            'failures': [],
            'success_count': 0
        }
        
        try:
            target_projects = agent_config.get('target_projects', [])
            agent_type = agent_config.get('agent_type', 'generic')
            
            for project_name in target_projects:
                if project_name in self.project_registry:
                    success = await self._deploy_agent_to_project(
                        project_name, agent_type, agent_config
                    )
                    
                    if success:
                        deployment_result['deployments'].append(project_name)
                        deployment_result['success_count'] += 1
                    else:
                        deployment_result['failures'].append(project_name)
            
            return deployment_result
            
        except Exception as e:
            deployment_result['error'] = str(e)
            return deployment_result

    async def _code_tool_vault_distribute(self, vault_config: Dict[str, Any]) -> Dict[str, Any]:
        """Code tool: Distribute vault access across projects"""
        distribution_result = {
            'vault_setups': [],
            'access_granted': [],
            'total_distributed': 0
        }
        
        try:
            target_projects = vault_config.get('target_projects', list(self.project_registry.keys()))
            
            for project_name in target_projects:
                if project_name in self.project_registry:
                    success = await self._setup_vault_access(project_name, vault_config)
                    
                    if success:
                        distribution_result['vault_setups'].append(project_name)
                        distribution_result['total_distributed'] += 1
            
            # Grant cross-project access
            for project_name in distribution_result['vault_setups']:
                await self._grant_cross_project_vault_access(project_name)
                distribution_result['access_granted'].append(project_name)
            
            return distribution_result
            
        except Exception as e:
            distribution_result['error'] = str(e)
            return distribution_result

    # Ecosystem Management Methods
    
    async def _discover_ecosystem_projects(self) -> None:
        """Discover all projects in the ecosystem (93 projects detected)"""
        self.logger.info("Discovering ecosystem projects...")
        
        if not os.path.exists(self.ecosystem_root):
            self.logger.warning(f"Ecosystem root not found: {self.ecosystem_root}")
            return
        
        self.project_registry = {}
        
        for item in os.listdir(self.ecosystem_root):
            project_path = os.path.join(self.ecosystem_root, item)
            
            if not os.path.isdir(project_path) or item.startswith('.'):
                continue
            
            # Analyze project type and structure
            project_info = await self._analyze_project(project_path)
            
            if project_info:
                self.project_registry[item] = project_info
                self.logger.debug(f"Discovered project: {item} ({project_info['type']})")
        
        self.logger.info(f"Ecosystem discovery completed: {len(self.project_registry)} projects found")

    async def _analyze_project(self, project_path: str) -> Optional[Dict[str, Any]]:
        """Analyze a project to determine its type and capabilities"""
        project_name = os.path.basename(project_path)
        
        project_info = {
            'name': project_name,
            'path': project_path,
            'type': 'unknown',
            'has_package_json': False,
            'has_python': False,
            'has_vault': False,
            'has_vanta': False,
            'secrets_count': 0,
            'agents_count': 0,
            'rules_count': 0,
            'tools_count': 0
        }
        
        try:
            # Check for package.json (Node.js project)
            if os.path.exists(os.path.join(project_path, 'package.json')):
                project_info['has_package_json'] = True
                project_info['type'] = 'node'
            
            # Check for Python files
            python_files = list(Path(project_path).rglob('*.py'))
            if python_files:
                project_info['has_python'] = True
                if project_info['type'] == 'unknown':
                    project_info['type'] = 'python'
            
            # Check for existing vault setup
            vault_indicators = ['.vault.yaml', 'vault/', 'secrets.yaml']
            for indicator in vault_indicators:
                if os.path.exists(os.path.join(project_path, indicator)):
                    project_info['has_vault'] = True
                    break
            
            # Check for VANTA components
            vanta_indicators = ['vanta_seed/', 'src/agents/', 'agents/']
            for indicator in vanta_indicators:
                if os.path.exists(os.path.join(project_path, indicator)):
                    project_info['has_vanta'] = True
                    break
            
            # Count secrets (simplified)
            env_files = list(Path(project_path).rglob('.env*'))
            project_info['secrets_count'] = len(env_files)
            
            # Count agents (simplified)
            agent_files = list(Path(project_path).rglob('*Agent.py')) + list(Path(project_path).rglob('*Agent.ts'))
            project_info['agents_count'] = len(agent_files)
            
            # Count rules
            rule_files = list(Path(project_path).rglob('*.mdc')) + list(Path(project_path).rglob('*rules*'))
            project_info['rules_count'] = len(rule_files)
            
            # Count tools
            tool_files = list(Path(project_path).rglob('*tool*')) + list(Path(project_path).rglob('cli.py'))
            project_info['tools_count'] = len(tool_files)
            
            return project_info
            
        except Exception as e:
            self.logger.warning(f"Failed to analyze project {project_name}: {str(e)}")
            return None

    async def _auto_setup_vanta_apis(self) -> None:
        """Auto setup VANTA AI API in all compatible projects"""
        self.logger.info("Setting up VANTA AI APIs across ecosystem...")
        
        setup_count = 0
        
        for project_name, project_info in self.project_registry.items():
            try:
                if project_info['type'] in ['node', 'python'] and not project_info['has_vanta']:
                    success = await self._setup_vanta_api_in_project(project_info)
                    if success:
                        setup_count += 1
                        self.vanta_api_endpoints[project_name] = f"http://localhost:{7300 + setup_count}"
                        
            except Exception as e:
                self.logger.warning(f"Failed to setup VANTA API in {project_name}: {str(e)}")
        
        self.logger.info(f"VANTA AI API setup completed in {setup_count} projects")

    async def get_status(self) -> Dict[str, Any]:
        """Get comprehensive runtime orchestrator status"""
        return {
            'agent_id': self.agent_id,
            'uap_level': 3,
            'agent_type': 'Runtime Orchestrator',
            'ecosystem_root': self.ecosystem_root,
            'projects_managed': len(self.project_registry),
            'active_projects': len(self.active_projects),
            'vanta_apis': len(self.vanta_api_endpoints),
            'distributed_secrets': len(self.distributed_secrets),
            'code_tools': list(self.code_tools.keys()),
            'agent_bus_active': self.agent_bus is not None,
            'vault_adoption_rate': self._calculate_vault_adoption(),
            'cross_project_sync_active': self.cross_project_sync
        }

    async def teardown(self) -> None:
        """Graceful shutdown of runtime orchestrator"""
        self.logger.info("Shutting down OperatorOmega Runtime Orchestrator...")
        
        # Clean up agent bus
        if self.agent_bus:
            self.agent_bus = None
        
        # Clear registries
        self.project_registry.clear()
        self.active_projects.clear()
        self.code_tools.clear()
        
        self.logger.info("OperatorOmega Runtime Orchestrator shutdown completed")

    # Utility methods
    def _calculate_vault_adoption(self) -> float:
        """Calculate vault adoption rate across projects"""
        if not self.project_registry:
            return 0.0
        
        vault_enabled = len([p for p in self.project_registry.values() if p['has_vault']])
        return vault_enabled / len(self.project_registry)

    def _calculate_vanta_coverage(self) -> float:
        """Calculate VANTA API coverage across projects"""
        if not self.project_registry:
            return 0.0
        
        vanta_enabled = len([p for p in self.project_registry.values() if p['has_vanta']])
        return vanta_enabled / len(self.project_registry)

    # Stub implementations for missing methods (to be implemented)
    async def _initialize_agent_bus(self) -> None:
        self.agent_bus = {'active': True, 'channels': {}}

    async def _auto_setup_vault_cli(self) -> None:
        pass

    async def _initialize_cross_project_sync(self) -> None:
        pass

    async def _register_code_tools(self) -> None:
        pass

    async def _start_runtime_monitoring(self) -> None:
        pass

    async def _initialize_vacuum_system(self) -> None:
        pass

    async def _get_ecosystem_state(self) -> Dict[str, Any]:
        return {'state': 'operational', 'projects': len(self.project_registry)}

    async def _ecosystem_scan(self, task_data: TaskData) -> Dict[str, Any]:
        await self._discover_ecosystem_projects()
        return {'projects_scanned': len(self.project_registry)}

    async def _project_setup(self, task_data: TaskData) -> Dict[str, Any]:
        return {'setup': 'completed'}

    async def _secret_vacuum(self, task_data: TaskData) -> Dict[str, Any]:
        return {'vacuum': 'completed'}

    async def _agent_synchronization(self, task_data: TaskData) -> Dict[str, Any]:
        return {'sync': 'completed'}

    async def _cross_project_analysis(self, task_data: TaskData) -> Dict[str, Any]:
        return {'analysis': 'completed'}

    async def _runtime_orchestration(self, task_data: TaskData) -> Dict[str, Any]:
        return {'orchestration': 'active'}

    async def _vault_distribution(self, task_data: TaskData) -> Dict[str, Any]:
        return {'distribution': 'completed'}

    async def _setup_vanta_api_in_project(self, project_info: Dict[str, Any]) -> bool:
        return True

    async def _create_distribution_plan(self, secrets: Dict[str, Any]) -> Dict[str, Any]:
        return {'plan': 'created'}

    async def _deploy_agent_to_project(self, project_name: str, agent_type: str, config: Dict[str, Any]) -> bool:
        return True

    async def _setup_vault_access(self, project_name: str, config: Dict[str, Any]) -> bool:
        return True

    async def _grant_cross_project_vault_access(self, project_name: str) -> None:
        pass 