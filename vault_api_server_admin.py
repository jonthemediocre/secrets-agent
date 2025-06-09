#!/usr/bin/env python3
"""
VANTA Secrets Agent - Comprehensive Admin Dashboard
Full-featured control panel with vault access, project management, and system controls
"""

import os
import sys
import json
import uvicorn
from datetime import datetime
from pathlib import Path
from typing import Dict, Any, List, Optional

from fastapi import FastAPI, Request, HTTPException, Form
from fastapi.responses import HTMLResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
import psutil

# Server configuration
HOST = os.getenv("VAULT_API_HOST", "127.0.0.1")
PORT = int(os.getenv("VAULT_API_PORT", "7300"))
DEBUG = os.getenv("VAULT_API_DEBUG", "true").lower() == "true"

# Initialize FastAPI application
app = FastAPI(
    title="VANTA Secrets Agent - Admin Console",
    description="Comprehensive control dashboard for secrets management",
    version="2.0.0",
    docs_url="/docs" if DEBUG else None
)

# Server state
start_time = datetime.now()
request_count = 0
function_registry = {}
sync_status = {"last_sync": None, "status": "pending", "errors": []}
project_files = []

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

# Function Registry System
def register_function(name: str, description: str, endpoint: str, method: str = "GET"):
    """Register a function in the system registry"""
    function_registry[name] = {
        "description": description,
        "endpoint": endpoint,
        "method": method,
        "last_executed": None,
        "execution_count": 0
    }

# Register core system functions
register_function("health_check", "System health monitoring", "/health", "GET")
register_function("vault_access", "Access encrypted secrets", "/vault/access", "POST")
register_function("vault_sync", "Synchronize vault data", "/vault/sync", "POST")
register_function("project_scan", "Scan project files", "/project/scan", "POST")
register_function("vacuum_cleanup", "Clean up temporary files", "/system/vacuum", "POST")
register_function("sync_status", "Check synchronization status", "/sync/status", "GET")
register_function("agent_deploy", "Deploy agentic workflows", "/agents/deploy", "POST")
register_function("mcp_discovery", "Discover MCP tools", "/mcp/discover", "POST")
register_function("domino_execute", "Execute domino mode operations", "/domino/execute", "POST")

# Enhanced Admin Dashboard
@app.get("/admin", response_class=HTMLResponse)
async def admin_dashboard():
    """Comprehensive admin control dashboard"""
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        uptime = datetime.now() - start_time
        uptime_str = str(uptime).split('.')[0]
        
        # Get project structure
        project_root = Path(".")
        project_files = []
        for file_type in ["*.py", "*.md", "*.json", "*.yaml", "*.yml"]:
            project_files.extend(list(project_root.glob(f"**/{file_type}")))
        
        # Vault status check
        vault_status = "🔒 Secured" if Path("keys/key.txt").exists() else "⚠️ Not Found"
        
        html = f"""
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>VANTA Admin Console</title>
            <style>
                * {{ margin: 0; padding: 0; box-sizing: border-box; }}
                body {{ font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #0a0e1a; color: #e0e6ed; }}
                .header {{ background: linear-gradient(135deg, #1a365d, #2b77cb); padding: 20px; text-align: center; }}
                .header h1 {{ color: white; font-size: 2.5rem; margin-bottom: 10px; }}
                .header p {{ color: #a0aec0; }}
                .container {{ max-width: 1400px; margin: 0 auto; padding: 20px; }}
                .dashboard-grid {{ display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 20px; margin-bottom: 30px; }}
                .panel {{ background: #1a202c; border: 1px solid #2d3748; border-radius: 8px; padding: 20px; }}
                .panel h3 {{ color: #4fd1c7; margin-bottom: 15px; display: flex; align-items: center; }}
                .panel h3 .icon {{ margin-right: 10px; font-size: 1.2rem; }}
                .stat-row {{ display: flex; justify-content: space-between; margin: 10px 0; }}
                .stat-label {{ color: #a0aec0; }}
                .stat-value {{ color: white; font-weight: bold; }}
                .function-grid {{ display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 15px; margin: 20px 0; }}
                .function-card {{ background: #2d3748; border: 1px solid #4a5568; border-radius: 6px; padding: 15px; }}
                .function-card h4 {{ color: #81e6d9; margin-bottom: 8px; }}
                .function-card p {{ color: #cbd5e0; font-size: 0.9rem; margin-bottom: 10px; }}
                .function-meta {{ display: flex; justify-content: space-between; font-size: 0.8rem; color: #a0aec0; }}
                .btn {{ background: #3182ce; color: white; border: none; padding: 8px 16px; border-radius: 4px; cursor: pointer; margin: 5px; }}
                .btn:hover {{ background: #2c5282; }}
                .btn-danger {{ background: #e53e3e; }}
                .btn-danger:hover {{ background: #c53030; }}
                .btn-success {{ background: #38a169; }}
                .btn-success:hover {{ background: #2f855a; }}
                .log-area {{ background: #1a1a1a; border: 1px solid #4a5568; border-radius: 6px; padding: 15px; height: 200px; overflow-y: auto; font-family: monospace; font-size: 0.85rem; }}
                .vault-controls {{ display: grid; grid-template-columns: 1fr 1fr; gap: 15px; }}
                .vault-input {{ background: #2d3748; border: 1px solid #4a5568; color: white; padding: 10px; border-radius: 4px; width: 100%; }}
                .status-indicator {{ display: inline-block; width: 12px; height: 12px; border-radius: 50%; margin-right: 8px; }}
                .status-healthy {{ background: #38a169; }}
                .status-warning {{ background: #d69e2e; }}
                .status-error {{ background: #e53e3e; }}
                .file-browser {{ max-height: 300px; overflow-y: auto; background: #1a1a1a; border: 1px solid #4a5568; padding: 10px; }}
                .file-item {{ padding: 5px; border-bottom: 1px solid #2d3748; cursor: pointer; }}
                .file-item:hover {{ background: #2d3748; }}
                .tabs {{ display: flex; border-bottom: 1px solid #4a5568; margin-bottom: 20px; }}
                .tab {{ background: #2d3748; border: 1px solid #4a5568; border-bottom: none; padding: 10px 20px; cursor: pointer; color: #a0aec0; }}
                .tab.active {{ background: #3182ce; color: white; }}
                .tab-content {{ display: none; }}
                .tab-content.active {{ display: block; }}
            </style>
        </head>
        <body>
            <div class="header">
                <h1>🛡️ VANTA Admin Console</h1>
                <p>Comprehensive Control Dashboard • Functions • Vault • Projects • Automation</p>
            </div>
            
            <div class="container">
                <!-- System Overview -->
                <div class="dashboard-grid">
                    <div class="panel">
                        <h3><span class="icon">📊</span>System Status</h3>
                        <div class="stat-row">
                            <span class="stat-label">Status:</span>
                            <span class="stat-value"><span class="status-indicator status-healthy"></span>Healthy</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Uptime:</span>
                            <span class="stat-value">{uptime_str}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">CPU:</span>
                            <span class="stat-value">{cpu_percent:.1f}%</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Memory:</span>
                            <span class="stat-value">{memory.used / 1024 / 1024:.0f} MB</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Requests:</span>
                            <span class="stat-value">{request_count:,}</span>
                        </div>
                    </div>
                    
                    <div class="panel">
                        <h3><span class="icon">🔐</span>Vault Status</h3>
                        <div class="stat-row">
                            <span class="stat-label">Vault:</span>
                            <span class="stat-value">{vault_status}</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Last Sync:</span>
                            <span class="stat-value">Never</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Secrets:</span>
                            <span class="stat-value">0 entries</span>
                        </div>
                        <button class="btn btn-success" onclick="executeFunction('vault_sync')">🔄 Sync Vault</button>
                        <button class="btn" onclick="showVaultAccess()">🔓 Access Vault</button>
                    </div>
                    
                    <div class="panel">
                        <h3><span class="icon">📁</span>Project Info</h3>
                        <div class="stat-row">
                            <span class="stat-label">Files:</span>
                            <span class="stat-value">{len(project_files)} files</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Python:</span>
                            <span class="stat-value">{len([f for f in project_files if f.suffix == '.py'])} files</span>
                        </div>
                        <div class="stat-row">
                            <span class="stat-label">Docs:</span>
                            <span class="stat-value">{len([f for f in project_files if f.suffix == '.md'])} files</span>
                        </div>
                        <button class="btn" onclick="executeFunction('project_scan')">🔍 Scan Project</button>
                        <button class="btn" onclick="executeFunction('vacuum_cleanup')">🧹 Vacuum</button>
                    </div>
                </div>
                
                <!-- Main Control Tabs -->
                <div class="tabs">
                    <div class="tab active" onclick="showTab('functions')">🔧 Functions</div>
                    <div class="tab" onclick="showTab('vault')">🔐 Vault</div>
                    <div class="tab" onclick="showTab('projects')">📁 Projects</div>
                    <div class="tab" onclick="showTab('agents')">🤖 Agents</div>
                    <div class="tab" onclick="showTab('logs')">📋 Logs</div>
                </div>
                
                <!-- Functions Tab -->
                <div id="functions" class="tab-content active">
                    <div class="panel">
                        <h3><span class="icon">🔧</span>Function Registry ({len(function_registry)} functions)</h3>
                        <div class="function-grid">
        """
        
        # Add function cards
        for func_name, func_data in function_registry.items():
            html += f"""
                            <div class="function-card">
                                <h4>{func_name.replace('_', ' ').title()}</h4>
                                <p>{func_data['description']}</p>
                                <div class="function-meta">
                                    <span>{func_data['method']} {func_data['endpoint']}</span>
                                    <span>Used: {func_data['execution_count']} times</span>
                                </div>
                                <button class="btn" onclick="executeFunction('{func_name}')">▶️ Execute</button>
                                <button class="btn" onclick="showFunctionDetails('{func_name}')">ℹ️ Details</button>
                            </div>
            """
        
        html += f"""
                        </div>
                    </div>
                </div>
                
                <!-- Vault Tab -->
                <div id="vault" class="tab-content">
                    <div class="panel">
                        <h3><span class="icon">🔐</span>Vault Operations</h3>
                        <div class="vault-controls">
                            <div>
                                <label>Environment:</label>
                                <select class="vault-input">
                                    <option>development</option>
                                    <option>staging</option>
                                    <option>production</option>
                                </select>
                            </div>
                            <div>
                                <label>Secret Key:</label>
                                <input type="text" class="vault-input" placeholder="Enter secret key">
                            </div>
                            <div>
                                <label>Secret Value:</label>
                                <textarea class="vault-input" placeholder="Enter secret value" rows="3"></textarea>
                            </div>
                            <div>
                                <button class="btn btn-success">💾 Store Secret</button>
                                <button class="btn">🔍 Retrieve Secret</button>
                                <button class="btn btn-danger">🗑️ Delete Secret</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Projects Tab -->
                <div id="projects" class="tab-content">
                    <div class="panel">
                        <h3><span class="icon">📁</span>Project File Browser</h3>
                        <div class="file-browser">
        """
        
        # Add file browser
        for file in sorted(project_files)[:50]:  # Show first 50 files
            file_icon = "🐍" if file.suffix == ".py" else "📄" if file.suffix == ".md" else "⚙️" if file.suffix in [".json", ".yaml", ".yml"] else "📄"
            html += f'<div class="file-item" onclick="openFile(\'{file}\')">{file_icon} {file}</div>'
        
        html += f"""
                        </div>
                        <button class="btn" onclick="refreshFiles()">🔄 Refresh</button>
                        <button class="btn" onclick="executeFunction('project_scan')">🔍 Deep Scan</button>
                    </div>
                </div>
                
                <!-- Agents Tab -->
                <div id="agents" class="tab-content">
                    <div class="panel">
                        <h3><span class="icon">🤖</span>Agentic Controls</h3>
                        <div class="function-grid">
                            <div class="function-card">
                                <h4>🎯 Domino Mode</h4>
                                <p>Execute systematic operations step-by-step</p>
                                <button class="btn btn-success" onclick="executeFunction('domino_execute')">🚀 Execute Domino</button>
                            </div>
                            <div class="function-card">
                                <h4>🔍 MCP Discovery</h4>
                                <p>Discover and integrate MCP tools</p>
                                <button class="btn" onclick="executeFunction('mcp_discovery')">🔍 Discover</button>
                            </div>
                            <div class="function-card">
                                <h4>🚀 Agent Deploy</h4>
                                <p>Deploy autonomous agent workflows</p>
                                <button class="btn" onclick="executeFunction('agent_deploy')">🚀 Deploy</button>
                            </div>
                            <div class="function-card">
                                <h4>🔄 Auto Sync</h4>
                                <p>Enable automatic synchronization</p>
                                <button class="btn btn-success">✅ Enable</button>
                                <button class="btn btn-danger">❌ Disable</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- Logs Tab -->
                <div id="logs" class="tab-content">
                    <div class="panel">
                        <h3><span class="icon">📋</span>System Logs</h3>
                        <div class="log-area" id="logArea">
                            [{datetime.now().strftime("%H:%M:%S")}] VANTA Admin Console initialized<br>
                            [{datetime.now().strftime("%H:%M:%S")}] System status: Healthy<br>
                            [{datetime.now().strftime("%H:%M:%S")}] {len(function_registry)} functions registered<br>
                            [{datetime.now().strftime("%H:%M:%S")}] Dashboard ready for operations<br>
                        </div>
                        <button class="btn" onclick="clearLogs()">🗑️ Clear Logs</button>
                        <button class="btn" onclick="refreshLogs()">🔄 Refresh</button>
                    </div>
                </div>
            </div>
            
            <script>
                function showTab(tabName) {{
                    // Hide all tab contents
                    document.querySelectorAll('.tab-content').forEach(content => {{
                        content.classList.remove('active');
                    }});
                    
                    // Remove active class from all tabs
                    document.querySelectorAll('.tab').forEach(tab => {{
                        tab.classList.remove('active');
                    }});
                    
                    // Show selected tab content
                    document.getElementById(tabName).classList.add('active');
                    
                    // Add active class to clicked tab
                    event.target.classList.add('active');
                }}
                
                async function executeFunction(functionName) {{
                    const logArea = document.getElementById('logArea');
                    const timestamp = new Date().toLocaleTimeString();
                    
                    logArea.innerHTML += `[${{timestamp}}] Executing: ${{functionName}}<br>`;
                    logArea.scrollTop = logArea.scrollHeight;
                    
                    try {{
                        const response = await fetch(`/execute/${{functionName}}`, {{
                            method: 'POST',
                            headers: {{ 'Content-Type': 'application/json' }}
                        }});
                        
                        const result = await response.json();
                        logArea.innerHTML += `[${{timestamp}}] Result: ${{result.status || 'Success'}}<br>`;
                    }} catch (error) {{
                        logArea.innerHTML += `[${{timestamp}}] Error: ${{error.message}}<br>`;
                    }}
                    
                    logArea.scrollTop = logArea.scrollHeight;
                }}
                
                function clearLogs() {{
                    document.getElementById('logArea').innerHTML = '';
                }}
                
                function refreshLogs() {{
                    location.reload();
                }}
                
                function openFile(filename) {{
                    alert(`Opening file: ${{filename}}`);
                    // Implement file opening logic
                }}
                
                function refreshFiles() {{
                    location.reload();
                }}
                
                // Auto-refresh every 30 seconds
                setInterval(() => {{
                    const now = new Date().toLocaleTimeString();
                    console.log(`Auto-refresh: ${{now}}`);
                }}, 30000);
            </script>
        </body>
        </html>
        """
        return html
    except Exception as e:
        return f"<h1>Dashboard Error</h1><p>{str(e)}</p>"

# Execute function endpoint
@app.post("/execute/{function_name}")
async def execute_function(function_name: str):
    """Execute a registered function manually"""
    if function_name not in function_registry:
        raise HTTPException(status_code=404, detail="Function not found")
    
    func_data = function_registry[function_name]
    func_data["last_executed"] = datetime.now().isoformat()
    func_data["execution_count"] += 1
    
    # Execute the function based on name
    result = {"status": "executed", "function": function_name, "timestamp": datetime.now().isoformat()}
    
    if function_name == "health_check":
        result["data"] = {"cpu": psutil.cpu_percent(), "memory": psutil.virtual_memory().percent}
    elif function_name == "vault_sync":
        result["data"] = {"synced": True, "secrets_count": 0}
    elif function_name == "project_scan":
        files = list(Path(".").glob("**/*.py"))
        result["data"] = {"python_files": len(files), "scanned": True}
    elif function_name == "vacuum_cleanup":
        result["data"] = {"cleaned": True, "space_freed": "0 MB"}
    
    return result

# All the other existing endpoints
@app.get("/health")
async def health_check():
    """System health endpoint"""
    try:
        cpu_percent = psutil.cpu_percent(interval=0.1)
        memory = psutil.virtual_memory()
        uptime = datetime.now() - start_time
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "uptime_seconds": int(uptime.total_seconds()),
            "system": {
                "cpu_percent": round(cpu_percent, 1),
                "memory_percent": round(memory.percent, 1),
                "memory_available_mb": round(memory.available / 1024 / 1024, 1)
            },
            "server": {
                "total_requests": request_count,
                "functions_registered": len(function_registry)
            }
        }
    except Exception as e:
        return {"status": "error", "error": str(e)}

@app.get("/")
async def root():
    """API root with navigation"""
    return {
        "service": "VANTA Secrets Agent - Admin Console",
        "version": "2.0.0",
        "status": "running",
        "endpoints": {
            "admin": "/admin",
            "health": "/health",
            "functions": "/execute/{function_name}",
            "docs": "/docs" if DEBUG else "disabled"
        },
        "functions_available": len(function_registry)
    }

def run_server():
    """Run the admin server"""
    print("=" * 60)
    print("🛡️  VANTA ADMIN CONSOLE")
    print("=" * 60)
    print(f"🌐 Host: {HOST}")
    print(f"🔌 Port: {PORT}")
    print(f"🎛️  Admin Dashboard: http://{HOST}:{PORT}/admin")
    print(f"🔍 Health Check: http://{HOST}:{PORT}/health")
    if DEBUG:
        print(f"📚 API Docs: http://{HOST}:{PORT}/docs")
    print("=" * 60)
    print(f"🔧 Functions Registered: {len(function_registry)}")
    print("✅ Admin Console Ready!")
    print("=" * 60)
    
    uvicorn.run(
        "vault_api_server_admin:app",
        host=HOST,
        port=PORT,
        reload=DEBUG,
        log_level="info"
    )

if __name__ == "__main__":
    run_server() 