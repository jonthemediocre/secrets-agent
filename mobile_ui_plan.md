# Secrets Agent – Mobile UX/UI Plan (v1.2.8)

## App Identity
- Title: Secrets Agent
- Theme: Cyber-minimal, dark mode default
- Typography: Monospace + Lucide icons

## Core Screens

### 1. **Dashboard**
- Recent collapses
- Linked .env + tools
- Status: SYMBOLIC_SUCCESS / RITUAL_BREAK

### 2. **Project Scan**
- Scan Markdown, YAML, Codebase
- Display unresolved env vars + missing tools
- Button: [Resolve Now]

### 3. **Tool Linking**
- List of tools with version tags
- Tap to link / upgrade / edit metadata
- Icon + label + version dropdown

### 4. **Mesh Map**
- Visual overlay of agent/tool/project bindings
- Tapable nodes with modal info

### 5. **Collapse Log**
- Timeline view of collapses
- Tap to preview Mermaid output

## UX Style
- Primary Color: #2dd4bf (mint/cyan)
- Accent: Neon pink for errors
- Feedback: Toasts, haptic tap, status glyphs