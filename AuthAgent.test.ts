// AuthAgent.test.ts - Test suite for the AuthAgent with mocked Expo dependencies
import AuthAgent from './AuthAgent';

// Mock Expo modules for testing
const mockSecureStore = {
  setItemAsync: jest.fn().mockResolvedValue(undefined),
  getItemAsync: jest.fn().mockResolvedValue(null),
  deleteItemAsync: jest.fn().mockResolvedValue(undefined)
};

const mockAuthSession = {
  AuthSessionResult: {} as any,
  makeRedirectUri: jest.fn().mockReturnValue('mock://redirect'),
  startAsync: jest.fn().mockResolvedValue({ type: 'success', params: {} }),
  AuthRequest: jest.fn().mockImplementation(() => ({
    promptAsync: jest.fn().mockResolvedValue({ type: 'success', params: {} })
  }))
};

// Mock the modules
jest.mock('expo-secure-store', () => mockSecureStore);
jest.mock('expo-auth-session', () => mockAuthSession);

const sharedPromptAsyncMock = jest.fn();
jest.mock('expo-auth-session', () => {
  const originalModule = jest.requireActual('expo-auth-session');
  return {
    ...originalModule,
    makeRedirectUri: jest.fn(() => 'https://redirect-uri'),
    fetchDiscoveryAsync: jest.fn(() =>
      Promise.resolve({
        authorizationEndpoint: 'https://auth-endpoint',
        tokenEndpoint: 'https://token-endpoint',
        revocationEndpoint: 'https://revoke-endpoint',
        userInfoEndpoint: 'https://user-info-endpoint',
      })
    ),
    AuthRequest: jest.fn(() => ({
      promptAsync: sharedPromptAsyncMock,
      codeVerifier: 'mockVerifier',
      url: 'https://mock-auth.com',
    })),
    exchangeCodeAsync: jest.fn(), // Mocked here, configured in tests
    refreshAsync: jest.fn(),    // Mocked here, configured in tests
    revokeAsync: jest.fn(),     // Mocked here, configured in tests
  };
});

const mockConfig = {
  clientId: 'test-client-id',
  scopes: ['profile', 'email'],
};

const mockUserProfileData = {
  id: '123',
  name: 'John Doe',
  email: 'john@example.com',
  picture: 'https://example.com/avatar.png',
};

beforeEach(() => {
  jest.clearAllMocks();
  sharedPromptAsyncMock.mockReset();
  (mockSecureStore.getItemAsync as jest.Mock).mockResolvedValue(null);
  (mockSecureStore.setItemAsync as jest.Mock).mockResolvedValue(undefined);
  (mockSecureStore.deleteItemAsync as jest.Mock).mockResolvedValue(undefined);
  (global.fetch as jest.Mock) = jest.fn().mockResolvedValue({
    ok: true,
    json: async () => mockUserProfileData,
  });
});

describe('AuthAgent sign-in flows', () => {
  it('should succeed on Expo sign-in', async () => {
    sharedPromptAsyncMock.mockResolvedValue({
      type: 'success',
      params: { code: 'mock-code' },
    });

    (jest.requireActual('expo-auth-session').exchangeCodeAsync as jest.Mock).mockResolvedValueOnce(
      Promise.resolve({
        accessToken: 'mockAccessToken',
        refreshToken: 'mockRefreshToken',
        idToken: 'mockIdToken',
        expiresIn: 3600,
        issuedAt: 1700000000,
      })
    );

    const agent = new AuthAgent(mockConfig);
    await new Promise((r) => setTimeout(r, 0));
    const session = await agent.signInWithGoogleExpo();
    expect(session?.isAuthenticated).toBe(true);
    expect(agent.getCurrentUser()).toEqual(mockUserProfileData);
  });

  it('should handle sign-in cancel', async () => {
    sharedPromptAsyncMock.mockResolvedValue({ type: 'cancel' });
    const agent = new AuthAgent(mockConfig);
    await new Promise((r) => setTimeout(r, 0));
    const session = await agent.signInWithGoogleExpo();
    expect(session?.isAuthenticated).toBe(false);
    expect(session?.error).toBeNull();
  });

  it('should handle sign-in error response', async () => {
    sharedPromptAsyncMock.mockResolvedValue({ type: 'error', error: { description: 'invalid_request', code: 'E_TEST_ERROR' } });
    const agent = new AuthAgent(mockConfig);
    await new Promise((r) => setTimeout(r, 0));
    const session = await agent.signInWithGoogleExpo();
    expect(session?.isAuthenticated).toBe(false);
    expect(session?.error?.message).toContain('invalid_request');
  });
});

describe('AuthAgent refreshAccessToken', () => {
  it('should refresh token and fetch user profile', async () => {
    const agent = new AuthAgent(mockConfig);
    await new Promise((r) => setTimeout(r, 0));
    (agent as unknown as { session: { tokens: unknown } }).session.tokens = {
      accessToken: 'oldAccess',
      refreshToken: 'refreshToken',
      idToken: 'idToken',
      expiresIn: 3600,
      issueTime: Date.now() - 10000000, // expired
    };
    (jest.requireActual('expo-auth-session').refreshAsync as jest.Mock).mockResolvedValueOnce(
      Promise.resolve({
        accessToken: 'newAccessToken',
        refreshToken: 'newRefreshToken',
        idToken: 'newIdToken',
        expiresIn: 3600,
        issuedAt: Date.now() / 1000,
      })
    );

    const refreshed = await agent.refreshAccessToken();
    expect(refreshed).toBe(true);
    expect(agent.getSession().tokens?.accessToken).toBe('newAccessToken');
    expect(agent.getCurrentUser()?.id).toBe('123');
  });

  it('should return false if no refreshToken exists', async () => {
    const agent = new AuthAgent(mockConfig);
    await new Promise((r) => setTimeout(r, 0));
    (agent as unknown as { session: { tokens: unknown } }).session.tokens = {
      accessToken: 'oldAccess',
      refreshToken: undefined,
      idToken: 'idToken',
      expiresIn: 3600,
      issueTime: Date.now() - 10000000,
    };

    const refreshed = await agent.refreshAccessToken();
    expect(refreshed).toBe(false);
  });
});

describe('AuthAgent sign-out', () => {
  it('should clear session and revoke token', async () => {
    const agent = new AuthAgent(mockConfig);
    await new Promise((r) => setTimeout(r, 0));
    (agent as unknown as { session: { tokens: unknown } }).session.tokens = {
      accessToken: 'access',
      refreshToken: 'refresh',
      idToken: 'id',
      expiresIn: 3600,
      issueTime: Date.now(),
    };
    (jest.requireActual('expo-auth-session').revokeAsync as jest.Mock).mockResolvedValueOnce(Promise.resolve());

    await agent.signOut();
    expect(agent.isAuthenticated()).toBe(false);
    expect(agent.getCurrentUser()).toBeNull();
  });
}); 