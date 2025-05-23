import React, { useEffect } from 'react';
import { useRouter } from 'next/router';
import { useAuthAgent } from '../hooks/useAuthAgent';
import { createLogger } from '../src/utils/logger';

const logger = createLogger('AuthGuard');

interface AuthGuardProps {
  children: React.ReactNode;
}

const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isAuthenticated, isLoading } = useAuthAgent();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      logger.info('User not authenticated, redirecting to login', {
        currentPath: router.pathname,
        userAgent: navigator.userAgent
      });
      router.push('/login');
    }
  }, [isAuthenticated, isLoading, router]);

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return null; // Will redirect in useEffect
  }

  return <>{children}</>;
};

export default AuthGuard; 