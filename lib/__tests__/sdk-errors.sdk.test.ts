import { deleteUserPasskey, getGraphs } from '@robosystems/client'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  json,
  networkDown,
  stubFetch,
  type FetchStub,
} from '../../test/sdk-fetch'
import {
  ApiError,
  isSessionRejection,
  isTransientError,
  unwrapSdk,
} from '../sdk-errors'

let net: FetchStub
beforeEach(() => {
  net = stubFetch()
})

describe('unwrapSdk', () => {
  it('throws ApiError with the status for a resolved error shape', () => {
    const call = () =>
      unwrapSdk({ error: { detail: 'x' }, response: { status: 409 } })
    expect(call).toThrow(ApiError)
    try {
      call()
    } catch (err) {
      expect((err as ApiError).status).toBe(409)
      expect((err as ApiError).detail).toBe('x')
    }
  })

  it('returns data on success from the real SDK', async () => {
    net.setHandler(() => json(200, { graphs: [], selectedGraphId: null }))
    expect(unwrapSdk(await getGraphs())).toEqual({
      graphs: [],
      selectedGraphId: null,
    })
  })

  it('carries the status of an HTTP refusal the SDK resolved', async () => {
    net.setHandler(() => json(409, { detail: 'Add another passkey first' }))
    const result = await deleteUserPasskey({
      path: { passkey_id: 'pk' },
      body: { password: 'pw' },
    })
    // The SDK resolves; nothing was thrown.
    expect(result.error).toBeDefined()
    const err = (() => {
      try {
        unwrapSdk(result)
      } catch (e) {
        return e as ApiError
      }
    })()!
    expect(err).toBeInstanceOf(ApiError)
    expect(err.status).toBe(409)
    expect(err.message).toBe('Add another passkey first')
  })

  it('unwraps a nested detail and its code', async () => {
    net.setHandler(() =>
      json(402, { detail: { detail: 'Out of credits', code: 'NO_CREDITS' } })
    )
    const result = await getGraphs()
    try {
      unwrapSdk(result)
      throw new Error('expected a throw')
    } catch (e) {
      expect((e as ApiError).status).toBe(402)
      expect((e as ApiError).detail).toBe('Out of credits')
      expect((e as ApiError).code).toBe('NO_CREDITS')
    }
  })

  it('joins a 422 validation list', async () => {
    net.setHandler(() =>
      json(422, {
        detail: [{ loc: ['body', 'graph_name'], msg: 'field required' }],
      })
    )
    try {
      unwrapSdk(await getGraphs())
      throw new Error('expected a throw')
    } catch (e) {
      expect((e as ApiError).detail).toBe('graph_name: field required')
    }
  })

  it('reports a dropped connection as a network error with status 0', async () => {
    net.setHandler(networkDown)
    try {
      unwrapSdk(await getGraphs())
      throw new Error('expected a throw')
    } catch (e) {
      const err = e as ApiError
      expect(err).toBeInstanceOf(ApiError)
      expect(err.status).toBe(0)
      expect(err.isNetworkError).toBe(true)
      expect(isTransientError(err)).toBe(true)
      expect(isSessionRejection(err)).toBe(false)
    }
  })
})

describe('error classification', () => {
  const at = (status: number) =>
    new ApiError({ status, detail: `status ${status}` })

  it('treats 401 and 403 as the server refusing the session', () => {
    expect(isSessionRejection(at(401))).toBe(true)
    expect(isSessionRejection(at(403))).toBe(true)
    expect(isSessionRejection(at(503))).toBe(false)
    expect(isSessionRejection(new TypeError('Failed to fetch'))).toBe(false)
  })

  it('treats network, 429 and 5xx as transient, other 4xx as final', () => {
    expect(isTransientError(at(429))).toBe(true)
    expect(isTransientError(at(502))).toBe(true)
    expect(isTransientError(at(404))).toBe(false)
    expect(isTransientError(at(401))).toBe(false)
  })
})
