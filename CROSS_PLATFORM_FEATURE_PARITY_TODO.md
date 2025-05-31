# TODO: Cross-Platform Feature Parity (MVP) for VANTA Secrets Agent

**Objective:** Achieve a baseline level of core feature parity across the primary VANTA Secrets Agent interfaces: Web (existing), CLI, VS Code Extension, and Windows GUI.

**Status: DOMINO_COMPLETE: ALL_PLATFORMS_FEATURE_PARITY_MVP_REACHED ✅**

---

## Phase 1: CLI Enhancement

*   **[✅] Create `cli_enhanced.py`:** Implement core commands (scan, detect, export, rotate, status, version) using `click`, `rich`, `httpx`.
*   **[✅] Create `requirements_cli.txt`:** Define CLI dependencies.
*   **[✅] Create `tests/test_cli_enhanced.py`:** Develop a comprehensive test suite for the CLI.
*   **[✅] Create `docs/CLI_USAGE_GUIDE.md`:** Document CLI usage.
*   **Status:** **DOMINO_COMPLETE: CLI_FOUNDATION_READY ✅**

## Phase 2: VS Code Extension Enhancement

*   **[✅] Scaffold Extension Structure:** Update `package.json` (as `package_enhanced.json`), implement `extension.ts`.
*   **[✅] Implement Core Services:**
    *   `extension_api/vscode/src/clients/apiClient.ts`
    *   `extension_api/vscode/src/utils/configurationManager.ts`
    *   `extension_api/vscode/src/utils/notificationManager.ts`
    *   `extension_api/vscode/src/utils/statusBarManager.ts`
*   **[✅] Implement Providers:**
    *   `extension_api/vscode/src/providers/projectsProvider.ts`
    *   `extension_api/vscode/src/providers/secretsProvider.ts`
    *   `extension_api/vscode/src/providers/statusProvider.ts`
    *   `extension_api/vscode/src/providers/welcomeProvider.ts` (including webview HTML)
*   **[✅] Implement `CommandManager.ts`:**
    *   `scanProject`, `detectSecrets`, `exportVault`, `rotateSecrets`, `showStatus`.
    *   `addSecret`, `editSecret`, `deleteSecret`.
*   **[✅] Create `extension_api/vscode/tsconfig.json`**.
*   **[✅] Create `extension_api/vscode/README.md`**.
*   **[✅] Create `extension_api/vscode/.vscodeignore`**.
*   **Status:**
    *   **DOMINO_COMPLETE: VS_CODE_EXTENSION_SCAFFOLD_READY ✅**
    *   **DOMINO_COMPLETE: VS_CODE_COMMAND_MANAGER_ENHANCED ✅**
    *   **DOMINO_COMPLETE: VS_CODE_EXTENSION_INTEGRATION_VERIFIED ✅**

## Phase 3: Windows GUI Enhancement

*   **[✅] Create `windows_gui_enhanced.py`:** Implement main window, dialogs, and core functionality using `PyQt6` and `httpx`.
    *   Project scanning and display.
    *   Secret listing and display for selected project.
    *   Add, Edit, Delete secret functionality with dialogs and API calls.
    *   Export secrets functionality.
    *   Rotate secret functionality.
    *   System status display.
    *   API URL configuration dialog.
    *   Application logging view.
    *   About dialog.
    *   Icon integration with fallback.
*   **[✅] Create `requirements_windows_gui.txt`:** Define GUI dependencies.
*   **[✅] Create `tests/test_windows_gui_enhanced.py`:** Develop a comprehensive test suite for the GUI using `pytest`.
*   **[✅] Create `windows_gui_README.md`:** Document GUI setup and usage.
*   **Status:** **DOMINO_COMPLETE: WINDOWS_GUI_ENHANCEMENTS_COMPLETE ✅**

## Phase 5: VaultAccessAgent - Runtime Secret Delivery & API Integration

**Objective:** Integrate the enhanced CLI and backend agents with the new VaultAccessAgent API endpoints for secure token generation and runtime secret provisioning.

*   **[✅] Update `VantaSecretsAPI` in `cli_enhanced.py`:**
    *   Add `generate_vault_token(payload: Dict) -> Dict` method for `POST /api/v1/vault/tokens/generate`.
    *   Add `get_vault_secret(environment: str, key_name: str, token: str) -> Dict` method for `GET /api/v1/vault/{environment}/{key_name}` with Bearer token auth.
    *   Refactor `_make_request` for flexibility with base URLs, methods (GET/POST), and headers.
*   **[✅] Implement CLI `token generate` command:**
    *   Utilize `VantaSecretsAPI.generate_vault_token` for actual token generation.
    *   Handle API responses and errors.
*   **[✅] Implement CLI `run-with-secrets` command:**
    *   Utilize `VantaSecretsAPI.generate_vault_token` to create a short-lived operational token.
    *   Utilize `VantaSecretsAPI.get_vault_secret` to fetch individual secrets using the operational token.
    *   Handle secret injection (env, file) and subprocess execution.
    *   **Note:** Current implementation for wildcard `key_pattern` fetching is simulated due to lack of an API endpoint to list keys by pattern. Full implementation requires API enhancement or advanced client-side strategy.
*   **[✅] Implement SOPS Integration in `VaultAccessAgent.py`:** Placeholder `_fetch_and_decrypt_secret` replaced with actual SOPS decryption logic using `subprocess`.
*   **[✅] Secure Configuration:** Implemented secure management for JWT secret keys (`VANTA_JWT_SECRET_KEY` env var) and SOPS base path (`VANTA_SOPS_FILES_PATH` env var) in `VaultTokenAgent.py`, `TokenValidator.py`, and `app/api/v1/vault/routes.py`.
*   **[✅] Comprehensive Testing:** Initial unit, integration, and CLI tests created in `tests/test_phase6_vault_access.py` as per `tests/docs/test_plan_vault_access.md` for Phase 5 features. (Test file name `test_phase6_vault_access.py` kept for now).

**Status: PHASE_5_VAULT_ACCESS_AGENT_IMPLEMENTED ✅**

## Phase 6: MCP Bridge Integration - Cross-Platform Tool Orchestration

**Objective:** Integrate Master Control Program (MCP) Bridge capabilities into the VANTA Secrets Agent to enable seamless communication with external tool orchestration platforms across all interfaces.

### 🔍 Discovery Complete ✅ - MAJOR BREAKTHROUGH
*   **[✅] MCP Discovery Scan:** Found 28 projects with MCP content across 81 projects in pinokio/api
*   **[✅] Additional Discovery:** FamilyDocRepo scan revealed complete MCP Bridge implementation guide
*   **[✅] GAME CHANGER:** Found complete architectural documentation in `C:\FamilyDocRepo\docs\integrations\mcp_bridge.md`
*   **[✅] High-Priority Assets Identified:** 10 projects with substantial MCP implementations
    *   **FamilyDocRepo MCP Bridge** (107 refs) - **COMPLETE IMPLEMENTATION GUIDE** ⭐⭐⭐⭐⭐
    *   **My supertookit MCP server** (1,923 refs) - Complete server implementation
    *   **awesome-mcp-servers** (1,903 refs) - Comprehensive catalog of 100+ servers
    *   **Vanta-Chat** (67 refs) - React MCP Tools Panel component
    *   **Librechat** (34 refs) - Production YAML configuration patterns
*   **[✅] Complete Architecture Documented:** MCPBridgeCore, MCPBridgeAgent, configuration patterns
*   **[✅] Implementation Timeline Revised:** From 8-10 weeks to 3-4 weeks with 90% code reuse
*   **[✅] Comprehensive Findings:** `docs/MCP_DISCOVERY_COMPLETE_FINDINGS.md` created

### Core Infrastructure
*   **[📋 TODO] Extend `AgentBridgeService.ts` with MCP capabilities:**
    *   Add `MCPEndpointConfig`, `MCPToolDefinition`, `MCPExecutionResult`, and `MCPOperationStatus` interfaces.
    *   Implement `registerMCPEndpoint()`, `listMCPBridges()`, `listMCPTools()`, and `executeMCPTool()` methods.
    *   Add async operation tracking with `getMCPOperationStatus()`.
    *   Integrate with existing KEB event system for MCP operation observability.
*   **[📋 TODO] Add MCP command group to `cli.py`:**
    *   Implement `mcp list-bridges`, `mcp list-tools`, `mcp execute`, and `mcp test-connection` commands.
    *   Add exponential backoff with jitter for HTTP requests.
    *   Integrate with existing secret management for MCP authentication.
*   **[📋 TODO] Create `config/mcp_bridges.yaml` configuration:**
    *   Define bridge configurations for OpenAI, Anthropic, Gemini, Ollama, LM Studio, Supabase, PostgreSQL.
    *   Include retry configurations, timeouts, and security settings.
    *   Support for enabled/disabled bridge management.

### API Endpoints
*   **[📋 TODO] Implement `/api/v1/mcp/bridges` endpoint:**
    *   List available MCP bridges with their configurations.
*   **[📋 TODO] Implement `/api/v1/mcp/[bridge]/tools` endpoint:**
    *   List available tools from a specific MCP bridge.
    *   Support category filtering via query parameters.
*   **[📋 TODO] Implement `/api/v1/mcp/[bridge]/execute` endpoint:**
    *   Execute tools via MCP bridge with structured responses.
    *   Support both synchronous and asynchronous execution.
*   **[📋 TODO] Implement `/api/v1/mcp/operations/[operationId]` endpoint:**
    *   Track status of async MCP operations.

### VS Code Extension Integration
*   **[📋 TODO] Create `extension_api/vscode/src/commands/mcpCommands.ts`:**
    *   Implement `vanta.mcp.listBridges`, `vanta.mcp.listTools`, `vanta.mcp.executeTool` commands.
    *   Add `vanta.mcp.quickOpenAI` for rapid AI text generation.
    *   Implement `vanta.mcp.testConnection` for bridge connectivity testing.
    *   Provide rich UI with bridge/tool selection, parameter input, and result display.
*   **[📋 TODO] Update VS Code extension `package.json`:**
    *   Add MCP command definitions and keybindings.
    *   Include MCP-related configuration settings.

### Windows GUI Integration
*   **[📋 TODO] Add MCP tab to `windows_gui_enhanced.py`:**
    *   Bridge selection with connection testing.
    *   Tools list with category grouping and refresh functionality.
    *   Tool execution interface with parameter input and async options.
    *   Results display with save/clear functionality.
    *   Integration with existing CLI commands for MCP operations.

### Security & Configuration
*   **[📋 TODO] Integrate MCP authentication with VANTA secret management:**
    *   Store API keys in SOPS-encrypted vault.
    *   Support multiple authentication types (Bearer, API Key, Basic, None).
*   **[📋 TODO] Implement comprehensive error handling:**
    *   Structured error responses with user-friendly messages.
    *   Retry logic with exponential backoff for transient failures.
    *   Timeout management and connection validation.

### Testing & Documentation
*   **[📋 TODO] Create comprehensive test suite:**
    *   Unit tests for `AgentBridgeService` MCP methods.
    *   Integration tests for API endpoints.
    *   CLI command testing with mocked MCP responses.
    *   VS Code extension command testing.
*   **[📋 TODO] Update documentation:**
    *   Add MCP Bridge section to main README.
    *   Create MCP Bridge usage guide.
    *   Update CLI usage documentation.
    *   Add VS Code extension MCP commands documentation.

**Status: PHASE_6_MCP_BRIDGE_INTEGRATION_DISCOVERY_COMPLETE ✅ | IMPLEMENTATION_READY 📋**

---

**Overall Feature Parity MVP Status: COMPLETE**
All planned enhancements for CLI, VS Code Extension, and Windows GUI to achieve initial feature parity with the core web application functionalities have been implemented and documented. Phase 6 represents the next evolution of the platform with advanced tool orchestration capabilities. 