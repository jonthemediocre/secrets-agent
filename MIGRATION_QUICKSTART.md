# 🚀 VANTA Framework Hybrid Migration - Quick Start

## ⚡ **One-Command Migration**

### **Windows (PowerShell)**
```powershell
.\scripts\quick-start-migration.ps1
```

### **Linux/Mac (Bash)**
```bash
bash scripts/quick-start-migration.sh
```

---

## 🎯 **What This Does**

This single command will:

✅ **Check Prerequisites** (Docker, Node.js, npm)  
✅ **Generate Secure Configuration** (.env with random passwords)  
✅ **Start Database Infrastructure** (PostgreSQL + Redis)  
✅ **Run Database Migrations** (Create all tables and indexes)  
✅ **Verify Setup** (Health checks and connectivity tests)  
✅ **Create Initial Backup** (Automated backup system)  
✅ **Optional Monitoring** (Prometheus exporters)  

---

## 📋 **Prerequisites**

- ✅ **Docker** & **Docker Compose** installed
- ✅ **Node.js** & **npm** installed  
- ✅ **~2GB free disk space** for databases
- ✅ **Ports available**: 5432, 5433, 6379, 6432, 26379

---

## ⏱️ **Migration Timeline**

| Phase | Duration | Description |
|-------|----------|-------------|
| **Setup** | 1-2 min | Prerequisites check + .env generation |
| **Infrastructure** | 2-3 min | PostgreSQL + Redis startup |
| **Migration** | 1-2 min | Database schema creation |
| **Verification** | 30 sec | Health checks and validation |
| **Backup** | 1 min | Initial backup creation |

**Total: ~5-8 minutes** ⏰

---

## 🔧 **Post-Migration Commands**

### **Database Management**
```bash
# Check database status
npm run database:logs

# View migration history
npm run migrate:status

# Create backup
npm run backup:create

# Stop databases
npm run database:stop
```

### **Health Monitoring**
```bash
# Full health check
npm run health:check

# Performance benchmark
npm run benchmark:database

# Security scan
npm run security:scan
```

---

## 📊 **Connection Details**

After successful migration:

| Service | Endpoint | Purpose |
|---------|----------|---------|
| **PostgreSQL Primary** | `localhost:5432` | Main database |
| **PostgreSQL Pool** | `localhost:6432` | Connection pooling |
| **PostgreSQL Replica** | `localhost:5433` | Read replicas |
| **Redis Master** | `localhost:6379` | Cache & sessions |
| **Redis Sentinel** | `localhost:26379` | High availability |

---

## 🛠️ **Troubleshooting**

### **Port Conflicts**
```bash
# Check what's using ports
netstat -tulpn | grep :5432
# or on Windows:
netstat -an | findstr :5432
```

### **Docker Issues**
```bash
# Restart Docker service
sudo systemctl restart docker
# or restart Docker Desktop on Windows

# Clear Docker cache
docker system prune -a
```

### **Database Connection Issues**
```bash
# Reset database completely
npm run database:reset

# Check container logs
docker logs vanta-postgres-primary
docker logs vanta-redis-master
```

---

## 🎉 **Success Indicators**

You'll know the migration succeeded when you see:

✅ **"VANTA Framework is now running with hybrid state management!"**  
✅ **All services showing as "Up" in Docker status**  
✅ **PostgreSQL accepting connections on port 6432**  
✅ **Redis responding to PING commands**  
✅ **9+ tables created in the vanta schema**  

---

## 📈 **Next Steps**

1. **Update your application** to use `DATABASE_URL` from `.env`
2. **Test your app** with `npm run dev`
3. **Monitor performance** with the new database backend
4. **Set up automated backups** for production
5. **Configure alerts** for monitoring

---

## 🔄 **Rollback Plan**

If you need to rollback:

```bash
# Stop hybrid database
npm run database:stop

# Switch back to filesystem mode
export DATABASE_MODE=filesystem

# Restart original application
npm run start
```

---

## 💡 **Pro Tips**

- **Run during low-traffic hours** for production systems
- **Test on staging environment** first
- **Monitor disk space** during migration
- **Keep your original data backup** until fully validated
- **Update DNS/load balancers** after validation

---

## 🆘 **Support**

If you encounter issues:

1. Check the **migration logs** in the console output
2. Review **Docker container logs**: `npm run database:logs`
3. Verify **environment variables** in `.env` file
4. Ensure **all ports are available** and not blocked by firewall

**Ready to go? Run the migration command above!** 🚀 