# PLAN-KEB-PILOT-AGENTS: Kernel Event Bus Pilot Agents

**Date:** 2023-10-05

## Purpose

Define and scope the initial pilot agents that will integrate with the Kernel Event Bus (KEB) in VantaMasterCore. These pilot agents will serve as reference implementations, validating event schemas, subscription patterns, and operational workflows.

## Pilot Agents

### DataUnifierAgent
- **Role:** Consolidates and normalizes data from multiple sources in response to upstream task events.
- **Subscriptions:** `task_events` stream (e.g., `TaskAssignedEvent`, `TaskCompletionEvent`).
- **Publications:** `data_unification_events` stream (e.g., `DataUnifiedEvent`).
- **Responsibilities:**
  - Listen for tasks that require data aggregation (e.g., combining secret metadata, environment variables).
  - Apply deterministic transformation rules and emit unified data payloads.
  - Correlate events via `correlation_id` to track multi-step workflows.

### CollapseMonitorAgent
- **Role:** Monitors system-level state changes and triggers collapse detection/notification workflows.
- **Subscriptions:** `system_events` stream (e.g., `SystemHealthReportedEvent`, `SystemErrorEvent`).
- **Publications:** `collapse_events` stream (e.g., `CollapseDetectedEvent`).
- **Responsibilities:**
  - Evaluate incoming system health metrics and error patterns.
  - Detect threshold breaches or correlated failure events.
  - Emit `CollapseDetectedEvent` with diagnostic payload.

## Next Steps
- Draft and review detailed integration scenarios for each pilot agent.
- Implement minimal agent scaffolding in codebase (`.cursor/agents/data_unifier_agent.py`, `.cursor/agents/collapse_monitor_agent.py`).
- Validate end-to-end flow using test harness and local KEB broker.