import { useMemo } from 'react'
import { RoboSystemsAuthClient } from './client'
import { APP_CONFIGS } from './config'
import { isSafeRelativePath } from './login-home'
import type { AppConfig, AuthUser } from './types'

// Configuration constants
const NAVIGATION_DELAY_MS = 100 // 100ms delay for navigation

// Debug logging helper
const debugLog = (message: string, error?: unknown) => {
  if (process.env.NODE_ENV === 'development') {
    console.debug(`[SSO] ${message}`, error)
  }
}

/**
 * Reduce a `returnUrl` to a same-origin path, or reject it.
 *
 * The value reaches us from a query parameter, so it is attacker-controlled
 * on any crafted link. Cross-app returns don't need anything but a bare
 * absolute path — `getSSORedirectUrl` hands the path to the *target* app,
 * which resolves it against its own origin. The check is the package's one
 * validator, `isSafeRelativePath` (shared with the login home).
 */
const sanitizeReturnUrl = (returnUrl: string | null): string | null =>
  returnUrl && isSafeRelativePath(returnUrl) ? returnUrl : null

export interface SSORedirectUrlOptions {
  /**
   * @deprecated No effect. The return path travels only in the handoff URL;
   * a sessionStorage copy was never readable by the target app (every app is
   * its own origin) and misrouted later handoffs into the *source* app.
   */
  persistSessionHints?: boolean
}

/** Keys an older version wrote; cleared on every handoff completion. */
const LEGACY_SSO_HINT_KEYS = ['sso_target_app', 'sso_return_url']

const clearLegacySsoHints = () => {
  try {
    for (const key of LEGACY_SSO_HINT_KEYS) sessionStorage.removeItem(key)
  } catch (error) {
    // Storage access error - continue silently
    debugLog('sessionStorage cleanup failed', error)
  }
}

export class SSOManager {
  private authClient: RoboSystemsAuthClient

  constructor(apiUrl: string) {
    this.authClient = new RoboSystemsAuthClient(apiUrl)
  }

  /**
   * Check if user is already authenticated via SSO
   */
  async checkSSOAuthentication(): Promise<AuthUser | null> {
    try {
      return await this.authClient.checkAuthentication()
    } catch {
      return null
    }
  }

  /**
   * Generate SSO token for cross-app authentication
   */
  async generateSSOToken() {
    return await this.authClient.generateSSOToken()
  }

  /**
   * Get SSO redirect URL using secure POST-based flow
   */
  async getSSORedirectUrl(
    targetApp: string,
    returnUrl?: string,
    _options: SSORedirectUrlOptions = {}
  ): Promise<string> {
    const ssoData = await this.generateSSOToken()
    const appConfig = APP_CONFIGS[targetApp]

    if (!appConfig) {
      throw new Error(`Unknown app: ${targetApp}`)
    }

    // Step 1: Exchange SSO token for secure session ID
    const exchangeResult = await this.authClient.ssoExchange(
      ssoData.token,
      targetApp
    )

    // Step 2: Create URL that will trigger the POST-based flow
    const url = new URL('/login', appConfig.url)

    // Pass session ID via URL parameters for cross-domain compatibility
    url.searchParams.set('session_id', exchangeResult.session_id)
    if (returnUrl) {
      url.searchParams.set('returnUrl', returnUrl)
    }

    return url.toString()
  }

  /**
   * Handle SSO login using secure POST-based flow
   */
  async handleSSOLogin(): Promise<AuthUser | null> {
    // Check for session ID from URL parameters (cross-domain compatible)
    const urlParams = new URLSearchParams(window.location.search)
    const sessionId = urlParams.get('session_id')
    // The return path comes only from the handoff URL. With none, the
    // caller's own default landing applies.
    const returnUrl = urlParams.get('returnUrl')

    const finalSessionId = sessionId // Only use URL parameter for session ID
    const finalReturnUrl = sanitizeReturnUrl(returnUrl)

    if (!finalSessionId) {
      return null
    }

    try {
      // Complete SSO authentication using session ID
      const authResponse = await this.authClient.ssoComplete(finalSessionId)

      // Clean up both URL parameters and session storage
      if (sessionId) {
        // Clean up URL parameters
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('session_id')
        newUrl.searchParams.delete('returnUrl')
        window.history.replaceState({}, '', newUrl.toString())
      }

      clearLegacySsoHints()

      // Handle return URL if provided
      if (finalReturnUrl && finalReturnUrl !== window.location.pathname) {
        // Delay navigation to allow authentication to complete
        setTimeout(() => {
          window.location.href = finalReturnUrl
        }, NAVIGATION_DELAY_MS)
      }

      return authResponse.user
    } catch (error) {
      // Clean up both URL parameters and session storage on error
      if (sessionId) {
        const newUrl = new URL(window.location.href)
        newUrl.searchParams.delete('session_id')
        newUrl.searchParams.delete('returnUrl')
        window.history.replaceState({}, '', newUrl.toString())
      }

      clearLegacySsoHints()

      // Log errors for monitoring in production (sanitized)
      if (process.env.NODE_ENV === 'development') {
        console.error('SSO login failed:', this.sanitizeErrorForLogging(error))
      } else {
        // Production error monitoring - log sanitized errors for observability
        console.error('SSO authentication failed:', {
          timestamp: new Date().toISOString(),
          error: this.sanitizeErrorForLogging(error),
          user_agent: navigator?.userAgent || 'unknown',
        })
      }
      return null
    }
  }

  /**
   * Get available apps for the authenticated user
   */
  getAvailableApps(): AppConfig[] {
    return Object.values(APP_CONFIGS)
  }

  /**
   * Sanitize error objects for safe logging in development
   */
  private sanitizeErrorForLogging(error: unknown): any {
    if (error instanceof Error) {
      return {
        name: error.name,
        message: error.message,
        // Exclude potentially sensitive stack traces in some cases
        stack: error.stack?.split('\n').slice(0, 3).join('\n') + '...',
      }
    }
    if (typeof error === 'object' && error !== null) {
      // Remove any fields that might contain sensitive data
      const sanitized = { ...error } as any
      delete sanitized.token
      delete sanitized.session_id
      delete sanitized.password
      delete sanitized.key
      return sanitized
    }
    return String(error)
  }

  /**
   * Navigate to another app with secure SSO
   */
  async navigateToApp(targetApp: string, returnUrl?: string) {
    const appConfig = APP_CONFIGS[targetApp]
    if (!appConfig) {
      throw new Error(`Unknown app: ${targetApp}`)
    }

    // Check local auth cache first to avoid unnecessary SSO token generation
    if (typeof window !== 'undefined') {
      let cachedUser: string | null = null
      try {
        cachedUser = sessionStorage.getItem('auth_user_cache')
      } catch (error) {
        // Storage access error - proceed with SSO flow
        debugLog(
          'sessionStorage read failed during navigation cache check',
          error
        )
      }

      if (cachedUser) {
        try {
          JSON.parse(cachedUser)

          // REMOVED: Cache bypass logic that was skipping SSO flow
          // Always use proper SSO flow for cross-app authentication
          debugLog('Proceeding with full SSO flow for secure cross-app auth')
        } catch (error) {
          // Invalid cache, proceed with SSO flow
          debugLog('Invalid cache found, proceeding with SSO flow', error)
          try {
            sessionStorage.removeItem('auth_user_cache')
          } catch {
            // Storage error - continue silently
          }
        }
      }
    }

    try {
      // Fallback to full SSO flow for stale/missing cache
      const ssoData = await this.generateSSOToken()

      // Step 2: Exchange token for secure session ID
      const exchangeResult = await this.authClient.ssoExchange(
        ssoData.token,
        targetApp
      )

      // Step 3: Navigate to target app with secure session handoff
      const targetUrl = new URL('/login', appConfig.url)

      // Pass session ID via URL parameters for cross-domain compatibility
      targetUrl.searchParams.set('session_id', exchangeResult.session_id)
      if (returnUrl) {
        targetUrl.searchParams.set('returnUrl', returnUrl)
      }

      // Navigate to target app
      window.location.href = targetUrl.toString()
    } catch (error) {
      if (process.env.NODE_ENV === 'development') {
        console.error('Failed to navigate to app:', error)
      }
      debugLog('SSO navigation failed, attempting fallback', error)
      // Fallback to direct navigation
      try {
        const targetUrl = new URL(appConfig.url)
        if (returnUrl) {
          targetUrl.searchParams.set('returnUrl', returnUrl)
        }
        window.location.href = targetUrl.toString()
      } catch (locationError) {
        if (process.env.NODE_ENV === 'development') {
          console.error('Fallback navigation failed:', locationError)
        }
        debugLog('All navigation methods failed', locationError)
        // Final fallback using window.open
        window.open(appConfig.url, '_self')
      }
    }
  }
}

/**
 * Hook for SSO functionality
 */
export function useSSO(apiUrl: string) {
  const ssoManager = useMemo(() => new SSOManager(apiUrl), [apiUrl])

  return useMemo(
    () => ({
      checkSSOAuthentication: () => ssoManager.checkSSOAuthentication(),
      handleSSOLogin: () => ssoManager.handleSSOLogin(),
      getSSORedirectUrl: (
        targetApp: string,
        returnUrl?: string,
        options?: SSORedirectUrlOptions
      ) => ssoManager.getSSORedirectUrl(targetApp, returnUrl, options),
      navigateToApp: (targetApp: string, returnUrl?: string) =>
        ssoManager.navigateToApp(targetApp, returnUrl),
      getAvailableApps: () => ssoManager.getAvailableApps(),
    }),
    [ssoManager]
  )
}
