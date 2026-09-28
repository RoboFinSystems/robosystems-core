/**
 * A write an operator made, as the API reports it in `metadata.writes`.
 * `id` is null when the tool returned no object id (for example a memory).
 */
export interface GraphWrite {
  operation: string
  id: string | null
  name: string | null
  block_type?: string
}

export interface GraphWritesDetail {
  graphId: string
  writes: GraphWrite[]
}

/** Window event fired after the console changes a graph. */
export const GRAPH_WRITES_EVENT = 'robosystems:graph-writes'

/** Tell any page showing `graphId` that it changed. No-op when nothing was written. */
export function emitGraphWrites(graphId: string, writes: GraphWrite[]): void {
  if (typeof window === 'undefined' || writes.length === 0) return
  window.dispatchEvent(
    new CustomEvent<GraphWritesDetail>(GRAPH_WRITES_EVENT, {
      detail: { graphId, writes },
    })
  )
}

/** Read `metadata.writes` defensively: anything malformed yields no writes. */
export function readGraphWrites(metadata: unknown): GraphWrite[] {
  const writes = (metadata as { writes?: unknown } | null | undefined)?.writes
  if (!Array.isArray(writes)) return []
  return writes.filter(
    (w): w is GraphWrite =>
      typeof w === 'object' &&
      w !== null &&
      typeof (w as GraphWrite).operation === 'string'
  )
}
