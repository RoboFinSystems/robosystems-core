// SSE operation monitoring against the real @robosystems/client
// OperationClient / SSEClient, with EventSource replaced by a scripted fake.
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  API,
  json,
  seedToken,
  stubFetch,
  type FetchStub,
} from '../../test/sdk-fetch'
import {
  OperationOutcomeError,
  useGraphCreation,
  useOperationMonitoring,
} from '../operationHooks'
import {
  MONITORING_STOPPED,
  OperationMonitor,
  operationMonitor,
} from '../operationMonitor'

class FakeEventSource {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSED = 2
  static instances: FakeEventSource[] = []

  readyState = FakeEventSource.CONNECTING
  onopen: (() => void) | null = null
  onerror: ((e: unknown) => void) | null = null
  onmessage: ((e: unknown) => void) | null = null
  private listeners = new Map<string, Array<(e: unknown) => void>>()

  constructor(readonly url: string) {
    FakeEventSource.instances.push(this)
  }
  addEventListener(type: string, fn: (e: unknown) => void) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), fn])
  }
  close() {
    this.readyState = FakeEventSource.CLOSED
  }
  // Test controls. The SDK registers its event listeners once the connect
  // promise resolves, so opening waits a tick before events can be sent.
  async open() {
    this.readyState = FakeEventSource.OPEN
    this.onopen?.()
    await new Promise((r) => setTimeout(r, 0))
  }
  send(type: string, data: unknown) {
    for (const fn of this.listeners.get(type) ?? []) {
      fn({ data: JSON.stringify(data), lastEventId: '' })
    }
  }
  drop() {
    this.onerror?.(new Event('error'))
  }
  get token() {
    return new URL(this.url).searchParams.get('token')
  }
}

const OP = 'op_01HBBBBBBBBBBBBBBBBBBBBBBB'

/**
 * Run `fn` while recording every setTimeout delay. A plain wrapper, not a
 * vi.spyOn: testing-library reads a mocked setTimeout as fake timers.
 */
async function recordTimeouts(fn: () => Promise<void>): Promise<number[]> {
  const delays: number[] = []
  const real = globalThis.setTimeout
  globalThis.setTimeout = ((
    handler: TimerHandler,
    ms?: number,
    ...args: any[]
  ) => {
    delays.push(Number(ms ?? 0))
    return real(handler, ms, ...args)
  }) as typeof setTimeout
  try {
    await fn()
  } finally {
    globalThis.setTimeout = real
  }
  return delays
}

/** The stream for an operation, once the monitor has opened it. */
async function streamFor(operationId = OP, index = 0) {
  let es: FakeEventSource | undefined
  await waitFor(
    () => {
      es = FakeEventSource.instances.filter((i) =>
        i.url.includes(`/v1/operations/${operationId}/stream`)
      )[index]
      expect(es).toBeDefined()
    },
    { timeout: 3000 }
  )
  return es!
}

let net: FetchStub
beforeEach(() => {
  localStorage.clear()
  FakeEventSource.instances = []
  vi.stubGlobal('EventSource', FakeEventSource)
  net = stubFetch()
  seedToken('tok1')
})
afterEach(() => {
  operationMonitor.cleanup()
  vi.unstubAllGlobals()
  vi.useRealTimers()
})

describe('OperationMonitor', () => {
  it('is a singleton', () => {
    expect(OperationMonitor.getInstance()).toBe(operationMonitor)
  })

  it('resolves a completed operation and caches the result', async () => {
    const onProgress = vi.fn()
    const onComplete = vi.fn()
    const monitoring = operationMonitor.monitorOperation({
      operationId: OP,
      onProgress,
      onComplete,
    })
    const es = await streamFor()
    expect(es.url.startsWith(`${API}/v1/operations/${OP}/stream`)).toBe(true)
    await es.open()
    es.send('operation_progress', { progress_percent: 40, message: 'Halfway' })
    es.send('operation_completed', { result: { graph_id: 'kg1' } })

    const result = await monitoring
    expect(result).toMatchObject({
      operation_id: OP,
      status: 'completed',
      result: { graph_id: 'kg1' },
    })
    expect(onProgress).toHaveBeenCalledWith(
      expect.objectContaining({ percent: 40, message: 'Halfway' })
    )
    expect(onComplete).toHaveBeenCalledWith({ graph_id: 'kg1' })
    expect(operationMonitor.getOperationStatus(OP)?.status).toBe('completed')
    expect(operationMonitor.getActiveOperations()).toEqual([])
  })

  it('reports a failed operation as failed', async () => {
    const onError = vi.fn()
    const monitoring = operationMonitor.monitorOperation({
      operationId: OP,
      onError,
    })
    const es = await streamFor()
    await es.open()
    es.send('operation_error', { message: 'Provisioning failed' })
    expect(await monitoring).toMatchObject({
      status: 'failed',
      error: 'Provisioning failed',
    })
    expect(onError).toHaveBeenCalledWith('Provisioning failed')
  })

  it('cancelOperation stops monitoring: stream closed, promise settled', async () => {
    const onError = vi.fn()
    const monitoring = operationMonitor.monitorOperation({
      operationId: OP,
      onError,
    })
    const es = await streamFor()
    await es.open()
    expect(operationMonitor.getActiveOperations()).toEqual([OP])

    expect(operationMonitor.cancelOperation(OP)).toBe(true)
    expect(es.readyState).toBe(FakeEventSource.CLOSED)
    expect(await monitoring).toMatchObject({
      status: 'cancelled',
      error: MONITORING_STOPPED,
    })
    expect(onError).not.toHaveBeenCalled()
    expect(operationMonitor.getActiveOperations()).toEqual([])
    // Stopping is local: the operation is not cancelled on the server.
    expect(net.requests('DELETE', '/v1/operations/')).toHaveLength(0)
    expect(operationMonitor.cancelOperation(OP)).toBe(false)
  })

  it('a reconnect presents the current token, not the one at start', async () => {
    const monitoring = operationMonitor.monitorOperation({ operationId: OP })
    monitoring.catch(() => undefined)
    const first = await streamFor()
    expect(first.token).toBe('tok1')
    await first.open()

    // The JWT rotates, then the stream drops and reconnects.
    seedToken('tok2')
    first.drop()
    const second = await streamFor(OP, 1)
    expect(second.token).toBe('tok2')
  })

  it('applies no timeout unless one is asked for', async () => {
    let monitoring: Promise<{ status: string }> = Promise.resolve({
      status: '',
    })
    let es: FakeEventSource | undefined
    const delays = await recordTimeouts(async () => {
      monitoring = operationMonitor.monitorOperation({ operationId: OP })
      es = await streamFor()
      await es.open()
    })
    // Nothing armed that would end the watch: only the SDK's own short
    // connect / cleanup timers.
    expect(delays.every((ms) => ms < 60_000)).toBe(true)
    es!.send('operation_completed', { result: { ok: true } })
    expect((await monitoring).status).toBe('completed')
  })

  it('an explicit timeout still applies', async () => {
    const delays = await recordTimeouts(async () => {
      const monitoring = operationMonitor.monitorOperation({
        operationId: OP,
        timeout: 123_456,
      })
      monitoring.catch(() => undefined)
      const es = await streamFor()
      await es.open()
    })
    expect(delays).toContain(123_456)
  })

  it('a stop issued before the stream opens is honoured', async () => {
    const onComplete = vi.fn()
    const monitoring = operationMonitor.monitorOperation({
      operationId: OP,
      onComplete,
    })
    // Immediately, while the SDK is still loading.
    expect(operationMonitor.cancelOperation(OP)).toBe(true)
    expect(await monitoring).toMatchObject({
      status: 'cancelled',
      error: MONITORING_STOPPED,
    })
    await new Promise((r) => setTimeout(r, 20))
    for (const es of FakeEventSource.instances) {
      expect(es.readyState).toBe(FakeEventSource.CLOSED)
    }
    expect(onComplete).not.toHaveBeenCalled()
  })
})

describe('useOperationMonitoring', () => {
  it('startMonitoring rejects when the operation fails', async () => {
    const { result } = renderHook(() => useOperationMonitoring())
    let outcome: unknown
    await act(async () => {
      const monitoring = result.current.startMonitoring(OP).catch((e) => e)
      const es = await streamFor()
      await es.open()
      es.send('operation_error', { message: 'Out of capacity' })
      outcome = await monitoring
    })
    expect(outcome).toBeInstanceOf(OperationOutcomeError)
    expect((outcome as OperationOutcomeError).status).toBe('failed')
    expect((outcome as Error).message).toBe('Out of capacity')
    expect(result.current.status).toBe('failed')
    expect(result.current.error).toBe('Out of capacity')
  })

  it('cancelling stops watching and says the operation continues', async () => {
    const { result } = renderHook(() => useOperationMonitoring())
    let monitoring: Promise<unknown> = Promise.resolve()
    act(() => {
      monitoring = result.current.startMonitoring(OP).catch((e) => e)
    })
    const es = await streamFor()
    await es.open()
    await act(async () => {
      await result.current.cancelOperation()
    })
    const outcome = await monitoring
    expect((outcome as OperationOutcomeError).stopped).toBe(true)
    expect(es.readyState).toBe(FakeEventSource.CLOSED)
    expect(result.current.status).toBe('cancelled')
    expect(result.current.error).toMatch(/continues on the server/)
  })

  it('unmount closes the stream', async () => {
    const { result, unmount } = renderHook(() => useOperationMonitoring())
    act(() => {
      void result.current.startMonitoring(OP).catch(() => undefined)
    })
    const es = await streamFor()
    await es.open()
    unmount()
    expect(es.readyState).toBe(FakeEventSource.CLOSED)
    expect(operationMonitor.getActiveOperations()).toEqual([])
  })
})

describe('useGraphCreation.createGraph', () => {
  const accepted = () => json(202, { operationId: OP, status: 'pending' })

  it('sends a generic graph its schema and top-level tags', async () => {
    net.setHandler((req) =>
      req.url.endsWith('/v1/graphs') && req.method === 'POST'
        ? json(200, { graph_id: 'kg_new' })
        : json(404, { detail: 'not found' })
    )
    const schema = { name: 'inventory', nodes: [{ name: 'Product' }] }
    const { result } = renderHook(() => useGraphCreation())
    await act(async () => {
      await result.current.createGraph({
        graph_type: 'generic',
        graph_name: 'Inventory',
        tags: ['prod', 'acme'],
        custom_schema: schema,
      })
    })
    const body = await net.requests('POST', '/v1/graphs')[0].clone().json()
    expect(body.custom_schema).toEqual(schema)
    expect(body.tags).toEqual(['prod', 'acme'])
    expect(body.initial_entity).toBeUndefined()
  })

  it('gives a generic graph without a schema an empty one', async () => {
    net.setHandler(() => json(200, { graph_id: 'kg_new' }))
    const { result } = renderHook(() => useGraphCreation())
    await act(async () => {
      await result.current.createGenericGraph({ graph_name: 'Scratch Pad' })
    })
    const body = await net.requests('POST', '/v1/graphs')[0].clone().json()
    expect(body.custom_schema).toEqual({
      name: 'scratch_pad',
      nodes: [],
      relationships: [],
    })
  })

  it('sends entity graph tags at the top level', async () => {
    net.setHandler(() => json(200, { graph_id: 'kg_new' }))
    const { result } = renderHook(() => useGraphCreation())
    await act(async () => {
      await result.current.createEntityGraph({
        entity_name: 'Acme',
        tags: ['x'],
      })
    })
    const body = await net.requests('POST', '/v1/graphs')[0].clone().json()
    expect(body.tags).toEqual(['x'])
    expect(body.initial_entity.name).toBe('Acme')
    expect(body.custom_schema).toBeUndefined()
  })

  it('rejects when the creation operation fails', async () => {
    net.setHandler(accepted)
    const { result } = renderHook(() => useGraphCreation())
    let outcome: unknown
    await act(async () => {
      const creating = result.current
        .createEntityGraph({ entity_name: 'Acme' })
        .catch((e) => e)
      const es = await streamFor()
      await es.open()
      es.send('operation_error', { message: 'Provisioning failed' })
      outcome = await creating
    })
    expect(outcome).toBeInstanceOf(OperationOutcomeError)
    expect((outcome as Error).message).toBe('Provisioning failed')
  })

  it('surfaces a refused checkout with its validation detail', async () => {
    net.setHandler((req) => {
      if (req.url.includes('/billing/customer')) {
        return json(200, {
          has_payment_method: false,
          invoice_billing_enabled: false,
        })
      }
      if (req.url.includes('/checkout')) {
        return json(422, {
          detail: [
            {
              loc: ['body', 'resource_config', 'custom_schema'],
              msg: 'nodes required',
            },
          ],
        })
      }
      return json(404, { detail: 'not found' })
    })
    const { result } = renderHook(() => useGraphCreation())
    let outcome: unknown
    await act(async () => {
      outcome = await result.current
        .createGraph({
          graph_type: 'generic',
          graph_name: 'Inventory',
          custom_schema: { name: 'inventory' },
          org_id: 'org_1',
        })
        .catch((e) => e)
    })
    expect(net.requests('POST', '/checkout').length).toBe(1)
    expect((outcome as Error).message).toBe(
      'resource_config.custom_schema: nodes required'
    )
  })
})
