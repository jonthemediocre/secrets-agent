# UAP Framework – Symbolic Agent Stack (V3.1)

## 🔺 Overview
The Universal Agent Protocol (UAP) is a symbolic, recursive, and rule-governed framework for defining intelligent agents.

- Agent definitions live in `.uap.yaml` files (YAML = human-first)
- Execution logic lives in Python (`UAPAgent.py`)
- Agents are governed by `ruleΣ.yaml`, and structured by indexes
- Swarm intelligence, ritual chaining, and symbolic collapse are core

---

## 🔖 Core File Types

| File | Description |
|------|-------------|
| `*.uap.yaml` | Main agent contract (roles, purpose, triggers) |
| `ritual_flow.yaml` | Chained steps (like LangChain LCEL) |
| `ruleΣ.runtime.yaml` | Rules governing agents |
| `agent_index.yaml` | Known agents, trust, fallback |
| `tool.vault.yaml` | Whitelisted tools and access scope |
| `vector_index` | Vector memory store for search and reflection |

---

## 🐍 Runtime Execution

```bash
python runners/uap_runner.py agents/sample_agent.uap.yaml
```

---

## 🧠 Role Summary

- **Planner (Cube)**: Sets structure, boundaries
- **Executor (Dodecahedron)**: Runs steps, explores options
- **Collapser (Star Tetrahedron)**: Chooses best result, finishes task

---

## 🧬 Swarm Support

Agents may coordinate using:
- `swarm_role_matrix.yaml`
- `ritual_fusion.yaml`
- `SwarmControllerAgent.uap.yaml`

