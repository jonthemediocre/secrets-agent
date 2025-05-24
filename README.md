# 🔐 **Secrets Agent** – Smart Secret Management for Developers

![Secrets Agent Interface](https://img.shields.io/badge/Status-Production%20Ready-green?style=for-the-badge)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-000000?style=for-the-badge&logo=nextdotjs&logoColor=white)
![Python](https://img.shields.io/badge/Python-3776AB?style=for-the-badge&logo=python&logoColor=white)

## 🧭 **Purpose**

The Secrets Agent App is designed to **intelligently detect, extract, manage, and inject secrets across software projects** — reducing developer friction, improving security, and maintaining clean, environment-specific vaults.

Rather than relying on manual tracking or static `.env` files scattered across environments, Secrets Agent **automates the discovery, tagging, and access of secrets** by analyzing your codebase, project assets, and planning artifacts. It ensures every project has a clean, traceable, and secure vault — always ready and always in sync.

## 🚀 **Quick Start**

```bash
# Clone the repository
git clone <your-repo-url>
cd secrets-agent

# Install dependencies
npm install
pip install -r requirements.txt

# Start the development server
npm run dev

# Open browser to http://localhost:3000
```

## 🔍 **Key Features**

### 🔎 **1. Secrets Discovery & Inference**

* **Code Scanner:** Recursively scans your project files (e.g. `.ts`, `.py`, `.json`, `.yml`, etc.) for likely secret references (`API_KEY`, `DB_PASSWORD`, etc.).
* **ENV Extractor:** Parses `.env`, `.env.*`, and config files to auto-extract known secrets and store them in a unified vault.
* **Doc Intelligence:** Uses AI to infer secret needs from **README**, `ThePlan.md`, `todo.md`, or any structured planning document — even predicting unconfigured APIs or tools.

### 🧠 **2. Project-Aware Vaulting**

* Each project gets a **dedicated secrets vault**, tied to the project's folder structure, git repo, or UUID.
* Tracks `created`, `lastUsed`, and `lastUpdated` for each secret.
* Tags secrets by **tool**, **use-case**, and **runtime environment** (e.g. dev/staging/prod).

### 🔁 **3. Smart Sync & Suggestions**

* Automatically prompts you when:
  * A new secret is required based on API usage or planning content.
  * A stored secret has not been used recently.
  * A project references a key that hasn't been added to the vault yet.
* Suggests **naming conventions**, expiration policies, and safe usage patterns.

### 🔐 **4. Secure SOPS Integration**

* Uses [SOPS](https://github.com/getsops/sops) for encryption with `age` keys.
* Secrets are encrypted-at-rest and can be version-controlled safely (optional).
* Built-in support for loading and saving `.vault.yaml` files.

### 🧰 **5. Toolchain & API Integration**

* Easily inject secrets into builds, CI/CD, or local dev environments.
* Can export `.env` snapshots from the vault for tool-specific workflows (Docker, Vercel, Netlify, etc.).
* Future support for secrets rotation, expiration alerts, and vault syncing across teams.

## 📊 **Interface Features**

- **📈 Dashboard:** Real-time overview of scanned projects and detected secrets
- **🔍 Project Scanner:** Intelligent detection of secrets across your codebase
- **📋 Vault Management:** Organized, encrypted storage with project-specific vaults
- **🔄 Secret Rotation:** Automated rotation with configurable policies
- **⚙️ Configuration:** Easy setup for SOPS, encryption keys, and integrations

## 🧪 **Developer Experience (DX)**

* **Auto-detects and sets up a vault per project** on first scan.
* CLI and GUI interface options.
* Works with version control, and integrates with modern editors (via plugin or CLI sync).
* Built-in test coverage ensures every secret-handling feature is safe and reliable.

## 📁 **Project Structure**

```
secrets-agent/
├── app/                    # Next.js App Router pages
│   ├── api/               # API routes for scanning, vault ops
│   └── page.tsx           # Main dashboard interface
├── components/            # React components
├── scripts/              # Python automation scripts
│   ├── scan-all-projects.ts
│   ├── rotate-secrets.ts
│   └── setup-vault.py
├── vault/                # Vault management & types
├── vanta_seed/           # Core agent system
│   └── core/             # VANTA master orchestrator
└── docs/                 # Documentation
```

## 🔧 **Configuration**

### Environment Setup

Create a `.env.local` file:

```bash
# SOPS Configuration
SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt

# Vault Settings
VAULT_BASE_PATH=./vault
DEFAULT_ENCRYPTION_METHOD=age

# API Settings
OPENAI_API_KEY=your_openai_key_here  # For doc intelligence
```

### SOPS & Age Key Setup

```bash
# Install SOPS and age
brew install sops age  # macOS
# or
choco install sops age  # Windows

# Generate age key
age-keygen -o ~/.config/sops/age/keys.txt

# Configure SOPS
export SOPS_AGE_KEY_FILE=~/.config/sops/age/keys.txt
```

## 🎯 **Usage Examples**

### Scan Projects for Secrets

```bash
# Via API
curl http://localhost:3000/api/scan/projects

# Via Python script
python scripts/scan-all-projects.py --path /your/projects/directory
```

### Export Environment Variables

```bash
# Export .env for specific project
curl -X POST http://localhost:3000/api/env/export \
  -H "Content-Type: application/json" \
  -d '{"project_id": "my-project", "environment": "development"}'
```

### Rotate Secrets

```bash
# Rotate all expired secrets
python scripts/rotate-secrets.py --auto

# Rotate specific secret
python scripts/rotate-secrets.py --secret-id "api_key_123"
```

## 🎯 **Outcome**

With Secrets Agent, your projects will:

* Always have **accurate, ready-to-use secrets**.
* Avoid security leaks from stale or hardcoded secrets.
* Keep all sensitive values **centralized, encrypted, and organized**.
* Gain **AI-assisted awareness** of secret dependencies before runtime errors or breaches occur.

## 🛠️ **Technology Stack**

- **Frontend:** Next.js 14, React, TypeScript, Tailwind CSS
- **Backend:** Python, FastAPI, VANTA Agent Framework
- **Database:** SOPS-encrypted YAML vaults
- **Security:** Age encryption, SOPS integration
- **AI:** OpenAI API for document intelligence
- **Testing:** Jest, pytest, comprehensive test coverage

## 📈 **Roadmap**

- [ ] **Team Collaboration:** Share vaults across team members
- [ ] **CI/CD Integration:** GitHub Actions, GitLab CI templates
- [ ] **Cloud Sync:** Sync vaults across multiple machines
- [ ] **Advanced Rotation:** Custom rotation strategies per secret type
- [ ] **Audit Logging:** Complete audit trail for all secret operations
- [ ] **Browser Extension:** One-click secret injection for web development

## 🤝 **Contributing**

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 **License**

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🔐 **Security**

For security concerns or vulnerability reports, please email [security@your-domain.com] or open a confidential issue.

---

**Built with ❤️ for developers who value security and automation**