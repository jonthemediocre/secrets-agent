# VANTA Secrets Agent - VS Code Extension

[![Version](https://img.shields.io/visual-studio-marketplace/v/Vanta.vanta-secrets-agent?style=flat-square&label=Marketplace)](https://marketplace.visualstudio.com/items?itemName=Vanta.vanta-secrets-agent)
[![Installs](https://img.shields.io/visual-studio-marketplace/i/Vanta.vanta-secrets-agent?style=flat-square)](https://marketplace.visualstudio.com/items?itemName=Vanta.vanta-secrets-agent)

**Secure and manage your secrets with AI-powered insights, directly within VS Code.**

VANTA Secrets Agent brings the power of the VANTA platform to your favorite editor, enabling seamless secret scanning, detection, rotation, and status monitoring across your projects.

## Features

*   **Project Scanning:** Automatically scan your workspace for VANTA-managed projects or initialize new ones.
*   **Secret Detection:** Identify potential secrets and vulnerabilities within your codebase.
*   **Secret Export/Import:** Securely manage your secrets by exporting them for backup or importing them into new environments.
*   **Secret Rotation:** Initiate secret rotation workflows directly from VS Code.
*   **Real-time Status:** Monitor the health and status of your secrets and VANTA services.
*   **Contextual Actions:** Perform VANTA operations through dedicated Tree View explorers and command palette actions.
*   **Notifications:** Receive timely updates and alerts regarding your secrets.
*   **Comprehensive Help & Documentation:** Access guides and documentation directly within the IDE.

## Prerequisites

*   An active VANTA account and API key.
*   The VANTA API service must be running and accessible.

## Installation

1.  Open **VS Code**.
2.  Go to the **Extensions** view (Ctrl+Shift+X or Cmd+Shift+X).
3.  Search for `VANTA Secrets Agent`.
4.  Click **Install**.
5.  Once installed, open the command palette (Ctrl+Shift+P or Cmd+Shift+P) and run `VANTA: Configure Settings` to enter your API key and service URL.

## Usage

Once configured, the VANTA Secrets Agent extension will activate when a known VANTA project is opened or when you manually trigger a scan.

### Activity Bar Icon

Look for the VANTA icon in the Activity Bar. Clicking it will reveal the VANTA Secrets Agent views:

*   **Projects Explorer:** Lists detected VANTA projects in your workspace. Right-click for project-specific actions like `Scan Project` or `Export Secrets`.
*   **Secrets Explorer:** Displays identified secrets within the active project, along with their status. Actions like `Rotate Secret` may be available.
*   **Status View:** Shows the overall status of the VANTA services and any important notifications.

### Command Palette (Ctrl+Shift+P or Cmd+Shift+P)

Access VANTA commands by typing `VANTA:`:

*   `VANTA: Scan Workspace for Projects`: Scans the current workspace to identify VANTA projects.
*   `VANTA: Scan Current Project for Secrets`: Performs a deep scan of the currently active project.
*   `VANTA: Export Secrets for Current Project`: Initiates the secret export process.
*   `VANTA: Rotate Secret...`: Guides you through rotating a selected secret.
*   `VANTA: Show VANTA Status`: Opens the VANTA Status view.
*   `VANTA: Show Help and Documentation`: Opens this guide and other help resources.
*   `VANTA: Configure Settings`: Allows you to update your API key and service URL.

### Configuration

Access extension settings via VS Code settings (File > Preferences > Settings, then search for `VANTA`).

*   `vanta.apiKey`: Your VANTA API key.
*   `vanta.serviceUrl`: The URL of your VANTA API service.
*   `vanta.notifications.enabled`: Enable or disable VANTA notifications.

## Contributing

This extension is part of the VANTA Secrets Agent ecosystem. For contributions, please refer to the main project repository and its contribution guidelines.

## Support

If you encounter any issues or have feature requests, please raise an issue on the project's GitHub repository or contact VANTA support.

## License

[Specify License Here - e.g., MIT License] 