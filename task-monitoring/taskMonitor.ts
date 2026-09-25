import * as SDK from '@robosystems/client'
import { isTransientError, unwrapSdk } from '../lib/sdk-errors'
import type { TaskPollingOptions, TaskStatusResponse } from './types'

/** Consecutive transient status-read failures tolerated before giving up. */
const DEFAULT_MAX_CONSECUTIVE_ERRORS = 5
/** Upper bound on the backoff between status reads after a failure. */
const MAX_ERROR_BACKOFF_MS = 30 * 1000

/** Statuses of an operation that has not finished (API `OperationStatus`). */
const NON_TERMINAL_STATUSES = new Set<string>([
  'pending',
  'running',
  'awaiting_input',
  'in_progress',
  'retrying',
])

/** Rejection message when watching stopped locally (`stopPolling`). */
export const POLLING_CANCELLED = 'Task polling was cancelled'

export class TaskMonitor {
  private static instance: TaskMonitor
  private activeTasks = new Map<string, AbortController>()

  static getInstance(): TaskMonitor {
    if (!TaskMonitor.instance) {
      TaskMonitor.instance = new TaskMonitor()
    }
    return TaskMonitor.instance
  }

  async pollTask({
    taskId,
    onProgress,
    onComplete,
    onError,
    pollInterval = 2000,
    maxAttempts = 150, // 5 minutes at 2s intervals
    maxConsecutiveErrors = DEFAULT_MAX_CONSECUTIVE_ERRORS,
  }: TaskPollingOptions): Promise<TaskStatusResponse> {
    let attempts = 0
    let consecutiveErrors = 0
    const abortController = new AbortController()
    // One poller per task: a second pollTask for the same id replaces (and
    // stops) the first, which could otherwise never be stopped.
    this.stopPolling(taskId)
    this.activeTasks.set(taskId, abortController)

    return new Promise((resolve, reject) => {
      let settled = false
      let timer: ReturnType<typeof setTimeout> | null = null

      const finish = (outcome: () => void) => {
        if (settled) return
        settled = true
        if (timer) clearTimeout(timer)
        if (this.activeTasks.get(taskId) === abortController) {
          this.activeTasks.delete(taskId)
        }
        outcome()
      }

      const fail = (error: Error, notify = true) =>
        finish(() => {
          if (notify) onError?.(error.message)
          reject(error)
        })

      // Stopping (unmount, explicit cancel) settles the promise at once, even
      // while a status request is in flight — its answer is then ignored.
      abortController.signal.addEventListener('abort', () =>
        fail(new Error(POLLING_CANCELLED), false)
      )

      const schedule = (delay: number) => {
        if (settled) return
        timer = setTimeout(poll, delay)
      }

      const poll = async () => {
        if (settled) return
        attempts++

        let status: TaskStatusResponse
        try {
          const response = await SDK.getOperationStatus({
            path: { operation_id: taskId },
          })
          if (settled) return
          const data = unwrapSdk(response)
          if (!data) {
            throw new Error('No data received from task status endpoint')
          }
          status = data as unknown as TaskStatusResponse
          consecutiveErrors = 0
        } catch (error) {
          if (settled) return
          // A blip (network, 429, 5xx) says nothing about the task: keep
          // polling with backoff, and only give up after several in a row.
          if (
            isTransientError(error) &&
            ++consecutiveErrors < maxConsecutiveErrors
          ) {
            console.warn('Task status read failed, retrying:', error)
            schedule(
              Math.min(
                pollInterval * 2 ** consecutiveErrors,
                MAX_ERROR_BACKOFF_MS
              )
            )
            return
          }
          console.error('Task polling error:', error)
          fail(
            error instanceof Error ? error : new Error('Unknown error occurred')
          )
          return
        }

        switch (status.status) {
          case 'completed':
            finish(() => {
              onComplete?.(status.details || status)
              resolve(status)
            })
            return

          case 'failed':
            fail(
              new Error(status.message || 'Task failed without error message')
            )
            return

          case 'cancelled':
            fail(new Error('Task was cancelled'))
            return

          default:
            // Non-terminal: the API's pending / running / awaiting_input,
            // older in_progress / retrying, and any status added later.
            onProgress?.(status)
            if (attempts >= maxAttempts) {
              fail(
                new Error(
                  NON_TERMINAL_STATUSES.has(status.status)
                    ? `Task is still ${status.status.replace(/_/g, ' ')} after ${attempts} checks. ` +
                        'It continues on the server; check back later.'
                    : `Unknown task status: ${status.status}`
                )
              )
              return
            }
            schedule(pollInterval)
        }
      }

      // Start polling
      poll()
    })
  }

  /**
   * Stop watching a task locally. The operation itself keeps running on the
   * server — this is what leaving a page should do.
   */
  stopPolling(taskId: string): boolean {
    const abortController = this.activeTasks.get(taskId)
    if (!abortController) return false
    this.activeTasks.delete(taskId)
    abortController.abort()
    return true
  }

  /**
   * Cancel the operation on the server, then stop watching it. Only for an
   * explicit user action. Returns false when the server refused — the task
   * is then still being watched, and its real outcome still arrives.
   */
  async cancelTask(taskId: string): Promise<boolean> {
    try {
      unwrapSdk(
        await SDK.cancelOperation({
          path: { operation_id: taskId },
        })
      )
    } catch (error) {
      console.error('Failed to cancel task:', error)
      return false
    }
    this.stopPolling(taskId)
    return true
  }

  cancelAllTasks(): void {
    for (const taskId of Array.from(this.activeTasks.keys())) {
      this.stopPolling(taskId)
    }
  }

  getActiveTasks(): string[] {
    return Array.from(this.activeTasks.keys())
  }
}

// Utility functions for easier usage
export const taskMonitor = TaskMonitor.getInstance()

export const pollTaskStatus = (options: TaskPollingOptions) => {
  return taskMonitor.pollTask(options)
}

export const cancelTask = (taskId: string) => {
  return taskMonitor.cancelTask(taskId)
}

export const stopPollingTask = (taskId: string) => {
  return taskMonitor.stopPolling(taskId)
}

export const getActiveTasks = () => {
  return taskMonitor.getActiveTasks()
}
