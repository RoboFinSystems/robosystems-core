'use client'

import type { ReactNode } from 'react'
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react'
import { clearEntitySelection } from '../actions/entity-actions'
import { clearGraphSelection } from '../actions/graph-actions'
import { performLogoutCleanup } from '../auth-core/cleanup'
import { isTransientError, RoboSystemsAuthClient } from '../auth-core/client'
import { CURRENT_APP, isLoginHome } from '../auth-core/config'
import { useTokenExpiryHandler } from '../auth-core/hooks'
import { buildLoginHomeUrl, buildReturnTo } from '../auth-core/login-home'
import {
  getRefreshToken,
  getTimeUntilExpiry,
  getTokenStatus,
  TOKEN_REFRESH_GRACE_MS,
} from '../auth-core/token-storage'
import type { AuthContextType, AuthUser } from '../auth-core/types'

// Configuration constants
const CACHE_TTL_MS = 5 * 60 * 1000 // 5 minutes
const TOKEN_REFRESH_INTERVAL_MS = 25 * 60 * 1000 // 25 minutes (5 min before 30 min expiry)
const TOKEN_WARNING_CHECK_INTERVAL_MS = 30 * 1000 // 30 seconds - reduced for better battery life
const ACTIVITY_THROTTLE_MS = 1000 // 1 second
const HEARTBEAT_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes - server validation heartbeat
const HEARTBEAT_BACKOFF_BASE_MS = 30 * 1000 // first retry after a transient heartbeat failure
const SESSION_CHECK_MAX_RETRIES = 4 // page-load /me retries on a transient failure
const SESSION_CHECK_BACKOFF_BASE_MS = 1000
const REFRESH_COOLDOWN_MS = 60 * 1000 // 60 seconds - prevent duplicate background refreshes
const CACHE_VERSION = '1' // Increment to invalidate all cached auth data

// Debug logging helper
const debugLog = (message: string, error?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[AuthProvider] ${message}`, error)
  }
}

// Storage error logging helper - logs to console.error for production visibility
const logStorageError = (operation: string, error: unknown) => {
  const message = `[AuthProvider] Storage ${operation} failed - continuing with degraded UX`
  if (process.env.NODE_ENV === 'development') {
    console.debug(message, error)
  } else {
    // In production, log to console.error so errors are visible in monitoring
    console.error(message, error)
  }
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Whether a failure is the server's final answer about this session: any
 * 4xx but 429 (401 and 403 in practice). Outages, rate limits, network
 * drops and malformed bodies are transient.
 */
const endsSession = (error: unknown): boolean => !isTransientError(error)

/**
 * Seconds the warning dialog counts down: to the end of the refresh grace,
 * the last moment a renewal can still succeed.
 */
const warningSeconds = (timeLeftMs: number) =>
  Math.ceil((timeLeftMs + TOKEN_REFRESH_GRACE_MS) / 1000)

const AuthContext = createContext<AuthContextType | null>(null)

interface AuthProviderProps {
  children: ReactNode
  apiUrl?: string
}

export function AuthProvider({
  children,
  apiUrl = process.env.NEXT_PUBLIC_ROBOSYSTEMS_API_URL ||
    'http://localhost:8000',
}: AuthProviderProps) {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [sessionWarning, setSessionWarning] = useState<{
    show: boolean
    timeLeft: number
  }>({ show: false, timeLeft: 0 })
  const [authClient] = useState(() => new RoboSystemsAuthClient(apiUrl))
  const lastActivity = useRef(Date.now())
  const mounted = useRef(true)
  const activityTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastRefreshAttempt = useRef(0)
  const refreshInProgress = useRef(false)

  const isAuthenticated = user !== null

  const validateCachedUser = useCallback(
    async (userData: AuthUser) => {
      try {
        const user = await authClient.getCurrentUser()
        if (user.id !== userData.id) {
          // Cache is stale, update with fresh data
          setUser(user)
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(
                'auth_user_cache',
                JSON.stringify({
                  ...user,
                  cached_at: Date.now(),
                  cache_version: CACHE_VERSION,
                })
              )
            } catch (error) {
              // Storage error - continue without caching (graceful degradation)
              logStorageError('write', error)
            }
          }
        }
      } catch (error) {
        // Only the server refusing the session ends it. An outage, a rate
        // limit or a network drop keeps the cached user; the heartbeat
        // re-validates once the API answers again.
        if (!endsSession(error)) {
          debugLog('Cached user validation deferred (transient error)', error)
          return
        }
        setUser(null)
        if (typeof window !== 'undefined') {
          try {
            sessionStorage.removeItem('auth_user_cache')
          } catch (error) {
            // Storage error - continue with graceful degradation
            logStorageError('remove', error)
          }
        }
      }
    },
    [authClient]
  )

  const checkSession = useCallback(async () => {
    try {
      // A transient failure at page load (deploy, 5xx, 429, network) is
      // retried with backoff instead of being read as "logged out".
      let user: AuthUser | null = null
      for (let attempt = 0; ; attempt++) {
        try {
          user = await authClient.getCurrentUser()
          break
        } catch (error) {
          if (
            !isTransientError(error) ||
            attempt >= SESSION_CHECK_MAX_RETRIES ||
            !mounted.current
          ) {
            throw error
          }
          authClient.clearAuthCache()
          await sleep(SESSION_CHECK_BACKOFF_BASE_MS * 2 ** attempt)
        }
      }
      setUser(user)
      // Cache the user data
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            'auth_user_cache',
            JSON.stringify({
              ...user,
              cached_at: Date.now(),
              cache_version: CACHE_VERSION,
            })
          )
        } catch (error) {
          // Storage error - continue without caching (graceful degradation)
          logStorageError('write', error)
        }
      }
    } catch {
      // User not authenticated, that's fine
      setUser(null)
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.removeItem('auth_user_cache')
        } catch (error) {
          // Storage error - continue with graceful degradation
          logStorageError('remove', error)
        }
      }
    } finally {
      setIsLoading(false)
    }
  }, [authClient])

  const logout = useCallback(
    async (
      reason?: string,
      options?: { redirectTo?: string; skipServerLogout?: boolean }
    ) => {
      try {
        // An automatic logout (the server already refused the session)
        // skips the server call: there is nothing left to revoke.
        if (!options?.skipServerLogout) {
          await authClient.logout()
        } else {
          const { clearToken } = await import('../auth-core/token-storage')
          clearToken()
        }
      } catch (error) {
        // Logout error - continue with local logout regardless
        debugLog('Backend logout failed, continuing with local cleanup', error)
        // Could show a non-blocking notification here if needed
      } finally {
        // Clear the httpOnly graph/entity selection cookies server-side. These
        // can't be removed by performLogoutCleanup() (which only touches
        // JS-readable cookies), so the server actions are still required. Bound
        // them with a timeout while the page is still authenticated: once the
        // auth token is cleared, these server actions can stall, and awaiting
        // them unconditionally previously hung logout() forever — leaving
        // AuthGuard on a blank screen with no redirect.
        await Promise.race([
          Promise.allSettled([clearGraphSelection(), clearEntitySelection()]),
          new Promise((resolve) => setTimeout(resolve, 2000)),
        ])

        // Clear auth client cache and local storage state. Deliberately NO
        // setUser(null) here: the hard navigation below tears the tree down
        // anyway, and nulling the user first wakes AuthGuard, whose
        // client-side redirect (→ /login → LoginRedirector → login home)
        // can outrace the queued /logout navigation — the anchor session
        // then survives and silently signs the user back in, undoing the
        // logout (observed E2E under centralized login).
        authClient.clearAuthCache()
        setSessionWarning({ show: false, timeLeft: 0 })

        // Perform comprehensive cleanup of all user-specific data
        performLogoutCleanup()

        debugLog('Logout cleanup completed')

        // Always hard-redirect out of the authenticated area. A full-page
        // navigation (not a client-side router.push) guarantees the
        // authenticated tree tears down without AuthGuard racing it (see
        // above). A forced logout (reason set, e.g.
        // session_expired) goes to the login page so it can explain why the
        // session ended and let the user sign back in. A manual logout on a
        // product app chains through the login home's /logout so the anchor
        // session dies too — otherwise the next visit silently re-bridges and
        // "log out" appears not to work. On the login home itself (and in
        // single-app deployments, where the app is its own login home) manual
        // logout goes to the public homepage. `options.redirectTo` overrides
        // the destination — used by the login home's /logout route to land the
        // user back on the app they came from.
        if (typeof window !== 'undefined') {
          if (options?.redirectTo) {
            window.location.href = options.redirectTo
          } else if (reason) {
            window.location.href = `/login?reason=${reason}`
          } else if (!isLoginHome()) {
            window.location.href = buildLoginHomeUrl('logout', {
              returnTo: buildReturnTo(CURRENT_APP),
            })
          } else {
            window.location.href = '/'
          }
        }
      }
    },
    [authClient]
  )

  const refreshUser = useCallback(async (): Promise<AuthUser | null> => {
    try {
      authClient.clearAuthCache()
      const freshUser = await authClient.getCurrentUser()
      setUser(freshUser)
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            'auth_user_cache',
            JSON.stringify({
              ...freshUser,
              cached_at: Date.now(),
              cache_version: CACHE_VERSION,
            })
          )
        } catch (error) {
          logStorageError('write', error)
        }
      }
      return freshUser
    } catch (error) {
      debugLog('Failed to refresh user', error)
      return null
    }
  }, [authClient])

  const refreshSession = useCallback(
    async (force = false) => {
      const now = Date.now()

      if (refreshInProgress.current) {
        debugLog('Refresh already in progress, skipping duplicate attempt')
        return
      }

      if (!force && now - lastRefreshAttempt.current < REFRESH_COOLDOWN_MS) {
        debugLog(
          `Skipping refresh - too soon since last attempt (< ${REFRESH_COOLDOWN_MS / 1000}s)`
        )
        return
      }

      refreshInProgress.current = true
      lastRefreshAttempt.current = now
      debugLog(
        force
          ? 'Starting user-initiated session refresh'
          : 'Starting session refresh'
      )

      try {
        const response = await authClient.refreshSession()
        if (response.success) {
          setUser(response.user)
          // A renewed session has nothing left to warn about ("Stay Logged
          // In" relies on this to dismiss the dialog).
          setSessionWarning({ show: false, timeLeft: 0 })
          // Cache the refreshed user data
          if (typeof window !== 'undefined') {
            try {
              sessionStorage.setItem(
                'auth_user_cache',
                JSON.stringify({
                  ...response.user,
                  cached_at: Date.now(),
                  cache_version: CACHE_VERSION,
                })
              )
            } catch (error) {
              logStorageError('write', error)
            }
          }
          debugLog('Session refresh successful')
        } else {
          throw new Error('Session refresh failed')
        }
      } finally {
        refreshInProgress.current = false
      }
    },
    [authClient]
  )

  // Set up global 401 error handler
  useTokenExpiryHandler(logout)

  // Check session on mount with caching
  useEffect(() => {
    if (typeof window === 'undefined') {
      return // Skip during SSR
    }

    let cachedUser: string | null = null
    try {
      cachedUser = sessionStorage.getItem('auth_user_cache')
    } catch {
      // Storage access error - proceed without cache
    }

    if (cachedUser) {
      try {
        const userData = JSON.parse(cachedUser)

        // Validate cache structure and version
        if (!userData || typeof userData !== 'object' || !userData.id) {
          throw new Error('Invalid cache structure')
        }

        // Check cache version - invalidate if version mismatch
        if (userData.cache_version !== CACHE_VERSION) {
          debugLog('Cache version mismatch, invalidating cache')
          throw new Error('Cache version mismatch')
        }

        const cacheAge = Date.now() - (userData.cached_at || 0)

        // If cache is fresh (< 5 minutes), use cached data
        if (cacheAge < CACHE_TTL_MS) {
          setUser(userData)
          setIsLoading(false)
          // Validate in background without blocking UI
          validateCachedUser(userData)
          return
        }
      } catch {
        // Invalid cache, proceed with normal check
        try {
          sessionStorage.removeItem('auth_user_cache')
        } catch (removeError) {
          // Storage error - continue silently
          debugLog(
            'sessionStorage remove failed during cache invalidation',
            removeError
          )
        }
      }
    }

    checkSession()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // Heartbeat - Server-side validation and background tab refresh.
  //
  // Only the server refusing the session (401, or 403 for a deactivated
  // account) ends it, and then locally: the token is already dead, so there
  // is no server logout to call. A network drop, a 5xx or a 429 keeps the
  // session and backs off; focus events inside the backoff window are
  // skipped so a flapping API is not hammered from every tab.
  useEffect(() => {
    if (!isAuthenticated) return

    let isMounted = true
    let inFlight = false
    let failures = 0
    let backoffUntil = 0
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let sentToken: string | null = null
    let recheckNow = false

    const tokenRotatedSince = (sent: string | null) => {
      const current = getRefreshToken()
      return current !== null && current !== sent
    }

    const endSession = (reason: string) =>
      logout(reason, { skipServerLogout: true })

    const scheduleRetry = (error: unknown) => {
      failures++
      const delay = Math.min(
        HEARTBEAT_BACKOFF_BASE_MS * 2 ** (failures - 1),
        HEARTBEAT_INTERVAL_MS
      )
      debugLog(
        `Heartbeat: transient failure, retrying in ${Math.round(delay / 1000)}s`,
        error
      )
      backoffUntil = Date.now() + delay
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = setTimeout(() => {
        retryTimer = null
        performHeartbeat(true)
      }, delay)
    }

    const performHeartbeat = async (scheduled = false) => {
      if (!isMounted || inFlight) return
      if (!scheduled && Date.now() < backoffUntil) return

      inFlight = true
      debugLog('Heartbeat: Checking server authentication status')

      try {
        // A token that expired while the tab slept cannot authenticate
        // /me, but the refresh endpoint still renews it within its grace
        // window — so renew first.
        if (getTokenStatus() === 'expired') {
          try {
            await refreshSession(true)
          } catch (refreshError) {
            if (!isMounted) return
            if (endsSession(refreshError)) {
              await endSession('session_expired')
            } else {
              scheduleRetry(refreshError)
            }
            return
          }
          // A refresh already in flight elsewhere skips this one; /me would
          // then go out unauthenticated and read as a refusal. Wait instead.
          if (getTokenStatus() === 'expired') {
            scheduleRetry(new Error('Session refresh still pending'))
            return
          }
        }

        // Make real HTTP call to validate session server-side
        // This works even in background tabs (not throttled like timers)
        sentToken = getRefreshToken()
        await authClient.getCurrentUser()

        if (!isMounted) return
        failures = 0
        backoffUntil = 0
        debugLog('Heartbeat: Server validation successful')

        // After successful server check, verify local token status
        const tokenStatus = getTokenStatus()
        const timeLeft = getTimeUntilExpiry()

        // Proactively refresh if token is expiring soon
        if (
          tokenStatus === 'warning' ||
          tokenStatus === 'expired' ||
          timeLeft < 5 * 60 * 1000
        ) {
          debugLog(
            `Heartbeat: Token needs refresh (status: ${tokenStatus}, time left: ${Math.floor(timeLeft / 1000)}s)`
          )

          try {
            await refreshSession()
            if (!isMounted) return

            debugLog('Heartbeat: Token refresh successful')
          } catch (refreshError) {
            if (!isMounted) return

            debugLog('Heartbeat: Token refresh failed', refreshError)
            if (endsSession(refreshError)) {
              await endSession('session_expired')
            } else if (timeLeft > 0) {
              // Show warning if refresh failed but token not expired
              setSessionWarning({
                show: true,
                timeLeft: warningSeconds(timeLeft),
              })
            }
          }
        }
      } catch (error) {
        if (!isMounted) return

        if (endsSession(error) && tokenRotatedSince(sentToken)) {
          // Another tab renewed the session while this check was in flight;
          // the refusal was for the token it replaced. Re-check at once.
          authClient.clearAuthCache()
          recheckNow = true
        } else if (endsSession(error)) {
          debugLog('Heartbeat: Server refused the session', error)
          await endSession('session_invalid')
        } else {
          scheduleRetry(error)
        }
      } finally {
        inFlight = false
        if (recheckNow && isMounted) {
          recheckNow = false
          retryTimer = setTimeout(() => {
            retryTimer = null
            performHeartbeat(true)
          }, 0)
        }
      }
    }

    // Regular heartbeat interval
    const heartbeatInterval = setInterval(
      () => performHeartbeat(),
      HEARTBEAT_INTERVAL_MS
    ) // Every 5 minutes

    // Also check immediately when tab regains focus
    const handleFocus = () => {
      if (!isMounted) return
      debugLog('Tab regained focus - performing immediate heartbeat')
      performHeartbeat()
    }

    const handleVisibilityChange = () => {
      if (!isMounted) return
      if (!document.hidden) {
        debugLog('Tab became visible - performing immediate heartbeat')
        performHeartbeat()
      }
    }

    window.addEventListener('focus', handleFocus)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      isMounted = false
      clearInterval(heartbeatInterval)
      if (retryTimer) clearTimeout(retryTimer)
      window.removeEventListener('focus', handleFocus)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [isAuthenticated, authClient, refreshSession, logout])

  // Proactive token refresh BEFORE expiry (kept for immediate refresh needs)
  useEffect(() => {
    if (!isAuthenticated) return

    let isMounted = true

    const refreshInterval = setInterval(async () => {
      if (!isMounted) return

      const tokenStatus = getTokenStatus()

      // If token is in warning state or expired, refresh it
      if (tokenStatus === 'warning' || tokenStatus === 'expired') {
        debugLog(`Token status: ${tokenStatus}, attempting refresh`)

        try {
          await refreshSession()
          if (!isMounted) return

          setSessionWarning({ show: false, timeLeft: 0 })
        } catch (error) {
          if (!isMounted) return

          debugLog('Token refresh failed', error)
          const timeLeft = getTimeUntilExpiry()
          if (endsSession(error)) {
            // The server refused the renewal: the session is over.
            debugLog('Refresh refused, redirecting to login')
            await logout('session_expired', { skipServerLogout: true })
          } else if (timeLeft > 0) {
            // Show warning instead of silent logout
            setSessionWarning({
              show: true,
              timeLeft: warningSeconds(timeLeft),
            })
          }
          // A transient failure past expiry is left to the heartbeat,
          // which retries the renewal with backoff.
        }
      }
    }, TOKEN_REFRESH_INTERVAL_MS) // Check every 25 minutes

    // Also check token status more frequently and auto-refresh if needed
    const warningInterval = setInterval(async () => {
      if (!isMounted) return

      const tokenStatus = getTokenStatus()
      const timeLeft = getTimeUntilExpiry()

      if (tokenStatus === 'warning' && timeLeft > 0) {
        // Token is approaching expiry - try to auto-refresh before showing warning
        debugLog('Token in warning state, attempting auto-refresh')

        try {
          await refreshSession()
          if (!isMounted) return

          debugLog('Auto-refresh successful, warning modal suppressed')
          setSessionWarning({ show: false, timeLeft: 0 })
        } catch (error) {
          if (!isMounted) return

          if (endsSession(error)) {
            await logout('session_expired', { skipServerLogout: true })
            return
          }
          // Auto-refresh failed, show warning modal
          debugLog('Auto-refresh failed, showing warning modal', error)
          setSessionWarning({
            show: true,
            timeLeft: warningSeconds(timeLeft),
          })
        }
      } else if (tokenStatus === 'valid') {
        if (!isMounted) return
        setSessionWarning({ show: false, timeLeft: 0 })
      }
    }, TOKEN_WARNING_CHECK_INTERVAL_MS) // Check every 30 seconds

    return () => {
      isMounted = false
      clearInterval(refreshInterval)
      clearInterval(warningInterval)
    }
  }, [isAuthenticated, refreshSession, logout])

  // Track user activity with throttling
  useEffect(() => {
    if (typeof window === 'undefined') return

    const updateActivity = () => {
      // Clear existing timeout to prevent race conditions
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }

      activityTimeoutRef.current = setTimeout(() => {
        // Check if component is still mounted before updating
        if (mounted.current) {
          lastActivity.current = Date.now()
        }
        activityTimeoutRef.current = null
      }, ACTIVITY_THROTTLE_MS) // Update at most once per second
    }

    const options = { passive: true }
    window.addEventListener('mousedown', updateActivity, options)
    window.addEventListener('keydown', updateActivity, options)
    window.addEventListener('scroll', updateActivity, options)
    window.addEventListener('touchstart', updateActivity, options)

    return () => {
      if (activityTimeoutRef.current) {
        clearTimeout(activityTimeoutRef.current)
      }
      window.removeEventListener('mousedown', updateActivity)
      window.removeEventListener('keydown', updateActivity)
      window.removeEventListener('scroll', updateActivity)
      window.removeEventListener('touchstart', updateActivity)
    }
  }, [])

  // Track component mount status
  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
    }
  }, [])

  const login = async (email: string, password: string) => {
    const response = await authClient.login(email, password)
    if (response.success) {
      authClient.clearAuthCache() // Clear request deduplication cache
      setUser(response.user)
      // Cache the user data
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            'auth_user_cache',
            JSON.stringify({
              ...response.user,
              cached_at: Date.now(),
              cache_version: CACHE_VERSION,
            })
          )
        } catch (error) {
          // Storage error - continue without caching (graceful degradation)
          logStorageError('write', error)
        }
      }
      return response.user
    } else {
      throw new Error(response.message || 'Login failed')
    }
  }

  const register = async (email: string, password: string, name?: string) => {
    const response = await authClient.register(email, password, name)
    if (response.success) {
      authClient.clearAuthCache() // Clear request deduplication cache
      setUser(response.user)
      // Cache the user data
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            'auth_user_cache',
            JSON.stringify({
              ...response.user,
              cached_at: Date.now(),
              cache_version: CACHE_VERSION,
            })
          )
        } catch (error) {
          // Storage error - continue without caching (graceful degradation)
          logStorageError('write', error)
        }
      }
      return response.user
    } else {
      throw new Error(response.message || 'Registration failed')
    }
  }

  const forgotPassword = async (
    email: string,
    options?: { appSource?: string }
  ) => {
    return authClient.forgotPassword(email, options)
  }

  const resetPassword = async (token: string, newPassword: string) => {
    const result = await authClient.resetPassword(token, newPassword)
    // If reset was successful and logged in automatically, fetch user
    if (result.success) {
      try {
        const user = await authClient.getCurrentUser()
        if (user) {
          setUser(user)
        }
      } catch {
        // User not logged in after reset, that's fine
      }
    }
    return result
  }

  const validateResetToken = async (token: string) => {
    return authClient.validateResetToken(token)
  }

  const verifyEmail = async (token: string) => {
    const result = await authClient.verifyEmail(token)
    // If verification was successful and logged in automatically, update user
    if (result.success && result.user) {
      setUser(result.user)
      // Cache the user data
      if (typeof window !== 'undefined') {
        try {
          sessionStorage.setItem(
            'auth_user_cache',
            JSON.stringify({
              ...result.user,
              cached_at: Date.now(),
              cache_version: CACHE_VERSION,
            })
          )
        } catch (error) {
          // Storage error - continue without caching (graceful degradation)
          logStorageError('write', error)
        }
      }
    }
    return result
  }

  const resendVerificationEmail = async (
    email: string,
    options?: { appSource?: string }
  ) => {
    return authClient.resendVerificationEmail(email, options)
  }

  const value: AuthContextType = {
    user,
    isLoading,
    isAuthenticated,
    sessionWarning,
    login,
    register,
    logout,
    refreshUser,
    refreshSession,
    forgotPassword,
    resetPassword,
    validateResetToken,
    verifyEmail,
    resendVerificationEmail,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext)
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}

/**
 * Like `useAuth`, but returns `null` outside an `AuthProvider` instead of
 * throwing. For components that integrate with auth when it is present but must
 * still render without it — design-system previews and isolated component tests
 * mount components with no provider around them.
 */
export function useOptionalAuth(): AuthContextType | null {
  return useContext(AuthContext)
}
