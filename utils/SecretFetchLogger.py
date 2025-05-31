"""
SecretFetchLogger: Logs secret access attempts and outcomes.
"""

import datetime
import json
from typing import Optional, Dict, Any

class SecretFetchLogger:
    def __init__(self, config=None):
        """
        Initializes the SecretFetchLogger.

        Args:
            config (dict, optional): Configuration for logging, e.g., log file path.
                                     Defaults to console logging if not provided.
        """
        self.config = config or {}
        self.log_file_path = self.config.get('log_file_path') # Example: './logs/secret_access.jsonl'
        
        if self.log_file_path:
            print(f"SecretFetchLogger configured to log to: {self.log_file_path}")
        else:
            print("SecretFetchLogger configured to log to console.")

    async def log_access_attempt(
        self,
        jti: Optional[str],
        subject: Optional[str],
        requested_env: str,
        requested_key: str,
        status_code: int,
        outcome: str, # e.g., "SUCCESS", "TOKEN_INVALID", "TOKEN_EXPIRED", "SCOPE_MISMATCH", "NOT_FOUND", "DECRYPTION_ERROR"
        error_message: Optional[str] = None,
        client_ip: Optional[str] = None, # Potentially from request headers
        additional_metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Logs a secret access attempt.

        Args:
            jti (Optional[str]): JWT ID of the token used, if any.
            subject (Optional[str]): Subject (user/service) from the token, if any.
            requested_env (str): The environment requested.
            requested_key (str): The key requested.
            status_code (int): HTTP status code of the outcome.
            outcome (str): A string describing the result of the access attempt.
            error_message (Optional[str], optional): Specific error message if access failed. Defaults to None.
            client_ip (Optional[str], optional): IP address of the requester. Defaults to None.
            additional_metadata (Optional[Dict[str, Any]], optional): Any other relevant metadata. Defaults to None.
        """
        log_entry = {
            "timestamp_iso": datetime.datetime.utcnow().isoformat() + "Z",
            "event_type": "SECRET_ACCESS_ATTEMPT",
            "jti": jti,
            "subject": subject,
            "requested_environment": requested_env,
            "requested_key": requested_key,
            "status_code": status_code,
            "outcome": outcome,
            "error_message": error_message,
            "client_ip": client_ip,
            "metadata": additional_metadata or {}
        }

        log_line = json.dumps(log_entry)

        if self.log_file_path:
            try:
                with open(self.log_file_path, 'a') as f:
                    f.write(log_line + '\n')
            except Exception as e:
                print(f"ERROR: Failed to write to secret access log file '{self.log_file_path}': {e}")
                print(f"Fallback console log: {log_line}") # Fallback to console
        else:
            print(log_line) # Log to console if no file path is set

# Example Usage (if run directly)
if __name__ == '__main__':
    import asyncio

    async def test_logging():
        # Scenario 1: Console logging
        console_logger = SecretFetchLogger()
        await console_logger.log_access_attempt(
            jti="test-jti-123",
            subject="service-worker-alpha",
            requested_env="production",
            requested_key="DATABASE_URL",
            status_code=200,
            outcome="SUCCESS",
            client_ip="192.168.1.100"
        )
        await console_logger.log_access_attempt(
            jti="test-jti-456",
            subject="user-admin",
            requested_env="staging",
            requested_key="THIRD_PARTY_API_KEY",
            status_code=403,
            outcome="SCOPE_MISMATCH",
            error_message="Token not scoped for key pattern.",
            client_ip="10.0.0.5"
        )

        # Scenario 2: File logging (requires a ./logs directory or adjust path)
        # Ensure the directory exists or handle FileNotFoundError
        import os
        log_dir = './temp_logs' # Using a temp_logs directory for testing
        if not os.path.exists(log_dir):
            os.makedirs(log_dir)
        test_log_file = os.path.join(log_dir, 'test_secret_access.jsonl')
        
        file_logger_config = {'log_file_path': test_log_file}
        file_logger = SecretFetchLogger(config=file_logger_config)
        
        await file_logger.log_access_attempt(
            jti="file-log-jti-abc",
            subject="batch-processor",
            requested_env="production",
            requested_key="AWS_SECRET_KEY",
            status_code=500,
            outcome="DECRYPTION_ERROR",
            error_message="SOPS decryption failed: key not found.",
            additional_metadata={"trace_id": "trace-xyz-789"}
        )
        print(f"\nFile logging test complete. Check '{test_log_file}'")
        
        # Clean up test log file if desired
        # if os.path.exists(test_log_file):
        #     os.remove(test_log_file)
        # if os.path.exists(log_dir) and not os.listdir(log_dir):
        #     os.rmdir(log_dir)

    if __name__ == '__main__':
        asyncio.run(test_logging()) 