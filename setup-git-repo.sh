#!/bin/bash

echo "🔍 Checking if Git is already initialized..."

if [ -d .git ]; then
  echo "✅ Git is already initialized in this project."
  
  # Check if remote exists
  if git remote -v | grep -q origin; then
    echo "🔗 Existing remotes found:"
    git remote -v
    
    # Ask if user wants to push to existing repo
    read -p "Do you want to commit and push current changes to existing repo? (y/n): " push_choice
    if [[ "$push_choice" =~ ^[Yy]$ ]]; then
      echo "📝 Adding all changes..."
      git add .
      
      read -p "Enter commit message (or press Enter for default): " commit_message
      if [ -z "$commit_message" ]; then
        commit_message="feat: major ecosystem update with MCP servers and agent distribution"
      fi
      
      echo "💾 Committing changes..."
      git commit -m "$commit_message"
      
      echo "🚀 Pushing to remote repository..."
      git push origin main
      
      echo "✅ Successfully pushed to existing repository!"
      exit 0
    else
      echo "ℹ️  Skipping push. Repository setup complete."
      exit 0
    fi
  fi
else
  echo "⚙️  Initializing Git..."
  git init
  git branch -M main
fi

echo "🔐 Ensuring you're authenticated to GitHub..."
if ! gh auth status &>/dev/null; then
  echo "🔑 Not authenticated with GitHub. Starting login process..."
  gh auth login
  if [ $? -ne 0 ]; then
    echo "❌ GitHub authentication failed. Please try again."
    exit 1
  fi
else
  echo "✅ GitHub CLI authenticated successfully!"
fi

# Ask user for GitHub repo name
read -p "📦 Enter the name for your private GitHub repository: " repo_name

# Get current directory name for fallback
default_repo_name=$(basename "$(pwd)")

# If user input is empty, use default
repo_name=${repo_name:-$default_repo_name}
echo "Using repository name: $repo_name"

# Create .gitignore if it doesn't exist
if [ ! -f .gitignore ]; then
  echo "📝 Creating .gitignore file..."
fi

# Add all files
echo "📝 Adding all files to Git..."
git add .

# Initial commit
echo "💾 Creating initial commit..."
git commit -m "feat: initial commit - Secrets Agent with MCP ecosystem"

# Create private repo via GitHub CLI
echo "🚀 Creating private repository '$repo_name' on GitHub..."
if gh repo create "$repo_name" --private --source=. --remote=origin --push; then
  echo "✅ Git is fully initialized and synced with private GitHub repo!"
  username=$(gh api user --jq .login)
  echo "🔗 Repository URL: https://github.com/$username/$repo_name"
  
  # Display next steps
  echo ""
  echo "🎯 Next Steps:"
  echo "1. Clone repo on other machines: git clone https://github.com/$username/$repo_name"
  echo "2. Set up environment variables and secrets"
  echo "3. Configure MCP server credentials"
  echo "4. Run test suite: npm test"
else
  echo "❌ Failed to create GitHub repository."
  
  # Check if repo might already exist
  echo ""
  echo "🔍 Checking if repository already exists..."
  if gh repo view "$repo_name" &>/dev/null; then
    echo "⚠️  Repository '$repo_name' already exists."
    read -p "Do you want to add it as remote and push? (y/n): " overwrite_choice
    if [[ "$overwrite_choice" =~ ^[Yy]$ ]]; then
      username=$(gh api user --jq .login)
      git remote add origin "https://github.com/$username/$repo_name.git"
      git push -u origin main
      echo "✅ Connected to existing repository and pushed!"
    fi
  fi
fi

echo ""
echo "🌟 Repository setup complete!" 