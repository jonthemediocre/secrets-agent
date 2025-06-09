# Secrets Agent Installation Guide
*Complete Setup Instructions for All Platforms*

## 📋 System Requirements

| Component | Requirement |
|-----------|-------------|
| **Operating System** | Windows 10/11, macOS 10.15+, Linux (Ubuntu 18.04+) |
| **Python** | 3.9+ (for source installation) |
| **Node.js** | 16+ (for web interface) |
| **Disk Space** | ~200MB for full installation |
| **Memory** | 1GB RAM minimum |
| **Network** | Internet access for dependencies |

## 🚀 Quick Start (Recommended)

### Option 1: One-Click Installer (Windows)
1. **Download** `SecretsAgentSetup.exe` from releases
2. **Run installer** with administrator privileges
3. **Verify installation**:
   ```cmd
   vanta --version
   vanta scan
   ```

### Option 2: Cross-Platform (Python)
```bash
# Clone repository
git clone https://github.com/your-org/secrets-agent.git
cd secrets-agent

# Setup environment
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
pip install -r requirements.txt

# Initialize vault
python cli.py init
```

## 🔧 Platform-Specific Installation

### Windows Installation

#### Method 1: Executable Installer ⭐ Recommended
1. **Download** latest `SecretsAgentSetup.exe`
2. **Install** to `C:\Program Files\SecretsAgent`
3. **CLI Access** automatically added to PATH
4. **Launch GUI** from desktop shortcut

```cmd
# Verify installation
vanta scan
vanta link
vanta scan-root --dir C:\Users\%USERNAME%\Projects
```

#### Method 2: Developer Setup
```cmd
# Download and extract ZIP
cd SecretsAgent
python -m venv .venv
.venv\Scripts\activate
pip install -r requirements.txt

# Run CLI
python cli.py scan
python cli.py bootstrap
python secrets_watcher.py .
```

#### Method 3: Global CLI Installation
```cmd
pip install pyinstaller
pyinstaller installer/vanta.spec
# Add dist/vanta.exe to system PATH
```

### macOS Installation

#### Method 1: Homebrew (Coming Soon)
```bash
brew tap secrets-agent/tap
brew install secrets-agent
```

#### Method 2: Manual Installation
```bash
# Install dependencies
brew install python@3.9 age sops

# Clone and setup
git clone https://github.com/your-org/secrets-agent.git
cd secrets-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Initialize
python cli.py init
```

### Linux Installation

#### Method 1: Package Manager (Ubuntu/Debian)
```bash
# Add repository (coming soon)
curl -fsSL https://secrets-agent.dev/install.sh | bash
```

#### Method 2: Manual Installation
```bash
# Install system dependencies
sudo apt update
sudo apt install python3 python3-pip python3-venv age

# Download and install sops
wget https://github.com/mozilla/sops/releases/download/v3.7.3/sops-v3.7.3.linux
sudo mv sops-v3.7.3.linux /usr/local/bin/sops
sudo chmod +x /usr/local/bin/sops

# Setup application
git clone https://github.com/your-org/secrets-agent.git
cd secrets-agent
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt

# Initialize vault
python cli.py init
```

## 🔐 Initial Configuration

### 1. Generate Encryption Keys
```bash
# Generate age key pair
age-keygen -o ~/.age/key.txt

# Export public key for vault encryption
export SOPS_AGE_RECIPIENTS=$(age-keygen -y ~/.age/key.txt)
```

### 2. Initialize Vault
```bash
# Create first vault
vanta init --project "my-project"
vanta add-secret API_KEY "your-secret-value"
```

### 3. Configure Authentication
```bash
# Setup Google OAuth (optional)
vanta auth setup --provider google
vanta auth login
```

## 🌐 Web Interface Setup

### Development Server
```bash
cd web-interface
npm install
npm run dev
# Access at http://localhost:3000
```

### Production Deployment
```bash
npm run build
npm run start
```

## 🔌 IDE Extensions

### VS Code Extension
1. **Install** from marketplace: "Secrets Agent"
2. **Configure** workspace settings:
   ```json
   {
     "secretsAgent.vaultPath": "./secrets.vault.yaml",
     "secretsAgent.autoSync": true
   }
   ```

### JetBrains Plugin (Coming Soon)
- IntelliJ IDEA
- PyCharm
- WebStorm

## 📱 Mobile Setup

### iOS (TestFlight)
1. **Join** TestFlight beta program
2. **Install** Secrets Agent app
3. **Sync** with desktop vault via QR code

### Android (Google Play Internal Testing)
1. **Request** access to internal testing
2. **Install** from Google Play Store
3. **Configure** vault synchronization

## 🏢 Enterprise Installation

### Docker Deployment
```bash
# Pull latest image
docker pull secrets-agent:latest

# Run with volume mount
docker run -d \
  --name secrets-agent \
  -p 7300:7300 \
  -v /host/vault:/app/vault \
  secrets-agent:latest
```

### Kubernetes Deployment
```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: secrets-agent
spec:
  replicas: 1
  selector:
    matchLabels:
      app: secrets-agent
  template:
    spec:
      containers:
      - name: secrets-agent
        image: secrets-agent:latest
        ports:
        - containerPort: 7300
        volumeMounts:
        - name: vault-storage
          mountPath: /app/vault
      volumes:
      - name: vault-storage
        persistentVolumeClaim:
          claimName: vault-pvc
```

## 🧪 Verification & Testing

### Basic Functionality Test
```bash
# Test CLI
vanta --version
vanta scan
vanta status

# Test vault operations
vanta add-secret TEST_KEY "test-value"
vanta get-secret TEST_KEY
vanta delete-secret TEST_KEY

# Test API server
curl http://localhost:7300/health
```

### Platform Integration Test
```bash
# Test .env export
vanta export --format env --output .env.test

# Test with application
export $(cat .env.test | xargs)
echo $TEST_VAR
```

## 🔧 Troubleshooting

### Common Issues

#### "Command not found: vanta"
- **Solution**: Ensure installation directory is in PATH
- **Windows**: Add `C:\Program Files\SecretsAgent` to PATH
- **Unix**: Add installation directory to `~/.bashrc` or `~/.zshrc`

#### "SOPS not found"
- **Solution**: Install SOPS binary
- **macOS**: `brew install sops`
- **Linux**: Download from GitHub releases
- **Windows**: Use installer or manual installation

#### "Age key not found"
- **Solution**: Generate age key pair
```bash
age-keygen -o ~/.age/key.txt
```

#### "Permission denied"
- **Solution**: Check file permissions
```bash
chmod 600 ~/.age/key.txt
chmod 755 ~/.local/bin/vanta  # Linux/macOS
```

### Performance Issues
- **Slow vault operations**: Check disk I/O and available memory
- **High CPU usage**: Reduce scan frequency in configuration
- **Network timeouts**: Configure proxy settings if behind firewall

### Security Concerns
- **Vault corruption**: Regular backups recommended
- **Key exposure**: Store age keys securely, never commit to version control
- **Access logs**: Monitor vault access patterns for anomalies

## 📞 Support & Documentation

### Getting Help
- **Documentation**: [https://docs.secrets-agent.dev](https://docs.secrets-agent.dev)
- **GitHub Issues**: [Report bugs and feature requests](https://github.com/your-org/secrets-agent/issues)
- **Community Discord**: [Join discussions](https://discord.gg/secrets-agent)
- **Email Support**: support@secrets-agent.dev

### Additional Resources
- **API Reference**: `/docs/reference/API_REFERENCE.md`
- **User Guide**: `/docs/guides/USER_GUIDE.md`
- **Security Best Practices**: `/docs/security/SECURITY_GUIDE.md`
- **Development Setup**: `/docs/development/DEVELOPMENT_GUIDE.md`

---

*Last Updated: June 5, 2025*  
*Installation Support: All major platforms* 