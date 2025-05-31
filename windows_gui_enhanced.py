import sys
import httpx
from PyQt6.QtWidgets import (
    QApplication, QMainWindow, QVBoxLayout, QHBoxLayout, QPushButton, 
    QWidget, QLabel, QLineEdit, QTextEdit, QListWidget, QListWidgetItem,
    QStatusBar, QMessageBox, QDialog, QFormLayout, QDialogButtonBox,
    QProgressBar, QTreeView, QMenu, QFileDialog, QSplitter, QTabWidget
)
from PyQt6.QtGui import QIcon, QAction, QStandardItemModel, QStandardItem
from PyQt6.QtCore import Qt, QThread, pyqtSignal
import os

# --- Configuration ---
# API_BASE_URL = "http://localhost:8000/api/v1"  # Get from config file later # This will be a class attribute
APP_ICON_PATH = "assets/icon.png"  # Assuming you have an icon

# --- API Client Thread ---
class ApiClientThread(QThread):
    response_received = pyqtSignal(object)
    error_occurred = pyqtSignal(str)

    def __init__(self, endpoint, method='get', payload=None, params=None):
        super().__init__()
        self.endpoint = endpoint
        self.method = method
        self.payload = payload
        self.params = params
        self.client = httpx.AsyncClient(base_url=API_BASE_URL)

    async def run_async(self):
        try:
            if self.method == 'post':
                response = await self.client.post(self.endpoint, json=self.payload, params=self.params)
            elif self.method == 'put':
                response = await self.client.put(self.endpoint, json=self.payload, params=self.params)
            elif self.method == 'delete':
                response = await self.client.delete(self.endpoint, params=self.params)
            else:  # get
                response = await self.client.get(self.endpoint, params=self.params)
            
            response.raise_for_status()  # Raise an exception for HTTP errors
            self.response_received.emit(response.json())
        except httpx.HTTPStatusError as e:
            error_detail = e.response.text
            try:
                error_json = e.response.json()
                if isinstance(error_json, dict) and 'detail' in error_json:
                    error_detail = error_json['detail']
                elif isinstance(error_json, list) and len(error_json) > 0 and isinstance(error_json[0], dict) and 'msg' in error_json[0]:
                    error_detail = error_json[0]['msg']
            except:
                pass  # Keep original text if JSON parsing fails or doesn't have detail/msg
            self.error_occurred.emit(f"HTTP Error: {e.response.status_code} - {error_detail}")
        except httpx.RequestError as e:
            self.error_occurred.emit(f"Request Error: {str(e)}")
        except Exception as e:
            self.error_occurred.emit(f"An unexpected error occurred: {str(e)}")
        finally:
            await self.client.aclose()

    def run(self):
        import asyncio
        asyncio.run(self.run_async())

# --- Secret Edit/Add Dialog ---
class SecretEditDialog(QDialog):
    def __init__(self, parent=None, secret_data=None):
        super().__init__(parent)
        self.setWindowTitle("Add/Edit Secret" if not secret_data else "Edit Secret")
        layout = QFormLayout(self)

        self.key_input = QLineEdit(secret_data.get('key', '') if secret_data else '')
        self.value_input = QLineEdit(secret_data.get('value', '') if secret_data else '')
        self.value_input.setEchoMode(QLineEdit.EchoMode.Password) # Mask value by default
        self.description_input = QLineEdit(secret_data.get('description', '') if secret_data else '')

        layout.addRow("Key:", self.key_input)
        layout.addRow("Value:", self.value_input)
        layout.addRow("Description (Optional):", self.description_input)

        self.button_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        self.button_box.accepted.connect(self.accept)
        self.button_box.rejected.connect(self.reject)
        layout.addWidget(self.button_box)

        if secret_data: # If editing, key might be read-only depending on API capability
            # self.key_input.setReadOnly(True) # Decide if key is editable for existing secrets
            pass

    def get_secret_data(self):
        return {
            "key": self.key_input.text().strip(),
            "value": self.value_input.text(), # Don't strip value, spaces might be intentional
            "description": self.description_input.text().strip()
        }

    def accept(self):
        if not self.key_input.text().strip():
            QMessageBox.warning(self, "Input Error", "Secret key cannot be empty.")
            return
        # Basic key validation (similar to VS Code extension)
        if not self.key_input.text().strip().isalnum() and '_' not in self.key_input.text().strip() and '-' not in self.key_input.text().strip():
            if not all(c.isalnum() or c in ['_', '-'] for c in self.key_input.text().strip()):
                 QMessageBox.warning(self, "Input Error", "Secret key can only contain letters, numbers, underscores, and hyphens.")
                 return
        if not self.value_input.text(): # Value cannot be empty
            QMessageBox.warning(self, "Input Error", "Secret value cannot be empty.")
            return
        super().accept()

# --- Main Window ---
class VantaMainWindow(QMainWindow):
    API_BASE_URL = "http://localhost:8000/api/v1" # Class attribute for API base URL

    def __init__(self):
        super().__init__()
        self.setWindowTitle("VANTA Secrets Agent")
        # Attempt to set window icon
        if os.path.exists(APP_ICON_PATH):
            self.setWindowIcon(QIcon(APP_ICON_PATH))
        else:
            self.log_message(f"Warning: App icon not found at {APP_ICON_PATH}. Using default icon.", level="WARNING")

        self.setGeometry(100, 100, 1000, 700)

        self.api_thread = None
        self.current_project_id = None
        self.current_project_name = None

        self._init_ui()
        self._create_actions()
        self._create_menus()
        self._create_toolbar()
        self._connect_signals()

        self.status_bar = QStatusBar()
        self.setStatusBar(self.status_bar)
        self.status_bar.showMessage("Ready. Configure API settings if this is your first time.")

        self.load_initial_data()  # e.g. system status

    def _init_ui(self):
        central_widget = QWidget()
        self.setCentralWidget(central_widget)
        main_layout = QVBoxLayout(central_widget)

        # --- Top Controls ---
        top_controls_layout = QHBoxLayout()
        self.scan_workspace_button = QPushButton(QIcon.fromTheme("document-open-folder", QIcon(APP_ICON_PATH)), "Scan Workspace")  # Placeholder icon
        self.configure_button = QPushButton(QIcon.fromTheme("preferences-system", QIcon(APP_ICON_PATH)), "Configure")
        top_controls_layout.addWidget(self.scan_workspace_button)
        top_controls_layout.addStretch()
        top_controls_layout.addWidget(self.configure_button)
        main_layout.addLayout(top_controls_layout)

        # --- Main Content Area (Splitter) ---
        splitter = QSplitter(Qt.Orientation.Horizontal)
        main_layout.addWidget(splitter)

        # Left Pane (Projects and Status)
        left_pane = QWidget()
        left_layout = QVBoxLayout(left_pane)
        
        self.projects_tree = QTreeView()
        self.projects_model = QStandardItemModel()
        self.projects_tree.setModel(self.projects_model)
        self.projects_tree.setHeaderHidden(True)
        left_layout.addWidget(QLabel("Managed Projects:"))
        left_layout.addWidget(self.projects_tree)

        self.status_text = QTextEdit()
        self.status_text.setReadOnly(True)
        self.status_text.setText("System Status: Unknown")
        left_layout.addWidget(QLabel("System Status:"))
        left_layout.addWidget(self.status_text, 1)
        
        splitter.addWidget(left_pane)

        # Right Pane (Tabs for Secrets, Actions, Logs)
        right_pane = QWidget()
        right_layout = QVBoxLayout(right_pane)
        self.tabs = QTabWidget()
        right_layout.addWidget(self.tabs)

        # Secrets Tab
        self.secrets_tab = QWidget()
        secrets_layout = QVBoxLayout(self.secrets_tab)
        self.secrets_list = QListWidget()
        secrets_layout.addWidget(QLabel("Detected Secrets (Current Project):"))
        secrets_layout.addWidget(self.secrets_list)
        self.tabs.addTab(self.secrets_tab, "Secrets")

        # Actions Tab
        self.actions_tab = QWidget()
        actions_layout = QVBoxLayout(self.actions_tab)
        self.scan_project_button = QPushButton("Scan Current Project for Secrets")
        self.add_secret_button = QPushButton("Add New Secret to Project")
        self.edit_secret_button = QPushButton("Edit Selected Secret")
        self.delete_secret_button = QPushButton("Delete Selected Secret")
        self.export_secrets_button = QPushButton("Export Secrets for Current Project")
        self.rotate_secret_button = QPushButton("Rotate Selected Secret")
        
        actions_layout.addWidget(self.scan_project_button)
        actions_layout.addWidget(self.add_secret_button)
        actions_layout.addWidget(self.edit_secret_button)
        actions_layout.addWidget(self.delete_secret_button)
        actions_layout.addWidget(self.export_secrets_button)
        actions_layout.addWidget(self.rotate_secret_button)
        actions_layout.addStretch()
        self.actions_tab.setLayout(actions_layout)
        self.tabs.addTab(self.actions_tab, "Project Actions")

        # Logs Tab
        self.logs_tab = QWidget()
        logs_layout = QVBoxLayout(self.logs_tab)
        self.logs_text = QTextEdit()
        self.logs_text.setReadOnly(True)
        self.logs_text.setFontFamily("Courier New")
        logs_layout.addWidget(QLabel("Application Logs:"))
        logs_layout.addWidget(self.logs_text)
        self.tabs.addTab(self.logs_tab, "Logs")
        
        splitter.addWidget(right_pane)
        splitter.setSizes([300, 700])

        self.progress_bar = QProgressBar()
        self.progress_bar.setVisible(False)
        main_layout.addWidget(self.progress_bar)

    def _create_actions(self):
        self.quit_action = QAction("&Quit", self)
        self.quit_action.setShortcut("Ctrl+Q")
        self.quit_action.setStatusTip("Exit application")
        self.quit_action.triggered.connect(self.close)

        self.scan_workspace_action = QAction(QIcon.fromTheme("document-open-folder"), "&Scan Workspace", self)
        self.scan_workspace_action.setStatusTip("Scan the workspace for VANTA projects")
        self.scan_workspace_action.triggered.connect(self.handle_scan_workspace)

        self.configure_action = QAction(QIcon.fromTheme("preferences-system"), "&Configure Settings...", self)
        self.configure_action.setStatusTip("Configure VANTA API Key and Service URL")
        self.configure_action.triggered.connect(self.handle_configure)

        self.get_status_action = QAction("Get System &Status", self)
        self.get_status_action.triggered.connect(self.load_initial_data)

        self.about_action = QAction("&About", self)
        self.about_action.triggered.connect(self.handle_about)

        # Secret Actions
        self.add_secret_action = QAction("Add Secret...", self)
        self.add_secret_action.triggered.connect(self.handle_add_secret)
        self.edit_secret_action = QAction("Edit Secret...", self)
        self.edit_secret_action.triggered.connect(self.handle_edit_secret)
        self.delete_secret_action = QAction("Delete Secret", self)
        self.delete_secret_action.triggered.connect(self.handle_delete_secret)

    def _create_menus(self):
        menu_bar = self.menuBar()
        file_menu = menu_bar.addMenu("&File")
        file_menu.addAction(self.scan_workspace_action)
        file_menu.addAction(self.configure_action)
        file_menu.addSeparator()
        file_menu.addAction(self.quit_action)

        actions_menu = menu_bar.addMenu("&Actions")
        actions_menu.addAction(self.get_status_action)
        actions_menu.addSeparator()
        actions_menu.addAction(self.add_secret_action)
        actions_menu.addAction(self.edit_secret_action)
        actions_menu.addAction(self.delete_secret_action)
        # Add other actions here like export, rotate specific to current project

        help_menu = menu_bar.addMenu("&Help")
        help_menu.addAction(self.about_action)

    def _create_toolbar(self):
        toolbar = self.addToolBar("Main Toolbar")
        toolbar.addAction(self.scan_workspace_action)
        toolbar.addAction(self.configure_action)
        # Add other common actions to toolbar

    def _connect_signals(self):
        self.scan_workspace_button.clicked.connect(self.handle_scan_workspace)
        self.configure_button.clicked.connect(self.handle_configure)
        
        self.scan_project_button.clicked.connect(self.handle_scan_project_secrets)
        self.add_secret_button.clicked.connect(self.handle_add_secret)
        self.edit_secret_button.clicked.connect(self.handle_edit_secret)
        self.delete_secret_button.clicked.connect(self.handle_delete_secret)
        self.export_secrets_button.clicked.connect(self.handle_export_secrets)
        self.rotate_secret_button.clicked.connect(self.handle_rotate_secret)

        self.projects_tree.clicked.connect(self.handle_project_selected)
        self.secrets_list.itemDoubleClicked.connect(self.handle_edit_secret) # Double click to edit

    def start_api_call(self, endpoint, method='get', payload=None, params=None, on_success=None, on_error=None):
        if self.api_thread and self.api_thread.isRunning():
            self.show_error_message("An API call is already in progress.")
            return

        self.progress_bar.setVisible(True)
        self.progress_bar.setRange(0,0)
        self.status_bar.showMessage(f"Calling API: {method.upper()} {self.API_BASE_URL}{endpoint}...") # Use class attribute
        
        self.api_thread = ApiClientThread(endpoint, method, payload, params)
        # Set the base_url for the client in ApiClientThread instance before starting
        self.api_thread.client.base_url = self.API_BASE_URL # Ensure ApiClientThread uses the potentially updated URL
        
        try: self.api_thread.response_received.disconnect() 
        except TypeError: pass
        try: self.api_thread.error_occurred.disconnect() 
        except TypeError: pass
        
        if on_success:
            self.api_thread.response_received.connect(on_success)
        self.api_thread.response_received.connect(self.on_api_call_finished)
        
        if on_error:
            self.api_thread.error_occurred.connect(on_error)
        else: # Default error handler if specific one not provided
            self.api_thread.error_occurred.connect(self.show_error_message)
        self.api_thread.error_occurred.connect(self.on_api_call_finished)

        self.api_thread.start()

    def on_api_call_finished(self):
        self.progress_bar.setVisible(False)
        self.progress_bar.setRange(0,100)
        self.status_bar.showMessage("API call finished.", 3000)
        self.api_thread = None

    def show_info_message(self, title, message):
        QMessageBox.information(self, title, message)

    def show_error_message(self, message):
        self.log_message(f"ERROR: {message}")
        QMessageBox.critical(self, "Error", message)
    
    def log_message(self, message):
        self.logs_text.append(message)

    def load_initial_data(self):
        self.log_message("Attempting to fetch initial system status...")
        self.start_api_call("/status", on_success=self.on_status_received)

    def on_status_received(self, data):
        self.log_message(f"Status received: {data}")
        status_str = "VANTA Services:\n"
        for key, value in data.items():
            status_str += f"  {key.replace('_', ' ').title()}: {value}\n"
        self.status_text.setText(status_str)
        self.status_bar.showMessage("System status updated.", 3000)

    def handle_scan_workspace(self):
        self.log_message("Scan workspace initiated.")
        self.start_api_call("/projects", on_success=self.on_projects_received)

    def on_projects_received(self, data):
        self.log_message(f"Projects received: {len(data.get('projects', []))} found.")
        self.projects_model.clear()
        projects = data.get('projects', [])
        if not projects:
            item = QStandardItem("No projects found or VANTA API not configured.")
            item.setEnabled(False)
            self.projects_model.appendRow(item)
            return
        
        root_item = self.projects_model.invisibleRootItem()
        for project_data in projects:
            project_name = project_data.get('name', 'Unnamed Project')
            confidence = project_data.get('confidence', 0)
            secrets_count = project_data.get('secrets_count', 0)
            
            display_text = f"{project_name} ({confidence}% / {secrets_count} secrets)"
            project_item = QStandardItem(display_text)
            project_item.setData(project_data, Qt.ItemDataRole.UserRole)
            project_item.setEditable(False)
            root_item.appendRow(project_item)
        self.projects_tree.expandAll()

    def handle_project_selected(self, index):
        item = self.projects_model.itemFromIndex(index)
        if item and item.data(Qt.ItemDataRole.UserRole):
            project_data = item.data(Qt.ItemDataRole.UserRole)
            project_id = project_data.get('id')
            project_name = project_data.get('name', 'Selected Project')
            
            if project_id:
                self.current_project_id = project_id
                self.current_project_name = project_name
                self.log_message(f"Project selected: {project_name}, ID: {project_id}")
                self.status_bar.showMessage(f"Selected Project: {project_name}")
                self.tabs.setCurrentWidget(self.secrets_tab)
                self.load_secrets_for_project(project_id)
            else:
                self.current_project_id = None
                self.current_project_name = None
                self.secrets_list.clear()
                self.log_message("Selected project item has no ID.")
        else:
            self.current_project_id = None
            self.current_project_name = None
            self.secrets_list.clear()
            self.log_message("No valid project item selected from tree.")

    def load_secrets_for_project(self, project_id):
        self.log_message(f"Loading secrets for project ID: {project_id}")
        self.secrets_list.clear()
        self.start_api_call(f"/scan/projects/{project_id}/secrets", 
                              on_success=self.on_secrets_received,
                              on_error=lambda msg: self.show_error_message(f"Failed to load secrets: {msg}"))

    def on_secrets_received(self, data):
        secrets = data.get('secrets', [])
        self.log_message(f"Secrets received for project {self.current_project_name}: {len(secrets)} found.")
        self.secrets_list.clear()

        if not secrets:
            item = QListWidgetItem("No secrets found in this project.")
            item.setData(Qt.ItemDataRole.UserRole, None)
            item.setEnabled(False)
            self.secrets_list.addItem(item)
            return

        for secret_data in secrets:
            key = secret_data.get('key', 'N/A')
            secret_type = secret_data.get('type', 'Unknown Type')
            location = secret_data.get('location', 'N/A')
            status = secret_data.get('status', 'N/A')
            
            display_text = f"{key} ({secret_type}) - Status: {status}"
            if location != 'N/A':
                 display_text += f" - In: {location}"

            list_item = QListWidgetItem(display_text)
            list_item.setData(Qt.ItemDataRole.UserRole, secret_data) # Store full secret data
            self.secrets_list.addItem(list_item)

    def handle_export_secrets(self):
        if not self.current_project_id:
            self.show_error_message("Please select a project first to export its secrets.")
            return
        
        self.log_message(f"Initiating export for project ID: {self.current_project_id} ({self.current_project_name})")
        self.start_api_call(f"/env/export/{self.current_project_id}", 
                              on_success=self.on_export_success, 
                              on_error=lambda msg: self.show_error_message(f"Export failed: {msg}"))

    def on_export_success(self, data):
        content_to_save = data.get('env_content', '')
        project_name_for_file = self.current_project_name.replace(" ", "_").replace("/", "_") if self.current_project_name else "exported_project"
        
        default_filename = f"{project_name_for_file}_secrets.env"
        file_path, _ = QFileDialog.getSaveFileName(self, "Save Exported Secrets", default_filename, "ENV Files (*.env);;All Files (*)")
        
        if file_path:
            try:
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(content_to_save)
                self.log_message(f"Secrets exported successfully to {file_path}")
                self.show_info_message("Export Successful", f"Secrets for '{self.current_project_name}' exported to {file_path}")
            except Exception as e:
                self.log_message(f"Failed to save file: {str(e)}")
                self.show_error_message(f"Failed to save file: {str(e)}")
        else:
            self.log_message("Export cancelled by user.")

    def handle_rotate_secret(self):
        selected_items = self.secrets_list.selectedItems()
        if not selected_items:
            self.show_error_message("Please select a secret from the list to rotate.")
            return
        
        secret_item_widget = selected_items[0]
        secret_data = secret_item_widget.data(Qt.ItemDataRole.UserRole)
        
        if not secret_data or not secret_data.get('id') or not secret_data.get('key'):
            self.show_error_message("Invalid secret selected or secret ID/key missing.")
            return
        
        secret_id_to_rotate = secret_data.get('id')
        secret_key_display = secret_data.get('key', 'this secret')

        confirm = QMessageBox.question(self, "Confirm Rotation", 
                                         f"Are you sure you want to initiate rotation for secret: '{secret_key_display}' (ID: {secret_id_to_rotate}) in project '{self.current_project_name}'?",
                                         QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                                         QMessageBox.StandardButton.No)
        if confirm == QMessageBox.StandardButton.Yes:
            self.log_message(f"Initiating rotation for secret ID: {secret_id_to_rotate} ('{secret_key_display}')")
            self.start_api_call(f"/rotation/rotate/{secret_id_to_rotate}", method='post', 
                                  on_success=self.on_rotation_success,
                                  on_error=lambda msg: self.show_error_message(f"Rotation failed for '{secret_key_display}': {msg}"))
        else:
            self.log_message(f"Secret rotation cancelled by user for '{secret_key_display}'.")

    def on_rotation_success(self, data):
        message = data.get('message', 'Rotation process initiated.')
        status = data.get('status', 'success')
        self.log_message(f"Rotation for project '{self.current_project_name}' completed with status: {status}. Message: {message}")
        self.show_info_message("Rotation Status", f"Rotation for '{self.current_project_name}': {message}")
        
        if self.current_project_id:
            self.log_message(f"Refreshing secrets list for project '{self.current_project_name}' after rotation.")
            self.load_secrets_for_project(self.current_project_id)
        else:
            self.log_message("No current project ID found to refresh secrets after rotation.")

    def handle_scan_project_secrets(self):
        if self.current_project_id:
            self.log_message(f"Re-scanning secrets for current project ID: {self.current_project_id} ({self.current_project_name})")
            self.load_secrets_for_project(self.current_project_id)
        else:
            self.show_error_message("Please select a project first to scan its secrets.")

    def handle_add_secret(self):
        if not self.current_project_id:
            self.show_error_message("Please select a project to add a secret to.")
            return

        dialog = SecretEditDialog(self)
        if dialog.exec():
            new_secret_data = dialog.get_secret_data()
            self.log_message(f"Attempting to add new secret to project {self.current_project_name}: {new_secret_data['key']}")
            self.start_api_call(f"/secrets/{self.current_project_name}", 
                                  method='post', 
                                  payload=new_secret_data,
                                  on_success=self.on_add_secret_success,
                                  on_error=lambda msg: self.show_error_message(f"Failed to add secret: {msg}"))

    def on_add_secret_success(self, data):
        secret_key = data.get('key', 'N/A') # Assuming API returns the added secret
        self.log_message(f"Secret '{secret_key}' added successfully to project {self.current_project_name}.")
        self.show_info_message("Secret Added", f"Secret '{secret_key}' added to '{self.current_project_name}'.")
        self.load_secrets_for_project(self.current_project_id) # Refresh list
        self.load_initial_data() # Refresh global status (total secrets)

    def handle_edit_secret(self, item=None): # item can be passed from double-click
        selected_items = self.secrets_list.selectedItems()
        if not selected_items and not item:
            self.show_error_message("Please select a secret from the list to edit.")
            return
        
        secret_item_widget = item if item else selected_items[0]
        if not isinstance(secret_item_widget, QListWidgetItem): # Check if it's a valid item if passed directly
            secret_item_widget = selected_items[0] if selected_items else None
            if not secret_item_widget:
                self.show_error_message("No valid secret selected.")
                return

        original_secret_data = secret_item_widget.data(Qt.ItemDataRole.UserRole)
        
        if not original_secret_data or not original_secret_data.get('key'):
            self.show_error_message("Invalid secret data selected.")
            return

        dialog = SecretEditDialog(self, secret_data=original_secret_data)
        if dialog.exec():
            updated_secret_data = dialog.get_secret_data()
            original_key = original_secret_data['key'] # Key used in API path might be the old one

            # Only send fields that have changed, or send all if API supports partial update or full replace
            # For simplicity, sending all fields assuming API handles it (PUT often means replace)
            self.log_message(f"Attempting to edit secret '{original_key}' in project {self.current_project_name}.")
            self.start_api_call(f"/secrets/{self.current_project_name}/{original_key}",
                                  method='put',
                                  payload=updated_secret_data,
                                  on_success=self.on_edit_secret_success,
                                  on_error=lambda msg: self.show_error_message(f"Failed to edit secret '{original_key}': {msg}"))
    
    def on_edit_secret_success(self, data):
        # API might return the updated secret or just a success message
        updated_key = data.get('key', 'N/A') 
        self.log_message(f"Secret '{updated_key}' edited successfully in project {self.current_project_name}.")
        self.show_info_message("Secret Edited", f"Secret '{updated_key}' in '{self.current_project_name}' has been updated.")
        self.load_secrets_for_project(self.current_project_id) # Refresh list

    def handle_delete_secret(self):
        selected_items = self.secrets_list.selectedItems()
        if not selected_items:
            self.show_error_message("Please select a secret from the list to delete.")
            return
        
        secret_item_widget = selected_items[0]
        secret_data = secret_item_widget.data(Qt.ItemDataRole.UserRole)

        if not secret_data or not secret_data.get('key'):
            self.show_error_message("Invalid secret data selected for deletion.")
            return
        
        secret_key_to_delete = secret_data['key']
        confirm = QMessageBox.question(self, "Confirm Delete",
                                         f"Are you sure you want to delete the secret '{secret_key_to_delete}' from project '{self.current_project_name}'?\nThis action cannot be undone.",
                                         QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                                         QMessageBox.StandardButton.No)
        if confirm == QMessageBox.StandardButton.Yes:
            self.log_message(f"Attempting to delete secret '{secret_key_to_delete}' from project {self.current_project_name}.")
            self.start_api_call(f"/secrets/{self.current_project_name}/{secret_key_to_delete}",
                                  method='delete',
                                  on_success=self.on_delete_secret_success,
                                  on_error=lambda msg: self.show_error_message(f"Failed to delete secret '{secret_key_to_delete}': {msg}"))

    def on_delete_secret_success(self, data):
        # API might return the deleted secret key or just a success message
        deleted_key = data.get('deleted_secret_key', 'The selected secret') # Example, adjust based on actual API response
        self.log_message(f"Secret '{deleted_key}' deleted successfully from project {self.current_project_name}.")
        self.show_info_message("Secret Deleted", f"{deleted_key} has been deleted from '{self.current_project_name}'.")
        self.load_secrets_for_project(self.current_project_id) # Refresh list
        self.load_initial_data() # Refresh global status (total secrets)

    def handle_configure(self):
        self.log_message("Configuration dialog opened.")
        dialog = ConfigDialog(self, current_url=self.API_BASE_URL) # Pass current class attribute value
        if dialog.exec():
            new_url = dialog.get_url()
            # global API_BASE_URL # No longer global
            # API_BASE_URL = new_url
            self.API_BASE_URL = new_url # Update class attribute
            
            # Re-initialize AsyncClient in ApiClientThread or make client part of VantaMainWindow
            # For simplicity here, we'll assume the next ApiClientThread instantiation picks up new global
            # --> Corrected approach: Update client base_url directly in start_api_call

            self.log_message(f"API Base URL configured to: {self.API_BASE_URL}")
            self.show_info_message("Configuration Updated", f"API URL set to: {self.API_BASE_URL}\nPlease re-scan or fetch status to use the new URL.")
            self.load_initial_data()

    def handle_about(self):
        QMessageBox.about(
            self,
            "About VANTA Secrets Agent",
            "<p><b>VANTA Secrets Agent - Windows GUI</b></p>"
            "<p>Version: 1.0.0 (Domino Phase)</p>"
            "<p>This application provides a graphical interface for interacting with the VANTA Secrets Agent API.</p>"
            "<p>Developed to achieve feature parity with Web, CLI, and VS Code Extension interfaces.</p>"
            "<p>&copy; 2024 Your Company Name</p>"
        )
        self.log_message("About dialog displayed.")

    def closeEvent(self, event):
        if self.api_thread and self.api_thread.isRunning():
            reply = QMessageBox.question(self, 'Confirm Quit',
                                       "An API call is currently in progress. Are you sure you want to quit?",
                                       QMessageBox.StandardButton.Yes | QMessageBox.StandardButton.No,
                                       QMessageBox.StandardButton.No)
            if reply == QMessageBox.StandardButton.Yes:
                event.accept()
            else:
                event.ignore()
        else:
            event.accept()

# --- Configuration Dialog ---
class ConfigDialog(QDialog):
    def __init__(self, parent=None, current_url=""):
        super().__init__(parent)
        self.setWindowTitle("Configure API Settings")
        layout = QFormLayout(self)

        self.url_input = QLineEdit(current_url)
        layout.addRow("VANTA API Base URL:", self.url_input)
        
        self.button_box = QDialogButtonBox(QDialogButtonBox.StandardButton.Ok | QDialogButtonBox.StandardButton.Cancel)
        self.button_box.accepted.connect(self.accept)
        self.button_box.rejected.connect(self.reject)
        layout.addWidget(self.button_box)

    def get_url(self):
        return self.url_input.text()

if __name__ == "__main__":
    app = QApplication(sys.argv)
    main_window = VantaMainWindow()
    main_window.show()
    sys.exit(app.exec()) 