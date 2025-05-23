"""
DataUnifierAgent: Consolidates and normalizes data from multiple sources in response to upstream task events.

Subscriptions:
    - task_events stream (e.g., TaskAssignedEvent, TaskCompletionEvent)
Publications:
    - data_unification_events stream (e.g., DataUnifiedEvent)
"""

import asyncio
import logging
import os
import json
import openai
from openai import OpenAIError
from typing import Any, Dict

from vanta_seed.core.keb_client import KEBClient


class DataUnifierAgent:
    """Pilot agent that consolidates and normalizes data by listening to task events and emitting unified data events."""

    id = "data_unifier"
    name = "Data Unifier Agent"
    stream_name = "task_events"
    publication_stream = "data_unification_events"

    def __init__(self, redis_host: str = "localhost", redis_port: int = 6379, redis_db: int = 0):
        self.logger = logging.getLogger(self.id)
        self.keb = KEBClient(redis_host=redis_host, redis_port=redis_port, redis_db=redis_db)
        self.keb.create_consumer_group(self.stream_name, f"{self.id}_group")
        openai.api_key = os.getenv("OPENAI_API_KEY")
        self.model = os.getenv("OPENAI_MODEL", "gpt-4")

    async def start(self) -> None:
        """Begin listening for task events and dispatch handling callbacks."""
        await self.keb.subscribe(
            stream_name=self.stream_name,
            group_name=f"{self.id}_group",
            consumer_name=self.id,
            callback=self.handle_event,
        )

    def handle_event(self, event_id: str, event_data: Dict[str, Any]) -> None:
        """Process task event via AI model, unify payload, and publish DataUnifiedEvent."""
        try:
            prompt = f"Unify data for event: {json.dumps(event_data)}"
            response = openai.ChatCompletion.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": "You are a data unification assistant."},
                    {"role": "user", "content": prompt},
                ],
                temperature=0,
            )
            unified_data = json.loads(response.choices[0].message.content)
        except (OpenAIError, json.JSONDecodeError) as e:
            self.logger.error(f"AI unification failed: {e}")
            return

        self.publish_unified_event(unified_data)

    def publish_unified_event(self, data: Dict[str, Any]) -> Any:
        """Publish unified data event to KEB."""
        return self.keb.publish(self.publication_stream, data)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    agent = DataUnifierAgent()
    try:
        asyncio.run(agent.start())
    except KeyboardInterrupt:
        logging.info("Shutting down DataUnifierAgent...")
    finally:
        agent.keb.disconnect()