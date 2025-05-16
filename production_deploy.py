#!/usr/bin/env python3
"""
production_deploy.py - Production-ready deployment script for Secrets Agent
"""

import os
import sys
import argparse
import subprocess
import shutil
from pathlib import Path
import getpass
import yaml

def run_command(cmd, check=True):
    """Run a shell command and print output"""
    print(f"Running: {cmd}")
    result = subprocess.run(cmd, shell=True, check=check)
    return result.returncode == 0

def check_requirements():
    """Check if all required tools are installed"""
    requirements = {
        "docker": "Docker is required. Install from https://docs.docker.com/get-docker/",
        "docker-compose": "Docker Compose is required. Install from https://docs.docker.com/compose/install/",
        "python": "Python 3.8+ is required"
    }
    
    missing = []
    for req, message in requirements.items():
        if shutil.which(req) is None:
            missing.append(f"❌ {message}")
    
    if missing:
        print("Missing requirements:")
        for msg in missing:
            print(f"  {msg}")
        return False
    
    print("✅ All system requirements met")
    return True

def setup_directory_structure():
    """Create required directories"""
    directories = [
        "data",
        "projects",
        "secrets_secure",
        "logs"
    ]
    
    for directory in directories:
        Path(directory).mkdir(exist_ok=True)
        print(f"✅ Created directory: {directory}")
    
    return True

def setup_secure_secrets():
    """Set up encrypted secrets storage"""
    if not Path("secrets_secure/config.yaml").exists():
        print("\n🔒 Setting up secure secrets storage")
        password = getpass.getpass("Enter a master password for secret encryption: ")
        confirm = getpass.getpass("Confirm password: ")
        
        if password != confirm:
            print("❌ Passwords don't match")
            return False
        
        # Create a temporary script to set up secrets
        with open("temp_setup_secrets.py", "w") as f:
            f.write(f"""
import sys
sys.path.append('.')
from setup_secure_secrets import create_secure_storage
create_secure_storage('{password}')
""")
        
        run_command("python temp_setup_secrets.py")
        os.unlink("temp_setup_secrets.py")
    else:
        print("✅ Secure secrets already set up")
    
    return True

def build_executable():
    """Build the executable for Windows"""
    if os.name == 'nt':  # Windows
        print("\n🔨 Building Windows executable")
        if run_command("pyinstaller custom_vanta.spec"):
            print("✅ Successfully built vanta.exe in dist/ directory")
            return True
        else:
            print("❌ Failed to build executable")
            return False
    else:
        print("Skipping Windows executable build on non-Windows platform")
        return True

def configure_env_file():
    """Create .env file for Docker"""
    env_file = Path(".env")
    
    if not env_file.exists():
        print("\n📝 Creating .env file")
        
        api_key = input("Enter API key (leave blank to generate): ")
        if not api_key:
            import secrets
            api_key = secrets.token_hex(16)
            print(f"Generated API key: {api_key}")
        
        openai_key = input("Enter OpenAI API key (leave blank to skip): ")
        
        with open(env_file, "w") as f:
            f.write(f"API_KEY={api_key}\n")
            if openai_key:
                f.write(f"OPENAI_API_KEY={openai_key}\n")
        
        print("✅ Created .env file")
    else:
        print("✅ .env file already exists")
    
    return True

def deploy_docker():
    """Deploy with Docker Compose"""
    print("\n🐳 Deploying with Docker Compose")
    
    if run_command("docker-compose down", check=False):
        print("✅ Stopped existing containers")
    
    if run_command("docker-compose build"):
        print("✅ Built Docker images")
    else:
        print("❌ Failed to build Docker images")
        return False
    
    if run_command("docker-compose up -d"):
        print("✅ Started Docker containers")
    else:
        print("❌ Failed to start Docker containers")
        return False
    
    return True

def setup_vscode_extension():
    """Setup the VS Code extension"""
    vscode_dir = Path("extension_api/vscode")
    
    if not vscode_dir.exists():
        print("❌ VS Code extension directory not found")
        return False
    
    print("\n🧩 Setting up VS Code extension")
    if os.name == 'nt':  # Windows
        vscode_ext_dir = Path.home() / ".vscode/extensions/secrets-agent/"
    else:
        vscode_ext_dir = Path.home() / ".vscode-server/extensions/secrets-agent/"
    
    vscode_ext_dir.mkdir(parents=True, exist_ok=True)
    
    # Copy extension files
    for item in vscode_dir.glob("*"):
        if item.is_file():
            shutil.copy(item, vscode_ext_dir)
    
    print("✅ VS Code extension installed")
    return True

def display_summary():
    """Display deployment summary"""
    print("\n🚀 Secrets Agent - Production Deployment Complete!")
    print("\n📋 Summary:")
    print("  - Secure secrets storage set up")
    print("  - Docker containers running")
    print("  - VS Code extension installed")
    
    # Get Docker container status
    print("\n🐳 Docker Container Status:")
    run_command("docker-compose ps")
    
    print("\n📝 Next Steps:")
    print("  1. Add your projects to the 'projects' directory")
    print("  2. Run 'vanta scan-root --dir ./projects' to scan projects")
    print("  3. Access the API at http://localhost:5000")
    print("  4. Use the VS Code extension for integrated experience")
    
    print("\n🔐 To add new secrets:")
    print("  python cli.py add-secret --key YOUR_KEY --value YOUR_VALUE --secure")
    
    print("\n🔄 To update the deployment:")
    print("  python production_deploy.py --update")

def main():
    parser = argparse.ArgumentParser(description="Production deployment for Secrets Agent")
    parser.add_argument("--update", action="store_true", help="Update an existing deployment")
    parser.add_argument("--skip-checks", action="store_true", help="Skip requirement checks")
    args = parser.parse_args()
    
    print("🚀 Secrets Agent - Production Deployment\n")
    
    if not args.skip_checks:
        if not check_requirements():
            return False
    
    if not setup_directory_structure():
        return False
    
    if not args.update:
        if not setup_secure_secrets():
            return False
    
    if not build_executable():
        print("⚠️ Executable build failed, continuing with deployment")
    
    if not configure_env_file():
        return False
    
    if not deploy_docker():
        return False
    
    setup_vscode_extension()
    
    display_summary()
    return True

if __name__ == "__main__":
    success = main()
    sys.exit(0 if success else 1) 