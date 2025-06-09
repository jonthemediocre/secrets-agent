'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';

interface CLICommand {
  name: string;
  category: string;
  description: string;
  parameters: string[];
  webInterface: 'form' | 'button' | 'wizard' | 'dashboard';
}

export function CLIInterfaceBridge() {
  const [activeCategory, setActiveCategory] = useState('admin');
  const [commandOutput, setCommandOutput] = useState<string>('');
  const [isExecuting, setIsExecuting] = useState(false);

  // Missing CLI commands from audit that need web interfaces
  const missingCommands: CLICommand[] = [
    // Admin Functions
    {
      name: 'bootstrap',
      category: 'admin',
      description: 'Initialize new Secrets Agent project with complete setup',
      parameters: ['project_name', 'template', 'vault_config'],
      webInterface: 'wizard'
    },
    {
      name: 'link',
      category: 'admin', 
      description: 'Link environment variables and configurations',
      parameters: ['source_env', 'target_env', 'sync_mode'],
      webInterface: 'form'
    },
    {
      name: 'sync_shared_resources',
      category: 'admin',
      description: 'Synchronize shared resources across environments', 
      parameters: ['resource_type', 'target_env'],
      webInterface: 'dashboard'
    },

    // Vault Operations
    {
      name: 'vault_rotate',
      category: 'vault',
      description: 'Rotate vault secrets with policy enforcement',
      parameters: ['secret_path', 'rotation_policy', 'notification'],
      webInterface: 'form'
    },
    {
      name: 'vault_backup',
      category: 'vault',
      description: 'Create encrypted backup of vault secrets',
      parameters: ['backup_location', 'encryption_key', 'compression'],
      webInterface: 'wizard'
    },
    {
      name: 'vault_restore', 
      category: 'vault',
      description: 'Restore vault from encrypted backup',
      parameters: ['backup_file', 'restore_policy', 'verification'],
      webInterface: 'wizard'
    },

    // MCP Operations
    {
      name: 'mcp_start',
      category: 'mcp',
      description: 'Start MCP server with specified tools',
      parameters: ['server_config', 'tool_selection', 'port'],
      webInterface: 'form'
    },
    {
      name: 'mcp_stop',
      category: 'mcp', 
      description: 'Stop MCP server gracefully',
      parameters: ['server_id', 'force_stop'],
      webInterface: 'button'
    },
    {
      name: 'mcp_status',
      category: 'mcp',
      description: 'Get MCP server status and health metrics',
      parameters: ['detailed', 'format'],
      webInterface: 'dashboard'
    },

    // Domino Governance
    {
      name: 'domino_audit',
      category: 'domino',
      description: 'Run comprehensive security audit with VANTA compliance',
      parameters: ['audit_scope', 'compliance_framework', 'output_format'],
      webInterface: 'wizard'
    },
    {
      name: 'domino_approve',
      category: 'domino',
      description: 'Process approval workflows for secret changes',
      parameters: ['request_id', 'approval_level', 'justification'],
      webInterface: 'form'
    },
    {
      name: 'domino_policy',
      category: 'domino',
      description: 'Manage governance policies and enforcement rules',
      parameters: ['policy_name', 'enforcement_level', 'scope'],
      webInterface: 'form'
    }
  ];

  const executeCommand = async (command: CLICommand, params: Record<string, string>) => {
    setIsExecuting(true);
    setCommandOutput('');
    
    try {
      // Simulate CLI command execution via API
      const response = await fetch('/api/cli/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          command: command.name,
          parameters: params,
          category: command.category
        })
      });
      
      const result = await response.json();
      setCommandOutput(result.output || `Command ${command.name} executed successfully`);
    } catch (error) {
      setCommandOutput(`Error executing ${command.name}: ${error}`);
    } finally {
      setIsExecuting(false);
    }
  };

  const renderCommandInterface = (command: CLICommand) => {
    const [params, setParams] = useState<Record<string, string>>({});
    
    switch (command.webInterface) {
      case 'button':
        return (
          <Card key={command.name} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {command.name}
                <Badge variant="secondary">{command.category}</Badge>
              </CardTitle>
              <CardDescription>{command.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Button 
                onClick={() => executeCommand(command, params)}
                disabled={isExecuting}
                className="w-full"
              >
                {isExecuting ? 'Executing...' : `Run ${command.name}`}
              </Button>
            </CardContent>
          </Card>
        );

      case 'form':
        return (
          <Card key={command.name} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {command.name}
                <Badge variant="secondary">{command.category}</Badge>
              </CardTitle>
              <CardDescription>{command.description}</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {command.parameters.map(param => (
                <div key={param}>
                  <label className="text-sm font-medium mb-1 block">
                    {param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </label>
                  <Input
                    placeholder={`Enter ${param}`}
                    value={params[param] || ''}
                    onChange={(e) => setParams(prev => ({
                      ...prev,
                      [param]: e.target.value
                    }))}
                  />
                </div>
              ))}
              <Button 
                onClick={() => executeCommand(command, params)}
                disabled={isExecuting}
                className="w-full mt-4"
              >
                {isExecuting ? 'Executing...' : `Execute ${command.name}`}
              </Button>
            </CardContent>
          </Card>
        );

      case 'wizard':
        return (
          <Card key={command.name} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {command.name}
                <Badge variant="secondary">{command.category}</Badge>
              </CardTitle>
              <CardDescription>{command.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <Dialog>
                <DialogTrigger asChild>
                  <Button variant="outline" className="w-full">
                    Open {command.name} Wizard
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>{command.name} Setup Wizard</DialogTitle>
                    <DialogDescription>
                      {command.description}
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4 mt-4">
                    {command.parameters.map((param, index) => (
                      <div key={param}>
                        <label className="text-sm font-medium mb-1 block">
                          Step {index + 1}: {param.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </label>
                        <Input
                          placeholder={`Configure ${param}`}
                          value={params[param] || ''}
                          onChange={(e) => setParams(prev => ({
                            ...prev,
                            [param]: e.target.value
                          }))}
                        />
                      </div>
                    ))}
                    <Button 
                      onClick={() => executeCommand(command, params)}
                      disabled={isExecuting}
                      className="w-full mt-6"
                    >
                      {isExecuting ? 'Processing...' : `Complete ${command.name}`}
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardContent>
          </Card>
        );

      case 'dashboard':
        return (
          <Card key={command.name} className="mb-4">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                {command.name}
                <Badge variant="secondary">{command.category}</Badge>
              </CardTitle>
              <CardDescription>{command.description}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4 mb-4">
                <div className="bg-blue-50 p-3 rounded-lg">
                  <div className="text-sm text-blue-600">Status</div>
                  <div className="font-semibold">Ready</div>
                </div>
                <div className="bg-green-50 p-3 rounded-lg">
                  <div className="text-sm text-green-600">Last Run</div>
                  <div className="font-semibold">2 hours ago</div>
                </div>
              </div>
              <Button 
                onClick={() => executeCommand(command, params)}
                disabled={isExecuting}
                className="w-full"
              >
                {isExecuting ? 'Refreshing...' : `Refresh ${command.name}`}
              </Button>
            </CardContent>
          </Card>
        );

      default:
        return null;
    }
  };

  const commandsByCategory = missingCommands.reduce((acc, cmd) => {
    if (!acc[cmd.category]) acc[cmd.category] = [];
    acc[cmd.category].push(cmd);
    return acc;
  }, {} as Record<string, CLICommand[]>);

  return (
    <div className="max-w-6xl mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">🔧 CLI Interface Bridge</h1>
        <p className="text-gray-600">
          Web interfaces for all CLI functions - Bridging the 87.5% coverage gap
        </p>
      </div>

      <Tabs value={activeCategory} onValueChange={setActiveCategory}>
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="admin">Admin ({commandsByCategory.admin?.length || 0})</TabsTrigger>
          <TabsTrigger value="vault">Vault ({commandsByCategory.vault?.length || 0})</TabsTrigger>
          <TabsTrigger value="mcp">MCP ({commandsByCategory.mcp?.length || 0})</TabsTrigger>
          <TabsTrigger value="domino">Domino ({commandsByCategory.domino?.length || 0})</TabsTrigger>
        </TabsList>

        {Object.entries(commandsByCategory).map(([category, commands]) => (
          <TabsContent key={category} value={category} className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {commands.map(renderCommandInterface)}
            </div>
          </TabsContent>
        ))}
      </Tabs>

      {commandOutput && (
        <Alert className="mt-6">
          <AlertDescription>
            <pre className="whitespace-pre-wrap text-sm">{commandOutput}</pre>
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
} 