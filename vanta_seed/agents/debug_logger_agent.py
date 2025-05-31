from vanta_seed.core.agent_base import VantaAgent
import logging

class DebugLoggerAgent(VantaAgent):
    def __init__(self, agent_id="debug_logger_agent", core_config=None):
        super().__init__(agent_id=agent_id, core_config=core_config or {})
        self.logger = logging.getLogger(agent_id)

    def process_task(self, task_type, task_data):
        message = task_data.get("message", "[No message provided]")
        level = task_data.get("level", "INFO").upper()
        if level == "INFO":
            self.logger.info(message)
        elif level == "WARNING":
            self.logger.warning(message)
        elif level == "ERROR":
            self.logger.error(message)
        else:
            self.logger.debug(message)
        return {"status": "success", "logged_message": message, "level": level} 