# Cursor Directive Reference: Layer 3 Kickoff (CLI + API Interface)

This document provides the canonical directive format for instructing Cursor AI / Vanta! Coder to initiate the implementation of Layer 3: VANTA CLI / API Interface.

**Prerequisite:** Layer 2 (Cascade Swarm Activation) MUST be complete and validated.

## Directive Template

```markdown
@Vanta! Coder

CORE_CONTEXT:
  - blueprint.yaml
  - THEPLAN.md
  - VANTA_Completion_Roadmap.md
  - vanta_agentic_status.yaml
  - logs/agentic_replay.log.jsonl
  - .cursor/rules/index.mdc
  - .cursor/rules/930-layer3-cli-api-activation.mdc # Include the activation protocol
  - .cursor/rules/924-cascade-executor.mdc
  - .cursor/rules/921-vanta-mcp-signal-schema.mdc
  - vanta_seed/core/vanta_master_core.py
  - vanta_seed/core/cascade_executor.py
  - vanta_seed/api/ # For existing API structure
  - cli.py # Or root script for CLI

TASK_FILES:
  - cli.py # Or equivalent main CLI entry point
  - vanta_seed/api/main.py # Or equivalent main API entry point (e.g., FastAPI)
  - vanta_seed/core/vanta_master_core.py # To expose control methods
  - vanta_seed/utils/cli_handler.py # New utility
  - vanta_seed/utils/api_handler.py # New utility
  - tests/test_cli.py
  - tests/test_api.py

TASK:
  [Layer 3 Kickoff → Implement VANTA CLI & API Interface]

  Implement the foundational command-line and API interfaces for VANTA, enabling external control and interaction, adhering strictly to `.cursor/rules/930-layer3-cli-api-activation.mdc`.

  1.  **CLI Implementation (`cli.py`, `vanta_seed/utils/cli_handler.py`):
      *   Use `typer` or `argparse` for robust command parsing.
      *   Implement commands for:
          *   Triggering specific rituals (`vanta ritual run <ritual_name> [params]`).
          *   Triggering specific cascades (`vanta cascade run <cascade_id> [params]`).
          *   Querying agent status (`vanta agent status [agent_id]`).
          *   Viewing recent agentic logs (`vanta logs tail [n]`).
      *   CLI commands should interact with `VantaMasterCore` (potentially via a dedicated interface method) to execute actions.
      *   Ensure clear help messages and user-friendly output.

  2.  **API Implementation (`vanta_seed/api/main.py`, `vanta_seed/utils/api_handler.py`):
      *   Use `FastAPI` for the REST API framework.
      *   Implement endpoints mirroring CLI functionality:
          *   `POST /rituals/{ritual_name}/run`
          *   `POST /cascades/{cascade_id}/run`
          *   `GET /agents/{agent_id}/status`
          *   `GET /logs`
      *   Use Pydantic models for request/response validation.
      *   API handlers should interact with `VantaMasterCore`.
      *   Implement basic error handling and appropriate HTTP status codes.

  3.  **Core Integration (`vanta_seed/core/vanta_master_core.py`):
      *   Expose necessary methods for CLI/API handlers to safely interact with the core (e.g., `trigger_ritual_by_name`, `trigger_cascade_by_id`, `get_agent_status`, `get_recent_logs`).

  4.  **Testing (`tests/`):
      *   Add basic unit/integration tests for CLI commands.
      *   Add basic integration tests for API endpoints using `httpx`.

  5.  **Documentation & Validation:**
      *   Update relevant documentation (`README.md`, `docs/layer3_cli_api_overview.md`).
      *   Commit changes and ensure they pass the Agentic Build and Validate CI workflow.

>> Apply full Vanta! Coder agentic protocol (System Architect Mode, Interface Design, RL Logging). Ensure secure, robust, and user-friendly interfaces.
```

## Purpose

This directive initiates the development of external interfaces, making the VANTA system controllable and observable from outside the core Python runtime. This is essential for self-hosting, integration with other systems, and providing user control.

## Usage

Copy and paste the directive template above into the Cursor AI chat interface **after** Layer 2 (Cascade Executor Integration) is complete and validated. 