// AuthAgent.ts - Standalone Authentication Logic with Expo Integration & Reactivity

// Expo imports replaced with mock system below
import { createLogger } from './src/utils/logger';
import { Platform } from 'react-native';

const logger = createLogger('AuthAgent');

// WebBrowser.maybeCompleteAuthSession(); // Call at app root if needed

// Type definitions for AuthSession results
interface AuthSessionSuccessResult {
  type: 'success';
  params: {
    code?: string;
    [key: string]: unknown;
  };
}

interface AuthSessionErrorResult {
  type: 'error';
  error?: {
    description?: string;
    code?: string;
  };
}

interface AuthSessionCancelResult {
  type: 'cancel' | 'dismiss';
}

type AuthSessionResult = AuthSessionSuccessResult | AuthSessionErrorResult | AuthSessionCancelResult;

// Error types for better error handling
interface AuthError extends Error {
  code?: string;
  originalError?: unknown;
}

export interface GoogleAuthConfig {
  clientId: string;
  iosClientId?: string;
  androidClientId?: string;
  scopes: string[];
  redirectUri?: string;
  extraParams?: Record<string, string>;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresIn: number;
  issueTime: number;
  scope?: string;
}

export interface UserProfile {
  id: string;
  email: string;
  name: string;
  picture: string;
  givenName?: string;
  familyName?: string;
}

export interface AuthSessionData {
  user: UserProfile | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean; // Added for reactivity
  error?: { message: string; code?: string } | null; // Added error field
}

// Listener type for auth state changes
export type AuthChangeListener = (session: Readonly<AuthSessionData>) => void;

// Mock Expo modules for non-Expo environments
const mockAuthSession = {
  AuthSessionResult: {} as any,
  makeRedirectUri: () => 'mock://redirect',
  startAsync: async () => ({ type: 'success', params: {} } as any),
  AuthRequest: class {
    async promptAsync() {
      return { type: 'success', params: {} } as any;
    }
  }
};

const mockSecureStore = {
  setItemAsync: async (key: string, value: string) => Promise.resolve(),
  getItemAsync: async (key: string) => Promise.resolve(null),
  deleteItemAsync: async (key: string) => Promise.resolve()
};

// Dynamic imports for Expo modules (only used in React Native)
// This is a compatibility layer to allow the code to work on both web and mobile
// without requiring Expo dependencies when running on web
let AuthSession: any;
let SecureStore: any;

try {
  AuthSession = require('expo-auth-session');
} catch {
  AuthSession = mockAuthSession;
}

try {
  SecureStore = require('expo-secure-store');
} catch {
  SecureStore = mockSecureStore;
}

class AuthAgent {
  private config: GoogleAuthConfig;
  private session: AuthSessionData;
  private discovery: any | null = null;
  private codeVerifier: string | null = null;
  private listeners: AuthChangeListener[] = []; // For reactivity

  private readonly SECURE_STORE_KEY = 'auth_session';

  constructor(config: GoogleAuthConfig) {
    this.config = config;
    this.session = {
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: true, // Start in loading state
      error: null, // Ensure error is null on init
    };
    this._initializeSession();
  }

  private async _initializeSession(): Promise<void> {
    await this._loadSessionFromSecureStore();
    this.session.isLoading = false;
    this.session.error = null; // Ensure error is null on init
    this._notifyListeners(); // Notify about initial state (loaded or not)
  }

  // --- Reactivity System ---
  public subscribe(listener: AuthChangeListener): () => void {
    this.listeners.push(listener);
    // Optionally, immediately notify the new subscriber with current state
    // listener(this.session); 
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  private _notifyListeners(): void {
    // Create a read-only copy for listeners
    const sessionSnapshot = { ...this.session };
    for (const listener of this.listeners) {
      listener(sessionSnapshot);
    }
  }
  // --- End Reactivity System ---

  private async _getDiscoveryDocument(): Promise<any> {
    if (!this.discovery) {
      this.discovery = await AuthSession.fetchDiscoveryAsync(
        'https://accounts.google.com'
      );
    }
    if (!this.discovery) {
      throw new Error('Failed to fetch Google OAuth discovery document.');
    }
    return this.discovery;
  }

  private async _saveSessionToSecureStore(): Promise<void> {
    try {
      await SecureStore.setItemAsync(this.SECURE_STORE_KEY, JSON.stringify(this.session));
      logger.info('[AuthAgent] Session saved to secure store.');
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[AuthAgent] Error saving session to secure store:', { error: errorMessage });
      // Potentially set a session error or handle this more visibly if critical
    }
  }

  private async _loadSessionFromSecureStore(): Promise<void> {
    try {
      const storedSession = await SecureStore.getItemAsync(this.SECURE_STORE_KEY);
      if (storedSession) {
        const parsedSession = JSON.parse(storedSession) as AuthSessionData;
        // Basic validation of parsed session structure
        if (parsedSession && typeof parsedSession.isAuthenticated === 'boolean') {
            this.session = {
                ...parsedSession,
                isLoading: this.session.isLoading, // Preserve current isLoading state
                error: null, // Reset error when loading session
            };
            logger.info('[AuthAgent] Session loaded from secure store.');
        } else {
            logger.warn('[AuthAgent] Stored session data is invalid. Initializing new session.');
            this.session.error = { message: "Stored session data invalid" };
        }
      } else {
        logger.info('[AuthAgent] No session found in secure store. Initializing new session.');
        // No error needed if no session is found, it's a normal state
      }
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      logger.error('[AuthAgent] Error loading session from secure store', { error: errorMessage });
      this.session.error = { message: errorMessage };
    }
  }

  private isTokenExpired(): boolean {
    if (!this.session.tokens) return true;
    const { issueTime, expiresIn } = this.session.tokens;
    const bufferSeconds = 300;
    return issueTime + (expiresIn - bufferSeconds) * 1000 < Date.now();
  }

  public async signInWithGoogleExpo(): Promise<AuthSessionData | null> {
    logger.info('[AuthAgent] Initiating Google Sign-In (Expo)...');
    this.session.isLoading = true;
    this.session.error = null; // Reset error on new attempt
    this._notifyListeners();
    try {
      const discovery = await this._getDiscoveryDocument();
      const redirectUri = AuthSession.makeRedirectUri({});
      const authRequest = new AuthSession.AuthRequest({
        clientId: this.config.clientId,
        redirectUri,
        scopes: this.config.scopes,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });
      this.codeVerifier = authRequest.codeVerifier || null;
      const result = await authRequest.promptAsync(discovery) as AuthSessionResult;

      if (result.type === 'success') {
        const code = result.params?.code;
        if (code) {
          logger.info('[AuthAgent] Google Sign-In success, received auth code.');
          await this.exchangeAuthCodeForTokens(code);
          logger.info('[AuthAgent] About to return from successful Expo sign-in', { 
            isAuthenticated: this.session.isAuthenticated 
          });
          return this.session;
        }
        logger.warn('[AuthAgent] Sign-in success type but no auth code received.');
      } else if (result.type === 'error') {
        logger.error('[AuthAgent] Google Sign-In error', { 
          error: result.error?.description || 'Google Sign-In failed',
          code: result.error?.code 
        });
        this.session.error = { message: result.error?.description || 'Google Sign-In failed.' , code: result.error?.code };
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        logger.info('[AuthAgent] Google Sign-In cancelled by user.');
      }

      this.session.isAuthenticated = false;
      this.session.isLoading = false;
      this._notifyListeners();
      return this.session;

    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred during sign-in';
      logger.error('[AuthAgent] signInWithGoogleExpo error', { error: errorMessage });
      this.session.error = { message: errorMessage };
      this.session.isAuthenticated = false;
      this.session.isLoading = false;
      this._notifyListeners();
      return this.session;
    }
  }

  public async exchangeAuthCodeForTokens(authCode: string): Promise<AuthTokens | null> {
    logger.info(`[AuthAgent] Exchanging auth code (Expo PKCE)...`);
    this.session.isLoading = true;
    this.session.error = null; // Reset error
    this._notifyListeners(); // Notify loading started

    if (!this.codeVerifier) {
      logger.error('[AuthAgent] Code verifier is missing for PKCE flow.');
      this.session.isLoading = false;
      this.session.error = { message: 'Code verifier is missing for PKCE flow.' };
      this._notifyListeners();
      throw new Error('Code verifier is missing.');
    }
    try {
      const discovery = await this._getDiscoveryDocument();
      if (!discovery.tokenEndpoint) throw new Error("Token endpoint not found");
      const redirectUri = AuthSession.makeRedirectUri({});
      const tokenResult = await AuthSession.exchangeCodeAsync(
        { code: authCode, clientId: this.config.clientId, redirectUri, extraParams: { code_verifier: this.codeVerifier } },
        discovery
      );
      const newTokens: AuthTokens = {
        accessToken: tokenResult.accessToken,
        refreshToken: tokenResult.refreshToken || undefined,
        idToken: tokenResult.idToken || undefined,
        expiresIn: tokenResult.expiresIn || 3600,
        issueTime: tokenResult.issuedAt ? tokenResult.issuedAt * 1000 : Date.now(),
        scope: tokenResult.scope,
      };
      this.session.tokens = newTokens;
      this.codeVerifier = null;
      
      const user = await this.fetchUserProfile(newTokens.accessToken);
      this.session.user = user;
      this.session.isAuthenticated = !!this.session.user;
      logger.info('[AuthAgent] exchangeAuthCodeForTokens: user object', { 
        user: JSON.stringify(this.session.user) 
      });
      logger.info('[AuthAgent] exchangeAuthCodeForTokens: isAuthenticated BEFORE save', { 
        isAuthenticated: this.session.isAuthenticated 
      });

      this.session.error = null;
      await this._saveSessionToSecureStore();
      logger.info('[AuthAgent] Tokens acquired (Expo PKCE) and user profile fetched.');
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to exchange auth code for tokens';
      logger.error('[AuthAgent] exchangeAuthCodeForTokens error', { error: errorMessage });
      this.session.isAuthenticated = false; // Clear auth on error
      this.session.tokens = null;
      this.session.user = null;
      this.session.error = { message: errorMessage };
    }
    this.session.isLoading = false;
    this._notifyListeners();
    return this.session.tokens;
  }

  public async fetchUserProfile(accessToken: string): Promise<UserProfile | null> {
    logger.info('[AuthAgent] Fetching user profile...');
    if (!this.discovery) {
      logger.error('[AuthAgent] Discovery document not available.');
      throw new Error('Discovery document not available.');
    }
    if (!this.discovery.userInfoEndpoint) {
      logger.error('[AuthAgent] User info endpoint not available.');
      throw new Error('User info endpoint not available.');
    }
    try {
      const response = await fetch(this.discovery.userInfoEndpoint, {
        headers: { Authorization: `Bearer ${accessToken}` },
      });

      if (!response.ok) {
        const errorText = await response.text();
        logger.error(`[AuthAgent] Failed to fetch user profile: ${response.status} ${errorText}`);
        throw new Error(errorText || `Failed to fetch user profile: ${response.status}`);
      }

      const rawProfile = await response.json();
      // Explicitly map to UserProfile interface
      const userProfile: UserProfile = {
        id: rawProfile.sub || rawProfile.id,
        email: rawProfile.email,
        name: rawProfile.name || `${rawProfile.given_name || ''} ${rawProfile.family_name || ''}`.trim(),
        picture: rawProfile.picture,
        // Only include these if they exist on rawProfile to keep UserProfile clean
        ...(rawProfile.given_name && { givenName: rawProfile.given_name }),
        ...(rawProfile.family_name && { familyName: rawProfile.family_name }),
      };
      // Ensure name is not empty if constructed from given/family
      if (!userProfile.name && (userProfile.givenName || userProfile.familyName)) {
        userProfile.name = `${userProfile.givenName || ''} ${userProfile.familyName || ''}`.trim();
      }
      // If still no name, provide a fallback or handle as error if name is mandatory
      if (!userProfile.name) {
        // This case should be rare if email is available
        userProfile.name = userProfile.email || 'User';
      }

      logger.info('[AuthAgent] User profile fetched successfully.');
      return userProfile;
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Network or processing error';
      logger.error('[AuthAgent] fetchUserProfile error during processing or network', { error: errorMessage });
      // Let the caller (exchangeCodeForTokens or refreshAccessToken) handle session state and errors.
      throw error;
    }
  }

  public async refreshAccessToken(): Promise<boolean> {
    logger.info('[AuthAgent] Attempting to refresh access token...');
    await this._getDiscoveryDocument();

    if (!this.session.tokens?.refreshToken) {
      logger.warn('[AuthAgent] No refresh token available. Cannot refresh.');
      this.session.error = { message: 'No refresh token available.' };
      await this._clearSessionAndNotify();
      return false;
    }
    if (!this.discovery) {
      logger.error('[AuthAgent] Discovery document not available.');
      this.session.error = { message: 'Discovery document not available.' };
      this.session.isLoading = false;
      this._notifyListeners();
      return false;
    }
    if (!this.discovery.tokenEndpoint) {
      logger.error('[AuthAgent] Token endpoint not available for refresh.');
      this.session.error = { message: 'Token endpoint not available for refresh.' };
      this.session.isLoading = false;
      this._notifyListeners();
      return false;
    }

    this.session.isLoading = true;
    this._notifyListeners();

    try {
      const refreshedTokenResponse = await AuthSession.refreshAsync(
        {
          clientId: this.config.clientId,
          refreshToken: this.session.tokens.refreshToken,
          scopes: this.config.scopes,
        },
        { tokenEndpoint: this.discovery.tokenEndpoint }
      );

      this.session.tokens = {
        accessToken: refreshedTokenResponse.accessToken,
        idToken: refreshedTokenResponse.idToken,
        refreshToken: refreshedTokenResponse.refreshToken || this.session.tokens.refreshToken,
        expiresIn: refreshedTokenResponse.expiresIn || 3600,
        issueTime: refreshedTokenResponse.issuedAt || Math.floor(Date.now() / 1000),
        scope: refreshedTokenResponse.scope,
      };

      const userProfile = await this.fetchUserProfile(this.session.tokens.accessToken);
      if (userProfile) {
        this.session.user = userProfile;
        this.session.isAuthenticated = true;
        this.session.error = null;
        await this._saveSessionToSecureStore();
        logger.info('[AuthAgent] Access token refreshed and user profile fetched.');
        this.session.isLoading = false;
        this._notifyListeners();
        return true;
      } else {
        logger.error('[AuthAgent] Failed to fetch user profile after token refresh (fetchUserProfile returned null).');
        this.session.error = { message: 'Failed to fetch user profile after token refresh.' };
        await this._clearSessionAndNotify();
        return false;
      }
    } catch (error: Error | unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to refresh access token';
      logger.error('[AuthAgent] refreshAccessToken caught error', { error: errorMessage });
      this.session.error = { message: `Failed to refresh access token: ${errorMessage}` };
      await this._clearSessionAndNotify();
      return false;
    }
  }

  public async signOut(): Promise<void> {
    logger.info('[AuthAgent] Signing out...');
    if (this.session.tokens?.accessToken) {
      try {
        await AuthSession.revokeAsync(
          { token: this.session.tokens.accessToken, clientId: this.config.clientId },
          { revocationEndpoint: 'https://oauth2.googleapis.com/revoke' }
        );
        logger.info('[AuthAgent] Access token revoked.');
      } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : 'Failed to revoke token';
        logger.error('[AuthAgent] Error revoking token:', { error: errorMessage });
        // Don't let token revocation failure stop the sign-out
        // But, we can set an error to indicate this partial failure.
        this.session.error = { message: errorMessage };
      }
    }
    // Clear local and stored session data regardless of revocation success
    await this._clearSessionAndNotify();
  }

  public getCurrentUser(): UserProfile | null { return this.session.user; }
  public getSession(): AuthSessionData {
    return { ...this.session };
  }
  public isAuthenticated(): boolean { return this.session.isAuthenticated && !this.isTokenExpired(); }

  public async signInWithGoogleWeb(): Promise<AuthSessionData | null> {
    logger.info('[AuthAgent] Initiating Google Sign-In (Web)...');
    this.session.isLoading = true;
    this.session.error = null; // Reset error
    this._notifyListeners();
    try {
      const discovery = await this._getDiscoveryDocument();
      const redirectUri = AuthSession.makeRedirectUri({});

      const authRequest = new AuthSession.AuthRequest({
        clientId: this.config.clientId,
        redirectUri,
        scopes: this.config.scopes,
        responseType: AuthSession.ResponseType.Code,
        usePKCE: true,
      });

      this.codeVerifier = authRequest.codeVerifier || null;

      const result = await authRequest.promptAsync(discovery) as AuthSessionResult;

      if (result.type === 'success') {
        const code = result.params?.code;
        if (code) {
          logger.info('[AuthAgent] Google Sign-In success (Web), received auth code.');
          await this.exchangeAuthCodeForTokens(code);
          logger.info('[AuthAgent] About to return from successful Web sign-in. isAuthenticated:', { isAuthenticated: this.session.isAuthenticated });
          return this.session;
        }
        logger.warn('[AuthAgent] Web Sign-in success type but no auth code received.');
      } else if (result.type === 'error') {
        logger.error('[AuthAgent] Google Sign-In error (Web):' , result.error);
        this.session.error = { message: result.error?.description || 'Google Sign-In failed (Web).', code: result.error?.code };
      } else if (result.type === 'cancel' || result.type === 'dismiss') {
        logger.info('[AuthAgent] Google Web Sign-In was cancelled.');
      } else {
        logger.error('[AuthAgent] Google Web Sign-In failed with result:', { resultType: result.type });
        throw new Error('Sign-in failed with unexpected response type: ' + result.type);
      }
      
      this.session.isAuthenticated = false;
      this.session.isLoading = false;
      this._notifyListeners();
      return this.session;

    } catch (error: Error | unknown) {
      const authError: AuthError = error instanceof Error 
        ? { ...error, originalError: error }
        : { name: 'AuthError', message: 'An unknown error occurred during web sign-in.', originalError: error };
      
      logger.error('[AuthAgent] signInWithGoogleWeb error:', { 
        error: authError.message, 
        code: authError.code 
      });
      this.session.error = { message: authError.message || 'An unknown error occurred during web sign-in.' };
      this.session.isAuthenticated = false;
      this.session.isLoading = false;
      this._notifyListeners();
      return this.session;
    }
  }

  private async _clearSessionAndNotify(): Promise<void> {
    try {
      await SecureStore.deleteItemAsync(this.SECURE_STORE_KEY);
      logger.info('[AuthAgent] Session cleared from secure store.');
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to clear session from secure store';
      logger.error('[AuthAgent] Error clearing session from secure store:', { error: errorMessage });
      // Potentially set a session error
    }
    // Reset local session state as well
    this.session = {
      user: null,
      tokens: null,
      isAuthenticated: false,
      isLoading: false,
      error: this.session.error, // Preserve any existing error that led to this clear, or null if none
    };
    // No, error should be cleared if we successfully cleared the session
    this.session.error = null; 
    this._notifyListeners(); // Notify listeners about the cleared session
  }

  private async initializeAuthSession(): Promise<void> {
    if (Platform.OS === 'web') {
      // For web, use a custom OAuth implementation or third-party library
      return;
    }

    try {
      let AuthSession: unknown = null;
      let SecureStore: unknown = null;
      
      // Dynamically import Expo modules to avoid errors in web environment
      try {
        AuthSession = await import('expo-auth-session');
        SecureStore = await import('expo-secure-store');
        logger.info('Expo modules imported successfully');
      } catch (importError) {
        logger.warn('Expo modules not available, using fallback web implementation');
      }
    } catch (error) {
      logger.error('Failed to initialize AuthAgent', { 
        error: error instanceof Error ? error.message : String(error) 
      });
      throw error;
    }
  }
}

export default AuthAgent;

// ... (placeholderAuthConfig and conceptual usage as before)