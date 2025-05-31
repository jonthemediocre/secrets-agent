import { Registry } from '../sync/Registry';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';
import { BaseError } from '../utils/error-types';

describe('Registry', () => {
  const testConfigDir = join(__dirname, 'test-configs');
  const configPath = join(testConfigDir, 'registry.yaml');

  beforeAll(async () => {
    await mkdir(testConfigDir, { recursive: true });
  });

  afterAll(async () => {
    await rm(testConfigDir, { recursive: true, force: true });
  });

  beforeEach(async () => {
    const validConfig = `
version: "1.0.0"
projectId: "550e8400-e29b-41d4-a716-446655440000"
syncStrategy: "adaptive"
paths:
  - source: "/test/source1"
    destination: "/test/dest1"
    strategy: "realtime"
    priority: 2
    excludePatterns:
      - "*.tmp"
      - "*.log"
    includePatterns:
      - "*.txt"
      - "*.json"

  - source: "/test/source2"
    destination: "/test/dest2"
    strategy: "batch"
    priority: 1
    excludePatterns:
      - "node_modules/**"
    includePatterns:
      - "**/*.ts"

security:
  encryptionEnabled: true
  quantumSafe: false
  accessControl:
    enabled: true
    defaultPolicy: "deny"
    rules:
      - path: "/test/source1"
        policy: "allow"
        users: ["admin"]
        groups: ["engineering"]
      - path: "/test/source2"
        policy: "allow"
        groups: ["developers"]

monitoring:
  enabled: true
  interval: 5000
  metrics:
    - "syncLatency"
    - "errorRate"

ml:
  enabled: true
  updateInterval: 3600000
  thresholds:
    confidence: 0.7
    errorRate: 0.1
`;

    await writeFile(configPath, validConfig);
  });

  describe('initialization', () => {
    it('should initialize successfully with valid config', async () => {
      const registry = new Registry(configPath);
      await expect(registry.initialize()).resolves.not.toThrow();
    });

    it('should throw on non-existent config file', async () => {
      const registry = new Registry('/non/existent/path.yaml');
      await expect(registry.initialize()).rejects.toThrow(BaseError);
    });
  });

  describe('sync strategy', () => {
    let registry: Registry;

    beforeEach(async () => {
      registry = new Registry(configPath);
      await registry.initialize();
    });

    it('should return path-specific strategy when available', () => {
      expect(registry.getSyncStrategy('/test/source1/file.txt')).toBe('realtime');
      expect(registry.getSyncStrategy('/test/source2/file.ts')).toBe('batch');
    });

    it('should return default strategy when no path-specific strategy exists', () => {
      expect(registry.getSyncStrategy('/test/source3/file.txt')).toBe('adaptive');
    });
  });

  describe('path priority', () => {
    let registry: Registry;

    beforeEach(async () => {
      registry = new Registry(configPath);
      await registry.initialize();
    });

    it('should return path-specific priority when available', () => {
      expect(registry.getPathPriority('/test/source1/file.txt')).toBe(2);
      expect(registry.getPathPriority('/test/source2/file.ts')).toBe(1);
    });

    it('should return default priority when no path-specific priority exists', () => {
      expect(registry.getPathPriority('/test/source3/file.txt')).toBe(1);
    });
  });

  describe('path exclusion', () => {
    let registry: Registry;

    beforeEach(async () => {
      registry = new Registry(configPath);
      await registry.initialize();
    });

    it('should correctly identify excluded files', () => {
      expect(registry.isPathExcluded('/test/source1/file.tmp')).toBe(true);
      expect(registry.isPathExcluded('/test/source1/file.log')).toBe(true);
      expect(registry.isPathExcluded('/test/source2/node_modules/package/index.ts')).toBe(true);
    });

    it('should correctly identify included files', () => {
      expect(registry.isPathExcluded('/test/source1/file.txt')).toBe(false);
      expect(registry.isPathExcluded('/test/source1/config.json')).toBe(false);
      expect(registry.isPathExcluded('/test/source2/src/index.ts')).toBe(false);
    });

    it('should exclude files not matching include patterns', () => {
      expect(registry.isPathExcluded('/test/source1/file.cpp')).toBe(true);
      expect(registry.isPathExcluded('/test/source2/file.json')).toBe(true);
    });
  });

  describe('access control', () => {
    let registry: Registry;

    beforeEach(async () => {
      registry = new Registry(configPath);
      await registry.initialize();
    });

    it('should grant access based on user', () => {
      expect(registry.hasAccess('/test/source1/file.txt', 'admin', [])).toBe(true);
      expect(registry.hasAccess('/test/source1/file.txt', 'user', [])).toBe(false);
    });

    it('should grant access based on group', () => {
      expect(registry.hasAccess('/test/source1/file.txt', 'user', ['engineering'])).toBe(true);
      expect(registry.hasAccess('/test/source2/file.ts', 'user', ['developers'])).toBe(true);
      expect(registry.hasAccess('/test/source2/file.ts', 'user', ['other'])).toBe(false);
    });

    it('should use default policy for unmatched paths', () => {
      expect(registry.hasAccess('/test/source3/file.txt', 'admin', ['engineering'])).toBe(false);
    });
  });

  describe('configuration getters', () => {
    let registry: Registry;

    beforeEach(async () => {
      registry = new Registry(configPath);
      await registry.initialize();
    });

    it('should return monitoring configuration', () => {
      const monitoring = registry.getMonitoringConfig();
      expect(monitoring.enabled).toBe(true);
      expect(monitoring.interval).toBe(5000);
      expect(monitoring.metrics).toContain('syncLatency');
      expect(monitoring.metrics).toContain('errorRate');
    });

    it('should return ML configuration', () => {
      const ml = registry.getMLConfig();
      expect(ml.enabled).toBe(true);
      expect(ml.updateInterval).toBe(3600000);
      expect(ml.thresholds.confidence).toBe(0.7);
      expect(ml.thresholds.errorRate).toBe(0.1);
    });

    it('should return advanced configuration', () => {
      const advanced = registry.getAdvancedConfig();
      expect(advanced.maxConcurrentSyncs).toBe(5);
      expect(advanced.batchSize).toBe(100);
      expect(advanced.retryAttempts).toBe(3);
      expect(advanced.timeoutMs).toBe(30000);
    });
  });
}); 