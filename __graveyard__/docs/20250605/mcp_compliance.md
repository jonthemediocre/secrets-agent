# 🔐 Secrets Agent – MCP & A2A Compliance Manifest

---

## ✅ GOAL:
Ensure all environment variables accessed by AI agents or subprocesses:
- Are routed through a secure, encrypted accessor (`vanta.get`)
- Are policy-validated via Model-Command-Policy (MCP)
- Are never accessed from raw `.env` without agentic clearance

---

## 🧩 MCP Access Flow:

1. Model or tool requests key: `OPENAI_API_KEY`
2. `vanta_get.get("OPENAI_API_KEY")` is called
3. SecretsAgent checks:
    - 🔒 Encrypted storage (secrets.enc)
    - ✅ Role/collapse policy (if enabled)
4. ✅ If valid, returns secret value
5. ❌ If not validated, denies access

---

## 🔁 RUNTIME PATCH OPTION (Python only)

Use this early in your app:

```python
import vanta_get
vanta_get.patch_os_env()
```

This replaces all `os.getenv(...)` calls with secure, encrypted + validated lookups.

---

## 📁 Directory

- `secrets.enc` → AES encrypted vault
- `vanta_get.py` → Encrypted getter
- `mcp.yaml` (optional) → Role/key policy

---

## ✅ Fully Compliant With:

- MCP agent-to-agent traceability
- Zero-plain-text key exposure
- Collapse-logged secret access