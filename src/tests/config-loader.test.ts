import { ConfigLoader } from '../config/loader';
import { BaseError } from '../utils/error-types';
import { writeFile, mkdir, rm } from 'fs/promises';
import { join } from 'path';

describe('ConfigLoader', () => {
  const testConfigDir = join(__dirname, 'test-configs');
  const validConfigPath = join(testConfigDir, 'valid-config.yaml');
  const invalidConfigPath = join(testConfigDir, 'invalid-config.yaml');

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
  - source: "/test/source"
    destination: "/test/dest"
    strategy: "realtime"
    priority: 2
security:
  encryptionEnabled: true
  quantumSafe: false
  accessControl:
    enabled: true
    defaultPolicy: "deny"
    rules: []
monitoring:
  enabled: true
  interval: 5000
ml:
  enabled: true
  updateInterval: 3600000
  thresholds:
    confidence: 0.7
    errorRate: 0.1
`;

    const invalidConfig = `
version: "1.0.0"
projectId: "invalid-uuid"
syncStrategy: "invalid"
paths:
  - source: "/test/source"
    priority: 10
`;

    await writeFile(validConfigPath, validConfig);
    await writeFile(invalidConfigPath, invalidConfig);
  });

  describe('load', () => {
    it('should load and validate a correct configuration', async () => {
      const loader = new ConfigLoader(validConfigPath);
      const config = await loader.load();

      expect(config).toHaveProperty('version', '1.0.0');
      expect(config).toHaveProperty('projectId');
      expect(config).toHaveProperty('syncStrategy', 'adaptive');
      expect(config.paths).toHaveLength(1);
      expect(config.paths[0]).toHaveProperty('source', '/test/source');
      expect(config.security.encryptionEnabled).toBe(true);
      expect(config.monitoring.enabled).toBe(true);
      expect(config.ml.enabled).toBe(true);
    });

    it('should throw on invalid configuration format', async () => {
      const loader = new ConfigLoader(invalidConfigPath);
      await expect(loader.load()).rejects.toThrow(BaseError);
    });

    it('should throw on non-existent file', async () => {
      const loader = new ConfigLoader('/non/existent/path.yaml');
      await expect(loader.load()).rejects.toThrow(BaseError);
    });
  });

  describe('validate', () => {
    it('should validate correct configuration object', async () => {
      const loader = new ConfigLoader(validConfigPath);
      const validConfig = {
        version: '1.0.0',
        projectId: '550e8400-e29b-41d4-a716-446655440000',
        syncStrategy: 'adaptive',
        paths: [{
          source: '/test/source',
          destination: '/test/dest',
          strategy: 'realtime',
          priority: 2
        }],
        security: {
          encryptionEnabled: true,
          quantumSafe: false,
          accessControl: {
            enabled: true,
            defaultPolicy: 'deny',
            rules: []
          }
        },
        monitoring: {
          enabled: true,
          interval: 5000
        },
        ml: {
          enabled: true,
          updateInterval: 3600000,
          thresholds: {
            confidence: 0.7,
            errorRate: 0.1
          }
        }
      };

      const config = await loader.validate(validConfig);
      expect(config).toHaveProperty('version', '1.0.0');
      expect(config).toHaveProperty('projectId');
      expect(config.paths).toHaveLength(1);
    });

    it('should throw on invalid configuration object', async () => {
      const loader = new ConfigLoader(validConfigPath);
      const invalidConfig = {
        version: '1.0.0',
        projectId: 'invalid-uuid',
        syncStrategy: 'invalid'
      };

      await expect(loader.validate(invalidConfig)).rejects.toThrow(BaseError);
    });
  });
}); 