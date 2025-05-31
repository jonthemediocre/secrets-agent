"""
VaultAccessAgent: Handles runtime secret retrieval requests.
"""

from fastapi import HTTPException
from ..auth.TokenValidator import TokenValidator # Assuming TokenValidator is in auth directory
from ..utils.SecretFetchLogger import SecretFetchLogger # Assuming SecretFetchLogger is in utils
# from ..core.VantaCore import VantaCore # Example for accessing core functionalities like SOPS
import subprocess # For SOPS CLI calls
import asyncio
import os
import yaml # For parsing SOPS output
from typing import Optional
from pathlib import Path

class VaultAccessAgent:
    def __init__(self, config=None, core_services=None):
        """
        Initializes the VaultAccessAgent.
        
        Args:
            config (dict, optional): Configuration for the agent. 
                                     Should include 'token_validator_config', 'logger_config', 
                                     and 'sops_files_base_path'.
            core_services (object, optional): Access to core VANTA services.
        """
        self.config = config or {}
        self.token_validator = TokenValidator(config=self.config.get('token_validator_config'))
        self.logger = SecretFetchLogger(config=self.config.get('logger_config'))
        self.sops_files_base_path = self.config.get('sops_files_base_path', './sops_data') # Default path
        
        if not os.path.exists(self.sops_files_base_path):
            print(f"WARNING: SOPS files base path '{self.sops_files_base_path}' does not exist. VaultAccessAgent may not find SOPS files.")
        else:
            print(f"VaultAccessAgent initialized. SOPS files expected in: {self.sops_files_base_path}")

    async def get_secret(self, token_string: Optional[str], requested_environment: str, requested_key: str, client_ip: Optional[str]):
        """
        Retrieves a secret after validating the provided token and its scope.

        Args:
            token_string (Optional[str]): The JWT string from the Authorization header (e.g., 'Bearer <token>').
            requested_environment (str): The target environment for the secret.
            requested_key (str): The specific secret key to retrieve.
            client_ip (Optional[str]): Client IP address for logging.

        Returns:
            Tuple[Optional[Any], int, Optional[str]]: (secret_value, status_code, error_message)
        """
        if not token_string or not token_string.startswith("Bearer "):
            await self.logger.log_access_attempt(
                jti=None, subject=None, requested_env=requested_environment, requested_key=requested_key,
                status_code=401, outcome="TOKEN_ERROR", error_message="Missing or malformed Authorization header.",
                client_ip=client_ip
            )
            return None, 401, "Missing or malformed Authorization header."

        actual_token = token_string.split(" ", 1)[1]
        
        validation_result = await self.token_validator.validate_token_for_access(
            token_string=actual_token,
            requested_environment=requested_environment,
            requested_key=requested_key
        )

        log_jti = validation_result.jti if validation_result else None
        log_sub = validation_result.subject if validation_result else None

        if not validation_result or not validation_result.is_valid:
            await self.logger.log_access_attempt(
                jti=log_jti, subject=log_sub, requested_env=requested_environment, requested_key=requested_key,
                status_code=validation_result.status_code if validation_result else 401,
                outcome="TOKEN_VALIDATION_FAILED", error_message=validation_result.error_message if validation_result else "Token validation failed",
                client_ip=client_ip
            )
            return None, validation_result.status_code if validation_result else 401, validation_result.error_message if validation_result else "Token validation failed"

        try:
            secret_value = await self._fetch_and_decrypt_secret(requested_environment, requested_key)

            if secret_value is None:
                await self.logger.log_access_attempt(
                    jti=log_jti, subject=log_sub, requested_env=requested_environment, requested_key=requested_key,
                    status_code=404, outcome="SECRET_NOT_FOUND", error_message=f"Secret '{requested_key}' not found.",
                    client_ip=client_ip
                )
                return None, 404, f"Secret '{requested_key}' not found in environment '{requested_environment}'."
            
            await self.token_validator.increment_usage_count(log_jti)
            await self.logger.log_access_attempt(
                jti=log_jti, subject=log_sub, requested_env=requested_environment, requested_key=requested_key,
                status_code=200, outcome="SUCCESS", client_ip=client_ip
            )
            return secret_value, 200, None

        except Exception as e:
            await self.logger.log_access_attempt(
                jti=log_jti, subject=log_sub, requested_env=requested_environment, requested_key=requested_key,
                status_code=500, outcome="DECRYPTION_ERROR", error_message=f"Internal error: {str(e)}",
                client_ip=client_ip
            )
            return None, 500, f"Internal server error while retrieving secret: {str(e)}"

    async def _fetch_and_decrypt_secret(self, environment: str, key: str) -> Optional[str]:
        """
        Fetches and decrypts a specific secret key from a SOPS-encrypted YAML file
        for the given environment using the SOPS CLI.
        Assumes SOPS files are named '{environment}.enc.yaml' within `self.sops_files_base_path`.
        """
        sops_file_path = Path(self.sops_files_base_path) / f"{environment}.enc.yaml"

        if not sops_file_path.exists():
            print(f"SOPS file not found: {sops_file_path}")
            return None

        cmd = [
            "sops",
            "--decrypt",
            "--extract",
            f"['{key}']", # SOPS path expression to extract a specific key
            str(sops_file_path)
        ]

        try:
            print(f"Executing SOPS command: {' '.join(cmd)}")
            process = await asyncio.create_subprocess_exec(
                *cmd,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                # SOPS --extract for a single value might return it directly, not as YAML/JSON.
                # If it's quoted (e.g. for strings), strip quotes.
                # If it's complex (list/dict), it might be YAML/JSON. For single values, it's often direct.
                value = stdout.decode().strip()
                # Attempt to remove common quoting from SOPS output for single values
                if (value.startswith('"') and value.endswith('"')) or \
                   (value.startswith("'") and value.endswith("'")):
                    value = value[1:-1]
                return value
            else:
                error_message = stderr.decode().strip()
                print(f"SOPS decryption failed for {key} in {sops_file_path}. Return code: {process.returncode}")
                print(f"SOPS stderr: {error_message}")
                if "key not found" in error_message.lower():
                    return None # Key specifically not found in the SOPS file
                # For other SOPS errors, raise them to be caught by the caller as a decryption failure
                raise Exception(f"SOPS decryption error: {error_message}")
        except FileNotFoundError: # sops command not found
            print("ERROR: `sops` command not found. Please ensure SOPS is installed and in your PATH.")
            raise Exception("`sops` command not found. SOPS CLI is required for decryption.")
        except Exception as e:
            print(f"Error during SOPS execution for {key} in {sops_file_path}: {str(e)}")
            # Re-raise to be handled by the main get_secret method
            raise

    # def _encrypt_for_client(self, secret_value: str, client_pubkey_id: str):
    #     """ Placeholder for payload-level encryption. """
    #     print(f"Encrypting secret for client with pubkey_id: {client_pubkey_id}")
    #     return f"encrypted({secret_value})_for_{client_pubkey_id}"

if __name__ == '__main__':
    # Example Usage (requires asyncio and a running event loop)
    import asyncio

    async def main():
        # Mock config and core_services for standalone testing
        mock_config = {
            'token_validator_config': {'jwt_secret_key': 'your-super-secret-key-for-hs256'},
            'logger_config': {}
        }
        
        agent = VaultAccessAgent(config=mock_config)
        
        # --- Simulate TokenValidator that can issue a test token ---
        class MockTokenIssuer(TokenValidator):
            async def issue_test_token(self, sub, env, key_pattern, usage_limit=None, ttl_minutes=5):
                import jwt # Ensure jwt is imported here if not globally in this block
                import datetime # Ensure datetime is imported here
                payload = {
                    "iss": self.config.get('expected_issuer', 'TestIssuer'), 
                    "sub": sub, 
                    "aud": self.config.get('expected_audience', 'VantaVault'),
                    "iat": datetime.datetime.utcnow(),
                    "nbf": datetime.datetime.utcnow(),
                    "exp": datetime.datetime.utcnow() + datetime.timedelta(minutes=ttl_minutes),
                    "jti": "test-jti-" + str(datetime.datetime.utcnow().timestamp()),
                    "scope": {"environment": env, "key_pattern": key_pattern, "permissions": ["read"]},
                }
                if usage_limit:
                    payload["usage_limit"] = usage_limit
                    # payload["usage_count"] = 0 # usage_count is managed by validator, not set at issuance
                return jwt.encode(payload, self.jwt_secret_key, algorithm="HS256")

        agent.token_validator = MockTokenIssuer(config=mock_config.get('token_validator_config'))
        # Ensure the sops_files_base_path for the test agent points to a testable location
        # For testing, we might need to create dummy SOPS files.
        # Example: Create a temporary sops_data directory for the test.
        current_dir = Path(__file__).parent
        test_sops_path = current_dir / "test_sops_data_VaultAccessAgent"
        test_sops_path.mkdir(exist_ok=True)
        agent.sops_files_base_path = str(test_sops_path)
        print(f"Test agent SOPS path: {agent.sops_files_base_path}")

        # Create a dummy SOPS encrypted file for testing
        # This is a placeholder. In reality, you would use SOPS to encrypt a file.
        # sops -e -i --yaml test_sops_data_VaultAccessAgent/production.enc.yaml
        # (and add a key like OPENAI_API_KEY: "test_decrypted_sops_key")
        dummy_prod_sops_file = test_sops_path / "production.enc.yaml"
        # For the purpose of this test, we can't actually run sops encrypt here easily.
        # The test for _fetch_and_decrypt_secret would need to mock subprocess.run
        # For the main() test, we rely on the placeholder in _fetch_and_decrypt_secret 
        # or actual SOPS CLI and a pre-encrypted file if available in test environment.
        # For now, the `_fetch_and_decrypt_secret` has a specific check for `OPENAI_API_KEY`
        # Let's assume sops CLI is available and a file exists. For a true unit test, mock subprocess.

        # Scenario 1: Valid token, existing secret (assuming SOPS setup or mocked correctly)
        try:
            valid_token = await agent.token_validator.issue_test_token(
                sub="test-user|service-account",
                env="production",
                key_pattern="OPENAI_API_KEY"
            )
            print(f"Generated Test Token for Scenario 1: {valid_token}")
            secret_value, status, err_msg = await agent.get_secret(
                token_string=f"Bearer {valid_token}",
                requested_environment="production", 
                requested_key="OPENAI_API_KEY",
                client_ip="127.0.0.1"
            )
            if err_msg:
                print(f"Scenario 1 HTTP Error: {status} - {err_msg}")
            else:
                print(f"Scenario 1 Success: {secret_value}") # Value comes from _fetch_and_decrypt_secret
        except Exception as e:
            print(f"Scenario 1 Generic Error: {str(e)}")

        # Scenario 2: Invalid scope (wrong key)
        try:
            scoped_token = await agent.token_validator.issue_test_token(
                sub="test-user",
                env="production",
                key_pattern="AWS_*" # Token for AWS keys
            )
            secret_value, status, err_msg = await agent.get_secret(
                token_string=f"Bearer {scoped_token}",
                requested_environment="production", 
                key="OPENAI_API_KEY", # Requesting OpenAI key
                client_ip="127.0.0.1"
            )
            if not err_msg:
                 print(f"Scenario 2 Success (should not happen): {secret_value}")
            else:
                print(f"Scenario 2 HTTP Error (expected): {status} - {err_msg}")
        except Exception as e:
            print(f"Scenario 2 Generic Error: {str(e)}")

        # Scenario 3: Expired token
        try:
            expired_token = await agent.token_validator.issue_test_token(
                sub="test-user",
                env="dev",
                key_pattern="DATABASE_URL",
                ttl_minutes=-5 # Expired 5 mins ago
            )
            secret_value, status, err_msg = await agent.get_secret(
                token_string=f"Bearer {expired_token}",
                requested_environment="dev", 
                key="DATABASE_URL",
                client_ip="127.0.0.1"
            )
            if err_msg:
                print(f"Scenario 3 HTTP Error (expected): {status} - {err_msg}")
            else:
                print(f"Scenario 3 Success (should not happen): {secret_value}")
        except Exception as e:
            print(f"Scenario 3 Generic Error: {str(e)}")
            
        # Scenario 4: Secret not found
        try:
            valid_token_for_nonexistent = await agent.token_validator.issue_test_token(
                sub="test-user",
                env="dev",
                key_pattern="NONEXISTENT_KEY"
            )
            secret_value, status, err_msg = await agent.get_secret(
                token_string=f"Bearer {valid_token_for_nonexistent}",
                requested_environment="dev", 
                key="NONEXISTENT_KEY",
                client_ip="127.0.0.1"
            )
            if err_msg:
                print(f"Scenario 4 HTTP Error (expected): {status} - {err_msg}")
            else:
                print(f"Scenario 4 Success (should not happen): {secret_value}")
        except Exception as e:
            print(f"Scenario 4 Generic Error: {str(e)}")

    if __name__ == '__main__':
        asyncio.run(main())