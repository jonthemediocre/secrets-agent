import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import UserAgent, { UserRecord } from '../UserAgent';
import { APIManagerAgent } from '../APIManagerAgent'; // Assuming APIManagerAgent.ts is in the parent directory
import { useAuthAgent } from './useAuthAgent'; // To get AuthAgent instance
import { createLogger } from '../src/utils/logger';

const logger = createLogger('useUserAgent');

interface UserAgentContextValue {
  userAgent: UserAgent | null;
  userRecord: UserRecord | null;
  isLoadingUser: boolean;
  loadUser: () => Promise<UserRecord | null>;
  clearUser: () => void;
}

const UserAgentContext = createContext<UserAgentContextValue | undefined>(undefined);

interface UserAgentProviderProps {
  children: ReactNode;
}

export const UserAgentProvider: React.FC<UserAgentProviderProps> = ({ children }) => {
  const { authAgent, isAuthenticated, isLoading } = useAuthAgent(); // Get authAgent and auth status

  const [apiManager, setApiManager] = useState<APIManagerAgent | null>(null);
  const [userAgent, setUserAgent] = useState<UserAgent | null>(null);
  const [userRecord, setUserRecord] = useState<UserRecord | null>(null);
  const [isLoadingUser, setIsLoadingUser] = useState<boolean>(false);

  useEffect(() => {
    if (authAgent) {
      const newApiManager = new APIManagerAgent(authAgent);
      setApiManager(newApiManager);
    } else {
      setApiManager(null);
    }
  }, [authAgent]);

  useEffect(() => {
    if (apiManager) {
      const newUserAgent = new UserAgent(apiManager);
      setUserAgent(newUserAgent);
    } else {
      setUserAgent(null);
    }
  }, [apiManager]);

  const loadUser = useCallback(async (): Promise<UserRecord | null> => {
    if (!userAgent || !isAuthenticated) {
      setUserRecord(null); // Clear user if not authenticated or no user agent
      return null;
    }
    setIsLoadingUser(true);
    try {
      const loadedUser = await userAgent.loadUser();
      setUserRecord(loadedUser);
      logger.info('User data loaded successfully', { 
        userId: loadedUser?.id,
        hasData: !!loadedUser 
      });
      return loadedUser;
    } catch (error) {
      logger.error('Failed to load user data', { error });
      setUserRecord(null);
      return null;
    } finally {
      setIsLoadingUser(false);
    }
  }, [userAgent, isAuthenticated]);

  const clearUser = useCallback(() => {
    setUserRecord(null);
    // Potentially call userAgent.clearUser() if such a method exists
    // to also clear any internal state in UserAgent.ts
  }, []);

  useEffect(() => {
    // Automatically load user when authenticated and userAgent is ready
    // or clear user if not authenticated
    if (isAuthenticated && userAgent) {
      loadUser();
    } else if (!isLoading && !isAuthenticated) {
      // If auth loading is finished and user is not authenticated, clear user data
      clearUser();
    }
  }, [isAuthenticated, userAgent, loadUser, isLoading, clearUser]);

  const contextValue: UserAgentContextValue = {
    userAgent,
    userRecord,
    isLoadingUser,
    loadUser,
    clearUser,
  };

  return (
    <UserAgentContext.Provider value={contextValue}>
      {children}
    </UserAgentContext.Provider>
  );
};

export const useUserAgent = (): UserAgentContextValue => {
  const context = useContext(UserAgentContext);
  if (context === undefined) {
    throw new Error('useUserAgent must be used within a UserAgentProvider');
  }
  return context;
}; 