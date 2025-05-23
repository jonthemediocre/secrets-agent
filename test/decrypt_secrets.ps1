$ErrorActionPreference = "Stop"

$secrets = @(
  "secrets/test_secret.yaml",
  "secrets/app.secrets.yaml",
  "secrets/app.secrets.dev.yaml",
  "secrets/app.secrets.stage.yaml",
  "secrets/app.secrets.prod.yaml"
)

foreach ($file in $secrets) {
  Write-Host "🔍 Decrypting $file..."
  try {
    $output = sops -d $file | Out-Null
    Write-Host "✅ Success"
  }
  catch {
    Write-Error "❌ Failed to decrypt $file: $_"
    exit 1
  }
}

Write-Host "`n🧪 All secrets decrypted successfully."