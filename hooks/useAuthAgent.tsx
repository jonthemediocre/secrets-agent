import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useMemo,
  ReactNode,
} from 'react';
import AuthAgent, {
  AuthSessionData,
  UserProfile,
  GoogleAuthConfig,
} from '../AuthAgent';

// Replace with your real config or import it
const authConfig: GoogleAuthConfig = {
  clientId: 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com',
  scopes: ['profile', 'email', 'openid'],
};

const authAgentInstance = new AuthAgent(authConfig);

interface AuthContextType {
  authAgent: AuthAgent;
  session: AuthSessionData;
  user: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthSessionData['error'] | null;
  signInWithGoogleExpo: () => Promise<AuthSessionData | null>;
  signInWithGoogleWeb: () => Promise<AuthSessionData | null>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [session, setSession] = useState<AuthSessionData>(
    authAgentInstance.getSession()
  );

  useEffect(() => {
    const unsubscribe = authAgentInstance.subscribe((s) => {
      setSession(s);
    });
    return unsubscribe;
  }, []);

  const contextValue = useMemo(
    () => ({
      authAgent: authAgentInstance,
      session,
      user: session.user,
      isAuthenticated: session.isAuthenticated,
      isLoading: session.isLoading,
      error: session.error || null,
      signInWithGoogleExpo: authAgentInstance.signInWithGoogleExpo,
      signInWithGoogleWeb: authAgentInstance.signInWithGoogleWeb,
      signOut: authAgentInstance.signOut,
    }),
    [session]
  );

  return (
    <AuthContext.Provider value={contextValue}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuthAgent = (): AuthContextType => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuthAgent must be used within an AuthProvider');
  }
  return ctx;
}; 