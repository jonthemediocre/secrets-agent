import base64
import json
from pathlib import Path
from cryptography.fernet import Fernet

class EncryptedSecretsStore:
    def __init__(self, key_path='secret.key', encrypted_file='secrets.enc'):
        self.key_path = Path(key_path)
        self.encrypted_file = Path(encrypted_file)
        self.key = self.load_or_create_key()
        self.fernet = Fernet(self.key)

    def load_or_create_key(self):
        if self.key_path.exists():
            return self.key_path.read_bytes()
        key = Fernet.generate_key()
        self.key_path.write_bytes(key)
        return key

    def encrypt_secrets(self, secrets_dict):
        data = json.dumps(secrets_dict).encode()
        encrypted = self.fernet.encrypt(data)
        self.encrypted_file.write_bytes(encrypted)

    def decrypt_secrets(self):
        if not self.encrypted_file.exists():
            raise FileNotFoundError("Encrypted secrets not found.")
        decrypted = self.fernet.decrypt(self.encrypted_file.read_bytes())
        return json.loads(decrypted.decode())