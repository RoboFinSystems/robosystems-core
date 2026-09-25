'use client'

import { useCallback, useRef, useState } from 'react'

// Import SDK extensions - check at runtime
const getSDKExtensions = async () => {
  try {
    return await import('@robosystems/client/clients')
  } catch (error) {
    console.error('SDK extensions not available:', error)
    return null
  }
}

export interface StreamingQueryState {
  isStreaming: boolean
  results: any[]
  error: string | null
  progress: number | null
  totalRows: number | null
  currentRow: number | null
  status:
    'idle' | 'connecting' | 'streaming' | 'completed' | 'error' | 'cancelled'
  creditsUsed: number | null
  cached: boolean
  duration: number | null
}

export interface UseStreamingQueryResult extends StreamingQueryState {
  executeQuery: (
    graphId: string,
    query: string,
    parameters?: Record<string, any>
  ) => Promise<void>
  cancelQuery: () => void
  reset: () => void
}

/**
 * Invalidate the current query run and end its stream. The generator (and
 * its request) ends once its pending read settles; the read loop also checks
 * the run number, so nothing from the old run is written.
 */
function stopRun(
  runRef: { current: number },
  iteratorRef: { current: AsyncIterator<unknown> | null }
) {
  runRef.current++
  const iterator = iteratorRef.current
  iteratorRef.current = null
  iterator?.return?.()?.catch?.(() => undefined)
}

/**
 * Hook for streaming query results using SDK extensions when available
 * Falls back to manual SSE implementation for older SDK versions
 */
export function useStreamingQuery(): UseStreamingQueryResult {
  const [state, setState] = useState<StreamingQueryState>({
    isStreaming: false,
    results: [],
    error: null,
    progress: null,
    totalRows: null,
    currentRow: null,
    status: 'idle',
    creditsUsed: null,
    cached: false,
    duration: null,
  })

  const startTimeRef = useRef<number | null>(null)
  // Each query run gets a number; cancelling or resetting moves it on, and a
  // run whose number is no longer current stops and writes nothing.
  const runRef = useRef(0)
  const iteratorRef = useRef<AsyncIterator<unknown> | null>(null)

  const stopCurrentRun = useCallback(() => stopRun(runRef, iteratorRef), [])

  const reset = useCallback(() => {
    stopCurrentRun()
    setState({
      isStreaming: false,
      results: [],
      error: null,
      progress: null,
      totalRows: null,
      currentRow: null,
      status: 'idle',
      creditsUsed: null,
      cached: false,
      duration: null,
    })
  }, [stopCurrentRun])

  const cancelQuery = useCallback(() => {
    stopCurrentRun()
    setState((prev) => ({
      ...prev,
      isStreaming: false,
      status: 'cancelled',
      error: 'Query was cancelled',
    }))
  }, [stopCurrentRun])

  const executeQuery = useCallback(
    async (
      graphId: string,
      query: string,
      parameters?: Record<string, any>
    ) => {
      // The run starts now, so a cancel while the SDK loads retires it.
      stopRun(runRef, iteratorRef)
      const runId = runRef.current

      // Get SDK extensions at runtime
      const sdkExtensions = await getSDKExtensions()
      if (runRef.current !== runId) return

      // Require SDK extensions - fail fast if not available
      if (!sdkExtensions?.streamQuery) {
        throw new Error(
          'SDK extensions not available. Please install @robosystems/client with extensions support.'
        )
      }

      return executeQueryWithExtensions(
        runId,
        graphId,
        query,
        sdkExtensions,
        parameters
      )
    },
    []
  )

  // Helper function to execute query with SDK extensions
  const executeQueryWithExtensions = async (
    runId: number,
    graphId: string,
    query: string,
    sdkExtensions: any,
    parameters?: Record<string, any>
  ) => {
    const isCurrent = () => runRef.current === runId

    try {
      // Reset state for new query
      setState({
        isStreaming: true,
        results: [],
        error: null,
        progress: 0,
        totalRows: null,
        currentRow: 0,
        status: 'connecting',
        creditsUsed: null,
        cached: false,
        duration: null,
      })

      startTimeRef.current = Date.now()

      // Use the centralized streamQuery function with proper authentication
      const iterator = sdkExtensions.streamQuery(
        graphId,
        query,
        parameters,
        100
      )
      iteratorRef.current = iterator

      setState((prev) => ({ ...prev, status: 'streaming' }))

      let rowCount = 0
      const allResults: any[] = []

      for await (const batch of iterator) {
        if (!isCurrent()) return
        // Handle both single rows and batches
        const rows = Array.isArray(batch) ? batch : [batch]

        for (const row of rows) {
          rowCount++
          allResults.push(row)
        }

        // Update state with progress
        setState((prev) => ({
          ...prev,
          results: [...allResults],
          currentRow: rowCount,
          progress: prev.totalRows
            ? Math.round((rowCount / prev.totalRows) * 100)
            : null,
        }))
      }

      if (!isCurrent()) return
      if (iteratorRef.current === iterator) iteratorRef.current = null
      const duration = Date.now() - (startTimeRef.current ?? Date.now())

      setState((prev) => ({
        ...prev,
        isStreaming: false,
        status: 'completed',
        results: allResults,
        totalRows: rowCount,
        currentRow: rowCount,
        progress: 100,
        duration,
      }))
    } catch (error) {
      if (!isCurrent()) return
      const errorMessage =
        error instanceof Error ? error.message : 'Query execution failed'

      setState((prev) => ({
        ...prev,
        isStreaming: false,
        status: 'error',
        error: errorMessage,
      }))
    }
  }

  return {
    ...state,
    executeQuery,
    cancelQuery,
    reset,
  }
}
