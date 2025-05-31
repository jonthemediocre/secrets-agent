# VANTA Secrets Agent - Windows GUI

This application provides a Windows Graphical User Interface for interacting with the VANTA Secrets Agent API. It aims to provide feature parity with the Web, CLI, and VS Code Extension interfaces.

## Features

*   **Project Management**: Scan and list projects managed by VANTA.
*   **Secret Management**: 
    *   View secrets within a selected project.
    *   Add new secrets.
    *   Edit existing secrets.
    *   Delete secrets.
    *   Rotate secrets.
    *   Export secrets for a project to a YAML file.
*   **System Status**: View the operational status of the VANTA Agent API.
*   **Configuration**: Configure the API base URL.
*   **Logging**: View application logs within the GUI.

## Prerequisites

*   Python 3.8+
*   VANTA Secrets Agent API running and accessible.

## Setup and Installation

1.  **Clone the repository (if applicable) or ensure you have the `windows_gui_enhanced.py` file and the `requirements_windows_gui.txt` file.**
    
2.  **Create a virtual environment (recommended):**
    ```bash
    python -m venv venv_gui
    source venv_gui/bin/activate  # On Windows: venv_gui\Scripts\activate
    ```

3.  **Install dependencies:**
    ```bash
    pip install -r requirements_windows_gui.txt
    ```

4.  **(Optional) Place an application icon `icon.png` in an `assets` directory next to `windows_gui_enhanced.py` if you want a custom icon.**

## Running the Application

Execute the main Python script:

```bash
python windows_gui_enhanced.py
```

## Development and Testing

Tests are located in the `tests/` directory and can be run using `pytest`:

1.  **Ensure test dependencies are installed (if any specific ones beyond main requirements):**
    ```bash
    # Typically pytest and its plugins are in requirements_dev.txt or similar
    pip install pytest pytest-qt unittest-mock # if not already covered
    ```

2.  **Run tests:**
    ```bash
    pytest tests/test_windows_gui_enhanced.py
    ```

## Configuration

The API base URL can be configured via the "File -> Configure" menu within the application. The default is `http://localhost:8000/api/v1`.

---

This GUI is part of the broader VANTA Secrets Agent ecosystem, designed for secure and efficient secret management across multiple platforms. 