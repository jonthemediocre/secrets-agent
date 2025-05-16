#!/bin/bash

# MetaFabric Installer
echo "[*] Installing MetaFabric..."

# Create symlink to CLI
TARGET_CLI="cli.py"
ALIAS_NAME="vanta"

# Make executable if not already
chmod +x $TARGET_CLI

# Check if ~/.local/bin exists, create if not
mkdir -p ~/.local/bin

# Create symbolic link
ln -sf "$(pwd)/$TARGET_CLI" ~/.local/bin/$ALIAS_NAME

# Add to PATH if not already
if ! echo $PATH | grep -q "~/.local/bin"; then
  echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
  echo '[*] ~/.local/bin added to PATH in .bashrc'
fi

echo "[✓] Installed. You can now run MetaFabric via 'vanta'"