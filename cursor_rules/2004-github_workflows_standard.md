# RULE TYPE: Always
# FILE PATTERNS: **/.github/workflows/*.yml, **/.github/workflows/*.yaml

## GitHub Workflows Standard - Enterprise CI/CD Pipeline

### Core Principles
- **Security First**: Multiple scanning tools and vulnerability detection
- **Quality Gates**: Comprehensive testing at unit, integration, and e2e levels
- **Multi-Environment**: Staging and production deployment with verification
- **Performance Monitoring**: Automated performance regression testing
- **Developer Experience**: Fast feedback, clear error reporting, caching optimization

### Required Workflow Structure

#### 1. **Main CI/CD Pipeline** (`ci.yml` or `ci-cd.yml`)
```yaml
name: CI/CD Pipeline

on:
  push:
    branches: [ main, develop ]
  pull_request:
    branches: [ main, develop ]
  release:
    types: [ published ]

concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true

env:
  NODE_VERSION: '20'  # or latest LTS
  REGISTRY_URL: ghcr.io
  IMAGE_NAME: ${{ github.repository }}

jobs:
  # REQUIRED: Security scanning must be first
  security-audit:
    name: Security Audit
    runs-on: ubuntu-latest
    timeout-minutes: 10
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
        with:
          fetch-depth: 0

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci --audit-level=moderate

      - name: Run security audit
        run: npm audit --audit-level=moderate

      - name: Scan for secrets
        uses: trufflesecurity/trufflehog@main
        with:
          path: ./
          base: main
          head: HEAD
          extra_args: --debug --only-verified

  # REQUIRED: Code quality checks
  code-quality:
    name: Code Quality & Linting
    runs-on: ubuntu-latest
    timeout-minutes: 15
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run ESLint
        run: npm run lint:check

      - name: Run Prettier
        run: npm run format:check

      - name: TypeScript compilation
        run: npm run build

  # REQUIRED: Multi-version testing
  unit-tests:
    name: Unit Tests
    runs-on: ubuntu-latest
    timeout-minutes: 20
    strategy:
      matrix:
        node-version: ['18', '20', '21']
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Setup Node.js ${{ matrix.node-version }}
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Run unit tests
        run: npm run test:unit -- --coverage --watchAll=false

      - name: Upload coverage to Codecov
        uses: codecov/codecov-action@v3
        with:
          file: ./coverage/lcov.info
          flags: unit-tests
          name: unit-tests-${{ matrix.node-version }}
```

#### 2. **Docker Build with Security Scanning**
```yaml
  docker-build:
    name: Docker Build & Security Scan
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: [security-audit, code-quality]
    steps:
      - name: Checkout code
        uses: actions/checkout@v4

      - name: Set up Docker Buildx
        uses: docker/setup-buildx-action@v3

      - name: Login to Container Registry
        if: github.event_name != 'pull_request'
        uses: docker/login-action@v3
        with:
          registry: ${{ env.REGISTRY_URL }}
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Extract metadata
        id: meta
        uses: docker/metadata-action@v5
        with:
          images: ${{ env.REGISTRY_URL }}/${{ env.IMAGE_NAME }}
          tags: |
            type=ref,event=branch
            type=ref,event=pr
            type=sha,prefix={{branch}}-
            type=raw,value=latest,enable={{is_default_branch}}

      - name: Build Docker image
        uses: docker/build-push-action@v5
        with:
          context: .
          platforms: linux/amd64,linux/arm64
          push: ${{ github.event_name != 'pull_request' }}
          tags: ${{ steps.meta.outputs.tags }}
          labels: ${{ steps.meta.outputs.labels }}
          cache-from: type=gha
          cache-to: type=gha,mode=max

      - name: Run Trivy vulnerability scanner
        uses: aquasecurity/trivy-action@master
        with:
          image-ref: ${{ env.REGISTRY_URL }}/${{ env.IMAGE_NAME }}:latest
          format: 'sarif'
          output: 'trivy-results.sarif'

      - name: Upload Trivy scan results
        uses: github/codeql-action/upload-sarif@v3
        if: always()
        with:
          sarif_file: 'trivy-results.sarif'
```

#### 3. **Required Deployment Workflows**
```yaml
  deploy-staging:
    name: Deploy to Staging
    runs-on: ubuntu-latest
    timeout-minutes: 15
    needs: [unit-tests, integration-tests, docker-build]
    if: github.ref == 'refs/heads/develop'
    environment:
      name: staging
      url: https://staging.your-app.example.com
    steps:
      - name: Deploy to staging
        run: |
          echo "Deploying to staging environment"
          # Add your deployment commands here

  deploy-production:
    name: Deploy to Production
    runs-on: ubuntu-latest
    timeout-minutes: 20
    needs: [e2e-tests, performance-tests, docker-build]
    if: github.event_name == 'release'
    environment:
      name: production
      url: https://your-app.example.com
    steps:
      - name: Deploy to production
        run: |
          echo "Deploying to production environment"
          # Add your production deployment commands here

      - name: Post-deployment verification
        run: |
          npm run verify:production
```

### **Security Workflows (Required)**

#### **Secrets Preflight** (`secrets-preflight.yml`)
```yaml
name: 'Secrets Preflight'

on:
  push:
    branches: [ main ]
  pull_request:

jobs:
  preflight:
    name: Preflight secrets scan
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
        with:
          fetch-depth: 0
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Install sops and age
        run: |
          sudo apt-get update && sudo apt-get install -y gnupg2 age
          curl -sSL https://github.com/mozilla/sops/releases/download/v3.8.2/sops-v3.8.2.linux.amd64 -o sops
          chmod +x sops && sudo mv sops /usr/local/bin/
      - name: Run preflight
        run: npx ts-node scripts/secrets-preflight.ts
```

#### **Secrets Rotation** (`secrets-rotation.yml`)
```yaml
name: 'Secrets Rotation'

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday

jobs:
  rotate:
    name: Rotate secrets
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v3
      - name: Set up Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: npm ci
      - name: Rotate secrets via script
        env:
          VAULT_ADDR: ${{ secrets.VAULT_ADDR }}
          VAULT_TOKEN: ${{ secrets.VAULT_TOKEN }}
        run: npx ts-node scripts/rotate-secrets.ts
```

### **Package.json Script Requirements**

All projects MUST have these npm scripts:
```json
{
  "scripts": {
    "lint": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:check": "eslint . --ext .ts,.tsx,.js,.jsx",
    "lint:fix": "eslint . --ext .ts,.tsx,.js,.jsx --fix",
    "format": "prettier --write .",
    "format:check": "prettier --check .",
    "build": "tsc && vite build",
    "test": "jest",
    "test:unit": "jest --testPathPattern=unit",
    "test:integration": "jest --testPathPattern=integration",
    "test:e2e": "playwright test",
    "test:performance": "lighthouse ci",
    "verify:production": "curl -f $PRODUCTION_URL/health"
  }
}
```

### **Required GitHub Secrets**
```yaml
# Core secrets (MUST be configured)
GITHUB_TOKEN: # Automatic
VAULT_ADDR: # HashiCorp Vault
VAULT_TOKEN: # Vault authentication

# Optional but recommended
SNYK_TOKEN: # Security scanning
SONAR_TOKEN: # Code quality
CODECOV_TOKEN: # Coverage reporting
DOCKER_HUB_USERNAME: # Container registry
DOCKER_HUB_TOKEN: # Container authentication
```

### **Validation Checklist**

#### **Security Requirements**
- [ ] TruffleHog secrets scanning enabled
- [ ] npm audit with moderate threshold
- [ ] Trivy container vulnerability scanning
- [ ] Snyk integration (if token available)
- [ ] SOPS/age encryption for secrets

#### **Quality Requirements**
- [ ] ESLint configuration and checks
- [ ] Prettier formatting validation
- [ ] TypeScript compilation verification
- [ ] Multi-version Node.js testing
- [ ] Code coverage reporting

#### **Testing Requirements**
- [ ] Unit tests with coverage
- [ ] Integration tests with service dependencies
- [ ] E2E tests with realistic scenarios
- [ ] Performance regression testing

#### **Deployment Requirements**
- [ ] Staging environment deployment
- [ ] Production environment deployment
- [ ] Post-deployment verification
- [ ] Environment-specific configurations
- [ ] Rollback procedures documented

#### **Performance Requirements**
- [ ] Concurrency groups for efficiency
- [ ] npm/Docker caching enabled
- [ ] Timeout limits on all jobs
- [ ] Artifact cleanup strategies

### **Integration with DGM**
```yaml
# Add to CI pipeline for DGM-enabled projects
  dgm-evolution:
    name: DGM Evolution Validation
    runs-on: ubuntu-latest
    needs: [unit-tests]
    if: contains(github.event.head_commit.message, '[dgm]')
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ env.NODE_VERSION }}
          cache: 'npm'
          
      - name: Install dependencies
        run: npm ci
        
      - name: Run DGM benchmark validation
        run: npm run dgm:validate
        
      - name: Archive DGM results
        uses: actions/upload-artifact@v4
        with:
          name: dgm-evolution-results
          path: data/dgm_archive/
```

### **Examples**

✅ **Good**: Complete CI/CD workflow
```yaml
name: CI/CD Pipeline
on: [push, pull_request]
concurrency:
  group: ${{ github.workflow }}-${{ github.ref }}
  cancel-in-progress: true
jobs:
  security-audit: # Required
  code-quality:   # Required  
  unit-tests:     # Required
  docker-build:   # Required
  deploy-staging: # Required for develop
  deploy-production: # Required for releases
```

❌ **Bad**: Minimal/incomplete CI
```yaml
name: Basic Test
on: [push]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - run: npm test
```

### **Migration Guide**

For existing projects without this CI/CD structure:

1. **Phase 1**: Add security-audit and code-quality jobs
2. **Phase 2**: Implement comprehensive testing (unit, integration, e2e)
3. **Phase 3**: Add Docker build with vulnerability scanning  
4. **Phase 4**: Implement staging/production deployment
5. **Phase 5**: Add performance testing and monitoring

### **Maintenance Requirements**

- **Weekly**: Review security scan results and update dependencies
- **Monthly**: Update workflow dependencies and review performance metrics
- **Quarterly**: Audit and optimize workflow efficiency

This standard ensures every project has enterprise-grade CI/CD with security, quality, and deployment best practices built-in. 