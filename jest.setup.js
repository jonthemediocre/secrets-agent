// Jest setup for web-first architecture
require('@testing-library/jest-dom');

// Mock TextEncoder/TextDecoder for Node.js environment
global.TextEncoder = require('util').TextEncoder;
global.TextDecoder = require('util').TextDecoder;

// Mock fetch for API tests
global.fetch = jest.fn();

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.localStorage = localStorageMock;

// Mock sessionStorage
const sessionStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
};
global.sessionStorage = sessionStorageMock;

// Mock window.location
delete window.location;
window.location = {
  href: 'http://localhost:3000',
  origin: 'http://localhost:3000',
  protocol: 'http:',
  host: 'localhost:3000',
  hostname: 'localhost',
  port: '3000',
  pathname: '/',
  search: '',
  hash: '',
  assign: jest.fn(),
  replace: jest.fn(),
  reload: jest.fn(),
};

// Mock fs/promises for VaultAgent tests
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn(),
  stat: jest.fn(),
}));

// Mock fs for synchronous operations
jest.mock('fs', () => ({
  existsSync: jest.fn(),
  readFileSync: jest.fn(),
  writeFileSync: jest.fn(),
  mkdirSync: jest.fn(),
  copyFileSync: jest.fn(),
  renameSync: jest.fn(),
  readdirSync: jest.fn(),
  unlinkSync: jest.fn(),
}));

// Mock yaml
jest.mock('yaml', () => ({
  parse: jest.fn(),
  stringify: jest.fn(),
}));

// Mock crypto for secure operations
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('mock-random-bytes')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash'),
  })),
}));

// Mock logger to prevent console output during tests
jest.mock('./src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Mock SOPS integration
jest.mock('./vault/SOPSIntegration', () => ({
  SOPSIntegration: jest.fn().mockImplementation(() => ({
    encrypt: jest.fn().mockResolvedValue(undefined),
    decrypt: jest.fn().mockResolvedValue('{"version":1,"metadata":{"created":1234567890,"lastUpdated":1234567890},"projects":[],"globalTags":[]}'),
    isEncrypted: jest.fn().mockResolvedValue(false),
  })),
}));

// Mock EnvFileParser
jest.mock('./src/utils/EnvFileParser', () => ({
  parseEnvFile: jest.fn().mockImplementation((content) => {
    if (!content) return {};
    const lines = content.split('\n');
    const result = {};
    lines.forEach(line => {
      const trimmed = line.trim();
      if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
        const [key, ...valueParts] = trimmed.split('=');
        const value = valueParts.join('=').replace(/^["']|["']$/g, '');
        result[key.replace(/^export\s+/, '')] = value;
      }
    });
    return result;
  }),
  serializeEnvFile: jest.fn().mockImplementation((data) => {
    return Object.entries(data || {})
      .map(([key, value]) => `${key}=${value}`)
      .join('\n');
  }),
}));

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  warn: jest.fn(),
  error: jest.fn(),
};

// Mock environment variables
process.env.NODE_ENV = 'test'; 