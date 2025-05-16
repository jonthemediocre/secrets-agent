#!/usr/bin/env python3
"""
setup_secure_secrets_v2.py - Set up secure encrypted secrets storage with improved handling
"""

import os
import sys
import getpass
import argparse
from pathlib import Path
import yaml
import secrets
import hashlib
import base64
from cryptography.fernet import Fernet

def generate_key():
    """Generate a secure encryption key"""
    return Fernet.generate_key().decode()

def create_secure_storage(master_password, secrets_file="secrets.yaml", auto_yes=False):
    """Set up encrypted secrets storage with a master password"""
    # Create secure directory if it doesn't exist
    secure_dir = Path("secrets_secure")
    secure_dir.mkdir(exist_ok=True)
    
    # Generate salt for password hash
    salt = secrets.token_hex(16)
    
    # Hash the master password
    key_hash = hashlib.pbkdf2_hmac(
        'sha256',
        master_password.encode(),
        bytes.fromhex(salt),
        100000
    ).hex()
    
    # Generate a Fernet key from the master password
    encryption_key = hashlib.pbkdf2_hmac(
        'sha256',
        master_password.encode(),
        bytes.fromhex(salt),
        100000,
        dklen=32
    )
    
    fernet_key = base64.b64encode(encryption_key).decode()
    cipher_suite = Fernet(base64.b64encode(encryption_key))
    
    # Create config file
    config = {
        'fernet_key': fernet_key,
        'key_hash': key_hash,
        'salt': salt
    }
    
    with open(secure_dir / "config.yaml", "w") as f:
        yaml.dump(config, f)
    
    # Create README
    readme = """# Secure Secrets Storage

This directory contains encrypted secrets that can only be accessed with the master password.

DO NOT edit these files directly.
Use the SecretBroker API to access and modify secrets.
"""
    
    with open(secure_dir / "README.md", "w") as f:
        f.write(readme)
    
    # Encrypt existing secrets if available
    encrypted_secrets = {}
    
    if os.path.exists(secrets_file):
        with open(secrets_file, "r") as f:
            secrets_data = yaml.safe_load(f) or {}
        
        # Encrypt each secret
        for key, value in secrets_data.items():
            encrypted_value = cipher_suite.encrypt(str(value).encode()).decode()
            encrypted_secrets[key] = encrypted_value
        
        # Save encrypted secrets
        with open(secure_dir / "encrypted_secrets.yaml", "w") as f:
            yaml.dump(encrypted_secrets, f)
        
        print(f"✅ Successfully encrypted {len(secrets_data)} secrets")
        
        # Ask to backup the original file
        backup = "y" if auto_yes else input("Remove original unencrypted secrets.yaml? (y/n): ")
        if backup.lower() == 'y':
            backup_file = f"{secrets_file}.bak"
            if os.path.exists(backup_file):
                os.remove(backup_file)
                print(f"Removed existing backup file: {backup_file}")
            os.rename(secrets_file, backup_file)
            print(f"Renamed {secrets_file} to {backup_file}")
    else:
        # Create empty encrypted secrets file
        with open(secure_dir / "encrypted_secrets.yaml", "w") as f:
            yaml.dump({}, f)
        
        print("⚠️ No secrets.yaml found. Created empty encrypted secrets store.")
    
    print(f"✅ Secure storage set up successfully with master password.")
    print(f"❗ IMPORTANT: Store your master password securely. It cannot be recovered if lost.")

def main():
    """Main function"""
    parser = argparse.ArgumentParser(description='Set up secure encrypted secrets storage')
    parser.add_argument('--password', help='Master password (optional, will prompt if not provided)')
    parser.add_argument('--auto-yes', '-y', action='store_true', help='Automatically answer yes to prompts')
    args = parser.parse_args()
    
    password = args.password
    if not password:
        # Get master password from stdin
        password = getpass.getpass("Enter a strong master password: ")
        password_confirm = getpass.getpass("Confirm password: ")
        
        if password != password_confirm:
            print("❌ Passwords do not match.")
            sys.exit(1)
    
    create_secure_storage(password, auto_yes=args.auto_yes)

if __name__ == "__main__":
    main() 