"""
API Routes for VANTA Vault Access (Phase 6)
"""

from fastapi import APIRouter, Depends, HTTPException, Header, Request
from typing import Optional, Dict, Any
import os # For environment variable access

# Assuming agent instances are managed and accessible, e.g., via a global registry or context
# from ....dependencies import get_vault_access_agent, get_vault_token_agent # Example dependency injection
# For stubs, we'll instantiate them directly or use placeholders
from .....agents.VaultAccessAgent import VaultAccessAgent
from .....agents.VaultTokenAgent import VaultTokenAgent
from .....auth.TokenValidator import TokenValidator # Used by VaultAccessAgent internally

# Placeholder for agent instances - in a real app, manage these properly (e.g., lifespan events, DI)
# This is a simplified approach for the stub.

# Load JWT secret from environment variable for agent configurations
# The agents themselves will also try to load this from env if their config dicts point to it.
JWT_SECRET_KEY_ENV_VAR_NAME = 'VANTA_JWT_SECRET_KEY'
JWT_SECRET_KEY_FOR_ROUTES = os.environ.get(JWT_SECRET_KEY_ENV_VAR_NAME)
SOPS_FILES_BASE_PATH_ENV_VAR_NAME = 'VANTA_SOPS_FILES_PATH'
SOPS_FILES_BASE_PATH_FOR_ROUTES = os.environ.get(SOPS_FILES_BASE_PATH_ENV_VAR_NAME, './sops_data') # Default path

if not JWT_SECRET_KEY_FOR_ROUTES:
    print(f"WARNING (routes.py): Environment variable '{JWT_SECRET_KEY_ENV_VAR_NAME}' not set. Agents will use fallback keys if not configured otherwise. NOT SECURE FOR PRODUCTION.")
    # Note: Agents will print their own specific warnings based on their direct config.

print(f"Routes: SOPS files base path configured to: {SOPS_FILES_BASE_PATH_FOR_ROUTES}")

# Configuration for agents. They will individually attempt to load the JWT secret from this env var name.
agent_config = {
    'token_validator_config': {
        'jwt_secret_key_env_var': JWT_SECRET_KEY_ENV_VAR_NAME,
        'expected_issuer': 'VantaVaultTokenAgent',
        'expected_audience': 'VantaVaultAPI'
    },
    'logger_config': {},
    'sops_files_base_path': SOPS_FILES_BASE_PATH_FOR_ROUTES, # For VaultAccessAgent
    # For VaultTokenAgent, it also needs jwt_secret_key_env_var
    'jwt_secret_key_env_var': JWT_SECRET_KEY_ENV_VAR_NAME, 
    'default_issuer': 'VantaVaultTokenAgent', # For VaultTokenAgent
    'default_audience': 'VantaVaultAPI', # For VaultTokenAgent
    'max_ttl_minutes': 60 * 8, # For VaultTokenAgent
    'default_ttl_minutes': 60 # For VaultTokenAgent
}

vault_access_agent_instance = VaultAccessAgent(config=agent_config) 
vault_token_agent_instance = VaultTokenAgent(config=agent_config)

def get_vault_access_agent(): # Basic dependency placeholder
    return vault_access_agent_instance

def get_vault_token_agent(): # Basic dependency placeholder
    return vault_token_agent_instance

router = APIRouter(
    prefix="/vault",
    tags=["Vault - Runtime Secret Access"],
)

@router.get("/{environment}/{key_name}", 
            summary="Retrieve a Secret", 
            response_description="The plaintext secret value (or encrypted if client_pubkey was used)")
async def get_secret_from_vault(
    environment: str,
    key_name: str,
    request: Request, # To get client IP
    authorization: Optional[str] = Header(None),
    vault_agent: VaultAccessAgent = Depends(get_vault_access_agent)
) -> Dict[str, Any]: # Return type could be more specific, e.g. PlainSecretResponse | EncryptedSecretResponse
    """
    Retrieves a specific secret from the VANTA vault for a given environment.

    - **Requires Bearer Token Authentication.**
    - Token scope must permit access to the specified environment and key_name.
    """
    client_ip = request.client.host if request.client else None
    
    secret_value, status_code, error_msg = await vault_agent.get_secret(
        token_string=authorization,
        requested_environment=environment,
        requested_key=key_name,
        client_ip=client_ip
    )

    if error_msg:
        raise HTTPException(status_code=status_code, detail=error_msg)
    
    return {"environment": environment, "key_name": key_name, "value": secret_value}

# --- Token Generation Endpoint (Conceptual - might be CLI-first or internal agent call) ---
# This endpoint is more for admin/CLI or service-to-service token generation if needed directly via API.
# The PRD focuses on CLI for initial token generation.

from pydantic import BaseModel, Field
from typing import List

class TokenGenerationRequest(BaseModel):
    subject: str = Field(..., description="Identifier for the entity (user, service) requesting the token.")
    environment: str = Field(..., description="The vault environment the token is scoped to.")
    key_pattern: str = Field(..., description="Glob-style pattern for keys this token can access.")
    permissions: Optional[List[str]] = Field(default_factory=lambda: ["read"], description="Permissions granted.")
    ttl_minutes: Optional[int] = Field(None, description="Time-to-live for the token in minutes.")
    usage_limit: Optional[int] = Field(None, description="Maximum number of times the token can be used.")
    client_pubkey_id: Optional[str] = Field(None, description="Identifier for a client's public key for payload encryption.")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata to include in the token.")

class TokenGenerationResponse(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: Optional[int] # TTL in seconds
    scope_details: Dict[str, Any]

@router.post("/tokens/generate", 
             summary="Generate a Vault Access Token (Admin/Service Usage)",
             response_model=TokenGenerationResponse,
             tags=["Vault - Token Management"])
async def generate_vault_access_token(
    token_request: TokenGenerationRequest,
    token_agent: VaultTokenAgent = Depends(get_vault_token_agent)
):
    """
    Generates a new VANTA Vault Access Token. 
    **Note:** This endpoint is typically for administrative or trusted service-to-service use. 
    Primary token generation for end-users/services might be initiated via the CLI or other agent interactions.
    """
    try:
        generated_jwt = await token_agent.generate_token(
            subject=token_request.subject,
            environment=token_request.environment,
            key_pattern=token_request.key_pattern,
            permissions=token_request.permissions,
            ttl_minutes=token_request.ttl_minutes,
            usage_limit=token_request.usage_limit,
            client_pubkey_id=token_request.client_pubkey_id,
            metadata=token_request.metadata
        )
        
        # For expires_in, we need to parse the token or use effective_ttl from generation logic
        # Simplified: use ttl_minutes if provided, otherwise agent's default
        effective_ttl_minutes = token_request.ttl_minutes if token_request.ttl_minutes is not None else token_agent.config.get('default_ttl_minutes', 15)
        
        return TokenGenerationResponse(
            access_token=generated_jwt,
            expires_in=effective_ttl_minutes * 60 if effective_ttl_minutes else None,
            scope_details={
                "environment": token_request.environment,
                "key_pattern": token_request.key_pattern,
                "permissions": token_request.permissions
            }
        )
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        # Log the exception in a real app
        print(f"Error generating token: {e}")
        raise HTTPException(status_code=500, detail="Internal server error while generating token.")

# Potentially add more routes here, e.g., for token introspection, revocation (if usage_limit is not enough)

# Example of how to include this router in your main FastAPI app:
# from fastapi import FastAPI
# from . import routes as vault_routes 
# app = FastAPI()
# app.include_router(vault_routes.router, prefix="/api/v1") # Ensure prefix matches API_BASE_URL in clients 