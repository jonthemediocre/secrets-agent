from vanta_seed.core.agent_base import VantaAgent

class TestProcessingAgent(VantaAgent):
    def __init__(self, agent_id="test_processing_agent", core_config=None):
        super().__init__(agent_id=agent_id, core_config=core_config or {})

    def process_task(self, task_type, task_data):
        input_data = task_data.get("input_data", "[No input_data provided]")
        previous_output = task_data.get("previous_step_output", "[No previous output]")
        result_summary = f"Processed input: {input_data}; Previous: {previous_output}"
        return {"status": "success", "result_summary": result_summary, "input_data": input_data, "previous_output": previous_output} 