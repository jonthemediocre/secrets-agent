#!/bin/bash
set -e

SECRETS=(
  "secrets/test_secret.yaml",
  "secrets/app.secrets.yaml",
  "secrets/app.secrets.dev.yaml",
  "secrets/app.secrets.stage.yaml",
  "secrets/app.secrets.prod.yaml"
)

for file in "${SECRETS[@]}"; do
  echo "🔍 Decrypting $file..."
  if sops -d "$file" >/dev/null; then
    echo "✅ Success"
  else
    echo "❌ Failed to decrypt $file"
    exit 1
  fi
done

echo -e "\n🧪 All secrets decrypted successfully."