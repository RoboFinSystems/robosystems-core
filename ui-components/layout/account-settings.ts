'use client'

import { getLoginHomeName, isLoginHome } from '../../auth-core/config'
import { useCrossAppLink } from '../../hooks/use-cross-app-link'

/** Where the account surface lives, on whichever app hosts it. */
export const ACCOUNT_SETTINGS_PATH = '/settings'

interface AccountSettingsLinkBase {
  isOpening: boolean
  /** Name of the app hosting the account surface, e.g. "RoboSystems". */
  hostAppName: string
  /** Tooltip / accessible description, honest about leaving the app. */
  description: string
}

/**
 * Exactly one of `href` / `open` is meaningful, and the discriminant says
 * which — so a caller can't render a link to a destination that needs an
 * SSO handoff, or a button where a plain anchor belongs.
 */
export type AccountSettingsLink = AccountSettingsLinkBase &
  (
    | { isCrossApp: false; href: string; open?: never }
    | { isCrossApp: true; href?: never; open: () => Promise<boolean> }
  )

/**
 * Resolve how this app should reach account settings.
 *
 * Identity, password, passkeys and API keys are account-global and live on
 * one app — the login home. On that app the cog is an ordinary link; on the
 * product apps it's an SSO handoff into a new tab, so the user's place here
 * (a half-written journal entry, a loaded report) survives the detour.
 */
export function useAccountSettingsLink(apiUrl?: string): AccountSettingsLink {
  const { openLoginHome, isOpening } = useCrossAppLink(apiUrl)
  const hostAppName = getLoginHomeName()

  if (isLoginHome()) {
    return {
      isCrossApp: false,
      href: ACCOUNT_SETTINGS_PATH,
      isOpening,
      hostAppName,
      description: 'Settings',
    }
  }

  return {
    isCrossApp: true,
    open: () =>
      openLoginHome({ path: ACCOUNT_SETTINGS_PATH, target: '_blank' }),
    isOpening,
    hostAppName,
    description: `Settings (opens ${hostAppName} in a new tab)`,
  }
}
