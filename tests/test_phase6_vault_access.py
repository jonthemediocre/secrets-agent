"""
Tests for Phase 6: VaultAccessAgent, Token Generation, and CLI Integration.
"""

import pytest
import asyncio
import os
import subprocess
from unittest.mock import patch, MagicMock, AsyncMock
from pathlib import Path
import shutil
import time

# Add project root to sys.path to allow importing project modules
import sys
BASE_DIR = Path(__file__).resolve().parent.parent
sys.path.append(str(BASE_DIR))

# Import modules to be tested
from agents.VaultTokenAgent import VaultTokenAgent
from auth.TokenValidator import TokenValidator, TokenValidationResult
from agents.VaultAccessAgent import VaultAccessAgent
from cli_enhanced import VantaSecretsAPI, cli as vanta_cli # For CLI tests
from click.testing import CliRunner

# --- Constants and Test Configuration ---
TEST_JWT_SECRET_KEY_ENV_VAR = "VANTA_TEST_JWT_SECRET_KEY"
TEST_JWT_SECRET_KEY = "test-super-secret-key-for-phase6-testing"
TEST_SOPS_BASE_PATH_ENV_VAR = "VANTA_TEST_SOPS_FILES_PATH"
TEST_SOPS_BASE_PATH = BASE_DIR / "tests" / "test_sops_data_phase6"

# --- Fixtures ---

@pytest.fixture(scope="module")
def event_loop():
    """Create an instance of the default event loop for each test module."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()

@pytest.fixture(scope="module", autouse=True)
def setup_test_environment_variables():
    """Set up environment variables for JWT secret and SOPS path for the test module."""
    original_jwt_secret = os.environ.get(TEST_JWT_SECRET_KEY_ENV_VAR)
    original_sops_path = os.environ.get(TEST_SOPS_BASE_PATH_ENV_VAR)
    
    os.environ[TEST_JWT_SECRET_KEY_ENV_VAR] = TEST_JWT_SECRET_KEY
    os.environ[TEST_SOPS_BASE_PATH_ENV_VAR] = str(TEST_SOPS_BASE_PATH)
    
    # Create dummy SOPS dir
    if TEST_SOPS_BASE_PATH.exists():
        shutil.rmtree(TEST_SOPS_BASE_PATH)
    TEST_SOPS_BASE_PATH.mkdir(parents=True, exist_ok=True)
    
    yield
    
    # Teardown: Remove dummy SOPS dir and restore original env vars
    if TEST_SOPS_BASE_PATH.exists():
        shutil.rmtree(TEST_SOPS_BASE_PATH)
    if original_jwt_secret is None:
        del os.environ[TEST_JWT_SECRET_KEY_ENV_VAR]
    else:
        os.environ[TEST_JWT_SECRET_KEY_ENV_VAR] = original_jwt_secret
    if original_sops_path is None:
        del os.environ[TEST_SOPS_BASE_PATH_ENV_VAR]
    else:
        os.environ[TEST_SOPS_BASE_PATH_ENV_VAR] = original_sops_path

@pytest.fixture
def token_agent_config():
    return {
        'jwt_secret_key_env_var': TEST_JWT_SECRET_KEY_ENV_VAR,
        'default_issuer': 'TestVantaVaultTokenAgent',
        'default_audience': 'TestVantaVaultAPI',
        'max_ttl_minutes': 120,
        'default_ttl_minutes': 30
    }

@pytest.fixture
def token_validator_config():
    return {
        'jwt_secret_key_env_var': TEST_JWT_SECRET_KEY_ENV_VAR,
        'expected_issuer': 'TestVantaVaultTokenAgent',
        'expected_audience': 'TestVantaVaultAPI'
    }

@pytest.fixture
def vault_access_agent_config(token_validator_config):
    return {
        'token_validator_config': token_validator_config,
        'logger_config': {},
        'sops_files_base_path': str(TEST_SOPS_BASE_PATH) 
    }

@pytest.fixture
def vault_token_agent(token_agent_config):
    return VaultTokenAgent(config=token_agent_config)

@pytest.fixture
def token_validator(token_validator_config):
    return TokenValidator(config=token_validator_config)

@pytest.fixture
def vault_access_agent(vault_access_agent_config):
    # Ensure the mock logger is used here to prevent actual file writes or console spam
    with patch('agents.VaultAccessAgent.SecretFetchLogger') as MockLogger:
        mock_logger_instance = MockLogger.return_value
        mock_logger_instance.log_access_attempt = AsyncMock()
        agent = VaultAccessAgent(config=vault_access_agent_config)
        agent.logger = mock_logger_instance # Explicitly set the mocked logger
        yield agent

@pytest.fixture
def cli_runner():
    return CliRunner()

# --- Helper Functions for Tests ---

def create_dummy_sops_file(env: str, key: str, value: str):
    """Creates a dummy SOPS-encrypted file. MOCKS actual encryption.
       For testing, we just need the sops CLI to think it's decrypting.
       The actual content here won't be encrypted by a real key.
       We rely on mocking subprocess.communicate for sops calls in unit tests for _fetch_and_decrypt_secret.
    """
    file_path = TEST_SOPS_BASE_PATH / f"{env}.enc.yaml"
    # This is NOT how SOPS files are structured, but sops --extract will be mocked.
    # For integration tests where sops CLI might be called, this file needs to exist.
    # The content is less important if we are mocking the sops call itself.
    # If we were to let sops run, it would fail on this dummy file.
    dummy_content = f"{key}: {value}\n" # Simplified, not actual SOPS format
    with open(file_path, "w") as f:
        f.write(f"# Dummy SOPS file for testing {file_path.name}\n")
        f.write(dummy_content)
    print(f"Created dummy SOPS file: {file_path} with {key}: {value}")
    return file_path

# --- Unit Tests: VaultTokenAgent ---

@pytest.mark.asyncio
async def test_vault_token_agent_generate_basic_token(vault_token_agent, token_validator):
    token = await vault_token_agent.generate_token(
        subject="test_user",
        environment="dev",
        key_pattern="DEV_DB_*")
    assert token is not None
    assert isinstance(token, str)
    
    # Validate structure (very basic check, relies on TokenValidator tests for full validation)
    validation_result = await token_validator.validate_token_for_access(token, "dev", "DEV_DB_PASSWORD")
    assert validation_result.is_valid
    assert validation_result.decoded_token['sub'] == "test_user"
    assert validation_result.decoded_token['scope']['environment'] == "dev"

@pytest.mark.asyncio
async def test_vault_token_agent_ttl_enforcement(vault_token_agent):
    with pytest.raises(ValueError, match=r"TTL must be between 1 and .* minutes"): # max_ttl_minutes is 120
        await vault_token_agent.generate_token(
            subject="ttl_test", environment="test", key_pattern="*", ttl_minutes=0)
    
    with pytest.raises(ValueError, match=r"TTL must be between 1 and .* minutes"): # max_ttl_minutes is 120
        await vault_token_agent.generate_token(
            subject="ttl_test", environment="test", key_pattern="*", ttl_minutes=121)

# --- Unit Tests: TokenValidator ---

@pytest.mark.asyncio
async def test_token_validator_valid_token(vault_token_agent, token_validator):
    token = await vault_token_agent.generate_token(
        subject="validator_user", environment="prod", key_pattern="API_KEY", ttl_minutes=5)
    result = await token_validator.validate_token_for_access(token, "prod", "API_KEY")
    assert result.is_valid
    assert result.error_message is None
    assert result.decoded_token is not None
    assert result.subject == "validator_user"

@pytest.mark.asyncio
async def test_token_validator_expired_token(vault_token_agent, token_validator):
    token = await vault_token_agent.generate_token(
        subject="expired_user", environment="prod", key_pattern="API_KEY", ttl_minutes=-1 # Already expired
    )
    # Need to wait for a moment for time to pass if ttl is very short positive, but -1 ensures expiry
    # No wait needed if using a negative TTL for generation in VaultTokenAgent (if it allows, current doesn't)
    # Our current VaultTokenAgent raises ValueError for ttl <=0. Let's mock datetime for precise expiry.

    with patch('jwt.decode') as mock_decode:
        mock_decode.side_effect = jwt.ExpiredSignatureError("Token has expired")
        result = await token_validator.validate_token_for_access(token, "prod", "API_KEY")
        assert not result.is_valid
        assert "expired" in result.error_message.lower()
        assert result.status_code == 401

@pytest.mark.asyncio
async def test_token_validator_scope_mismatch_env(vault_token_agent, token_validator):
    token = await vault_token_agent.generate_token(
        subject="scope_test", environment="dev", key_pattern="*", ttl_minutes=5)
    result = await token_validator.validate_token_for_access(token, "production", "ANY_KEY") # Requesting prod
    assert not result.is_valid
    assert "environment" in result.error_message
    assert result.status_code == 403

@pytest.mark.asyncio
async def test_token_validator_scope_mismatch_key(vault_token_agent, token_validator):
    token = await vault_token_agent.generate_token(
        subject="scope_test", environment="dev", key_pattern="DATABASE_*", ttl_minutes=5)
    result = await token_validator.validate_token_for_access(token, "dev", "API_KEY_NOT_IN_DB_SCOPE")
    assert not result.is_valid
    assert "pattern" in result.error_message
    assert result.status_code == 403

@pytest.mark.asyncio
async def test_token_validator_usage_limit(vault_token_agent, token_validator):
    token_jti = "test-jti-for-usage-limit"
    with patch('uuid.uuid4', return_value=MagicMock(hex=token_jti.replace('-', ''), __str__=lambda: token_jti)):
        token = await vault_token_agent.generate_token(
            subject="usage_limit_user", environment="test", key_pattern="*", usage_limit=1, ttl_minutes=5)

    # First use: should be valid
    result1 = await token_validator.validate_token_for_access(token, "test", "ANY_KEY")
    assert result1.is_valid
    await token_validator.increment_usage_count(result1.jti)

    # Second use: should be invalid
    result2 = await token_validator.validate_token_for_access(token, "test", "ANY_KEY")
    assert not result2.is_valid
    assert "usage limit exceeded" in result2.error_message.lower()
    assert result2.status_code == 403

# --- Unit Tests: VaultAccessAgent._fetch_and_decrypt_secret ---

@pytest.mark.asyncio
@patch('asyncio.create_subprocess_exec')
async def test_fetch_decrypt_success(mock_subprocess_exec, vault_access_agent):
    # Setup mock for subprocess
    mock_process = AsyncMock()
    mock_process.communicate = AsyncMock(return_value=(b'"decrypted_value"\n', b'')) # SOPS output includes quotes for string
    mock_process.returncode = 0
    mock_subprocess_exec.return_value = mock_process

    create_dummy_sops_file("unittest", "MY_KEY", "decrypted_value") # Ensure file exists

    result = await vault_access_agent._fetch_and_decrypt_secret("unittest", "MY_KEY")
    assert result == "decrypted_value"
    mock_subprocess_exec.assert_called_once()
    args, _ = mock_subprocess_exec.call_args
    assert "sops" in args
    assert "--extract" in args
    assert "['MY_KEY']" in args
    assert str(TEST_SOPS_BASE_PATH / "unittest.enc.yaml") in args

@pytest.mark.asyncio
@patch('asyncio.create_subprocess_exec')
async def test_fetch_decrypt_key_not_found_in_sops(mock_subprocess_exec, vault_access_agent):
    mock_process = AsyncMock()
    mock_process.communicate = AsyncMock(return_value=(b'', b'sops_stderr: DECRYPTION_ERROR decrypt_data: key not found in tree\n'))
    mock_process.returncode = 1 # SOPS error code
    mock_subprocess_exec.return_value = mock_process

    create_dummy_sops_file("unittest", "EXISTING_KEY", "some_value") # File exists

    result = await vault_access_agent._fetch_and_decrypt_secret("unittest", "NON_EXISTENT_KEY")
    assert result is None

@pytest.mark.asyncio
@patch('asyncio.create_subprocess_exec')
async def test_fetch_decrypt_sops_cli_error(mock_subprocess_exec, vault_access_agent):
    mock_process = AsyncMock()
    mock_process.communicate = AsyncMock(return_value=(b'', b'sops_stderr: some other sops error\n'))
    mock_process.returncode = 1
    mock_subprocess_exec.return_value = mock_process

    create_dummy_sops_file("unittest", "A_KEY", "a_value")

    with pytest.raises(Exception, match="SOPS decryption error: sops_stderr: some other sops error"):
        await vault_access_agent._fetch_and_decrypt_secret("unittest", "A_KEY")

@pytest.mark.asyncio
async def test_fetch_decrypt_sops_file_not_found(vault_access_agent):
    # Ensure file does NOT exist for this environment/key
    missing_env_file = TEST_SOPS_BASE_PATH / "nonexistent_env.enc.yaml"
    if missing_env_file.exists(): missing_env_file.unlink()

    result = await vault_access_agent._fetch_and_decrypt_secret("nonexistent_env", "ANY_KEY")
    assert result is None

@pytest.mark.asyncio
@patch('asyncio.create_subprocess_exec', side_effect=FileNotFoundError("sops command not found"))
async def test_fetch_decrypt_sops_command_not_found(mock_subprocess_exec, vault_access_agent):
    create_dummy_sops_file("unittest", "CMD_KEY", "cmd_value")
    with pytest.raises(Exception, match="`sops` command not found"):
        await vault_access_agent._fetch_and_decrypt_secret("unittest", "CMD_KEY")

# --- Integration Tests: VaultAccessAgent.get_secret (includes TokenValidator and mocked SOPS) ---

@pytest.mark.asyncio
async def test_get_secret_full_flow_success(vault_token_agent, vault_access_agent):
    token = await vault_token_agent.generate_token(
        subject="full_flow_user", environment="prod_int", key_pattern="INTEGRATION_KEY", ttl_minutes=5)
    
    create_dummy_sops_file("prod_int", "INTEGRATION_KEY", "integration_secret_value")
    
    with patch.object(vault_access_agent, '_fetch_and_decrypt_secret', 
                      AsyncMock(return_value="integration_secret_value_mocked")) as mock_decrypt:
        value, status, err = await vault_access_agent.get_secret(
            token_string=f"Bearer {token}",
            requested_environment="prod_int",
            requested_key="INTEGRATION_KEY",
            client_ip="127.0.0.1"
        )
        assert status == 200
        assert err is None
        assert value == "integration_secret_value_mocked"
        mock_decrypt.assert_called_once_with("prod_int", "INTEGRATION_KEY")
        # Check logger was called for success
        vault_access_agent.logger.log_access_attempt.assert_any_call(
            jti=pytest.is_not(None), subject="full_flow_user", 
            requested_env="prod_int", requested_key="INTEGRATION_KEY",
            status_code=200, outcome="SUCCESS", client_ip="127.0.0.1"
        )

@pytest.mark.asyncio
async def test_get_secret_token_invalid(vault_access_agent):
    value, status, err = await vault_access_agent.get_secret(
        token_string="Bearer invalid.token.string",
        requested_environment="any_env",
        requested_key="any_key",
        client_ip="127.0.0.1"
    )
    assert status == 401 # Or whatever TokenValidator returns for malformed
    assert err is not None
    assert value is None
    vault_access_agent.logger.log_access_attempt.assert_any_call(
        jti=None, # Or some parse attempt from token
        subject=None, # Or some parse attempt from token
        requested_env="any_env", requested_key="any_key",
        status_code=status, outcome="TOKEN_VALIDATION_FAILED", 
        error_message=err, client_ip="127.0.0.1"
    )

@pytest.mark.asyncio
async def test_get_secret_sops_decrypt_fails_in_flow(vault_token_agent, vault_access_agent):
    token = await vault_token_agent.generate_token(
        subject="sops_fail_user", environment="sops_env", key_pattern="FAIL_KEY", ttl_minutes=5)
    
    with patch.object(vault_access_agent, '_fetch_and_decrypt_secret', 
                      AsyncMock(side_effect=Exception("Mocked SOPS Internal Error"))) as mock_decrypt:
        value, status, err = await vault_access_agent.get_secret(
            token_string=f"Bearer {token}",
            requested_environment="sops_env",
            requested_key="FAIL_KEY",
            client_ip="127.0.0.1"
        )
        assert status == 500
        assert "Internal error: Mocked SOPS Internal Error" in err
        assert value is None
        mock_decrypt.assert_called_once_with("sops_env", "FAIL_KEY")
        vault_access_agent.logger.log_access_attempt.assert_any_call(
            jti=pytest.is_not(None), subject="sops_fail_user", 
            requested_env="sops_env", requested_key="FAIL_KEY",
            status_code=500, outcome="DECRYPTION_ERROR", 
            error_message="Internal error: Mocked SOPS Internal Error", client_ip="127.0.0.1"
        )

# --- CLI Tests ---

@pytest.fixture
def mock_api_client(mocker):
    mock_client = MagicMock(spec=VantaSecretsAPI)
    mock_client.generate_vault_token = AsyncMock()
    mock_client.get_vault_secret = AsyncMock()
    mocker.patch('cli_enhanced.VantaSecretsAPI', return_value=mock_client)
    return mock_client

def test_cli_token_generate_success(cli_runner, mock_api_client):
    mock_api_client.generate_vault_token.return_value = {
        "access_token": "mocked.jwt.token",
        "token_type": "Bearer",
        "expires_in": 3600,
        "scope_details": {"environment": "dev", "key_pattern": "*", "permissions": ["read"]}
    }
    result = cli_runner.invoke(vanta_cli, [
        'token', 'generate', 
        '--subject', 'cli_user', 
        '--environment', 'dev', 
        '--key-pattern', '*'
    ])
    assert result.exit_code == 0
    assert "mocked.jwt.token" in result.output
    mock_api_client.generate_vault_token.assert_called_once_with({
        "subject": "cli_user",
        "environment": "dev",
        "key_pattern": "*"
    })

def test_cli_token_generate_api_error(cli_runner, mock_api_client):
    # Simulate an HTTP error by having _make_request (which is called by generate_vault_token)
    # in the real VantaSecretsAPI print an error and sys.exit(1).
    # Here, we mock generate_vault_token to raise an exception like httpx.HTTPStatusError
    # This assumes _make_request in CLI correctly handles it by printing and exiting.
    
    # To properly test sys.exit, we need to be careful. 
    # The CliRunner handles this by catching SystemExit.
    mock_api_client.generate_vault_token.side_effect = Exception("Simulated API Internal Error")

    result = cli_runner.invoke(vanta_cli, [
        'token', 'generate', 
        '--subject', 'cli_user', 
        '--environment', 'dev', 
        '--key-pattern', '*'
    ])
    assert result.exit_code != 0 # Should be non-zero due to sys.exit in API client or main error handler
    assert "Error generating token: Simulated API Internal Error" in result.output


def test_cli_run_with_secrets_env_injection(cli_runner, mock_api_client):
    mock_api_client.generate_vault_token.return_value = {"access_token": "temp.cli.token"}
    mock_api_client.get_vault_secret.side_effect = [
        {"value": "test_db_user"}, # For DB_USER
        {"value": "test_db_pass"}  # For DB_PASSWORD
    ]
    
    # Create a temporary script to be called by run-with-secrets
    temp_script_path = Path(TEST_SOPS_BASE_PATH) / "print_env.py"
    with open(temp_script_path, "w") as f:
        f.write("import os\n")
        f.write("print(f\"DB_USER_FROM_ENV={os.environ.get('DB_USER')}\")\n")
        f.write("print(f\"DB_PASSWORD_FROM_ENV={os.environ.get('DB_PASSWORD')}\")\n")

    # The command_with_args in cli_enhanced.py uses nargs=-1, type=click.UNPROCESSED
    # So, when invoking, command parts should be separate strings.
    command_to_run = [sys.executable, str(temp_script_path)]
    
    result = cli_runner.invoke(vanta_cli, [
        'run-with-secrets',
        '--environment', 'testenv',
        '--key-pattern', 'DB_*', # Will resolve to DB_USER, DB_PASSWORD in current stub
        '--inject-as', 'env',
        '--' # Separator for command
    ] + command_to_run)

    assert result.exit_code == 0, f"CLI run-with-secrets failed: {result.output}"
    assert "DB_USER_FROM_ENV=test_db_user" in result.output
    assert "DB_PASSWORD_FROM_ENV=test_db_pass" in result.output
    
    mock_api_client.generate_vault_token.assert_called_once()
    # Check get_vault_secret calls - order might matter or use any_order if available
    # Based on current cli_enhanced.py, DB_* simulation fetches DB_USER then DB_PASSWORD
    mock_api_client.get_vault_secret.assert_any_call("testenv", "DB_USER", "temp.cli.token")
    mock_api_client.get_vault_secret.assert_any_call("testenv", "DB_PASSWORD", "temp.cli.token")
    assert mock_api_client.get_vault_secret.call_count == 2

    if temp_script_path.exists(): temp_script_path.unlink()


def test_cli_run_with_secrets_file_injection(cli_runner, mock_api_client):
    mock_api_client.generate_vault_token.return_value = {"access_token": "temp.file.token"}
    mock_api_client.get_vault_secret.return_value = {"value": "secret_for_file"}

    temp_script_path = Path(TEST_SOPS_BASE_PATH) / "read_secret_file.py"
    with open(temp_script_path, "w") as f:
        f.write("import os\n")
        f.write("secrets_file = os.environ.get('VANTA_SECRETS_FILE')\n")
        f.write("content = ''\n")
        f.write("if secrets_file and os.path.exists(secrets_file):\n")
        f.write("    with open(secrets_file, 'r') as sf:\n")
        f.write("        content = sf.read()\n")
        f.write("print(f\"FILE_CONTENT={content.strip().replace('\n', ';')}\")\n") # Replace newline for easier assert

    command_to_run = [sys.executable, str(temp_script_path)]
    result = cli_runner.invoke(vanta_cli, [
        'run-with-secrets',
        '--environment', 'testfileenv',
        '--key-pattern', 'FILE_KEY', # Will fetch one key: FILE_KEY
        '--inject-as', 'file',
        '--'
    ] + command_to_run)

    assert result.exit_code == 0, f"CLI run-with-secrets (file) failed: {result.output}"
    assert "FILE_CONTENT=FILE_KEY='secret_for_file'" in result.output
    mock_api_client.get_vault_secret.assert_called_once_with("testfileenv", "FILE_KEY", "temp.file.token")

    if temp_script_path.exists(): temp_script_path.unlink()

# TODO: Add more tests:
# - TokenValidator: wrong issuer/audience, nbf check
# - VaultAccessAgent: token invalid, secret not found after auth (SOPS returns None)
# - CLI: various error conditions, different key patterns for run-with-secrets if refined.

"""
Note on testing SOPS actual decryption:
To test the true SOPS decryption end-to-end without mocks, you would need:
1. SOPS CLI installed in the test environment.
2. A GPG key (or KMS, etc.) set up for SOPS that the test environment can use for decryption.
3. Pre-encrypted SOPS files using that key.
This setup is complex for automated CI tests. Mocking subprocess.communicate for sops calls
is a common approach for unit/integration testing the parts around SOPS interaction.
End-to-end tests with real SOPS would typically be separate, larger-scale tests.
""" 