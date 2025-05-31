# UAPAgentBase.py
# Abstract agent base class for executing .uap.yaml contracts

import yaml

class UAPAgentBase:
    def __init__(self, yaml_path):
        with open(yaml_path, 'r') as f:
            self.config = yaml.safe_load(f)
        self.title = self.config.get("title", "Unnamed Agent")
        self.roles = self.config.get("agent_roles", {})
        self.intent = self.config.get("symbolic_intent", {})

    def plan(self):
        print(f"[Planner] Defining boundaries for: {self.title}")

    def execute(self):
        print(f"[Executor] Taking action according to logic in: {self.title}")

    def collapse(self):
        print(f"[Collapser] Finalizing output for: {self.title}")

    def run(self):
        self.plan()
        self.execute()
        self.collapse()
