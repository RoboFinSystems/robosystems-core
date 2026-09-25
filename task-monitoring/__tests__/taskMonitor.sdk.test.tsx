// Polling task monitor against the real @robosystems/client: a failed status
// read resolves `{ error }`, and a transient one must not end monitoring.
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import {
  json,
  networkDown,
  stubFetch,
  type FetchStub,
  type Handler,
} from '../../test/sdk-fetch'
import { useTaskMonitoring } from '../hooks'
import {
  cancelTask,
  getActiveTasks,
  pollTaskStatus,
  stopPollingTask,
  TaskMonitor,
  taskMonitor,
} from '../taskMonitor'

// A fresh operation id per test: a poller left over from an earlier test
// must not consume this test's scripted responses.
let OP = ''
let opSeq = 0
const statusIs = (status: string, extra: Record<string, unknown> = {}) =>
  json(200, { status, operation_id: OP, ...extra })

/**
 * Serve a scripted sequence of status responses for this test's operation
 * (the last one repeats). Requests for any other operation get a 404.
 */
const sequence = (...steps: Handler[]): Handler => {
  let i = 0
  return (req) =>
    req.url.includes(OP)
      ? steps[Math.min(i++, steps.length - 1)](req)
      : json(404, { detail: 'not this test' })
}

let net: FetchStub
let monitor: TaskMonitor
beforeEach(() => {
  OP = `op_TEST${String(++opSeq).padStart(21, '0')}`
  net = stubFetch()
  monitor = new TaskMonitor()
  vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('TaskMonitor.pollTask', () => {
  it('is a singleton', () => {
    expect(TaskMonitor.getInstance()).toBe(taskMonitor)
  })

  it('polls through progress to completion', async () => {
    net.setHandler(
      sequence(
        () => statusIs('pending'),
        () => statusIs('in_progress', { progress: 50 }),
        () => statusIs('retrying'),
        () => statusIs('completed', { details: { graph_id: 'kg1' } })
      )
    )
    const onProgress = vi.fn()
    const onComplete = vi.fn()
    const result = await monitor.pollTask({
      taskId: OP,
      pollInterval: 1,
      onProgress,
      onComplete,
    })
    expect(result.status).toBe('completed')
    expect(onProgress).toHaveBeenCalledTimes(3)
    expect(onComplete).toHaveBeenCalledWith({ graph_id: 'kg1' })
    expect(monitor.getActiveTasks()).toEqual([])
    expect(net.requests('GET', `/v1/operations/${OP}`)).toHaveLength(4)
  })

  it('rejects a failed task with its message', async () => {
    net.setHandler(() => statusIs('failed', { message: 'Quota exceeded' }))
    const onError = vi.fn()
    await expect(
      monitor.pollTask({ taskId: OP, pollInterval: 1, onError })
    ).rejects.toThrow('Quota exceeded')
    expect(onError).toHaveBeenCalledWith('Quota exceeded')
    expect(monitor.getActiveTasks()).toEqual([])
  })

  it('rejects a task cancelled on the server', async () => {
    net.setHandler(() => statusIs('cancelled'))
    await expect(
      monitor.pollTask({ taskId: OP, pollInterval: 1 })
    ).rejects.toThrow('Task was cancelled')
  })

  it('times out after maxAttempts, and names an unknown status', async () => {
    net.setHandler(() => statusIs('in_progress'))
    await expect(
      monitor.pollTask({ taskId: OP, pollInterval: 1, maxAttempts: 3 })
    ).rejects.toThrow('Task polling timeout after 3 attempts')

    net.setHandler(() => statusIs('weird'))
    await expect(
      monitor.pollTask({ taskId: OP, pollInterval: 1, maxAttempts: 2 })
    ).rejects.toThrow('Unknown task status: weird')
  })

  it('rides out a transient 502 and a dropped connection', async () => {
    net.setHandler(
      sequence(
        () => statusIs('in_progress'),
        () => json(502, { detail: 'bad gateway' }),
        networkDown,
        () => statusIs('completed')
      )
    )
    const onError = vi.fn()
    const result = await monitor.pollTask({
      taskId: OP,
      pollInterval: 1,
      onError,
    })
    expect(result.status).toBe('completed')
    expect(onError).not.toHaveBeenCalled()
  })

  it('gives up after repeated transient failures', async () => {
    net.setHandler(() => json(503, { detail: 'unavailable' }))
    await expect(
      monitor.pollTask({ taskId: OP, pollInterval: 1, maxConsecutiveErrors: 3 })
    ).rejects.toMatchObject({ status: 503 })
    expect(net.requests('GET', `/v1/operations/${OP}`)).toHaveLength(3)
  })

  it('fails at once on a refusal that will not change (404)', async () => {
    net.setHandler(() => json(404, { detail: 'Operation not found' }))
    await expect(
      monitor.pollTask({ taskId: OP, pollInterval: 1 })
    ).rejects.toMatchObject({ status: 404, message: 'Operation not found' })
    expect(net.requests('GET', `/v1/operations/${OP}`)).toHaveLength(1)
  })

  it('settles when stopped while a status request is in flight', async () => {
    let release: () => void = () => undefined
    net.setHandler(
      () =>
        new Promise<Response>((resolve) => {
          release = () => resolve(statusIs('in_progress'))
        })
    )
    const polling = monitor.pollTask({ taskId: OP, pollInterval: 1 })
    await waitFor(() => expect(net.calls).toHaveLength(1))

    expect(monitor.stopPolling(OP)).toBe(true)
    release()
    await expect(polling).rejects.toThrow('Task polling was cancelled')
    expect(monitor.getActiveTasks()).toEqual([])
    // Stopping is local: nothing was cancelled on the server.
    expect(net.requests('DELETE', '/v1/operations/')).toHaveLength(0)
  })
})

describe('one poller per task', () => {
  it('polling the same task again replaces the first poller', async () => {
    net.setHandler(() => statusIs('in_progress'))
    const first = monitor.pollTask({ taskId: OP, pollInterval: 5 })
    const second = monitor.pollTask({ taskId: OP, pollInterval: 5 })
    second.catch(() => undefined)
    await expect(first).rejects.toThrow('Task polling was cancelled')
    monitor.stopPolling(OP)
    await expect(second).rejects.toThrow('Task polling was cancelled')
    const after = net.calls.length
    await new Promise((r) => setTimeout(r, 30))
    expect(net.calls.length).toBe(after)
  })
})

describe('TaskMonitor.cancelTask', () => {
  it('cancels on the server and stops watching', async () => {
    net.setHandler((req) =>
      req.method === 'DELETE'
        ? json(200, { status: 'cancelled' })
        : statusIs('in_progress')
    )
    const polling = monitor.pollTask({ taskId: OP, pollInterval: 5 })
    polling.catch(() => undefined)
    expect(await monitor.cancelTask(OP)).toBe(true)
    await expect(polling).rejects.toThrow('Task polling was cancelled')
    expect(net.requests('DELETE', `/v1/operations/${OP}`)).toHaveLength(1)
  })

  it('returns false and keeps watching when the server refuses', async () => {
    net.setHandler((req) =>
      req.method === 'DELETE'
        ? json(409, { detail: 'Operation already finished' })
        : statusIs('in_progress')
    )
    const polling = monitor.pollTask({ taskId: OP, pollInterval: 5 })
    polling.catch(() => undefined)
    expect(await monitor.cancelTask(OP)).toBe(false)
    expect(monitor.getActiveTasks()).toEqual([OP])
    monitor.cancelAllTasks()
    expect(monitor.getActiveTasks()).toEqual([])
  })
})

describe('module utilities', () => {
  it('route through the singleton', async () => {
    net.setHandler((req) =>
      req.method === 'DELETE' ? json(200, {}) : statusIs('in_progress')
    )
    const polling = pollTaskStatus({ taskId: OP, pollInterval: 5 })
    polling.catch(() => undefined)
    expect(getActiveTasks()).toContain(OP)
    expect(stopPollingTask(OP)).toBe(true)
    expect(await cancelTask(OP)).toBe(true)
    expect(getActiveTasks()).not.toContain(OP)
  })
})

describe('useTaskMonitoring', () => {
  it('leaving the page stops polling without cancelling the operation', async () => {
    net.setHandler((req) =>
      req.method === 'DELETE'
        ? json(200, { status: 'cancelled' })
        : statusIs('in_progress')
    )
    const { result, unmount } = renderHook(() => useTaskMonitoring())
    act(() => {
      void result.current
        .startMonitoring(OP, { pollInterval: 5 })
        .catch(() => undefined)
    })
    await waitFor(() =>
      expect(net.requests('GET', '/v1/operations/').length).toBeGreaterThan(0)
    )
    unmount()
    await new Promise((r) => setTimeout(r, 30))
    expect(net.requests('DELETE', '/v1/operations/')).toHaveLength(0)
    expect(taskMonitor.getActiveTasks()).not.toContain(OP)
  })

  it('a single 502 during polling does not end monitoring', async () => {
    net.setHandler(
      sequence(
        () => statusIs('in_progress'),
        () => json(502, { detail: 'bad gateway' }),
        () => statusIs('completed', { details: { ok: true } })
      )
    )
    const { result } = renderHook(() => useTaskMonitoring())
    let outcome: unknown
    await act(async () => {
      outcome = await result.current.startMonitoring(OP, { pollInterval: 1 })
    })
    expect(outcome).toEqual({ ok: true })
    expect(result.current.error).toBeNull()
  })

  it('an explicit cancel reaches the server', async () => {
    net.setHandler((req) =>
      req.method === 'DELETE'
        ? json(200, { status: 'cancelled' })
        : statusIs('in_progress')
    )
    const { result } = renderHook(() => useTaskMonitoring())
    act(() => {
      void result.current
        .startMonitoring(OP, { pollInterval: 5 })
        .catch(() => undefined)
    })
    await waitFor(() => expect(net.calls.length).toBeGreaterThan(0))
    await act(async () => {
      await result.current.cancelTask()
    })
    expect(net.requests('DELETE', `/v1/operations/${OP}`)).toHaveLength(1)
    expect(result.current.error).toBe('Task was cancelled')
    expect(result.current.isLoading).toBe(false)
  })
})
