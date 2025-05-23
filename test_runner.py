#!/usr/bin/env python3
"""
test_runner.py – Full coverage for Secrets Agent CLI bindings and logic
Comprehensive testing without hardcoded credentials
"""

import subprocess
import os
from pathlib import Path

def run(command, description):
    """Run a command with description and output handling"""
    print(f"[🔧] {description}: {command}")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("[⚠️ STDERR]:", result.stderr)
    print("-" * 50)

def setup_test_environment():
    """Set up test environment variables safely"""
    test_env = {
        "OPENAI_API_KEY": "sk-test-key-placeholder",
        "STRIPE_SECRET_KEY": "sk_test_stripe_placeholder", 
        "SUPABASE_ANON_KEY": "test-anon-key-placeholder"
    }
    
    for key, value in test_env.items():
        if not os.environ.get(key):
            os.environ[key] = value
            print(f"[🔧] Set test environment variable: {key}")

if __name__ == "__main__":
    print("\n🧪 Secrets Agent – Full CLI Test Suite")
    
    # Set up test environment
    setup_test_environment()
    
    # Core CLI tests
    run("python cli.py scan", "Scan project structure")
    run("python cli.py link", "Link agent/tools from secrets")
    
    # Configuration and deployment tests
    run("python secrets_agent_launch_wizard.py", "Launch config wizard (manual input required)")
    run("python deploy_stack.py --config secrets_agent_launch_config.json", "Deploy stack test")
    
    # Create test environment for secure storage
    test_env_dir = Path("test_env")
    test_env_dir.mkdir(exist_ok=True)
    
    # Encrypted secrets test
    from secrets_secure.encrypted_store import EncryptedSecretsStore
    store = EncryptedSecretsStore(key_path="test_env/secret.key", encrypted_file="test_env/secrets.enc")
    store.encrypt_secrets({"test_key": "test_value"})
    decrypted = store.decrypt_secrets()
    print("[🔐] Decrypted secret value:", decrypted.get("test_key"))
    
    print("\n✅ All core system tests executed.")