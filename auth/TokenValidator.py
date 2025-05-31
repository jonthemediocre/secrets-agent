"""
TokenValidator: Validates VANTA Vault Access Tokens and their scopes.
"""
import jwt
import datetime
import re # For key_pattern matching
from typing import Optional, List, Dict, Any
from dataclasses import dataclass
import os # For environment variable access

# Assuming schemas.vault_token is available or will be created
# from ..schemas.vault_token import VantaVaultAccessToken # Pydantic model for schema validation

@dataclass
class TokenValidationResult:
    is_valid: bool
    status_code: int = 200
    error_message: Optional[str] = None
    decoded_token: Optional[Dict[str, Any]] = None
    jti: Optional[str] = None
    subject: Optional[str] = None
    scope: Optional[Dict[str, Any]] = None
    client_pubkey_id: Optional[str] = None

class TokenValidator:
    def __init__(self, config=None):
        """
        Initializes the TokenValidator.

        Args:
            config (dict, optional): Configuration, expects 'jwt_secret_key_env_var',
                                     'expected_issuer', 'expected_audience'.
                                     Falls back for JWT secret key if env var not set.
        """
        self.config = config or {}
        
        jwt_secret_key_env_var = self.config.get('jwt_secret_key_env_var', 'VANTA_JWT_SECRET_KEY')
        self.jwt_secret_key = os.environ.get(jwt_secret_key_env_var)

        if not self.jwt_secret_key:
            self.jwt_secret_key = 'your-fallback-super-secret-key-for-hs256-DEV-ONLY' # Fallback for dev
            print(f"WARNING: TokenValidator is using a fallback JWT secret key. Environment variable '{jwt_secret_key_env_var}' not set. THIS IS NOT SECURE FOR PRODUCTION.")
        else:
            print(f"TokenValidator: Loaded JWT secret key from env var '{jwt_secret_key_env_var}'.")

        self.expected_issuer = self.config.get('expected_issuer', 'VantaVaultTokenAgent')
        self.expected_audience = self.config.get('expected_audience', 'VantaVaultAPI')
        
        # In a real application, usage counts would be stored persistently (e.g., Redis, DB)
        self._token_usage_counts: Dict[str, int] = {}

    def _key_pattern_matches(self, pattern: str, key: str) -> bool:
        """
        Checks if the key matches the glob-style pattern.
        Simple implementation: * matches any sequence, ? matches any single char.
        More robust globbing can be added if needed (e.g., using fnmatch library style).
        """
        # Convert glob-style pattern to regex
        # Escape regex special characters, then replace * and ? with regex equivalents
        regex_pattern = re.escape(pattern).replace('\\[*', '.*').replace('\\[?', '.')
        return bool(re.fullmatch(regex_pattern, key))

    async def validate_token_for_access(
        self,
        token_string: str,
        requested_environment: str,
        requested_key: str
    ) -> TokenValidationResult:
        """
        Validates a token string and checks if its scope permits access to the requested resource.

        Args:
            token_string (str): The JWT string.
            requested_environment (str): The environment being accessed.
            requested_key (str): The key being accessed.

        Returns:
            TokenValidationResult: An object indicating if validation passed and details.
        """
        try:
            # Decode the token
            decoded_token = jwt.decode(
                token_string, 
                self.jwt_secret_key, 
                algorithms=["HS256"], 
                audience=self.expected_audience
            )
            # VantaVaultAccessToken(**decoded_token) # Validate against Pydantic schema if defined

        except jwt.ExpiredSignatureError:
            return TokenValidationResult(is_valid=False, status_code=401, error_message="Token has expired.")
        except jwt.InvalidAudienceError:
            return TokenValidationResult(is_valid=False, status_code=401, error_message="Invalid token audience.")
        except jwt.InvalidIssuerError: # This check is often done manually if issuer is in payload
            return TokenValidationResult(is_valid=False, status_code=401, error_message="Invalid token issuer.")
        except jwt.InvalidTokenError as e:
            return TokenValidationResult(is_valid=False, status_code=401, error_message=f"Invalid token: {str(e)}")
        except Exception as e: # Catch other potential Pydantic validation errors or unexpected issues
             return TokenValidationResult(is_valid=False, status_code=400, error_message=f"Token processing error: {str(e)}")

        jti = decoded_token.get('jti')
        sub = decoded_token.get('sub')
        token_scope = decoded_token.get('scope')

        # Basic claims validation
        if decoded_token.get('iss') != self.expected_issuer:
            return TokenValidationResult(is_valid=False, status_code=401, error_message="Invalid token issuer.", jti=jti, subject=sub)

        if not token_scope or not isinstance(token_scope, dict):
            return TokenValidationResult(is_valid=False, status_code=400, error_message="Token scope is missing or malformed.", jti=jti, subject=sub)

        # Scope validation
        token_env = token_scope.get('environment')
        token_key_pattern = token_scope.get('key_pattern')
        token_permissions = token_scope.get('permissions', [])

        if token_env != requested_environment:
            return TokenValidationResult(
                is_valid=False, status_code=403, 
                error_message=f"Token not scoped for environment '{requested_environment}'. Scoped for '{token_env}'.",
                jti=jti, subject=sub, scope=token_scope
            )

        if not self._key_pattern_matches(token_key_pattern, requested_key):
            return TokenValidationResult(
                is_valid=False, status_code=403, 
                error_message=f"Token key pattern '{token_key_pattern}' does not permit access to key '{requested_key}'.",
                jti=jti, subject=sub, scope=token_scope
            )
        
        if "read" not in token_permissions: # Assuming 'read' is the required permission for get_secret
             return TokenValidationResult(
                is_valid=False, status_code=403, 
                error_message="Token does not have 'read' permission.",
                jti=jti, subject=sub, scope=token_scope
            )

        # Usage limit validation
        usage_limit = decoded_token.get('usage_limit')
        if usage_limit is not None:
            current_usage = self._token_usage_counts.get(jti, 0)
            if current_usage >= usage_limit:
                return TokenValidationResult(
                    is_valid=False, status_code=403, 
                    error_message="Token usage limit exceeded.",
                    jti=jti, subject=sub, scope=token_scope
                )
        
        # NBF (Not Before) check - PyJWT handles EXP automatically
        nbf = decoded_token.get('nbf')
        if nbf and datetime.datetime.utcfromtimestamp(nbf) > datetime.datetime.utcnow():
            return TokenValidationResult(is_valid=False, status_code=401, error_message="Token is not yet valid.", jti=jti, subject=sub)

        return TokenValidationResult(
            is_valid=True, 
            decoded_token=decoded_token, 
            jti=jti, 
            subject=sub, 
            scope=token_scope,
            client_pubkey_id=decoded_token.get('client_pubkey_id')
        )

    async def increment_usage_count(self, jti: Optional[str]):
        """
        Increments the usage count for a given token JTI.
        In a real application, this needs to be an atomic operation on a persistent store.
        """
        if not jti: return
        current_count = self._token_usage_counts.get(jti, 0)
        self._token_usage_counts[jti] = current_count + 1
        # print(f"DEBUG: Incremented usage for JTI {jti} to {self._token_usage_counts[jti]}")

# Example Usage (if run directly, for simple tests)
if __name__ == '__main__':
    import asyncio

    async def test_validation():
        # Ensure VANTA_JWT_SECRET_KEY_TEST is set in the environment for this test to use it.
        os.environ['VANTA_JWT_SECRET_KEY_TEST'] = 'your-super-secret-key-for-hs256-testing' # For test
        
        config = {
            'jwt_secret_key_env_var': 'VANTA_JWT_SECRET_KEY_TEST',
            'expected_issuer': 'TestVaultTokenAgent',
            'expected_audience': 'TestVaultAPI'
        }
        validator = TokenValidator(config=config)
        
        # A helper to generate a test token (simplified version of VaultTokenAgent)
        def generate_test_jwt(payload_override=None, secret_key=config['jwt_secret_key']):
            now = datetime.datetime.utcnow()
            payload = {
                "iss": config['expected_issuer'], 
                "sub": "test-subject", 
                "aud": config['expected_audience'],
                "iat": now,
                "nbf": now,
                "exp": now + datetime.timedelta(minutes=15),
                "jti": str(uuid.uuid4()),
                "scope": {"environment": "dev", "key_pattern": "DATABASE_*", "permissions": ["read"]}
            }
            if payload_override:
                payload.update(payload_override)
            return jwt.encode(payload, secret_key, algorithm="HS256")

        # Scenario 1: Valid token
        valid_token = generate_test_jwt()
        result1 = await validator.validate_token_for_access(valid_token, "dev", "DATABASE_PASSWORD")
        print(f"Scenario 1 (Valid): {result1.is_valid}, {result1.error_message}")
        assert result1.is_valid

        # Scenario 2: Expired token
        expired_token = generate_test_jwt({"exp": datetime.datetime.utcnow() - datetime.timedelta(minutes=5)})
        result2 = await validator.validate_token_for_access(expired_token, "dev", "DATABASE_PASSWORD")
        print(f"Scenario 2 (Expired): {result2.is_valid}, {result2.error_message}")
        assert not result2.is_valid and "expired" in result2.error_message

        # Scenario 3: Wrong environment
        wrong_env_token = generate_test_jwt()
        result3 = await validator.validate_token_for_access(wrong_env_token, "production", "DATABASE_PASSWORD")
        print(f"Scenario 3 (Wrong Env): {result3.is_valid}, {result3.error_message}")
        assert not result3.is_valid and "environment" in result3.error_message
        
        # Scenario 4: Key not matching pattern
        wrong_key_token = generate_test_jwt()
        result4 = await validator.validate_token_for_access(wrong_key_token, "dev", "API_KEY_SPECIAL")
        print(f"Scenario 4 (Wrong Key): {result4.is_valid}, {result4.error_message}")
        assert not result4.is_valid and "pattern" in result4.error_message

        # Scenario 5: Usage limit
        limited_token_jti = str(uuid.uuid4())
        limited_token = generate_test_jwt({"jti": limited_token_jti, "usage_limit": 1, "usage_count": 0})
        
        # First use - should be valid
        result5a = await validator.validate_token_for_access(limited_token, "dev", "DATABASE_USER")
        print(f"Scenario 5a (Usage Limit - 1st use): {result5a.is_valid}, {result5a.error_message}")
        assert result5a.is_valid
        await validator.increment_usage_count(result5a.jti) # Simulate successful use

        # Second use - should exceed limit
        result5b = await validator.validate_token_for_access(limited_token, "dev", "DATABASE_USER")
        print(f"Scenario 5b (Usage Limit - 2nd use): {result5b.is_valid}, {result5b.error_message}")
        assert not result5b.is_valid and "limit exceeded" in result5b.error_message
        
        # Scenario 6: Missing read permission
        no_read_permission_token = generate_test_jwt({"scope": {"environment": "dev", "key_pattern": "DATABASE_*", "permissions": ["write"]}})
        result6 = await validator.validate_token_for_access(no_read_permission_token, "dev", "DATABASE_HOST")
        print(f"Scenario 6 (No Read Permission): {result6.is_valid}, {result6.error_message}")
        assert not result6.is_valid and "'read' permission" in result6.error_message
        
        # Scenario 7: Token not yet valid (NBF)
        nbf_token = generate_test_jwt({"nbf": datetime.datetime.utcnow() + datetime.timedelta(minutes=5)})
        result7 = await validator.validate_token_for_access(nbf_token, "dev", "DATABASE_PASSWORD")
        print(f"Scenario 7 (Not Yet Valid): {result7.is_valid}, {result7.error_message}")
        assert not result7.is_valid and "not yet valid" in result7.error_message

    if __name__ == '__main__':
        asyncio.run(test_validation()) 