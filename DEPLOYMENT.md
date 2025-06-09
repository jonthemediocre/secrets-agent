# 🚀 Secrets Agent - Production Deployment Guide

## 📋 Prerequisites

- Docker and Docker Compose installed
- Node.js 18+ (for development)
- Git for version control
- SSL certificates (for HTTPS in production)

## 🔧 Quick Start (Development)

```bash
# Clone the repository
git clone <repository-url>
cd secrets-agent

# Install dependencies
npm install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
npm run dev
```

## 🐳 Docker Deployment

### Option 1: Docker Compose (Recommended)

```bash
# Set environment variables
export JWT_SECRET="your-super-secure-jwt-secret-here"

# Start the application
docker-compose up -d

# Check health
curl http://localhost:3000/api/health
```

### Option 2: Docker Build & Run

```bash
# Build the image
docker build -t secrets-agent .

# Run the container
docker run -d \
  --name secrets-agent \
  -p 3000:3000 \
  -e NODE_ENV=production \
  -e JWT_SECRET="your-super-secure-jwt-secret-here" \
  -v secrets_data:/app/data \
  secrets-agent
```

## 🔒 Security Configuration

### 1. Environment Variables

Create a `.env.production` file:

```env
NODE_ENV=production
JWT_SECRET=your-256-bit-secret-key-here
DATABASE_URL=file:./data/secrets-agent.db
LOG_LEVEL=info
CORS_ORIGIN=https://yourdomain.com
```

### 2. Generate Secure JWT Secret

```bash
# Generate a secure 256-bit key
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

### 3. SSL/TLS Configuration

For production, configure HTTPS using:
- Let's Encrypt certificates
- Cloudflare SSL
- Load balancer SSL termination

## 🌐 Production Deployment Options

### Option 1: Cloud Platforms

#### Vercel (Recommended for Next.js)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

#### Railway
```bash
# Install Railway CLI
npm i -g @railway/cli

# Deploy
railway login
railway deploy
```

#### DigitalOcean App Platform
1. Connect your GitHub repository
2. Set environment variables
3. Deploy automatically

### Option 2: VPS/Server Deployment

#### Using Docker Compose
```bash
# On your server
git clone <repository-url>
cd secrets-agent

# Set production environment
cp .env.example .env.production
# Edit .env.production with your values

# Deploy with nginx reverse proxy
docker-compose -f docker-compose.yml up -d
```

#### Using PM2 (Node.js Process Manager)
```bash
# Install PM2
npm install -g pm2

# Build the application
npm run build

# Start with PM2
pm2 start ecosystem.config.js --env production

# Save PM2 configuration
pm2 save
pm2 startup
```

## 📊 Monitoring & Health Checks

### Health Check Endpoint
```bash
# Check application health
curl http://localhost:3000/api/health

# Expected response:
{
  "status": "healthy",
  "timestamp": "2025-01-15T10:30:00.000Z",
  "database": {
    "status": "connected",
    "latency": 5
  },
  "system": {
    "memory": { "used": 45, "total": 128 },
    "uptime": 3600
  }
}
```

### Monitoring Setup

#### Prometheus Metrics (Optional)
```yaml
# Add to docker-compose.yml
prometheus:
  image: prom/prometheus
  ports:
    - "9090:9090"
  volumes:
    - ./prometheus.yml:/etc/prometheus/prometheus.yml
```

#### Log Monitoring
```bash
# View application logs
docker-compose logs -f secrets-agent

# Or with PM2
pm2 logs secrets-agent
```

## 🔄 CI/CD Pipeline

The repository includes a GitHub Actions workflow that:

1. **Tests**: Runs all unit and integration tests
2. **Security Scan**: Vulnerability scanning with Trivy
3. **Build**: Creates Docker image
4. **Deploy**: Automatic deployment to production

### Setup GitHub Actions

1. Enable GitHub Actions in your repository
2. Set repository secrets:
   - `DOCKER_REGISTRY_TOKEN`
   - `PRODUCTION_SERVER_SSH_KEY`
   - `PRODUCTION_SERVER_HOST`

## 🛠 Database Management

### Backup Procedures
```bash
# Backup SQLite database
cp ./data/secrets-agent.db ./backups/backup-$(date +%Y%m%d).db

# Automated backup script
#!/bin/bash
BACKUP_DIR="./backups"
DATE=$(date +%Y%m%d_%H%M%S)
cp ./data/secrets-agent.db "$BACKUP_DIR/backup-$DATE.db"
find "$BACKUP_DIR" -name "backup-*.db" -mtime +7 -delete
```

### Database Migrations
```bash
# Run migrations in production
npx prisma migrate deploy

# Reset database (DANGER - only for development)
npx prisma migrate reset
```

## 🚨 Troubleshooting

### Common Issues

#### 1. Database Connection Errors
```bash
# Check database file permissions
ls -la ./data/secrets-agent.db

# Regenerate Prisma client
npx prisma generate
```

#### 2. JWT Token Issues
```bash
# Verify JWT secret is set
echo $JWT_SECRET

# Check token expiration in logs
docker-compose logs secrets-agent | grep "token"
```

#### 3. Memory Issues
```bash
# Check container memory usage
docker stats secrets-agent

# Increase memory limit
docker run --memory=512m secrets-agent
```

### Performance Optimization

#### 1. Database Optimization
```sql
-- Add indexes for better performance
CREATE INDEX idx_secrets_vault_id ON Secret(vaultId);
CREATE INDEX idx_vaults_user_id ON Vault(userId);
```

#### 2. Caching
```javascript
// Add Redis caching (optional)
const redis = require('redis');
const client = redis.createClient();
```

## 📈 Scaling Considerations

### Horizontal Scaling
- Use load balancer (nginx, HAProxy)
- Database clustering (PostgreSQL)
- Session storage (Redis)

### Vertical Scaling
- Increase container memory/CPU
- Optimize database queries
- Enable compression

## 🔐 Security Checklist

- [ ] JWT secret is cryptographically secure (256-bit)
- [ ] Database is encrypted at rest
- [ ] HTTPS is enabled in production
- [ ] Rate limiting is configured
- [ ] Security headers are set
- [ ] Input validation is implemented
- [ ] Audit logging is enabled
- [ ] Regular security updates are applied

## 📞 Support

For deployment issues:
1. Check the health endpoint: `/api/health`
2. Review application logs
3. Verify environment variables
4. Check database connectivity
5. Validate SSL certificates

---

**🎉 Congratulations!** Your Secrets Agent is now ready for production deployment with enterprise-grade security and monitoring. 