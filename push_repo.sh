#!/bin/bash

# Setup Secrets Agent GitHub Repository (Private)
REPO_NAME="SecretsAgent"
USER_GITHUB="your-username-here"  # TODO: replace with your GitHub username
REPO_PRIVATE=true

echo "[🐙] Initializing Git repo..."
git init
git remote remove origin 2> /dev/null
git remote add origin git@github.com:$USER_GITHUB/$REPO_NAME.git

echo "[🌱] Creating main branch..."
git checkout -b main

echo "[📦] Adding all files..."
git add .
git commit -m "Initial commit for SecretsAgent"

echo "[🚀] Pushing to GitHub..."
git push -u origin main

echo "[✅] Repo pushed. Make sure this repo is marked private in GitHub settings."