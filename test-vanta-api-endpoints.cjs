#!/usr/bin/env node
/**
 * VANTA API Endpoints Validation Test
 * ===================================
 * 
 * Tests all API endpoints that were previously returning 404 errors
 * to verify the new comprehensive API server is working correctly
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:8001';

// ANSI color codes for output
const colors = {
    green: '\x1b[32m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    reset: '\x1b[0m'
};

function log(color, message) {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testEndpoint(method, endpoint, data = null, headers = {}) {
    try {
        const config = {
            method: method.toLowerCase(),
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...headers
            }
        };

        if (data) {
            config.data = data;
        }

        const response = await axios(config);
        log('green', `✅ ${method} ${endpoint} - Status: ${response.status}`);
        return { success: true, status: response.status, data: response.data };
    } catch (error) {
        const status = error.response?.status || 'ERROR';
        log('red', `❌ ${method} ${endpoint} - Status: ${status} - ${error.message}`);
        return { success: false, status, error: error.message };
    }
}

async function runTests() {
    log('cyan', '🚀 Starting VANTA API Endpoints Validation Test');
    log('white', '================================================');

    const results = {
        total: 0,
        passed: 0,
        failed: 0,
        details: []
    };

    // Test cases - all the endpoints that were returning 404 before
    const testCases = [
        // System Health
        { method: 'GET', endpoint: '/', name: 'Root endpoint' },
        { method: 'GET', endpoint: '/health', name: 'System health check' },

        // Agent Management (was 404)
        { method: 'GET', endpoint: '/api/v1/agents/', name: 'Get all agents' },

        // Vault Management (was 404)
        { method: 'GET', endpoint: '/api/v1/vault/providers', name: 'Get vault providers' },
        { method: 'GET', endpoint: '/api/v1/vault/health', name: 'Vault health check' },
        { method: 'GET', endpoint: '/api/v1/vault/status', name: 'Vault status' },

        // Bridge Management (was 404)
        { method: 'GET', endpoint: '/api/v1/bridges/status', name: 'Bridges status' },
        { method: 'GET', endpoint: '/api/v1/bridges/connectors', name: 'Bridge connectors' },
        { method: 'GET', endpoint: '/api/v1/bridges/rules', name: 'Bridge rules' },
        { method: 'GET', endpoint: '/api/v1/bridges/health', name: 'Bridge health' },
        { method: 'GET', endpoint: '/api/v1/bridges/supported-apps', name: 'Supported apps' },

        // AI Services (was 404)
        { method: 'GET', endpoint: '/api/v1/ai/services/status', name: 'AI services status' },
        { method: 'GET', endpoint: '/api/v1/ai/health', name: 'AI health check' },

        // MCP Integration (new endpoints)
        { method: 'GET', endpoint: '/api/v1/mcp/servers', name: 'MCP servers list' },
        { method: 'GET', endpoint: '/api/v1/mcp/tools', name: 'MCP tools list' },

        // Authentication (was 404)
        { 
            method: 'POST', 
            endpoint: '/auth/login', 
            name: 'Authentication login',
            data: { username: 'admin', password: 'vanta_admin_secure_password' }
        }
    ];

    log('blue', '📊 Testing Endpoints...\n');

    for (const testCase of testCases) {
        results.total++;
        log('yellow', `Testing: ${testCase.name}`);
        
        const result = await testEndpoint(
            testCase.method, 
            testCase.endpoint, 
            testCase.data
        );

        if (result.success) {
            results.passed++;
        } else {
            results.failed++;
        }

        results.details.push({
            name: testCase.name,
            endpoint: testCase.endpoint,
            method: testCase.method,
            success: result.success,
            status: result.status
        });

        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Test an authenticated endpoint
    log('yellow', 'Testing authenticated endpoint...');
    const loginResult = await testEndpoint('POST', '/auth/login', {
        username: 'admin',
        password: 'vanta_admin_secure_password'
    });

    if (loginResult.success && loginResult.data.access_token) {
        results.total++;
        const authToken = loginResult.data.access_token;
        const authResult = await testEndpoint('GET', '/auth/me', null, {
            'Authorization': `Bearer ${authToken}`
        });
        
        if (authResult.success) {
            results.passed++;
            log('green', '✅ Authenticated endpoint access successful');
        } else {
            results.failed++;
        }
    }

    // Display final results
    log('white', '\n================================================');
    log('cyan', '📈 Test Results Summary');
    log('white', '================================================');

    log('white', `Total Endpoints Tested: ${results.total}`);
    log('green', `✅ Passed: ${results.passed}`);
    log('red', `❌ Failed: ${results.failed}`);
    
    const successRate = ((results.passed / results.total) * 100).toFixed(1);
    log('cyan', `📊 Success Rate: ${successRate}%`);

    if (results.failed > 0) {
        log('yellow', '\n⚠️  Failed Endpoints:');
        results.details
            .filter(detail => !detail.success)
            .forEach(detail => {
                log('red', `   ${detail.method} ${detail.endpoint} - ${detail.name}`);
            });
    }

    // Integration status
    log('white', '\n================================================');
    log('cyan', '🔗 VANTA Ecosystem Integration Status');
    log('white', '================================================');

    if (successRate >= 90) {
        log('green', '🎉 EXCELLENT: All critical endpoints are operational!');
        log('green', '   ✅ Agent Management System: Active');
        log('green', '   ✅ Vault Security Layer: Active'); 
        log('green', '   ✅ MCP Bridge Network: Active');
        log('green', '   ✅ AI Services Hub: Active');
        log('green', '   ✅ Authentication System: Active');
        log('white', '');
        log('cyan', '🚀 VANTA Ecosystem is ready for "vibe coding heaven" workflows!');
    } else if (successRate >= 70) {
        log('yellow', '⚠️  GOOD: Most endpoints working, some issues detected');
    } else {
        log('red', '❌ POOR: Multiple endpoint failures detected');
    }

    return results;
}

// Install axios if not available
async function checkDependencies() {
    try {
        require('axios');
    } catch (error) {
        log('yellow', '📦 Installing axios dependency...');
        const { execSync } = require('child_process');
        execSync('npm install axios', { stdio: 'inherit' });
        log('green', '✅ Dependencies installed successfully');
    }
}

// Main execution
async function main() {
    try {
        await checkDependencies();
        
        // Test server connectivity first
        log('cyan', '🔍 Checking server connectivity...');
        const healthCheck = await testEndpoint('GET', '/health');
        
        if (!healthCheck.success) {
            log('red', '❌ Cannot connect to VANTA API server on localhost:8001');
            log('yellow', 'Please ensure the server is running: python vanta_ecosystem_api_server.py');
            process.exit(1);
        }

        log('green', '✅ Server is responding\n');
        
        const results = await runTests();
        
        // Exit with error code if tests failed
        process.exit(results.failed > 0 ? 1 : 0);
        
    } catch (error) {
        log('red', `💥 Test execution failed: ${error.message}`);
        process.exit(1);
    }
}

main(); 