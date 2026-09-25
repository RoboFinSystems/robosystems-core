// Cross-app handoff against the real @robosystems/client.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API,
  json,
  seedToken,
  stubFetch,
  type FetchStub,
} from '../../test/sdk-fetch'
import { SSOManager } from '../sso'

const ME = { id: 'u1', email: 'a@b.c' }
let net: FetchStub
let loc: { href: string; search: string; pathname: string }
const realLocation = window.location

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  net = stubFetch((req) => {
    if (req.url.endsWith('/v1/auth/sso-token')) {
      return json(200, { token: 'sso-tok', expires_at: 'x', apps: [] })
    }
    if (req.url.endsWith('/v1/auth/sso-exchange')) {
      return json(200, { session_id: 'sess-1', redirect_url: 'x' })
    }
    if (req.url.endsWith('/v1/auth/sso-complete')) {
      return json(200, { user: ME, token: 't', expires_in: 1800 })
    }
    return json(404, { detail: 'not found' })
  })
  loc = {
    href: 'https://robosystems.ai/login',
    search: '',
    pathname: '/login',
  }
  Object.defineProperty(window, 'location', {
    value: loc,
    writable: true,
    configurable: true,
  })
  vi.spyOn(window.history, 'replaceState').mockImplementation(() => undefined)
})
afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  })
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('the return path travels only in the handoff URL', () => {
  it('a handoff out of this app leaves no hint behind', async () => {
    seedToken('tok')
    const sso = new SSOManager(API)
    const url = await sso.getSSORedirectUrl('roboledger', '/ledger/close')
    expect(new URL(url).searchParams.get('returnUrl')).toBe('/ledger/close')

    await sso.navigateToApp('roboledger', '/graphs/new')
    expect(new URL(loc.href).searchParams.get('session_id')).toBe('sess-1')

    expect(sessionStorage.getItem('sso_return_url')).toBeNull()
    expect(sessionStorage.getItem('sso_target_app')).toBeNull()
  })

  it('a handoff into this app with no returnUrl never navigates, whatever sessionStorage holds', async () => {
    // Left by an older version, or by any earlier hop out of this tab.
    sessionStorage.setItem('sso_return_url', '/graphs/new')
    loc.search = '?session_id=sess-1'
    loc.href = 'https://robosystems.ai/login?session_id=sess-1'

    vi.useFakeTimers({ toFake: ['setTimeout'] })
    const user = await new SSOManager(API).handleSSOLogin()
    vi.advanceTimersByTime(500)

    expect(user?.id).toBe('u1')
    expect(loc.href).toBe('https://robosystems.ai/login?session_id=sess-1')
    expect(net.requests('POST', '/v1/auth/sso-complete')).toHaveLength(1)
    // The stale key is cleared on the way through.
    expect(sessionStorage.getItem('sso_return_url')).toBeNull()
  })

  it('a handoff with a returnUrl still lands on it', async () => {
    loc.search = '?session_id=sess-1&returnUrl=%2Freports'
    loc.href = 'https://robosystems.ai/login' + loc.search

    vi.useFakeTimers({ toFake: ['setTimeout'] })
    await new SSOManager(API).handleSSOLogin()
    vi.advanceTimersByTime(500)
    expect(loc.href).toBe('/reports')
  })
})
