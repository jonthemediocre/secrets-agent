"""
CollapseMonitorAgent: Monitors system-level events and triggers collapse detection workflows.

Subscriptions:
    - system_events stream (e.g., SystemHealthReportedEvent, SystemErrorEvent)
Publications:
    - collapse_events stream (e.g., CollapseDetectedEvent)
"""

import asyncio
import logging
import os
import json
import openai
from openai import OpenAIError
from typing import Any, Dict

from vanta_seed.core.keb_client import KEBClient


class CollapseMonitorAgent:
    """Pilot agent that monitors system events and emits collapse detection notifications."""

    id = "collapse_monitor"
    name = "Collapse Monitor Agent"
    stream_name = "system_events"
    publication_stream = "collapse_events"

    def __init__(self, redis_host: str = "localhost", redis_port: int = 6379, redis_db: int = 0):
        self.logger = logging.getLogger(self.id)
        self.keb = KEBClient(redis_host=redis_host, redis_port=redis_port, redis_db=redis_db)
        self.keb.create_consumer_group(self.stream_name, f"{self.id}_group")
        openai.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4")

    async def start(self) -> None:
        """Begin listening for system events and dispatch handling callbacks."""
        await self.keb.subscribe(
            stream_name=self.stream_name,
            group_name=f"{self.id}_group",
            consumer_name=self.id,
            callback=self.handle_event,
        )

    def handle_event(self, event_id: str, event_data: Dict[str, Any]) -> None:
        """Process system event via AI model, detect collapse condition, and publish CollapseDetectedEvent."""
        try:
            prompt = f"Detect collapse based on event: {json.dumps(event_data)}"
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a collapse detection assistant."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0,
            )
            collapse_data = json.loads(response.choices[0].message.content)
        except (OpenAIError, json.JSONDecodeError) as e:
            self.logger.error(f"AI collapse detection failed: {e}")
            return

        self.publish_collapse_event(collapse_data)

    def publish_collapse_event(self, data: Dict[str, Any]) -> Any:
        """Publish collapse detected event to KEB."""
        return self.keb.publish(self.publication_stream, data)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    agent = CollapseMonitorAgent()
    try:
        asyncio.run(agent.start())
    except KeyboardInterrupt:
        logging.info("Shutting down CollapseMonitorAgent...")
    finally:
        agent.keb.disconnect()