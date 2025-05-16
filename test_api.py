#!/usr/bin/env python

import requests
import json
import sys
import os
import dotenv
from pathlib import Path

# Load environment variables
dotenv.load_dotenv()

# Get master password from environment
MASTER_PASSWORD = os.environ.get('MASTER_PASSWORD', '')
SECURE_STORAGE = os.environ.get('SECURE_STORAGE', 'false').lower() == 'true'

def test_health():
    """Test the health check endpoint"""
    try:
        response = requests.get('http://localhost:5001/api/health')
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def test_scan(project_path="."):
    """Test project scanning"""
    try:
        # Try with local path first
        abs_path = str(Path(project_path).absolute())
        print(f"Using local absolute path: {abs_path}")
        
        payload = {"project_path": abs_path}
        print(f"Request payload: {json.dumps(payload)}")
        
        response = requests.post(
            'http://localhost:5001/api/scan',
            json=payload
        )
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.text}")
        
        # If that fails, try with container path
        if response.status_code != 200:
            print("\nTrying with container path...")
            project_name = os.path.basename(project_path.rstrip('/\\'))
            container_path = f"/app/projects/{project_name}"
            print(f"Using container path: {container_path}")
            
            payload = {"project_path": container_path}
            print(f"Request payload: {json.dumps(payload)}")
            
            response = requests.post(
                'http://localhost:5001/api/scan',
                json=payload
            )
            print(f"Status code: {response.status_code}")
            print(f"Response: {response.text}")
        
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def test_list_secrets():
    """Test listing secrets"""
    try:
        params = {}
        if SECURE_STORAGE:
            params['secure'] = 'true'
            params['password'] = MASTER_PASSWORD
            print(f"Using secure storage with master password")
            
        response = requests.get('http://localhost:5001/api/list-secrets', params=params)
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

def test_add_secret():
    """Test adding a new secret"""
    try:
        payload = {
            "key": "TEST_SECRET",
            "value": "test_secret_value",
            "secure": SECURE_STORAGE,
        }
        
        if SECURE_STORAGE:
            payload['password'] = MASTER_PASSWORD
            print(f"Using secure storage with master password")
            
        response = requests.post(
            'http://localhost:5001/api/add-secret',
            json=payload
        )
        print(f"Status code: {response.status_code}")
        print(f"Response: {response.text}")
        return response.status_code == 200
    except Exception as e:
        print(f"Error: {str(e)}")
        return False

if __name__ == "__main__":
    print("Testing API endpoints...")
    print(f"Secure storage: {'ENABLED' if SECURE_STORAGE else 'DISABLED'}")
    
    print("\n==== Testing health check ====")
    health_ok = test_health()
    
    if len(sys.argv) > 1:
        project_path = sys.argv[1]
    else:
        project_path = "./test_project"
    
    print(f"\n==== Testing scan ({project_path}) ====")
    scan_ok = test_scan(project_path)
    
    print("\n==== Testing list secrets ====")
    secrets_ok = test_list_secrets()
    
    # Test adding a secret
    print("\n==== Testing add secret ====")
    add_secret_ok = test_add_secret()
    
    if health_ok and scan_ok and secrets_ok and add_secret_ok:
        print("\n✅ All tests passed!")
        sys.exit(0)
    else:
        print("\n❌ Some tests failed.")
        sys.exit(1) 