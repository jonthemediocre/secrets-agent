---
last_updated: 2024-07-16 12:00:00
completion_percentage: 32.58% # Recalculated based on [X], [>], [-], [ ]
---

# ✅ TODO.md - Secrets Agent Action Items

## 🎯 Immediate Priorities (Phase 2 Kickoff)

- [X] **P1: Implement `VaultAgent.test.ts` - Fully Mocked SOPS Test Harness**
    - [X] Define mock strategies for `child_process.exec` (to simulate `sops` CLI).
    - [X] Prepare/generate mock encrypted fixture data.
    - [X] Test `loadVault()` scenarios: file not found, empty file, valid encrypted file, corrupted data after decryption, sops CLI errors.
    - [X] Test `saveVault()` scenarios: successful encryption, sops CLI errors during encryption/write.
    - [X] Verify core CRUD operations function correctly through the encrypted load/save cycle.

## 🔬 Kernel Event Bus (KEB) Integration (Phase 1 & 2)

- [X] **P_KEB_1: [KEB] Finalize and Approve KEB Design (`ADR-VMC-KEB-001`).** (Completed)
- [X] **P_KEB_2: [KEB] Select and document the chosen event broker technology.** (Completed: Redis Streams)
- [X] **P_KEB_3: [KEB] Draft initial v1 event schemas for core system interactions (Lifecycle, Tasking, Data).** (Completed: Schemas found in `event_schemas/`)
- [X] **P_KEB_4: [KEB] Develop PoC for event publishing/consuming library.** (Completed: `keb_client.py` implemented)
- [X] **P_KEB_5: [KEB] Complete VantaMasterCore KEB Integration.** (Completed)
- [>] **P_KEB_6: [KEB] Identify KEB Pilot Agents (`DataUnifierAgent`, `CollapseMonitorAgent`).** (Status: Significant Progress)
- [>] **P_KEB_7: [INFRA] Plan KEB Infrastructure (Redis Streams event broker deployment & management).** (Status: Significant Progress)
- [X] **P_KEB_8: [GOVERNANCE] Establish KEB Event Governance (`.cursor/rules/101-event-governance.mdc`).** (Completed)

## 🚀 Near-Term Goals (Phase 2 Core Features)

- [!] **P2.1: Implement `EnvParser.ts` utility and tests.** (User provided, assumed complete)
- [!] **P2.2: Enhance `VaultAgent.ts` with `.env` import/export skeletal methods.** (User provided, assumed complete)
- [>] **P2.3: UI Component `EnvManagerPanel.tsx` - Implement the panel for `.env` import/export. (Blocked by manual linter/tsconfig fixes)**
- [!] **P2.X: UI Component `AppLayout.tsx` - Drafted (New based on Vault UI inspiration)**
    - [!] Requires manual review & fix: Linter errors (TS DOM lib, `@heroicons/react` import, syntax in example code commenting).
- [-] P2.4: Test Suite - Create tests for `VaultAgent.ts` (`.env` logic) and `EnvManagerPanel.tsx`.
  - [X] `VaultAgent.env.test.ts` (Initial draft done)
  - [-] `EnvManagerPanel.test.tsx` (Initial draft done, blocked by manual linter/setup fixes)

- [ ] **P2: Full `.env` Import/Export Flow (UI & Logic) - *Partially Blocked***
    - [ ] Design UI for 3-step import: `scan local .env file -> preview/confirm mappings -> commit to vault` (Covered by `EnvManagerPanel.tsx`)
    - [ ] Implement backend logic for parsing `.env` files. (Covered by `EnvParser.ts` & `EnvManagerPanel.tsx` frontend logic)
    - [ ] Handle potential conflicts with existing secrets (overwrite, skip, rename options). (Conceptualized in `EnvManagerPanel.tsx`)
    - [ ] Design UI for export: `select project/category/secrets -> filter options -> redact toggle -> download .env`. (Covered by `EnvManagerPanel.tsx`)
    - [ ] Implement backend logic for generating `.env` file content from vault data. (Conceptualized in `EnvManagerPanel.tsx` frontend logic, `VaultAgent.ts` methods assumed)

- [ ] **P3: Secret Rotation Tracking & Reminders (Backend + Dashboard Prep)**
    - [ ] Update `SecretEntry` interface in `VaultTypes.ts`:
        - Add `rotationPolicy?: { intervalDays: number; autoRotateScript?: string; }`
        - Add `lastRotated?: string;` (ISO timestamp)
        - Add `nextRotationDue?: string;` (ISO timestamp, calculated or set)
    - [ ] Update `VaultAgent` CRUD methods (`addSecret`, `updateSecret`) to handle/calculate these fields.
    - [ ] Implement logic in `VaultAgent` (or a new `RotationManagerAgent`) to identify secrets due for rotation.
    - [ ] Prepare data structures/getters for the future `SecretsPanel.tsx` to display rotation warnings/status.

- [ ] **Per-Secret Access Logs (Auditing - Initial Implementation)**
    - [ ] Update `SecretEntry` to include `accessedAt?: string[];` (array of ISO timestamps).
    - [ ] Modify `VaultAgent.getSecret()` (and any other direct secret value access points) to log access timestamps.
    - [ ] Consider if/how to log access for export operations.
    - [ ] *Future: Explore separate `.vault.accesslog.yaml` for more detailed/performant logging.*

- [ ] **Environment Switching UX (Initial UI Stub)**
    *   Design basic UI element (e.g., dropdown) in `SecretsPanel.tsx` (when it exists) to select active environment (dev, stage, prod).
    *   `VaultAgent` already supports loading differently named files; this is about UI to control which one is loaded.
    *   Consider auto-detection POC (e.g., based on a project's root `.git/HEAD` or a special project marker file).

## 💡 Phase 3 & Visionary Threads (Backlog for now - For ThePlan.md)

*   Secret Suggestion via Code/README Scan (`SecretScaffoldAgent`)
*   Secrets Misuse Detection (Watchdog)
*   Multi-Key Sharing for Vaults (Age Recipients)
*   Vault Fingerprint Hashing (Integrity Check)
*   Per-Secret Access Control (Granular Permissions)
*   Secret History Timeline (Visual)
*   `.cursor rules MDC` system formalization & integration.
*   MCP Tool Repository as a Secure Vault (conceptual design).
*   A2A (Agent-to-Agent) Communication Standard & Manifest (spec design).

---

## 🚀 Addressing Competitive Gaps (Post-Phase 2 / Future Enhancements)

- [ ] **GAP-INT: Enhance Integration & Automation Capabilities**
    - [ ] Implement built-in scheduling for automatic secret rotation.
    - [ ] Investigate and design for multi-region replication of vault data.
    - [ ] Develop native CI/CD hooks and webhook notifications for secret changes.

- [ ] **GAP-LCM: Advanced Secret Lifecycle Management**
    - [ ] Introduce support for dynamic secrets and automated leasing/revocation.
    - [ ] Implement secret versioning with history and rollback capabilities.

- [ ] **GAP-SEC: Bolster Security & Compliance Features**
    - [ ] Explore options for managed HSM integration for key protection.
    - [ ] Pursue relevant compliance certifications (e.g., SOC 2) as the product matures.

- [ ] **GAP-DX: Improve Developer Experience & Tooling**
    - [ ] Develop a dedicated, feature-rich CLI for Secrets Agent.
    - [ ] Create SDKs for popular programming languages (e.g., Python, Node.js, Go).
    - [ ] Develop a Terraform provider for managing Secrets Agent resources as code.

- [ ] **GAP-OBS: Implement Observability & Auditing**
    - [ ] Integrate built-in, detailed audit logging for all secret access and modifications.
    - [ ] Develop an events dashboard or interface for viewing activity logs.

- [ ] **GAP-UI: Develop a Comprehensive Graphical User Interface**
    - [ ] Design and build a full-featured web console for all Secrets Agent functionalities.
    - [ ] Consider mobile/desktop clients for broader accessibility.

- [ ] **GAP-ECO: Expand Extensibility & Ecosystem Support**
    - [ ] Develop official providers/operators for popular IaC tools (e.g., Ansible, Kubernetes).
    - [ ] Foster a community plugin system.

- [ ] **GAP-BIZ: Define Pricing & Business Model**
    - [ ] Research and establish a clear pricing model for Secrets Agent.

---

## 🌌 Future Integrations & Ecosystem Alignment (Strategic Considerations)

These tasks relate to the long-term vision of integrating Secrets Agent with broader ecosystems, such as HashiCorp Vault, as outlined in `THEPLAN.md` under "External Ecosystem & Long-Term Integration Considerations".

- [ ] **INT-HCVAULT-API: Design API Connectors for HashiCorp Vault**
    - [ ] Research HashiCorp Vault API for secrets management.
    - [ ] Design `VaultAgent.ts` interfaces for potential interaction (read/write) with an external Vault.

- [ ] **INT-HCVAULT-MAP: Develop Path Mapping Logic for External Vaults**
    - [ ] Define strategies for mapping local project structures to Vault's hierarchical paths (e.g., `secrets/project_name/env/.env`).

- [ ] **INT-HCVAULT-AUTH: Investigate Authentication Mechanisms for External Vaults**
    - [ ] Research common authentication methods for HashiCorp Vault (tokens, AppRoles, etc.).
    - [ ] Outline how `VaultAgent.ts` might handle these authentication flows.

- [ ] **INT-META-SRC: Implement Source Tagging for Secrets**
    - [ ] Add `source?: string` or similar to `SecretEntry` type.
    - [ ] Update UI and import/export logic to support viewing/setting secret source (e.g., "github_import", "aws_sync", "manual_ui").

- [ ] **INT-META-DYN: Explore Dynamic Secret Engine Concepts**
    - [ ] Research use cases and models for dynamic/short-lived secrets.
    - [ ] Conceptualize how `SecretsAgent` might support or interact with such secrets.

- [ ] **INT-META-AUTHZ: Design Advanced Authorization & Audit Trails**
    - [ ] Define requirements for more granular internal authorization for secret access.
    - [ ] Design schema and mechanisms for detailed, identity-linked audit trails.

---

### P3: Secret Lifecycle Management - Rotation (Conceptual)
- [X] P3.1: Model `RotationPolicy.ts` - Define the structure for rotation policies. (Created)
- [>] P3.2: Agent `SecretRotatorAgent.ts` - Develop agent to perform secret rotation. (Drafted)
- [-] P3.3: Service `RotationSchedulerService.ts` - Manage and trigger rotation policies. (Drafted, blocked by `RotationPolicy.ts` property mismatches)
- [>] P3.4: API Endpoints - Expose policy management and manual rotation triggers. (Drafted)
- [>] P3.5: UI Components - Basic UI for managing rotation policies. (Drafted)
- [ ] P3.6: Test Suite - For rotation agents, services, and API endpoints.

---

## 🔥 **CODE AUDIT PRIORITY ACTIONS** (Added: 2025-01-23)

*High-value immediate improvements based on comprehensive codebase analysis*

### **🚨 CRITICAL - Phase 1 Fixes**

- [ ] **AUDIT-P1-TYPE: Fix TypeScript Compilation Issues**
    - [ ] Replace 174 `any` types with proper interfaces (target: <50 errors)
    - [ ] Priority files: `AuthAgent.ts`, `VaultAgent.ts`, `APIManagerAgent.ts`, API routes
    - [ ] Create missing type definitions for external dependencies
    - [ ] **Impact**: Eliminate runtime errors, improve IDE support, enable proper refactoring

- [ ] **AUDIT-P1-ARCH: Resolve Mixed Platform Architecture**
    - [ ] **Decision Required**: Choose React Native OR Web, not both
    - [ ] Separate build processes or consolidate platform approach
    - [ ] Update `package.json`, `tsconfig.json` configurations accordingly
    - [ ] **Impact**: Fix compilation conflicts, simplify deployment

- [ ] **AUDIT-P1-CLI: Bridge Python CLI with TypeScript Agents**
    - [ ] Create `AgentBridgeService.ts` to interface with existing Python CLI
    - [ ] Integrate `cli.py`, `secret_broker.py`, `env_scanner.py` functionality
    - [ ] Use KEB (Kernel Event Bus) for Python-TypeScript communication
    - [ ] **Value**: Leverage production-ready scanning and encryption logic

### **⚡ HIGH-VALUE - Phase 2 Enhancements**

- [ ] **AUDIT-P2-SCAFFOLD: Implement SecretScaffoldAgent**
    - [ ] Enhance `EnvFileParser.ts` with smart detection capabilities
    - [ ] Scan `.env.example`, `docker-compose.yml`, `README.md` for secret requirements
    - [ ] Auto-suggest missing secrets and generate secret schemas
    - [ ] Integrate with existing `env_scanner.py` logic via bridge service
    - [ ] **Value**: Automated secret discovery and project onboarding

- [ ] **AUDIT-P2-RULES: Create Rule Enforcement Engine**
    - [ ] Build `RuleEnforcementAgent.ts` to make `.cursor/rules/*.mdc` actionable
    - [ ] Implement policy validation for agent operations
    - [ ] Add compliance auditing and reporting capabilities
    - [ ] **Value**: Make extensive governance framework operational

- [ ] **AUDIT-P2-META: Enhanced Secret Metadata System**
    - [ ] Extend `SecretEntry` interface with comprehensive tracking:
        - `source` (manual/import/scan/rotation/external)
        - `accessHistory` with detailed audit trails
        - `integrity` with hash verification
        - `compliance` with data classification tags
    - [ ] Update `VaultAgent` to handle enhanced metadata
    - [ ] **Value**: Enterprise-grade auditing and compliance

- [ ] **AUDIT-P2-EVENTS: Event-Driven Secret Operations**
    - [ ] Emit KEB events for all `VaultAgent` CRUD operations
    - [ ] Implement event-based audit logging
    - [ ] Add real-time secret change notifications
    - [ ] **Value**: Decoupled, auditable secret lifecycle management

### **🎯 STRATEGIC - Phase 3 Capabilities**

- [ ] **AUDIT-P3-DYNAMIC: Dynamic Secret Engines**
    - [ ] Design `DynamicSecretEngine` interface for time-limited secrets
    - [ ] Implement database credential generation with TTL
    - [ ] Add API token rotation with lease management
    - [ ] **Competitive Value**: Match HashiCorp Vault capabilities

- [ ] **AUDIT-P3-ANALYTICS: Secret Graph Analytics**
    - [ ] Visualize secret dependencies across projects
    - [ ] Identify rotation impact and security hotspots
    - [ ] Detect unused or orphaned secrets
    - [ ] **Innovation Value**: Unique insight into secret ecosystem health

- [ ] **AUDIT-P3-ML: ML-Powered Secret Classification**
    - [ ] Auto-classify secrets by sensitivity and usage patterns
    - [ ] Automated compliance tagging and rotation scheduling
    - [ ] Anomaly detection for unusual secret access patterns
    - [ ] **Innovation Value**: Intelligent secret lifecycle management

### **📋 REFACTORING OPPORTUNITIES**

- [ ] **AUDIT-REF-UNUSED: Remove Underutilized Components**
    - [ ] Audit and cleanup unused Python scripts and utilities
    - [ ] Consolidate duplicate functionality between CLI and agents
    - [ ] Remove dead code and orphaned configuration files
    - [ ] **Value**: Simplified codebase, reduced maintenance burden

- [ ] **AUDIT-REF-TESTS: Complete Test Infrastructure**
    - [ ] Fix Jest configuration issues (40+ test errors)
    - [ ] Implement comprehensive test coverage for all agents
    - [ ] Add integration tests for agent communication via KEB
    - [ ] **Value**: Reliable development and deployment pipeline

- [ ] **AUDIT-REF-DOCS: Address Documentation Gaps**
    - [ ] Create agent communication protocol documentation
    - [ ] Document security threat model and mitigations
    - [ ] Add performance benchmarks and optimization guides
    - [ ] **Value**: Improved developer experience and maintenance

### **💡 INNOVATION IMPLEMENTATIONS**

- [ ] **AUDIT-INN-ZERO: Zero-Knowledge Secret Sharing**
    - [ ] Implement Age encryption with multiple recipients
    - [ ] Enable secure secret sharing without exposing values
    - [ ] Add team-based vault access with individual keys
    - [ ] **Value**: Enterprise team collaboration capabilities

- [ ] **AUDIT-INN-MANIFEST: Agent Capability Manifests**
    - [ ] Standardize `AgentManifest` interface across all agents
    - [ ] Implement capability discovery and dependency resolution
    - [ ] Add trust level validation for agent interactions
    - [ ] **Value**: Robust agent ecosystem with clear boundaries

*This TODO list should be updated as tasks are completed and priorities shift.* 