/**
 * Operation Monitor - SSE-based monitoring for unified backend operations
 * Replaces the polling-based TaskMonitor with EventSource streaming
 *
 * Uses SDK extensions when available (@robosystems/client v0.1.21+)
 * No fallback - fails fast if SDK extensions not available
 */

import { client } from '@robosystems/client'

// Import SDK extensions - check at runtime
const getSDKExtensions = async () => {
  try {
    return await import('@robosystems/client/clients')
  } catch (error) {
    console.error('SDK extensions not available:', error)
    return null
  }
}

export type OperationStatus =
  'pending' | 'running' | 'completed' | 'failed' | 'cancelled'

export interface OperationEvent {
  event: string
  data: any
  timestamp?: string
}

export interface OperationProgress {
  percent: number
  message?: string
  current_step?: string
  total_steps?: number
}

export interface OperationResult {
  operation_id: string
  status: OperationStatus
  result?: any
  error?: string
  duration_ms?: number
  events?: OperationEvent[]
}

export interface OperationMonitorOptions {
  operationId: string
  onProgress?: (progress: OperationProgress) => void
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  onEvent?: (event: OperationEvent) => void
  /**
   * Give up watching after this many milliseconds. No default: an operation
   * runs as long as it runs (backups, large graph creations), and a monitor
   * that times out reports a failure for work that is still succeeding.
   */
  timeout?: number
}

/** Error message on a result whose monitoring was stopped locally. */
export const MONITORING_STOPPED = 'Monitoring stopped'

interface ActiveOperation {
  client: { closeAll: () => void }
  stop: () => void
}

export class OperationMonitor {
  private static instance: OperationMonitor
  private activeOperations = new Map<string, ActiveOperation>()
  private operationResults = new Map<string, OperationResult>()

  static getInstance(): OperationMonitor {
    if (!OperationMonitor.instance) {
      OperationMonitor.instance = new OperationMonitor()
    }
    return OperationMonitor.instance
  }

  /**
   * Monitor an operation using SSE streaming
   */
  async monitorOperation({
    operationId,
    onProgress,
    onComplete,
    onError,
    onEvent,
    timeout,
  }: OperationMonitorOptions): Promise<OperationResult> {
    // Get SDK extensions at runtime
    const sdkExtensions = await getSDKExtensions()

    // Require SDK extensions - fail fast if not available
    if (!sdkExtensions?.OperationClient) {
      throw new Error(
        'SDK extensions not available. Please install @robosystems/client with extensions support.'
      )
    }

    return this.monitorWithSDKExtensions(
      {
        operationId,
        onProgress,
        onComplete,
        onError,
        onEvent,
        timeout,
      },
      sdkExtensions
    )
  }

  /**
   * Stop monitoring an operation: closes its stream and settles its
   * `monitorOperation` promise with `status: 'cancelled'` and
   * `error: MONITORING_STOPPED`. Does not cancel the operation itself.
   */
  cancelOperation(operationId: string): boolean {
    const active = this.activeOperations.get(operationId)
    if (!active) return false
    this.activeOperations.delete(operationId)
    try {
      active.stop()
    } catch (error) {
      console.error('Failed to stop operation monitoring:', error)
    }
    return true
  }

  /**
   * Get cached operation status/result
   */
  getOperationStatus(operationId: string): OperationResult | null {
    if (this.operationResults.has(operationId)) {
      return this.operationResults.get(operationId)!
    }

    // Fetching an uncached status would need a synchronous call; until that
    // exists this returns cached results only.
    return null
  }

  /**
   * Clean up operation monitoring resources
   */
  private cleanupOperation(operationId: string): void {
    this.cancelOperation(operationId)
  }

  /**
   * Monitor operation using SDK extensions
   */
  private async monitorWithSDKExtensions(
    options: OperationMonitorOptions,
    sdkExtensions: any
  ): Promise<OperationResult> {
    const { OperationClient, extractTokenFromSDKClient } = sdkExtensions
    const { getToken, getValidToken } =
      await import('../auth-core/token-storage')
    const config = client.getConfig()

    // One client per operation, tracked so `cancelOperation` can close it.
    // The credential is resolved per connect (`tokenProvider`), so a stream
    // that reconnects after the JWT rotates presents the current token; the
    // static `token` only serves SDK versions that predate the provider.
    const operationClient = new OperationClient({
      baseUrl: config.baseUrl || 'http://localhost:8000',
      credentials: 'include',
      token: getToken() || extractTokenFromSDKClient?.() || undefined,
      tokenProvider: async () => (await getValidToken()) ?? null,
      maxRetries: 3,
      retryDelay: 1000,
    })

    const previous = this.activeOperations.get(options.operationId)
    if (previous) this.cancelOperation(options.operationId)

    let stopped = false
    let stopMonitoring: () => void = () => undefined
    const stoppedPromise = new Promise<null>((resolve) => {
      stopMonitoring = () => {
        stopped = true
        resolve(null)
      }
    })
    const entry: ActiveOperation = {
      client: operationClient,
      stop: () => {
        stopMonitoring()
        operationClient.closeAll()
      },
    }
    this.activeOperations.set(options.operationId, entry)

    try {
      const result = await Promise.race([
        operationClient.monitorOperation(options.operationId, {
          onProgress: (progress: {
            progressPercent?: number
            message?: string
            details?: { current_step?: number; total_steps?: number }
          }) => {
            if (stopped) return
            options.onProgress?.({
              percent: progress.progressPercent || 0,
              message: progress.message || '',
              current_step: progress.details?.current_step?.toString(),
              total_steps: progress.details?.total_steps,
            })
          },
          onEvent: (event: { type: string; data: any }) => {
            if (stopped) return
            options.onEvent?.({
              event: event.type,
              data: event.data,
            })
          },
          timeout: options.timeout,
        }),
        stoppedPromise,
      ])

      if (result === null) {
        // Stopped locally: report it without firing the outcome callbacks.
        return {
          operation_id: options.operationId,
          status: 'cancelled',
          error: MONITORING_STOPPED,
        }
      }

      // Map OperationResult (success: boolean) to status string
      const status: OperationStatus = result.success
        ? 'completed'
        : result.error === 'Operation cancelled'
          ? 'cancelled'
          : 'failed'

      // Normalize to documented shape
      const normalizedResult: OperationResult = {
        operation_id: options.operationId,
        status,
        result: result.result,
        error: result.error,
      }

      // Store normalized result in cache
      this.operationResults.set(options.operationId, normalizedResult)

      // Handle different success/failure states properly
      if (status === 'completed') {
        options.onComplete?.(result.result || {})
      } else if (status === 'failed') {
        options.onError?.(result.error || 'Operation failed')
      } else if (status === 'cancelled') {
        options.onError?.(result.error || 'Operation cancelled')
      }

      return normalizedResult
    } finally {
      if (this.activeOperations.get(options.operationId) === entry) {
        this.activeOperations.delete(options.operationId)
      }
      operationClient.closeAll()
    }
  }

  /**
   * Clean up all active operations
   */
  cleanup(): void {
    for (const operationId of Array.from(this.activeOperations.keys())) {
      this.cancelOperation(operationId)
    }
  }

  /**
   * Get list of active operation IDs
   */
  getActiveOperations(): string[] {
    return Array.from(this.activeOperations.keys())
  }

  /**
   * Clear operation results cache
   */
  clearCache(): void {
    this.operationResults.clear()
  }
}

// Export singleton instance and convenience functions
export const operationMonitor = OperationMonitor.getInstance()

export const monitorOperation = (options: OperationMonitorOptions) => {
  return operationMonitor.monitorOperation(options)
}

export const cancelOperation = (operationId: string) => {
  return operationMonitor.cancelOperation(operationId)
}

export const getOperationStatus = (operationId: string) => {
  return operationMonitor.getOperationStatus(operationId)
}

export const getActiveOperations = () => {
  return operationMonitor.getActiveOperations()
}
