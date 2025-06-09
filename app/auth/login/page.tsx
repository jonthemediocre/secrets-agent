'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { signIn, getSession } from 'next-auth/react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/src/contexts/AuthContext';
import {
  LockClosedIcon,
  EyeIcon,
  EyeSlashIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
} from '@heroicons/react/24/outline';

// GitHub and Google Icons
const GitHubIcon = () => (
  <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
    <path fillRule="evenodd" d="M10 0C4.477 0 0 4.484 0 10.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0110 4.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.203 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.942.359.31.678.921.678 1.856 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0020 10.017C20 4.484 15.522 0 10 0z" clipRule="evenodd" />
  </svg>
);

const GoogleIcon = () => (
  <svg className="w-5 h-5" viewBox="0 0 24 24">
    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
  </svg>
);

export default function LoginPage() {
  const router = useRouter();
  const { login, isAuthenticated, isLoading } = useAuth();
  
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [oauthLoading, setOauthLoading] = useState<string | null>(null);

  // Redirect if already authenticated
  useEffect(() => {
    if (isAuthenticated && !isLoading) {
      router.push('/');
    }
  }, [isAuthenticated, isLoading, router]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    // Clear error when user starts typing
    if (error) setError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);

    if (!formData.email || !formData.password) {
      setError('Please fill in all fields');
      setIsSubmitting(false);
      return;
    }

    try {
      const result = await login(formData.email, formData.password);
      
      if (result.success) {
        setSuccess(true);
        // Redirect will happen via useEffect
      } else {
        setError(result.error || 'Login failed');
      }
    } catch (err) {
      setError('An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOAuthSignIn = async (provider: 'github' | 'google') => {
    setOauthLoading(provider);
    setError(null);
    
    try {
      await signIn(provider, { 
        callbackUrl: window.location.search.includes('redirect=') 
          ? decodeURIComponent(window.location.search.split('redirect=')[1]) 
          : '/' 
      });
    } catch (err) {
      setError(`Failed to sign in with ${provider === 'github' ? 'GitHub' : 'Google'}`);
      setOauthLoading(null);
    }
  };

  // Show loading state while checking auth
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-2 text-center">
          <div className="mx-auto w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
            <LockClosedIcon className="w-6 h-6 text-white" />
          </div>
          <CardTitle className="text-2xl font-bold">Welcome Back</CardTitle>
          <CardDescription>
            Sign in to access your secrets vault
          </CardDescription>
        </CardHeader>
        
        <CardContent className="space-y-4">
          {/* Success Message */}
          {success && (
            <Alert className="border-green-500 bg-green-50 dark:bg-green-900/20">
              <CheckCircleIcon className="w-4 h-4 text-green-600" />
              <AlertDescription className="text-green-700 dark:text-green-400">
                Login successful! Redirecting...
              </AlertDescription>
            </Alert>
          )}

          {/* Error Message */}
          {error && (
            <Alert className="border-red-500 bg-red-50 dark:bg-red-900/20">
              <ExclamationTriangleIcon className="w-4 h-4 text-red-600" />
              <AlertDescription className="text-red-700 dark:text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}

          {/* Development Credentials Info */}
          {process.env.NODE_ENV === 'development' && (
            <Alert className="border-blue-500 bg-blue-50 dark:bg-blue-900/20">
              <CheckCircleIcon className="w-4 h-4 text-blue-600" />
              <AlertDescription className="text-blue-700 dark:text-blue-400">
                <div className="space-y-2">
                  <div className="font-semibold">Development Credentials:</div>
                  <div className="text-sm space-y-1">
                    <div>• admin@secretsagent.com / admin123</div>
                    <div>• test@example.com / password123</div>
                    <div>• demo@secretsagent.com / demo123</div>
                  </div>
                </div>
              </AlertDescription>
            </Alert>
          )}

          {/* OAuth Buttons */}
          <div className="space-y-3">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn('github')}
              disabled={!!oauthLoading || isSubmitting}
            >
              {oauthLoading === 'github' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Connecting to GitHub...
                </>
              ) : (
                <>
                  <GitHubIcon />
                  <span className="ml-2">Continue with GitHub</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={() => handleOAuthSignIn('google')}
              disabled={!!oauthLoading || isSubmitting}
            >
              {oauthLoading === 'google' ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600 mr-2"></div>
                  Connecting to Google...
                </>
              ) : (
                <>
                  <GoogleIcon />
                  <span className="ml-2">Continue with Google</span>
                </>
              )}
            </Button>
          </div>

          {/* Divider */}
          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-background px-2 text-muted-foreground">
                Or continue with email
              </span>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="Enter your email"
                value={formData.email}
                onChange={handleInputChange}
                disabled={isSubmitting || !!oauthLoading}
                required
                className="w-full"
              />
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Enter your password"
                  value={formData.password}
                  onChange={handleInputChange}
                  disabled={isSubmitting || !!oauthLoading}
                  required
                  className="w-full pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                  disabled={isSubmitting || !!oauthLoading}
                >
                  {showPassword ? (
                    <EyeSlashIcon className="w-4 h-4" />
                  ) : (
                    <EyeIcon className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              disabled={isSubmitting || !!oauthLoading}
            >
              {isSubmitting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Signing In...
                </>
              ) : (
                'Sign In'
              )}
            </Button>
          </form>

          {/* Register Link */}
          <div className="text-center text-sm text-muted-foreground">
            Don't have an account?{' '}
            <Link 
              href="/auth/register" 
              className="text-blue-600 hover:text-blue-500 font-medium"
            >
              Create one here
            </Link>
          </div>

          {/* Demo Credentials */}
          <div className="mt-6 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
            <p className="text-xs text-muted-foreground text-center mb-2">
              Demo Credentials:
            </p>
            <p className="text-xs text-center">
              <span className="font-mono">test@example.com</span> / <span className="font-mono">password123</span>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 