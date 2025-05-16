#!/usr/bin/env python
import subprocess
import sys
import os
from pathlib import Path

# Determine the project root assuming this script is in .cursor/scheduler/
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SCRIPTS_DIR = PROJECT_ROOT / "scripts"

# Ensure the scripts directory is in the Python path to allow imports
# if the scripts are structured as modules, or prepare for subprocess calls.
# For simplicity with existing scripts, subprocess is more robust here.

VALIDATE_SCRIPT_PATH = SCRIPTS_DIR / "validate_mdc_rules.py"
FORMAT_SCRIPT_PATH = SCRIPTS_DIR / "format_mdc_rules.py"

def run_script(script_path, script_name):
    """Runs a given Python script using subprocess and prints its output."""
    if not script_path.exists():
        print(f"Error: {script_name} script not found at {script_path}", file=sys.stderr)
        return False

    try:
        print(f"Running {script_name}...")
        # Ensure the script is executable or called via python interpreter
        process = subprocess.run([sys.executable, str(script_path)], capture_output=True, text=True, check=False, cwd=PROJECT_ROOT)
        
        if process.stdout:
            print(f"Output from {script_name}:\n{process.stdout}")
        if process.stderr:
            print(f"Errors from {script_name}:\n{process.stderr}", file=sys.stderr)
        
        if process.returncode != 0:
            print(f"{script_name} failed with exit code {process.returncode}.", file=sys.stderr)
            return False
        print(f"{script_name} completed successfully.")
        return True
    except Exception as e:
        print(f"An exception occurred while running {script_name}: {e}", file=sys.stderr)
        return False

def main():
    """Main function to run all MDC maintenance tasks."""
    print("Starting MDC Rule Maintenance Ritual...")
    
    all_successful = True

    if not run_script(VALIDATE_SCRIPT_PATH, "MDC Rule Validation"):
        all_successful = False
        print("Validation step failed. Formatting will still be attempted.")

    # Optionally, only run formatting if validation is successful or based on a flag.
    # For now, running it regardless to ensure formatting is applied.
    if not run_script(FORMAT_SCRIPT_PATH, "MDC Rule Formatting"):
        all_successful = False

    if all_successful:
        print("MDC Rule Maintenance Ritual completed successfully.")
    else:
        print("MDC Rule Maintenance Ritual completed with one or more failures.", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main() 