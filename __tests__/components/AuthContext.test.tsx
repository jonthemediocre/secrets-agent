import React from 'react'
import { render, screen, act, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { AuthProvider, useAuth } from '@/src/contexts/AuthContext'

// Mock localStorage
const localStorageMock = {
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
  clear: jest.fn(),
}
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
})

// Mock fetch
const mockFetch = jest.fn()
global.fetch = mockFetch

// Test component that uses the auth context
const TestComponent = () => {
  const { isAuthenticated, user, login, logout, isLoading } = useAuth()
  
  return (
    <div>
      <div data-testid="loading">{isLoading ? 'Loading' : 'Not Loading'}</div>
      <div data-testid="auth-status">{isAuthenticated ? 'Authenticated' : 'Not Authenticated'}</div>
      <div data-testid="user-email">{user?.email || 'No User'}</div>
      <button onClick={() => login('test@example.com', 'password')}>Login</button>
      <button onClick={logout}>Logout</button>
    </div>
  )
}

describe('AuthContext', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    localStorageMock.getItem.mockReturnValue(null)
  })

  it('should initialize with unauthenticated state', () => {
    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
    expect(screen.getByTestId('user-email')).toHaveTextContent('No User')
    expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
  })

  it('should authenticate user on successful login', async () => {
    const user = userEvent.setup()
    
    // Mock successful login response
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com', role: 'user' },
          token: 'mock-token',
          refreshToken: 'mock-refresh-token'
        }
      })
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    })

    // Click login button
    await act(async () => {
      await user.click(screen.getByText('Login'))
    })

    // Wait for login to complete
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      expect(screen.getByTestId('user-email')).toHaveTextContent('test@example.com')
    })

    // Check localStorage calls with correct keys
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_token', 'mock-token')
    expect(localStorageMock.setItem).toHaveBeenCalledWith('auth_user', JSON.stringify({
      id: '1', 
      email: 'test@example.com', 
      role: 'user'
    }))
  })

  it('should handle login failure', async () => {
    const user = userEvent.setup()
    
    // Mock failed login response
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({
        success: false,
        error: 'Invalid credentials'
      })
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Wait for initial loading to complete
    await waitFor(() => {
      expect(screen.getByTestId('loading')).toHaveTextContent('Not Loading')
    })

    // Click login button
    await act(async () => {
      await user.click(screen.getByText('Login'))
    })

    // Should remain unauthenticated
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      expect(screen.getByTestId('user-email')).toHaveTextContent('No User')
    })

    // Should not store anything in localStorage
    expect(localStorageMock.setItem).not.toHaveBeenCalled()
  })

  it('should logout user and clear storage', async () => {
    const user = userEvent.setup()
    
    // Mock successful login first
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        data: {
          user: { id: '1', email: 'test@example.com', role: 'user' },
          token: 'mock-token'
        }
      })
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Login first
    await act(async () => {
      await user.click(screen.getByText('Login'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
    })

    // Now logout
    await act(async () => {
      await user.click(screen.getByText('Logout'))
    })

    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Not Authenticated')
      expect(screen.getByTestId('user-email')).toHaveTextContent('No User')
    })

    // Check localStorage removal with correct keys
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_token')
    expect(localStorageMock.removeItem).toHaveBeenCalledWith('auth_user')
  })

  it('should restore authentication from localStorage on mount', async () => {
    // Mock stored auth data
    localStorageMock.getItem.mockImplementation((key) => {
      if (key === 'auth_token') return 'stored-token'
      if (key === 'auth_user') return JSON.stringify({
        id: '1',
        email: 'stored@example.com',
        role: 'user'
      })
      return null
    })

    // Mock token verification
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true })
    })

    render(
      <AuthProvider>
        <TestComponent />
      </AuthProvider>
    )

    // Should restore auth state from localStorage
    await waitFor(() => {
      expect(screen.getByTestId('auth-status')).toHaveTextContent('Authenticated')
      expect(screen.getByTestId('user-email')).toHaveTextContent('stored@example.com')
    })
  })
}) 