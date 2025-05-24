"""
Base agent class for VANTA agents
"""

from abc import ABC, abstractmethod
from typing import Dict, Any, Optional
import asyncio
import logging


class VantaAgent(ABC):
    """Base class for all VANTA agents."""
    
    def __init__(self, agent_id: str, core_config: Dict[str, Any], plugin_manager: Optional[Any] = None):
        self.agent_id = agent_id
        self.core_config = core_config
        self.plugin_manager = plugin_manager
        self.logger = logging.getLogger(f"vanta.{agent_id}")
        
    async def setup(self):
        """Initialize the agent. Override in subclasses."""
        pass
    
    @abstractmethod
    async def process_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Process a task. Must be implemented by subclasses."""
        pass
    
    async def teardown(self):
        """Clean up resources. Override in subclasses."""
        pass
    
    def process_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Synchronous wrapper for async process_task."""
        loop = asyncio.get_event_loop()
        if loop.is_running():
            # If we're already in an async context, create a new task
            task = asyncio.create_task(self.process_task(task_data))
            return asyncio.run_coroutine_threadsafe(task, loop).result()
        else:
            # If no loop is running, run directly
            return asyncio.run(self.process_task(task_data)) 