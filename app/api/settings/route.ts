import { NextRequest, NextResponse } from 'next/server';
import { createLogger } from '../../../src/utils/logger';

const logger = createLogger('SettingsAPI');

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

// Mock data storage (in production, this would be a database)
let mockUserSettings: UserSettings = {
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
}

let mockAdminSettings: AdminSettings = {
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
}

// GET /api/settings - Get user and admin settings
export async function GET(request: NextRequest) {
  try {
    logger.info('Fetching settings');

    const settings = {
      userSettings: mockUserSettings,
      adminSettings: mockAdminSettings,
      isAdmin: true // Mock admin status
    };

    logger.info('Settings fetched successfully');

    return NextResponse.json({
      success: true,
      data: settings
    });

  } catch (error) {
    logger.error('Failed to fetch settings', { error });
    return NextResponse.json(
      { success: false, error: 'Failed to fetch settings' },
      { status: 500 }
    );
  }
}

// PUT /api/settings - Update settings
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    logger.info('Updating settings', { settingsKeys: Object.keys(body) });

    // Update user settings
    if (body.userSettings) {
      mockUserSettings = { ...mockUserSettings, ...body.userSettings };
      logger.info('User settings updated');
    }

    // Update admin settings (only if user is admin)
    if (body.adminSettings && body.isAdmin) {
      mockAdminSettings = { ...mockAdminSettings, ...body.adminSettings };
      logger.info('Admin settings updated');
    }

    logger.info('Settings update completed successfully');

    return NextResponse.json({
      success: true,
      message: 'Settings updated successfully',
      data: {
        userSettings: mockUserSettings,
        adminSettings: mockAdminSettings
      }
    });

  } catch (error) {
    logger.error('Failed to update settings', { error });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to update settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

// POST /api/settings/reset - Reset settings to defaults
export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const resetType = searchParams.get('type') || 'user';

    logger.info('Resetting settings', { resetType });

    if (resetType === 'user' || resetType === 'all') {
      // Reset user settings to defaults
      mockUserSettings = {
        profile: {
          displayName: 'Alex Chen',
          email: 'alex.chen@company.com',
          avatar: '',
          timezone: 'America/New_York',
          language: 'en-US'
        },
        preferences: {
          theme: 'system',
          notifications: {
            email: true,
            browser: true,
            mobile: false,
            slack: false,
            discord: false
          },
          dashboard: {
            autoRefresh: true,
            refreshInterval: 60,
            compactMode: false,
            showAdvanced: false
          },
          security: {
            sessionTimeout: 4,
            require2FA: false,
            allowRememberMe: true,
            logSecurityEvents: true
          }
        }
      };
    }

    if (resetType === 'admin' || resetType === 'all') {
      // Reset admin settings to defaults (only if user is admin)
      mockAdminSettings = {
        system: {
          maintenanceMode: false,
          debugMode: false,
          logLevel: 'warn',
          maxSessions: 50,
          sessionCleanup: true
        },
        security: {
          passwordPolicy: {
            minLength: 8,
            requireUppercase: false,
            requireNumbers: false,
            requireSymbols: false,
            maxAge: 180
          },
          rateLimiting: {
            enabled: false,
            requestsPerMinute: 120,
            banDuration: 5
          },
          encryption: {
            algorithm: 'AES-256-GCM',
            keyRotationInterval: 90,
            autoBackup: false
          }
        },
        vault: {
          defaultTTL: 7200,
          maxSecrets: 1000,
          auditRetention: 90,
          autoCleanup: false,
          compression: false
        },
        integrations: {
          sops: {
            enabled: false,
            keyProvider: 'age',
            encryptionKey: ''
          },
          mcp: {
            enabled: false,
            endpoint: '',
            timeout: 30
          },
          cicd: {
            webhook: '',
            autoSync: false,
            notifications: false
          }
        }
      };
    }

    logger.info('Settings reset completed successfully', { resetType });

    return NextResponse.json({
      success: true,
      message: `${resetType} settings reset to defaults`,
      data: {
        userSettings: mockUserSettings,
        adminSettings: mockAdminSettings
      }
    });

  } catch (error) {
    logger.error('Failed to reset settings', { error });
    return NextResponse.json(
      { 
        success: false, 
        error: 'Failed to reset settings',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
} 