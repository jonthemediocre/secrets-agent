import { createLogger } from './src/utils/logger';

const logger = createLogger('UserAgent');

interface UserRecord {
  id: string;
  email: string;
  name?: string;
  avatarUrl?: string;
  roles: string[];
  preferences: Record<string, string | number | boolean | null | undefined>;
  lastSynced?: number;
}

// Assuming APIManagerAgent is in the same directory or correctly pathed
// import APIManagerAgent from './APIManagerAgent'; 
// Ensure APIManagerAgent is imported if it's in a separate file. For now, we'll assume it's available.

class UserAgent {
  private user: UserRecord | null = null;

  constructor(private api: { fetchWithAuth: (url: string, options?: RequestInit) => Promise<Response> }) { // Changed APIManagerAgent to any for now to avoid import errors if APIManagerAgent is not yet defined/imported during initial scaffolding by the tool
    // If APIManagerAgent is a class, you'd typically pass an instance:
    // constructor(private api: APIManagerAgent) {}
  }

  public async loadUser(): Promise<UserRecord | null> {
    // Ensure APIManagerAgent is properly instantiated and passed to this constructor
    // For example: const userAgent = new UserAgent(new APIManagerAgent(authAgentInstance));
    try {
      const res = await this.api.fetchWithAuth('/me'); // Assumes APIManagerAgent has fetchWithAuth
      if (!res.ok) {
        logger.error('Failed to fetch user data', {
          status: res.status,
          error: await res.text()
        });
        this.user = null;
        return null;
      }
      this.user = await res.json();
      if (this.user) {
        this.user.lastSynced = Date.now();
      }
      return this.user;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error loading user';
      logger.error('Error loading user', { error: errorMessage });
      this.user = null;
      return null;
    }
  }

  public getUser(): UserRecord | null {
    return this.user;
  }

  public async updatePreferences(prefs: Partial<UserRecord['preferences']>) {
    if (!this.user) {
      logger.warn('Cannot update preferences, no user loaded');
      return false;
    }
    const newPreferences = { ...this.user.preferences, ...prefs };
    try {
      // Assuming an endpoint like /me/preferences or similar for PATCH/PUT
      const res = await this.api.fetchWithAuth('/me/preferences', {
        method: 'PATCH', // Or 'PUT'
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newPreferences),
      });

      if (!res.ok) {
        logger.error('Failed to update preferences', {
          status: res.status,
          error: await res.text(),
          userId: this.user.id
        });
        return false;
      }
      this.user.preferences = newPreferences;
      this.user.lastSynced = Date.now(); // Update sync time
      logger.info('User preferences updated successfully', {
        updatedFields: Object.keys(prefs),
        userId: this.user.id
      });
      return true;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error updating preferences';
      logger.error('Error updating preferences', { 
        error: errorMessage,
        userId: this.user?.id
      });
      return false;
    }
  }
  
  // Add other methods as needed, e.g.:
  // - getRole(): string[] | null
  // - hasPermission(permission: string): boolean
  // - clearUser(): void (on sign-out)
}

export default UserAgent;
export type { UserRecord }; 