import pytest
import sys
from pathlib import Path
from unittest.mock import patch, AsyncMock, MagicMock
import os

from PyQt6.QtWidgets import QApplication, QListWidgetItem
from PyQt6.QtCore import Qt

# Add project root to sys.path to allow importing windows_gui_enhanced
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

# Conditional import for testing environment
try:
    from windows_gui_enhanced import VantaMainWindow, ApiClientThread, ConfigDialog, SecretEditDialog
except ImportError as e:
    print(f"Error importing GUI modules (normal in CI/headless without display): {e}")
    VantaMainWindow = None  # Placeholder if GUI cannot be initialized
    ApiClientThread = None
    ConfigDialog = None
    SecretEditDialog = None

# Conditional import for QApplication, assuming it might not be available in all test environments
# For local testing with PyQt6 installed, this should work.
# For CI environments, you might need to mock QApplication more extensively or use a headless setup.
try:
    from PyQt6.QtWidgets import QApplication, QListWidgetItem
    from PyQt6.QtCore import Qt
    HAS_QT = True
except ImportError:
    HAS_QT = False
    # Mock QApplication if not available
    class QApplication:
        def __init__(self, args):
            pass
        def exec(self):
            return 0
        def quit(self):
            pass
    # Mock QListWidgetItem if not available
    class QListWidgetItem:
        def __init__(self, text):
            self.text_data = text
        def data(self, role):
            return getattr(self, 'item_data', None)
        def setData(self, role, value):
            self.item_data = value
        def text(self):
            return self.text_data
    # Mock Qt if not available
    class Qt:
        class ItemDataRole:
            UserRole = 1 # Placeholder value
        class Orientation:
            Horizontal = 1
            Vertical = 2

@pytest.fixture(scope="session")
def qapp():
    """Initializes a QApplication instance for the test session, if not already done."""
    app = QApplication.instance()
    if app is None:
        # No -X display, create a QCoreApplication for non-GUI tests or skip GUI tests
        # For full GUI tests, ensure a display server (e.g., Xvfb) is running.
        print("QApplication not found, creating one for testing. Ensure X server or Xvfb for GUI tests.")
        app = QApplication(sys.argv)
    return app

@pytest.fixture
def window(qapp):
    # Patch API calls made during __init__ to avoid network errors in tests
    with patch('windows_gui_enhanced.VantaMainWindow.load_initial_data') as mock_load_data:
        test_window = VantaMainWindow()
        yield test_window # Provide the instance to the test
        test_window.close() # Clean up the window

@pytest.mark.skipif(VantaMainWindow is None, reason="GUI components could not be imported, likely due to missing display or PyQt6 issues.")
class TestVantaMainWindow:
    def test_window_creation(self, window):
        """Test if the main window can be created."""
        assert window is not None
        assert window.windowTitle() == "VANTA SECRETS AGENT - WINDOWS GUI"
        # mock_load_data is part of the fixture setup, no need to assert call here unless specifically testing it

    def test_configure_dialog_opens(self, window, qtbot):
        """Test if the configuration dialog opens."""
        with patch.object(ConfigDialog, 'exec', return_value=True) as mock_dialog_exec, \
             patch.object(ConfigDialog, 'get_url', return_value="http://new-test.url") as mock_get_url:
            window.handle_configure()
            mock_dialog_exec.assert_called_once()
            # Further assertions if API_BASE_URL update mechanism is testable

    def test_about_dialog_opens(self, window, qtbot):
        """Test if the About dialog opens."""
        with patch('PyQt6.QtWidgets.QMessageBox.about') as mock_about_box:
            window.handle_about()
            mock_about_box.assert_called_once()

    @patch('windows_gui_enhanced.ApiClientThread')
    def test_load_initial_data_calls_api(self, mock_api_thread_class, window):
        mock_api_instance = MagicMock()
        mock_api_thread_class.return_value = mock_api_instance
        
        # Call load_initial_data directly, as it's patched in the fixture for initial creation
        # This tests a subsequent call or if it wasn't patched in fixture
        with patch('windows_gui_enhanced.VantaMainWindow.load_initial_data', new=MagicMock()) as specific_mock_load:
            # Reset window or create a new one if the fixture's patch interferes
            # For simplicity, let's assume window fixture is fine and we re-trigger
            pass # The fixture already called it, so we are testing its effect or a re-call

        # Re-triggering for specific test if needed
        window.load_initial_data() # Call it again on the already created window

        mock_api_thread_class.assert_called_with("/status", method='get', payload=None, params=None)
        mock_api_instance.start.assert_called_once()

    @patch('windows_gui_enhanced.ApiClientThread')
    def test_on_status_received_updates_ui(self, mock_api_thread_class, window):
        test_data = {"service_a": "OK", "service_b": "Degraded"}
        window.on_status_received(test_data)
        
        expected_text = "VANTA Services:\\n  Service A: OK\\n  Service B: Degraded\\n"
        assert window.status_text.toPlainText() == expected_text
        assert "System status updated" in window.status_bar.currentMessage()

    @patch('windows_gui_enhanced.ApiClientThread')
    def test_handle_scan_workspace_calls_api(self, mock_api_thread_class, window):
        mock_api_instance = MagicMock()
        mock_api_thread_class.return_value = mock_api_instance
        window.handle_scan_workspace()
        # Check that it was called with the correct parameters, including the on_success callback
        called_args, called_kwargs = mock_api_thread_class.call_args
        assert called_args[0] == "/projects"
        assert called_kwargs['on_success'] == window.on_projects_received
        mock_api_instance.start.assert_called_once()

    def test_on_projects_received_populates_tree(self, window):
        test_data = {"projects": [
            {"id": "p1", "name": "Project Alpha", "confidence": 90, "secrets_count": 5},
            {"id": "p2", "name": "Project Beta", "confidence": 75, "secrets_count": 2}
        ]}
        window.on_projects_received(test_data)
        assert window.projects_model.rowCount() == 2
        item1 = window.projects_model.item(0)
        assert item1.text() == "Project Alpha (90% / 5 secrets)"
        assert item1.data(Qt.ItemDataRole.UserRole)['id'] == "p1"

    @patch('windows_gui_enhanced.ApiClientThread')
    def test_handle_project_selected_loads_secrets(self, mock_api_thread_class, window):
        mock_api_instance = MagicMock()
        mock_api_thread_class.return_value = mock_api_instance

        project_data = {"id": "proj123", "name": "Test Project"}
        # Create a QStandardItem to simulate selection
        item = QStandardItem("Test Project Item") 
        item.setData(project_data, Qt.ItemDataRole.UserRole)
        
        # Add item to model and get its index
        window.projects_model.appendRow(item)
        mock_index = window.projects_model.indexFromItem(item)
        
        window.handle_project_selected(mock_index)
        
        assert window.current_project_id == "proj123"
        assert window.current_project_name == "Test Project"
        
        called_args, called_kwargs = mock_api_thread_class.call_args
        assert called_args[0] == f"/scan/projects/proj123/secrets"
        assert called_kwargs['on_success'] == window.on_secrets_received
        assert callable(called_kwargs['on_error']) # Check if an error handler is passed
        mock_api_instance.start.assert_called_once()

    def test_on_secrets_received_populates_list(self, window):
        window.current_project_name = "Test Project"
        test_data = {"secrets": [
            {"key": "API_KEY", "type": "generic", "location": "file.env", "status": "detected"},
            {"key": "DB_PASS", "type": "database", "location": "config.ini", "status": "managed"}
        ]}
        window.on_secrets_received(test_data)
        assert window.secrets_list.count() == 2
        assert "API_KEY" in window.secrets_list.item(0).text()
        assert window.secrets_list.item(0).data(Qt.ItemDataRole.UserRole)['key'] == "API_KEY"

    @patch('windows_gui_enhanced.ConfigDialog')
    def test_handle_configure_dialog_opens_and_updates_url(self, mock_config_dialog_class, window):
        mock_dialog_instance = MagicMock()
        mock_dialog_instance.exec.return_value = True 
        mock_dialog_instance.get_url.return_value = "http://new-test-url:9000/api"
        mock_config_dialog_class.return_value = mock_dialog_instance

        initial_api_base_url = window.API_BASE_URL # Store initial
        
        with patch.object(window, 'load_initial_data') as mock_load_data:
            window.handle_configure()
        
        mock_config_dialog_class.assert_called_once_with(window, current_url=initial_api_base_url)
        mock_dialog_instance.exec.assert_called_once()
        assert "API Base URL configured to: http://new-test-url:9000/api" in window.logs_text.toPlainText()
        mock_load_data.assert_called_once()
        assert window.API_BASE_URL == "http://new-test-url:9000/api" # Check if class attribute updated

    @patch('PyQt6.QtWidgets.QMessageBox.about')
    def test_handle_about_shows_dialog(self, mock_about_box, window):
        window.handle_about()
        mock_about_box.assert_called_once()

    @patch('windows_gui_enhanced.ApiClientThread')
    @patch('windows_gui_enhanced.QFileDialog.getSaveFileName')
    @patch('builtins.open', new_callable=MagicMock) # Use MagicMock for open
    def test_handle_export_secrets_success(self, mock_open_file, mock_save_dialog, mock_api_thread_class, window):
        window.current_project_id = "projExport"
        window.current_project_name = "Export Test Project"
        
        mock_api_instance = MagicMock()
        mock_api_thread_class.return_value = mock_api_instance
        
        mock_save_dialog.return_value = ("/fake/path/export_test_project_secrets.env", "ENV Files (*.env)")
        
        window.start_api_call(f"/env/export/{window.current_project_id}", 
                                   on_success=window.on_export_success)
        # Directly call the success handler to simulate API response
        window.on_export_success({"env_content": "KEY=VALUE\\nOTHER=SECRET"})

        called_args, called_kwargs = mock_api_thread_class.call_args
        assert called_args[0] == f"/env/export/{window.current_project_id}"
        assert called_kwargs['on_success'] == window.on_export_success
        
        mock_save_dialog.assert_called_once_with(window, "Save Exported Secrets", "Export_Test_Project_secrets.env", "ENV Files (*.env);;All Files (*)")
        mock_open_file.assert_called_once_with("/fake/path/export_test_project_secrets.env", 'w', encoding='utf-8')
        mock_open_file().write.assert_called_once_with("KEY=VALUE\\nOTHER=SECRET") # Use raw string or escape
        assert "Secrets exported successfully" in window.logs_text.toPlainText()

    @patch('windows_gui_enhanced.ApiClientThread')
    @patch('windows_gui_enhanced.QMessageBox.question')
    def test_handle_rotate_secret_success(self, mock_msg_box_question, mock_api_thread_class, window):
        window.current_project_id = "projRotate"
        window.current_project_name = "Rotate Test Project"
        
        mock_api_instance = MagicMock()
        mock_api_thread_class.return_value = mock_api_instance
        mock_msg_box_question.return_value = QMessageBox.StandardButton.Yes

        mock_item = QListWidgetItem("SECRET_KEY (generic) - Status: detected")
        secret_data = {"id": "secret123", "key": "SECRET_KEY"}
        mock_item.setData(Qt.ItemDataRole.UserRole, secret_data)
        window.secrets_list.addItem(mock_item)
        window.secrets_list.setCurrentItem(mock_item)

        with patch.object(window, 'load_secrets_for_project') as mock_load_secrets:
            window.handle_rotate_secret()
            window.on_rotation_success({"message": "Rotation started", "status": "success"})

        called_args, called_kwargs = mock_api_thread_class.call_args
        assert called_args[0] == f"/rotation/rotate/secret123"
        assert called_args[1] == 'post' # method
        assert called_kwargs['on_success'] == window.on_rotation_success
        assert callable(called_kwargs['on_error'])
        
        mock_load_secrets.assert_called_once_with("projRotate")
        assert "Rotation for 'Rotate Test Project' completed" in window.logs_text.toPlainText()

    @patch('windows_gui_enhanced.SecretEditDialog')
    @patch('windows_gui_enhanced.ApiClientThread')
    def test_handle_add_secret_success(self, mock_api_thread_class, mock_secret_dialog_class, window):
        window.current_project_id = "projAdd"
        window.current_project_name = "AddSecretProject"

        mock_dialog_instance = MagicMock()
        mock_dialog_instance.exec.return_value = True
        new_secret_data = {"key": "NEW_KEY", "value": "NEW_VALUE", "description": "A new one"}
        mock_dialog_instance.get_secret_data.return_value = new_secret_data
        mock_secret_dialog_class.return_value = mock_dialog_instance

        mock_api_instance = MagicMock()
        mock_api_thread_class.return_value = mock_api_instance

        with patch.object(window, 'load_secrets_for_project') as mock_load_secrets, \
             patch.object(window, 'load_initial_data') as mock_load_status:
            window.handle_add_secret()
            window.on_add_secret_success({"key": "NEW_KEY"}) 
        
        mock_secret_dialog_class.assert_called_once_with(window)
        mock_dialog_instance.exec.assert_called_once()
        
        called_args, called_kwargs = mock_api_thread_class.call_args
        assert called_args[0] == f"/secrets/{window.current_project_name}"
        assert called_args[1] == 'post'
        assert called_kwargs['payload'] == new_secret_data
        assert called_kwargs['on_success'] == window.on_add_secret_success
        assert callable(called_kwargs['on_error'])
        
        mock_load_secrets.assert_called_once_with(window.current_project_id)
        mock_load_status.assert_called_once()
        assert "Secret 'NEW_KEY' added successfully" in window.logs_text.toPlainText()

    @patch('windows_gui_enhanced.SecretEditDialog')
    @patch('windows_gui_enhanced.ApiClientThread')
    def test_handle_edit_secret_success(self, mock_api_thread_class, mock_secret_dialog_class, window):
        window.current_project_id = "projEdit"
        window.current_project_name = "EditSecretProject"

        original_secret_data = {"key": "OLD_KEY", "value": "OLD_VALUE", "description": "Old desc"}
        mock_item = QListWidgetItem("OLD_KEY (generic)")
        mock_item.setData(Qt.ItemDataRole.UserRole, original_secret_data)
        window.secrets_list.addItem(mock_item)
        window.secrets_list.setCurrentItem(mock_item)

        mock_dialog_instance = MagicMock()
        mock_dialog_instance.exec.return_value = True
        updated_secret_data = {"key": "OLD_KEY", "value": "UPDATED_VALUE", "description": "Updated desc"}
        mock_dialog_instance.get_secret_data.return_value = updated_secret_data
        mock_secret_dialog_class.return_value = mock_dialog_instance

        mock_api_instance = MagicMock()
        mock_api_thread_class.return_value = mock_api_instance

        with patch.object(window, 'load_secrets_for_project') as mock_load_secrets:
            window.handle_edit_secret()
            window.on_edit_secret_success({"key": "OLD_KEY"})

        mock_secret_dialog_class.assert_called_once_with(window, secret_data=original_secret_data)
        mock_dialog_instance.exec.assert_called_once()
        
        called_args, called_kwargs = mock_api_thread_class.call_args
        assert called_args[0] == f"/secrets/{window.current_project_name}/OLD_KEY"
        assert called_args[1] == 'put'
        assert called_kwargs['payload'] == updated_secret_data
        assert called_kwargs['on_success'] == window.on_edit_secret_success
        assert callable(called_kwargs['on_error'])

        mock_load_secrets.assert_called_once_with(window.current_project_id)
        assert "Secret 'OLD_KEY' edited successfully" in window.logs_text.toPlainText()

    @patch('windows_gui_enhanced.QMessageBox.question')
    @patch('windows_gui_enhanced.ApiClientThread')
    def test_handle_delete_secret_success(self, mock_api_thread_class, mock_msg_box_question, window):
        window.current_project_id = "projDelete"
        window.current_project_name = "DeleteSecretProject"
        mock_msg_box_question.return_value = QMessageBox.StandardButton.Yes

        secret_to_delete = {"key": "KEY_TO_DELETE", "value": "VAL", "description": "Desc"}
        mock_item = QListWidgetItem("KEY_TO_DELETE (generic)")
        mock_item.setData(Qt.ItemDataRole.UserRole, secret_to_delete)
        window.secrets_list.addItem(mock_item)
        window.secrets_list.setCurrentItem(mock_item)

        mock_api_instance = MagicMock()
        mock_api_thread_class.return_value = mock_api_instance

        with patch.object(window, 'load_secrets_for_project') as mock_load_secrets, \
             patch.object(window, 'load_initial_data') as mock_load_status:
            window.handle_delete_secret()
            window.on_delete_secret_success({"deleted_secret_key": "KEY_TO_DELETE"})

        mock_msg_box_question.assert_called_once()
        
        called_args, called_kwargs = mock_api_thread_class.call_args
        assert called_args[0] == f"/secrets/{window.current_project_name}/KEY_TO_DELETE"
        assert called_args[1] == 'delete'
        assert called_kwargs['on_success'] == window.on_delete_secret_success
        assert callable(called_kwargs['on_error'])
        
        mock_load_secrets.assert_called_once_with(window.current_project_id)
        mock_load_status.assert_called_once()
        assert "Secret 'KEY_TO_DELETE' deleted successfully" in window.logs_text.toPlainText()

@pytest.mark.skipif(ConfigDialog is None, reason="GUI components could not be imported.")
class TestConfigDialog:
    def test_config_dialog_gets_url(self, qapp):
        dialog = ConfigDialog(current_url="http://test.com")
        assert dialog.get_url() == "http://test.com"
        dialog.close()

@pytest.mark.skipif(SecretEditDialog is None, reason="GUI components could not be imported.")
class TestSecretEditDialog:
    def test_secret_edit_dialog_get_data(self, qapp):
        dialog = SecretEditDialog(secret_data={"key": "k", "value": "v", "description": "d"})
        data = dialog.get_secret_data()
        assert data["key"] == "k"
        assert data["value"] == "v"
        assert data["description"] == "d"
        dialog.close()

    @patch('windows_gui_enhanced.QMessageBox.warning')
    def test_secret_edit_dialog_validation(self, mock_warning, qapp):
        dialog_no_key = SecretEditDialog()
        dialog_no_key.key_input.setText("  ")
        dialog_no_key.value_input.setText("value")
        dialog_no_key.accept()
        mock_warning.assert_called_with(dialog_no_key, "Input Error", "Secret key cannot be empty.")
        assert dialog_no_key.result() != SecretEditDialog.DialogCode.Accepted
        mock_warning.reset_mock()
        dialog_no_key.close()

        dialog_invalid_key = SecretEditDialog()
        dialog_invalid_key.key_input.setText("key!")
        dialog_invalid_key.value_input.setText("value")
        dialog_invalid_key.accept()
        mock_warning.assert_called_with(dialog_invalid_key, "Input Error", "Secret key can only contain letters, numbers, underscores, and hyphens.")
        assert dialog_invalid_key.result() != SecretEditDialog.DialogCode.Accepted
        mock_warning.reset_mock()
        dialog_invalid_key.close()

        dialog_no_value = SecretEditDialog()
        dialog_no_value.key_input.setText("key")
        dialog_no_value.value_input.setText("")
        dialog_no_value.accept()
        mock_warning.assert_called_with(dialog_no_value, "Input Error", "Secret value cannot be empty.")
        assert dialog_no_value.result() != SecretEditDialog.DialogCode.Accepted
        dialog_no_value.close()

@pytest.mark.skipif(ApiClientThread is None, reason="ApiClientThread not available for testing.")
@pytest.mark.asyncio 
class TestApiClientThread:
    @patch('httpx.AsyncClient')
    async def test_api_get_request_success(self, MockAsyncClient):
        mock_response = MagicMock()
        mock_response.json.return_value = {"status": "ok"}
        mock_response.raise_for_status.return_value = None
        
        mock_async_client_instance = MockAsyncClient.return_value
        mock_async_client_instance.get = AsyncMock(return_value=mock_response)
        mock_async_client_instance.aclose = AsyncMock()

        thread = ApiClientThread("/test_get")
        thread.response_received = MagicMock() # pyqtSignal needs to be mocked for emit
        thread.error_occurred = MagicMock()

        await thread.run_async()

        thread.response_received.emit.assert_called_once_with({"status": "ok"})
        thread.error_occurred.emit.assert_not_called()
        mock_async_client_instance.get.assert_called_once_with("/test_get", params=None)
        mock_async_client_instance.aclose.assert_called_once()

    @patch('httpx.AsyncClient')
    async def test_api_post_request_success(self, MockAsyncClient):
        mock_response = MagicMock()
        mock_response.json.return_value = {"result": "created"}
        mock_response.raise_for_status.return_value = None

        mock_async_client_instance = MockAsyncClient.return_value
        mock_async_client_instance.post = AsyncMock(return_value=mock_response)
        mock_async_client_instance.aclose = AsyncMock()

        payload = {"data": "sample"}
        thread = ApiClientThread("/test_post", method='post', payload=payload)
        thread.response_received = MagicMock()
        thread.error_occurred = MagicMock()

        await thread.run_async()

        thread.response_received.emit.assert_called_once_with({"result": "created"})
        thread.error_occurred.emit.assert_not_called()
        mock_async_client_instance.post.assert_called_once_with("/test_post", json=payload, params=None)
        mock_async_client_instance.aclose.assert_called_once()

    @patch('httpx.AsyncClient')
    async def test_api_http_error(self, MockAsyncClient):
        mock_response = MagicMock()
        mock_response.status_code = 404
        mock_response.text = "Not Found"
        mock_response.json.side_effect = Exception("JSON decode error")
        
        http_error = httpx.HTTPStatusError("Error", request=MagicMock(), response=mock_response)
        
        mock_async_client_instance = MockAsyncClient.return_value
        mock_async_client_instance.get = AsyncMock(side_effect=http_error)
        mock_async_client_instance.aclose = AsyncMock()

        thread = ApiClientThread("/notfound")
        thread.response_received = MagicMock()
        thread.error_occurred = MagicMock()

        await thread.run_async()

        thread.response_received.emit.assert_not_called()
        thread.error_occurred.emit.assert_called_once_with("HTTP Error: 404 - Not Found")
        mock_async_client_instance.aclose.assert_called_once()

    @patch('httpx.AsyncClient')
    async def test_api_request_error(self, MockAsyncClient):
        request_error = httpx.RequestError("Connection failed", request=MagicMock())

        mock_async_client_instance = MockAsyncClient.return_value
        mock_async_client_instance.get = AsyncMock(side_effect=request_error)
        mock_async_client_instance.aclose = AsyncMock()

        thread = ApiClientThread("/connect_error")
        thread.response_received = MagicMock()
        thread.error_occurred = MagicMock()

        await thread.run_async()

        thread.response_received.emit.assert_not_called()
        thread.error_occurred.emit.assert_called_once_with("Request Error: Connection failed")
        mock_async_client_instance.aclose.assert_called_once()

# To run: pytest tests/test_windows_gui_enhanced.py
# Ensure PyQt6, pytest, pytest-qt, pytest-asyncio are installed.
# For GUI tests, an X server (like Xvfb on Linux) might be needed if not run locally.
# Example: xvfb-run pytest tests/test_windows_gui_enhanced.py

# Note: To run these tests, you might need pytest-qt for qtbot fixture and pytest-asyncio.
# Ensure PyQt6 is installed and a display server (like Xvfb) is available for GUI tests.
# Example command: xvfb-run python -m pytest 