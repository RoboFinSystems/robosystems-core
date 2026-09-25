// AuthProvider session lifecycle against the real @robosystems/client.
import { act, render, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API,
  json,
  networkDown,
  seedToken,
  stubFetch,
  type FetchStub,
  type Handler,
} from '../../test/sdk-fetch'
import { AuthProvider, useAuth } from '../AuthProvider'

// Server actions: no Next runtime here.
vi.mock('../../actions/graph-actions', () => ({
  clearGraphSelection: vi.fn(async () => undefined),
}))
vi.mock('../../actions/entity-actions', () => ({
  clearEntitySelection: vi.fn(async () => undefined),
}))

const ME = { id: 'u1', email: 'a@b.c' }
const meOk: Handler = (r) =>
  r.url.endsWith('/v1/auth/me') ? json(200, ME) : json(200, {})

let net: FetchStub
let loc: { href: string; search: string; pathname: string; hostname: string }
const realLocation = window.location

beforeEach(() => {
  localStorage.clear()
  sessionStorage.clear()
  net = stubFetch(meOk)
  loc = {
    href: 'https://roboledger.ai/home',
    search: '',
    pathname: '/home',
    hostname: 'roboledger.ai',
  }
  Object.defineProperty(window, 'location', {
    value: loc,
    writable: true,
    configurable: true,
  })
})

afterEach(() => {
  Object.defineProperty(window, 'location', {
    value: realLocation,
    writable: true,
    configurable: true,
  })
  vi.restoreAllMocks()
})

let auth: ReturnType<typeof useAuth> | null = null
const Probe = () => {
  auth = useAuth()
  return null
}

async function signedIn() {
  seedToken('tok')
  render(
    <AuthProvider apiUrl={API}>
      <Probe />
    </AuthProvider>
  )
  await waitFor(() => expect(auth!.isAuthenticated).toBe(true))
}

/** Refocus the tab after the auth client's 30s success cache has lapsed. */
async function refocusLater(ms = 31_000) {
  const now = Date.now()
  vi.spyOn(Date, 'now').mockReturnValue(now + ms)
  await act(async () => {
    window.dispatchEvent(new Event('focus'))
  })
  // Let the heartbeat's request settle.
  await act(async () => {
    await new Promise((r) => setTimeout(r, 30))
  })
}

describe('heartbeat: only a refusal ends the session', () => {
  it.each([
    ['a 503', () => json(503, { detail: 'Service Unavailable' })],
    ['a 429', () => json(429, { detail: 'Too many requests' })],
    ['a dropped connection', networkDown],
  ])('%s on /me keeps the user signed in', async (_label, handler) => {
    await signedIn()
    net.setHandler(handler as Handler)
    await refocusLater()

    expect(net.requests('GET', '/v1/auth/me').length).toBeGreaterThan(1)
    expect(loc.href).toBe('https://roboledger.ai/home')
    expect(localStorage.getItem('robosystems_jwt_token')).toBe('tok')
    expect(auth!.isAuthenticated).toBe(true)
  })

  it('backs off: a second focus inside the backoff window sends nothing', async () => {
    await signedIn()
    net.setHandler(() => json(503, { detail: 'down' }))
    await refocusLater()
    const afterFirst = net.requests('GET', '/v1/auth/me').length
    await act(async () => {
      window.dispatchEvent(new Event('focus'))
      await new Promise((r) => setTimeout(r, 20))
    })
    expect(net.requests('GET', '/v1/auth/me').length).toBe(afterFirst)
  })

  it('a 401 from /me logs out locally, without a server logout', async () => {
    await signedIn()
    net.setHandler(() => json(401, { detail: 'Invalid or expired token' }))
    await refocusLater()

    await waitFor(() => expect(loc.href).toBe('/login?reason=session_invalid'))
    expect(localStorage.getItem('robosystems_jwt_token')).toBeNull()
    expect(net.requests('POST', '/v1/auth/logout')).toHaveLength(0)
  })

  it('renews a token that expired while the tab slept instead of logging out', async () => {
    await signedIn()
    // The tab slept past expiry but inside the refresh grace.
    localStorage.setItem(
      'robosystems_jwt_expiry',
      String(Date.now() + 31_000 - 60_000)
    )
    net.setHandler((r) => {
      if (r.url.endsWith('/v1/auth/refresh')) {
        return r.headers.get('Authorization') === 'Bearer tok'
          ? json(200, { user: ME, token: 'tok2', expires_in: 1800 })
          : json(401, { detail: 'Not authenticated' })
      }
      if (r.url.endsWith('/v1/auth/me')) {
        return r.headers.get('Authorization') === 'Bearer tok2'
          ? json(200, ME)
          : json(401, { detail: 'Not authenticated' })
      }
      return json(200, {})
    })
    await refocusLater()

    await waitFor(() =>
      expect(localStorage.getItem('robosystems_jwt_token')).toBe('tok2')
    )
    expect(loc.href).toBe('https://roboledger.ai/home')
  })
})

describe('page load', () => {
  it('retries a transient /me failure instead of treating it as logged out', async () => {
    seedToken('tok')
    let n = 0
    net.setHandler((r) =>
      r.url.endsWith('/v1/auth/me')
        ? ++n === 1
          ? json(503, { detail: 'deploying' })
          : json(200, ME)
        : json(200, {})
    )
    render(
      <AuthProvider apiUrl={API}>
        <Probe />
      </AuthProvider>
    )
    await waitFor(() => expect(auth!.isAuthenticated).toBe(true), {
      timeout: 4000,
    })
    expect(n).toBe(2)
  })
})

describe('Stay Logged In', () => {
  it('a successful refresh dismisses the session warning', async () => {
    await signedIn()
    // Put the provider into the warning state the way it gets there: a
    // background refresh that fails while the token is close to expiry.
    localStorage.setItem(
      'robosystems_jwt_expiry',
      String(Date.now() + 2 * 60_000)
    )
    net.setHandler((r) =>
      r.url.endsWith('/v1/auth/refresh')
        ? json(503, { detail: 'down' })
        : meOk(r)
    )
    await refocusLater()
    await waitFor(() => expect(auth!.sessionWarning.show).toBe(true), {
      timeout: 15_000,
    })

    net.setHandler((r) =>
      r.url.endsWith('/v1/auth/refresh')
        ? json(200, { user: ME, token: 'tok2', expires_in: 1800 })
        : meOk(r)
    )
    await act(async () => {
      await auth!.refreshSession(true)
    })
    expect(localStorage.getItem('robosystems_jwt_token')).toBe('tok2')
    expect(auth!.sessionWarning.show).toBe(false)
  }, 30_000)
})
