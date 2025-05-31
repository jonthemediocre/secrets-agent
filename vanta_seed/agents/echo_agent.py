from vanta_seed.core.agent_base import VantaAgent

class EchoAgent(VantaAgent):
    def __init__(self, agent_id="echo_001", core_config=None):
        super().__init__(agent_id=agent_id, core_config=core_config or {})

    def process_task(self, task_type, task_data):
        return {"status": "success", "echo": task_data} 