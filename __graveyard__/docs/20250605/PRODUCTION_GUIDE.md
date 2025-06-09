# 🚀 Secrets Agent Production Deployment Guide

This guide walks you through deploying Secrets Agent in a production environment with secure secret storage, Docker containerization, and IDE integration.

## 🔒 Prerequisites

- Python 3.8 or higher
- Docker and Docker Compose
- Windows (for .exe builds) or Linux/macOS for server deployment

## ⚡ Quick Start

For a fully automated deployment:

```bash
# 1. Clone the repository
git clone https://github.com/your-org/secrets-agent.git
cd secrets-agent

# 2. Install requirements
pip install -r requirements.txt

# 3. Set up secure encrypted storage
python setup_secure_secrets_v2.py

# 4. Run the production deployment script
python production_deploy.py
```

The script will:
- Check system requirements
- Set up secure encrypted secrets storage
- Build the CLI executable (on Windows)
- Configure environment files
- Deploy Docker containers
- Install the VS Code extension

## 🛡️ Secure Storage

Secrets Agent supports full end-to-end encryption of secrets with a master password:

```bash
# Set up secure encrypted storage
python setup_secure_secrets_v2.py

# You'll be prompted for a master password
# This password will be used to encrypt all secrets
```

### Encryption Features

- All secrets are encrypted with AES-256 using the Fernet symmetric encryption
- Master password is never stored, only a cryptographic hash is kept
- Secure key derivation from password using PBKDF2 with 100,000 iterations
- Salt is randomly generated for enhanced security
- Legacy plaintext secrets.yaml is backed up and can be securely deleted

### Docker Environment Configuration

To use secure storage with Docker, create a `.env` file with:

```
SECURE_STORAGE=true
MASTER_PASSWORD=your_master_password
API_KEY=your_api_key
```

This enables secure storage across all containers in the stack.

## 🐳 Docker Deployment

The Docker setup includes three services:

1. **API Service**: Handles REST API requests for scanning projects and managing secrets
2. **Watcher Service**: Monitors projects for changes and updates secrets as needed
3. **VS Code Extension Backend**: Provides IDE integration for the VS Code extension

```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs

# Stop all services
docker-compose down
```

## 🖥️ Windows Executable

For Windows environments, you can build a standalone executable:

```bash
# Build the executable
pyinstaller custom_vanta.spec

# The executable will be in the dist/ directory
# You can distribute this to users for easy installation
```

## 🔌 API Reference

The REST API provides the following endpoints:

- **GET /api/health**: Check if the service is running
- **POST /api/scan**: Scan a project for required env vars and tools
- **GET /api/list-secrets**: List available secrets
- **POST /api/add-secret**: Add a new secret
- **POST /api/link**: Link a project to secrets and tools

## 🧪 Testing

Test the deployment with our test script:

```bash
python test_api.py
```

This will verify that:
- The API service is running
- Project scanning works
- Secure secrets storage is functioning
- Adding new secrets works

## 🔐 Security Best Practices

- Use a strong master password (12+ characters)
- Rotate the master password periodically
- Set up proper network security rules in production
- Use HTTPS for all API communication
- Limit Docker container permissions

## 📚 Further Reading

- See `INSTALL.md` for detailed installation instructions
- See `windows_install_guide.md` for Windows-specific guidance
- See `ThePlan.md` for future development roadmap
- See `README.md` for general usage instructions

## 🧩 Components

The production deployment includes:

### 1. Docker Services

- **API Server** - Core service for handling requests
- **Watcher Service** - Monitors projects for changes
- **VS Code Backend** - Supports IDE integration

### 2. Secure Secret Storage

Secrets are stored in an encrypted format with a master password, providing:
- Strong encryption using Fernet (AES-128)
- Password-based key derivation
- Protection from unauthorized access

### 3. VS Code Extension

Provides seamless integration with your development environment:
- Link projects directly from VS Code
- Manage secrets within your IDE
- Auto-scan new projects

### 4. CLI Tools

The `vanta.exe` CLI tool (Windows) or `vanta` command (Linux/macOS) provides:
- Scanning projects for required secrets
- Linking encrypted secrets to projects
- Managing access permissions

## 🛠️ Manual Setup (Alternative)

If you prefer a manual setup:

### 1. Secure Secret Storage

```bash
# Set up encrypted secrets
python setup_secure_secrets.py
```

### 2. Docker Deployment

```bash
# Configure .env file with your API keys
echo "API_KEY=your-api-key" > .env
echo "OPENAI_API_KEY=your-openai-key" >> .env

# Start Docker services
docker-compose up -d
```

### 3. Build CLI Tool

On Windows:
```bash
pyinstaller custom_vanta.spec
```

The executable will be in the `dist/` directory.

## 🔄 Usage

### Adding Projects

```bash
# Add projects to the projects/ directory
cp -r /path/to/your/project projects/

# Scan all projects
vanta scan-root --dir ./projects
```

### Managing Secrets

```bash
# Add a new secret (secure storage)
vanta add-secret --key API_KEY --value your-api-key --secure

# Bootstrap a project with secure secrets
vanta bootstrap ./projects/your-project --secure
```

### Monitoring and Maintenance

```bash
# Check Docker container status
docker-compose ps

# View logs
docker-compose logs -f

# Update deployment
python production_deploy.py --update
```

## ⚙️ Advanced Configuration

### Custom Docker Ports

Edit `docker-compose.yaml` to change the default ports:

```yaml
ports:
  - "8080:5000"  # Map port 8080 to API
```

### Multi-Environment Setup

For multiple environments (dev/staging/prod), create separate configuration files:

```bash
# Create environment-specific config
cp config.yaml config.prod.yaml

# Deploy with specific config
SECRETS_CONFIG=config.prod.yaml docker-compose up -d
```

## 📚 Troubleshooting

### Docker Issues

If containers fail to start:
```bash
# Check logs
docker-compose logs

# Restart services
docker-compose restart
```

### Secret Access Problems

If projects can't access secrets:
```bash
# Verify secure storage
python cli.py verify-storage --secure

# Check project symlinks
ls -la projects/your-project/.env
```

### Windows .exe Issues

For executable problems:
```bash
# Run in debug mode
dist/vanta.exe --debug scan

# Rebuild with debug symbols
pyinstaller --debug custom_vanta.spec
```

## 🔄 Updating

To update an existing deployment:

```bash
# Pull latest code
git pull

# Update deployment
python production_deploy.py --update
``` 