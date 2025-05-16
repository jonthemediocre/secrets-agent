"""
secret_broker.py — Part of MetaFabric Production v1.1.0
Auto-generated under Domino Mode
"""

import yaml
import os
import getpass
import hashlib
from pathlib import Path
from cryptography.fernet import Fernet
import base64

class SecretBroker:
    def __init__(self, secrets_path: Path, secure=False, password=None):
        self.secure = secure
        
        if secure:
            # Use encrypted secrets
            self.secure_dir = Path("secrets_secure")
            if not self.secure_dir.exists() or not (self.secure_dir / "config.yaml").exists():
                raise FileNotFoundError(f"Secure storage not set up. Run setup_secure_secrets.py first")
            
            # Load config
            with open(self.secure_dir / "config.yaml", "r") as f:
                self.config = yaml.safe_load(f)
            
            # Get password from input if not provided
            if not password:
                if os.environ.get('MASTER_PASSWORD'):
                    password = os.environ.get('MASTER_PASSWORD')
                else:
                    password = getpass.getpass("Enter master password: ")
            
            # Verify the password
            salt = self.config['salt']
            key_hash = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode(),
                bytes.fromhex(salt),
                100000
            ).hex()
            
            if key_hash != self.config['key_hash']:
                raise ValueError("Invalid master password")
            
            # Generate the encryption key from the password
            encryption_key = hashlib.pbkdf2_hmac(
                'sha256',
                password.encode(),
                bytes.fromhex(salt),
                100000,
                dklen=32
            )
            
            self.cipher_suite = Fernet(base64.b64encode(encryption_key))
            
            # Load encrypted secrets
            encrypted_path = self.secure_dir / "encrypted_secrets.yaml"
            if not encrypted_path.exists():
                raise FileNotFoundError(f"Encrypted secrets file not found: {encrypted_path}")
            
            with open(encrypted_path, "r") as f:
                encrypted_data = yaml.safe_load(f)
            
            # Decrypt secrets
            self.secrets = {}
            for key, value in encrypted_data.items():
                try:
                    decrypted_value = self.cipher_suite.decrypt(value.encode()).decode()
                    self.secrets[key] = decrypted_value
                except Exception as e:
                    print(f"Error decrypting {key}: {e}")
        else:
            # Use plaintext secrets
            if not secrets_path.exists():
                raise FileNotFoundError(f"Secrets file not found: {secrets_path}")
            
            with open(secrets_path, "r") as f:
                self.secrets = yaml.safe_load(f)
    
    def resolve(self, keys):
        result = {}
        for key in keys:
            result[key] = self.secrets.get(key, "")
        return result
    
    def add_secret(self, key, value):
        self.secrets[key] = value
        
        if self.secure:
            # Load existing encrypted secrets
            encrypted_path = self.secure_dir / "encrypted_secrets.yaml"
            if encrypted_path.exists():
                with open(encrypted_path, "r") as f:
                    encrypted_data = yaml.safe_load(f) or {}
            else:
                encrypted_data = {}
            
            # Encrypt and add the new secret
            encrypted_value = self.cipher_suite.encrypt(value.encode()).decode()
            encrypted_data[key] = encrypted_value
            
            # Save the updated encrypted secrets
            with open(encrypted_path, "w") as f:
                yaml.dump(encrypted_data, f)
        else:
            # Save to plaintext file
            with open("secrets.yaml", "w") as f:
                yaml.dump(self.secrets, f)
        
        return True