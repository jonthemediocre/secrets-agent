#!/usr/bin/env python3
"""
MDC Backend API
Provides REST endpoints for the MDC Rule Management System
Connects to the Python tools we created earlier
"""

import os
import sys
import json
import asyncio
from datetime import datetime
from pathlib import Path
from typing import List, Dict, Any, Optional
from dataclasses import dataclass, asdict

from fastapi import FastAPI, HTTPException, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field
import uvicorn

# Add the tools directory to Python path
tools_dir = Path(__file__).parent.parent.parent / ".cursor" / "tools"
sys.path.insert(0, str(tools_dir))

# Import our MDC tools
try:
    from mdc_rule_validator import MDCRuleValidator, ValidationResult
    from mdc_rule_generator import MDCRuleGenerator
    from setup_folder_structure import MDCFolderStructure
    from mdc_migration_script import MDCMigrationScript
    from mdc_monitoring_agent import MDCMonitoringAgent, MonitoringConfig
    from mdc_master_control import MDCMasterControl
except ImportError as e:
    print(f"Error importing MDC tools: {e}")
    print(f"Make sure tools are in: {tools_dir}")
    sys.exit(1)

# FastAPI app
app = FastAPI(
    title="MDC Rule Management API",
    description="Backend API for the MDC (Markdown with Context) Rule Management System",
    version="1.0.0",
    docs_url="/api/docs",
    redoc_url="/api/redoc"
)

# CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuration
RULES_DIRECTORY = os.getenv("MDC_RULES_PATH", ".cursor/rules")
TOOLS_DIRECTORY = str(tools_dir)

# Initialize tools
validator = MDCRuleValidator()
master_control = MDCMasterControl(RULES_DIRECTORY)

# Pydantic models
class RuleCreate(BaseModel):
    name: str = Field(..., description="Rule name")
    description: str = Field(..., description="Rule description")
    rule_type: str = Field(..., description="Rule type: always, auto, agent, manual")
    category: str = Field(..., description="Rule category/folder")
    content: str = Field(..., description="Rule content")
    globs: List[str] = Field(default=[], description="Glob patterns")
    always_apply: bool = Field(default=True, description="Whether rule always applies")

class RuleUpdate(BaseModel):
    description: Optional[str] = None
    content: Optional[str] = None
    globs: Optional[List[str]] = None
    always_apply: Optional[bool] = None

class ValidationRequest(BaseModel):
    path: Optional[str] = None
    fix: bool = Field(default=False, description="Whether to auto-fix issues")

class GenerationRequest(BaseModel):
    prompt: str = Field(..., description="Prompt for rule generation")
    rule_type: Optional[str] = Field(default=None, description="Preferred rule type")
    category: Optional[str] = Field(default=None, description="Preferred category")

class MigrationRequest(BaseModel):
    source_path: str = Field(..., description="Source directory path")
    target_path: Optional[str] = Field(default=None, description="Target directory path")
    dry_run: bool = Field(default=True, description="Whether to run in preview mode")

class SystemStats(BaseModel):
    total_rules: int
    valid_rules: int
    invalid_rules: int
    warning_rules: int
    rule_types: Dict[str, int]
    folders: List[Dict[str, Any]]
    recent_activity: List[Dict[str, Any]]
    system_health: Dict[str, Any]

# Global state for background tasks
background_tasks_status = {}

@app.get("/")
async def root():
    """Root endpoint with API information"""
    return {
        "name": "MDC Rule Management API",
        "version": "1.0.0",
        "status": "running",
        "endpoints": {
            "stats": "/api/stats",
            "rules": "/api/rules",
            "validate": "/api/validate",
            "generate": "/api/generate",
            "migrate": "/api/migrate",
            "monitor": "/api/monitor",
            "health": "/api/health"
        }
    }

@app.get("/api/health")
async def health_check():
    """Health check endpoint"""
    try:
        # Test if tools are working
        results = validator.validate_directory(RULES_DIRECTORY)
        
        return {
            "status": "healthy",
            "timestamp": datetime.now().isoformat(),
            "tools": {
                "validator": True,
                "generator": True,
                "monitor": True,
                "migration": True
            },
            "rules_directory": RULES_DIRECTORY,
            "rules_count": len(results)
        }
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Service unhealthy: {str(e)}")

@app.get("/api/stats", response_model=SystemStats)
async def get_system_stats():
    """Get comprehensive system statistics"""
    try:
        # Get validation results
        results = validator.validate_directory(RULES_DIRECTORY)
        
        # Calculate stats
        total_rules = len(results)
        valid_rules = sum(1 for r in results if r.is_valid)
        invalid_rules = sum(1 for r in results if not r.is_valid)
        warning_rules = sum(1 for r in results if r.warnings)
        
        # Rule types distribution
        rule_types = {"always": 0, "auto": 0, "agent": 0, "manual": 0}
        for result in results:
            if result.metadata and "rule_type" in result.metadata:
                rule_type = result.metadata["rule_type"]
                if rule_type in rule_types:
                    rule_types[rule_type] += 1
        
        # Folder stats
        folders = []
        if os.path.exists(RULES_DIRECTORY):
            for folder_name in os.listdir(RULES_DIRECTORY):
                folder_path = os.path.join(RULES_DIRECTORY, folder_name)
                if os.path.isdir(folder_path):
                    folder_results = [r for r in results if folder_name in r.file_path]
                    folder_valid = sum(1 for r in folder_results if r.is_valid)
                    folder_total = len(folder_results)
                    health = (folder_valid / folder_total * 100) if folder_total > 0 else 100
                    
                    folders.append({
                        "name": folder_name,
                        "count": folder_total,
                        "health": round(health)
                    })
        
        # Recent activity (mock data for now)
        recent_activity = [
            {
                "timestamp": datetime.now().isoformat(),
                "action": "System Check",
                "rule": "health-check",
                "status": "success"
            }
        ]
        
        # System health
        overall_health = (valid_rules / total_rules * 100) if total_rules > 0 else 100
        system_health = {
            "overall": round(overall_health),
            "validator": True,
            "generator": True,
            "monitor": True,
            "migration": True
        }
        
        return SystemStats(
            total_rules=total_rules,
            valid_rules=valid_rules,
            invalid_rules=invalid_rules,
            warning_rules=warning_rules,
            rule_types=rule_types,
            folders=folders,
            recent_activity=recent_activity,
            system_health=system_health
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get stats: {str(e)}")

@app.get("/api/rules")
async def list_rules(
    category: Optional[str] = None,
    rule_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0
):
    """List rules with filtering and pagination"""
    try:
        results = validator.validate_directory(RULES_DIRECTORY)
        
        # Apply filters
        filtered_results = results
        
        if category:
            filtered_results = [r for r in filtered_results if category in r.file_path]
        
        if rule_type and rule_type != "all":
            filtered_results = [
                r for r in filtered_results 
                if r.metadata and r.metadata.get("rule_type") == rule_type
            ]
        
        if status:
            if status == "valid":
                filtered_results = [r for r in filtered_results if r.is_valid]
            elif status == "invalid":
                filtered_results = [r for r in filtered_results if not r.is_valid]
            elif status == "warning":
                filtered_results = [r for r in filtered_results if r.warnings]
        
        if search:
            search_lower = search.lower()
            filtered_results = [
                r for r in filtered_results 
                if search_lower in r.file_path.lower() or 
                (r.metadata and search_lower in str(r.metadata).lower())
            ]
        
        # Pagination
        total = len(filtered_results)
        paginated_results = filtered_results[offset:offset + limit]
        
        # Convert to serializable format
        rules = []
        for result in paginated_results:
            rule_data = {
                "id": os.path.basename(result.file_path),
                "name": os.path.basename(result.file_path).replace(".md", ""),
                "path": result.file_path,
                "is_valid": result.is_valid,
                "errors": result.errors,
                "warnings": result.warnings,
                "metadata": result.metadata or {},
                "last_modified": datetime.fromtimestamp(
                    os.path.getmtime(result.file_path)
                ).isoformat() if os.path.exists(result.file_path) else None
            }
            rules.append(rule_data)
        
        return {
            "rules": rules,
            "pagination": {
                "total": total,
                "limit": limit,
                "offset": offset,
                "has_more": offset + limit < total
            }
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list rules: {str(e)}")

@app.get("/api/rules/{rule_id}")
async def get_rule(rule_id: str):
    """Get a specific rule by ID"""
    try:
        # Find rule file
        rule_path = None
        for root, dirs, files in os.walk(RULES_DIRECTORY):
            for file in files:
                if file == f"{rule_id}.md" or file == rule_id:
                    rule_path = os.path.join(root, file)
                    break
            if rule_path:
                break
        
        if not rule_path or not os.path.exists(rule_path):
            raise HTTPException(status_code=404, detail="Rule not found")
        
        # Validate the rule
        result = validator.validate_file(rule_path)
        
        # Read content
        with open(rule_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        return {
            "id": rule_id,
            "name": os.path.basename(rule_path).replace(".md", ""),
            "path": rule_path,
            "content": content,
            "is_valid": result.is_valid,
            "errors": result.errors,
            "warnings": result.warnings,
            "metadata": result.metadata or {},
            "last_modified": datetime.fromtimestamp(os.path.getmtime(rule_path)).isoformat(),
            "size": os.path.getsize(rule_path)
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get rule: {str(e)}")

@app.post("/api/rules")
async def create_rule(rule: RuleCreate):
    """Create a new rule"""
    try:
        generator = MDCRuleGenerator(RULES_DIRECTORY)
        
        # Generate the rule
        result = generator.generate_rule(
            prompt=f"Create a {rule.rule_type} rule named '{rule.name}': {rule.description}",
            rule_type=rule.rule_type,
            folder=rule.category
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        rule_path = result["file_path"]
        
        # Validate the created rule
        validation_result = validator.validate_file(rule_path)
        
        return {
            "id": os.path.basename(rule_path).replace(".md", ""),
            "path": rule_path,
            "success": True,
            "validation": {
                "is_valid": validation_result.is_valid,
                "errors": validation_result.errors,
                "warnings": validation_result.warnings
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to create rule: {str(e)}")

@app.post("/api/validate")
async def validate_rules(request: ValidationRequest):
    """Validate rules with optional auto-fix"""
    try:
        path = request.path or RULES_DIRECTORY
        
        if os.path.isfile(path):
            results = [validator.validate_file(path)]
        else:
            results = validator.validate_directory(path)
        
        # Auto-fix if requested
        if request.fix:
            # TODO: Implement auto-fix functionality
            pass
        
        # Calculate summary
        total = len(results)
        valid = sum(1 for r in results if r.is_valid)
        invalid = sum(1 for r in results if not r.is_valid)
        warnings = sum(1 for r in results if r.warnings)
        
        return {
            "summary": {
                "total": total,
                "valid": valid,
                "invalid": invalid,
                "warnings": warnings,
                "health_score": round((valid / total * 100)) if total > 0 else 100
            },
            "results": [
                {
                    "file_path": r.file_path,
                    "is_valid": r.is_valid,
                    "errors": r.errors,
                    "warnings": r.warnings,
                    "metadata": r.metadata
                }
                for r in results
            ]
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Validation failed: {str(e)}")

@app.post("/api/generate")
async def generate_rule(request: GenerationRequest):
    """Generate a new rule from prompt"""
    try:
        generator = MDCRuleGenerator(RULES_DIRECTORY)
        
        result = generator.generate_rule(
            prompt=request.prompt,
            rule_type=request.rule_type,
            folder=request.category
        )
        
        if not result["success"]:
            raise HTTPException(status_code=400, detail=result["error"])
        
        return {
            "success": True,
            "rule_path": result["file_path"],
            "rule_name": result["rule_name"],
            "category": result["folder"],
            "content": result.get("content", "")
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Generation failed: {str(e)}")

@app.post("/api/migrate")
async def migrate_rules(request: MigrationRequest):
    """Migrate rules to proper format"""
    try:
        target_path = request.target_path or RULES_DIRECTORY
        
        migrator = MDCMigrationScript(request.source_path, target_path)
        result = migrator.migrate_all(dry_run=request.dry_run)
        
        return {
            "success": True,
            "dry_run": request.dry_run,
            "stats": result["stats"],
            "files": result.get("files", [])
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Migration failed: {str(e)}")

@app.get("/api/monitor/status")
async def get_monitor_status():
    """Get monitoring agent status"""
    try:
        config = MonitoringConfig(watch_directory=RULES_DIRECTORY)
        agent = MDCMonitoringAgent(config)
        status = agent.get_status()
        
        return status
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get monitor status: {str(e)}")

@app.post("/api/monitor/start")
async def start_monitoring(background_tasks: BackgroundTasks):
    """Start the monitoring agent"""
    try:
        config = MonitoringConfig(watch_directory=RULES_DIRECTORY)
        agent = MDCMonitoringAgent(config)
        
        # Start monitoring in background
        background_tasks.add_task(agent.start_monitoring)
        
        return {"success": True, "message": "Monitoring started"}
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start monitoring: {str(e)}")

@app.get("/api/tools/status")
async def get_tools_status():
    """Get status of all MDC tools"""
    try:
        return {
            "validator": {"status": "active", "version": "1.0.0"},
            "generator": {"status": "active", "version": "1.0.0"},
            "monitor": {"status": "active", "version": "1.0.0"},
            "migration": {"status": "active", "version": "1.0.0"},
            "master_control": {"status": "active", "version": "1.0.0"},
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to get tools status: {str(e)}")

# Error handlers
@app.exception_handler(404)
async def not_found_handler(request, exc):
    return JSONResponse(
        status_code=404,
        content={"detail": "Not found", "path": str(request.url)}
    )

@app.exception_handler(500)
async def internal_error_handler(request, exc):
    return JSONResponse(
        status_code=500,
        content={"detail": "Internal server error", "error": str(exc)}
    )

if __name__ == "__main__":
    # Ensure rules directory exists
    os.makedirs(RULES_DIRECTORY, exist_ok=True)
    
    print(f"Starting MDC API Server")
    print(f"Rules Directory: {RULES_DIRECTORY}")
    print(f"Tools Directory: {TOOLS_DIRECTORY}")
    print(f"API Docs: http://localhost:8000/api/docs")
    
    uvicorn.run(
        "mdc-backend:app",
        host="0.0.0.0",
        port=8000,
        reload=True,
        reload_dirs=[TOOLS_DIRECTORY]
    ) 