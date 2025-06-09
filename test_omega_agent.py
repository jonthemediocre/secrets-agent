#!/usr/bin/env python3
"""
Test script for OperatorOmega Agent - UAP Level 3 Runtime Orchestrator
"""

import asyncio
import sys
import os

# Add src to Python path
sys.path.append(os.path.join(os.path.dirname(__file__), 'src'))

async def test_omega_agent():
    """Test the OperatorOmega Agent functionality"""
    print("🔄 Testing OperatorOmega Agent - UAP Level 3 Runtime Orchestrator")
    
    try:
        # Import the agent
        from src.agents.OperatorOmegaAgent import OperatorOmegaAgent
        from src.agents.AgentBase import TaskData
        
        print("✅ Successfully imported OperatorOmega Agent")
        
        # Initialize agent
        omega_agent = OperatorOmegaAgent()
        print("✅ OperatorOmega Agent initialized")
        
        # Test setup
        await omega_agent.setup()
        print("✅ OperatorOmega Agent setup completed")
        
        # Test ecosystem scan
        task_data: TaskData = {
            'type': 'ecosystem_scan',
            'description': 'Test ecosystem scan across all projects'
        }
        
        result = await omega_agent.process_task(task_data)
        print(f"✅ Ecosystem scan completed: {result['output']}")
        
        # Test agent status
        status = await omega_agent.get_status()
        print("✅ Agent Status:", status)
        
        # Test UAP Level 3 methods
        plan = omega_agent.plan()
        print("✅ UAP Plan:", plan)
        
        execution = omega_agent.execute()
        print("✅ UAP Execution Tasks:", execution)
        
        collapse = omega_agent.collapse()
        print("✅ UAP Collapse Result:", collapse)
        
        # Test teardown
        await omega_agent.teardown()
        print("✅ OperatorOmega Agent teardown completed")
        
        print("\n🎉 OperatorOmega Agent - UAP Level 3 Runtime Orchestrator TEST PASSED!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_omega_agent()) 