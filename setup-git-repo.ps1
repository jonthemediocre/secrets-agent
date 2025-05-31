# PowerShell Git Repository Setup Script
# Equivalent to the bash script but for Windows PowerShell

Write-Host "🔍 Checking if Git is already initialized..." -ForegroundColor Cyan

if (Test-Path .git) {
    Write-Host "✅ Git is already initialized in this project." -ForegroundColor Green
    
    # Check if remote exists
    $remotes = git remote -v 2>$null
    if ($remotes) {
        Write-Host "🔗 Existing remotes found:" -ForegroundColor Yellow
        git remote -v
        
        # Ask if user wants to push to existing repo
        $pushChoice = Read-Host "Do you want to commit and push current changes to existing repo? (y/n)"
        if ($pushChoice -eq 'y' -or $pushChoice -eq 'Y') {
            Write-Host "📝 Adding all changes..." -ForegroundColor Cyan
            git add .
            
            $commitMessage = Read-Host "Enter commit message (or press Enter for default)"
            if ([string]::IsNullOrWhiteSpace($commitMessage)) {
                $commitMessage = "feat: major ecosystem update with MCP servers and agent distribution"
            }
            
            Write-Host "💾 Committing changes..." -ForegroundColor Cyan
            git commit -m $commitMessage
            
            Write-Host "🚀 Pushing to remote repository..." -ForegroundColor Cyan
            git push origin main
            
            Write-Host "✅ Successfully pushed to existing repository!" -ForegroundColor Green
            exit 0
        } else {
            Write-Host "ℹ️  Skipping push. Repository setup complete." -ForegroundColor Blue
            exit 0
        }
    }
} else {
    Write-Host "⚙️  Initializing Git..." -ForegroundColor Yellow
    git init
    git branch -M main
}

Write-Host "🔐 Checking GitHub CLI authentication..." -ForegroundColor Cyan
try {
    $authStatus = gh auth status 2>&1
    if ($LASTEXITCODE -ne 0) {
        Write-Host "🔑 Not authenticated with GitHub. Starting login process..." -ForegroundColor Yellow
        gh auth login
        if ($LASTEXITCODE -ne 0) {
            Write-Host "❌ GitHub authentication failed. Please try again." -ForegroundColor Red
            exit 1
        }
    } else {
        Write-Host "✅ GitHub CLI authenticated successfully!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️  GitHub CLI not found or authentication issue. Please install GitHub CLI first." -ForegroundColor Yellow
    Write-Host "Visit: https://cli.github.com/" -ForegroundColor Blue
    exit 1
}

# Ask user for GitHub repo name
$repoName = Read-Host "📦 Enter the name for your private GitHub repository"

# Get current directory name for fallback
$defaultRepoName = Split-Path -Leaf (Get-Location)

# If user input is empty, use default
if ([string]::IsNullOrWhiteSpace($repoName)) {
    $repoName = $defaultRepoName
    Write-Host "Using default repository name: $repoName" -ForegroundColor Yellow
}

# Create .gitignore if it doesn't exist
if (-not (Test-Path .gitignore)) {
    Write-Host "📝 Creating .gitignore file..." -ForegroundColor Cyan
}

# Add all files
Write-Host "📝 Adding all files to Git..." -ForegroundColor Cyan
git add .

# Initial commit
Write-Host "💾 Creating initial commit..." -ForegroundColor Cyan
git commit -m "feat: initial commit - Secrets Agent with MCP ecosystem"

# Create private repo via GitHub CLI
Write-Host "🚀 Creating private repository '$repoName' on GitHub..." -ForegroundColor Cyan
try {
    $createResult = gh repo create $repoName --private --source=. --remote=origin --push 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Git is fully initialized and synced with private GitHub repo!" -ForegroundColor Green
        $username = gh api user --jq .login
        Write-Host "🔗 Repository URL: https://github.com/$username/$repoName" -ForegroundColor Blue
        
        # Display next steps
        Write-Host "`n🎯 Next Steps:" -ForegroundColor Magenta
        Write-Host "1. Clone repo on other machines: git clone https://github.com/$username/$repoName" -ForegroundColor White
        Write-Host "2. Set up environment variables and secrets" -ForegroundColor White
        Write-Host "3. Configure MCP server credentials" -ForegroundColor White
        Write-Host "4. Run test suite: npm test" -ForegroundColor White
    } else {
        Write-Host "❌ Failed to create GitHub repository." -ForegroundColor Red
        
        # Check if repo might already exist
        Write-Host "`n🔍 Checking if repository already exists..." -ForegroundColor Yellow
        $existingRepo = gh repo view $repoName 2>$null
        if ($LASTEXITCODE -eq 0) {
            Write-Host "⚠️  Repository '$repoName' already exists." -ForegroundColor Yellow
            $overwriteChoice = Read-Host "Do you want to add it as remote and push? (y/n)"
            if ($overwriteChoice -eq 'y' -or $overwriteChoice -eq 'Y') {
                $username = gh api user --jq .login
                git remote add origin "https://github.com/$username/$repoName.git"
                git push -u origin main
                Write-Host "✅ Connected to existing repository and pushed!" -ForegroundColor Green
            }
        }
    }
} catch {
    Write-Host "❌ Error during repository creation: $_" -ForegroundColor Red
}

Write-Host "`n🌟 Repository setup complete!" -ForegroundColor Green 