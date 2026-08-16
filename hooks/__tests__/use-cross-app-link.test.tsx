import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { useCrossAppLink } from '../use-cross-app-link'

const mockGetSSORedirectUrl = vi.fn()

vi.mock('../../auth-core/sso', () => ({
  SSOManager: class {
    getSSORedirectUrl = mockGetSSORedirectUrl
  },
}))

vi.mock('../../auth-core/config', () => ({
  LOGIN_HOME_APP: 'robosystems',
}))

type ChildWindow = {
  location: { href: string }
  close: ReturnType<typeof vi.fn>
}

const createChildWindow = (): ChildWindow => ({
  location: { href: 'about:blank' },
  close: vi.fn(),
})

const SSO_URL =
  'https://robosystems.ai/login?session_id=abc&returnUrl=%2Fsettings'

describe('useCrossAppLink', () => {
  let openSpy: ReturnType<typeof vi.fn>
  let originalLocation: Location

  beforeEach(() => {
    vi.clearAllMocks()
    mockGetSSORedirectUrl.mockResolvedValue(SSO_URL)

    openSpy = vi.fn()
    window.open = openSpy as unknown as typeof window.open

    originalLocation = window.location
    delete (window as { location?: Location }).location
    window.location = { href: 'https://roboledger.ai/home' } as Location
  })

  afterEach(() => {
    window.location = originalLocation
  })

  it('claims the new tab synchronously, before the SSO round-trips', async () => {
    // A window.open() issued after an await is outside the user-gesture
    // stack and gets blocked, so this ordering is the whole point.
    const child = createChildWindow()
    openSpy.mockReturnValue(child)

    let resolveUrl: (url: string) => void = () => {}
    mockGetSSORedirectUrl.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveUrl = resolve
      })
    )

    const { result } = renderHook(() => useCrossAppLink('https://api.test'))

    let pending!: Promise<boolean>
    act(() => {
      pending = result.current.openApp('robosystems', { path: '/settings' })
    })

    expect(openSpy).toHaveBeenCalledWith('', '_blank')
    expect(child.location.href).toBe('about:blank')

    await act(async () => {
      resolveUrl(SSO_URL)
      await pending
    })

    expect(child.location.href).toBe(SSO_URL)
  })

  it('skips the sessionStorage hints when handing off to another tab', async () => {
    openSpy.mockReturnValue(createChildWindow())

    const { result } = renderHook(() => useCrossAppLink('https://api.test'))
    await act(async () => {
      await result.current.openApp('robosystems', { path: '/settings' })
    })

    expect(mockGetSSORedirectUrl).toHaveBeenCalledWith(
      'robosystems',
      '/settings',
      { persistSessionHints: false }
    )
  })

  it('keeps the sessionStorage hints for a same-tab navigation', async () => {
    const { result } = renderHook(() => useCrossAppLink('https://api.test'))
    await act(async () => {
      await result.current.openApp('robosystems', {
        path: '/settings',
        target: '_self',
      })
    })

    expect(openSpy).not.toHaveBeenCalled()
    expect(mockGetSSORedirectUrl).toHaveBeenCalledWith(
      'robosystems',
      '/settings',
      { persistSessionHints: true }
    )
    expect(window.location.href).toBe(SSO_URL)
  })

  it('falls back to a same-tab navigation when the popup is blocked', async () => {
    openSpy.mockReturnValue(null)

    const { result } = renderHook(() => useCrossAppLink('https://api.test'))
    await act(async () => {
      await result.current.openApp('robosystems', { path: '/settings' })
    })

    expect(window.location.href).toBe(SSO_URL)
    expect(mockGetSSORedirectUrl).toHaveBeenCalledWith(
      'robosystems',
      '/settings',
      { persistSessionHints: true }
    )
  })

  it('closes the blank tab and reports failure when the handoff errors', async () => {
    const child = createChildWindow()
    openSpy.mockReturnValue(child)
    mockGetSSORedirectUrl.mockRejectedValue(new Error('exchange failed'))

    const { result } = renderHook(() => useCrossAppLink('https://api.test'))

    let opened: boolean | undefined
    await act(async () => {
      opened = await result.current.openApp('robosystems', {
        path: '/settings',
      })
    })

    expect(opened).toBe(false)
    expect(child.close).toHaveBeenCalled()
    expect(child.location.href).toBe('about:blank')
    expect(window.location.href).toBe('https://roboledger.ai/home')
  })

  it('tracks in-flight state and targets the login home by default', async () => {
    openSpy.mockReturnValue(createChildWindow())

    let resolveUrl: (url: string) => void = () => {}
    mockGetSSORedirectUrl.mockReturnValue(
      new Promise<string>((resolve) => {
        resolveUrl = resolve
      })
    )

    const { result } = renderHook(() => useCrossAppLink('https://api.test'))
    expect(result.current.isOpening).toBe(false)

    let pending!: Promise<boolean>
    act(() => {
      pending = result.current.openLoginHome({ path: '/settings' })
    })

    await waitFor(() => expect(result.current.isOpening).toBe(true))

    await act(async () => {
      resolveUrl(SSO_URL)
      await pending
    })

    expect(mockGetSSORedirectUrl).toHaveBeenCalledWith(
      'robosystems',
      '/settings',
      { persistSessionHints: false }
    )
    expect(result.current.isOpening).toBe(false)
  })
})
