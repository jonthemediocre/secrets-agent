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

// Mock next/navigation
jest.mock('next/navigation', () => ({
  useRouter() {
    return {
      push: jest.fn(),
      replace: jest.fn(),
      back: jest.fn(),
      forward: jest.fn(),
      refresh: jest.fn(),
      prefetch: jest.fn(),
    }
  },
  useSearchParams() {
    return new URLSearchParams()
  },
  usePathname() {
    return '/'
  },
}))

// Mock next/image
jest.mock('next/image', () => ({
  __esModule: true,
  default: (props) => {
    // eslint-disable-next-line @next/next/no-img-element
    return <img {...props} />
  },
}))

// Mock Prisma client
jest.mock('./lib/db', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    vault: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    secret: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
  },
}))

// Global test setup
global.fetch = jest.fn()

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
})

// Mock ResizeObserver
global.ResizeObserver = jest.fn().mockImplementation(() => ({
  observe: jest.fn(),
  unobserve: jest.fn(),
  disconnect: jest.fn(),
}))

// Clean up after each test
afterEach(() => {
  jest.clearAllMocks()
}) 