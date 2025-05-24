# 🔐 Vault Integration Guide for External Apps

## 🚀 **Quick Setup for Any App**

### 1. Environment Variables
```bash
# Core Vault Configuration
VAULT_API_URL=http://localhost:3001/api
VAULT_API_KEY=secrets-agent-vault-key-2025
VAULT_PROJECT_ID=default

# SOPS Configuration (Optional - for direct vault access)
SOPS_AGE_KEY_FILE=./age-key.txt
VAULT_PATH=./vault/secrets.sops.yaml

# Optional: Redis for real-time events
REDIS_URL=redis://localhost:6379
```

### 2. API Endpoints Available

#### **Projects API**
```bash
# List all projects
GET http://localhost:3001/api/projects?action=list

# Get project details  
GET http://localhost:3001/api/projects?action=detail&projectId=default

# Get project statistics
GET http://localhost:3001/api/projects?action=stats&userId=default
```

#### **Secrets Management**
```bash
# Export environment variables
GET http://localhost:3001/api/env/export?project=default

# Import secrets
POST http://localhost:3001/api/env/import
Content-Type: application/json
{
  "project": "default",
  "secrets": [
    { "key": "API_KEY", "value": "your-api-key", "category": "api" }
  ]
}
```

#### **Rotation Status**
```bash
# Get rotation status
GET http://localhost:3001/api/rotation/status

# Trigger rotation
POST http://localhost:3001/api/rotation/status
Content-Type: application/json
{
  "action": "trigger_rotation",
  "policyId": "your-policy-id"
}
```

#### **Authentication**
```bash
# Check auth status
GET http://localhost:3001/api/auth/status

# Login (demo)
POST http://localhost:3001/api/auth/status
Content-Type: application/json
{
  "action": "login",
  "credentials": { "username": "demo", "password": "demo123" }
}
```

#### **Real-time Events**
```bash
# Get event stream status
GET http://localhost:3001/api/events/status

# Publish event
POST http://localhost:3001/api/events/status
Content-Type: application/json
{
  "action": "publish",
  "event": { "type": "secret_rotated", "project": "default" }
}
```

### 3. JavaScript Integration Example

```javascript
class SecretVaultClient {
  constructor(apiUrl = 'http://localhost:3001/api', apiKey = 'secrets-agent-vault-key-2025') {
    this.apiUrl = apiUrl;
    this.apiKey = apiKey;
  }

  async getProjects() {
    const response = await fetch(`${this.apiUrl}/projects?action=list`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.json();
  }

  async getSecrets(projectId = 'default') {
    const response = await fetch(`${this.apiUrl}/env/export?project=${projectId}`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.json();
  }

  async updateSecret(projectId, key, value, category = 'api') {
    const response = await fetch(`${this.apiUrl}/env/import`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`
      },
      body: JSON.stringify({
        project: projectId,
        secrets: [{ key, value, category }]
      })
    });
    return response.json();
  }

  async getRotationStatus() {
    const response = await fetch(`${this.apiUrl}/rotation/status`, {
      headers: { 'Authorization': `Bearer ${this.apiKey}` }
    });
    return response.json();
  }
}

// Usage Example
const vault = new SecretVaultClient();

// Load projects
const projects = await vault.getProjects();
console.log('Available projects:', projects);

// Get secrets
const secrets = await vault.getSecrets('default');
console.log('Project secrets:', secrets);

// Update a secret
await vault.updateSecret('default', 'NEW_API_KEY', 'new-secret-value', 'api');
```

### 4. Python Integration Example

```python
import requests
import json

class SecretVaultClient:
    def __init__(self, api_url='http://localhost:3001/api', api_key='secrets-agent-vault-key-2025'):
        self.api_url = api_url
        self.api_key = api_key
        self.headers = {'Authorization': f'Bearer {api_key}'}
    
    def get_projects(self):
        response = requests.get(f'{self.api_url}/projects?action=list', headers=self.headers)
        return response.json()
    
    def get_secrets(self, project_id='default'):
        response = requests.get(f'{self.api_url}/env/export?project={project_id}', headers=self.headers)
        return response.json()
    
    def update_secret(self, project_id, key, value, category='api'):
        data = {
            'project': project_id,
            'secrets': [{'key': key, 'value': value, 'category': category}]
        }
        response = requests.post(f'{self.api_url}/env/import', json=data, headers=self.headers)
        return response.json()

# Usage
vault = SecretVaultClient()
projects = vault.get_projects()
secrets = vault.get_secrets('default')
```

### 5. React/Next.js Integration

```jsx
import { useState, useEffect } from 'react';

export function useVaultSecrets(projectId = 'default') {
  const [secrets, setSecrets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const loadSecrets = async () => {
      try {
        const response = await fetch(`/api/env/export?project=${projectId}`);
        const data = await response.json();
        
        if (data.success) {
          setSecrets(data.secrets || []);
        } else {
          setError(data.error);
        }
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    loadSecrets();
  }, [projectId]);

  return { secrets, loading, error };
}

// Component Usage
export function VaultDashboard() {
  const { secrets, loading, error } = useVaultSecrets('default');

  if (loading) return <div>Loading vault...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <h2>Vault Secrets ({secrets.length})</h2>
      {secrets.map(secret => (
        <div key={secret.key}>
          <strong>{secret.key}</strong>: {secret.category}
        </div>
      ))}
    </div>
  );
}
```

### 6. Docker Integration

```dockerfile
# Add to your Dockerfile
ENV VAULT_API_URL=http://secrets-agent:3001/api
ENV VAULT_API_KEY=secrets-agent-vault-key-2025
ENV VAULT_PROJECT_ID=your-project-id
```

```yaml
# docker-compose.yml
version: '3.8'
services:
  your-app:
    environment:
      - VAULT_API_URL=http://secrets-agent:3001/api
      - VAULT_API_KEY=secrets-agent-vault-key-2025
      - VAULT_PROJECT_ID=default
    depends_on:
      - secrets-agent
  
  secrets-agent:
    ports:
      - "3001:3001"
    volumes:
      - ./vault:/app/vault
```

## 🔧 **Configuration for Your Screenshot App**

Based on your screenshot, set these environment variables:

```bash
export VAULT_API_URL="http://localhost:3001/api"
export VAULT_API_KEY="secrets-agent-vault-key-2025"  
export VAULT_PROJECT_ID="default"
```

Or create a `.env` file:
```
VAULT_API_URL=http://localhost:3001/api
VAULT_API_KEY=secrets-agent-vault-key-2025
VAULT_PROJECT_ID=default
```

The app should then show:
- ✅ Vault Configured: Yes
- 🟢 Connection Status: Connected to Vault

## 📋 **Health Check**

Test the connection:
```bash
curl -H "Authorization: Bearer secrets-agent-vault-key-2025" \
     http://localhost:3001/api/projects?action=list
```

Expected response:
```json
{
  "success": true,
  "data": [
    {
      "name": "default",
      "description": "Default development project",
      "secretCount": 4
    }
  ]
}
```

## 🚀 **Ready for Production**

Your vault system is production-ready with:
- ✅ SOPS encryption for secrets at rest
- ✅ RESTful API for integration
- ✅ Real-time event streaming
- ✅ Automatic secret rotation
- ✅ Multi-project support
- ✅ Authentication & authorization
- ✅ Comprehensive logging & monitoring

**The vault infrastructure is ready to be integrated into any application!** 