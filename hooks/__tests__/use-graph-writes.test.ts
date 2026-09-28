import { renderHook } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { emitGraphWrites } from '../../lib/graph-writes'
import { useGraphWrites } from '../use-graph-writes'

const WRITE = { operation: 'create-agent', id: 'agt_1', name: 'Acme' }

describe('useGraphWrites', () => {
  it('calls back for writes to its graph only', () => {
    const onWrites = vi.fn()
    renderHook(() => useGraphWrites('kg_1', onWrites))

    emitGraphWrites('kg_other', [WRITE])
    expect(onWrites).not.toHaveBeenCalled()

    emitGraphWrites('kg_1', [WRITE])
    expect(onWrites).toHaveBeenCalledWith([WRITE])
  })

  it('does nothing without a graph', () => {
    const onWrites = vi.fn()
    renderHook(() => useGraphWrites(null, onWrites))
    emitGraphWrites('kg_1', [WRITE])
    expect(onWrites).not.toHaveBeenCalled()
  })

  it('calls the latest callback and stops on unmount', () => {
    const first = vi.fn()
    const second = vi.fn()
    const { rerender, unmount } = renderHook(
      ({ cb }) => useGraphWrites('kg_1', cb),
      { initialProps: { cb: first } }
    )
    rerender({ cb: second })
    emitGraphWrites('kg_1', [WRITE])
    expect(first).not.toHaveBeenCalled()
    expect(second).toHaveBeenCalledTimes(1)

    unmount()
    emitGraphWrites('kg_1', [WRITE])
    expect(second).toHaveBeenCalledTimes(1)
  })
})
