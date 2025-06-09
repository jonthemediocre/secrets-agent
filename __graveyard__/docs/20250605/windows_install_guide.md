# 🪟 Secrets Agent – Windows Installation & Launch Guide

## ✅ STEP 0: SYSTEM REQUIREMENTS

| Requirement         | Version           |
|---------------------|-------------------|
| OS                  | Windows 10 or 11  |
| Python              | 3.9+ (if using source) |
| Disk Space          | ~100MB            |
| Admin Access        | Optional (for global install) |

---

## 🧱 OPTION A: ONE-CLICK `.exe` INSTALLER *(No Python needed)*

1. 📥 Double-click `SecretsAgentSetup.exe`
    - Installs CLI to `C:\Program Files\SecretsAgent`
    - Adds `vanta.exe` to system `PATH`

2. 🟢 Open Command Prompt
```bash
vanta scan
vanta link
vanta scan-root --dir C:\Users\you\Projects
```

3. 📂 Optional GUI (if bundled)
    - Launch `SecretsAgent.exe` from desktop shortcut

---

## 🛠 OPTION B: DEVELOPER INSTALL (Python Zip Method)

1. 📦 Download and extract the SecretsAgent ZIP

2. 💻 Setup Python environment
```bash
cd SecretsAgent
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt
```

3. 🚀 Run CLI
```bash
python cli.py scan
python cli.py bootstrap
python secrets_watcher.py .
```

---

## 🧩 OPTIONAL

- Install CLI globally:
```bash
pip install pyinstaller
pyinstaller installer/vanta.spec
```

- Add `dist/vanta.exe` to your system PATH manually

---

## 🧭 RECOMMENDED FLOW

```bash
python secrets_agent_launch_wizard.py
python deploy_stack.py --config secrets_agent_launch_config.json
vanta scan-root --dir C:\Users\you\Code
python agent_core/delta_loop.py
```

---

## 🔐 Security & API

- Use `secrets_secure/encrypted_store.py` to encrypt keys
- Use `agent_core/router.py` to expose symbolic API
- VS Code Extension: `/extension_api/vscode/`