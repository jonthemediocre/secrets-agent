## Secrets management

We use **SOPS** for encrypted template storage, **HashiCorp Vault** for secret storage, and **GitHub Actions** for CI.

### Prerequisites

Install required packages:

```bash
npm install --save js-yaml node-vault
npm install --save-dev ts-node @types/js-yaml @types/node-vault
```

### Usage

- Run `npm run preflight` to scan the repo and generate/update `.env.template` and encrypted `secrets.template.yaml`.
- Run `npm run rotate-secrets` to rotate secrets in Vault and update templates.

CI automatically runs on push to main and schedules weekly rotation via GitHub Actions.
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

# SOPS YAML Normalization & Test

## SOPS Normalization Scripts

Scripts are provided in `scripts/normalize/` to ensure `.sops.yaml` is always:
- UTF-8 (no BOM)
- LF line endings
- Spaces only (no tabs)

**Run the appropriate script for your OS before using SOPS if you encounter YAML errors.**

## SOPS Test File

A minimal `test.yaml` is included. To test SOPS encryption:

```sh
sops -e --in-place test.yaml
```

If this works, your `.sops.yaml` and environment are correctly configured.

## Troubleshooting
- If you get YAML unmarshal errors, run the normalization script for your platform.
- See `scripts/normalize/README.md` for details.