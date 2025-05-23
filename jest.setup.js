import mockAsyncStorage from '@react-native-async-storage/async-storage/jest/async-storage-mock';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () => mockAsyncStorage);

// Mock expo-secure-store
jest.mock('expo-secure-store', () => ({
  getItemAsync: jest.fn(() => Promise.resolve(null)), // Default to no stored session
  setItemAsync: jest.fn(() => Promise.resolve()),
  deleteItemAsync: jest.fn(() => Promise.resolve()),
}));

// Mock expo-web-browser
jest.mock('expo-web-browser', () => ({
  openAuthSessionAsync: jest.fn(),
  dismissAuthSession: jest.fn(),
}));

// Mock expo-auth-session
jest.mock('expo-auth-session', () => ({
  makeRedirectUri: jest.fn((options) => {
    if (options && options.useProxy) {
      return 'exp://127.0.0.1:8081/--/expo-auth-session';
    }
    return 'http://localhost:8081'; // Or your specific web redirect URI for testing
  }),
  fetchDiscoveryAsync: jest.fn(() => Promise.resolve({
    authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
    tokenEndpoint: 'https://oauth2.googleapis.com/token',
    revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
    userInfoEndpoint: 'https://www.googleapis.com/oauth2/v3/userinfo',
  })),
  exchangeCodeAsync: jest.fn(),
  refreshAsync: jest.fn(),
  revokeAsync: jest.fn(),
  useAuthRequest: jest.fn(() => [null, { type: 'success', params: { code: 'mock-auth-code' } }, jest.fn(() => Promise.resolve())]),
  generatePKCEParameters: jest.fn(() => ({ codeVerifier: 'mock-code-verifier', codeChallenge: 'mock-code-challenge'})),
}));

// If you use global.fetch, you might need to mock it for Node environment if not already handled by jest-expo
// global.fetch = jest.fn();

// Mock fs/promises for VaultAgent tests
jest.mock('fs/promises', () => ({
  readFile: jest.fn(),
  writeFile: jest.fn(),
  mkdir: jest.fn(),
  access: jest.fn(),
}));

// Mock js-yaml
jest.mock('js-yaml', () => ({
  load: jest.fn(),
  dump: jest.fn(),
}));

// Mock crypto for secure operations
jest.mock('crypto', () => ({
  randomBytes: jest.fn(() => Buffer.from('mock-random-bytes')),
  createHash: jest.fn(() => ({
    update: jest.fn().mockReturnThis(),
    digest: jest.fn(() => 'mock-hash'),
  })),
}));

// Mock node-vault
jest.mock('node-vault', () => {
  return jest.fn(() => ({
    read: jest.fn(),
    write: jest.fn(),
    delete: jest.fn(),
    list: jest.fn(),
  }));
});

// Mock logger to prevent console output during tests
jest.mock('./src/utils/logger', () => ({
  createLogger: jest.fn(() => ({
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    debug: jest.fn(),
  })),
}));

// Setup complete - mocks applied for testing environment 