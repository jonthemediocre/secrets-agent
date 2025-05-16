# Ritual Directive: Layer 2 Async Test Fixture Correction

**Directive ID:** L2_ATF_001
**Date Issued:** {{CURRENT_DATE}}
**Issued By:** VANTA Assistant (on behalf of User)
**Status:** ACTIVE

## 1. Purpose

This directive formalizes the ritual for correcting `AttributeError` issues in `pytest` tests that arise from improperly configured asynchronous fixtures, specifically when an `async_generator` object is yielded instead of the fully resolved fixture value.

## 2. Context & Trigger

This directive is triggered when:
- A `pytest` test using an `async def` fixture fails with an `AttributeError` indicating an attribute is not found on an `'async_generator'` object.
- A `PytestDeprecationWarning` or `PytestUnhandledCoroutineWarning` suggests issues with async fixture handling or missing `pytest-asyncio` decorators.
- The fixture is defined with `@pytest.fixture` instead of the correct `@pytest_asyncio.fixture`.

**Example Scenario:** A test receives `vanta_master_core_session` as an `async_generator` and `vmc.is_running` fails because `vmc` is not the `VantaMasterCore` instance.

## 3. Ritual Steps

### Step 3.1: Identify Incorrect Async Fixture
- **Action:** Locate the failing test and the associated `async def` fixture. Confirm it uses `@pytest.fixture` instead of `@pytest_asyncio.fixture`.
- **Example:**
    ```python
    # Incorrect
    @pytest.fixture(scope="session")
    async def my_async_resource_fixture(event_loop):
        # ... setup ...
        await resource.initialize()
        yield resource
        # ... teardown ...
    ```

### Step 3.2: Apply Correct Decorator & Ensure Await
- **Action:**
    1. Add `import pytest_asyncio` at the top of the test file if not present.
    2. Change the fixture decorator from `@pytest.fixture` to `@pytest_asyncio.fixture`.
    3. Ensure that any asynchronous setup within the fixture (e.g., `await resource.initialize()`) completes *before* the `yield` statement.
    4. **Optional but Recommended:** Add an assertion immediately before `yield` to verify the fixture resource is in the expected state.
- **Example (Corrected):**
    ```python
    import pytest_asyncio # Added

    @pytest_asyncio.fixture(scope="session") # Corrected
    async def my_async_resource_fixture(event_loop):
        # ... setup ...
        await resource.initialize()
        assert resource.is_ready, "Resource should be ready before yielding." # Optional assert
        yield resource
        # ... teardown ...
    ```

### Step 3.3: Verify Fix
- **Action:** Rerun the relevant `pytest` test suite.
- **Example:**
  ```powershell
  # PowerShell with PYTHONPATH set
  $env:PYTHONPATH = "." # If not already set in session
  pytest path/to/your/test_file.py -v
  ```

### Step 3.4: (Optional) Global Codemod for Proactive Fixing
- **Action:** To prevent similar issues in other async fixtures, consider running `codemod` to update all instances.
- **Prerequisite:** Ensure `codemod` is installed.
  ```powershell
  C:\"Program Files"\Python312\python.exe -m pip install codemod
  ```
- **Codemod Command Example (adapt scope as needed):**
  ```bash
  codemod --extensions py '@pytest.fixture(scope="session")' '@pytest_asyncio.fixture(scope="session")' ./tests
  codemod --extensions py '@pytest.fixture(scope="module")' '@pytest_asyncio.fixture(scope="module")' ./tests
  # Add for other scopes if used
  ```
- **Note:** Review changes made by `codemod` carefully.

### Step 3.5: Commit & Push
- **Action:** If verification passes, commit all changes with a clear message referencing this directive.
- **Example Commit Message:** `fix(tests): Correct async fixture setup for VMC session (L2_ATF_001)`
- **Action:** Push changes and validate through CI.

## 4. Completion Criteria
- The `AttributeError` related to the `async_generator` is resolved.
- The test correctly receives and uses the fully initialized asynchronous fixture.
- Relevant tests pass.
- Changes are committed, pushed, and CI validated.

## 5. Fallback
- If errors persist, ensure `pytest-asyncio` is correctly installed in the test environment.
- Double-check the internal logic of the fixture to confirm all necessary `await` calls are made before `yield`.

---
**End of Directive Content** 