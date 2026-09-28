'use client'

import { useEffect, useRef } from 'react'

import {
  GRAPH_WRITES_EVENT,
  type GraphWrite,
  type GraphWritesDetail,
} from '../lib/graph-writes'

/**
 * Calls `onWrites` when the console changes the graph a page is showing, so
 * the page can reload what it displays. Writes to other graphs are ignored.
 */
export function useGraphWrites(
  graphId: string | null | undefined,
  onWrites: (writes: GraphWrite[]) => void
): void {
  const onWritesRef = useRef(onWrites)
  onWritesRef.current = onWrites

  useEffect(() => {
    if (!graphId) return
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<GraphWritesDetail>).detail
      if (detail?.graphId === graphId) onWritesRef.current(detail.writes)
    }
    window.addEventListener(GRAPH_WRITES_EVENT, handler)
    return () => window.removeEventListener(GRAPH_WRITES_EVENT, handler)
  }, [graphId])
}
