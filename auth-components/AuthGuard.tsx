'use client'

import { useRouter } from 'next/navigation'
import type { PropsWithChildren } from 'react'
import { useEffect } from 'react'
import { isSafeRelativePath } from '../auth-core/login-home'
import { BrandSpinner } from '../ui-components'
import { useAuth } from './AuthProvider'

interface AuthGuardProps extends PropsWithChildren {
  redirectTo?: string
  loadingComponent?: React.ReactNode
}

export function AuthGuard({
  children,
  redirectTo = '/login',
  loadingComponent,
}: AuthGuardProps) {
  const { isAuthenticated, isLoading } = useAuth()
  const router = useRouter()

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Carry the intended destination so the login flow can land the user
      // back where they were headed instead of the default landing page.
      // A bare "/" carries no information — the default landing already
      // covers it — so it is not forwarded.
      let target = redirectTo
      if (typeof window !== 'undefined') {
        const destination = window.location.pathname + window.location.search
        if (
          destination !== '/' &&
          destination !== redirectTo &&
          isSafeRelativePath(destination)
        ) {
          target = `${redirectTo}?return_to=${encodeURIComponent(destination)}`
        }
      }
      try {
        router.push(target)
      } catch (error) {
        if (process.env.NODE_ENV === 'development') {
          // Fallback to window.location if router.push fails
          console.error(
            'Router push failed, using window.location fallback:',
            error
          )
        }
        window.location.href = target
      }
    }
  }, [isAuthenticated, isLoading, router, redirectTo])

  if (isLoading) {
    return loadingComponent || <BrandSpinner size="xl" fullScreen />
  }

  if (!isAuthenticated) {
    return null
  }

  return <>{children}</>
}
