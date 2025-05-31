# Test Plan: VaultAccessAgent & Token Validation

**Version:** 1.0
**Date:** $(date +%Y-%m-%d) <!-- Replace with actual date -->
**Author:** VANTA AI Assistant

## 1. Introduction

This document outlines the test plan for the `VaultAccessAgent` API endpoint (`GET /api/v1/vault/{env}/{key}`) and the associated token generation (`VaultTokenAgent`) and validation (`TokenValidator`) mechanisms. The goal is to ensure secure, scoped, and auditable access to secrets.

## 2. Scope of Testing

*   **Token Generation (`VaultTokenAgent` & CLI `vanta token generate`):
    *   Correctness of token structure based on `schemas/vault-token.schema.json`.
    *   Accurate population of claims (iss, aud, sub, iat, nbf, exp, scope).
    *   Validation of input parameters (scope, key_pattern, TTL).
*   **Token Validation (`TokenValidator`):
    *   Signature verification.
    *   Expiration (exp) and Not Before (nbf) checks.
    *   Issuer (iss) and Audience (aud) checks.
    *   Scope validation (environment, key_pattern matching).
    *   Usage limit enforcement.
*   **Secret Retrieval (`VaultAccessAgent` via `GET /api/v1/vault/{env}/{key}`):
    *   Successful retrieval of secrets with valid, scoped tokens.
    *   Denial of access for invalid, expired, or out-of-scope tokens.
    *   Correct handling of key patterns (exact match, wildcard).
    *   Correct environment isolation.
    *   (Optional) Payload-level encryption/decryption if implemented.
*   **CLI-Guided Secret Provisioning (`vanta run-with-secrets`):
    *   Correct internal token generation and secret fetching.
    *   Secure injection of secrets into child process environment (or temp file).
    *   Reliable cleanup of temporary files and environment variables.
    *   Correct execution of the target command with secrets available.
    *   Denial of execution if underlying token generation or secret fetch fails.
*   **Auditing (`SecretFetchLogger`):
    *   Accurate logging of all valid and invalid access attempts (API and CLI-mediated).
    *   Correct logging of token details, accessed key, environment, and subject.
*   **Security Constraints Enforcement:**
    *   HTTPS enforcement (though typically handled by deployment environment).
    *   Token revocation (if applicable).

## 3. Test Types

*   **Unit Tests:** For individual functions within `VaultTokenAgent`, `TokenValidator`, `VaultAccessAgent`, and CLI command handlers.
*   **Integration Tests:** For interactions between these components (e.g., token generation -> validation -> secret fetch).
*   **API Endpoint Tests:** Using `httpx` (or similar) to directly test the `GET /api/v1/vault/{env}/{key}` endpoint with various token states.
*   **CLI Tests:** Using `subprocess` or CLI testing frameworks to test `vanta token generate` and `vanta run-with-secrets`.
*   **Security Tests (Conceptual):
    *   Attempting to bypass token validation.
    *   Attempting to access secrets outside of token scope.
    *   Testing token replay (if not mitigated by JTI/usage counts).
    *   Testing TTL and usage limit enforcement.

## 4. Test Environment & Prerequisites

*   Running VANTA Secrets Agent API instance.
*   A pre-populated vault with secrets across different environments (e.g., `dev`, `staging`, `prod`) and with various key names to test patterns.
*   SOPS configured for vault encryption/decryption.
*   Required CLI tools and Python environment for running tests.
*   (For CLI-guided tests) Sample legacy scripts that can consume environment variables or read from a temporary file.

## 5. Key Test Scenarios

### 5.1. Token Generation (`vanta token generate` & `VaultTokenAgent`)

| Test Case ID | Description                                                                 | Expected Result                                                                                                   | Priority |
|--------------|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------|----------|
| TG-001       | Generate token with valid scope, key pattern, and TTL.                      | Token generated successfully, claims match input, conforms to schema.                                             | High     |
| TG-002       | Attempt to generate token with invalid environment.                         | Error, token not generated.                                                                                       | Medium   |
| TG-003       | Attempt to generate token with overly broad key pattern if restricted.      | Behavior per policy (e.g., error or warning).                                                                   | Medium   |
| TG-004       | Generate token with specific usage limit.                                   | `usage_limit` claim correctly set.                                                                                | High     |
| TG-005       | Generate token with minimum/maximum allowed TTL.                            | Token generated with correct `exp` claim.                                                                           | Medium   |
| TG-006       | Generate token without specifying optional parameters (e.g., usage_limit).  | Token generated with default values for optional claims.                                                          | Medium   |

### 5.2. Token Validation (`TokenValidator`)

| Test Case ID | Description                                      | Expected Result                                 | Priority |
|--------------|--------------------------------------------------|-------------------------------------------------|----------|
| TV-001       | Validate a valid, unexpired token.               | Validation success.                             | High     |
| TV-002       | Validate an expired token.                         | Validation failure (Expired).                   | High     |
| TV-003       | Validate a token before its `nbf` time.          | Validation failure (Not Yet Valid).             | High     |
| TV-004       | Validate a token with an invalid signature.        | Validation failure (Invalid Signature).         | High     |
| TV-005       | Validate a token with incorrect issuer/audience.   | Validation failure (Invalid Issuer/Audience).   | Medium   |
| TV-006       | Validate a token that has reached its usage limit. | Validation failure (Usage Limit Exceeded).      | High     |
| TV-007       | Validate a token for a key not matching its pattern. | Validation failure (Scope Mismatch - Key).      | High     |
| TV-008       | Validate a token for an env not matching its scope.  | Validation failure (Scope Mismatch - Env).      | High     |

### 5.3. Secret Retrieval (`GET /api/v1/vault/{env}/{key}`)

| Test Case ID | Description                                                                    | Expected Result                                                                   | Priority |
|--------------|--------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|----------|
| SR-001       | Request secret with valid token, exact key match.                                | 200 OK, secret payload returned. `usage_count` incremented. Log entry created.    | High     |
| SR-002       | Request secret with valid token, key pattern match.                              | 200 OK, secret payload returned. `usage_count` incremented. Log entry created.    | High     |
| SR-003       | Request secret with expired token.                                               | 401 Unauthorized (or 403 Forbidden). Log entry (attempt).                         | High     |
| SR-004       | Request secret with token scoped to a different environment.                   | 403 Forbidden. Log entry (attempt).                                               | High     |
| SR-005       | Request secret with token scoped to a different key/pattern.                   | 403 Forbidden. Log entry (attempt).                                               | High     |
| SR-006       | Request secret that does not exist (valid token).                                | 404 Not Found. Log entry (attempt).                                               | Medium   |
| SR-007       | Request secret with token that has reached usage limit.                          | 403 Forbidden (or specific rate limit error). Log entry (attempt).              | High     |
| SR-008       | Request secret without Authorization header.                                   | 401 Unauthorized.                                                                 | High     |
| SR-009       | Request secret with malformed bearer token.                                      | 401 Unauthorized.                                                                 | High     |

### 5.4. CLI-Guided Secret Provisioning (`vanta run-with-secrets`)

| Test Case ID | Description                                                                           | Expected Result                                                                                                                               | Priority |
|--------------|---------------------------------------------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------|----------|
| CG-001       | Run command needing secrets, valid scope/pattern, secrets injected via ENV.           | Command executes successfully, secrets available as ENV vars in child. Temp token used. Secure cleanup. Audit log created.                      | High     |
| CG-002       | Run command, secrets injected via temp file.                                          | Command executes successfully, reads secrets from temp file. Secure cleanup. Audit log.                                                     | High     |
| CG-003       | Run command, but specified key pattern matches no secrets.                              | Command fails to start (or starts with no secrets, depending on policy). Error message. Audit log (attempt).                                | Medium   |
| CG-004       | Run command, but underlying token generation fails (e.g., VaultTokenAgent down).        | Command fails to start. Error message.                                                                                                        | Medium   |
| CG-005       | Run command with very short TTL, command execution exceeds TTL.                         | Secrets should be available for the initial part; subsequent access by long-running child might fail if it re-validates. Test cleanup.         | Medium   |
| CG-006       | Verify temporary file is securely deleted after command execution (success and failure).  | Temporary file does not exist post-execution.                                                                                                 | High     |
| CG-007       | Run command with `--` to separate VANTA args from target command args.                | Target command receives its arguments correctly.                                                                                              | High     |

### 5.5. Auditing (`SecretFetchLogger`)

| Test Case ID | Description                                                                 | Expected Result                                                                                                         | Priority |
|--------------|-----------------------------------------------------------------------------|-------------------------------------------------------------------------------------------------------------------------|----------|
| AU-001       | Successful API secret fetch.                                                | Log entry with status `success`, correct token details, subject, key, env.                                              | High     |
| AU-002       | Failed API secret fetch (e.g., bad token).                                  | Log entry with status `failure` (or `unauthorized`), reason, attempted key/env.                                         | High     |
| AU-003       | Successful CLI-guided secret provisioning.                                  | Log entry indicating CLI mediation, subject (CLI user), target command, key(s) accessed.                                | High     |
| AU-004       | Failed CLI-guided secret provisioning (e.g., underlying secret fetch failed). | Log entry indicating CLI mediation, failure reason.                                                                     | High     |

## 6. Test Execution and Reporting

*   Tests will be executed using `pytest` (for Python components/API) and appropriate JS testing frameworks (if applicable for token generation in JS environments).
*   Test results will be reported in standard JUnit XML format for CI/CD integration.
*   A summary report will be generated indicating pass/fail status for each test case.

## 7. Future Considerations (Out of Scope for Initial MVP Test Plan)

*   Performance testing under load (many concurrent token requests/validations).
*   Testing of optional payload-level encryption.
*   Testing of token revocation mechanisms.
*   Testing of advanced security constraints (IP pinning, device fingerprinting). 