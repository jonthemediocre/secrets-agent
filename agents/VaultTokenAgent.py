"""
VaultTokenAgent: Responsible for issuing VANTA Vault Access Tokens.
"""

import jwt
import datetime
import uuid
from typing import List, Optional, Dict, Any
import os # For environment variable access

# Assuming schemas.vault_token is available or will be created
# from ..schemas.vault_token import VantaVaultAccessToken # Pydantic model for schema validation

class VaultTokenAgent:
    def __init__(self, config=None):
        """
        Initializes the VaultTokenAgent.

        Args:
            config (dict, optional): Configuration for the agent, 
                                     should include 'jwt_secret_key_env_var' (name of env var for secret key), 
                                     'default_issuer', 'default_audience', 'max_ttl_minutes'.
                                     If 'jwt_secret_key_env_var' is not provided or env var is not set,
                                     it falls back to a less secure default.
        """
        self.config = config or {}
        
        jwt_secret_key_env_var = self.config.get('jwt_secret_key_env_var', 'VANTA_JWT_SECRET_KEY')
        self.jwt_secret_key = os.environ.get(jwt_secret_key_env_var)
        
        if not self.jwt_secret_key:
            self.jwt_secret_key = 'your-fallback-super-secret-key-for-hs256-DEV-ONLY' # Fallback for dev
            print(f"WARNING: VaultTokenAgent is using a fallback JWT secret key. Environment variable '{jwt_secret_key_env_var}' not set. THIS IS NOT SECURE FOR PRODUCTION.")
        else:
            print(f"VaultTokenAgent: Loaded JWT secret key from env var '{jwt_secret_key_env_var}'.")
            
        self.default_issuer = self.config.get('default_issuer', 'VantaVaultTokenAgent')
        self.default_audience = self.config.get('default_audience', 'VantaVaultAPI')
        self.max_ttl_minutes = self.config.get('max_ttl_minutes', 60 * 24) # Max 1 day TTL by default

    async def generate_token(
        self,
        subject: str,
        environment: str,
        key_pattern: str,
        permissions: Optional[List[str]] = None,
        ttl_minutes: Optional[int] = None,
        usage_limit: Optional[int] = None,
        client_pubkey_id: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generates a new VANTA Vault Access Token.

        Args:
            subject (str): Identifier for the entity (user, service) requesting the token.
            environment (str): The vault environment the token is scoped to (e.g., 'production', 'dev').
            key_pattern (str): Glob-style pattern for keys this token can access (e.g., 'DATABASE_*', 'OPENAI_API_KEY').
            permissions (Optional[List[str]], optional): Permissions granted (e.g., ['read']). Defaults to ["read"].
            ttl_minutes (Optional[int], optional): Time-to-live for the token in minutes. Defaults to configured default or 15 mins.
                                                  Capped by `self.max_ttl_minutes`.
            usage_limit (Optional[int], optional): Maximum number of times the token can be used. Defaults to None (unlimited).
            client_pubkey_id (Optional[str], optional): Identifier for a client's public key for payload encryption. Defaults to None.
            metadata (Optional[Dict[str, Any]], optional): Additional metadata to include in the token. Defaults to None.

        Returns:
            str: The encoded JWT.
            
        Raises:
            ValueError: If input parameters are invalid (e.g., TTL too long).
        """
        if permissions is None:
            permissions = ["read"]
        
        effective_ttl = ttl_minutes if ttl_minutes is not None else self.config.get('default_ttl_minutes', 15)
        if effective_ttl <= 0 or effective_ttl > self.max_ttl_minutes:
            raise ValueError(f"TTL must be between 1 and {self.max_ttl_minutes} minutes. Requested: {effective_ttl}")

        now = datetime.datetime.utcnow()
        token_jti = str(uuid.uuid4())

        payload = {
            "iss": self.default_issuer,
            "sub": subject,
            "aud": self.default_audience,
            "iat": now,
            "nbf": now, # Token is valid immediately
            "exp": now + datetime.timedelta(minutes=effective_ttl),
            "jti": token_jti,
            "scope": {
                "environment": environment,
                "key_pattern": key_pattern,
                "permissions": permissions,
            }
        }

        if usage_limit is not None:
            if usage_limit <= 0:
                raise ValueError("Usage limit must be a positive integer.")
            payload["usage_limit"] = usage_limit
            payload["usage_count"] = 0 # Initial count
        
        if client_pubkey_id:
            payload["client_pubkey_id"] = client_pubkey_id
        
        if metadata:
            payload["metadata"] = metadata

        # Validate against Pydantic schema if available
        # try:
        #     VantaVaultAccessToken(**payload) # This would validate structure and types
        # except ValidationError as e:
        #     raise ValueError(f"Token payload failed schema validation: {e}")

        encoded_jwt = jwt.encode(payload, self.jwt_secret_key, algorithm="HS256")
        return encoded_jwt

if __name__ == '__main__':
    import asyncio

    async def test_token_generation():
        # Example config, in a real app this would come from a config file or env vars
        # Ensure VANTA_JWT_SECRET_KEY_TEST is set in the environment for this test to use it.
        os.environ['VANTA_JWT_SECRET_KEY_TEST'] = 'your-super-secret-key-for-hs256-testing' # For test
        
        config = {
            'jwt_secret_key_env_var': 'VANTA_JWT_SECRET_KEY_TEST', # Use a different var for testing
            'default_issuer': 'TestVantaVaultTokenAgent',
            'default_audience': 'TestVantaVaultAPI',
            'max_ttl_minutes': 120, # Max 2 hours for tests
            'default_ttl_minutes': 30
        }
        token_agent = VaultTokenAgent(config=config)

        print(f"Using JWT Secret Key: {token_agent.jwt_secret_key[:10]}...")

        # Scenario 1: Basic token
        try:
            token1 = await token_agent.generate_token(
                subject="service-alpha|instance-001",
                environment="staging",
                key_pattern="SERVICE_ALPHA_DB_PASSWORD"
            )
            print(f"Scenario 1 Token: {token1}")
            decoded1 = jwt.decode(token1, token_agent.jwt_secret_key, algorithms=["HS256"], audience=config['default_audience'])
            print(f"Decoded 1: {decoded1}")
            assert decoded1['scope']['environment'] == 'staging'
            assert decoded1['scope']['key_pattern'] == 'SERVICE_ALPHA_DB_PASSWORD'
        except Exception as e:
            print(f"Scenario 1 Error: {e}")

        # Scenario 2: Token with TTL and usage limit
        try:
            token2 = await token_agent.generate_token(
                subject="user-beta",
                environment="production",
                key_pattern="OPENAI_*",
                ttl_minutes=10,
                usage_limit=5,
                metadata={"request_id": "req-123"}
            )
            print(f"\nScenario 2 Token: {token2}")
            decoded2 = jwt.decode(token2, token_agent.jwt_secret_key, algorithms=["HS256"], audience=config['default_audience'])
            print(f"Decoded 2: {decoded2}")
            assert decoded2['exp'] > decoded2['iat']
            assert decoded2['usage_limit'] == 5
            assert decoded2['metadata']['request_id'] == "req-123"
        except Exception as e:
            print(f"Scenario 2 Error: {e}")

        # Scenario 3: TTL too long
        try:
            print("\nScenario 3: Testing too long TTL...")
            await token_agent.generate_token(
                subject="service-gamma",
                environment="dev",
                key_pattern="*",
                ttl_minutes=config['max_ttl_minutes'] + 10 
            )
        except ValueError as e:
            print(f"Scenario 3 Error (expected): {e}")
        except Exception as e:
            print(f"Scenario 3 Unexpected Error: {e}")
            
        # Scenario 4: Invalid usage limit
        try:
            print("\nScenario 4: Testing invalid usage limit...")
            await token_agent.generate_token(
                subject="service-delta",
                environment="dev",
                key_pattern="*",
                usage_limit=0
            )
        except ValueError as e:
            print(f"Scenario 4 Error (expected): {e}")
        except Exception as e:
            print(f"Scenario 4 Unexpected Error: {e}")

    if __name__ == '__main__':
        asyncio.run(test_token_generation()) 