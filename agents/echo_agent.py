import logging
from typing import Dict, Any

logger = logging.getLogger(__name__)
logging.basicConfig(level=logging.INFO)

class EchoAgent:
    """
    A simple agent that echoes back the task it receives.
    """
    def __init__(self, agent_id: str, config: Dict[str, Any] = None):
        """
        Initializes the EchoAgent.

        Args:
            agent_id: The unique identifier for this agent.
            config: Optional configuration dictionary for the agent.
        """
        self.agent_id = agent_id
        self.config = config or {}
        logger.info(f"EchoAgent '{self.agent_id}' initialized with config: {self.config}")

    def process_task(self, task_type: str, task_parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Processes a task by logging it and returning the parameters.

        Args:
            task_type: The type of task to process.
            task_parameters: The parameters for the task.

        Returns:
            A dictionary containing the status and the original task parameters.
        """
        logger.info(f"EchoAgent '{self.agent_id}' received task '{task_type}' with parameters: {task_parameters}")
        
        # Echo back the parameters as part of the result
        return {
            "status": "success",
            "message": f"Task '{task_type}' processed by EchoAgent '{self.agent_id}'.",
            "received_task_type": task_type,
            "received_parameters": task_parameters
        }

    async def startup(self):
        """
        Async startup routine for the agent (if needed).
        """
        logger.info(f"EchoAgent '{self.agent_id}' starting up.")
        # Nothing specific to do for EchoAgent on startup for now
        await asyncio.sleep(0) # Placeholder for async operations

    async def shutdown(self):
        """
        Async shutdown routine for the agent (if needed).
        """
        logger.info(f"EchoAgent '{self.agent_id}' shutting down.")
        # Nothing specific to do for EchoAgent on shutdown for now
        await asyncio.sleep(0) # Placeholder for async operations

# Example of how to use the agent (typically not in the agent file itself)
if __name__ == '__main__':
    import asyncio
    test_agent = EchoAgent(agent_id="echo_001")
    
    async def run_test():
        await test_agent.startup()
        test_result = test_agent.process_task(
            task_type="ECHO_MESSAGE", 
            task_parameters={"message": "Hello from VMC!", "count": 5}
        )
        logger.info(f"EchoAgent test result: {test_result}")
        await test_agent.shutdown()

    asyncio.run(run_test()) 