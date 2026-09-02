import { render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import type { LandingFooterProps } from '../LandingFooter'

// The Company column resolves Research and Blog against which app is running, so each
// case loads the footer fresh with CURRENT_APP mocked to that app.
const APPS: Record<string, { displayName: string; url: string }> = {
  robosystems: { displayName: 'RoboSystems', url: 'https://robosystems.ai' },
  roboledger: { displayName: 'RoboLedger', url: 'https://roboledger.ai' },
  roboinvestor: { displayName: 'RoboInvestor', url: 'https://roboinvestor.ai' },
}

async function renderAs(app: string, props: Partial<LandingFooterProps> = {}) {
  vi.resetModules()
  vi.doMock('../../../auth-core/config', () => ({
    CURRENT_APP: app,
    getAppConfig: (name: string) => APPS[name],
  }))
  const { LandingFooter } = await import('../LandingFooter')
  return render(
    <LandingFooter tagline="Tagline" productLinks={[]} {...props} />
  )
}

const link = (name: string) => screen.getByRole('link', { name })

describe('LandingFooter company links', () => {
  afterEach(() => {
    vi.doUnmock('../../../auth-core/config')
  })

  it('sends Research to roboinvestor.ai from another app, in a new tab', async () => {
    await renderAs('roboledger')
    expect(link('Research')).toHaveAttribute(
      'href',
      'https://roboinvestor.ai/research'
    )
    expect(link('Research')).toHaveAttribute('target', '_blank')
  })

  it('keeps Research on the same site inside roboinvestor', async () => {
    await renderAs('roboinvestor')
    expect(link('Research')).toHaveAttribute('href', '/research')
    expect(link('Research')).not.toHaveAttribute('target')
  })

  it('defaults Blog to the platform blog from another app', async () => {
    await renderAs('roboledger')
    expect(link('Blog')).toHaveAttribute('href', 'https://robosystems.ai/blog')
    expect(link('Blog')).toHaveAttribute('target', '_blank')
  })

  it('sends Blog to the app’s own lane when one is passed', async () => {
    await renderAs('roboledger', { blogHref: '/blog' })
    expect(link('Blog')).toHaveAttribute('href', '/blog')
    expect(link('Blog')).not.toHaveAttribute('target')
  })

  it('serves the platform blog itself on robosystems', async () => {
    await renderAs('robosystems')
    expect(link('Blog')).toHaveAttribute('href', '/blog')
    expect(link('Blog')).not.toHaveAttribute('target')
  })
})
