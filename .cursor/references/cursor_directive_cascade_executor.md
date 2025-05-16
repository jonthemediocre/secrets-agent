# Cursor Directive Reference: Cascade Executor Integration

This document provides the canonical directive format for instructing Cursor AI / Vanta! Coder to implement the `CascadeExecutor` integration with `VantaMasterCore`.

## Directive Template

```markdown
@Vanta! Coder

CORE_CONTEXT:
  - blueprint.yaml
  - THEPLAN.md
  - logs/agentic_replay.log.jsonl
  - .cursor/rules/100-vanta-coder-overlay.mdc
  - .cursor/rules/index.mdc
  - .cursor/rules/agent_cascade_definitions.mdc
  - .cursor/rules/924-cascade-executor.mdc
  - .cursor/rules/925-cascade-agent-swarm-activation.mdc # Include the activation protocol
  - .cursor/rules/921-vanta-mcp-signal-schema.mdc
  - .cursor/schemas/agentic_replay_log_entry.schema.json
  - vanta_seed/core/vanta_master_core.py
  - vanta_seed/core/cascade_executor.py

TASK_FILES:
  - vanta_seed/core/vanta_master_core.py
  - vanta_seed/core/cascade_executor.py
  - .cursor/rules/agent_cascade_definitions.mdc # For adding test cascade
  - tests/ # For adding integration tests

TASK:
  [Cascade Swarm Activation → Integrate CascadeExecutor into VantaMasterCore]

  Implement full Cascade Executor integration and bring agent cascade execution online, adhering strictly to `.cursor/rules/924-cascade-executor.mdc` and `.cursor/rules/925-cascade-agent-swarm-activation.mdc`.

  1. **Instantiate & Initialize:** Instantiate `CascadeExecutor` in `VantaMasterCore.__init__` (passing `self`).
  2. **Signal Handling:** Add logic to `VantaMasterCore` to detect cascade trigger signals and call `self.cascade_executor.trigger_cascade(...)`.
  3. **Sync Wrappers:** Implement `execute_agent_task_sync` and `execute_tool_calls_sync` in `VantaMasterCore` to synchronously execute steps and return results/status.
  4. **Executor Refinement:** Complete `CascadeExecutor.trigger_cascade` to use sync wrappers, handle results, implement `on_failure`, and log events according to the schema.
  5. **Test Cascade:** Define a simple test cascade (e.g., log -> agent task -> log) in `agent_cascade_definitions.mdc`.
  6. **Test Agent/Mock:** Ensure a simple agent or mock exists to test the agent task step.
  7. **Verification:** Add basic integration tests (`tests/`) to verify cascade triggering and execution via `VantaMasterCore`.
  8. **Commit & Validate:** Commit changes and ensure they pass the Agentic Build and Validate CI workflow.

>> Apply full Vanta! Coder agentic protocol (System Architect Mode, Cascade Swarm Bootstrap, RL Logging). Ensure all code meets quality standards (linting, typing) and logging conforms to `agentic_replay_log_entry.schema.json`.
```

## Purpose

This directive ensures that the AI assistant understands the specific requirements, context, and protocols involved in activating the cascade execution system. It links directly to the relevant MDC rules for enforcement and provides clear, actionable steps.

## Usage

Copy and paste the directive template above into the Cursor AI chat interface when initiating the implementation task for the Cascade Executor integration. 