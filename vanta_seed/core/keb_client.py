import redis
import json
import uuid
import logging
from typing import Callable, Optional, List, Dict, Any
import asyncio # Added for async operations

# Configure basic logging for the KEB client
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class KEBClient:
    """
    VantaMasterCore Kernel Event Bus (KEB) Client.
    Facilitates communication via Redis Streams.
    """
    def __init__(self, redis_host: str = 'localhost', redis_port: int = 6379, redis_db: int = 0):
        """
        Initializes the KEBClient.

        Args:
            redis_host: Hostname of the Redis server.
            redis_port: Port of the Redis server.
            redis_db: Redis database number.
        """
        try:
            self.redis_client = redis.Redis(host=redis_host, port=redis_port, db=redis_db, decode_responses=True)
            self.redis_client.ping()
            logger.info(f"KEBClient connected to Redis at {redis_host}:{redis_port}/{redis_db}")
        except redis.exceptions.ConnectionError as e:
            logger.error(f"KEBClient failed to connect to Redis: {e}")
            # In a real application, might raise an exception or have a retry mechanism
            self.redis_client = None

    def publish(self, stream_name: str, event_data: Dict[str, Any], event_id: Optional[str] = None) -> Optional[str]:
        """
        Publishes an event to a specified Redis Stream.

        Args:
            stream_name: The name of the Redis Stream.
            event_data: A dictionary representing the event payload.
                        It should conform to a defined event schema.
            event_id: Optional. If provided, this ID will be used for the event.
                      If None, a new UUID will be generated.

        Returns:
            The ID of the published event, or None if publishing failed.
        """
        if not self.redis_client:
            logger.error("Cannot publish event: Redis client not connected.")
            return None

        try:
            # Ensure event_data has an event_id (standard practice)
            current_event_id = event_id or str(uuid.uuid4())
            payload = {
                '_event_id': current_event_id, # Internal tracking
                'data': json.dumps(event_data) # Store main payload as JSON string
            }
            message_id = self.redis_client.xadd(stream_name, payload, id='*')
            logger.info(f"Published event {current_event_id} to stream '{stream_name}' with message ID {message_id}")
            return current_event_id
        except Exception as e:
            logger.error(f"Failed to publish event to stream '{stream_name}': {e}")
            return None

    def create_consumer_group(self, stream_name: str, group_name: str, start_id: str = '0') -> bool:
        """
        Creates a new consumer group for a given stream.

        Args:
            stream_name: The name of the Redis Stream.
            group_name: The name of the consumer group to create.
            start_id: The ID from which the group should start consuming.
                      '0' means from the beginning of the stream.
                      '$' means only new messages arriving from now on.

        Returns:
            True if the group was created successfully or already exists, False otherwise.
        """
        if not self.redis_client:
            logger.error("Cannot create consumer group: Redis client not connected.")
            return False
        try:
            self.redis_client.xgroup_create(name=stream_name, groupname=group_name, id=start_id, mkstream=True)
            logger.info(f"Consumer group '{group_name}' created (or already exists) for stream '{stream_name}'.")
            return True
        except redis.exceptions.ResponseError as e:
            if "BUSYGROUP" in str(e): # Group already exists
                logger.info(f"Consumer group '{group_name}' already exists for stream '{stream_name}'.")
                return True
            logger.error(f"Failed to create consumer group '{group_name}' for stream '{stream_name}': {e}")
            return False
        except Exception as e:
            logger.error(f"An unexpected error occurred while creating consumer group '{group_name}': {e}")
            return False

    async def subscribe(self, stream_name: str, group_name: str, consumer_name: str,
                        callback: Callable[[str, Dict[str, Any]], None], # Updated callback signature
                        count: int = 1, poll_interval_s: float = 0.1, block_ms_redis: int = 100):
        """
        Asynchronously subscribes to a stream as part of a consumer group and processes messages.
        Uses polling with a short block time for Redis and asyncio.sleep for yielding.

        Args:
            stream_name: The name of the Redis Stream.
            group_name: The name of the consumer group.
            consumer_name: A unique name for this consumer within the group.
            callback: A function to call for each received message.
                      Receives (event_id_from_stream, deserialized_event_data).
            count: The maximum number of messages to fetch per read from Redis.
            poll_interval_s: How long to sleep (in seconds) if no messages are found.
            block_ms_redis: How long Redis should block (in milliseconds) waiting for messages.
        """
        if not self.redis_client:
            logger.error(f"[{consumer_name}] Cannot subscribe: Redis client not connected.")
            return

        logger.info(f"Consumer '{consumer_name}' starting to listen to stream '{stream_name}' in group '{group_name}'.")
        try:
            while True: # Loop indefinitely to keep consuming
                messages = None
                try:
                    messages = self.redis_client.xreadgroup(
                        groupname=group_name,
                        consumername=consumer_name,
                        streams={stream_name: '>'}, # '>' means get new messages for this consumer
                        count=count,
                        block=block_ms_redis
                    )
                except redis.exceptions.RedisError as e:
                    logger.error(f"[{consumer_name}] Redis error during xreadgroup on stream '{stream_name}': {e}. Retrying after {poll_interval_s*5}s.")
                    await asyncio.sleep(poll_interval_s * 5) # Longer sleep on Redis error
                    continue # Retry reading

                if messages:
                    for _stream, msg_list in messages: # _stream will be stream_name
                        for msg_id, msg_data_dict in msg_list: # msg_data_dict is the dict from Redis
                            try:
                                logger.debug(f"[{consumer_name}] Received raw message {msg_id} from stream {_stream}: {msg_data_dict}")
                                
                                # The actual event payload is expected to be in msg_data_dict['data'] as a JSON string.
                                # The msg_data_dict['_event_id'] is the logical ID we stored during publish.
                                event_json_payload = msg_data_dict.get('data')
                                logical_event_id = msg_data_dict.get('_event_id', msg_id) # Fallback to stream msg_id

                                if event_json_payload:
                                    original_event_data = json.loads(event_json_payload)
                                    # Pass the Redis stream message ID (msg_id) and the deserialized original event data
                                    callback(msg_id, original_event_data) 
                                    # Acknowledge the message with Redis using its stream message ID
                                    self.redis_client.xack(stream_name, group_name, msg_id)
                                    logger.debug(f"[{consumer_name}] Processed and acknowledged message {msg_id} (Logical ID: {logical_event_id}).")
                                else:
                                    logger.warning(f"[{consumer_name}] Message {msg_id} from stream {_stream} missing 'data' field. Raw: {msg_data_dict}")
                                    # Acknowledge to remove it from PEL, or handle as an error
                                    self.redis_client.xack(stream_name, group_name, msg_id)

                            except json.JSONDecodeError as e:
                                logger.error(f"[{consumer_name}] Failed to decode JSON for message {msg_id}: {e}. Payload: {event_json_payload}. Acking to remove from PEL.")
                                self.redis_client.xack(stream_name, group_name, msg_id) # Ack malformed message
                            except Exception as e:
                                logger.error(f"[{consumer_name}] Error processing message {msg_id} (Logical ID: {logical_event_id}): {e}. Message will remain in PEL.", exc_info=True)
                                # Not acking here, so it stays in Pending Entries List (PEL) for retry/manual inspection.
                else:
                    # No messages, yield control to asyncio event loop
                    await asyncio.sleep(poll_interval_s)

        except asyncio.CancelledError:
            logger.info(f"Consumer '{consumer_name}' subscription was cancelled.")
        except KeyboardInterrupt: # Should be caught by the main asyncio loop ideally
            logger.info(f"Consumer '{consumer_name}' stopping due to KeyboardInterrupt.")
        except Exception as e:
            logger.error(f"Consumer '{consumer_name}' on stream '{stream_name}' encountered a critical error: {e}", exc_info=True)
        finally:
            logger.info(f"Consumer '{consumer_name}' has stopped listening to stream '{stream_name}'.")

    def disconnect(self):
        """
        Closes the connection to Redis.
        """
        if self.redis_client:
            self.redis_client.close()
            logger.info("KEBClient disconnected from Redis.")

# Example Usage (for testing purposes, typically not in the client file itself)
async def _run_keb_client_example(): # Renamed to avoid conflict, made async
    # This example assumes a Redis server running on localhost:6379
    keb_client = KEBClient()

    if keb_client.redis_client:
        test_stream = "keb_async_test_stream"
        test_group = "keb_async_test_group"
        # Unique consumer name for each run
        test_consumer = f"async_consumer_{uuid.uuid4().hex[:6]}" 

        # 1. Create consumer group
        keb_client.create_consumer_group(test_stream, test_group, start_id='$') # Start with new messages

        # 2. Define a callback for subscribed messages
        def handle_test_message(event_id_from_stream: str, message_payload: Dict[str, Any]):
            logger.info(f"[{test_consumer}] Received StreamID:{event_id_from_stream}, Event: {message_payload}")

        # 3. Start a subscriber task
        logger.info(f"Starting subscriber task for {test_consumer}...")
        subscriber_task = asyncio.create_task(
            keb_client.subscribe(test_stream, test_group, test_consumer, handle_test_message)
        )
        await asyncio.sleep(0.1) # Give subscriber a moment to start up

        # 4. Publish some test events
        logger.info("Publishing test events...")
        event1_id = keb_client.publish(test_stream, {"event_type": "AsyncTestEvent", "data": "Hello KEB Async 1"})
        event2_id = keb_client.publish(test_stream, {"event_type": "AnotherAsyncTest", "value": 456})
        logger.info(f"Published event1 (Logical ID: {event1_id}), event2 (Logical ID: {event2_id})")
        
        # Give subscriber time to process
        await asyncio.sleep(1) 
        
        # Cancel the subscriber task for cleanup in this example
        logger.info(f"Cancelling subscriber task {test_consumer}...")
        subscriber_task.cancel()
        try:
            await subscriber_task
        except asyncio.CancelledError:
            logger.info(f"Subscriber task {test_consumer} successfully cancelled.")
        
        keb_client.disconnect()
    else:
        logger.error("Could not run KEBClient async example, Redis not connected.")

if __name__ == '__main__':
    # To run this example:
    # Ensure Redis is running.
    # Execute this file: python -m vanta_seed.core.keb_client (if run from project root)
    # Or: python vanta_seed/core/keb_client.py
    
    # Example of how to run the async test function:
    # loop = asyncio.get_event_loop()
    # try:
    #     loop.run_until_complete(_run_keb_client_example())
    # finally:
    #     loop.close()
    logger.info("KEBClient module loaded. To run the example, uncomment the asyncio.run lines in __main__.")
    # For direct execution:
    # asyncio.run(_run_keb_client_example()) 