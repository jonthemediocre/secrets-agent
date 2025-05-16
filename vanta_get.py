# vanta_get.py – Secure environment accessor for Secrets Agent

import os
from secrets_secure.encrypted_store import EncryptedSecretsStore

store = EncryptedSecretsStore()
SECRETS = store.decrypt_secrets()

def get(key, default=None):
    return SECRETS.get(key, default)

def patch_os_env():
    os.getenv = get