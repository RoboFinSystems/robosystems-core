'use client'

import { useEffect, useRef, useState } from 'react'
import { CURRENT_APP, isLoginHome } from '../auth-core/config'
import {
  buildLoginHomeUrl,
  buildReturnTo,
  isSafeRelativePath,
} from '../auth-core/login-home'
import { useSSO } from '../auth-core/sso'
import { BrandSpinner } from '../ui-components'

export interface LoginRedirectorProps {
  /** Which auth surface this page stands in for. */
  mode?: 'login' | 'register'
  apiUrl: string
  /** Where a completed bridge without a returnUrl lands. */
  homePath?: string
}

/**
 * Product-app stand-in for the login/register pages under centralized login.
 *
 * Two jobs:
 * - `?session_id=` present: consume the SSO bridge handoff exactly as the
 *   full login page did. On failure it renders an error with a manual link
 *   to the login home — never an automatic redirect, which with a live
 *   anchor session would loop (login home re-bridges → fails → back again).
 * - otherwise: redirect to the login home, upgrading a local `?return_to=`
 *   path to app-qualified form and forwarding foreign query params
 *   (e.g. `invite`) so mailed links keep working.
 */
export function LoginRedirector({
  mode = 'login',
  apiUrl,
  homePath = '/home',
}: LoginRedirectorProps) {
  const { handleSSOLogin } = useSSO(apiUrl)
  const [bridgeFailed, setBridgeFailed] = useState(false)
  const [misconfigured, setMisconfigured] = useState(false)
  const startedRef = useRef(false)

  useEffect(() => {
    // Guard against StrictMode double-mount: the first run consumes
    // session_id and strips it from the URL, so a second run would
    // misread the state as a failed bridge.
    if (startedRef.current) {
      return
    }
    startedRef.current = true

    const params = new URLSearchParams(window.location.search)
    const sessionId = params.get('session_id')

    if (sessionId) {
      const returnUrl = params.get('returnUrl')
      void handleSSOLogin().then((user) => {
        if (user) {
          // With a returnUrl, handleSSOLogin navigates there itself.
          if (!returnUrl) {
            window.location.href = homePath
          }
        } else {
          setBridgeFailed(true)
        }
      })
      return
    }

    // Never self-redirect: mounted on the app that IS the login home
    // (misconfiguration — the login home renders real auth forms, not this
    // redirector), buildLoginHomeUrl() resolves to this same app and
    // window.location.replace() would loop. Fail safe with a static state,
    // mirroring AuthProvider.logout's isLoginHome() guard.
    if (isLoginHome()) {
      console.error(
        '[LoginRedirector] rendered on the login home app — refusing to self-redirect. Check NEXT_PUBLIC_LOGIN_HOME_APP / the centralized-login flag.'
      )
      setMisconfigured(true)
      return
    }

    const localReturnTo = params.get('return_to')
    const path =
      localReturnTo && isSafeRelativePath(localReturnTo)
        ? localReturnTo
        : undefined
    const reason = params.get('reason') ?? undefined

    // replace() keeps the redirector page out of history so Back returns
    // to the page the user actually came from.
    window.location.replace(
      buildLoginHomeUrl(mode, {
        returnTo: buildReturnTo(CURRENT_APP, path),
        reason,
        forwardParams: params,
      })
    )
  }, [handleSSOLogin, mode, homePath])

  if (misconfigured) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          Sign-in is temporarily unavailable
        </p>
        <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
          This page is misconfigured. Please contact support if the problem
          persists.
        </p>
      </div>
    )
  }

  if (bridgeFailed) {
    const retryUrl = buildLoginHomeUrl(mode, {
      returnTo: buildReturnTo(CURRENT_APP),
      reason: 'bridge_failed',
    })
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 px-6 text-center">
        <p className="text-lg font-semibold text-gray-900 dark:text-white">
          Sign-in could not be completed
        </p>
        <p className="max-w-md text-sm text-gray-600 dark:text-gray-400">
          The sign-in handoff expired or was invalid. This can happen when a
          sign-in link is reused or takes too long to load.
        </p>
        <a
          href={retryUrl}
          className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
        >
          Continue to sign in
        </a>
      </div>
    )
  }

  return <BrandSpinner size="xl" fullScreen />
}
