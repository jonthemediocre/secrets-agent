'use client'

import React, { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Switch } from '@/components/ui/switch'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Slider } from '@/components/ui/slider'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Separator } from '@/components/ui/separator'
import { Breadcrumb } from '@/components/breadcrumb'
import { PageHeader } from '@/components/page-header'
import { 
  Settings,
  User,
  Shield,
  Bell,
  Monitor,
  Database,
  Network,
  Key,
  Clock,
  Mail,
  Smartphone,
  Globe,
  Lock,
  AlertTriangle,
  CheckCircle,
  Info,
  Trash2,
  Download,
  Upload,
  RefreshCw,
  Eye,
  EyeOff,
  Save,
  RotateCcw,
  Users,
  Server,
  Cpu,
  HardDrive,
  Wifi
} from 'lucide-react'

interface UserSettings {
  profile: {
    displayName: string
    email: string
    avatar: string
    timezone: string
    language: string
  }
  preferences: {
    theme: 'light' | 'dark' | 'system'
    notifications: {
      email: boolean
      browser: boolean
      mobile: boolean
      slack: boolean
      discord: boolean
    }
    dashboard: {
      autoRefresh: boolean
      refreshInterval: number
      compactMode: boolean
      showAdvanced: boolean
    }
    security: {
      sessionTimeout: number
      require2FA: boolean
      allowRememberMe: boolean
      logSecurityEvents: boolean
    }
  }
}

interface AdminSettings {
  system: {
    maintenanceMode: boolean
    debugMode: boolean
    logLevel: 'error' | 'warn' | 'info' | 'debug'
    maxSessions: number
    sessionCleanup: boolean
  }
  security: {
    passwordPolicy: {
      minLength: number
      requireUppercase: boolean
      requireNumbers: boolean
      requireSymbols: boolean
      maxAge: number
    }
    rateLimiting: {
      enabled: boolean
      requestsPerMinute: number
      banDuration: number
    }
    encryption: {
      algorithm: string
      keyRotationInterval: number
      autoBackup: boolean
    }
  }
  vault: {
    defaultTTL: number
    maxSecrets: number
    auditRetention: number
    autoCleanup: boolean
    compression: boolean
  }
  integrations: {
    sops: {
      enabled: boolean
      keyProvider: string
      encryptionKey: string
    }
    mcp: {
      enabled: boolean
      endpoint: string
      timeout: number
    }
    cicd: {
      webhook: string
      autoSync: boolean
      notifications: boolean
    }
  }
}

export default function SettingsPage() {
  const [userSettings, setUserSettings] = useState<UserSettings>({
    profile: {
      displayName: 'Alex Chen',
      email: 'alex.chen@company.com',
      avatar: '',
      timezone: 'America/New_York',
      language: 'en-US'
    },
    preferences: {
      theme: 'dark',
      notifications: {
        email: true,
        browser: true,
        mobile: false,
        slack: true,
        discord: false
      },
      dashboard: {
        autoRefresh: true,
        refreshInterval: 30,
        compactMode: false,
        showAdvanced: true
      },
      security: {
        sessionTimeout: 8,
        require2FA: true,
        allowRememberMe: false,
        logSecurityEvents: true
      }
    }
  })

  const [adminSettings, setAdminSettings] = useState<AdminSettings>({
    system: {
      maintenanceMode: false,
      debugMode: false,
      logLevel: 'info',
      maxSessions: 100,
      sessionCleanup: true
    },
    security: {
      passwordPolicy: {
        minLength: 12,
        requireUppercase: true,
        requireNumbers: true,
        requireSymbols: true,
        maxAge: 90
      },
      rateLimiting: {
        enabled: true,
        requestsPerMinute: 60,
        banDuration: 15
      },
      encryption: {
        algorithm: 'AES-256-GCM',
        keyRotationInterval: 30,
        autoBackup: true
      }
    },
    vault: {
      defaultTTL: 3600,
      maxSecrets: 10000,
      auditRetention: 365,
      autoCleanup: true,
      compression: true
    },
    integrations: {
      sops: {
        enabled: true,
        keyProvider: 'age',
        encryptionKey: '***'
      },
      mcp: {
        enabled: true,
        endpoint: 'http://localhost:3001',
        timeout: 30
      },
      cicd: {
        webhook: 'https://api.github.com/webhooks/secrets-agent',
        autoSync: true,
        notifications: true
      }
    }
  })

  const [isAdmin, setIsAdmin] = useState(true) // Mock admin status
  const [unsavedChanges, setUnsavedChanges] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    // Load settings from API
    const loadSettings = async () => {
      try {
        const response = await fetch('/api/settings')
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUserSettings(data.data.userSettings)
            setAdminSettings(data.data.adminSettings)
            setIsAdmin(data.data.isAdmin)
          }
        }
      } catch (error) {
        console.error('Failed to load settings:', error)
      }
    }
    
    loadSettings()
  }, [])

  const saveSettings = async () => {
    setSaving(true)
    try {
      const response = await fetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userSettings,
          adminSettings,
          isAdmin
        })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setUnsavedChanges(false)
          alert('Settings saved successfully!')
        } else {
          throw new Error(data.error)
        }
      } else {
        throw new Error('Failed to save settings')
      }
    } catch (error) {
      alert(`Failed to save settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setSaving(false)
    }
  }

  const resetToDefaults = async () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      try {
        const response = await fetch('/api/settings/reset?type=all', {
          method: 'POST'
        })
        
        if (response.ok) {
          const data = await response.json()
          if (data.success) {
            setUserSettings(data.data.userSettings)
            setAdminSettings(data.data.adminSettings)
            setUnsavedChanges(false)
            alert('Settings reset to defaults successfully!')
          } else {
            throw new Error(data.error)
          }
        } else {
          throw new Error('Failed to reset settings')
        }
      } catch (error) {
        alert(`Failed to reset settings: ${error instanceof Error ? error.message : 'Unknown error'}`)
      }
    }
  }

  const exportSettings = () => {
    const settingsExport = {
      userSettings,
      adminSettings,
      exportDate: new Date().toISOString()
    }
    const blob = new Blob([JSON.stringify(settingsExport, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'secrets-agent-settings.json'
    a.click()
  }

  const importSettings = () => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = '.json'
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0]
      if (file) {
        const reader = new FileReader()
        reader.onload = (e) => {
          try {
            const imported = JSON.parse(e.target?.result as string)
            if (imported.userSettings) setUserSettings(imported.userSettings)
            if (imported.adminSettings) setAdminSettings(imported.adminSettings)
            setUnsavedChanges(true)
            alert('Settings imported successfully!')
          } catch {
            alert('Invalid settings file')
          }
        }
        reader.readAsText(file)
      }
    }
    input.click()
  }

  return (
    <div className="space-y-6">
      <Breadcrumb />
      
      <PageHeader
        title="Settings & Configuration"
        description="Manage your personal preferences and system configuration"
      >
        <div className="flex gap-2">
          <Button variant="outline" onClick={importSettings}>
            <Upload className="mr-2 h-4 w-4" />
            Import
          </Button>
          <Button variant="outline" onClick={exportSettings}>
            <Download className="mr-2 h-4 w-4" />
            Export
          </Button>
          <Button variant="outline" onClick={resetToDefaults}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button onClick={saveSettings} disabled={!unsavedChanges || saving}>
            <Save className="mr-2 h-4 w-4" />
            {saving ? 'Saving...' : 'Save Changes'}
          </Button>
        </div>
      </PageHeader>

      {unsavedChanges && (
        <Alert>
          <Info className="h-4 w-4" />
          <AlertDescription>
            You have unsaved changes. Remember to save your settings before leaving this page.
          </AlertDescription>
        </Alert>
      )}

      <Tabs defaultValue="profile" className="space-y-4">
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="preferences">Preferences</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          {isAdmin && <TabsTrigger value="system">System</TabsTrigger>}
          {isAdmin && <TabsTrigger value="admin">Admin</TabsTrigger>}
        </TabsList>

        {/* Profile Settings */}
        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-5 w-5" />
                Profile Information
              </CardTitle>
              <CardDescription>
                Manage your personal profile and account details
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="displayName">Display Name</Label>
                  <Input
                    id="displayName"
                    value={userSettings.profile.displayName}
                    onChange={(e) => {
                      setUserSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, displayName: e.target.value }
                      }))
                      setUnsavedChanges(true)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email Address</Label>
                  <Input
                    id="email"
                    type="email"
                    value={userSettings.profile.email}
                    onChange={(e) => {
                      setUserSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, email: e.target.value }
                      }))
                      setUnsavedChanges(true)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="timezone">Timezone</Label>
                  <Select 
                    value={userSettings.profile.timezone}
                    onValueChange={(value) => {
                      setUserSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, timezone: value }
                      }))
                      setUnsavedChanges(true)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="America/New_York">Eastern Time</SelectItem>
                      <SelectItem value="America/Chicago">Central Time</SelectItem>
                      <SelectItem value="America/Denver">Mountain Time</SelectItem>
                      <SelectItem value="America/Los_Angeles">Pacific Time</SelectItem>
                      <SelectItem value="UTC">UTC</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="language">Language</Label>
                  <Select 
                    value={userSettings.profile.language}
                    onValueChange={(value) => {
                      setUserSettings(prev => ({
                        ...prev,
                        profile: { ...prev.profile, language: value }
                      }))
                      setUnsavedChanges(true)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="en-US">English (US)</SelectItem>
                      <SelectItem value="en-GB">English (UK)</SelectItem>
                      <SelectItem value="es-ES">Spanish</SelectItem>
                      <SelectItem value="fr-FR">French</SelectItem>
                      <SelectItem value="de-DE">German</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Preferences */}
        <TabsContent value="preferences" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Appearance
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Theme</Label>
                  <Select 
                    value={userSettings.preferences.theme}
                    onValueChange={(value: 'light' | 'dark' | 'system') => {
                      setUserSettings(prev => ({
                        ...prev,
                        preferences: { ...prev.preferences, theme: value }
                      }))
                      setUnsavedChanges(true)
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="light">Light</SelectItem>
                      <SelectItem value="dark">Dark</SelectItem>
                      <SelectItem value="system">System</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Monitor className="h-5 w-5" />
                  Dashboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="autoRefresh">Auto Refresh</Label>
                  <Switch
                    id="autoRefresh"
                    checked={userSettings.preferences.dashboard.autoRefresh}
                    onCheckedChange={(checked) => {
                      setUserSettings(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          dashboard: { ...prev.preferences.dashboard, autoRefresh: checked }
                        }
                      }))
                      setUnsavedChanges(true)
                    }}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Refresh Interval (seconds)</Label>
                  <Slider
                    value={[userSettings.preferences.dashboard.refreshInterval]}
                    onValueChange={(value) => {
                      setUserSettings(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          dashboard: { ...prev.preferences.dashboard, refreshInterval: value[0] }
                        }
                      }))
                      setUnsavedChanges(true)
                    }}
                    max={300}
                    min={5}
                    step={5}
                  />
                  <div className="text-sm text-muted-foreground">
                    {userSettings.preferences.dashboard.refreshInterval} seconds
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="compactMode">Compact Mode</Label>
                  <Switch
                    id="compactMode"
                    checked={userSettings.preferences.dashboard.compactMode}
                    onCheckedChange={(checked) => {
                      setUserSettings(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          dashboard: { ...prev.preferences.dashboard, compactMode: checked }
                        }
                      }))
                      setUnsavedChanges(true)
                    }}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Security Settings */}
        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Preferences
              </CardTitle>
              <CardDescription>
                Configure your personal security settings
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Session Timeout (hours)</Label>
                  <Slider
                    value={[userSettings.preferences.security.sessionTimeout]}
                    onValueChange={(value) => {
                      setUserSettings(prev => ({
                        ...prev,
                        preferences: {
                          ...prev.preferences,
                          security: { ...prev.preferences.security, sessionTimeout: value[0] }
                        }
                      }))
                      setUnsavedChanges(true)
                    }}
                    max={24}
                    min={1}
                    step={1}
                  />
                  <div className="text-sm text-muted-foreground">
                    {userSettings.preferences.security.sessionTimeout} hours
                  </div>
                </div>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="require2FA">Require 2FA</Label>
                    <Switch
                      id="require2FA"
                      checked={userSettings.preferences.security.require2FA}
                      onCheckedChange={(checked) => {
                        setUserSettings(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            security: { ...prev.preferences.security, require2FA: checked }
                          }
                        }))
                        setUnsavedChanges(true)
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="allowRememberMe">Allow Remember Me</Label>
                    <Switch
                      id="allowRememberMe"
                      checked={userSettings.preferences.security.allowRememberMe}
                      onCheckedChange={(checked) => {
                        setUserSettings(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            security: { ...prev.preferences.security, allowRememberMe: checked }
                          }
                        }))
                        setUnsavedChanges(true)
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="logSecurityEvents">Log Security Events</Label>
                    <Switch
                      id="logSecurityEvents"
                      checked={userSettings.preferences.security.logSecurityEvents}
                      onCheckedChange={(checked) => {
                        setUserSettings(prev => ({
                          ...prev,
                          preferences: {
                            ...prev.preferences,
                            security: { ...prev.preferences.security, logSecurityEvents: checked }
                          }
                        }))
                        setUnsavedChanges(true)
                      }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Notifications */}
        <TabsContent value="notifications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Bell className="h-5 w-5" />
                Notification Preferences
              </CardTitle>
              <CardDescription>
                Configure how you receive notifications
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-4">
                  <h4 className="font-semibold">Channels</h4>
                  <div className="space-y-3">
                    {Object.entries(userSettings.preferences.notifications).map(([key, enabled]) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label className="capitalize">
                          {key === 'email' && <Mail className="inline mr-2 h-4 w-4" />}
                          {key === 'browser' && <Globe className="inline mr-2 h-4 w-4" />}
                          {key === 'mobile' && <Smartphone className="inline mr-2 h-4 w-4" />}
                          {key === 'slack' && <Network className="inline mr-2 h-4 w-4" />}
                          {key === 'discord' && <Network className="inline mr-2 h-4 w-4" />}
                          {key}
                        </Label>
                        <Switch
                          checked={enabled}
                          onCheckedChange={(checked) => {
                            setUserSettings(prev => ({
                              ...prev,
                              preferences: {
                                ...prev.preferences,
                                notifications: {
                                  ...prev.preferences.notifications,
                                  [key]: checked
                                }
                              }
                            }))
                            setUnsavedChanges(true)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-4">
                  <h4 className="font-semibold">Event Types</h4>
                  <div className="space-y-3">
                    {[
                      'Vault Events',
                      'Security Alerts', 
                      'System Notifications',
                      'Audit Logs',
                      'Compliance Reports'
                    ].map((eventType) => (
                      <div key={eventType} className="flex items-center justify-between">
                        <Label>{eventType}</Label>
                        <Switch checked={true} />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* System Settings (Admin Only) */}
        {isAdmin && (
          <TabsContent value="system" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Server className="h-5 w-5" />
                    System Control
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label htmlFor="maintenanceMode">
                      <AlertTriangle className="inline mr-2 h-4 w-4 text-orange-500" />
                      Maintenance Mode
                    </Label>
                    <Switch
                      id="maintenanceMode"
                      checked={adminSettings.system.maintenanceMode}
                      onCheckedChange={(checked) => {
                        setAdminSettings(prev => ({
                          ...prev,
                          system: { ...prev.system, maintenanceMode: checked }
                        }))
                        setUnsavedChanges(true)
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="debugMode">Debug Mode</Label>
                    <Switch
                      id="debugMode"
                      checked={adminSettings.system.debugMode}
                      onCheckedChange={(checked) => {
                        setAdminSettings(prev => ({
                          ...prev,
                          system: { ...prev.system, debugMode: checked }
                        }))
                        setUnsavedChanges(true)
                      }}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Log Level</Label>
                    <Select 
                      value={adminSettings.system.logLevel}
                      onValueChange={(value: 'error' | 'warn' | 'info' | 'debug') => {
                        setAdminSettings(prev => ({
                          ...prev,
                          system: { ...prev.system, logLevel: value }
                        }))
                        setUnsavedChanges(true)
                      }}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="error">Error</SelectItem>
                        <SelectItem value="warn">Warning</SelectItem>
                        <SelectItem value="info">Info</SelectItem>
                        <SelectItem value="debug">Debug</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Session Management
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Max Concurrent Sessions</Label>
                    <Input
                      type="number"
                      value={adminSettings.system.maxSessions}
                      onChange={(e) => {
                        setAdminSettings(prev => ({
                          ...prev,
                          system: { ...prev.system, maxSessions: parseInt(e.target.value) }
                        }))
                        setUnsavedChanges(true)
                      }}
                    />
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="sessionCleanup">Auto Session Cleanup</Label>
                    <Switch
                      id="sessionCleanup"
                      checked={adminSettings.system.sessionCleanup}
                      onCheckedChange={(checked) => {
                        setAdminSettings(prev => ({
                          ...prev,
                          system: { ...prev.system, sessionCleanup: checked }
                        }))
                        setUnsavedChanges(true)
                      }}
                    />
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}

        {/* Admin Settings */}
        {isAdmin && (
          <TabsContent value="admin" className="space-y-4">
            <div className="grid gap-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5" />
                    Security Policies
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Min Password Length</Label>
                      <Input
                        type="number"
                        value={adminSettings.security.passwordPolicy.minLength}
                        onChange={(e) => {
                          setAdminSettings(prev => ({
                            ...prev,
                            security: {
                              ...prev.security,
                              passwordPolicy: {
                                ...prev.security.passwordPolicy,
                                minLength: parseInt(e.target.value)
                              }
                            }
                          }))
                          setUnsavedChanges(true)
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Password Max Age (days)</Label>
                      <Input
                        type="number"
                        value={adminSettings.security.passwordPolicy.maxAge}
                        onChange={(e) => {
                          setAdminSettings(prev => ({
                            ...prev,
                            security: {
                              ...prev.security,
                              passwordPolicy: {
                                ...prev.security.passwordPolicy,
                                maxAge: parseInt(e.target.value)
                              }
                            }
                          }))
                          setUnsavedChanges(true)
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Rate Limit (req/min)</Label>
                      <Input
                        type="number"
                        value={adminSettings.security.rateLimiting.requestsPerMinute}
                        onChange={(e) => {
                          setAdminSettings(prev => ({
                            ...prev,
                            security: {
                              ...prev.security,
                              rateLimiting: {
                                ...prev.security.rateLimiting,
                                requestsPerMinute: parseInt(e.target.value)
                              }
                            }
                          }))
                          setUnsavedChanges(true)
                        }}
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    {[
                      { key: 'requireUppercase', label: 'Require Uppercase' },
                      { key: 'requireNumbers', label: 'Require Numbers' },
                      { key: 'requireSymbols', label: 'Require Symbols' }
                    ].map(({ key, label }) => (
                      <div key={key} className="flex items-center justify-between">
                        <Label>{label}</Label>
                        <Switch
                          checked={adminSettings.security.passwordPolicy[key as keyof typeof adminSettings.security.passwordPolicy] as boolean}
                          onCheckedChange={(checked) => {
                            setAdminSettings(prev => ({
                              ...prev,
                              security: {
                                ...prev.security,
                                passwordPolicy: {
                                  ...prev.security.passwordPolicy,
                                  [key]: checked
                                }
                              }
                            }))
                            setUnsavedChanges(true)
                          }}
                        />
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5" />
                    Vault Configuration
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label>Default TTL (seconds)</Label>
                      <Input
                        type="number"
                        value={adminSettings.vault.defaultTTL}
                        onChange={(e) => {
                          setAdminSettings(prev => ({
                            ...prev,
                            vault: { ...prev.vault, defaultTTL: parseInt(e.target.value) }
                          }))
                          setUnsavedChanges(true)
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Max Secrets</Label>
                      <Input
                        type="number"
                        value={adminSettings.vault.maxSecrets}
                        onChange={(e) => {
                          setAdminSettings(prev => ({
                            ...prev,
                            vault: { ...prev.vault, maxSecrets: parseInt(e.target.value) }
                          }))
                          setUnsavedChanges(true)
                        }}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Audit Retention (days)</Label>
                      <Input
                        type="number"
                        value={adminSettings.vault.auditRetention}
                        onChange={(e) => {
                          setAdminSettings(prev => ({
                            ...prev,
                            vault: { ...prev.vault, auditRetention: parseInt(e.target.value) }
                          }))
                          setUnsavedChanges(true)
                        }}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between">
                    <Label htmlFor="autoCleanup">Auto Cleanup Expired Secrets</Label>
                    <Switch
                      id="autoCleanup"
                      checked={adminSettings.vault.autoCleanup}
                      onCheckedChange={(checked) => {
                        setAdminSettings(prev => ({
                          ...prev,
                          vault: { ...prev.vault, autoCleanup: checked }
                        }))
                        setUnsavedChanges(true)
                      }}
                    />
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Network className="h-5 w-5" />
                    Integrations
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold mb-2">SOPS Configuration</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex items-center justify-between">
                          <Label>Enabled</Label>
                          <Switch
                            checked={adminSettings.integrations.sops.enabled}
                            onCheckedChange={(checked) => {
                              setAdminSettings(prev => ({
                                ...prev,
                                integrations: {
                                  ...prev.integrations,
                                  sops: { ...prev.integrations.sops, enabled: checked }
                                }
                              }))
                              setUnsavedChanges(true)
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Key Provider</Label>
                          <Select value={adminSettings.integrations.sops.keyProvider}>
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="age">Age</SelectItem>
                              <SelectItem value="pgp">PGP</SelectItem>
                              <SelectItem value="aws-kms">AWS KMS</SelectItem>
                              <SelectItem value="gcp-kms">GCP KMS</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    </div>

                    <Separator />

                    <div>
                      <h4 className="font-semibold mb-2">MCP Integration</h4>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Endpoint URL</Label>
                          <Input
                            value={adminSettings.integrations.mcp.endpoint}
                            onChange={(e) => {
                              setAdminSettings(prev => ({
                                ...prev,
                                integrations: {
                                  ...prev.integrations,
                                  mcp: { ...prev.integrations.mcp, endpoint: e.target.value }
                                }
                              }))
                              setUnsavedChanges(true)
                            }}
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Timeout (seconds)</Label>
                          <Input
                            type="number"
                            value={adminSettings.integrations.mcp.timeout}
                            onChange={(e) => {
                              setAdminSettings(prev => ({
                                ...prev,
                                integrations: {
                                  ...prev.integrations,
                                  mcp: { ...prev.integrations.mcp, timeout: parseInt(e.target.value) }
                                }
                              }))
                              setUnsavedChanges(true)
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
} 