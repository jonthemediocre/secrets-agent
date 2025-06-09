'use client';

import React, { useState } from 'react';
import { PageHeader } from '@/components/page-header';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  CircleStackIcon,
  LockClosedIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  KeyIcon,
  ClockIcon,
  ServerIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';
import { useVaults } from '@/src/hooks/useVaults';
import { useAuth } from '@/src/contexts/AuthContext';

export default function VaultsPage() {
  const { isAuthenticated, user } = useAuth();
  const { vaults, stats, isLoading, error, createVault, deleteVault, refreshVaults } = useVaults();
  
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [createForm, setCreateForm] = useState({
    name: '',
    description: '',
  });
  const [createError, setCreateError] = useState<string | null>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Show auth required message if not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CircleStackIcon className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
            <CardTitle>Authentication Required</CardTitle>
            <CardDescription>
              Please log in to view your vaults
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

  const handleCreateVault = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    setCreateError(null);

    if (!createForm.name.trim()) {
      setCreateError('Vault name is required');
      setIsCreating(false);
      return;
    }

    try {
      const result = await createVault(createForm.name.trim(), createForm.description.trim() || undefined);
      
      if (result.success) {
        setIsCreateDialogOpen(false);
        setCreateForm({ name: '', description: '' });
        // Refresh vaults to get updated data
        await refreshVaults();
      } else {
        setCreateError(result.error || 'Failed to create vault');
      }
    } catch (err) {
      setCreateError('An unexpected error occurred');
    } finally {
      setIsCreating(false);
    }
  };

  const handleDeleteVault = async (vaultId: string, vaultName: string) => {
    if (!confirm(`Are you sure you want to delete "${vaultName}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const result = await deleteVault(vaultId);
      if (!result.success) {
        alert(`Failed to delete vault: ${result.error}`);
      }
    } catch (err) {
      alert('An unexpected error occurred while deleting the vault');
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400">Active</Badge>;
      case 'maintenance':
        return <Badge className="bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400">Maintenance</Badge>;
      case 'archived':
        return <Badge className="bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400">Archived</Badge>;
      default:
        return <Badge>Unknown</Badge>;
    }
  };

  // Create stats display array
  const vaultStats = stats ? [
    { name: 'Total Vaults', value: stats.totalVaults, icon: CircleStackIcon, color: 'bg-blue-500' },
    { name: 'Active Secrets', value: stats.activeSecrets, icon: LockClosedIcon, color: 'bg-green-500' },
    { name: 'Access Events', value: stats.accessEvents, icon: EyeIcon, color: 'bg-purple-500' },
    { name: 'Rotations', value: stats.rotations, icon: ClockIcon, color: 'bg-orange-500' },
  ] : [
    { name: 'Loading...', value: 0, icon: CircleStackIcon, color: 'bg-gray-500' },
    { name: 'Loading...', value: 0, icon: LockClosedIcon, color: 'bg-gray-500' },
    { name: 'Loading...', value: 0, icon: EyeIcon, color: 'bg-gray-500' },
    { name: 'Loading...', value: 0, icon: ClockIcon, color: 'bg-gray-500' },
  ];

  return (
    <>
      <PageHeader 
        title="Secret Vaults" 
        description={user ? 
          `Manage encrypted vaults and storage containers • ${vaults.length} vaults` :
          "Manage encrypted vaults and storage containers"
        }
      >
        <Button size="sm" variant="outline" onClick={refreshVaults}>
          <ServerIcon className="w-4 h-4 mr-2" />
          Refresh
        </Button>
        
        <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <PlusIcon className="w-4 h-4 mr-2" />
              New Vault
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Vault</DialogTitle>
              <DialogDescription>
                Create a secure storage container for your secrets
              </DialogDescription>
            </DialogHeader>
            
            {createError && (
              <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
                <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
                <AlertDescription className="text-red-700 dark:text-red-400">
                  {createError}
                </AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleCreateVault} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="vaultName">Vault Name *</Label>
                <Input
                  id="vaultName"
                  value={createForm.name}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, name: e.target.value }))}
                  placeholder="e.g., Production Environment"
                  disabled={isCreating}
                  required
                />
              </div>
              
              <div className="space-y-2">
                <Label htmlFor="vaultDescription">Description (optional)</Label>
                <Input
                  id="vaultDescription"
                  value={createForm.description}
                  onChange={(e) => setCreateForm(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="e.g., Production secrets and keys"
                  disabled={isCreating}
                />
              </div>

              <div className="flex justify-end space-x-2">
                <Button 
                  type="button" 
                  variant="outline" 
                  onClick={() => setIsCreateDialogOpen(false)}
                  disabled={isCreating}
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Creating...
                    </>
                  ) : (
                    'Create Vault'
                  )}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      </PageHeader>

      <main className="p-6 max-w-7xl mx-auto">
        <div className="space-y-6">
          {/* Error State */}
          {error && (
            <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700 dark:text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Vault Statistics */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {vaultStats.map((stat, index) => (
              <Card key={index} className="relative overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center space-x-4">
                    <div className={`w-12 h-12 rounded-lg ${stat.color} flex items-center justify-center`}>
                      <stat.icon className="w-6 h-6 text-white" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">
                        {isLoading ? (
                          <div className="h-8 w-16 bg-muted rounded animate-pulse"></div>
                        ) : (
                          stat.value
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground">{stat.name}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Main Content */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Vault Overview */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Vault Overview</CardTitle>
                <CardDescription>
                  {isLoading ? 'Loading vaults...' : 
                   vaults.length > 0 ? `${vaults.length} vault(s) found` :
                   'No vaults found - create your first vault to get started'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                      <div key={i} className="h-16 bg-muted rounded animate-pulse"></div>
                    ))}
                  </div>
                ) : vaults.length > 0 ? (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Secrets</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Accessed</TableHead>
                        <TableHead>Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {vaults.map((vault) => (
                        <TableRow key={vault.id}>
                          <TableCell>
                            <div className="space-y-1">
                              <div className="font-medium">{vault.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {vault.description}
                              </div>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">{vault.secretCount}</Badge>
                          </TableCell>
                          <TableCell>
                            {getStatusBadge(vault.status)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {vault.lastAccessed}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" variant="ghost" asChild>
                                <a href={`/secrets?vault=${vault.id}`}>
                                  <EyeIcon className="w-4 h-4" />
                                </a>
                              </Button>
                              <Button size="sm" variant="ghost">
                                <PencilIcon className="w-4 h-4" />
                              </Button>
                              <Button 
                                size="sm" 
                                variant="ghost" 
                                className="text-red-600 hover:text-red-700"
                                onClick={() => handleDeleteVault(vault.id, vault.name)}
                              >
                                <TrashIcon className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                ) : (
                  <div className="text-center py-12">
                    <CircleStackIcon className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium mb-2">No vaults yet</h3>
                    <p className="text-muted-foreground mb-4">
                      Create your first vault to start storing secrets securely
                    </p>
                    <Button onClick={() => setIsCreateDialogOpen(true)}>
                      <PlusIcon className="w-4 h-4 mr-2" />
                      Create First Vault
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="space-y-6">
              {/* Storage Usage */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Storage Usage</CardTitle>
                  <CardDescription>Current vault storage</CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Used</span>
                      <span className="font-medium">
                        {isLoading ? '...' : 
                         stats ? `${Math.round(stats.activeSecrets * 0.25)} MB` : '0 MB'}
                      </span>
                    </div>
                    <Progress 
                      value={isLoading ? 0 : Math.min(85, (stats?.activeSecrets || 0) * 2)} 
                      className="h-2" 
                    />
                    <p className="text-xs text-muted-foreground">
                      {isLoading ? 'Loading...' : 
                       stats ? `${Math.max(0, 1000 - stats.activeSecrets)} slots remaining` : 
                       '1000 slots available'}
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Security Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Security Status</CardTitle>
                  <CardDescription>All vaults encrypted</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center space-x-3">
                    <div className="w-8 h-8 rounded-full bg-green-100 dark:bg-green-900/20 flex items-center justify-center">
                      <CheckCircleIcon className="w-4 h-4 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                      <div className="font-medium">AES-256-GCM</div>
                      <div className="text-sm text-muted-foreground">Encryption active</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </main>
    </>
  );
} 