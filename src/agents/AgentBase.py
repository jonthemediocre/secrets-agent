#!/usr/bin/env python3
"""
VANTA Agent Base Class

Provides the foundational structure and contract for all VANTA agents
as defined in .cursor/rules/101-vanta-agent-contract.mdc
"""

import asyncio
import logging
from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional, Union
from datetime import datetime, timezone

# Type definitions
TaskData = Dict[str, Any]
TaskResult = Dict[str, Any]

class AgentBase(ABC):
    """
    Base class for all VANTA agents
    
    Implements the core agent contract defined in 101-vanta-agent-contract.mdc:
    - Standardized initialization
    - Async setup and teardown
    - Task processing with structured output
    - Status reporting
    - Configuration management
    """
    
    def __init__(self, agent_id: str, core_config: Dict[str, Any], plugin_manager: Any = None, **kwargs):
        """
        Standardized agent initialization
        
        Args:
            agent_id: Unique identifier for this agent instance
            core_config: Core configuration dictionary
            plugin_manager: Optional plugin manager instance
            **kwargs: Additional configuration parameters
        """
        self.agent_id = agent_id
        self.core_config = core_config
        self.plugin_manager = plugin_manager
        self.additional_config = kwargs
        
        # Agent state
        self.is_initialized = False
        self.is_running = False
        self.last_activity = None
        self.task_count = 0
        self.error_count = 0
        
        # Initialize logging
        self.logger = logging.getLogger(f"VANTA.{self.__class__.__name__}")
        
        self.logger.info(f"Agent {agent_id} initialized")

    @abstractmethod
    async def setup(self) -> None:
        """
        One-time asynchronous setup tasks
        
        Override this method to:
        - Connect to external resources
        - Initialize models or services
        - Load configuration data
        - Validate dependencies
        """
        pass

    @abstractmethod
    async def process_task(self, task_data: TaskData) -> TaskResult:
        """
        Primary method for handling incoming tasks
        
        Args:
            task_data: Dictionary containing task parameters and data
            
        Returns:
            TaskResult: Structured dictionary with at least:
            {
                "status": "success|failure|error",
                "output": {},
                "error_message": "..." (if status != success)
            }
        """
        pass

    @abstractmethod
    async def teardown(self) -> None:
        """
        Graceful shutdown and resource cleanup
        
        Override this method to:
        - Close connections
        - Save state
        - Release resources
        - Clean up temporary files
        """
        pass

    @abstractmethod
    async def get_status(self) -> Dict[str, Any]:
        """
        Report agent health and current status
        
        Returns:
            Dictionary containing agent status information
        """
        pass

    def load_config(self, config_data: Dict[str, Any]) -> None:
        """
        Dynamic configuration updates
        
        Args:
            config_data: New configuration data to apply
        """
        self.core_config.update(config_data)
        self.logger.info(f"Configuration updated for agent {self.agent_id}")

    async def initialize(self) -> None:
        """
        Initialize the agent and mark as ready
        """
        if self.is_initialized:
            self.logger.warning(f"Agent {self.agent_id} already initialized")
            return
        
        try:
            await self.setup()
            self.is_initialized = True
            self.logger.info(f"Agent {self.agent_id} successfully initialized")
        except Exception as e:
            self.logger.error(f"Failed to initialize agent {self.agent_id}: {str(e)}")
            raise

    async def execute_task(self, task_data: TaskData) -> TaskResult:
        """
        Execute a task with proper error handling and logging
        
        Args:
            task_data: Task data to process
            
        Returns:
            TaskResult: Result of task execution
        """
        if not self.is_initialized:
            return {
                "status": "error",
                "error_message": f"Agent {self.agent_id} not initialized",
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
        
        self.task_count += 1
        self.last_activity = datetime.now(timezone.utc)
        
        try:
            # Validate input
            if not isinstance(task_data, dict):
                raise ValueError("Task data must be a dictionary")
            
            # Process the task
            result = await self.process_task(task_data)
            
            # Validate output structure
            if not isinstance(result, dict) or 'status' not in result:
                raise ValueError("Task result must be a dictionary with 'status' field")
            
            # Add metadata
            result['agent_id'] = self.agent_id
            result['task_id'] = self.task_count
            result['timestamp'] = datetime.now(timezone.utc).isoformat()
            
            self.logger.info(f"Task {self.task_count} completed with status: {result['status']}")
            return result
            
        except Exception as e:
            self.error_count += 1
            error_result = {
                "status": "error",
                "error_message": str(e),
                "agent_id": self.agent_id,
                "task_id": self.task_count,
                "timestamp": datetime.now(timezone.utc).isoformat()
            }
            
            self.logger.error(f"Task {self.task_count} failed: {str(e)}")
            return error_result

    async def shutdown(self) -> None:
        """
        Shutdown the agent gracefully
        """
        if not self.is_initialized:
            self.logger.warning(f"Agent {self.agent_id} not initialized, nothing to shutdown")
            return
        
        try:
            self.is_running = False
            await self.teardown()
            self.is_initialized = False
            self.logger.info(f"Agent {self.agent_id} shutdown completed")
        except Exception as e:
            self.logger.error(f"Error during shutdown of agent {self.agent_id}: {str(e)}")
            raise

    def get_base_status(self) -> Dict[str, Any]:
        """
        Get basic status information common to all agents
        
        Returns:
            Basic status dictionary
        """
        return {
            "agent_id": self.agent_id,
            "class_name": self.__class__.__name__,
            "is_initialized": self.is_initialized,
            "is_running": self.is_running,
            "task_count": self.task_count,
            "error_count": self.error_count,
            "last_activity": self.last_activity.isoformat() if self.last_activity else None,
            "uptime_seconds": (
                (datetime.now(timezone.utc) - self.last_activity).total_seconds() 
                if self.last_activity else 0
            )
        }

class SimpleAgent(AgentBase):
    """
    Simple concrete implementation of AgentBase for testing and basic use cases
    """
    
    async def setup(self) -> None:
        """Basic setup - no external resources needed"""
        self.logger.info(f"SimpleAgent {self.agent_id} setup completed")

    async def process_task(self, task_data: TaskData) -> TaskResult:
        """
        Simple task processor that echoes the input
        """
        return {
            "status": "success",
            "output": {
                "message": f"SimpleAgent {self.agent_id} processed task",
                "input_received": task_data
            }
        }

    async def teardown(self) -> None:
        """Basic teardown - no resources to clean up"""
        self.logger.info(f"SimpleAgent {self.agent_id} teardown completed")

    async def get_status(self) -> Dict[str, Any]:
        """Get status for SimpleAgent"""
        status = self.get_base_status()
        status.update({
            "agent_type": "SimpleAgent",
            "capabilities": ["echo", "basic_processing"]
        })
        return status 