import { APP_CONFIGS, getLoginHomeUrl } from './config'

/**
 * Helpers for the centralized login home.
 *
 * Interactive auth (login/register/verify/reset) renders on one designated
 * app — the "login home" — and product apps redirect to it carrying a
 * `return_to` value so the user is bridged back after authenticating.
 *
 * `return_to` grammar: `app` or `app:/path`. The app segment is validated
 * against APP_CONFIGS; the path must be a same-app relative path. Never a
 * free-form URL — an open redirect on a login surface is a phishing
 * amplifier.
 */

export interface ParsedReturnTo {
  app: string
  /** Relative path on the target app, or null for its default landing. */
  path: string | null
}

/**
 * True when `path` is a same-app relative path. Rejects scheme-relative
 * URLs ("//host"), absolute URLs, and backslashes (browsers normalize
 * "/\host" to "//host").
 */
export function isSafeRelativePath(path: string): boolean {
  return path.startsWith('/') && !path.startsWith('//') && !path.includes('\\')
}

/** Build a `return_to` value. An unsafe path degrades to app-only. */
export function buildReturnTo(app: string, path?: string | null): string {
  if (path && isSafeRelativePath(path)) {
    return `${app}:${path}`
  }
  return app
}

/**
 * Parse a raw `return_to` query value (already URL-decoded by
 * URLSearchParams — do not decode again). Unknown apps return null;
 * an unsafe path degrades to the app's default landing.
 */
export function parseReturnTo(
  raw: string | null | undefined
): ParsedReturnTo | null {
  if (!raw) {
    return null
  }
  const separator = raw.indexOf(':')
  const app = separator === -1 ? raw : raw.slice(0, separator)
  const path = separator === -1 ? null : raw.slice(separator + 1)

  if (!APP_CONFIGS[app]) {
    return null
  }
  if (path !== null && !isSafeRelativePath(path)) {
    return { app, path: null }
  }
  return { app, path }
}

export interface LoginHomeUrlOptions {
  /** `return_to` value (build with buildReturnTo). */
  returnTo?: string
  /** Sign-in notice key (e.g. session_expired) rendered by the login home. */
  reason?: string
  /**
   * Query params to carry through to the login home (e.g. `invite`).
   * Params owned by the redirect/bridge flow are dropped.
   */
  forwardParams?: URLSearchParams
}

/** Params the redirect/bridge flow owns; never forwarded verbatim. */
const OWNED_PARAMS = new Set(['session_id', 'returnUrl', 'return_to', 'reason'])

/** Build an absolute URL on the login home for the given auth surface. */
export function buildLoginHomeUrl(
  mode: 'login' | 'register' | 'logout',
  options: LoginHomeUrlOptions = {}
): string {
  const url = new URL(`/${mode}`, getLoginHomeUrl())
  if (options.forwardParams) {
    options.forwardParams.forEach((value, key) => {
      if (!OWNED_PARAMS.has(key)) {
        url.searchParams.append(key, value)
      }
    })
  }
  if (options.returnTo) {
    url.searchParams.set('return_to', options.returnTo)
  }
  if (options.reason) {
    url.searchParams.set('reason', options.reason)
  }
  return url.toString()
}
