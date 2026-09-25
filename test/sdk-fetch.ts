/**
 * Network-edge stub for `*.sdk.test.*` files, which run against the real
 * `@robosystems/client`. Tests describe the server; the SDK does the rest,
 * including resolving (not throwing) `{ error, response }` on a refusal.
 */
import { client } from '@robosystems/client'
import { vi } from 'vitest'

export type Handler = (req: Request) => Response | Promise<Response>

export const API = 'http://api.test'

export const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

/** A `fetch` that rejects the way a dropped connection does. */
export const networkDown: Handler = () => {
  throw new TypeError('Failed to fetch')
}

export interface FetchStub {
  calls: Request[]
  setHandler: (handler: Handler) => void
  requests: (method: string, pathFragment: string) => Request[]
}

/** Install the stub and point the shared SDK client at it. */
export function stubFetch(initial: Handler = () => json(200, {})): FetchStub {
  let handler = initial
  const calls: Request[] = []
  globalThis.fetch = vi.fn(async (input: RequestInfo | URL, init?: any) => {
    const req =
      input instanceof Request ? input : new Request(String(input), init)
    calls.push(req)
    return handler(req)
  }) as unknown as typeof fetch
  client.setConfig({ baseUrl: API })
  return {
    calls,
    setHandler: (next) => {
      handler = next
    },
    requests: (method, pathFragment) =>
      calls.filter((c) => c.method === method && c.url.includes(pathFragment)),
  }
}

/** Store a session token the way a login does. */
export function seedToken(token = 'tok', expiresInMs = 20 * 60_000) {
  localStorage.setItem('robosystems_jwt_token', token)
  localStorage.setItem(
    'robosystems_jwt_expiry',
    String(Date.now() + expiresInMs)
  )
  localStorage.setItem('robosystems_jwt_threshold', String(5 * 60_000))
}
