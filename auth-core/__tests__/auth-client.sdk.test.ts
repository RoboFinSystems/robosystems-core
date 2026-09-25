// RoboSystemsAuthClient against the real @robosystems/client (throwOnError
// false): an HTTP refusal resolves `{ error }`, it does not throw.
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { loginErrorMessage } from '../../auth-components/SignInForm'
import { ApiError } from '../../lib/sdk-errors'
import {
  API,
  json,
  networkDown,
  seedToken,
  stubFetch,
  type FetchStub,
} from '../../test/sdk-fetch'
import { RoboSystemsAuthClient } from '../client'

let net: FetchStub
beforeEach(() => {
  localStorage.clear()
  net = stubFetch()
})

const rejection = async (p: Promise<unknown>) => {
  const err = await p.then(
    () => undefined,
    (e) => e
  )
  expect(err).toBeInstanceOf(ApiError)
  return err as ApiError
}

describe('refusals reject with their status', () => {
  it('deletePasskey rejects on 401 (re-auth failed) and 409 (last passkey)', async () => {
    const c = new RoboSystemsAuthClient(API)
    net.setHandler(() => json(401, { detail: 'Re-authentication failed' }))
    expect(
      (await rejection(c.deletePasskey('pk1', { password: 'wrong' }))).status
    ).toBe(401)
    net.setHandler(() => json(409, { detail: 'Add another passkey first' }))
    const conflict = await rejection(
      c.deletePasskey('pk1', { password: 'right' })
    )
    expect(conflict.status).toBe(409)
    expect(conflict.message).toBe('Add another passkey first')
  })

  it('revokeAPIKey rejects on 500', async () => {
    const c = new RoboSystemsAuthClient(API)
    net.setHandler(() => json(500, { detail: 'boom' }))
    expect((await rejection(c.revokeAPIKey('k1'))).status).toBe(500)
  })

  it('listPasskeys rejects on 403 instead of returning []', async () => {
    const c = new RoboSystemsAuthClient(API)
    net.setHandler(() => json(403, { detail: 'Passkeys are disabled' }))
    expect((await rejection(c.listPasskeys())).status).toBe(403)
  })

  it('passkey option calls reject with the status, not a TypeError', async () => {
    const c = new RoboSystemsAuthClient(API)
    net.setHandler(() => json(401, { detail: 'Invalid MFA token' }))
    expect((await rejection(c.getMfaOptions('m'))).status).toBe(401)
    expect((await rejection(c.getPasskeyReauthOptions())).status).toBe(401)
  })

  it('getCurrentUser tells a refusal, an outage and a dropped connection apart', async () => {
    const statuses: number[] = []
    for (const handler of [
      () => json(401, { detail: 'Invalid or expired token' }),
      () => json(503, { detail: 'unavailable' }),
      networkDown,
    ]) {
      const c = new RoboSystemsAuthClient(API)
      c.clearAuthCache()
      net.setHandler(handler)
      statuses.push((await rejection(c.getCurrentUser())).status)
    }
    expect(statuses).toEqual([401, 503, 0])
  })
})

describe('login failures map to honest messages', () => {
  it('503 is a server problem, 429 a rate limit, a network drop unreachable', async () => {
    const c = new RoboSystemsAuthClient(API)

    net.setHandler(() => json(503, { detail: 'x' }))
    expect(
      loginErrorMessage(await c.login('a@b.c', 'pw').catch((e) => e))
    ).toBe('The server ran into a problem. Please try again in a moment.')

    net.setHandler(() => json(429, { detail: 'x' }))
    expect(
      loginErrorMessage(await c.login('a@b.c', 'pw').catch((e) => e))
    ).toMatch(/Too many sign-in attempts/)

    net.setHandler(networkDown)
    expect(
      loginErrorMessage(await c.login('a@b.c', 'pw').catch((e) => e))
    ).toBe('Unable to reach the server. Check your connection and try again.')

    net.setHandler(() => json(401, { detail: 'Invalid credentials' }))
    expect(
      loginErrorMessage(await c.login('a@b.c', 'pw').catch((e) => e))
    ).toBe('Invalid email or password')
  })
})

describe('email endpoints stay enumeration-safe but surface throttling', () => {
  it('forgotPassword reports only throttling and an unreachable server', async () => {
    const c = new RoboSystemsAuthClient(API)

    net.setHandler(() => json(404, { detail: 'No such user' }))
    expect((await c.forgotPassword('a@b.c')).success).toBe(true)

    // Only the existing-account path does work that can fail, so a 5xx must
    // read like every other outcome.
    net.setHandler(() => json(500, { detail: 'mail provider down' }))
    expect((await c.forgotPassword('a@b.c')).success).toBe(true)

    net.setHandler(() => json(429, { detail: 'slow down' }))
    const limited = await c.forgotPassword('a@b.c')
    expect(limited.success).toBe(false)
    expect(limited.message).toMatch(/Too many requests/)

    net.setHandler(networkDown)
    expect((await c.forgotPassword('a@b.c')).success).toBe(false)
  })

  it('resendVerificationEmail (signed in) also reports outages and an expired session', async () => {
    const c = new RoboSystemsAuthClient(API)
    net.setHandler(() => json(400, { detail: 'Already verified' }))
    expect((await c.resendVerificationEmail('a@b.c')).success).toBe(true)
    net.setHandler(() => json(429, { detail: 'slow down' }))
    expect((await c.resendVerificationEmail('a@b.c')).success).toBe(false)
    net.setHandler(() => json(401, { detail: 'Not authenticated' }))
    expect((await c.resendVerificationEmail('a@b.c')).message).toMatch(
      /session has expired/
    )
    net.setHandler(() => json(503, { detail: 'down' }))
    expect((await c.resendVerificationEmail('a@b.c')).success).toBe(false)
  })
})

describe('the shared SDK client is wrapped once', () => {
  it('per-request token reads do not grow with the number of auth clients', async () => {
    seedToken('tok')
    net.setHandler(() => json(200, { id: 'u', email: 'e@x.test' }))
    const spy = vi.spyOn(Storage.prototype, 'getItem')
    const counts: number[] = []
    for (let i = 0; i < 3; i++) {
      const c = new RoboSystemsAuthClient(API)
      c.clearAuthCache()
      spy.mockClear()
      await c.getCurrentUser()
      counts.push(
        spy.mock.calls.filter(([k]) => k === 'robosystems_jwt_token').length
      )
    }
    spy.mockRestore()
    expect(counts[1]).toBe(counts[0])
    expect(counts[2]).toBe(counts[0])
    expect(net.calls.at(-1)!.headers.get('Authorization')).toBe('Bearer tok')
  })
})

describe('the refresh grace window is reachable', () => {
  it('a just-expired token is presented to /refresh and renewed', async () => {
    seedToken('expired-within-grace', -60_000) // 1 min past expiry
    net.setHandler((req) =>
      req.url.endsWith('/v1/auth/refresh')
        ? json(200, {
            user: { id: 'u1', email: 'a@b.c' },
            token: 'renewed',
            expires_in: 1800,
          })
        : json(401, { detail: 'Not authenticated' })
    )
    const c = new RoboSystemsAuthClient(API)
    await c.refreshSession()
    const refresh = net.requests('POST', '/v1/auth/refresh')[0]
    expect(refresh.headers.get('Authorization')).toBe(
      'Bearer expired-within-grace'
    )
    expect(localStorage.getItem('robosystems_jwt_token')).toBe('renewed')
  })

  it('a refusal for a token another tab already renewed adopts the renewal', async () => {
    seedToken('old', -60_000)
    net.setHandler((req) => {
      if (req.url.endsWith('/v1/auth/refresh')) {
        // The other tab won the race and stored its renewal first.
        seedToken('renewed-by-other-tab')
        return json(401, { detail: 'Token has been revoked' })
      }
      return req.headers.get('Authorization') === 'Bearer renewed-by-other-tab'
        ? json(200, { id: 'u1', email: 'a@b.c' })
        : json(401, { detail: 'Not authenticated' })
    })
    const c = new RoboSystemsAuthClient(API)
    const res = await c.refreshSession()
    expect(res.success).toBe(true)
    expect(res.user.id).toBe('u1')
    expect(localStorage.getItem('robosystems_jwt_token')).toBe(
      'renewed-by-other-tab'
    )
  })

  it('an expired token is not sent on data calls', async () => {
    seedToken('expired', -60_000)
    net.setHandler(() => json(401, { detail: 'Not authenticated' }))
    const c = new RoboSystemsAuthClient(API)
    await c.getCurrentUser().catch(() => undefined)
    expect(net.calls.at(-1)!.headers.get('Authorization')).toBeNull()
    // Kept for the refresh call until the grace runs out.
    expect(localStorage.getItem('robosystems_jwt_token')).toBe('expired')
  })

  it('a token past the grace window is cleared and a refusal is not retried', async () => {
    seedToken('stale', -10 * 60_000)
    net.setHandler(() => json(401, { detail: 'Not authenticated' }))
    const c = new RoboSystemsAuthClient(API)
    const err = await rejection(c.refreshSession())
    expect(err.status).toBe(401)
    expect(net.requests('POST', '/v1/auth/refresh')).toHaveLength(1)
    expect(
      net.requests('POST', '/v1/auth/refresh')[0].headers.get('Authorization')
    ).toBeNull()
    expect(localStorage.getItem('robosystems_jwt_token')).toBeNull()
  })
})
