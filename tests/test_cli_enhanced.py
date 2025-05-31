"""
Test Suite for VANTA Secrets Agent Enhanced CLI
Cross-Platform Feature Parity Implementation
"""

import pytest
import asyncio
import json
from unittest.mock import Mock, patch, AsyncMock
from click.testing import CliRunner
import httpx

# Import the CLI module
import sys
from pathlib import Path
sys.path.append(str(Path(__file__).parent.parent))
from cli_enhanced import cli, VantaSecretsAPI

class TestVantaSecretsAPI:
    """Test the API client functionality"""
    
    @pytest.fixture
    def api_client(self):
        return VantaSecretsAPI("http://localhost:3000")
    
    @pytest.mark.asyncio
    async def test_scan_projects_success(self, api_client):
        """Test successful project scanning"""
        mock_response = [
            {
                "name": "test-project",
                "confidence": 85,
                "secrets_count": 5,
                "status": "ready",
                "path": "/test/path"
            }
        ]
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response_obj = Mock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None
            
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response_obj
            )
            
            result = await api_client.scan_projects("/test/path")
            assert result == mock_response
            assert len(result) == 1
            assert result[0]["name"] == "test-project"
    
    @pytest.mark.asyncio
    async def test_detect_secrets_success(self, api_client):
        """Test successful secret detection"""
        mock_response = [
            {
                "key": "API_KEY",
                "description": "External API key",
                "confidence": 90
            }
        ]
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response_obj = Mock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None
            
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response_obj
            )
            
            result = await api_client.detect_secrets("test-project", deep=True)
            assert result == mock_response
            assert len(result) == 1
            assert result[0]["key"] == "API_KEY"
    
    @pytest.mark.asyncio
    async def test_export_vault_success(self, api_client):
        """Test successful vault export"""
        mock_response = {"data": "API_KEY=secret_value\nDB_PASSWORD=another_secret"}
        
        with patch('httpx.AsyncClient') as mock_client:
            mock_response_obj = Mock()
            mock_response_obj.json.return_value = mock_response
            mock_response_obj.raise_for_status.return_value = None
            
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                return_value=mock_response_obj
            )
            
            result = await api_client.export_vault("test-project", "env")
            assert result == mock_response["data"]
    
    @pytest.mark.asyncio
    async def test_connection_error_handling(self, api_client):
        """Test connection error handling"""
        with patch('httpx.AsyncClient') as mock_client:
            mock_client.return_value.__aenter__.return_value.post = AsyncMock(
                side_effect=httpx.ConnectError("Connection failed")
            )
            
            with pytest.raises(SystemExit):
                await api_client.scan_projects("/test/path")

class TestCLICommands:
    """Test CLI command functionality"""
    
    @pytest.fixture
    def runner(self):
        return CliRunner()
    
    def test_cli_help(self, runner):
        """Test CLI help command"""
        result = runner.invoke(cli, ['--help'])
        assert result.exit_code == 0
        assert "VANTA Secrets Agent CLI" in result.output
        assert "AI-powered secrets management" in result.output
    
    def test_version_command(self, runner):
        """Test version command"""
        result = runner.invoke(cli, ['version'])
        assert result.exit_code == 0
        assert "VANTA Secrets Agent CLI v1.0.0" in result.output
        assert "Cross-Platform Feature Parity Edition" in result.output
    
    @patch('cli_enhanced.asyncio.run')
    def test_scan_command_success(self, mock_asyncio_run, runner):
        """Test scan command with successful response"""
        mock_asyncio_run.return_value = [
            {
                "name": "test-project",
                "confidence": 85,
                "secrets_count": 5,
                "status": "ready",
                "path": "/test/path"
            }
        ]
        
        result = runner.invoke(cli, ['scan', '--path', '/test/path'])
        assert result.exit_code == 0
        assert "Project Scan Results" in result.output
        assert "test-project" in result.output
    
    @patch('cli_enhanced.asyncio.run')
    def test_scan_command_json_output(self, mock_asyncio_run, runner):
        """Test scan command with JSON output"""
        mock_data = [{"name": "test-project", "confidence": 85}]
        mock_asyncio_run.return_value = mock_data
        
        result = runner.invoke(cli, ['scan', '--output', 'json'])
        assert result.exit_code == 0
        # Should contain JSON output
        assert '"name": "test-project"' in result.output
    
    @patch('cli_enhanced.asyncio.run')
    def test_detect_command_success(self, mock_asyncio_run, runner):
        """Test detect command with successful response"""
        mock_asyncio_run.return_value = [
            {
                "key": "API_KEY",
                "description": "External API key",
                "confidence": 90
            }
        ]
        
        result = runner.invoke(cli, ['detect', '--project', 'test-project', '--auto-add'])
        assert result.exit_code == 0
        assert "AI Secret Detection" in result.output
        assert "Added 1 secrets to vault" in result.output
    
    @patch('cli_enhanced.asyncio.run')
    def test_export_command_success(self, mock_asyncio_run, runner):
        """Test export command with successful response"""
        mock_asyncio_run.return_value = "API_KEY=secret_value\nDB_PASSWORD=another_secret"
        
        result = runner.invoke(cli, ['export', '--project', 'test-project'])
        assert result.exit_code == 0
        assert "Vault Export" in result.output
        assert "Export Data" in result.output
    
    @patch('cli_enhanced.asyncio.run')
    @patch('builtins.input', return_value='y')
    def test_rotate_command_success(self, mock_input, mock_asyncio_run, runner):
        """Test rotate command with successful response"""
        mock_asyncio_run.return_value = {
            "status": "success",
            "rotation_id": "rot_123456"
        }
        
        result = runner.invoke(cli, ['rotate', '--project', 'test-project', '--force'])
        assert result.exit_code == 0
        assert "Secret Rotation" in result.output
        assert "Rotation initiated successfully" in result.output
    
    @patch('cli_enhanced.asyncio.run')
    def test_status_command_success(self, mock_asyncio_run, runner):
        """Test status command with successful response"""
        mock_asyncio_run.return_value = {
            "vault_status": "healthy",
            "active_projects": 3,
            "total_secrets": 15,
            "recent_activity": ["Project scanned", "Secret added"]
        }
        
        result = runner.invoke(cli, ['status'])
        assert result.exit_code == 0
        assert "VANTA System Status" in result.output
        assert "Vault Status: healthy" in result.output
        assert "Active Projects: 3" in result.output
    
    @patch('cli_enhanced.asyncio.run')
    def test_command_with_server_option(self, mock_asyncio_run, runner):
        """Test command with custom server URL"""
        mock_asyncio_run.return_value = []
        
        result = runner.invoke(cli, ['--server', 'http://custom:8080', 'scan'])
        assert result.exit_code == 0
    
    @patch('cli_enhanced.asyncio.run')
    def test_command_with_verbose_option(self, mock_asyncio_run, runner):
        """Test command with verbose output"""
        mock_asyncio_run.return_value = []
        
        result = runner.invoke(cli, ['--verbose', 'scan'])
        assert result.exit_code == 0
        assert "Using server:" in result.output

class TestErrorHandling:
    """Test error handling scenarios"""
    
    @pytest.fixture
    def runner(self):
        return CliRunner()
    
    @patch('cli_enhanced.asyncio.run')
    def test_scan_no_projects_found(self, mock_asyncio_run, runner):
        """Test scan when no projects are found"""
        mock_asyncio_run.return_value = []
        
        result = runner.invoke(cli, ['scan'])
        assert result.exit_code == 0
        assert "No projects found" in result.output
    
    @patch('cli_enhanced.asyncio.run')
    def test_detect_no_secrets_found(self, mock_asyncio_run, runner):
        """Test detect when no secrets are found"""
        mock_asyncio_run.return_value = []
        
        result = runner.invoke(cli, ['detect', '--project', 'test-project'])
        assert result.exit_code == 0
        assert "No secrets detected" in result.output
    
    @patch('cli_enhanced.asyncio.run')
    def test_export_no_data(self, mock_asyncio_run, runner):
        """Test export when no data is available"""
        mock_asyncio_run.return_value = ""
        
        result = runner.invoke(cli, ['export', '--project', 'test-project'])
        assert result.exit_code == 0
        assert "No data to export" in result.output
    
    @patch('cli_enhanced.asyncio.run')
    def test_api_error_handling(self, mock_asyncio_run, runner):
        """Test API error handling"""
        mock_asyncio_run.side_effect = Exception("API Error")
        
        result = runner.invoke(cli, ['scan'])
        assert result.exit_code == 1
        assert "Scan failed" in result.output

class TestIntegration:
    """Integration tests for CLI functionality"""
    
    @pytest.fixture
    def runner(self):
        return CliRunner()
    
    @pytest.mark.integration
    def test_full_workflow_simulation(self, runner):
        """Test a complete workflow simulation"""
        with patch('cli_enhanced.asyncio.run') as mock_asyncio_run:
            # Mock scan response
            mock_asyncio_run.return_value = [
                {
                    "name": "test-project",
                    "confidence": 85,
                    "secrets_count": 5,
                    "status": "ready",
                    "path": "/test/path"
                }
            ]
            
            # Test scan
            result = runner.invoke(cli, ['scan', '--path', '/test/path'])
            assert result.exit_code == 0
            assert "test-project" in result.output
            
            # Mock detect response
            mock_asyncio_run.return_value = [
                {
                    "key": "API_KEY",
                    "description": "External API key",
                    "confidence": 90
                }
            ]
            
            # Test detect
            result = runner.invoke(cli, ['detect', '--project', 'test-project', '--auto-add'])
            assert result.exit_code == 0
            assert "Added 1 secrets" in result.output
            
            # Mock export response
            mock_asyncio_run.return_value = "API_KEY=secret_value"
            
            # Test export
            result = runner.invoke(cli, ['export', '--project', 'test-project'])
            assert result.exit_code == 0
            assert "API_KEY=secret_value" in result.output

if __name__ == '__main__':
    pytest.main([__file__, '-v']) 