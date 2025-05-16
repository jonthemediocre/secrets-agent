#!/usr/bin/env python3
"""
server.py - VS Code extension backend for Secrets Agent
"""

import os
import json
import traceback
from pathlib import Path
from flask import Flask, request, jsonify
import yaml
import logging # Import the logging module

app = Flask(__name__)

# Configure Flask app logger
# Gunicorn will capture this logger's output.
# Set level via environment variable or default to INFO for production, DEBUG for development.
LOG_LEVEL = os.environ.get('LOG_LEVEL', 'INFO').upper()
app.logger.setLevel(getattr(logging, LOG_LEVEL, logging.INFO))

# Flask settings
# DEBUG should be controlled by environment (e.g., FLASK_DEBUG or a custom env var)
# app.config['DEBUG'] = os.environ.get('FLASK_DEBUG', 'false').lower() == 'true'
# PROPAGATE_EXCEPTIONS is often True for development, False for production if Gunicorn handles errors.
# app.config['PROPAGATE_EXCEPTIONS'] = os.environ.get('FLASK_PROPAGATE_EXCEPTIONS', 'false').lower() == 'true'

# Check if secure storage is enabled
SECURE_STORAGE = os.environ.get('SECURE_STORAGE', 'false').lower() == 'true'
MASTER_PASSWORD = os.environ.get('MASTER_PASSWORD', '')

if SECURE_STORAGE:
    app.logger.info("✓ Secure storage mode enabled")
else:
    app.logger.warning("⚠ WARNING: Using plaintext secrets storage")

# Load config
try:
    with open('config.yaml', 'r') as f:
        config = yaml.safe_load(f)
    app.logger.info("✓ Configuration loaded from config.yaml")
except Exception as e:
    app.logger.warning(f"Warning: Could not load config.yaml: {e}. Using default configuration.")
    config = {
        'project_defaults': {
            'secret_store': 'secrets.yaml',
            'mesh_registry': 'access_mesh.yaml',
            'mcp_path': '~/.vanta/mcp/tools/',
            'env_path': '~/.vanta/envs/',
        }
    }

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    app.logger.info(f"Health check request from {request.remote_addr}")
    return jsonify({'status': 'ok', 'version': '1.0.0', 'secure_storage': SECURE_STORAGE})

@app.route('/api/scan', methods=['POST'])
def scan_project():
    """Scan a project for required env vars and tools"""
    try:
        data = request.json
        project_path = data.get('project_path')
        
        app.logger.info(f"Received scan request for project: {project_path}")
        
        if not project_path:
            return jsonify({'error': 'project_path is required'}), 400
        
        # In Docker, handle host paths differently - map to container paths
        # This is a simplified approach - you might need a more complex mapping
        if os.path.exists("/app/projects"):
            # If /app/projects exists, assume we're in Docker
            if project_path.startswith(("C:\\", "D:\\", "/c/", "/d/")):
                # Extract project name from absolute path
                project_name = os.path.basename(project_path.rstrip('/\\'))
                container_path = f"/app/projects/{project_name}"
                app.logger.info(f"Mapping host path {project_path} to container path {container_path}")
                project_path = container_path
        
        app.logger.info(f"Using project path: {project_path}")
        
        # Import here to avoid circular imports
        try:
            from env_scanner import scan_env_and_tools
        except ImportError as e:
            app.logger.error(f"Import error: {e}")
            return jsonify({'error': f'Import error: {e}'}), 500
        
        try:
            result = scan_env_and_tools(Path(project_path))
            app.logger.info(f"Scan result: {result}")
            return jsonify(result)
        except FileNotFoundError as e:
            app.logger.error(f"File not found: {e}")
            return jsonify({'error': f'Path not found: {project_path}'}), 404
        except Exception as e:
            app.logger.error(f"Scan error: {e}")
            app.logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error: {e}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/link', methods=['POST'])
def link_project():
    """Link a project to secrets and tools"""
    try:
        data = request.json
        project_path = data.get('project_path')
        secure = SECURE_STORAGE or data.get('secure', False)
        password = MASTER_PASSWORD or data.get('password', '')
        
        if not project_path:
            return jsonify({'error': 'project_path is required'}), 400
            
        if secure and not password:
            return jsonify({'error': 'Secure storage enabled but no master password provided'}), 400
        
        # Import modules
        from secret_broker import SecretBroker
        from env_scanner import scan_env_and_tools
        from symlink_manager import link_env, link_tool
        from access_mesh import AccessMesh
        
        try:
            broker = SecretBroker(Path(config['project_defaults']['secret_store']), secure=secure, password=password)
            scan_result = scan_env_and_tools(Path(project_path))
            secrets = broker.resolve(scan_result["env_keys"])
            
            # Create env file
            env_path = Path(os.path.expanduser(config['project_defaults']['env_path'])) / f"{Path(project_path).name}.env"
            env_path.parent.mkdir(parents=True, exist_ok=True)
            
            with env_path.open("w") as f:
                for k, v in secrets.items():
                    f.write(f"{k}={v}\n")
            
            link_env(Path(project_path), env_path)
            
            # Link tools
            tool_paths = []
            for tool in scan_result["tools"]:
                tool_path = Path(os.path.expanduser(config['project_defaults']['mcp_path'])) / f"{tool}.mcp"
                tool_path.parent.mkdir(parents=True, exist_ok=True)
                if not tool_path.exists():
                    tool_path.write_text(f"# MCP tool: {tool}")
                link_tool(Path(project_path), tool_path)
                tool_paths.append(tool)
            
            # Update mesh
            mesh = AccessMesh(Path(config['project_defaults']['mesh_registry']))
            mesh.bind(Path(project_path).name, tool_paths, list(secrets.keys()))
            
            return jsonify({'success': True, 'env_keys': scan_result["env_keys"], 'tools': scan_result["tools"]})
        except Exception as e:
            app.logger.error(f"Link error: {e}")
            app.logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error: {e}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/list-secrets', methods=['GET'])
def list_secrets():
    """List available secrets"""
    try:
        secure = SECURE_STORAGE or request.args.get('secure', 'false').lower() == 'true'
        password = MASTER_PASSWORD or request.args.get('password', '')
        
        if secure and not password and SECURE_STORAGE:
            # If using secure storage from environment but no password, error out
            return jsonify({'error': 'Secure storage enabled but no master password provided'}), 400
            
        try:
            from secret_broker import SecretBroker
            
            broker = SecretBroker(Path(config['project_defaults']['secret_store']), secure=secure, password=password)
            keys = list(broker.secrets.keys()) if hasattr(broker, 'secrets') else []
            
            return jsonify({
                'keys': keys,
                'secure_storage': secure
            })
        except Exception as e:
            app.logger.error(f"List secrets error: {e}")
            app.logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error: {e}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

@app.route('/api/add-secret', methods=['POST'])
def add_secret():
    """Add a new secret"""
    try:
        data = request.json
        key = data.get('key')
        value = data.get('value')
        secure = SECURE_STORAGE or data.get('secure', False)
        password = MASTER_PASSWORD or data.get('password', '')
        
        if not key or value is None:
            return jsonify({'error': 'Both key and value are required'}), 400
            
        if secure and not password:
            return jsonify({'error': 'Secure storage enabled but no master password provided'}), 400
            
        try:
            from secret_broker import SecretBroker
            
            broker = SecretBroker(Path(config['project_defaults']['secret_store']), secure=secure, password=password)
            result = broker.add_secret(key, value)
            
            return jsonify({
                'success': result,
                'key': key,
                'secure_storage': secure
            })
        except Exception as e:
            app.logger.error(f"Add secret error: {e}")
            app.logger.error(traceback.format_exc())
            return jsonify({'error': str(e)}), 500
    except Exception as e:
        app.logger.error(f"Unexpected error: {e}")
        app.logger.error(traceback.format_exc())
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    port = int(os.environ.get('PORT', 5001))
    host = os.environ.get('HOST', '0.0.0.0')
    debug = os.environ.get('DEBUG', 'true').lower() == 'true'
    
    print(f"[✓] Starting VS Code extension server on {host}:{port}")
    app.run(host=host, port=port, debug=debug) 