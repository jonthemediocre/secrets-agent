'use client'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { Breadcrumb } from '@/components/breadcrumb'
import { PageHeader } from '@/components/page-header'
import { Terminal, Code, Key, Book, Download, Copy, ExternalLink, Zap } from 'lucide-react'

export default function DeveloperPage() {
  const apiEndpoints = [
    { name: "GET /api/secrets", description: "Retrieve all secrets", status: "Active" },
    { name: "POST /api/secrets", description: "Create new secret", status: "Active" },
    { name: "GET /api/vaults", description: "List all vaults", status: "Active" },
    { name: "POST /api/scan", description: "Trigger security scan", status: "Beta" },
    { name: "GET /api/agents", description: "List active agents", status: "Active" },
    { name: "POST /api/policies", description: "Create security policy", status: "Active" }
  ]

  const sdkLanguages = [
    { name: "JavaScript", version: "v2.1.3", downloads: "12.4k", status: "Stable" },
    { name: "Python", version: "v1.8.7", downloads: "8.9k", status: "Stable" },
    { name: "Go", version: "v1.5.2", downloads: "5.1k", status: "Stable" },
    { name: "Java", version: "v1.3.1", downloads: "3.2k", status: "Beta" },
    { name: "C#", version: "v1.1.0", downloads: "1.8k", status: "Alpha" },
    { name: "Rust", version: "v0.9.1", downloads: "892", status: "Alpha" }
  ]

  const cliCommands = [
    { command: "secrets-agent init", description: "Initialize new project" },
    { command: "secrets-agent scan", description: "Run security scan" },
    { command: "secrets-agent deploy", description: "Deploy to production" },
    { command: "secrets-agent logs", description: "View system logs" },
    { command: "secrets-agent config", description: "Manage configuration" },
    { command: "secrets-agent backup", description: "Create system backup" }
  ]

  const devStats = [
    { name: "API Calls", value: "1.2M", change: "+15% this month", icon: Zap },
    { name: "Active SDKs", value: "6", change: "+2 this quarter", icon: Code },
    { name: "CLI Downloads", value: "45.2k", change: "+890 this week", icon: Terminal },
    { name: "Documentation Views", value: "234k", change: "+12% this month", icon: Book }
  ]

  // Add click handlers for the buttons
  const handleStatusClick = (endpoint: any) => {
    // Handle endpoint status action
  }

  const handleAPIDocClick = (endpoint: any) => {
    // Handle API documentation action
  }

  const handleSDKDownload = (sdk: any) => {
    // Handle SDK download action
  }

  const handleCLICommandCopy = (command: string) => {
    navigator.clipboard.writeText(command)
    alert(`Copied: ${command}`)
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="Developer Tools"
        description="APIs, SDKs, and developer resources"
      >
        <div className="flex space-x-2">
          <Button variant="outline">
            <Book className="mr-2 h-4 w-4" />
            Documentation
          </Button>
          <Button>
            <Key className="mr-2 h-4 w-4" />
            Get API Key
          </Button>
        </div>
      </PageHeader>

      {/* Developer Stats */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {devStats.map((stat) => (
          <Card key={stat.name}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">{stat.name}</CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">{stat.change}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick Start */}
      <Card>
        <CardHeader>
          <CardTitle>Quick Start</CardTitle>
          <CardDescription>Get started with the Secrets Agent API in minutes</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <Alert>
              <Terminal className="h-4 w-4" />
              <AlertDescription>
                <div className="font-mono text-sm bg-muted p-2 rounded mt-2">
                  npm install @secrets-agent/sdk
                </div>
              </AlertDescription>
            </Alert>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <h4 className="font-medium">1. Install CLI</h4>
                <div className="bg-muted p-3 rounded font-mono text-sm">
                  curl -sSL https://cli.secrets-agent.com | sh
                </div>
              </div>
              <div className="space-y-2">
                <h4 className="font-medium">2. Authenticate</h4>
                <div className="bg-muted p-3 rounded font-mono text-sm">
                  secrets-agent auth login
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* API Endpoints */}
      <Card>
        <CardHeader>
          <CardTitle>API Endpoints</CardTitle>
          <CardDescription>Available REST API endpoints</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {apiEndpoints.map((endpoint, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="flex items-center space-x-3">
                  <code className="bg-muted px-2 py-1 rounded text-sm font-mono">
                    {endpoint.name}
                  </code>
                  <span className="text-sm text-muted-foreground">{endpoint.description}</span>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge 
                    variant={endpoint.status === 'Active' ? 'default' : 'secondary'}
                    className="cursor-pointer hover:bg-primary/80"
                    onClick={() => handleStatusClick(endpoint)}
                  >
                    {endpoint.status}
                  </Badge>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleAPIDocClick(endpoint)}
                  >
                    <ExternalLink className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* SDKs and CLI */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>SDKs</CardTitle>
            <CardDescription>Official SDKs for popular programming languages</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {sdkLanguages.map((sdk, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="flex items-center space-x-3">
                    <Code className="h-5 w-5 text-muted-foreground" />
                    <div>
                      <div className="font-medium">{sdk.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {sdk.version} • {sdk.downloads} downloads
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Badge variant={sdk.status === 'Stable' ? 'default' : 'outline'}>
                      {sdk.status}
                    </Badge>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSDKDownload(sdk)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>CLI Commands</CardTitle>
            <CardDescription>Essential command-line interface commands</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {cliCommands.map((cmd, index) => (
                <div key={index} className="flex items-center justify-between p-3 border rounded">
                  <div className="space-y-1">
                    <code className="text-sm font-mono">{cmd.command}</code>
                    <p className="text-sm text-muted-foreground">{cmd.description}</p>
                  </div>
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleCLICommandCopy(cmd.command)}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Code Examples */}
      <Card>
        <CardHeader>
          <CardTitle>Code Examples</CardTitle>
          <CardDescription>Common integration patterns</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="space-y-2">
              <h4 className="font-medium">JavaScript - Retrieve Secret</h4>
              <div className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">
                {`import { SecretsAgent } from '@secrets-agent/sdk';

const client = new SecretsAgent({
  apiKey: process.env.SECRETS_AGENT_API_KEY
});

const secret = await client.secrets.get('database-password');
console.log(secret.value);`}
              </div>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Python - Security Scan</h4>
              <div className="bg-muted p-4 rounded font-mono text-sm overflow-x-auto">
                {`from secrets_agent import SecretsAgentClient

client = SecretsAgentClient(api_key=os.getenv('SECRETS_AGENT_API_KEY'))

scan_result = client.security.scan({
    'target': '/path/to/repository',
    'rules': ['secrets', 'vulnerabilities']
})

print(f"Found {scan_result.issues_count} security issues")`}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
} 