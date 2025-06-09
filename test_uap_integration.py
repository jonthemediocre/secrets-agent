#!/usr/bin/env python3
"""
Test UAP Integration - Validate Agent Discovery and Registration

Tests the enhanced agent discovery system with UAP agent support
and validates the OperatorOmega Agent integration.
"""

import asyncio
import sys
import os
import json
from pathlib import Path

# Add src to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

async def test_uap_integration():
    """Test the UAP agent integration and discovery system"""
    print("🔄 Testing UAP Integration - Agent Discovery and Registration")
    print("=" * 60)
    
    try:
        # Import the discovery service
        from src.services.AgentDiscoveryService import AgentDiscoveryService
        from src.agents.OperatorOmegaAgent import OperatorOmegaAgent
        
        print("✅ Successfully imported AgentDiscoveryService and OperatorOmegaAgent")
        
        # Initialize discovery service
        discovery_service = AgentDiscoveryService()
        print("✅ AgentDiscoveryService initialized")
        
        # Test comprehensive agent discovery
        print("\n🔍 Running comprehensive agent discovery...")
        discovery_result = await discovery_service.discover_all_agents()
        
        print(f"\n📊 Discovery Results:")
        print(f"   Traditional Agents: {len(discovery_result['traditional_agents'])}")
        print(f"   UAP Agents: {len(discovery_result['uap_agents'])}")
        print(f"   Runtime Orchestrators: {len(discovery_result['runtime_orchestrators'])}")
        print(f"   Governance Agents: {len(discovery_result['governance_agents'])}")
        print(f"   Total Discovered: {discovery_result['discovery_stats']['total_discovered']}")
        
        # Test OperatorOmega Agent specifically
        print("\n🔧 Testing OperatorOmega Agent...")
        omega_status = await discovery_service.get_agent_status("OperatorOmegaAgent")
        print(f"   Omega Agent Status: {omega_status}")
        
        # Test UAP manifest discovery
        print("\n📋 Checking UAP Manifest Discovery...")
        uap_manifest_path = Path("UAP/manifests/omega_executor.uap.yaml")
        if uap_manifest_path.exists():
            print(f"   ✅ UAP Manifest found: {uap_manifest_path}")
            
            # Test manifest analysis
            from src.services.AgentDiscoveryService import AgentDiscoveryService
            discovery = AgentDiscoveryService()
            manifest_info = await discovery._analyze_uap_manifest(uap_manifest_path)
            if manifest_info:
                print(f"   ✅ Manifest analyzed successfully")
                print(f"      Agent ID: {manifest_info['agent_id']}")
                print(f"      Level: {manifest_info.get('uap_level', 'Unknown')}")
                print(f"      Type: {manifest_info['type']}")
                print(f"      Capabilities: {len(manifest_info.get('capabilities', []))}")
            else:
                print("   ❌ Failed to analyze UAP manifest")
        else:
            print(f"   ⚠️  UAP Manifest not found: {uap_manifest_path}")
        
        # Test agent registry
        print("\n📚 Checking Agent Registry...")
        registry_path = Path("src/agents/index.json")
        if registry_path.exists():
            with open(registry_path, 'r') as f:
                registry = json.load(f)
            
            total_agents = len(registry.get("agent_registry", {}).get("agents", {}))
            print(f"   ✅ Agent Registry found with {total_agents} agents")
            
            # Check for OperatorOmega
            omega_in_registry = "OperatorOmegaAgent" in registry.get("agent_registry", {}).get("agents", {})
            print(f"   OperatorOmega in registry: {'✅' if omega_in_registry else '❌'}")
            
            # Show some registry details
            if omega_in_registry:
                omega_details = registry["agent_registry"]["agents"]["OperatorOmegaAgent"]
                print(f"      Level: {omega_details.get('level', 'Unknown')}")
                print(f"      Type: {omega_details.get('type', 'Unknown')}")
                print(f"      Status: {omega_details.get('status', 'Unknown')}")
        else:
            print(f"   ⚠️  Agent Registry not found: {registry_path}")
        
        # Test UAP agent registration
        print("\n🔧 Testing UAP Agent Registration...")
        if uap_manifest_path.exists():
            registration_result = await discovery_service.register_uap_agent(
                "omega_executor",
                str(uap_manifest_path),
                "src/agents/OperatorOmegaAgent.py"
            )
            print(f"   Registration result: {registration_result}")
        
        # Test discovery paths
        print("\n📁 Checking Discovery Paths...")
        for path in discovery_service.discovery_paths:
            full_path = Path(path)
            exists = full_path.exists()
            print(f"   {path}: {'✅' if exists else '❌'}")
            if exists:
                agent_files = list(full_path.rglob("*Agent.py"))
                print(f"      Python agents found: {len(agent_files)}")
        
        # Test governance integration
        print("\n🏛️  Testing Governance Integration...")
        governance_path = Path("governance/integration")
        if governance_path.exists():
            print(f"   ✅ Governance integration path exists")
            gov_files = list(governance_path.rglob("*.py"))
            print(f"      Governance files found: {len(gov_files)}")
            for gf in gov_files:
                print(f"         {gf.name}")
        else:
            print(f"   ❌ Governance integration path not found")
        
        # Test UAP compliance checking
        print("\n✅ Testing UAP Compliance...")
        omega_agent_path = Path("src/agents/OperatorOmegaAgent.py")
        if omega_agent_path.exists():
            is_level_3 = await discovery_service._is_level_3_agent(omega_agent_path)
            print(f"   OperatorOmega is Level 3: {'✅' if is_level_3 else '❌'}")
            
            # Check for Level 3 indicators
            with open(omega_agent_path, 'r') as f:
                content = f.read()
            
            level_3_indicators = [
                "UAP Level 3",
                "Runtime Orchestrator",
                "ecosystem_management",
                "multi_project",
                "cross_project_sync"
            ]
            
            found_indicators = [indicator for indicator in level_3_indicators if indicator in content]
            print(f"   Level 3 indicators found: {found_indicators}")
        
        print(f"\n🎉 UAP Integration Test Complete!")
        print(f"   Overall Status: {'✅ PASS' if discovery_result['discovery_stats']['total_discovered'] > 0 else '❌ FAIL'}")
        
        return discovery_result
        
    except ImportError as e:
        print(f"❌ Import Error: {str(e)}")
        print("   Make sure all dependencies are installed")
        return None
    except Exception as e:
        print(f"❌ Test Error: {str(e)}")
        return None

async def test_omega_agent_initialization():
    """Test OperatorOmega Agent initialization"""
    print("\n🔧 Testing OperatorOmega Agent Initialization...")
    
    try:
        from src.agents.OperatorOmegaAgent import OperatorOmegaAgent
        
        # Initialize the agent
        omega = OperatorOmegaAgent()
        print("✅ OperatorOmega Agent created successfully")
        
        # Test setup
        await omega.setup()
        print("✅ OperatorOmega Agent setup completed")
        
        # Test basic functionality
        status = await omega.get_status()
        print(f"✅ Agent Status: {status}")
        
        # Test ecosystem discovery
        if hasattr(omega, 'discover_ecosystem'):
            ecosystem_info = await omega.discover_ecosystem()
            print(f"✅ Ecosystem Discovery: {len(ecosystem_info.get('projects', []))} projects found")
        
        return True
        
    except Exception as e:
        print(f"❌ OperatorOmega Agent test failed: {str(e)}")
        return False

async def main():
    """Main test function"""
    print("🚀 UAP Integration Test Suite")
    print("=" * 60)
    
    # Test 1: UAP Integration
    discovery_result = await test_uap_integration()
    
    # Test 2: OperatorOmega Agent
    omega_test = await test_omega_agent_initialization()
    
    print("\n" + "=" * 60)
    print("🏁 Test Suite Summary")
    print(f"   UAP Integration: {'✅ PASS' if discovery_result else '❌ FAIL'}")
    print(f"   OperatorOmega Agent: {'✅ PASS' if omega_test else '❌ FAIL'}")
    
    overall_status = discovery_result and omega_test
    print(f"\n   Overall Result: {'🎉 ALL TESTS PASSED' if overall_status else '❌ SOME TESTS FAILED'}")
    
    return overall_status

if __name__ == "__main__":
    asyncio.run(main()) 