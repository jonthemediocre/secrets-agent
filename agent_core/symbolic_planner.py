# agent_core/symbolic_planner.py

def plan_next_collapse(project_state):
    # Placeholder: basic symbolic reflex logic
    if "RITUAL_BREAK" in project_state:
        return "trigger_test_runner"
    if "SYMBOLIC_SUCCESS" in project_state:
        return "build_docs"
    return "scan_and_link"