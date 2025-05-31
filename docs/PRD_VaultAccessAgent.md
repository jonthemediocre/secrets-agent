# Product Requirements Document: VANTA Vault Access System

**Version:** 1.0
**Date:** ((Current Date))
**Status:** Final
**Author:** VANTA AI Architect (via Gemini Agent)

## 1. Introduction

This document outlines the product requirements for the VANTA Vault Access System. This system is a critical enhancement to the VANTA Secrets Agent, providing a secure, API-driven mechanism for runtime secret delivery to applications and services. It aims to reduce reliance on direct secret file distribution, improve security posture through short-lived scoped tokens, and enhance auditability of secret access.

## 2. Goals

*   Provide a secure method for applications and services to fetch secrets at runtime.
*   Implement a token-based authentication and authorization system for secret access.
*   Utilize the existing SOPS-encrypted vault as the source of truth for secrets.
*   Enable fine-grained access control through scoped tokens (environment, key patterns).
*   Offer robust auditing of secret access attempts.
*   Provide a CLI utility (`run-with-secrets`) to facilitate secret injection for applications not natively supporting the API.
*   Maintain compatibility with the existing VANTA Secrets Agent infrastructure.

## 3. Target Users

*   **Applications & Services:** Automated systems that require access to secrets during their runtime.
*   **Developers & DevOps Engineers:** Users who need to provision secrets to applications, manage access tokens, or utilize secrets in scripts and local development environments.
*   **Security Teams:** Personnel responsible for auditing secret access and ensuring compliance.

## 4. Core Components & Features

### 4.1. VaultTokenAgent
*   **Description:** Responsible for generating JWT (JSON Web Token) access tokens.
*   **Requirements:**
    *   Generate cryptographically signed JWTs.
    *   Support configurable token parameters:
        *   `subject`: Identifier for the token requester.
        *   `environment`: Target environment (e.g., `dev`, `prod`).
        *   `key_pattern`: Glob-like pattern for accessible secret keys (e.g., `DATABASE_*`, `API_KEYS/*`).
        *   `ttl_minutes`: Token Time-To-Live.
        *   `usage_limit`: (Optional) Maximum number of successful uses for the token.
    *   Load JWT signing secret key from a secure environment variable (`VANTA_JWT_SECRET_KEY`).
    *   Include standard JWT claims (`iss`, `aud`, `exp`, `nbf`, `iat`, `jti`).
    *   Include custom claims for `scope` (environment, key_pattern, permissions) and `usage_limit`.

### 4.2. TokenValidator
*   **Description:** Validates JWT access tokens presented for secret retrieval.
*   **Requirements:**
    *   Verify token signature against the shared JWT secret key.
    *   Check token expiry (`exp` claim).
    *   Validate issuer (`iss`) and audience (`aud`) claims.
    *   Enforce scope: ensure requested environment and key fall within the token's `scope` (environment and key_pattern).
    *   Enforce `usage_limit` if specified in the token (requires a mechanism to track JTI usage).
    *   Return a clear validation result (valid/invalid, decoded token, error message, status code).

### 4.3. VaultAccessAgent
*   **Description:** Securely fetches and decrypts secrets from SOPS-encrypted files using a validated token.
*   **Requirements:**
    *   Accept requests containing a Bearer token, target environment, and specific secret key.
    *   Utilize `TokenValidator` to validate the incoming token.
    *   If token is valid, determine the path to the SOPS-encrypted file for the given environment (based on `VANTA_SOPS_FILES_PATH` env var and `{environment}.enc.yaml` naming convention).
    *   Invoke the `sops` CLI tool via `subprocess` to decrypt and extract the specific secret key's value from the file.
    *   Handle errors from the SOPS CLI (e.g., file not found, key not found, decryption failure).
    *   Log all access attempts (successful and failed) using `SecretFetchLogger`, including token details (JTI, subject), requested secret, client IP, and outcome.
    *   Return the plaintext secret value or an appropriate error response.

### 4.4. API Endpoints (FastAPI)
*   **Location:** `app/api/v1/vault/routes.py`
*   **Requirements:**
    *   **`POST /api/v1/vault/tokens/generate`**
        *   Accepts JSON payload: `{subject, environment, key_pattern, ttl_minutes?, usage_limit?}`.
        *   Validates input using Pydantic models.
        *   Invokes `VaultTokenAgent.generate_token()`.
        *   Returns JSON response: `{access_token, token_type, expires_in, scope_details}`.
    *   **`GET /api/v1/vault/{environment}/{key}`**
        *   Requires `Authorization: Bearer <token>` header.
        *   Extracts token, environment, and key from request.
        *   Invokes `VaultAccessAgent.get_secret()`.
        *   Returns plaintext secret value in response body (e.g., as JSON: `{"value": "secret"}`) or an appropriate JSON error object with correct HTTP status code.
    *   All API endpoints must be secured (e.g., HTTPS in production) and handle errors gracefully.

### 4.5. CLI Enhancements (`cli_enhanced.py`)
*   **`vanta-cli token generate` command:**
    *   Interface to the `POST /tokens/generate` API endpoint.
    *   Accepts options for `--subject`, `--environment`, `--key-pattern`, `--ttl`, `--usage-limit`.
    *   Outputs the generated token details in a user-friendly format.
*   **`vanta-cli run-with-secrets` command:**
    *   Facilitates running a subprocess with secrets injected into its environment or a temporary file.
    *   Accepts options: `--environment`, `--key-pattern` (for secret scope), `--inject-as {env|file}`, `--token <existing_token>` (optional), and the command to run.
    *   If `--token` is not provided, it must internally call the `/tokens/generate` API to obtain a short-lived, scoped token for the operation.
    *   Fetches specified secrets by calling the `/vault/{environment}/{key}` API using the token.
    *   Injects secrets: If `env`, sets environment variables. If `file`, writes to a temporary `.env` formatted file and sets `VANTA_SECRETS_FILE` environment variable to its path.
    *   Executes the target command.
    *   Ensures cleanup of temporary files.
    *   Handles errors from API calls or subprocess execution.

### 4.6. SecretFetchLogger
*   **Description:** Logs all secret access attempts.
*   **Requirements:**
    *   Log entries should include: timestamp, JTI (JWT ID), subject (from token), requested environment, requested key, client IP address, outcome (success/failure/error type), status code, and any error messages.
    *   Log format should be structured (e.g., JSONL) for easy parsing and analysis.
    *   Logging should be asynchronous or highly efficient to avoid impacting `VaultAccessAgent` performance.

## 5. Security Requirements

*   **JWT Secret Key Management:** The `VANTA_JWT_SECRET_KEY` must be a strong, randomly generated secret, managed securely, and not exposed in logs or version control.
*   **SOPS Key Security:** The security of the underlying SOPS master keys remains paramount.
*   **Principle of Least Privilege:** Tokens must be generated with the minimum necessary scope (environment, key_pattern) and TTL.
*   **Transport Security:** All API interactions must occur over HTTPS in production environments.
*   **Input Validation:** All inputs to API endpoints and CLI commands must be rigorously validated.
*   **Error Handling:** Return generic error messages for authentication/authorization failures to avoid leaking information.
*   **Auditability:** Comprehensive logging of token generation and secret access attempts via `SecretFetchLogger` is mandatory.
*   **Protection against Replay Attacks:** Use of JTI and `usage_limit` helps mitigate token replay if a token is compromised.

## 6. Usability & UX (CLI Focus)

*   CLI commands must be intuitive and well-documented (`--help` text).
*   Error messages from the CLI should be clear and actionable.
*   `run-with-secrets` should provide clear feedback on which secrets are being fetched and how they are injected.

## 7. Performance

*   Token generation and validation should be very fast.
*   Secret retrieval latency will be impacted by SOPS CLI execution time. Consider potential optimizations or caching if this becomes a bottleneck, but prioritize security.
*   Logging should not significantly degrade API response times.

## 8. Non-Goals

*   This phase does not include a GUI for managing vault access tokens or policies (can be a future enhancement).
*   This phase does not implement a full Token Revocation List (TRL) system, relying on short TTLs and usage limits primarily.
*   This phase does not alter the core SOPS encryption/decryption mechanisms themselves, only how access to decrypted values is brokered.
*   Does not yet provide an API endpoint to list available keys by pattern for a given environment (this would simplify `run-with-secrets` wildcard handling).

## 9. Future Considerations

*   GUI for token management.
*   Token Revocation List (TRL).
*   API endpoint for listing keys by pattern.
*   More advanced scope permissions (e.g., read-only vs. read/write if secrets become mutable via API).
*   Integration with external identity providers for token subjects.

## 10. Acceptance Criteria

*   All core components (VaultTokenAgent, TokenValidator, VaultAccessAgent, API endpoints, CLI commands, SecretFetchLogger) are implemented as specified.
*   `vanta-cli token generate` successfully calls the API and returns a valid JWT.
*   `vanta-cli run-with-secrets` successfully fetches secrets via the API (using a generated or provided token) and injects them into a subprocess environment.
*   Secrets can be successfully retrieved via a `GET /api/v1/vault/{environment}/{key}` request using a valid Bearer token.
*   Invalid or expired tokens are rejected by the API with appropriate error codes.
*   Scoped access (environment, key_pattern) is enforced.
*   Usage limits (if set on a token) are enforced.
*   Secret access attempts are logged by `SecretFetchLogger`.
*   Comprehensive tests (unit, integration) as outlined in `tests/docs/test_plan_vault_access.md` pass.
*   Documentation (`docs/VAULT_ACCESS_SYSTEM_README.md`) is complete and accurate. 