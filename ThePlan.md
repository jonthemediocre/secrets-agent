# 📜 THEPLAN.md — Secrets Agent Master Blueprint

---

## 🧬 Mission

Create a secure, agentic, and symbolic app that handles:
- AI API binding
- Secrets management
- CLI-first project scaffolding
- Encrypted runtime environment patching
- Full launch to production (web, desktop, VS Code)

---

## 🛠 Modules

- `cli.py`: Core command dispatcher
- `vanta_export.py`: Format-agnostic export tool
- `project_scanner.py`: Scans and applies `.rule.yaml` headers
- `encrypted_store.py`: Fernet-based vault
- `router.py`: Flask-based agent interface
- `windows_gui_launcher.py`: Visual interface for CLI control
- `test_runner.py`: Runs core symbolic ops

---

## 🎨 Branding

Reference: `BRAND_GUIDE.md`

Includes:
- Logos
- Hex colors
- Font use
- Voice & copy tone
- Splash art design rules

---

## 🖼 Visual Blueprints

- ✅ `windows_ui_mockup.png` — GUI layout
- ✅ `landing.json` — SEO + structured data
- ✅ `logo glyphs` — vector-based icons
- 🚧 Suggested: `ai_panel_mockup.png`, `collapse_log_chart.svg`

---

## 📦 Distributions

- Web via Netlify
- `.exe` for Windows
- VS Code extension
- Optional: Mobile wrapper

---

## 💳 Licensing

- Stripe webhook at `/webhook`
- Generates `license.json`
- CLI runs `vanta license check`

---

## 📅 Launch Flow

- Push GitHub repo
- Deploy with Netlify
- Run Stripe test checkout
- Publish to ProductHunt + IndieHackers

---

## 🚀 Core Technology Stack

This project acknowledges the **Enhanced AI Stack** outlined in `globalrules.md`. However, for the "Secrets Agent" application, the primary components will leverage a specific, established technology set focused on its core mission as a VS Code extension and Python-based backend.

**Current & Primary Stack for Secrets Agent:**

*   **VS Code Extension:**
    *   JavaScript (Node.js environment via VS Code API)
    *   VS Code API (`vscode`)
    *   `axios` for HTTP communication.
*   **Backend & CLI Tools:**
    *   Python
    *   Flask (for `router.py` - the agent/API interface)
    *   Fernet (for `encrypted_store.py` - cryptography)
    *   Standard Python libraries for core logic.
*   **Deployment:**
    *   VS Code Extension Marketplace
    *   Windows Executable (`.exe`)
    *   Netlify (for potential web-based documentation or supplementary tools)

**Integration with "Enhanced AI Stack" Components:**

While the full "Enhanced AI Stack" (e.g., Next.js, Prisma, Agentica) is not being implemented for the primary "Secrets Agent" components, this project **will integrate with the following specified AI components** from that stack:

*   **Cloud AI**: OpenAI and Claude APIs will be leveraged for advanced AI-driven features within the Secrets Agent (e.g., for future intelligent secret detection, analysis, or agentic capabilities built on top of the Python backend).

**Justification for Deviation:**

The "Secrets Agent" project has an established architecture tailored to its function as a developer tool integrated within VS Code and a supporting Python backend. The decision to utilize the current stack for its primary components is based on:
1.  **Fitness for Purpose:** The existing stack is well-suited for building a VS Code extension and a lightweight Python backend for secret management and CLI operations.
2.  **Development Velocity:** Leveraging the current stack allows for focused development on the core "Secrets Agent" functionalities.
3.  **Targeted AI Integration:** The primary AI value will be delivered through direct integration with Cloud AI APIs (OpenAI, Claude) for specific features, rather than requiring a full-stack web framework or a complex agent orchestration framework like Agentica for the core product at this stage.

This approach allows the "Secrets Agent" to meet its immediate goals effectively while strategically incorporating powerful AI capabilities. Future, separate web frontends or more complex agentic systems developed under the "MetaFabric" vision may fully adopt the "Enhanced AI Stack."

Any further significant deviations from this stated approach or the adoption of other components from the "Enhanced AI Stack" will be documented here and are subject to CoE review.