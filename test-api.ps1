# PowerShell API test script
$ports = @(3005, 3004, 3003, 3002, 3001, 3000)
$baseUrl = $null

Write-Host "🧪 Testing Secrets Agent API..." -ForegroundColor Cyan
Write-Host ""

# Find the correct port
foreach ($port in $ports) {
    try {
        $testUrl = "http://localhost:$port"
        Write-Host "Checking port $port..." -ForegroundColor Gray
        $response = Invoke-WebRequest -Uri $testUrl -Method GET -TimeoutSec 2 -ErrorAction Stop
        if ($response.StatusCode -eq 200) {
            $baseUrl = $testUrl
            Write-Host "✅ Server found on port $port" -ForegroundColor Green
            break
        }
    } catch {
        # Continue to next port
    }
}

if (-not $baseUrl) {
    Write-Host "❌ No server found on any port. Make sure 'npm run dev' is running." -ForegroundColor Red
    exit 1
}

try {
    # Test 1: Register a user
    Write-Host "1. Testing user registration..." -ForegroundColor Yellow
    $registerBody = @{
        email = "test@example.com"
        password = "testpassword123"
        role = "user"
    } | ConvertTo-Json

    $registerResponse = Invoke-RestMethod -Uri "$baseUrl/api/auth/register" -Method POST -Body $registerBody -ContentType "application/json" -ErrorAction Stop

    Write-Host "✅ User registration successful: $($registerResponse.data.email)" -ForegroundColor Green
    
    # Test 2: Create a vault
    Write-Host ""
    Write-Host "2. Testing vault creation..." -ForegroundColor Yellow
    $vaultBody = @{
        name = "Test Vault"
        ownerId = $registerResponse.data.id
    } | ConvertTo-Json

    $vaultResponse = Invoke-RestMethod -Uri "$baseUrl/api/vault" -Method POST -Body $vaultBody -ContentType "application/json" -ErrorAction Stop

    Write-Host "✅ Vault creation successful: $($vaultResponse.data.name)" -ForegroundColor Green

    # Test 3: Create a secret
    Write-Host ""
    Write-Host "3. Testing secret creation..." -ForegroundColor Yellow
    $secretBody = @{
        vaultId = $vaultResponse.data.id
        key = "API_KEY"
        value = "super-secret-api-key-12345"
        metadata = @{
            description = "Test API key"
            environment = "development"
        }
    } | ConvertTo-Json

    $secretResponse = Invoke-RestMethod -Uri "$baseUrl/api/secrets" -Method POST -Body $secretBody -ContentType "application/json" -ErrorAction Stop

    Write-Host "✅ Secret creation successful: $($secretResponse.data.key)" -ForegroundColor Green

    # Test 4: List secrets
    Write-Host ""
    Write-Host "4. Testing secrets listing..." -ForegroundColor Yellow
    $listResponse = Invoke-RestMethod -Uri "$baseUrl/api/secrets?vaultId=$($vaultResponse.data.id)" -Method GET -ErrorAction Stop

    Write-Host "✅ Secrets listing successful: $($listResponse.data.Count) secrets found" -ForegroundColor Green

    # Test 5: Get specific secret
    Write-Host ""
    Write-Host "5. Testing secret retrieval..." -ForegroundColor Yellow
    $getResponse = Invoke-RestMethod -Uri "$baseUrl/api/secrets/$($secretResponse.data.id)" -Method GET -ErrorAction Stop

    Write-Host "✅ Secret retrieval successful: $($getResponse.data.key)" -ForegroundColor Green
    Write-Host "   Decrypted value: $($getResponse.data.value)" -ForegroundColor Gray

    Write-Host ""
    Write-Host "🎉 All API tests passed successfully!" -ForegroundColor Green

} catch {
    Write-Host "❌ Test failed with error: $($_.Exception.Message)" -ForegroundColor Red
    if ($_.Exception.Response) {
        $reader = New-Object System.IO.StreamReader($_.Exception.Response.GetResponseStream())
        $responseBody = $reader.ReadToEnd()
        Write-Host "   Response: $responseBody" -ForegroundColor Red
    }
} 