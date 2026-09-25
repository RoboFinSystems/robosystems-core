/**
 * The error seam for `@robosystems/client` calls.
 *
 * The generated SDK is built with `throwOnError: false`: an HTTP error, or a
 * request that never reached the server, *resolves* with
 * `{ data: undefined, error, response }` instead of rejecting. Code written
 * as if the SDK throws (a `try/catch` around the call, or `response.data`
 * read without checking `response.error`) treats every failure as success.
 *
 * `unwrapSdk` restores the throwing contract for one call at a time:
 *
 *   const graphs = unwrapSdk(await SDK.getGraphs())
 *
 * It returns `data`, or throws an `ApiError` carrying the HTTP status. The
 * shared client's global `throwOnError` stays false on purpose — some call
 * sites read `response.error` directly, and flipping the default would change
 * all of them at once.
 */

/** Minimal shape of an SDK result (`responseStyle: 'fields'`, the default). */
export interface SdkResult<T> {
  data?: T
  error?: unknown
  response?: { status?: number } | Response
}

export class ApiError extends Error {
  /**
   * HTTP status of the refusal, or 0 when no response was received (network
   * failure, CORS rejection, DNS). Use `isNetworkError` rather than testing 0.
   */
  readonly status: number
  /** Human-readable detail from the response body (FastAPI `detail`). */
  readonly detail: string
  /** Machine-readable code when the body carries one. */
  readonly code?: string
  /** The raw error value the SDK resolved with. */
  readonly body: unknown

  constructor(init: {
    status: number
    detail: string
    code?: string
    body?: unknown
  }) {
    super(init.detail)
    this.name = 'ApiError'
    this.status = init.status
    this.detail = init.detail
    this.code = init.code
    this.body = init.body
  }

  get isNetworkError(): boolean {
    return this.status === 0
  }
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError
}

const asString = (value: unknown): string | undefined =>
  typeof value === 'string' && value.length > 0 ? value : undefined

/** Join a FastAPI 422 `detail[]` list into one line. */
function formatValidationList(items: unknown[]): string {
  return items
    .map((item) => {
      if (typeof item === 'string') return item
      if (item && typeof item === 'object') {
        const entry = item as { msg?: unknown; loc?: unknown }
        const msg = asString(entry.msg)
        if (msg) {
          const loc = Array.isArray(entry.loc)
            ? entry.loc.filter((part) => part !== 'body').join('.')
            : ''
          return loc ? `${loc}: ${msg}` : msg
        }
      }
      return JSON.stringify(item)
    })
    .join(', ')
}

/**
 * Pull `{ detail, code }` out of whatever the SDK resolved as `error`: a
 * FastAPI body (`{ detail }`, `{ detail: { detail, code } }`,
 * `{ detail: [...] }`), a plain string, or a thrown `Error`.
 */
export function extractErrorDetail(error: unknown): {
  detail?: string
  code?: string
} {
  if (error == null) return {}
  if (typeof error === 'string') return { detail: asString(error) }
  if (error instanceof Error) return { detail: asString(error.message) }
  if (typeof error !== 'object') return { detail: String(error) }

  const body = error as Record<string, unknown>
  let code = asString(body.code) ?? asString(body.error_code)
  let detail: string | undefined

  const raw = body.detail
  if (typeof raw === 'string') {
    detail = asString(raw)
  } else if (Array.isArray(raw)) {
    detail = asString(formatValidationList(raw))
  } else if (raw && typeof raw === 'object') {
    const nested = raw as Record<string, unknown>
    code = asString(nested.code) ?? asString(nested.error_code) ?? code
    if (typeof nested.detail === 'string') {
      detail = asString(nested.detail)
    } else if (Array.isArray(nested.detail)) {
      detail = asString(formatValidationList(nested.detail))
    } else {
      detail = asString(nested.message)
    }
  }

  detail = detail ?? asString(body.message) ?? asString(body.error)
  return { detail, code }
}

/** Build an `ApiError` from an SDK result's `error` and `response`. */
export function toApiError(
  error: unknown,
  response?: { status?: number } | Response | null
): ApiError {
  if (error instanceof ApiError) return error
  const status =
    response && typeof response.status === 'number' ? response.status : 0
  const { detail, code } = extractErrorDetail(error)
  return new ApiError({
    status,
    detail:
      detail ??
      (status === 0
        ? 'Unable to reach the server'
        : `Request failed with status ${status}`),
    code,
    body: error,
  })
}

/**
 * Return the SDK result's `data`, or throw an `ApiError` when the call
 * failed. A result whose `error` is set is a failure regardless of `data`.
 */
export function unwrapSdk<T>(result: SdkResult<T>): T {
  if (result && result.error !== undefined && result.error !== null) {
    throw toApiError(result.error, result.response)
  }
  return result.data as T
}

/** Status of an unknown error, or undefined when it carries none. */
export function errorStatus(error: unknown): number | undefined {
  if (error instanceof ApiError) return error.status
  const err = error as { status?: unknown; response?: { status?: unknown } }
  const status = err?.status ?? err?.response?.status
  return typeof status === 'number' ? status : undefined
}

/**
 * Whether a failed call is worth retrying: no response (network), rate
 * limited, or a server error. A 4xx refusal is an answer, not a blip. An
 * error that is not an `ApiError` (a malformed body, a thrown TypeError) is
 * treated as transient.
 */
export function isTransientError(error: unknown): boolean {
  if (!(error instanceof ApiError)) return true
  return error.status === 0 || error.status === 429 || error.status >= 500
}

/**
 * Whether an error is the server refusing the session itself (401, or 403
 * for a deactivated account) rather than an outage or a network drop.
 */
export function isSessionRejection(error: unknown): boolean {
  return (
    error instanceof ApiError && (error.status === 401 || error.status === 403)
  )
}
