'use client';

import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'next/navigation';
import { PageHeader } from '@/components/page-header';
import { Breadcrumb } from '@/components/breadcrumb';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  KeyIcon,
  ClockIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  DocumentDuplicateIcon,
  TagIcon,
  EllipsisVerticalIcon,
  MagnifyingGlassIcon,
  CloudIcon,
  UserIcon,
  CogIcon
} from '@heroicons/react/24/outline';
import { useAuth } from '@/src/contexts/AuthContext';

interface Secret {
  id: string;
  name: string;
  description?: string;
  value: string;
  type: 'text' | 'password' | 'api_key' | 'certificate' | 'json';
  tags: string[];
  vaultId: string;
  createdAt: string;
  updatedAt: string;
  expiresAt?: string;
  lastAccessed?: string;
}

const mockAppSecrets: Secret[] = [
  {
    id: 'session_secret',
    name: 'SESSION_SECRET',
    value: 'super-secret-session-key-12345',
    type: 'password',
    tags: ['auth', 'session'],
    vaultId: 'app-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'database_url',
    name: 'DATABASE_URL',
    value: 'postgresql://user:pass@localhost:5432/mydb',
    type: 'text',
    tags: ['database', 'connection'],
    vaultId: 'app-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'pgdatabase',
    name: 'PGDATABASE',
    value: 'secrets_agent_db',
    type: 'text',
    tags: ['postgres'],
    vaultId: 'app-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'pghost',
    name: 'PGHOST',
    value: 'localhost',
    type: 'text',
    tags: ['postgres'],
    vaultId: 'app-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'pgport',
    name: 'PGPORT',
    value: '5432',
    type: 'text',
    tags: ['postgres'],
    vaultId: 'app-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'pguser',
    name: 'PGUSER',
    value: 'postgres',
    type: 'text',
    tags: ['postgres'],
    vaultId: 'app-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'pgpassword',
    name: 'PGPASSWORD',
    value: 'secure-password-123',
    type: 'password',
    tags: ['postgres', 'auth'],
    vaultId: 'app-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'weather_api_key',
    name: 'WEATHERAPI_KEY',
    value: 'abc123def456ghi789jkl012mno345pqr678',
    type: 'api_key',
    tags: ['api', 'external'],
    vaultId: 'app-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'shared_db_connection',
    name: 'SHARED_DB_CONNECTION_STRING',
    value: 'Server=myServerAddress;Database=myDataBase;User Id=myUsername;Password=myPassword;',
    type: 'text',
    tags: ['database', 'shared'],
    vaultId: 'app-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  }
];

const mockAccountSecrets: Secret[] = [
  {
    id: 'personal_api_token',
    name: 'Personal API Token',
    value: 'pat_1234567890abcdef',
    type: 'api_key',
    tags: ['personal', 'api'],
    vaultId: 'personal-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'ssh_private_key',
    name: 'SSH Private Key',
    value: '-----BEGIN OPENSSH PRIVATE KEY-----\nb3BlbnNzaC1rZXktdjEAAAAA...',
    type: 'certificate',
    tags: ['ssh', 'key'],
    vaultId: 'personal-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  },
  {
    id: 'backup_password',
    name: 'Backup Password',
    value: 'MySecureBackupPassword2025!',
    type: 'password',
    tags: ['backup', 'personal'],
    vaultId: 'personal-vault',
    createdAt: '2025-01-01',
    updatedAt: '2025-01-01'
  }
];

export default function SecretsPage() {
  const { isAuthenticated, user } = useAuth();
  const [activeTab, setActiveTab] = useState('app');
  const [searchTerm, setSearchTerm] = useState('');
  const [revealedSecrets, setRevealedSecrets] = useState<Record<string, boolean>>({});
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [selectedSecrets, setSelectedSecrets] = useState<string[]>([]);
  const [createForm, setCreateForm] = useState({
    name: '',
    value: '',
    type: 'text' as const,
    description: '',
    tags: ''
  });

  // Show auth required message if not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <LockClosedIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to view your secrets
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full">
              <a href="/auth/login">Sign In</a>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentSecrets = activeTab === 'app' ? mockAppSecrets : mockAccountSecrets;
  
  const filteredSecrets = currentSecrets.filter(secret =>
    secret.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    secret.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    secret.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  const handleRevealSecret = (secretId: string) => {
    setRevealedSecrets(prev => ({
      ...prev,
      [secretId]: !prev[secretId]
    }));
  };

  const copyToClipboard = async (text: string, secretName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Add toast notification here
      console.log(`Copied ${secretName} to clipboard`);
    } catch (err) {
      console.error('Failed to copy to clipboard:', err);
    }
  };

  const handleCreateSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    // Mock creation logic
    console.log('Creating secret:', createForm);
    setIsCreateDialogOpen(false);
    setCreateForm({ name: '', value: '', type: 'text', description: '', tags: '' });
  };

  const maskValue = (value: string) => {
    return '•'.repeat(Math.min(value.length, 8));
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'password': return <LockClosedIcon className="h-4 w-4" />;
      case 'api_key': return <KeyIcon className="h-4 w-4" />;
      case 'certificate': return <ServerIcon className="h-4 w-4" />;
      default: return <DocumentDuplicateIcon className="h-4 w-4" />;
    }
  };

  const getTypeBadge = (type: string) => {
    const typeColors: Record<string, string> = {
      text: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
      password: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400',
      api_key: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
      certificate: 'bg-purple-100 text-purple-700 dark:bg-purple-900/20 dark:text-purple-400',
      json: 'bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400',
    };
    
    return (
      <Badge className={`${typeColors[type] || 'bg-gray-100 text-gray-700'} text-xs`}>
        {type.replace('_', ' ').toUpperCase()}
      </Badge>
    );
  };

  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="Secrets"
        description="Manage your application and account secrets securely"
      >
        <div className="flex gap-2">
          <Button variant="outline">
            <DocumentDuplicateIcon className="mr-2 h-4 w-4" />
            Docs
          </Button>
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <PlusIcon className="mr-2 h-4 w-4" />
                New Secret
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Secret</DialogTitle>
                <DialogDescription>
                  Add a new secret to your vault. Choose the appropriate type for better organization.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreateSecret} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      placeholder="SECRET_NAME"
                      value={createForm.name}
                      onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Type</Label>
                    <Select value={createForm.type} onValueChange={(value: any) => setCreateForm(prev => ({ ...prev, type: value }))}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="text">Text</SelectItem>
                        <SelectItem value="password">Password</SelectItem>
                        <SelectItem value="api_key">API Key</SelectItem>
                        <SelectItem value="certificate">Certificate</SelectItem>
                        <SelectItem value="json">JSON</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="value">Value</Label>
                  <Textarea
                    id="value"
                    placeholder="Enter secret value..."
                    value={createForm.value}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, value: e.target.value }))}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Input
                    id="description"
                    placeholder="Brief description of this secret"
                    value={createForm.description}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="tags">Tags (Optional)</Label>
                  <Input
                    id="tags"
                    placeholder="database, api, production (comma-separated)"
                    value={createForm.tags}
                    onChange={(e) => setCreateForm(prev => ({ ...prev, tags: e.target.value }))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setIsCreateDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">
                    Create Secret
                  </Button>
                </div>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </PageHeader>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-4">
        <div className="flex items-center justify-between">
          <TabsList>
            <TabsTrigger value="app" className="flex items-center gap-2">
              <CloudIcon className="h-4 w-4" />
              App Secrets
            </TabsTrigger>
            <TabsTrigger value="account" className="flex items-center gap-2">
              <UserIcon className="h-4 w-4" />
              Account Secrets
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-2">
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search secrets..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-64"
              />
            </div>
          </div>
        </div>

        <TabsContent value="app" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {filteredSecrets.map((secret, index) => (
                  <div key={secret.id} className={`p-4 flex items-center justify-between hover:bg-muted/50 transition-colors ${index !== filteredSecrets.length - 1 ? 'border-b' : ''}`}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(secret.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{secret.name}</span>
                            {getTypeBadge(secret.type)}
                          </div>
                          {secret.description && (
                            <p className="text-sm text-muted-foreground">{secret.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(secret.value, secret.name)}
                          className="h-8 w-8 p-0"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </Button>
                        <div className="font-mono text-sm min-w-[120px] text-right">
                          {revealedSecrets[secret.id] ? secret.value : maskValue(secret.value)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevealSecret(secret.id)}
                          className="h-8 w-8 p-0"
                        >
                          {revealedSecrets[secret.id] ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <EllipsisVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <PencilIcon className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ClockIcon className="mr-2 h-4 w-4" />
                              Set Expiry
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <TrashIcon className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
                
                {filteredSecrets.length === 0 && (
                  <div className="p-8 text-center text-muted-foreground">
                    <LockClosedIcon className="h-12 w-12 mx-auto mb-4 opacity-50" />
                    <p>No secrets found</p>
                    <p className="text-sm">Create your first secret to get started</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="account" className="space-y-4">
          <Card>
            <CardContent className="p-0">
              <div className="space-y-0">
                {(activeTab === 'account' ? mockAccountSecrets : []).filter(secret =>
                  secret.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  secret.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                  secret.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))
                ).map((secret, index, array) => (
                  <div key={secret.id} className={`p-4 flex items-center justify-between hover:bg-muted/50 transition-colors ${index !== array.length - 1 ? 'border-b' : ''}`}>
                    <div className="flex items-center gap-4 flex-1">
                      <div className="flex items-center gap-2">
                        {getTypeIcon(secret.type)}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-medium">{secret.name}</span>
                            {getTypeBadge(secret.type)}
                          </div>
                          {secret.description && (
                            <p className="text-sm text-muted-foreground">{secret.description}</p>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(secret.value, secret.name)}
                          className="h-8 w-8 p-0"
                        >
                          <DocumentDuplicateIcon className="h-4 w-4" />
                        </Button>
                        <div className="font-mono text-sm min-w-[120px] text-right">
                          {revealedSecrets[secret.id] ? secret.value : maskValue(secret.value)}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRevealSecret(secret.id)}
                          className="h-8 w-8 p-0"
                        >
                          {revealedSecrets[secret.id] ? (
                            <EyeSlashIcon className="h-4 w-4" />
                          ) : (
                            <EyeIcon className="h-4 w-4" />
                          )}
                        </Button>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <EllipsisVerticalIcon className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem>
                              <PencilIcon className="mr-2 h-4 w-4" />
                              Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem>
                              <ClockIcon className="mr-2 h-4 w-4" />
                              Set Expiry
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-red-600">
                              <TrashIcon className="mr-2 h-4 w-4" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Bottom Actions */}
      <Card>
        <CardContent className="py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="outline" size="sm">
                <CogIcon className="mr-2 h-4 w-4" />
                Edit as JSON
              </Button>
              <Button variant="outline" size="sm">
                <DocumentDuplicateIcon className="mr-2 h-4 w-4" />
                Edit as .env
              </Button>
            </div>
            <div className="text-sm text-muted-foreground">
              Showing {filteredSecrets.length} of {currentSecrets.length} secrets
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 