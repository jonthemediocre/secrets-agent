#!/usr/bin/env python3
"""
Tests for the Cursor & Rules Sync Agent
"""

import os
import tempfile
import shutil
from pathlib import Path
import pytest
from unittest.mock import MagicMock, patch, call
import yaml
import json

from vanta_seed.agents.cursor_rules_sync_agent import (
    CursorRulesSyncAgent,
    RuleTemplate,
    ScanResult,
    GenerationResult,
    SyncResult
)


class TestCursorRulesSyncAgent:
    """Test suite for CursorRulesSyncAgent"""
    
    @pytest.fixture
    def test_project_dir(self):
        """Create a temporary test project structure"""
        with tempfile.TemporaryDirectory() as tmpdir:
            # Create test directory structure
            dirs = [
                "agents",
                "rules",
                ".cursor/rules",
                "src/components",
                "vanta_seed/agents",
                "symbolic/kernel",
                "runtime/nodes"
            ]
            
            for dir_path in dirs:
                Path(tmpdir, dir_path).mkdir(parents=True, exist_ok=True)
            
            # Create some test files
            Path(tmpdir, "agents/test_agent.py").write_text("# Test agent")
            Path(tmpdir, ".cursor/rules/test.mdc").write_text("# Test MDC rule")
            Path(tmpdir, "symbolic/kernel/core.py").write_text("# Kernel code")
            
            yield tmpdir
    
    @pytest.fixture
    def agent(self):
        """Create a test agent instance"""
        config = {
            "agent_id": "test_cursor_rules_sync",
            "core_config": {},
            "plugin_manager": MagicMock()
        }
        return CursorRulesSyncAgent(**config)
    
    def test_agent_initialization(self, agent):
        """Test agent initializes correctly"""
        assert agent.agent_id == "test_cursor_rules_sync"
        assert isinstance(agent.templates, dict)
        assert len(agent.templates) > 0
        assert agent.scan_cache == {}
    
    def test_scan_directory_structure(self, agent, test_project_dir):
        """Test scanning directory structure"""
        task_data = {
            "action": "scan",
            "target_path": test_project_dir,
            "options": {
                "exclude_dirs": [".git", "__pycache__"],
                "include_root": False
            }
        }
        
        result = agent.process_task(task_data)
        
        assert result["status"] == "success"
        scan_result = result["output"]["scan_result"]
        
        # Check that all directories were found
        assert "agents" in scan_result.directories_scanned
        assert "symbolic/kernel" in scan_result.directories_scanned
        assert "runtime/nodes" in scan_result.directories_scanned
        
        # Check missing files were identified
        assert len(scan_result.missing_cursor_dirs) > 0
        assert len(scan_result.missing_rules_dirs) > 0
    
    def test_generate_missing_files(self, agent, test_project_dir):
        """Test generating missing configuration files"""
        # First scan
        scan_task = {
            "action": "scan",
            "target_path": test_project_dir
        }
        agent.process_task(scan_task)
        
        # Then generate
        generate_task = {
            "action": "generate",
            "options": {
                "generate_cursor": True,
                "generate_rules": True
            }
        }
        
        result = agent.process_task(generate_task)
        
        assert result["status"] == "success"
        gen_result = result["output"]["generation_result"]
        
        # Check files were generated
        assert gen_result.cursor_files_created > 0
        assert gen_result.rules_files_created > 0
        
        # Verify files exist
        cursor_file = Path(test_project_dir, "agents/.cursor/rules/index.mdc")
        assert cursor_file.exists()
        
        rules_file = Path(test_project_dir, "agents/.rules/agent_rules.yaml")
        assert rules_file.exists()
    
    def test_sync_configurations(self, agent, test_project_dir):
        """Test syncing configurations across directories"""
        # Create some files to sync
        shared_dir = Path(test_project_dir, ".cursor/shared")
        shared_dir.mkdir(parents=True, exist_ok=True)
        shared_rule = shared_dir / "base.mdc"
        shared_rule.write_text("# Shared base rule")
        
        # Scan and generate first
        agent.process_task({"action": "scan", "target_path": test_project_dir})
        agent.process_task({"action": "generate"})
        
        # Then sync
        sync_task = {
            "action": "sync",
            "options": {
                "enable_symlinks": False,  # Avoid symlink issues in tests
                "sync_rules": True
            }
        }
        
        result = agent.process_task(sync_task)
        
        assert result["status"] == "success"
        sync_result = result["output"]["sync_result"]
        
        assert sync_result.rules_synced > 0
    
    def test_template_selection(self, agent):
        """Test correct template selection based on context"""
        # Test agent context
        template = agent._select_template("agents", "test_agent.py")
        assert template.role == "agent"
        
        # Test UI component context
        template = agent._select_template("components", "Button.tsx")
        assert template.role == "ui_component"
        
        # Test symbolic kernel context
        template = agent._select_template("symbolic/kernel", "core.py")
        assert template.role == "symbolic_kernel"
        
        # Test runtime node context
        template = agent._select_template("runtime/nodes", "processor.py")
        assert template.role == "runtime_node"
    
    def test_inheritance_detection(self, agent, test_project_dir):
        """Test detection of rule inheritance patterns"""
        # Create parent and child rule directories
        parent_dir = Path(test_project_dir, ".cursor/rules")
        parent_dir.mkdir(parents=True, exist_ok=True)
        child_dir = Path(test_project_dir, "agents/.cursor/rules")
        child_dir.mkdir(parents=True, exist_ok=True)
        
        # Create parent index
        parent_index = parent_dir / "index.mdc"
        parent_index.write_text("""
---
rules:
  - base-rule
  - common-patterns
---
# Parent Index
        """)
        
        # Create child index with inheritance
        child_index = child_dir / "index.mdc"
        child_index.write_text("""
---
inherits: ../../.cursor/rules/index.mdc
rules:
  - agent-specific
---
# Child Index
        """)
        
        # Scan to detect inheritance
        result = agent.process_task({
            "action": "scan",
            "target_path": test_project_dir
        })
        
        assert result["status"] == "success"
        scan_result = result["output"]["scan_result"]
        
        # Check inheritance was detected
        assert len(scan_result.inheritance_chains) > 0
    
    def test_error_handling(self, agent):
        """Test error handling for invalid inputs"""
        # Test invalid action
        result = agent.process_task({
            "action": "invalid_action"
        })
        assert result["status"] == "error"
        
        # Test invalid path
        result = agent.process_task({
            "action": "scan",
            "target_path": "/nonexistent/path"
        })
        assert result["status"] == "error"
    
    def test_dry_run_mode(self, agent, test_project_dir):
        """Test dry run mode doesn't create files"""
        task = {
            "action": "generate",
            "target_path": test_project_dir,
            "options": {
                "dry_run": True,
                "generate_cursor": True,
                "generate_rules": True
            }
        }
        
        # First scan
        agent.process_task({"action": "scan", "target_path": test_project_dir})
        
        # Then generate in dry run
        result = agent.process_task(task)
        
        assert result["status"] == "success"
        gen_result = result["output"]["generation_result"]
        
        # Should report what would be created
        assert gen_result.cursor_files_created > 0
        
        # But files shouldn't actually exist
        cursor_file = Path(test_project_dir, "agents/.cursor/rules/index.mdc")
        assert not cursor_file.exists()
    
    @patch('os.symlink')
    def test_symlink_creation(self, mock_symlink, agent, test_project_dir):
        """Test symlink creation for shared configurations"""
        # Create shared config
        shared_dir = Path(test_project_dir, ".cursor/shared")
        shared_dir.mkdir(parents=True, exist_ok=True)
        shared_config = shared_dir / "common.mdc"
        shared_config.write_text("# Common configuration")
        
        # Scan and sync with symlinks
        agent.process_task({"action": "scan", "target_path": test_project_dir})
        
        result = agent.process_task({
            "action": "sync",
            "options": {
                "enable_symlinks": True,
                "shared_configs": ["common.mdc"]
            }
        })
        
        # Check symlinks were attempted
        assert mock_symlink.called
    
    def test_cache_behavior(self, agent, test_project_dir):
        """Test scan results are cached appropriately"""
        task = {
            "action": "scan",
            "target_path": test_project_dir
        }
        
        # First scan
        result1 = agent.process_task(task)
        assert len(agent.scan_cache) == 1
        
        # Second scan should use cache
        result2 = agent.process_task(task)
        assert result1 == result2
        
        # Clear cache
        agent.process_task({"action": "clear_cache"})
        assert len(agent.scan_cache) == 0


if __name__ == "__main__":
    pytest.main([__file__, "-v"]) 