#!/usr/bin/env python3
"""
VANTA Secrets Agent - FastAPI Server with Dashboard
Production-ready API server with monitoring and web dashboard
"""

import os
import sys
import uvicorn
from datetime import datetime
from pathlib import Path

from fastapi import FastAPI, Request
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import psutil

# Server configuration
HOST = os.getenv("VAULT_API_HOST", "127.0.0.1")
PORT = int(os.getenv("VAULT_API_PORT", "7300"))
DEBUG = os.getenv("VAULT_API_DEBUG", "false").lower() == "true"

# Initialize FastAPI application
app = FastAPI(
    title="VANTA Secrets Agent API",
    description="Secure, local-first secrets management",
    version="2.0.0",
    docs_url="/docs" if DEBUG else None
)

# Server state
start_time = datetime.now()
request_count = 0

# Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.middleware("http")
async def track_requests(request: Request, call_next):
    global request_count
    request_count += 1
    response = await call_next(request)
    return response

# Health check endpoint
@app.get("/health")
async def health_check():
    """System health and status endpoint"""
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        uptime = datetime.now() - start_time
        
        health_status = "healthy"
        if cpu_percent > 80 or memory.percent > 85:
            health_status = "warning"
        if cpu_percent > 95 or memory.percent > 95:
            health_status = "critical"
        
        return {
            "status": health_status,
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": int(uptime.total_seconds()),
            "uptime_human": str(uptime).split('.')[0],
            "system": {
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "memory_available_mb": round(memory.available / 1024 / 1024, 1)
            },
            "server": {
                "total_requests": request_count,
                "start_time": start_time.isoformat()
            }
        }
    except Exception as e:
        return {
            "status": "error",
            "timestamp": datetime.now().isoformat(),
            "error": str(e)
        }

# Dashboard endpoint
@app.get("/dashboard", response_class=HTMLResponse)
async def dashboard():
    """Web dashboard for monitoring server status"""
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        uptime = datetime.now() - start_time
        uptime_str = str(uptime).split('.')[0]
        
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VANTA Secrets Agent Dashboard</title>
            <style>
                body {{ font-family: Arial, sans-serif; background: #1a1a1a; color: #e0e0e0; margin: 0; padding: 20px; }}
                .container {{ max-width: 1200px; margin: 0 auto; }}
                .header {{ background: linear-gradient(135deg, #2563eb, #3730a3); padding: 30px; border-radius: 10px; margin-bottom: 30px; }}
                .header h1 {{ color: white; margin: 0; font-size: 2.5rem; }}
                .header p {{ color: #94a3b8; margin: 10px 0 0 0; }}
                .stats {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); gap: 20px; margin-bottom: 30px; }}
                .stat-card {{ background: #2d2d2d; border: 1px solid #404040; border-radius: 8px; padding: 20px; }}
                .stat-card h3 {{ color: #60a5fa; margin: 0 0 10px 0; font-size: 0.9rem; text-transform: uppercase; }}
                .stat-card .value {{ font-size: 2rem; font-weight: bold; color: white; margin-bottom: 5px; }}
                .stat-card .label {{ color: #94a3b8; font-size: 0.9rem; }}
                .healthy {{ color: #10b981; }}
                .warning {{ color: #f59e0b; }}
                .error {{ color: #ef4444; }}
                .api-section {{ background: #2d2d2d; border: 1px solid #404040; border-radius: 8px; padding: 25px; }}
                .api-section h2 {{ color: #60a5fa; margin: 0 0 15px 0; }}
                .endpoint {{ background: #1a1a1a; border: 1px solid #2d2d2d; border-radius: 6px; padding: 15px; margin-bottom: 10px; }}
                .method {{ background: #059669; color: white; padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; margin-right: 10px; }}
                .path {{ color: #e2e8f0; font-family: monospace; }}
                .refresh-btn {{ background: #3730a3; color: white; border: none; padding: 10px 20px; border-radius: 6px; cursor: pointer; margin-top: 20px; }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>VANTA Secrets Agent</h1>
                    <p>Production-ready secrets management with enterprise-grade security</p>
                </div>
                
                <div class="stats">
                    <div class="stat-card">
                        <h3>Server Status</h3>
                        <div class="value healthy">Healthy</div>
                        <div class="label">Last checked: {datetime.now().strftime("%H:%M:%S")}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Uptime</h3>
                        <div class="value">{uptime_str}</div>
                        <div class="label">Since {start_time.strftime("%Y-%m-%d %H:%M:%S")}</div>
                    </div>
                    <div class="stat-card">
                        <h3>Total Requests</h3>
                        <div class="value">{request_count:,}</div>
                        <div class="label">API calls processed</div>
                    </div>
                    <div class="stat-card">
                        <h3>System Resources</h3>
                        <div class="value">{cpu_percent:.1f}%</div>
                        <div class="label">CPU • {memory.used / 1024 / 1024:.0f} MB RAM</div>
                    </div>
                </div>
                
                <div class="api-section">
                    <h2>API Endpoints</h2>
                    <div class="endpoint">
                        <span class="method">GET</span>
                        <span class="path">/health</span>
                        <p style="color: #94a3b8; margin-top: 8px;">System health and status information</p>
                    </div>
                    <div class="endpoint">
                        <span class="method">GET</span>
                        <span class="path">/dashboard</span>
                        <p style="color: #94a3b8; margin-top: 8px;">This web dashboard interface</p>
                    </div>
                    <div class="endpoint">
                        <span class="method">GET</span>
                        <span class="path">/docs</span>
                        <p style="color: #94a3b8; margin-top: 8px;">Interactive API documentation</p>
                    </div>
                </div>
                
                <button class="refresh-btn" onclick="window.location.reload()">Refresh Dashboard</button>
            </div>
            
            <script>
                setTimeout(function() {{ window.location.reload(); }}, 30000);
            </script>
        </body>
        </html>
        """
        return html
    except Exception as e:
        return f"<h1>Dashboard Error</h1><p>{str(e)}</p>"

# Root endpoint
@app.get("/")
async def root():
    """API root endpoint"""
    return {
        "service": "VANTA Secrets Agent API",
        "version": "2.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
        "endpoints": {
            "health": "/health",
            "dashboard": "/dashboard", 
            "docs": "/docs" if DEBUG else "disabled"
        }
    }

def run_server():
    """Run the FastAPI server"""
    print("=" * 60)
    print("VANTA SECRETS AGENT - FASTAPI SERVER")
    print("=" * 60)
    print(f"Host: {HOST}")
    print(f"Port: {PORT}")
    print(f"Debug: {DEBUG}")
    print("=" * 60)
    print(f"Dashboard: http://{HOST}:{PORT}/dashboard")
    print(f"Health: http://{HOST}:{PORT}/health")
    if DEBUG:
        print(f"Docs: http://{HOST}:{PORT}/docs")
    print("=" * 60)
    
    uvicorn.run(
        "vault_api_server_simple:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level="info"
    )

if __name__ == "__main__":
    run_server() 