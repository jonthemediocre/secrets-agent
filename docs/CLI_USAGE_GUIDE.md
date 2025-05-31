# 🔐 VANTA Secrets Agent Enhanced CLI - Usage Guide

## 📋 **Overview**

The VANTA Secrets Agent Enhanced CLI provides a powerful command-line interface for managing secrets across projects with full feature parity to the web interface.

## 🚀 **Installation**

```bash
# Install dependencies
pip install -r requirements_cli.txt

# Make CLI executable
chmod +x cli_enhanced.py

# Test installation
python cli_enhanced.py version
```

## 🎯 **Core Commands**

### **🔍 Project Scanning**

Scan projects for secrets intelligence:

```bash
# Basic scan
python cli_enhanced.py scan

# Scan specific path
python cli_enhanced.py scan --path /path/to/projects

# Recursive scan
python cli_enhanced.py scan --path . --recursive

# JSON output
python cli_enhanced.py scan --output json

# Verbose mode
python cli_enhanced.py --verbose scan --path ./projects
```

**Example Output:**
```
╭─────────── 🔍 Project Scanner ───────────╮
│ Scanning projects in: ./projects         │
╰──────────────────────────────────────────╯

                📊 Project Scan Results                
┏━━━━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━━━┳━━━━━━━━━┓
┃ Project       ┃ Confidence ┃ Secrets Found ┃ Status  ┃
┡━━━━━━━━━━━━━━━╇━━━━━━━━━━━━╇━━━━━━━━━━━━━━╇━━━━━━━━━┩
│ my-web-app    │    85%     │      5       │ ready   │
│ api-service   │    92%     │      8       │ ready   │
│ mobile-app    │    67%     │      3       │ ready   │
└───────────────┴────────────┴──────────────┴─────────┘

Found 3 projects
```

### **🤖 AI Secret Detection**

AI-powered secret detection and scaffolding:

```bash
# Detect secrets for a project
python cli_enhanced.py detect --project my-web-app

# Deep AI analysis
python cli_enhanced.py detect --project my-web-app --deep

# Auto-add all detected secrets
python cli_enhanced.py detect --project my-web-app --auto-add
```

**Example Output:**
```
╭─────────── 🤖 AI Analysis ───────────╮
│ AI Secret Detection: my-web-app      │
╰──────────────────────────────────────╯

✅ Detected 5 potential secrets:

? Select secrets to add to vault: (Use space to select, enter to confirm)
 ❯ ◯ API_KEY: External service API key (90% confidence)
   ◯ DATABASE_URL: PostgreSQL connection string (95% confidence)
   ◯ JWT_SECRET: Authentication token secret (88% confidence)
   ◯ STRIPE_KEY: Payment processing key (92% confidence)
   ◯ REDIS_URL: Cache connection string (85% confidence)

✅ Added 3 secrets to vault
  • API_KEY: External service API key
  • DATABASE_URL: PostgreSQL connection string
  • JWT_SECRET: Authentication token secret
```

### **📤 Vault Export**

Export encrypted vault to various formats:

```bash
# Export to .env format
python cli_enhanced.py export --project my-web-app

# Export to JSON
python cli_enhanced.py export --project my-web-app --format json

# Export to file
python cli_enhanced.py export --project my-web-app --output ./secrets.env

# Export with encryption
python cli_enhanced.py export --project my-web-app --encrypted
```

**Example Output:**
```
╭─────────── 📤 Vault Export ───────────╮
│ Exporting vault: my-web-app           │
╰───────────────────────────────────────╯

📄 Export Data:
╭─────────── my-web-app.env ───────────╮
│ API_KEY=sk_live_abc123...             │
│ DATABASE_URL=postgresql://user:pass@  │
│ JWT_SECRET=super_secret_key_here      │
│ STRIPE_KEY=pk_live_xyz789...          │
│ REDIS_URL=redis://localhost:6379     │
╰──────────────────────────────────────╯
```

### **🔄 Secret Rotation**

Manage secret rotation policies:

```bash
# Rotate secrets for a project
python cli_enhanced.py rotate --project my-web-app

# Force rotation without confirmation
python cli_enhanced.py rotate --project my-web-app --force

# Apply specific rotation policy
python cli_enhanced.py rotate --project my-web-app --policy weekly
```

**Example Output:**
```
╭─────────── 🔄 Rotation Manager ───────────╮
│ Secret Rotation: my-web-app               │
╰──────────────────────────────────────────╯

Are you sure you want to rotate secrets for 'my-web-app'? [y/N]: y

✅ Rotation initiated successfully
Rotation ID: rot_1234567890abcdef
```

### **📊 System Status**

Monitor vault and system health:

```bash
# Check system status
python cli_enhanced.py status
```

**Example Output:**
```
╭─────────── 📊 Status Monitor ───────────╮
│ VANTA System Status                     │
╰────────────────────────────────────────╯

🔐 Vault Status: healthy
📁 Active Projects: 5
🔑 Total Secrets: 23

Recent Activity:
  • Project 'my-web-app' scanned
  • 3 secrets added to vault
  • Rotation policy updated
  • Export completed for 'api-service'
  • System health check passed
```

## ⚙️ **Configuration Options**

### **Global Options**

```bash
# Custom server URL
python cli_enhanced.py --server http://localhost:8080 scan

# Verbose output
python cli_enhanced.py --verbose scan

# Custom config file
python cli_enhanced.py --config ./custom-config.yaml scan
```

### **Environment Variables**

```bash
# Set default server
export VANTA_SERVER_URL=http://localhost:3000

# Set config path
export VANTA_CONFIG_PATH=./config.yaml

# Enable debug mode
export VANTA_DEBUG=true
```

## 🔧 **Advanced Usage**

### **Batch Operations**

```bash
# Scan multiple paths
for path in ./project1 ./project2 ./project3; do
    python cli_enhanced.py scan --path "$path"
done

# Export all projects
python cli_enhanced.py scan --output json | jq -r '.[].name' | while read project; do
    python cli_enhanced.py export --project "$project" --output "./exports/${project}.env"
done
```

### **Pipeline Integration**

```bash
# CI/CD Pipeline Example
#!/bin/bash
set -e

# Scan for secrets
echo "🔍 Scanning for secrets..."
python cli_enhanced.py scan --path . --output json > scan_results.json

# Check if secrets were found
if [ $(jq length scan_results.json) -gt 0 ]; then
    echo "✅ Found $(jq length scan_results.json) projects with secrets"
    
    # Auto-detect and add secrets
    jq -r '.[].name' scan_results.json | while read project; do
        echo "🤖 Detecting secrets for $project..."
        python cli_enhanced.py detect --project "$project" --auto-add
    done
    
    # Export for deployment
    echo "📤 Exporting secrets..."
    python cli_enhanced.py export --project "$PROJECT_NAME" --output .env
else
    echo "⚠️ No projects with secrets found"
fi
```

### **Monitoring Scripts**

```bash
# Health check script
#!/bin/bash
status=$(python cli_enhanced.py status --output json | jq -r '.vault_status')
if [ "$status" != "healthy" ]; then
    echo "❌ Vault unhealthy: $status"
    exit 1
else
    echo "✅ Vault healthy"
fi
```

## 🚨 **Error Handling**

### **Common Errors**

```bash
# Server connection error
❌ Cannot connect to VANTA server at http://localhost:3000
💡 Make sure the web interface is running: npm run dev

# API timeout
❌ Request timed out. Is the VANTA server running?

# Project not found
❌ Detection failed: Project 'invalid-project' not found

# No data to export
⚠️ No data to export
```

### **Troubleshooting**

```bash
# Check server connectivity
curl http://localhost:3000/api/auth/status

# Verify CLI installation
python cli_enhanced.py version

# Test with verbose output
python cli_enhanced.py --verbose scan

# Check dependencies
pip list | grep -E "(click|rich|httpx|inquirer)"
```

## 📚 **Integration Examples**

### **Docker Integration**

```dockerfile
# Dockerfile
FROM python:3.11-slim

COPY requirements_cli.txt .
RUN pip install -r requirements_cli.txt

COPY cli_enhanced.py .
RUN chmod +x cli_enhanced.py

# Use in container
ENTRYPOINT ["python", "cli_enhanced.py"]
```

```bash
# Build and run
docker build -t vanta-cli .
docker run -it vanta-cli scan --path /workspace
```

### **GitHub Actions**

```yaml
# .github/workflows/secrets-scan.yml
name: VANTA Secrets Scan

on: [push, pull_request]

jobs:
  scan-secrets:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      
      - name: Setup Python
        uses: actions/setup-python@v4
        with:
          python-version: '3.11'
          
      - name: Install VANTA CLI
        run: |
          pip install -r requirements_cli.txt
          
      - name: Start VANTA Server
        run: |
          npm install
          npm run dev &
          sleep 10
          
      - name: Scan for Secrets
        run: |
          python cli_enhanced.py scan --output json > scan_results.json
          cat scan_results.json
          
      - name: Upload Results
        uses: actions/upload-artifact@v3
        with:
          name: secrets-scan-results
          path: scan_results.json
```

## 🎯 **Best Practices**

### **Security**

- Always use HTTPS in production: `--server https://vanta.company.com`
- Store sensitive config in environment variables
- Use `--encrypted` flag for sensitive exports
- Regularly rotate secrets with `rotate` command

### **Performance**

- Use `--output json` for programmatic processing
- Limit scan scope with specific `--path` arguments
- Use `--auto-add` for automated workflows
- Cache scan results for repeated operations

### **Workflow**

1. **Scan** projects to discover secrets
2. **Detect** and add secrets to vault
3. **Export** for deployment
4. **Rotate** on schedule
5. **Monitor** with status checks

## 🔗 **API Compatibility**

The CLI maintains 100% feature parity with the web interface:

| Feature | Web Interface | CLI Command | Status |
|---------|---------------|-------------|--------|
| Project Scanning | ✅ | `scan` | ✅ |
| Secret Detection | ✅ | `detect` | ✅ |
| Vault Export | ✅ | `export` | ✅ |
| Secret Rotation | ✅ | `rotate` | ✅ |
| System Status | ✅ | `status` | ✅ |
| Multi-select | ✅ | Interactive | ✅ |
| Real-time Updates | ✅ | Polling | ✅ |

---

**🎉 DOMINO_COMPLETE: CLI_FOUNDATION_READY ✅**

The enhanced CLI now provides full feature parity with the web interface and serves as the foundation for all other interface implementations. 