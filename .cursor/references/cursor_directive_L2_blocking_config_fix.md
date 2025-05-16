# Ritual Directive: Layer 2 Finalization - Blocking Config Fix Pack

**Directive ID:** L2_BCF_001
**Date Issued:** {{CURRENT_DATE}}
**Issued By:** VANTA Assistant (on behalf of User)
**Status:** ACTIVE

## 1. Purpose

This directive outlines the immediate actions required to resolve critical configuration-related `AttributeError`s preventing the successful initialization of `VantaMasterCore` and blocking Layer 2 test validation.

## 2. Context & Trigger

This directive is triggered by `pytest` failures during `VantaMasterCore` instantiation, specifically:
- `AttributeError: module 'vanta_seed.config' has no attribute 'BASE_DIR'`
- `AttributeError: 'BlueprintConfig' object has no attribute 'initial_purpose_vector'`

These errors halt the test ritual and prevent Layer 2 finalization.

## 3. Ritual Steps

### Step 3.1: Create/Update `vanta_seed/config.py`
- **Action:** Ensure `vanta_seed/config.py` exists and defines `BASE_DIR`.
- **Implementation:**
  ```python
  # vanta_seed/config.py
  from pathlib import Path

  # This should point to the root of your VANTA project.
  # If config.py is in vanta_seed/, then .parent.parent goes up two levels to the project root.
  BASE_DIR = Path(__file__).resolve().parent.parent
  
  # Add other global configurations as needed.
  ```
- **Verification:** Confirm `VantaMasterCore` can import `config` and access `config.BASE_DIR` without error.

### Step 3.2: Update `blueprint.yaml`
- **Action:** Add the `initial_purpose_vector` field to the top level of `blueprint.yaml`.
- **Implementation (in `blueprint.yaml`):
  ```yaml
  # VANTA MODULAR AGENTIC FRAMEWORK — BLUEPRINT
  version: "0.2.0"
  description: "VANTA Seed Agentic Swarm Blueprint"
  initial_purpose_vector: "To execute and orchestrate VANTA cascades." # Or other suitable default
  
  agents:
    # ... rest of agent definitions
  ```
- **Verification:** Confirm `VantaMasterCore` can access `self.core_config.initial_purpose_vector` without error.

### Step 3.3: (Optional but Recommended) Refactor `_initialize_purpose_vector`
- **Action:** Modify `VantaMasterCore._initialize_purpose_vector()` to gracefully handle a missing `initial_purpose_vector` in `BlueprintConfig`.
- **Implementation (in `vanta_seed/core/vanta_master_core.py`):
  ```python
  def _initialize_purpose_vector(self):
      if self.core_config and hasattr(self.core_config, "initial_purpose_vector") and self.core_config.initial_purpose_vector:
          self.purpose_vector_active = str(self.core_config.initial_purpose_vector)
          self.log_operational(f"Crown: Initial purpose vector set: '{self.purpose_vector_active}'")
      else:
          self.purpose_vector_active = "Default VANTA operational purpose: Orchestrate and adapt." # Or some other default
          self.log_operational(
              "Crown: No initial_purpose_vector in config or it's empty. Using default.",
              level="warning" # Changed to warning
          )
  ```
- **Note:** This makes the system more resilient to incomplete `blueprint.yaml` configurations in the future.

### Step 3.4: Re-run Test Ritual
- **Action:** Execute the `pytest` command to validate `test_cascade_execution.py`.
- **Command (PowerShell):
  ```powershell
  $env:PYTHONPATH = "." # If not already set in session
  pytest tests/core/test_cascade_execution.py -v
  ```
- **Verification:** The test should proceed past `VantaMasterCore` initialization without the previously noted `AttributeError`s.

### Step 3.5: Commit & Push
- **Action:** If verification passes, commit all changes with a clear message referencing this directive.
- **Example Commit Message:** `fix(core): Resolve VMC init blockers for BASE_DIR and initial_purpose_vector (L2_BCF_001)`
- **Action:** Push changes and validate through CI to finalize Layer 2.

## 4. Completion Criteria
- `vanta_seed/config.py` defines `BASE_DIR`.
- `blueprint.yaml` includes `initial_purpose_vector`.
- `VantaMasterCore` initializes without `AttributeError`s related to these configurations.
- `tests/core/test_cascade_execution.py` proceeds past the fixture setup.
- Changes are committed, pushed, and CI validated.

---
**End of Directive Content** 