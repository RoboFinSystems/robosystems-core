import {
  client,
  forgotPassword,
  getAuthProviders,
  getCurrentAuthUser,
  getMfaOptions,
  getMfaStatus,
  getPasskeyLoginOptions,
  getPasskeyRegistrationOptions,
  loginUser,
  logoutUser,
  registerUser,
  resendVerificationEmail,
  verifyMfa,
  verifyPasskeyLogin,
  verifyPasskeyRegistration,
} from '@robosystems/client'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { RoboSystemsAuthClient } from '../client'

const mockedClient = vi.mocked(client)
const mockedGetCurrentAuthUser = vi.mocked(getCurrentAuthUser)
const mockedLoginUser = vi.mocked(loginUser)
const mockedLogoutUser = vi.mocked(logoutUser)
const mockedRegisterUser = vi.mocked(registerUser)
const mockedForgotPassword = vi.mocked(forgotPassword)
const mockedResendVerificationEmail = vi.mocked(resendVerificationEmail)
const mockedGetAuthProviders = vi.mocked(getAuthProviders)
const mockedGetMfaOptions = vi.mocked(getMfaOptions)
const mockedGetMfaStatus = vi.mocked(getMfaStatus)
const mockedGetPasskeyLoginOptions = vi.mocked(getPasskeyLoginOptions)
const mockedVerifyMfa = vi.mocked(verifyMfa)
const mockedVerifyPasskeyLogin = vi.mocked(verifyPasskeyLogin)
const mockedVerifyPasskeyRegistration = vi.mocked(verifyPasskeyRegistration)
const mockedGetPasskeyRegistrationOptions = vi.mocked(
  getPasskeyRegistrationOptions
)

describe('Auth System Core Tests', () => {
  describe('RoboSystemsAuthClient', () => {
    let authClient: RoboSystemsAuthClient

    beforeEach(() => {
      authClient = new RoboSystemsAuthClient('https://api.test.com')
      vi.clearAllMocks()
    })

    it('should initialize with correct config', () => {
      // Create a new instance to test initialization
      new RoboSystemsAuthClient('https://test.example.com')

      // Check that setConfig was called (it gets called during construction)
      expect(mockedClient.setConfig).toHaveBeenCalledWith({
        baseUrl: 'https://test.example.com',
        credentials: 'include',
        headers: {},
      })
    })

    it('should handle getCurrentUser success', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }

      mockedGetCurrentAuthUser.mockResolvedValueOnce({
        data: { user: mockUser },
      } as any)

      const result = await authClient.getCurrentUser()

      expect(result).toMatchObject(mockUser)
      expect(mockedGetCurrentAuthUser).toHaveBeenCalledWith({
        client: expect.any(Object),
      })
    })

    it('should handle getCurrentUser failure', async () => {
      mockedGetCurrentAuthUser.mockRejectedValueOnce(new Error('Unauthorized'))

      await expect(authClient.getCurrentUser()).rejects.toThrow('Unauthorized')
    })

    it('should handle login success', async () => {
      const mockResponse = {
        user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
        success: true,
        message: 'Success',
      }

      mockedLoginUser.mockResolvedValueOnce({ data: mockResponse } as any)

      const result = await authClient.login('test@example.com', 'password')

      expect(result).toEqual(mockResponse)
      expect(mockedLoginUser).toHaveBeenCalledWith({
        client: expect.any(Object),
        body: { email: 'test@example.com', password: 'password' },
      })
    })

    it('should handle logout', async () => {
      mockedLogoutUser.mockResolvedValueOnce({} as any)

      await authClient.logout()

      expect(mockedLogoutUser).toHaveBeenCalledWith({
        client: expect.any(Object),
      })
    })

    it('should cache authentication results', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }

      // Mock timers for cache testing
      vi.useFakeTimers()

      mockedGetCurrentAuthUser.mockResolvedValueOnce({
        data: { user: mockUser },
      } as any)

      // First call
      const result1 = await authClient.getCurrentUser()
      expect(result1).toMatchObject(mockUser)
      expect(mockedGetCurrentAuthUser).toHaveBeenCalledTimes(1)

      // Second call within cache window (30 seconds)
      const result2 = await authClient.getCurrentUser()
      expect(result2).toMatchObject(mockUser)
      expect(mockedGetCurrentAuthUser).toHaveBeenCalledTimes(1) // No additional call

      // Fast-forward past cache expiry (30s + 1s)
      vi.advanceTimersByTime(31000)

      // Third call should make new request
      mockedGetCurrentAuthUser.mockResolvedValueOnce({
        data: { user: mockUser },
      } as any)
      const result3 = await authClient.getCurrentUser()
      expect(result3).toMatchObject(mockUser)
      expect(mockedGetCurrentAuthUser).toHaveBeenCalledTimes(2)

      vi.useRealTimers()
    })

    it('should clear cache correctly', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }

      mockedGetCurrentAuthUser.mockResolvedValueOnce({
        data: { user: mockUser },
      } as any)

      // Populate cache
      await authClient.getCurrentUser()
      expect(mockedGetCurrentAuthUser).toHaveBeenCalledTimes(1)

      // Use cache
      await authClient.getCurrentUser()
      expect(mockedGetCurrentAuthUser).toHaveBeenCalledTimes(1)

      // Clear cache
      authClient.clearAuthCache()

      // Next call should make new request
      mockedGetCurrentAuthUser.mockResolvedValueOnce({
        data: { user: mockUser },
      } as any)
      await authClient.getCurrentUser()
      expect(mockedGetCurrentAuthUser).toHaveBeenCalledTimes(2)
    })
  })

  describe('Error Handling', () => {
    let authClient: RoboSystemsAuthClient

    beforeEach(() => {
      authClient = new RoboSystemsAuthClient('https://api.test.com')
      authClient.clearAuthCache() // Clear cache between tests
      vi.clearAllMocks()
    })

    it('should handle network errors', async () => {
      mockedGetCurrentAuthUser.mockRejectedValueOnce(new Error('Network error'))

      await expect(authClient.getCurrentUser()).rejects.toThrow('Network error')
    })

    it('should handle malformed responses', async () => {
      mockedGetCurrentAuthUser.mockResolvedValueOnce({ data: null } as any)

      // Should handle gracefully, though might throw due to null data
      await expect(authClient.getCurrentUser()).rejects.toThrow()
    })

    it('should return null for checkAuthentication on error', async () => {
      mockedGetCurrentAuthUser.mockRejectedValueOnce(new Error('Unauthorized'))

      const result = await authClient.checkAuthentication()
      expect(result).toBeNull()
    })
  })

  describe('Request Deduplication', () => {
    let authClient: RoboSystemsAuthClient

    beforeEach(() => {
      authClient = new RoboSystemsAuthClient('https://api.test.com')
      authClient.clearAuthCache() // Clear cache between tests
      vi.clearAllMocks()
    })

    it('should deduplicate concurrent requests', async () => {
      const mockUser = {
        id: 'user-123',
        email: 'test@example.com',
        name: 'Test User',
      }

      // Return a promise that we can control
      let resolvePromise: (value: any) => void
      const delayedPromise = new Promise((resolve) => {
        resolvePromise = resolve
      })

      mockedGetCurrentAuthUser.mockReturnValueOnce(delayedPromise as any)

      // Make multiple concurrent calls
      const promise1 = authClient.getCurrentUser()
      const promise2 = authClient.getCurrentUser()
      const promise3 = authClient.getCurrentUser()

      // Resolve the promise
      resolvePromise!({ data: { user: mockUser } })

      // All should resolve to the same result
      const [result1, result2, result3] = await Promise.all([
        promise1,
        promise2,
        promise3,
      ])

      expect(result1).toMatchObject(mockUser)
      expect(result2).toMatchObject(mockUser)
      expect(result3).toMatchObject(mockUser)

      // Should only make one API call
      expect(mockedGetCurrentAuthUser).toHaveBeenCalledTimes(1)
    })
  })

  describe('X-App-Source header (originating app for email branding)', () => {
    let authClient: RoboSystemsAuthClient

    beforeEach(() => {
      authClient = new RoboSystemsAuthClient('https://api.test.com')
      vi.clearAllMocks()
    })

    it('register sends X-App-Source when appSource is given', async () => {
      mockedRegisterUser.mockResolvedValueOnce({
        data: {
          user: { id: 'user-1', email: 'a@b.co', name: 'A' },
          message: 'ok',
        },
      } as any)

      await authClient.register('a@b.co', 'pw', 'A', undefined, undefined, {
        appSource: 'roboledger',
      })

      expect(mockedRegisterUser).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'X-App-Source': 'roboledger' },
        })
      )
    })

    it('register omits the header when appSource is absent', async () => {
      mockedRegisterUser.mockResolvedValueOnce({
        data: {
          user: { id: 'user-1', email: 'a@b.co', name: 'A' },
          message: 'ok',
        },
      } as any)

      await authClient.register('a@b.co', 'pw', 'A')

      expect(mockedRegisterUser).toHaveBeenCalledWith(
        expect.objectContaining({ headers: undefined })
      )
    })

    it('forgotPassword sends X-App-Source when appSource is given', async () => {
      mockedForgotPassword.mockResolvedValueOnce({ data: {} } as any)

      await authClient.forgotPassword('a@b.co', { appSource: 'roboinvestor' })

      expect(mockedForgotPassword).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'X-App-Source': 'roboinvestor' },
        })
      )
    })

    it('resendVerificationEmail sends X-App-Source when appSource is given', async () => {
      mockedResendVerificationEmail.mockResolvedValueOnce({ data: {} } as any)

      await authClient.resendVerificationEmail('a@b.co', {
        appSource: 'roboledger',
      })

      expect(mockedResendVerificationEmail).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: { 'X-App-Source': 'roboledger' },
        })
      )
    })
  })

  describe('getAuthProviders (deployment auth posture)', () => {
    let authClient: RoboSystemsAuthClient

    beforeEach(() => {
      authClient = new RoboSystemsAuthClient('https://api.test.com')
      vi.clearAllMocks()
    })

    it('returns the posture on success', async () => {
      const posture = {
        password_auth: true,
        oidc: { enabled: true, provider_label: 'Okta' },
        registration: false,
        passkeys: false,
      }
      mockedGetAuthProviders.mockResolvedValueOnce({ data: posture } as never)

      expect(await authClient.getAuthProviders()).toEqual(posture)
    })

    it('returns null on failure or malformed payload (fail-open rendering hint)', async () => {
      mockedGetAuthProviders.mockRejectedValueOnce(new Error('network down'))
      expect(await authClient.getAuthProviders()).toBeNull()

      mockedGetAuthProviders.mockResolvedValueOnce({
        data: { unexpected: 'shape' },
      } as never)
      expect(await authClient.getAuthProviders()).toBeNull()
    })
  })
})

describe('Passkey MFA client surface', () => {
  let authClient: RoboSystemsAuthClient
  const sessionPayload = {
    user: { id: 'user-123', email: 'test@example.com', name: 'Test User' },
    message: 'Login successful',
    status: 'authenticated',
    token: 'jwt-abc',
    expires_in: 1800,
    refresh_threshold: 300,
  }

  beforeEach(() => {
    authClient = new RoboSystemsAuthClient('https://api.test.com')
    vi.clearAllMocks()
    localStorage.clear()
  })

  afterEach(() => {
    // Stored session tokens must not leak into suites that read auth state.
    localStorage.clear()
  })

  it('login passes an mfa_required status through without storing a token', async () => {
    mockedLoginUser.mockResolvedValueOnce({
      data: {
        user: { id: 'user-123', email: 'test@example.com' },
        message: 'Additional verification required',
        status: 'mfa_required',
        mfa_token: 'mfa-tok-1',
        token: null,
      },
    } as any)

    const result = await authClient.login('test@example.com', 'password')

    expect(result.success).toBe(false)
    expect(result.status).toBe('mfa_required')
    expect(result.mfaToken).toBe('mfa-tok-1')
    expect(result.token).toBeFalsy()
    expect(localStorage.getItem('robosystems_jwt_token')).toBeNull()
  })

  it('login treats a status-less response as authenticated (pre-MFA backend)', async () => {
    mockedLoginUser.mockResolvedValueOnce({
      data: {
        user: { id: 'user-123', email: 'test@example.com' },
        message: 'Login successful',
        token: 'jwt-legacy',
      },
    } as any)

    const result = await authClient.login('test@example.com', 'password')

    expect(result.success).toBe(true)
    expect(result.token).toBe('jwt-legacy')
    expect(localStorage.getItem('robosystems_jwt_token')).toBe('jwt-legacy')
  })

  it('settings-lane enrollment options carry the re-auth proof', async () => {
    mockedGetPasskeyRegistrationOptions.mockResolvedValueOnce({
      data: { options: { challenge: 'reg-1' } },
    } as any)

    const options = await authClient.getPasskeyRegistrationOptions({
      password: 'hunter2!',
    })

    expect(options).toEqual({ challenge: 'reg-1' })
    expect(mockedGetPasskeyRegistrationOptions).toHaveBeenCalledWith({
      client: expect.any(Object),
      body: {
        mfa_token: undefined,
        password: 'hunter2!',
        assertion: undefined,
      },
    })
  })

  it('forced-lane enrollment options carry only the enroll token', async () => {
    mockedGetPasskeyRegistrationOptions.mockResolvedValueOnce({
      data: { options: { challenge: 'reg-2' } },
    } as any)

    await authClient.getPasskeyRegistrationOptions({ mfaToken: 'enroll-tok' })

    expect(mockedGetPasskeyRegistrationOptions).toHaveBeenCalledWith({
      client: expect.any(Object),
      body: {
        mfa_token: 'enroll-tok',
        password: undefined,
        assertion: undefined,
      },
    })
  })

  it('getMfaOptions unwraps the options payload', async () => {
    mockedGetMfaOptions.mockResolvedValueOnce({
      data: { options: { challenge: 'abc', rpId: 'robosystems.ai' } },
    } as any)

    const options = await authClient.getMfaOptions('mfa-tok-1')

    expect(options).toEqual({ challenge: 'abc', rpId: 'robosystems.ai' })
    expect(mockedGetMfaOptions).toHaveBeenCalledWith({
      client: expect.any(Object),
      body: { mfa_token: 'mfa-tok-1' },
    })
  })

  it('verifyMfa with an assertion stores the minted session token', async () => {
    mockedVerifyMfa.mockResolvedValueOnce({ data: sessionPayload } as any)

    const result = await authClient.verifyMfa('mfa-tok-1', {
      assertion: { id: 'cred-1' },
    })

    expect(result.success).toBe(true)
    expect(result.token).toBe('jwt-abc')
    expect(localStorage.getItem('robosystems_jwt_token')).toBe('jwt-abc')
    expect(mockedVerifyMfa).toHaveBeenCalledWith({
      client: expect.any(Object),
      body: {
        mfa_token: 'mfa-tok-1',
        assertion: { id: 'cred-1' },
        recovery_code: undefined,
      },
    })
  })

  it('verifyMfa with a recovery code sends only the code', async () => {
    mockedVerifyMfa.mockResolvedValueOnce({ data: sessionPayload } as any)

    await authClient.verifyMfa('mfa-tok-1', { recoveryCode: 'AAAAA-BBBBB' })

    expect(mockedVerifyMfa).toHaveBeenCalledWith({
      client: expect.any(Object),
      body: {
        mfa_token: 'mfa-tok-1',
        assertion: undefined,
        recovery_code: 'AAAAA-BBBBB',
      },
    })
  })

  it('completePasskeyLogin stores the minted session token', async () => {
    mockedGetPasskeyLoginOptions.mockResolvedValueOnce({
      data: { options: { challenge: 'pwl' } },
    } as any)
    mockedVerifyPasskeyLogin.mockResolvedValueOnce({
      data: sessionPayload,
    } as any)

    const options = await authClient.getPasskeyLoginOptions()
    expect(options).toEqual({ challenge: 'pwl' })

    const result = await authClient.completePasskeyLogin({ id: 'cred-1' })
    expect(result.success).toBe(true)
    expect(localStorage.getItem('robosystems_jwt_token')).toBe('jwt-abc')
  })

  it('completePasskeyEnrollment maps recovery codes and stores the forced-lane session', async () => {
    mockedVerifyPasskeyRegistration.mockResolvedValueOnce({
      data: {
        passkey: { id: 'upk_1', name: 'MacBook' },
        recovery_codes: ['AAAAA-AAAAA', 'BBBBB-BBBBB'],
        auth: sessionPayload,
      },
    } as any)

    const result = await authClient.completePasskeyEnrollment(
      { id: 'cred-1' },
      { name: 'MacBook', mfaToken: 'enroll-tok-1' }
    )

    expect(result.passkey).toEqual({ id: 'upk_1', name: 'MacBook' })
    expect(result.recoveryCodes).toEqual(['AAAAA-AAAAA', 'BBBBB-BBBBB'])
    expect(result.auth?.token).toBe('jwt-abc')
    expect(localStorage.getItem('robosystems_jwt_token')).toBe('jwt-abc')
  })

  it('completePasskeyEnrollment in the settings lane stores nothing', async () => {
    mockedVerifyPasskeyRegistration.mockResolvedValueOnce({
      data: { passkey: { id: 'upk_2' }, recovery_codes: null, auth: null },
    } as any)

    const result = await authClient.completePasskeyEnrollment({ id: 'cred-2' })

    expect(result.recoveryCodes).toBeUndefined()
    expect(result.auth).toBeUndefined()
    expect(localStorage.getItem('robosystems_jwt_token')).toBeNull()
  })

  it('getMfaStatus maps the posture and fails open to null', async () => {
    mockedGetMfaStatus.mockResolvedValueOnce({
      data: {
        passkey_count: 2,
        recovery_codes_remaining: 7,
        enforcement_applies: true,
      },
    } as any)
    expect(await authClient.getMfaStatus()).toEqual({
      passkeyCount: 2,
      recoveryCodesRemaining: 7,
      enforcementApplies: true,
    })

    mockedGetMfaStatus.mockRejectedValueOnce(new Error('boom'))
    expect(await authClient.getMfaStatus()).toBeNull()
  })
})
