# Secrets Agent – Windows App UI / UX Plan

## 🪟 Platform Goals
- Native-feeling experience (WinUI + Electron parity)
- Symbolic integrity preserved: glyphs, dark mode, mesh diagrams
- CLI and mobile parity via embedded terminal + resizable panes

## 🧭 Layout

### 1. **Left Navigation Bar**
- Glyph icons (Home, Projects, Tools, Mesh, Collapse Log)
- Hover label popups
- Animated active state

### 2. **Main Panel Views**

#### a. Dashboard
- System status: Agent bound, Last collapse, Current .env
- Recent activity feed

#### b. Project Scan
- Select folder or file
- Live display of extracted env vars + tool references
- [Scan] and [Resolve] buttons

#### c. Tool Registry
- Table view with filter
- Columns: Tool name, version, agent, status
- Dropdown for assign / upgrade

#### d. Collapse Log Viewer
- Mermaid preview
- Collapse status timeline
- Filter by status (Δ, SYMBOLIC_SUCCESS, etc.)

#### e. Mesh Diagram
- Node-link graph of agent/tool/project bindings
- Zoom / pan support
- Tooltip overlays and click-to-drill

## 🎨 Visual Design

- Theme: Cyber minimal
- Accent: #2dd4bf (cyan) + #f472b6 (error)
- Monospaced headers, translucent panels
- Symbol-based transitions

## 🧠 Additional Features
- Embedded terminal (optional)
- CLI sync via `vanta.exe` or WSL shell
- Drag + drop project folders
- Global hotkey scan trigger