import { resolve } from 'path';
import * as fs from 'fs/promises';
import { SyncEngine } from '../sync/SyncEngine';
import { FileWatcher } from '../sync/FileWatcher';
import { MLModel } from '../ml/MLModel';
import { AgentBridge } from '../agents/AgentBridge';
import { SyncRegistry, RecoveryPlanSpec } from '../sync/interfaces';

const mockSyncConfig: SyncRegistry = {
  projectId: 'test-project',
  syncedWith: ['project-a', 'project-b'],
  watch: ['.'],
  syncMode: {
    default: 'real-time',
    'src/config': 'real-time',
    'src/assets': 'batch'
  },
  rules: {
    conflictResolution: 'ml-driven',
    backup: true,
    integrityCheck: 'hash'
  }
};

const mockRecoveryPlan: RecoveryPlanSpec = {
  phases: [
    {
      id: 'check',
      actions: ['fs_check', 'link_check']
    },
    {
      id: 'repair',
      actions: ['intelligent_repair']
    }
  ]
};

describe('Sync System', () => {
  let syncEngine: SyncEngine;
  let testDir: string;

  beforeEach(async () => {
    // Create test directory
    testDir = resolve(__dirname, 'test-workspace');
    await fs.mkdir(testDir, { recursive: true });
    
    // Initialize sync engine
    syncEngine = new SyncEngine(mockSyncConfig, mockRecoveryPlan);
    await syncEngine.initialize();
  });

  afterEach(async () => {
    // Cleanup
    await syncEngine.shutdown();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('FileWatcher', () => {
    it('should detect file changes and calculate correct hash', async () => {
      const watcher = new FileWatcher();
      const testFile = resolve(testDir, 'test.txt');
      
      // Setup watcher
      await watcher.watchPath(testDir);
      
      // Create test file
      await fs.writeFile(testFile, 'initial content');
      
      // Wait for event
      const event = await new Promise<any>((resolve) => {
        watcher.once('file_event', resolve);
      });
      
      expect(event.type).toBe('add');
      expect(event.path).toBe(testFile);
      expect(event.hash).toBeDefined();
      
      await watcher.unwatchAll();
    });
  });

  describe('MLModel', () => {
    it('should predict sync policy based on path patterns', async () => {
      const mlModel = new MLModel({
        modelType: 'hybrid',
        features: ['sync_patterns'],
        updateInterval: '1h'
      });
      
      const policy = await mlModel.getSyncPolicy('src/config/settings.yaml');
      
      expect(policy.mode).toBeDefined();
      expect(policy.priority).toBeDefined();
      expect(policy.agentInfluence).toBeDefined();
    });
  });

  describe('AgentBridge', () => {
    it('should provide hints based on path patterns', async () => {
      const agentBridge = new AgentBridge({
        syncEnabled: true,
        notificationsEnabled: true
      });
      
      const hints = await agentBridge.getHints('src/config/secrets.yaml');
      
      expect(hints).toBeInstanceOf(Array);
      expect(hints.length).toBeGreaterThan(0);
      expect(hints[0]).toHaveProperty('agent');
      expect(hints[0]).toHaveProperty('weight');
    });
  });

  describe('SyncEngine Integration', () => {
    it('should handle file events and trigger appropriate sync mode', async () => {
      // Create test file
      const testFile = resolve(testDir, 'src/config/test.yaml');
      await fs.mkdir(resolve(testDir, 'src/config'), { recursive: true });
      await fs.writeFile(testFile, 'test: value');
      
      // Wait for sync event
      const syncPromise = new Promise((resolve) => {
        syncEngine.once('sync_complete', resolve);
      });
      
      // Modify file
      await fs.writeFile(testFile, 'test: updated');
      
      // Wait for sync to complete
      await syncPromise;
      
      // Verify metrics were recorded
      const metrics = await syncEngine.getMetrics();
      expect(metrics.syncs).toBeDefined();
      expect(metrics.syncs.length).toBeGreaterThan(0);
    });

    it('should handle sync failures and execute recovery plan', async () => {
      // Mock a sync failure
      const errorPromise = new Promise((resolve) => {
        syncEngine.once('critical_failure', resolve);
      });
      
      // Trigger invalid operation
      await fs.rm(resolve(testDir, 'nonexistent'), { recursive: true });
      
      // Wait for error handling
      const error = await errorPromise;
      expect(error).toBeDefined();
      
      // Verify recovery was attempted
      const metrics = await syncEngine.getMetrics();
      expect(metrics.recoveries).toBeDefined();
      expect(metrics.recoveries.length).toBeGreaterThan(0);
    });
  });
}); 