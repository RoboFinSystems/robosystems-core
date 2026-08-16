'use client'

import { useCallback, useMemo, useState } from 'react'
import { LOGIN_HOME_APP } from '../auth-core/config'
import { SSOManager } from '../auth-core/sso'

const DEFAULT_API_URL =
  process.env.NEXT_PUBLIC_ROBOSYSTEMS_API_URL || 'http://localhost:8000'

export type CrossAppTarget = '_blank' | '_self'

export interface OpenCrossAppOptions {
  /** Relative path on the target app, e.g. `/settings`. */
  path?: string
  /**
   * `_blank` (default) hands the destination to a new tab, leaving the
   * current app exactly where it was — right for a *detour* (account
   * settings, graph creation), where the user is coming back.
   *
   * `_self` navigates in place — right when leaving *is* the intent, as in
   * the app switcher.
   */
  target?: CrossAppTarget
}

export interface UseCrossAppLinkResult {
  /** Resolves true once the destination has been handed off. */
  openApp: (
    targetApp: string,
    options?: OpenCrossAppOptions
  ) => Promise<boolean>
  /** Convenience wrapper targeting the configured login home. */
  openLoginHome: (options?: OpenCrossAppOptions) => Promise<boolean>
  /** True while the SSO handoff is in flight. */
  isOpening: boolean
}

/**
 * Open another RoboSystems app at a specific path, in one click.
 *
 * Cross-app navigation can't be a plain `<a href>`: the destination doesn't
 * exist until an SSO token is minted and exchanged for a session ID, two
 * round-trips deep. The apps sit on separate registrable domains, so a naked
 * link to the target would drop the user on a login screen instead.
 *
 * That async gap is also why the new tab is claimed *synchronously*, before
 * the first await. A `window.open()` issued after an await is outside the
 * user-gesture stack and popup blockers swallow it; opening `about:blank`
 * inside the gesture and pointing it at the URL afterwards is the standard
 * way around that. If the open is refused anyway (popups hard-blocked), we
 * degrade to a same-tab navigation rather than dead-ending the click.
 */
export function useCrossAppLink(
  apiUrl: string = DEFAULT_API_URL
): UseCrossAppLinkResult {
  const ssoManager = useMemo(() => new SSOManager(apiUrl), [apiUrl])
  const [isOpening, setIsOpening] = useState(false)

  const openApp = useCallback(
    async (targetApp: string, options: OpenCrossAppOptions = {}) => {
      const { path, target = '_blank' } = options

      // Claim the tab inside the gesture — see the note above.
      const childWindow = target === '_blank' ? window.open('', '_blank') : null
      const openedNewTab = childWindow !== null

      setIsOpening(true)
      try {
        const url = await ssoManager.getSSORedirectUrl(targetApp, path, {
          persistSessionHints: !openedNewTab,
        })

        if (childWindow) {
          childWindow.location.href = url
        } else {
          window.location.href = url
        }
        return true
      } catch (error) {
        // Leaving a blank tab behind is worse than no tab at all.
        childWindow?.close()
        if (process.env.NODE_ENV === 'development') {
          console.error(
            `[SSO] Failed to open ${targetApp}${path ? path : ''}:`,
            error
          )
        }
        return false
      } finally {
        setIsOpening(false)
      }
    },
    [ssoManager]
  )

  const openLoginHome = useCallback(
    (options?: OpenCrossAppOptions) => openApp(LOGIN_HOME_APP, options),
    [openApp]
  )

  return { openApp, openLoginHome, isOpening }
}
