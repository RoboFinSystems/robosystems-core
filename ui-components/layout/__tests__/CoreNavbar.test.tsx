import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
}))

vi.mock('../../../auth-components', () => ({
  AppSwitcher: () => <span />,
}))

vi.mock('../../../auth-components/AuthProvider', () => ({
  useAuth: () => ({ logout: vi.fn() }),
}))

vi.mock('../../../contexts', () => ({
  useSidebarContext: () => ({
    desktop: { isCollapsed: false, toggle: vi.fn() },
    mobile: { isOpen: false, toggle: vi.fn(), close: vi.fn() },
  }),
}))

vi.mock('../../../hooks', () => ({
  useMediaQuery: () => true,
  useUser: () => ({
    user: { name: 'Demo User', email: 'demo@example.com' },
  }),
}))

vi.mock('../account-settings', () => ({
  useAccountSettingsLink: () => ({
    isCrossApp: false,
    href: '/settings',
    isOpening: false,
    description: 'Account settings',
  }),
}))

import { CoreNavbar } from '../CoreNavbar'

const props = { appName: 'RoboSystems', currentApp: 'robosystems' as const }

// Flowbite mounts a dropdown's items only once it is open.
function openUserMenu() {
  fireEvent.click(screen.getByRole('button', { name: 'User menu' }))
}

describe('CoreNavbar user menu', () => {
  it('offers Documentation on this app by default, in a new tab', () => {
    render(<CoreNavbar {...props} />)
    openUserMenu()
    const docs = screen.getByRole('link', { name: /Documentation/ })

    expect(docs.getAttribute('href')).toBe('/docs')
    expect(docs.getAttribute('target')).toBe('_blank')
    expect(docs.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('takes an absolute href for an app with no docs of its own', () => {
    render(
      <CoreNavbar {...props} docsHref="https://robosystems.ai/docs/guides" />
    )
    openUserMenu()

    expect(
      screen.getByRole('link', { name: /Documentation/ }).getAttribute('href')
    ).toBe('https://robosystems.ai/docs/guides')
  })

  it('drops the item when an app passes null', () => {
    render(<CoreNavbar {...props} docsHref={null} />)
    openUserMenu()

    expect(screen.queryByRole('link', { name: /Documentation/ })).toBeNull()
    expect(screen.getByText('Sign out')).toBeDefined()
  })
})
