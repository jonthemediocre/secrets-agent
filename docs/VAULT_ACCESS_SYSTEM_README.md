# VANTA Vault Access System (Phase 5)

## Overview

The VANTA Vault Access System provides a secure and controlled mechanism for applications and services to retrieve secrets at runtime. It moves away from distributing secret files directly and instead relies on short-lived, scoped access tokens and API-based retrieval of secrets decrypted on-demand from the SOPS-encrypted vault.

This system is a key component of the VANTA Secrets Agent infrastructure, enhancing security and operational flexibility.

## Core Components

1.  **`VaultAccessAgent` (`agents/VaultAccessAgent.py`)**
    *   **Responsibility**: Securely fetches and decrypts secrets from SOPS-encrypted files based on validated JWT tokens.
    *   **Functionality**:
        *   Receives requests containing a JWT Bearer token, target environment, and secret key.
        *   Validates the token using `TokenValidator` (checks signature, expiry, and scope).
        *   Determines the correct SOPS file path based on the environment (configured via `VANTA_SOPS_FILES_PATH`).
        *   Invokes the `sops` CLI tool via `subprocess` to decrypt and extract the specific secret value from the environment's `.enc.yaml` file.
        *   Logs access attempts and outcomes using `SecretFetchLogger`.
        *   Returns the plaintext secret or an appropriate error.

2.  **`VaultTokenAgent` (`agents/VaultTokenAgent.py`)**
    *   **Responsibility**: Generates JWT (JSON Web Token) access tokens.
    *   **Functionality**:
        *   Creates signed JWTs with configurable parameters:
            *   `subject`: An identifier for the entity requesting the token.
            *   `environment`: The target environment (e.g., `dev`, `prod`) the token grants access to.
            *   `key_pattern`: A glob-like pattern defining which secret keys can be accessed (e.g., `DATABASE_*`, `*`).
            *   `ttl_minutes`: Token Time-To-Live.
            *   `usage_limit`: How many times a token can be successfully used (optional, defaults to unlimited within TTL).
        *   Uses a JWT secret key loaded from the `VANTA_JWT_SECRET_KEY` environment variable.
        *   Sets standard JWT claims like `iss` (issuer), `aud` (audience), `exp` (expiry), `nbf` (not before), `iat` (issued at), and `jti` (JWT ID).
        *   Includes custom claims for `scope` (environment, key_pattern, permissions) and `usage_limit`.

3.  **`TokenValidator` (`auth/TokenValidator.py`)**
    *   **Responsibility**: Validates JWT access tokens presented to `VaultAccessAgent`.
    *   **Functionality**:
        *   Verifies the token's signature using the shared JWT secret key.
        *   Checks for token expiry (`exp` claim).
        *   Validates `iss` (issuer) and `aud` (audience) claims against expected values.
        *   Checks if the requested environment and key match the token's `scope`.
        *   If `usage_limit` is present, checks against a (conceptual or actual) store of used JTIs to prevent replay beyond the limit. (Current test implementation mocks this state).
        *   Returns a validation result indicating if the token is valid and, if so, the decoded claims.

4.  **API Endpoints (`app/api/v1/vault/routes.py`)**
    *   **`POST /api/v1/vault/tokens/generate`**:
        *   Accessed by clients needing to obtain a vault access token.
        *   Takes a JSON payload with `subject`, `environment`, `key_pattern`, `ttl_minutes` (optional), and `usage_limit` (optional).
        *   Invokes `VaultTokenAgent` to generate the token.
        *   Returns the signed JWT and its details (e.g., expiry, scope).
    *   **`GET /api/v1/vault/{environment}/{key}`**:
        *   Accessed by clients to retrieve a specific secret.
        *   Requires a `Bearer <token>` in the `Authorization` header.
        *   Invokes `VaultAccessAgent` to validate the token and fetch/decrypt the secret.
        *   Returns the plaintext secret value or an error response.

5.  **CLI Enhancements (`cli_enhanced.py`)**
    *   **`vanta-cli token generate`**:
        *   Provides a command-line interface to the `/tokens/generate` API endpoint.
        *   Allows users/scripts to request vault access tokens.
    *   **`vanta-cli run-with-secrets`**:
        *   Acts as a local User-Aware Proxy (UAP) for applications that cannot directly integrate with the Vault API.
        *   **Workflow**:
            1.  Optionally requests a short-lived, scoped token from the `/tokens/generate` API (if a token isn't provided directly via `--token`).
            2.  For each secret key derived from the `key_pattern`, calls the `/vault/{environment}/{key}` API using the token to fetch the plaintext secret.
            3.  Injects the fetched secrets into the environment variables of a specified subprocess OR writes them to a temporary secrets file (e.g., `.env` format) and sets an environment variable pointing to this file.
            4.  Executes the target command/subprocess.
            5.  Cleans up the temporary secrets file (if used).

6.  **`SecretFetchLogger` (`utils/SecretFetchLogger.py`)**
    *   **Responsibility**: Logs all secret access attempts made through `VaultAccessAgent`.
    *   **Functionality**: Records details like timestamp, JTI (from token), subject, requested environment/key, client IP, outcome (success/failure), and any errors. This is crucial for auditing.

## Security Considerations

*   **JWT Secret Key (`VANTA_JWT_SECRET_KEY`)**: This is a critical secret and must be managed securely. It's used to sign and verify all vault access tokens. Compromise of this key allows forging valid tokens.
*   **SOPS Master Keys**: The underlying security of the vault still relies on the SOPS master keys (e.g., Age keys, GPG keys, KMS keys). The Vault Access System provides controlled *access* but does not manage the SOPS master encryption itself.
*   **Token Scope and TTL**: Tokens should be generated with the narrowest possible scope (environment, key_pattern) and shortest practical TTL to minimize the window of opportunity if a token is compromised.
*   **`run-with-secrets`**: While convenient, injecting secrets into environment variables can be insecure if the target process is not trusted or if other processes on the system can inspect its environment. File-based injection to a tightly permissioned temporary file is generally safer if the target application supports reading from it.
*   **Transport Security**: All API communication MUST be over HTTPS in production.
*   **Audit Logs**: Regularly review logs from `SecretFetchLogger` to detect anomalous access patterns.

## Workflows

### 1. Application-Integrated Secret Retrieval (Preferred)

1.  **Bootstrap/Initialization**: An application, upon startup or when needing secrets, authenticates itself (e.g., via a service account mechanism or an initial bootstrap token) to the VANTA Secrets Agent API.
2.  **Token Request**: It calls `POST /api/v1/vault/tokens/generate` with its identity (subject) and the required scope (e.g., `environment: prod`, `key_pattern: SERVICE_A_*`).
3.  **Token Storage (Securely)**: The application securely stores the received JWT. This might be in memory or a secure local cache, depending on the application's architecture.
4.  **Secret Request**: When a specific secret is needed (e.g., `SERVICE_A_API_KEY`), the application calls `GET /api/v1/vault/prod/SERVICE_A_API_KEY`, including the JWT in the `Authorization` header.
5.  **Secret Usage**: The application uses the retrieved plaintext secret.
6.  **Token Refresh (if applicable)**: If tokens are very short-lived, the application may need to refresh them by repeating step 2 before expiry.

### 2. CLI-Facilitated Secret Injection (for legacy or non-integrated apps)

1.  **Command Execution**: A script or developer executes:
    ```bash
    vanta-cli run-with-secrets --environment prod --key-pattern "SERVICE_B_*" --inject-as env -- your_application --config /app/config.yaml
    ```
2.  **Token Generation (by `run-with-secrets`)**: The `run-with-secrets` command internally calls `POST /api/v1/vault/tokens/generate` to get a temporary token scoped for `prod` and `SERVICE_B_*`.
3.  **Secret Fetching (by `run-with-secrets`)**: It then iterates through keys matching `SERVICE_B_*` (currently simulated for wildcards, precise for specific keys) and calls `GET /api/v1/vault/prod/{key}` for each, using the temporary token.
4.  **Injection**: The secrets (e.g., `SERVICE_B_DB_PASS=secretvalue`) are set as environment variables for the `your_application` process.
5.  **Application Runs**: `your_application` starts and reads its configuration from environment variables.
6.  **Cleanup**: `run-with-secrets` ensures the temporary token is no longer usable (implicitly by TTL, or explicitly if revocation is implemented). If file injection was used, the temporary file is deleted.

## Setup & Configuration

1.  **Environment Variables**: Ensure the following environment variables are set for the API service and agents:
    *   `VANTA_JWT_SECRET_KEY`: A strong, unique secret key for signing and verifying JWTs.
    *   `VANTA_SOPS_FILES_PATH`: The absolute path to the directory containing your SOPS-encrypted `.enc.yaml` files (e.g., `/etc/vanta/sops_files/`). Files should be named `{environment}.enc.yaml` (e.g., `production.enc.yaml`).
2.  **SOPS Configuration**: SOPS must be configured on the system where `VaultAccessAgent` runs, with access to the necessary decryption keys (e.g., GPG keys imported, Age key available, cloud KMS configured).
3.  **Install Dependencies**: Ensure all Python dependencies from `requirements.txt` are installed.
4.  **Run the API**: Start the FastAPI application (e.g., using `uvicorn app.main:app --host 0.0.0.0 --port 8000`).

## Future Enhancements (Conceptual)

*   **Token Revocation List (TRL)**: For immediate revocation of compromised tokens before their TTL expires.
*   **More Granular Permissions in Token Scope**: Beyond `environment` and `key_pattern`, potentially add `read`, `list` (for key patterns) permissions.
*   **API Endpoint to List Keys**: An API endpoint to list available keys within an environment based on a token's scope, to improve `run-with-secrets` for wildcard patterns.
*   **Async SOPS calls**: If SOPS CLI calls become a bottleneck, explore async libraries for SOPS or direct cryptographic operations (with extreme care).

This system provides a significant step towards secure, auditable, and flexible runtime secret management within the VANTA ecosystem. 