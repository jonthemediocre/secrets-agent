'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { createLogger } from '../utils/logger';

const logger = createLogger('AuthContext');

export interface User {
  id: string;
  email: string;
  role: string;
  createdAt: string;
  updatedAt: string;
}

export interface AuthState {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface AuthContextType extends AuthState {
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string }>;
  register: (email: string, password: string, role?: string) => Promise<{ success: boolean; error?: string }>;
  logout: () => void;
  refreshToken: () => Promise<boolean>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [authState, setAuthState] = useState<AuthState>({
    user: null,
    token: null,
    isAuthenticated: false,
    isLoading: true,
  });

  // Initialize auth state from localStorage
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        const storedToken = localStorage.getItem(TOKEN_KEY);
        const storedUser = localStorage.getItem(USER_KEY);

        if (storedToken && storedUser) {
          const user = JSON.parse(storedUser);
          
          // Verify token is still valid
          const isValid = await verifyToken(storedToken);
          if (isValid) {
            setAuthState({
              user,
              token: storedToken,
              isAuthenticated: true,
              isLoading: false,
            });
            logger.info('Auth state restored from localStorage', { userId: user.id });
          } else {
            // Token invalid, clear storage
            localStorage.removeItem(TOKEN_KEY);
            localStorage.removeItem(USER_KEY);
            setAuthState({
              user: null,
              token: null,
              isAuthenticated: false,
              isLoading: false,
            });
          }
        } else {
          setAuthState({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
          });
        }
      } catch (error) {
        logger.error('Failed to initialize auth state', { error });
        setAuthState({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false,
        });
      }
    };

    initializeAuth();
  }, []);

  const verifyToken = async (token: string): Promise<boolean> => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });
      return response.ok;
    } catch (error) {
      logger.error('Token verification failed', { error });
      return false;
    }
  };

  const login = async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      console.log('🔐 Login attempt:', { email }); // Debug log

      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      console.log('🔐 Login response:', { response: response.ok, data }); // Debug log

      if (response.ok && data.success) {
        const { user, token } = data.data;
        
        console.log('🔐 Setting auth state:', { user, tokenLength: token?.length }); // Debug log
        
        // Store in localStorage
        localStorage.setItem(TOKEN_KEY, token);
        localStorage.setItem(USER_KEY, JSON.stringify(user));

        setAuthState({
          user,
          token,
          isAuthenticated: true,
          isLoading: false,
        });

        console.log('🔐 Login successful, auth state updated'); // Debug log
        logger.info('User logged in successfully', { userId: user.id, email: user.email });
        return { success: true };
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        const errorMessage = data.error || 'Login failed';
        console.error('🔐 Login failed:', errorMessage); // Debug log
        logger.warn('Login failed', { email, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      console.error('🔐 Login error:', error); // Debug log
      logger.error('Login error', { email, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const register = async (email: string, password: string, role: string = 'user'): Promise<{ success: boolean; error?: string }> => {
    try {
      setAuthState(prev => ({ ...prev, isLoading: true }));

      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, password, role }),
      });

      const data = await response.json();

      if (response.ok && data.success) {
        const { user } = data.data;
        
        // Auto-login after registration
        const loginResult = await login(email, password);
        if (loginResult.success) {
          logger.info('User registered and logged in successfully', { userId: user.id, email: user.email });
          return { success: true };
        } else {
          setAuthState(prev => ({ ...prev, isLoading: false }));
          return { success: false, error: 'Registration successful but auto-login failed' };
        }
      } else {
        setAuthState(prev => ({ ...prev, isLoading: false }));
        const errorMessage = data.error || 'Registration failed';
        logger.warn('Registration failed', { email, error: errorMessage });
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      setAuthState(prev => ({ ...prev, isLoading: false }));
      const errorMessage = error instanceof Error ? error.message : 'Network error';
      logger.error('Registration error', { email, error: errorMessage });
      return { success: false, error: errorMessage };
    }
  };

  const logout = () => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    
    setAuthState({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
    });

    logger.info('User logged out');
  };

  const refreshToken = async (): Promise<boolean> => {
    try {
      const currentToken = authState.token;
      if (!currentToken) return false;

      const response = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${currentToken}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        const { token: newToken } = data.data;
        
        localStorage.setItem(TOKEN_KEY, newToken);
        setAuthState(prev => ({ ...prev, token: newToken }));
        
        logger.info('Token refreshed successfully');
        return true;
      } else {
        // Token refresh failed, logout user
        logout();
        return false;
      }
    } catch (error) {
      logger.error('Token refresh failed', { error });
      logout();
      return false;
    }
  };

  const value: AuthContextType = {
    ...authState,
    login,
    register,
    logout,
    refreshToken,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default AuthContext; 