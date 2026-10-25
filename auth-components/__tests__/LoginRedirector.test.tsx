import { render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { LoginRedirector } from '../LoginRedirector'

const handleSSOLogin = vi.fn()
const hasPendingBridge = vi.fn(() => true)
const mintBrowserNonce = vi.fn(async () => 'ab'.repeat(32))
vi.mock('../../auth-core/sso', () => ({
  useSSO: () => ({ handleSSOLogin }),
  hasPendingBridge: () => hasPendingBridge(),
  mintBrowserNonce: () => mintBrowserNonce(),
}))

const mockIsLoginHome = vi.fn(() => false)
vi.mock('../../auth-core/config', () => ({
  CURRENT_APP: 'roboledger',
  isLoginHome: () => mockIsLoginHome(),
  APP_CONFIGS: {
    robosystems: { url: 'https://robosystems.ai', name: 'robosystems' },
    roboledger: { url: 'https://roboledger.ai', name: 'roboledger' },
  },
  getLoginHomeUrl: () => 'https://robosystems.ai',
  getAppConfig: (name: string) => ({
    url: 'https://robosystems.ai',
    name,
  }),
}))

describe('LoginRedirector', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockIsLoginHome.mockReturnValue(false)
    hasPendingBridge.mockReturnValue(true)
  })

  it('fails safe instead of self-redirecting when mounted on the login home', async () => {
    window.history.replaceState({}, '', '/login')
    mockIsLoginHome.mockReturnValue(true)
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})

    render(<LoginRedirector apiUrl="http://localhost:8000" />)

    await waitFor(() => {
      expect(
        screen.getByText('Sign-in is temporarily unavailable')
      ).toBeInTheDocument()
    })
    expect(handleSSOLogin).not.toHaveBeenCalled()
    expect(consoleError).toHaveBeenCalledWith(
      expect.stringContaining('login home')
    )
    consoleError.mockRestore()
  })

  it('renders a manual retry instead of auto-redirecting on a failed bridge', async () => {
    window.history.replaceState({}, '', '/login?session_id=abc123')
    handleSSOLogin.mockResolvedValue(null)

    render(<LoginRedirector apiUrl="http://localhost:8000" />)

    await waitFor(() => {
      expect(
        screen.getByText('Sign-in could not be completed')
      ).toBeInTheDocument()
    })
    const retry = screen.getByRole('link', { name: 'Continue to sign in' })
    expect(retry.getAttribute('href')).toContain('reason=bridge_failed')
    expect(retry.getAttribute('href')).toContain('return_to=roboledger')
  })

  it('consumes a session_id handoff without redirecting to the login home', async () => {
    window.history.replaceState({}, '', '/login?session_id=abc123')
    handleSSOLogin.mockResolvedValue({ id: 'user_123' })

    render(<LoginRedirector apiUrl="http://localhost:8000" />)

    await waitFor(() => {
      expect(handleSSOLogin).toHaveBeenCalledTimes(1)
    })
  })

  it('starts a bound bridge instead of consuming a session_id it never asked for', async () => {
    window.history.replaceState({}, '', '/login?session_id=abc123')
    hasPendingBridge.mockReturnValue(false)
    const replace = vi.fn()
    const realLocation = window.location
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: { ...realLocation, search: '?session_id=abc123', replace },
    })

    try {
      render(<LoginRedirector apiUrl="http://localhost:8000" />)

      await waitFor(() => {
        expect(replace).toHaveBeenCalledTimes(1)
      })
      expect(handleSSOLogin).not.toHaveBeenCalled()
      const target = new URL(replace.mock.calls[0][0] as string)
      expect(target.origin).toBe('https://robosystems.ai')
      expect(target.searchParams.get('nonce_hash')).toBe('ab'.repeat(32))
      expect(target.searchParams.get('session_id')).toBeNull()
      expect(target.searchParams.get('return_to')).toBe('roboledger')
    } finally {
      Object.defineProperty(window, 'location', {
        configurable: true,
        value: realLocation,
      })
    }
  })
})
