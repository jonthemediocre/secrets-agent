#!/bin/bash

# Enhanced Git repository management script
USER_GITHUB="${GITHUB_USERNAME:-$(git config user.name)}"  # Use env var or git config instead of hardcoded value

# Validate GitHub username
if [ -z "$USER_GITHUB" ]; then
    echo "❌ Error: GitHub username not found."
    echo "Please set one of the following:"
    echo "  - Environment variable: export GITHUB_USERNAME='your-username'"
    echo "  - Git config: git config user.name 'your-username'"
    exit 1
fi

REPO_NAME="secrets-agent"
REMOTE_URL="https://github.com/${USER_GITHUB}/${REPO_NAME}.git"

echo "🚀 Pushing to GitHub repository: ${REMOTE_URL}"

# Check if we're in a git repository
if [ ! -d ".git" ]; then
    echo "❌ Error: Not in a git repository. Run 'git init' first."
    exit 1
fi

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
    echo "⚠️  Warning: You have uncommitted changes."
    echo "Staging and committing all changes..."
git add .
    git commit -m "Auto-commit: $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Add remote if it doesn't exist
if ! git remote get-url origin >/dev/null 2>&1; then
    echo "📡 Adding remote origin..."
    git remote add origin "$REMOTE_URL"
else
    echo "📡 Remote origin already exists"
fi

# Push to remote
echo "📤 Pushing to remote repository..."
if git push -u origin main; then
    echo "✅ Successfully pushed to: ${REMOTE_URL}"
    echo "🌐 View your repository at: https://github.com/${USER_GITHUB}/${REPO_NAME}"
else
    echo "❌ Push failed. Check your credentials and repository access."
    echo "💡 You may need to:"
    echo "   - Create the repository on GitHub first"
    echo "   - Set up authentication (SSH keys or personal access token)"
    echo "   - Check if the repository name is correct"
    exit 1
fi