param (
    [Parameter(Mandatory=$true)]
    [string]$Environment
)

$ValidEnvironments = @("dev", "stage", "prod")
if ($Environment -notin $ValidEnvironments) {
    Write-Error "❌ Invalid environment '$Environment'. Must be one of: $($ValidEnvironments -join ', ')"
    exit 1
}

$SecretFile = "secrets/app.secrets.$Environment.yaml"

if (-not (Test-Path $SecretFile)) {
    Write-Error "❌ Secret file '$SecretFile' not found."
    exit 1
}

Write-Host "🔧 Generating .env from $SecretFile..."

try {
    # Decrypt to a string variable first
    $DecryptedYamlString = sops -d $SecretFile
    if ([string]::IsNullOrWhiteSpace($DecryptedYamlString)) {
        Write-Error "❌ SOPS decryption returned empty or whitespace content for $SecretFile."
        exit 1
    }

    # Convert the string to a PowerShell object
    $DecryptedYaml = $DecryptedYamlString | ConvertFrom-Yaml
}
catch {
    Write-Error "❌ Failed to decrypt or parse YAML from $SecretFile. Error: $($_.Exception.Message)"
    # Optionally, include $DecryptedYamlString in the error if it's not too large/sensitive for logs
    exit 1
}


if ($null -eq $DecryptedYaml.secrets) {
    Write-Error "❌ Expected a 'secrets:' block in the decrypted content of $SecretFile, but it was not found."
    exit 1
}

$DecryptedYaml.secrets.PSObject.Properties | ForEach-Object {
    "$($_.Name)=$($_.Value)"
} | Set-Content -Encoding utf8 .env

Write-Host "✅ .env generated successfully for environment '$Environment'."