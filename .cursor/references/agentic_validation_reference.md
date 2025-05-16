# Agentic Validation Reference

This document serves as a reference for agents interacting with or relying on the **Agentic Build and Validate Ritual**.

## Core Components

-   **Workflow Definition:** `.github/workflows/validate_agentic_commit.yml`
-   **Standard Definition:** `.cursor/rules/923-agentic-build-validate.mdc`
-   **Ritual Binder:** `.cursor/rituals/agentic_build_validate.yaml`
-   **Validation Scripts:** Located in `scripts/`
    -   `validate_json_schemas.py`
    -   `validate_mdc_rules.py`
    -   `validate_agents.py`
-   **Documentation:** `docs/README-validator.md`

## Agent Interactions

### Triggering Validation

Agents can request a pre-flight validation check before attempting a push or creating a pull request by emitting an MCP signal or directly invoking the ritual (if using an orchestrator that supports it).

**Example Signal (Conceptual):**
```json
{
  "intent": "request_pre_merge_validation",
  "target_branch": "main",
  "source_branch": "feature/agent-x-refactor",
  "commit_sha": "abcdef12345"
}
```

### Interpreting Validation Results

Agents monitoring the system (e.g., via MCP signals or log analysis) can expect the following outcomes from the ritual:

-   **`validation_complete` signal with `status: "success"`:** Indicates all checks passed. The associated commit/branch is considered valid according to the defined standards.
-   **`validation_complete` signal with `status: "failure"`:** Indicates one or more checks failed. The `reason` field may contain details. Agents should typically halt operations like automated merging or deployment based on this signal.
-   **Agentic Replay Log:** Detailed step-by-step success or failure logs should be present in `logs/agentic_replay.log.jsonl` if the ritual executor is configured for this.

### Self-Checking / Pre-computation

Agents *generating* code, schemas, or rules can proactively run the relevant validation script locally *before* finalizing their output. This reduces the likelihood of CI failures.

-   **Generating Schemas:** Run `python scripts/validate_json_schemas.py` on the proposed schema.
-   **Generating MDC Rules:** Run `python scripts/validate_mdc_rules.py` on the proposed `.mdc` file.
-   **Generating Agent Code:** Run `python scripts/validate_agents.py` on the generated agent file (requires `BaseAgent` importability).

## Compliance

All agents performing code modifications, configuration changes, or rule updates MUST ensure their outputs are compatible with this validation ritual. Failure to pass validation will block integration into primary branches. 