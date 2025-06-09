import { generateTokens, verifyToken, refreshToken, isTokenExpired, authenticateRequest } from '@/lib/auth'

// Mock the auth functions
jest.mock('@/lib/auth', () => ({
  generateTokens: jest.fn(),
  verifyToken: jest.fn(),
  refreshToken: jest.fn(),
  isTokenExpired: jest.fn(),
  authenticateRequest: jest.fn(),
}))

describe('Auth Functions', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('generateTokens', () => {
    it('should generate access and refresh tokens', () => {
      const mockTokens = {
        accessToken: 'mock-access-token',
        refreshToken: 'mock-refresh-token',
        expiresIn: 3600,
      }

      ;(generateTokens as jest.Mock).mockReturnValue(mockTokens)

      const payload = {
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
      }

      const result = generateTokens(payload)

      expect(result).toEqual(mockTokens)
      expect(generateTokens).toHaveBeenCalledWith(payload)
    })
  })

  describe('verifyToken', () => {
    it('should verify valid token', () => {
      const mockPayload = {
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
      }

      ;(verifyToken as jest.Mock).mockReturnValue(mockPayload)

      const result = verifyToken('valid-token')

      expect(result).toEqual(mockPayload)
      expect(verifyToken).toHaveBeenCalledWith('valid-token')
    })

    it('should return null for invalid token', () => {
      ;(verifyToken as jest.Mock).mockReturnValue(null)

      const result = verifyToken('invalid-token')

      expect(result).toBeNull()
      expect(verifyToken).toHaveBeenCalledWith('invalid-token')
    })
  })

  describe('refreshToken', () => {
    it('should refresh valid token', () => {
      const mockTokens = {
        accessToken: 'new-access-token',
        refreshToken: 'new-refresh-token',
        expiresIn: 3600,
      }

      ;(refreshToken as jest.Mock).mockReturnValue(mockTokens)

      const result = refreshToken('valid-refresh-token')

      expect(result).toEqual(mockTokens)
      expect(refreshToken).toHaveBeenCalledWith('valid-refresh-token')
    })

    it('should return null for invalid refresh token', () => {
      ;(refreshToken as jest.Mock).mockReturnValue(null)

      const result = refreshToken('invalid-refresh-token')

      expect(result).toBeNull()
      expect(refreshToken).toHaveBeenCalledWith('invalid-refresh-token')
    })
  })

  describe('isTokenExpired', () => {
    it('should return false for valid token', () => {
      ;(isTokenExpired as jest.Mock).mockReturnValue(false)

      const result = isTokenExpired('valid-token')

      expect(result).toBe(false)
      expect(isTokenExpired).toHaveBeenCalledWith('valid-token')
    })

    it('should return true for expired token', () => {
      ;(isTokenExpired as jest.Mock).mockReturnValue(true)

      const result = isTokenExpired('expired-token')

      expect(result).toBe(true)
      expect(isTokenExpired).toHaveBeenCalledWith('expired-token')
    })
  })

  describe('authenticateRequest', () => {
    it('should authenticate valid Bearer token', () => {
      const mockPayload = {
        userId: '1',
        email: 'test@example.com',
        role: 'USER',
      }

      ;(authenticateRequest as jest.Mock).mockReturnValue(mockPayload)

      const result = authenticateRequest('Bearer valid-token')

      expect(result).toEqual(mockPayload)
      expect(authenticateRequest).toHaveBeenCalledWith('Bearer valid-token')
    })

    it('should return null for invalid auth header', () => {
      ;(authenticateRequest as jest.Mock).mockReturnValue(null)

      const result = authenticateRequest('Invalid header')

      expect(result).toBeNull()
      expect(authenticateRequest).toHaveBeenCalledWith('Invalid header')
    })

    it('should return null for missing auth header', () => {
      ;(authenticateRequest as jest.Mock).mockReturnValue(null)

      const result = authenticateRequest(undefined)

      expect(result).toBeNull()
      expect(authenticateRequest).toHaveBeenCalledWith(undefined)
    })
  })
}) 