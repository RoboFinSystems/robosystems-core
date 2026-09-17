import { render, screen } from '@testing-library/react'
import { HiBookOpen, HiHome } from 'react-icons/hi'
import { describe, expect, it, vi } from 'vitest'

vi.mock('next/navigation', () => ({
  usePathname: () => '/home',
}))

vi.mock('../../../contexts', () => ({
  useSidebarContext: () => ({
    desktop: { isCollapsed: false, toggle: vi.fn() },
    mobile: { isOpen: false, close: vi.fn(), toggle: vi.fn() },
  }),
  useOrg: () => ({ currentOrg: null }),
}))

vi.mock('../account-settings', () => ({
  useAccountSettingsLink: () => ({
    isCrossApp: false,
    href: '/settings',
    isOpening: false,
    description: 'Account settings',
  }),
}))

import { CoreSidebar } from '../CoreSidebar'

describe('CoreSidebar links', () => {
  it('opens a target _blank item in a new tab with noopener', () => {
    render(
      <CoreSidebar
        navigationItems={[
          { label: 'Home', href: '/home', icon: HiHome },
          { label: 'Docs', href: '/docs', icon: HiBookOpen, target: '_blank' },
        ]}
      />
    )

    const docs = screen.getAllByRole('link', { name: /Docs/ })[0]
    expect(docs.getAttribute('href')).toBe('/docs')
    expect(docs.getAttribute('target')).toBe('_blank')
    expect(docs.getAttribute('rel')).toBe('noopener noreferrer')
  })

  it('keeps an internal item in the same tab', () => {
    render(
      <CoreSidebar
        navigationItems={[{ label: 'Home', href: '/home', icon: HiHome }]}
      />
    )

    const home = screen.getAllByRole('link', { name: /Home/ })[0]
    expect(home.getAttribute('target')).toBeNull()
    expect(home.getAttribute('rel')).toBeNull()
  })

  it('passes target and rel through for an item inside a group', () => {
    render(
      <CoreSidebar
        navigationItems={[
          {
            label: 'Resources',
            icon: HiBookOpen,
            items: [
              {
                label: 'Guides',
                href: 'https://example.com/docs',
                target: '_blank',
              },
            ],
          },
        ]}
      />
    )

    const guides = screen.getAllByRole('link', {
      name: /Guides/,
      hidden: true,
    })[0]
    expect(guides.getAttribute('target')).toBe('_blank')
    expect(guides.getAttribute('rel')).toBe('noopener noreferrer')
  })
})
