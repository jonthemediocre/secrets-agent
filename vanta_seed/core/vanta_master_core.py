import logging
from typing import Dict, Any, Optional, List
import asyncio # Added for type hinting and potential future use
import json # Added for parsing event data
import uuid # Added for example usage
from datetime import datetime # Added for example usage

from vanta_seed.core.keb_client import KEBClient
from vanta_seed.agents.echo_agent import EchoAgent
from vanta_seed.core.cascade_executor import CascadeExecutor
from vanta_seed.agents.debug_logger_agent import DebugLoggerAgent
from vanta_seed.agents.test_processing_agent import TestProcessingAgent

# Configure basic logging for VantaMasterCore
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class VantaMasterCore:
    """
    The VantaMasterCore (VMC) is the central orchestrator for the VANTA AI OS.
    It manages agent lifecycles, task dispatch, state, cascade/ritual execution,
    and serves as the hub for the Kernel Event Bus (KEB).
    """
    def __init__(self, config: Optional[Dict[str, Any]] = None):
        """
        Initializes VantaMasterCore.

        Args:
            config: Optional configuration dictionary.
                    Should include Redis connection details if not using defaults.
        """
        self.config = config or {}
        self.agents = {}  # Registry for managed agents
        self.keb_subscription_task: Optional[asyncio.Task] = None # To hold the KEB subscription task
        
        # Initialize KEB Client
        redis_config = self.config.get('redis_keb', {})
        self.keb_client = KEBClient(
            redis_host=redis_config.get('host', 'localhost'),
            redis_port=redis_config.get('port', 6379),
            redis_db=redis_config.get('db', 0)
        )

        if not self.keb_client.redis_client:
            logger.error("VantaMasterCore: KEB Client failed to connect. Event bus unavailable.")
        else:
            logger.info("VantaMasterCore initialized and KEBClient connected.")

        # Initialize CascadeExecutor
        self.cascade_executor = CascadeExecutor(self)

    async def startup(self):
        """
        Perform startup routines for VantaMasterCore.
        This includes starting the KEB control event subscription.
        """
        logger.info("VantaMasterCore starting up...")
        
        if self.keb_client.redis_client:
            base_event_data = {
                "event_id": str(uuid.uuid4()),
                "timestamp_iso": datetime.utcnow().isoformat() + "Z",
                "source_component_id": "VantaMasterCore",
            }
            startup_event_payload = {
                **base_event_data,
                "event_type": "SystemStartupCompletedEvent",
                # Specific fields for SystemStartupCompletedEvent from system_events.yaml
                "message": "VantaMasterCore startup completed and KEB subscription active.",
                "active_profile": self.config.get("profile", "unknown"),  # Example: get from VMC config
                "loaded_components": ["KEBClient"] + list(self.agents.keys())
            }
            # Assuming SystemStartupCompletedEvent is the one to send after KEB is up.
            self.keb_client.publish(stream_name="system_events", event_data=startup_event_payload)
            logger.info(f"VMC: Published SystemStartupCompletedEvent (ID: {startup_event_payload['event_id']})")

            if self.keb_subscription_task is None or self.keb_subscription_task.done():
                logger.info("VMC: Starting KEB control event subscription task.")
                self.keb_subscription_task = asyncio.create_task(self.subscribe_to_control_events())
            else:
                logger.info("VMC: KEB control event subscription task already running.")
        else:
            logger.warning("VMC: Cannot start KEB subscription, Redis client not connected.")
        
        logger.info("VMC startup sequence completed.")

    async def _shutdown_agent_async(self, agent_id: str, agent_instance: Any) -> None:
        """
        Helper method to shut down an agent asynchronously with proper error handling.
        """
        try:
            await agent_instance.shutdown()
            logger.info(f"VMC: Agent {agent_id} shut down successfully (async)")
        except Exception as e:
            logger.error(f"VMC: Error shutting down agent {agent_id} (async): {e}", exc_info=True)

    async def shutdown(self):
        """
        Perform shutdown routines for VantaMasterCore.
        This includes cancelling the KEB subscription task and disconnecting the client.
        """
        logger.info("VantaMasterCore shutting down...")
        
        if self.keb_subscription_task and not self.keb_subscription_task.done():
            logger.info("VMC: Cancelling KEB control event subscription task...")
            self.keb_subscription_task.cancel()
            try: await self.keb_subscription_task
            except asyncio.CancelledError: logger.info("VMC: KEB subscription task successfully cancelled.")
            except Exception as e: logger.error(f"VMC: Error during KEB subscription task shutdown: {e}", exc_info=True)
        
        # TODO: Gracefully shut down managed agents (e.g., call their shutdown methods)
        # for agent_id, agent_instance in self.agents.items():
        #     if hasattr(agent_instance, 'shutdown') and asyncio.iscoroutinefunction(agent_instance.shutdown):
        #         try: await agent_instance.shutdown()
        #         except Exception as e: logger.error(f"Error shutting down agent {agent_id}: {e}")
        
        # Gracefully shut down managed agents
        logger.info("VMC: Shutting down managed agents...")
        shutdown_tasks = []
        
        for agent_id, agent_instance in self.agents.items():
            try:
                if hasattr(agent_instance, 'shutdown'):
                    if asyncio.iscoroutinefunction(agent_instance.shutdown):
                        # Async shutdown method
                        logger.info(f"VMC: Initiating async shutdown for agent {agent_id}")
                        shutdown_tasks.append(self._shutdown_agent_async(agent_id, agent_instance))
                    elif callable(agent_instance.shutdown):
                        # Sync shutdown method
                        logger.info(f"VMC: Initiating sync shutdown for agent {agent_id}")
                        try:
                            agent_instance.shutdown()
                            logger.info(f"VMC: Agent {agent_id} shut down successfully (sync)")
                        except Exception as e:
                            logger.error(f"VMC: Error shutting down agent {agent_id} (sync): {e}", exc_info=True)
                else:
                    logger.info(f"VMC: Agent {agent_id} has no shutdown method, skipping")
            except Exception as e:
                logger.error(f"VMC: Error checking shutdown capability for agent {agent_id}: {e}", exc_info=True)
        
        # Wait for all async shutdowns to complete
        if shutdown_tasks:
            logger.info(f"VMC: Waiting for {len(shutdown_tasks)} async agent shutdowns to complete...")
            try:
                await asyncio.gather(*shutdown_tasks, return_exceptions=True)
                logger.info("VMC: All async agent shutdowns completed")
            except Exception as e:
                logger.error(f"VMC: Error during batch agent shutdown: {e}", exc_info=True)
        
        logger.info("VMC: Agent shutdown sequence completed")
        
        if self.keb_client: self.keb_client.disconnect()
        logger.info("VantaMasterCore shutdown complete.")

    def register_agent(self, agent_id: str, agent_instance: Any):
        """
        Registers an agent instance with VantaMasterCore.
        """
        if agent_id in self.agents: logger.warning(f"Agent {agent_id} is already registered. Overwriting.")
        self.agents[agent_id] = agent_instance
        logger.info(f"Agent {agent_id} registered with VMC.")
        # Publish AgentRegisteredEvent as per agent_lifecycle_events.yaml
        try:
            event_payload = {
                "event_id": str(uuid.uuid4()),
                "timestamp_iso": datetime.utcnow().isoformat() + "Z",
                "source_component_id": "VantaMasterCore",
                "agent_id": agent_id,
                "agent_type": type(agent_instance).__name__,
                "initial_config": getattr(agent_instance, "config", None),
                "event_type": "AgentRegisteredEvent"
            }
            self.keb_client.publish(stream_name="agent_lifecycle_events", event_data=event_payload)
            logger.info(f"VMC: Published AgentRegisteredEvent for agent {agent_id} (EventID: {event_payload['event_id']}).")
        except Exception as e:
            logger.error(f"VMC: Failed to publish AgentRegisteredEvent for agent {agent_id}: {e}", exc_info=True)

    def dispatch_task_to_agent(self, agent_id: str, task_type: str, task_parameters: Dict[str, Any], original_task_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Dispatches a task to a registered agent. If original_task_id is provided,
        it's used for continuity. Otherwise, a new one can be generated if this dispatch
        is the origin of the task.
        """
        current_task_id = original_task_id or str(uuid.uuid4()) # Use provided or generate new
        start_time = datetime.utcnow()

        agent = self.agents.get(agent_id)
        if not agent:
            err_msg = f"Agent {agent_id} not found. Cannot dispatch task '{task_type}'."
            logger.error(err_msg)
            # Publish TaskCompletionEvent for failure if appropriate (e.g. if task was formally accepted by VMC)
            # For now, just returning error. If this was a KEB-triggered task, completion event is expected.
            # self.publish_task_completion_event(current_task_id, "VantaMasterCore_Dispatch", "error", 0, error_details={"error_code": "AGENT_NOT_FOUND", "message": err_msg})
            return {"status": "error", "message": err_msg, "task_id": current_task_id}

        if hasattr(agent, "process_task"):
            logger.info(f"Dispatching task '{task_type}' (ID: {current_task_id}) to agent {agent_id}.")
            try:
                result = agent.process_task(task_type, task_parameters) # This is synchronous
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                
                # Assuming result is a dict with at least {"status": "success"/"failure"...}
                task_status = result.get("status", "error") # Default to error if agent doesn't specify
                if task_status == "success":
                    self.publish_task_completion_event(current_task_id, agent_id, "success", duration_ms, result=result.get("result", result))
                else: # failure or error reported by agent
                    error_payload = result.get("error_details", {"error_code": "AGENT_REPORTED_FAILURE", "message": result.get("message", "Agent processing failed.")})
                    self.publish_task_completion_event(current_task_id, agent_id, task_status, duration_ms, error_details=error_payload)
                return {**result, "task_id": current_task_id} # Return agent result + task_id
            except Exception as e:
                duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
                logger.error(f"Error processing task '{task_type}' (ID: {current_task_id}) by agent {agent_id}: {e}", exc_info=True)
                self.publish_task_completion_event(current_task_id, agent_id, "error", duration_ms, error_details={"error_code": "UNHANDLED_EXCEPTION", "message": str(e)})
                return {"status": "error", "message": str(e), "task_id": current_task_id}
        else:
            duration_ms = int((datetime.utcnow() - start_time).total_seconds() * 1000)
            err_msg = f"Agent {agent_id} does not have a process_task method."
            logger.error(err_msg)
            # self.publish_task_completion_event(current_task_id, "VantaMasterCore_Dispatch", "error", duration_ms, error_details={"error_code": "AGENT_INCOMPATIBLE", "message": err_msg})
            return {"status": "error", "message": err_msg, "task_id": current_task_id}

    def publish_task_assignment_event(self, task_id: str, agent_id_assigned_to: str, task_type: str, parameters: Dict[str, Any], priority: int = 3, source_agent_id: str = "VantaMasterCore"):
        if not self.keb_client.redis_client: return
        event_payload = {
            "event_id": str(uuid.uuid4()),
            "timestamp_iso": datetime.utcnow().isoformat() + "Z",
            "source_agent_id": source_agent_id,
            "task_id": task_id,
            "agent_id_assigned_to": agent_id_assigned_to,
            "task_type": task_type,
            "parameters": parameters,
            "priority": priority,
            "event_type": "TaskAssignedEvent"
        }
        self.keb_client.publish(stream_name="task_events", event_data=event_payload)
        logger.info(f"VMC: Published TaskAssignedEvent (TaskID: {task_id}, EventID: {event_payload['event_id']}) for agent {agent_id_assigned_to}.")

    def publish_task_completion_event(self, task_id: str, source_agent_id_completed_by: str, status: str, duration_ms: int, result: Optional[Dict[str, Any]] = None, error_details: Optional[Dict[str, Any]] = None):
        if not self.keb_client.redis_client: return
        base_payload = {
            "event_id": str(uuid.uuid4()),
            "timestamp_iso": datetime.utcnow().isoformat() + "Z",
            "source_agent_id": source_agent_id_completed_by,  # Agent that completed it
            "task_id": task_id,
            "status": status,
            "duration_ms": duration_ms,
            "event_type": "TaskCompletionEvent"
        }
        if status == "success" and result is not None:
            base_payload["result"] = result
        elif status in ["failure", "error"] and error_details is not None:
            base_payload["error_details"] = error_details
        elif status in ["failure", "error"]: # Ensure error_details is present even if minimal
             base_payload["error_details"] = {"error_code": "UNKNOWN_ERROR", "message": "No specific error details provided."}

        self.keb_client.publish(stream_name="task_events", event_data=base_payload)
        logger.info(f"VMC: Published TaskCompletionEvent (TaskID: {task_id}, EventID: {base_payload['event_id']}) with status '{status}'.")

    async def subscribe_to_control_events(self):
        """
        Asynchronously subscribes to VMC control events on the KEB.
        This method runs as a background task.
        """
        if not self.keb_client.redis_client: logger.error("VMC cannot subscribe: KEB client not connected."); return
        stream_name = "vmc_control_events"; group_name = "vmc_control_group"; consumer_name = f"vmc_consumer_{uuid.uuid4().hex[:8]}"
        logger.info(f"VMC preparing to subscribe: stream '{stream_name}', group '{group_name}', consumer '{consumer_name}'.")
        if not self.keb_client.create_consumer_group(stream_name, group_name, start_id='$'):
            logger.error(f"VMC failed to create/verify group '{group_name}'. Subscription aborted."); return
        try:
            logger.info(f"VMC calling KEBClient.subscribe for '{stream_name}'...")
            await self.keb_client.subscribe(stream_name, group_name, consumer_name, self.handle_control_event)
        except asyncio.CancelledError: logger.info(f"VMC subscription to '{stream_name}' cancelled."); raise
        except Exception as e: logger.error(f"VMC KEB subscription to '{stream_name}' failed critically: {e}", exc_info=True)
        finally: logger.info(f"VMC subscription loop for '{stream_name}' ended.")

    def handle_control_event(self, stream_message_id: str, event_payload: Dict[str, Any]):
        """
        Handles events received from the KEB control stream.
        This is called by KEBClient.subscribe.

        Args:
            stream_message_id: The ID of the message from the Redis Stream.
            event_payload: The deserialized Python dictionary of the event data.
        """
        logger.info(f"VMC rcvd ctrl event. StreamMSG_ID: {stream_message_id}. Payload: {json.dumps(event_payload, indent=2)}")
        try:
            event_type = event_payload.get("event_type")
            logical_event_id = event_payload.get("event_id", stream_message_id)
            task_id_from_event = event_payload.get("task_id") # A TriggerAgentActionEvent might itself be part of a larger task

            if event_type == "TriggerAgentActionEvent":
                target_agent_id = event_payload.get("target_agent_id")
                task_type_to_dispatch = event_payload.get("task_type")
                task_parameters = event_payload.get("task_parameters")
                priority = event_payload.get("priority", 3) # Extract priority if provided

                if target_agent_id and task_type_to_dispatch and task_parameters is not None:
                    # Generate a new task_id for this VMC-initiated dispatch sequence,
                    # or use one if the TriggerAgentActionEvent is designed to carry it.
                    # For now, let's assume TriggerAgentActionEvent *initiates* a new task from VMC's perspective.
                    new_task_id = str(uuid.uuid4())
                    logger.info(f"VMC processing '{event_type}' (EvID: {logical_event_id}) -> New Task ID: {new_task_id} for agent '{target_agent_id}', task_type: '{task_type_to_dispatch}'.")
                    
                    # Publish TaskAssignedEvent before dispatching
                    self.publish_task_assignment_event(
                        task_id=new_task_id,
                        agent_id_assigned_to=target_agent_id,
                        task_type=task_type_to_dispatch,
                        parameters=task_parameters,
                        priority=priority,
                        source_agent_id=event_payload.get("source_component_id", "VantaMasterCore") # Who requested this action
                    )
                    
                    # Dispatch (which will then publish TaskCompletionEvent)
                    # Pass new_task_id so completion event is tied to this assignment
                    self.dispatch_task_to_agent(target_agent_id, task_type_to_dispatch, task_parameters, original_task_id=new_task_id)
                else:
                    logger.error(f"VMC: Invalid '{event_type}' (EvID: {logical_event_id}). Missing fields. Payload: {event_payload}")
            else:
                logger.info(f"VMC unhandled event type '{event_type}' (EvID: {logical_event_id}).")
        except Exception as e:
            logger.error(f"VMC error handling control event (StreamMSG_ID: {stream_message_id}): {e}", exc_info=True)

    def execute_agent_task_sync(self, agent_id: str, task_type: str, task_parameters: Dict[str, Any]) -> Dict[str, Any]:
        """
        Synchronously execute an agent task for cascade steps. Returns result/status.
        """
        # TODO: Implement sync agent task execution for cascades
        return self.dispatch_task_to_agent(agent_id, task_type, task_parameters)

    def execute_tool_calls_sync(self, tool_calls: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Synchronously execute tool calls for cascade steps. Returns list of results.
        """
        # TODO: Implement sync tool call execution for cascades
        return [{"status": "not_implemented", "tool_call": tc} for tc in tool_calls]

    def trigger_cascade_from_signal(self, cascade_id: str, initial_data: Optional[Dict[str, Any]] = None):
        """
        Handles a signal/event to trigger a cascade. Calls CascadeExecutor.
        """
        logger.info(f"VMC: Received signal to trigger cascade '{cascade_id}' with initial_data: {initial_data}")
        return self.cascade_executor.trigger_cascade(cascade_id, initial_data)

# Example of how VMC might be instantiated and run (conceptual)
if __name__ == "__main__":
    logger.info("VMC __main__: Starting application.")
    try:
        async def main():
            vmc_config = {
                "redis_keb": {
                    "host": "localhost", "port": 6379, "db": 0
                },
                "profile": "development", # Example config value
                "core_settings": { # Example core_settings, can be expanded
                    "default_log_level": "INFO"
                }
            }
            vmc = VantaMasterCore(config=vmc_config)
            echo_agent = EchoAgent(agent_id="echo_001", core_config=vmc_config.get("core_settings"))
            vmc.register_agent(echo_agent.agent_id, echo_agent)
            # Register debug_logger_agent and test_processing_agent for cascade
            debug_logger = DebugLoggerAgent(core_config=vmc_config.get("core_settings"))
            test_agent = TestProcessingAgent(core_config=vmc_config.get("core_settings"))
            vmc.register_agent(debug_logger.agent_id, debug_logger)
            vmc.register_agent(test_agent.agent_id, test_agent)
            # Trigger the simple_test_cascade
            logger.info("VMC Main: Triggering simple_test_cascade...")
            cascade_result = vmc.cascade_executor.trigger_cascade(
                "simple_test_cascade",
                initial_data={
                    "initial_message": "Hello from cascade!",
                    "test_agent_param": "42"
                }
            )
            print("Cascade Result:", cascade_result)
            # Continue with normal startup if needed
            try:
                logger.info("VMC Main: Starting VantaMasterCore...")
                await vmc.startup()
                logger.info("VMC Main: VantaMasterCore started. KEB subscription active.")
                logger.info("VMC Main: To test, publish TriggerAgentActionEvent to 'vmc_control_events' via redis-cli.")
                logger.info("VMC Main: Running until KeyboardInterrupt (Ctrl+C).")
                while True: await asyncio.sleep(1)
            except KeyboardInterrupt: logger.info("VMC Main: KeyboardInterrupt. Shutting down...")
            except Exception as e: logger.error(f"VMC Main: Unexpected error: {e}", exc_info=True)
            finally:
                logger.info("VMC Main: Initiating VMC shutdown...")
                if 'vmc' in locals() and vmc: await vmc.shutdown()
                logger.info("VMC Main: VantaMasterCore shut down.")
        asyncio.run(main())
    except KeyboardInterrupt: logger.info("VMC __main__: App terminated by user.")
    except Exception as e: logger.error(f"VMC __main__: App failed: {e}", exc_info=True)
    finally: logger.info("VMC __main__: App finished.") 