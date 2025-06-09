#!/usr/bin/env python3
"""
VANTA Secrets Agent - FastAPI Server with Dashboard
Production-ready API server with monitoring, health checks, and web dashboard
"""

import os
import sys
import asyncio
import uvicorn
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, HTTPException, Request, Depends
from fastapi.staticfiles import StaticFiles
from fastapi.templating import Jinja2Templates
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
import psutil

# Import our API routes
try:
    from app.api.v1.vault.routes import router as vault_router
except ImportError:
    print("⚠️  Warning: Vault routes not found. Creating stub routes.")
    from fastapi import APIRouter
    vault_router = APIRouter()

# Server configuration
class ServerConfig:
    def __init__(self):
        self.host = os.getenv("VAULT_API_HOST", "127.0.0.1")
        self.port = int(os.getenv("VAULT_API_PORT", "7300"))
        self.debug = os.getenv("VAULT_API_DEBUG", "false").lower() == "true"
        self.reload = self.debug
        self.workers = int(os.getenv("VAULT_API_WORKERS", "1"))
        
config = ServerConfig()

# Initialize FastAPI application
app = FastAPI(
    title="VANTA Secrets Agent API",
    description="Secure, local-first secrets management with agentic capabilities",
    version="2.0.0",
    docs_url="/docs" if config.debug else None,
    redoc_url="/redoc" if config.debug else None,
    openapi_url="/openapi.json" if config.debug else None
)

# Server state tracking
class ServerState:
    def __init__(self):
        self.start_time = datetime.now()
        self.request_count = 0
        self.health_status = "healthy"
        self.last_health_check = datetime.now()
        self.active_connections = 0
        
server_state = ServerState()

# Middleware configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:7300"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=["localhost", "127.0.0.1", "*.localhost"]
)

# Request tracking middleware
@app.middleware("http")
async def track_requests(request: Request, call_next):
    server_state.request_count += 1
    server_state.active_connections += 1
    
    start_time = datetime.now()
    response = await call_next(request)
    process_time = (datetime.now() - start_time).total_seconds()
    
    server_state.active_connections -= 1
    
    # Add performance headers
    response.headers["X-Process-Time"] = str(process_time)
    response.headers["X-Request-ID"] = str(server_state.request_count)
    
    return response

# Dashboard templates
templates_dir = Path("templates")
templates_dir.mkdir(exist_ok=True)

# Create dashboard template if it doesn't exist
dashboard_template = """
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>VANTA Secrets Agent Dashboard</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #0f1419; color: #e6e6e6; }
        .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
        .header { background: linear-gradient(135deg, #1e3a8a, #3730a3); padding: 30px; border-radius: 12px; margin-bottom: 30px; box-shadow: 0 8px 32px rgba(0,0,0,0.3); }
        .header h1 { font-size: 2.5rem; font-weight: 700; color: white; margin-bottom: 10px; }
        .header p { color: #94a3b8; font-size: 1.1rem; }
        .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }
        .stat-card { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 20px; }
        .stat-card h3 { color: #60a5fa; font-size: 0.9rem; text-transform: uppercase; margin-bottom: 8px; font-weight: 600; }
        .stat-card .value { font-size: 2rem; font-weight: 700; color: white; margin-bottom: 5px; }
        .stat-card .label { color: #94a3b8; font-size: 0.9rem; }
        .status-healthy { color: #10b981; }
        .status-warning { color: #f59e0b; }
        .status-error { color: #ef4444; }
        .api-section { background: #1e293b; border: 1px solid #334155; border-radius: 8px; padding: 25px; margin-bottom: 20px; }
        .api-section h2 { color: #60a5fa; margin-bottom: 15px; font-size: 1.3rem; }
        .endpoint { background: #0f172a; border: 1px solid #1e293b; border-radius: 6px; padding: 15px; margin-bottom: 10px; }
        .endpoint .method { display: inline-block; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; font-weight: 600; margin-right: 10px; }
        .method.GET { background: #059669; color: white; }
        .method.POST { background: #dc2626; color: white; }
        .endpoint .path { color: #e2e8f0; font-family: 'Monaco', monospace; }
        .refresh-btn { background: #3730a3; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 20px; }
        .refresh-btn:hover { background: #312e81; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🛡️ VANTA Secrets Agent</h1>
            <p>Production-ready secrets management with enterprise-grade security</p>
        </div>
        
        <div class="stats-grid">
            <div class="stat-card">
                <h3>Server Status</h3>
                <div class="value status-{{ status_class }}">{{ health_status }}</div>
                <div class="label">Last checked: {{ last_health_check }}</div>
            </div>
            <div class="stat-card">
                <h3>Uptime</h3>
                <div class="value">{{ uptime }}</div>
                <div class="label">Since {{ start_time }}</div>
            </div>
            <div class="stat-card">
                <h3>Total Requests</h3>
                <div class="value">{{ request_count }}</div>
                <div class="label">Active connections: {{ active_connections }}</div>
            </div>
            <div class="stat-card">
                <h3>System Resources</h3>
                <div class="value">{{ cpu_percent }}%</div>
                <div class="label">CPU • {{ memory_mb }} MB RAM</div>
            </div>
        </div>
        
        <div class="api-section">
            <h2>🔌 API Endpoints</h2>
            <div class="endpoint">
                <span class="method GET">GET</span>
                <span class="path">/health</span>
                <p style="color: #94a3b8; margin-top: 8px;">System health and status information</p>
            </div>
            <div class="endpoint">
                <span class="method GET">GET</span>
                <span class="path">/dashboard</span>
                <p style="color: #94a3b8; margin-top: 8px;">This web dashboard interface</p>
            </div>
            <div class="endpoint">
                <span class="method GET">GET</span>
                <span class="path">/api/v1/vault/{environment}/{key}</span>
                <p style="color: #94a3b8; margin-top: 8px;">Retrieve encrypted secrets with JWT authentication</p>
            </div>
            <div class="endpoint">
                <span class="method POST">POST</span>
                <span class="path">/api/v1/vault/tokens/generate</span>
                <p style="color: #94a3b8; margin-top: 8px;">Generate secure access tokens for vault operations</p>
            </div>
            <div class="endpoint">
                <span class="method GET">GET</span>
                <span class="path">/docs</span>
                <p style="color: #94a3b8; margin-top: 8px;">Interactive API documentation (dev mode)</p>
            </div>
        </div>
        
        <button class="refresh-btn" onclick="window.location.reload()">🔄 Refresh Dashboard</button>
    </div>
    
    <script>
        // Auto-refresh every 30 seconds
        setTimeout(function() {
            window.location.reload();
        }, 30000);
    </script>
</body>
</html>
"""

# Write dashboard template
with open(templates_dir / "dashboard.html", "w", encoding="utf-8") as f:
    f.write(dashboard_template)

templates = Jinja2Templates(directory="templates")

# Health check endpoint
@app.get("/health", tags=["System"])
async def health_check():
    """System health and status endpoint"""
    try:
        # Update health check time
        server_state.last_health_check = datetime.now()
        
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        disk = psutil.disk_usage('/')
        
        # Calculate uptime
        uptime = datetime.now() - server_state.start_time
        
        # Determine health status
        health_status = "healthy"
        if cpu_percent > 80 or memory.percent > 85:
            health_status = "warning"
        if cpu_percent > 95 or memory.percent > 95:
            health_status = "critical"
            
        server_state.health_status = health_status
        
        return {
            "status": health_status,
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": int(uptime.total_seconds()),
            "uptime_human": str(uptime).split('.')[0],
            "system": {
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "memory_available_mb": round(memory.available / 1024 / 1024, 1),
                "disk_percent": round(disk.percent, 1),
                "disk_free_gb": round(disk.free / 1024 / 1024 / 1024, 1)
            },
            "server": {
                "total_requests": server_state.request_count,
                "active_connections": server_state.active_connections,
                "start_time": server_state.start_time.isoformat()
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

# Dashboard endpoint
@app.get("/dashboard", response_class=HTMLResponse, tags=["Dashboard"])
async def dashboard(request: Request):
    """Web dashboard for monitoring server status"""
    try:
        # Get system metrics
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        
        # Calculate uptime
        uptime = datetime.now() - server_state.start_time
        uptime_str = str(uptime).split('.')[0]
        
        # Determine status class for styling
        status_class = "healthy"
        if server_state.health_status == "warning":
            status_class = "warning"
        elif server_state.health_status in ["critical", "error"]:
            status_class = "error"
        
        return templates.TemplateResponse("dashboard.html", {
            "request": request,
            "health_status": server_state.health_status.title(),
            "status_class": status_class,
            "uptime": uptime_str,
            "start_time": server_state.start_time.strftime("%Y-%m-%d %H:%M:%S"),
            "last_health_check": server_state.last_health_check.strftime("%H:%M:%S"),
            "request_count": f"{server_state.request_count:,}",
            "active_connections": server_state.active_connections,
            "cpu_percent": round(cpu_percent, 1),
            "memory_mb": round(memory.used / 1024 / 1024, 0)
        })
    except Exception as e:
        return HTMLResponse(f"<h1>Dashboard Error</h1><p>{str(e)}</p>", status_code=500)

# Root endpoint
@app.get("/", tags=["System"])
async def root():
    """API root endpoint with basic information"""
    return {
        "service": "VANTA Secrets Agent API",
        "version": "2.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/health",
            "dashboard": "/dashboard", 
            "docs": "/docs" if config.debug else "disabled",
            "vault_api": "/api/v1/vault/"
        }
    }

# Include vault API routes
app.include_router(vault_router, prefix="/api/v1")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Server startup initialization"""
    print("🚀 VANTA Secrets Agent API Server Starting...")
    print(f"📊 Dashboard: http://{config.host}:{config.port}/dashboard")
    print(f"🔍 Health Check: http://{config.host}:{config.port}/health")
    if config.debug:
        print(f"📚 API Docs: http://{config.host}:{config.port}/docs")
    print(f"🛡️  Vault API: http://{config.host}:{config.port}/api/v1/vault/")
    print("✅ Server ready for connections!")

# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Server shutdown cleanup"""
    print("🛑 VANTA Secrets Agent API Server Shutting Down...")
    print("✅ Cleanup completed successfully")

def run_server():
    """Run the FastAPI server with production configuration"""
    print("=" * 60)
    print("🛡️  VANTA SECRETS AGENT - FASTAPI SERVER")
    print("=" * 60)
    print(f"🌐 Host: {config.host}")
    print(f"🔌 Port: {config.port}")
    print(f"🔧 Debug Mode: {config.debug}")
    print(f"👥 Workers: {config.workers}")
    print("=" * 60)
    
    try:
        uvicorn.run(
            "vault_api_server:app",
            host=config.host,
            port=config.port,
            debug=config.debug,
            reload=config.reload,
            workers=config.workers if not config.debug else 1,
            access_log=True,
            log_level="info" if not config.debug else "debug"
        )
    except KeyboardInterrupt:
        print("\n🛑 Server stopped by user")
    except Exception as e:
        print(f"❌ Server error: {e}")
        sys.exit(1)

if __name__ == "__main__":
    run_server() 