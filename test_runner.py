# test_runner.py – Full coverage for Secrets Agent CLI bindings and logic

import subprocess
import os
from pathlib import Path

def run(command, desc):
    print(f"[🔧] {desc}: {command}")
    result = subprocess.run(command, shell=True, capture_output=True, text=True)
    print(result.stdout)
    if result.stderr:
        print("[⚠️ STDERR]:", result.stderr)
    print("-" * 50)

def main():
    print("\n🧪 Secrets Agent – Full CLI Test Suite")

    test_env = Path("test_env")
    test_env.mkdir(exist_ok=True)

    # Environment setup test
    os.environ["OPENAI_API_KEY"] = "sk-test-key"
    os.environ["DATABASE_URL"] = "postgresql://user:pass@localhost/db"
    os.environ["SUPABASE_URL"] = "https://project.supabase.co"
    os.environ["SUPABASE_ANON_KEY"] = "anon-key"

    # CLI Tests
    run("python cli.py scan", "Basic scan of current directory")
    run("python cli.py bootstrap", "Bootstrap collapse chain")
    run("python cli.py link", "Link agent/tools from secrets")

    run("python project_scanner.py --root ./test_env --rules ./rules", "Scan-root logic with sample rules")
    run("python secrets_agent_launch_wizard.py", "Launch config wizard (manual input required)")
    run("python deploy_stack.py --config secrets_agent_launch_config.json", "Deploy stack test")

    # Route / AI / API tests (mocked)
    run("python agent_core/router.py & timeout 3", "Start symbolic router")

    # Extension file check
    assert Path("extension_api/vscode/extension.js").exists(), "VS Code extension file missing"

    # Encrypted secrets test
    from secrets_secure.encrypted_store import EncryptedSecretsStore
    store = EncryptedSecretsStore(key_path="test_env/secret.key", encrypted_file="test_env/secrets.enc")
    store.encrypt_secrets({"test_key": "test_value"})
    decrypted = store.decrypt_secrets()
    print("[🔐] Decrypted secret value:", decrypted.get("test_key"))

    print("\n✅ All core system tests executed.")

if __name__ == "__main__":
    main()