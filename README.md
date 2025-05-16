# Secrets Agent

Secrets Agent is a symbolic binding tool for AI, environments, tools, and recursive project scaffolding.
It binds `.env`, toolchains, and agent loops into one symbolic, glyph-driven CLI & web suite.

## Features
- Project scanner + symbolic rule matcher
- Auto-binding secrets and tools
- AI + CLI + Auth routing
- Collapse logs + agent loop
- Web + Windows + VS Code ready

## To Deploy
```bash
python deploy_stack.py --config secrets_agent_launch_config.json
```

## To Run API
```bash
python agent_core/router.py
```

## To Scan
```bash
vanta scan
vanta scan-root --dir ./Projects
```

## VS Code Extension
- Found in `/extension_api/vscode`