import { afterEach, describe, expect, it, vi } from 'vitest'

import {
  emitGraphWrites,
  GRAPH_WRITES_EVENT,
  readGraphWrites,
} from '../graph-writes'

describe('graph writes', () => {
  const listener = vi.fn()
  afterEach(() => {
    window.removeEventListener(GRAPH_WRITES_EVENT, listener)
    listener.mockReset()
  })

  it('reads well-formed writes and drops the rest', () => {
    expect(
      readGraphWrites({
        writes: [
          { operation: 'create-agent', id: 'agt_1', name: 'Acme' },
          { id: 'no-operation' },
          null,
          'text',
        ],
      })
    ).toEqual([{ operation: 'create-agent', id: 'agt_1', name: 'Acme' }])
  })

  it('reads no writes from missing or malformed metadata', () => {
    expect(readGraphWrites(undefined)).toEqual([])
    expect(readGraphWrites({})).toEqual([])
    expect(readGraphWrites({ writes: 'nope' })).toEqual([])
  })

  it('emits the graph and its writes', () => {
    window.addEventListener(GRAPH_WRITES_EVENT, listener)
    const writes = [{ operation: 'remember', id: null, name: null }]
    emitGraphWrites('kg_1', writes)
    expect(listener).toHaveBeenCalledTimes(1)
    expect(listener.mock.calls[0][0].detail).toEqual({
      graphId: 'kg_1',
      writes,
    })
  })

  it('emits nothing when nothing was written', () => {
    window.addEventListener(GRAPH_WRITES_EVENT, listener)
    emitGraphWrites('kg_1', [])
    expect(listener).not.toHaveBeenCalled()
  })
})
