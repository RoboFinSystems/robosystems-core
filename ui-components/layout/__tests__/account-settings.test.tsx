import { act, renderHook } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  ACCOUNT_SETTINGS_PATH,
  useAccountSettingsLink,
} from '../account-settings'

const mockIsLoginHome = vi.fn()
const mockOpenLoginHome = vi.fn()

vi.mock('../../../auth-core/config', () => ({
  isLoginHome: () => mockIsLoginHome(),
  getLoginHomeName: () => 'RoboSystems',
}))

vi.mock('../../../hooks/use-cross-app-link', () => ({
  useCrossAppLink: () => ({
    openApp: vi.fn(),
    openLoginHome: mockOpenLoginHome,
    isOpening: false,
  }),
}))

describe('useAccountSettingsLink', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockOpenLoginHome.mockResolvedValue(true)
  })

  it('is an ordinary same-app link on the login home', () => {
    mockIsLoginHome.mockReturnValue(true)

    const { result } = renderHook(() => useAccountSettingsLink())
    const settings = result.current

    // The discriminant is what narrows `href` to a string — a caller that
    // checks it can't accidentally render a link with no destination.
    expect(settings.isCrossApp).toBe(false)
    if (settings.isCrossApp) throw new Error('expected same-app link')

    expect(settings.href).toBe(ACCOUNT_SETTINGS_PATH)
    expect(settings.description).toBe('Settings')
    expect(mockOpenLoginHome).not.toHaveBeenCalled()
  })

  it('hands off to the login home in a new tab from a product app', async () => {
    mockIsLoginHome.mockReturnValue(false)

    const { result } = renderHook(() => useAccountSettingsLink())
    const settings = result.current

    expect(settings.isCrossApp).toBe(true)
    if (!settings.isCrossApp) throw new Error('expected cross-app handoff')

    expect(settings.href).toBeUndefined()
    expect(settings.hostAppName).toBe('RoboSystems')
    expect(settings.description).toBe(
      'Settings (opens RoboSystems in a new tab)'
    )

    await act(async () => {
      await settings.open()
    })

    expect(mockOpenLoginHome).toHaveBeenCalledWith({
      path: ACCOUNT_SETTINGS_PATH,
      target: '_blank',
    })
  })
})
