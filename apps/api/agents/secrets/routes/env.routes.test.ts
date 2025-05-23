import request from 'supertest';
import express, { Express } from 'express';
// envRouter import is deferred until after jest.mock setup

// This will capture the instance of the mocked VaultAgent used by the router
let capturedMockVaultAgentInstance: {
  loadVault: jest.Mock;
  importEnvToVault: jest.Mock;
  exportEnvFromVault: jest.Mock;
  saveVault: jest.Mock;
} | undefined; // Initialize as undefined, set by the mock

jest.mock('~/vault/VaultAgent', () => {
  return {
    VaultAgent: jest.fn().mockImplementation(() => {
      // Create the mock methods for this specific instance
      const instanceMocks = {
        loadVault: jest.fn(),
        importEnvToVault: jest.fn(),
        exportEnvFromVault: jest.fn(),
        saveVault: jest.fn(),
      };
      // Capture the first instance created (which will be the one used by env.routes.ts)
      // as env.routes.ts instantiates VaultAgent at the module level.
      if (!capturedMockVaultAgentInstance) {
        capturedMockVaultAgentInstance = instanceMocks;
      }
      return instanceMocks;
    }),
  };
});

// Now import the router, AFTER the mock is established and VaultAgent is mocked.
import envRouter from './env.routes';

let app: Express;

beforeEach(() => {
  // Reset the captured instance's mocks
  if (capturedMockVaultAgentInstance) {
    capturedMockVaultAgentInstance.loadVault.mockReset();
    capturedMockVaultAgentInstance.importEnvToVault.mockReset();
    capturedMockVaultAgentInstance.exportEnvFromVault.mockReset();
    capturedMockVaultAgentInstance.saveVault.mockReset();

    // Default mock implementations
    capturedMockVaultAgentInstance.loadVault.mockResolvedValue(undefined);
    capturedMockVaultAgentInstance.saveVault.mockResolvedValue(undefined);
  } else {
    // This should not happen if env.routes.ts correctly instantiates VaultAgent upon its import
    throw new Error("capturedMockVaultAgentInstance was not set up by the mock factory. Ensure env.routes.ts instantiates VaultAgent.");
  }

  app = express();
  app.use(express.json()); 
  app.use('/api/env', envRouter); 
});

describe('POST /api/env/import', () => {
  it('should import .env content and return success', async () => {
    if (!capturedMockVaultAgentInstance) throw new Error('Test setup error: mock instance not captured');
    const mockEnvContent = 'KEY1=VALUE1\nKEY2=VALUE2';
    const mockImportResult = { imported: ['KEY1', 'KEY2'], skipped: [], errors: [] };
    capturedMockVaultAgentInstance.importEnvToVault.mockReturnValue(mockImportResult);

    const response = await request(app)
      .post('/api/env/import')
      .send({ envContent: mockEnvContent, options: { project: 'testProject' } });

    expect(response.status).toBe(200);
    expect(response.body).toEqual({ success: true, ...mockImportResult });
    expect(capturedMockVaultAgentInstance.loadVault).toHaveBeenCalledTimes(1);
    expect(capturedMockVaultAgentInstance.importEnvToVault).toHaveBeenCalledWith(mockEnvContent, { project: 'testProject' });
    expect(capturedMockVaultAgentInstance.saveVault).toHaveBeenCalledTimes(1);
  });

  it('should return 400 if envContent is missing', async () => {
    if (!capturedMockVaultAgentInstance) throw new Error('Test setup error: mock instance not captured');
    const response = await request(app)
      .post('/api/env/import')
      .send({ options: { project: 'testProject' } });

    expect(response.status).toBe(400);
    expect(response.body).toEqual({ error: 'envContent (string) is required' });
    // ensureVaultLoaded middleware runs before the body validation in the route handler.
    // So, loadVault WILL be called.
    expect(capturedMockVaultAgentInstance.loadVault).toHaveBeenCalledTimes(1);
    // However, the import and save operations should NOT have been attempted.
    expect(capturedMockVaultAgentInstance.importEnvToVault).not.toHaveBeenCalled();
    expect(capturedMockVaultAgentInstance.saveVault).not.toHaveBeenCalled(); 
  });

  it('should return 500 if vault fails to load', async () => {
    if (!capturedMockVaultAgentInstance) throw new Error('Test setup error: mock instance not captured');
    capturedMockVaultAgentInstance.loadVault.mockRejectedValue(new Error('Vault load failed'));
    const mockEnvContent = 'KEY1=VALUE1';

    const response = await request(app)
      .post('/api/env/import')
      .send({ envContent: mockEnvContent });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to load vault', details: 'Vault load failed' });
  });

  it('should return 500 if importEnvToVault fails', async () => {
    if (!capturedMockVaultAgentInstance) throw new Error('Test setup error: mock instance not captured');
    capturedMockVaultAgentInstance.importEnvToVault.mockImplementation(() => {
      throw new Error('Internal import error');
    });
    const mockEnvContent = 'KEY1=VALUE1';

    const response = await request(app)
      .post('/api/env/import')
      .send({ envContent: mockEnvContent });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Import failed', details: 'Internal import error' });
    expect(capturedMockVaultAgentInstance.saveVault).not.toHaveBeenCalled(); 
  });

  it('should return 500 if saveVault fails after import', async () => {
    if (!capturedMockVaultAgentInstance) throw new Error('Test setup error: mock instance not captured');
    const mockEnvContent = 'KEY1=VALUE1';
    capturedMockVaultAgentInstance.importEnvToVault.mockReturnValue({ imported: ['KEY1'], skipped: [], errors: [] });
    capturedMockVaultAgentInstance.saveVault.mockRejectedValue(new Error('Disk full'));

    const response = await request(app)
      .post('/api/env/import')
      .send({ envContent: mockEnvContent });

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Import failed', details: 'Disk full' });
  });
});

describe('GET /api/env/export', () => {
  it('should export .env content successfully', async () => {
    if (!capturedMockVaultAgentInstance) throw new Error('Test setup error: mock instance not captured');
    const mockExportedString = 'KEY_A=VALUE_A\nKEY_B=VALUE_B';
    capturedMockVaultAgentInstance.exportEnvFromVault.mockReturnValue(mockExportedString);

    const response = await request(app).get('/api/env/export');

    expect(response.status).toBe(200);
    expect(response.headers['content-type']).toEqual('text/plain; charset=utf-8');
    expect(response.text).toBe(mockExportedString);
    expect(capturedMockVaultAgentInstance.loadVault).toHaveBeenCalledTimes(1);
    expect(capturedMockVaultAgentInstance.exportEnvFromVault).toHaveBeenCalledWith({ project: undefined, category: undefined });
  });

  it('should pass query parameters to exportEnvFromVault', async () => {
    if (!capturedMockVaultAgentInstance) throw new Error('Test setup error: mock instance not captured');
    const mockExportedString = 'CUSTOM_KEY=CUSTOM_VALUE';
    capturedMockVaultAgentInstance.exportEnvFromVault.mockReturnValue(mockExportedString);

    const response = await request(app)
      .get('/api/env/export?project=myProj&category=myCat');

    expect(response.status).toBe(200);
    expect(response.text).toBe(mockExportedString);
    expect(capturedMockVaultAgentInstance.exportEnvFromVault).toHaveBeenCalledWith({ project: 'myProj', category: 'myCat' });
  });

  it('should return 500 if vault fails to load on export', async () => {
    if (!capturedMockVaultAgentInstance) throw new Error('Test setup error: mock instance not captured');
    capturedMockVaultAgentInstance.loadVault.mockRejectedValue(new Error('Vault load failed for export'));

    const response = await request(app).get('/api/env/export');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Failed to load vault', details: 'Vault load failed for export' });
  });

  it('should return 500 if exportEnvFromVault fails', async () => {
    if (!capturedMockVaultAgentInstance) throw new Error('Test setup error: mock instance not captured');
    capturedMockVaultAgentInstance.exportEnvFromVault.mockImplementation(() => {
      throw new Error('Internal export error');
    });

    const response = await request(app).get('/api/env/export');

    expect(response.status).toBe(500);
    expect(response.body).toEqual({ error: 'Export failed', details: 'Internal export error' });
  });
}); 