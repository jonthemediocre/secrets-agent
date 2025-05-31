import { resolve } from 'path';
import * as fs from 'fs/promises';
import { DeltaSync } from '../sync/DeltaSync';
import { SyncMetrics } from '../sync/SyncMetrics';
import { FileEvent } from '../sync/FileWatcher';

describe('DeltaSync', () => {
  let deltaSync: DeltaSync;
  let metrics: SyncMetrics;
  let testDir: string;

  beforeEach(async () => {
    testDir = resolve(__dirname, 'test-workspace');
    await fs.mkdir(testDir, { recursive: true });
    
    metrics = new SyncMetrics();
    await metrics.initialize();
    
    deltaSync = new DeltaSync(metrics, { snapshotIntervalMs: 1000 });
  });

  afterEach(async () => {
    deltaSync.shutdown();
    await fs.rm(testDir, { recursive: true, force: true });
  });

  describe('File Event Handling', () => {
    it('should detect file changes based on hash', async () => {
      const testFile = resolve(testDir, 'test.txt');
      const mockEvent: FileEvent = {
        type: 'add',
        path: testFile,
        hash: 'hash1',
        timestamp: Date.now()
      };

      // Initial add
      const result1 = await deltaSync.handleFileEvent(mockEvent);
      expect(result1).toBe(true);
      
      const state1 = deltaSync.getState(testFile);
      expect(state1).toBeDefined();
      expect(state1?.hash).toBe('hash1');
      expect(state1?.syncStatus).toBe('pending');

      // Same hash - should not trigger sync
      const result2 = await deltaSync.handleFileEvent({
        ...mockEvent,
        timestamp: Date.now()
      });
      expect(result2).toBe(false);

      // Different hash - should trigger sync
      const result3 = await deltaSync.handleFileEvent({
        ...mockEvent,
        hash: 'hash2',
        timestamp: Date.now()
      });
      expect(result3).toBe(true);
      
      const state2 = deltaSync.getState(testFile);
      expect(state2?.hash).toBe('hash2');
    });

    it('should handle file deletions', async () => {
      const testFile = resolve(testDir, 'test.txt');
      
      // First add the file
      await deltaSync.handleFileEvent({
        type: 'add',
        path: testFile,
        hash: 'hash1',
        timestamp: Date.now()
      });

      // Then delete it
      const deleteResult = await deltaSync.handleFileEvent({
        type: 'unlink',
        path: testFile,
        timestamp: Date.now()
      });

      expect(deleteResult).toBe(true);
      expect(deltaSync.getState(testFile)).toBeUndefined();
    });
  });

  describe('Sync State Management', () => {
    it('should track sync status correctly', async () => {
      const testFile = resolve(testDir, 'test.txt');
      
      // Add file
      await deltaSync.handleFileEvent({
        type: 'add',
        path: testFile,
        hash: 'hash1',
        timestamp: Date.now()
      });

      // Verify initial state
      let state = deltaSync.getState(testFile);
      expect(state?.syncStatus).toBe('pending');

      // Confirm sync
      await deltaSync.confirmSync(testFile);
      
      // Verify updated state
      state = deltaSync.getState(testFile);
      expect(state?.syncStatus).toBe('synced');
      expect(state?.lastSyncTime).toBeDefined();
    });

    it('should manage pending syncs', async () => {
      const files = ['file1.txt', 'file2.txt', 'file3.txt'].map(f => 
        resolve(testDir, f)
      );

      // Add multiple files
      for (const [index, file] of files.entries()) {
        await deltaSync.handleFileEvent({
          type: 'add',
          path: file,
          hash: `hash${index}`,
          timestamp: Date.now()
        });
      }

      // Verify pending syncs
      let pending = deltaSync.getPendingSyncs();
      expect(pending.length).toBe(3);

      // Confirm one sync
      await deltaSync.confirmSync(files[0]);
      
      // Verify updated pending count
      pending = deltaSync.getPendingSyncs();
      expect(pending.length).toBe(2);
    });
  });

  describe('Snapshot Management', () => {
    it('should save and load snapshots', async () => {
      const testFile = resolve(testDir, 'test.txt');
      
      // Add file and confirm sync
      await deltaSync.handleFileEvent({
        type: 'add',
        path: testFile,
        hash: 'hash1',
        timestamp: Date.now()
      });
      await deltaSync.confirmSync(testFile);

      // Save snapshot
      await deltaSync.saveSnapshot();

      // Clear state
      deltaSync.clearState(testFile);
      expect(deltaSync.getState(testFile)).toBeUndefined();

      // Load snapshot
      await deltaSync.loadSnapshot();
      
      // Verify state was restored
      const state = deltaSync.getState(testFile);
      expect(state).toBeDefined();
      expect(state?.hash).toBe('hash1');
      expect(state?.syncStatus).toBe('synced');
    });
  });
}); 