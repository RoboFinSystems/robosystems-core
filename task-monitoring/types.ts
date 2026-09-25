// Define our own TaskStatusResponse interface since the exact SDK type is unclear
export interface TaskStatusResponse {
  status: TaskStatus
  progress?: number
  step?: string
  message?: string
  details?: any
  result?: any
  error?: string
}

export type TaskStatus =
  | 'pending'
  | 'running'
  | 'awaiting_input'
  | 'in_progress'
  | 'retrying'
  | 'completed'
  | 'failed'
  | 'cancelled'

export interface TaskPollingOptions {
  taskId: string
  onProgress?: (status: TaskStatusResponse) => void
  onComplete?: (result: any) => void
  onError?: (error: string) => void
  pollInterval?: number // milliseconds, default 2000
  maxAttempts?: number // default 150 (5 minutes at 2s intervals)
  maxConsecutiveErrors?: number // transient status-read failures tolerated in a row, default 5
}

export interface TaskMonitorState {
  isLoading: boolean
  progress: number | null
  currentStep: string | null
  error: string | null
  taskId: string | null
  result: any | null
}

export interface TaskCreateResponse {
  task_id: string
  status: TaskStatus
  message?: string
}
