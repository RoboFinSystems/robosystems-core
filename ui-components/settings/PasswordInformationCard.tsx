'use client'

import * as SDK from '@robosystems/client'
import { Button } from 'flowbite-react'
import React, { useCallback, useEffect, useRef, useState } from 'react'
import { HiLockClosed } from 'react-icons/hi'
import { useOptionalAuth } from '../../auth-components/AuthProvider'
import { ConfirmModal } from '../ConfirmModal'
import { Spinner } from '../Spinner'
import { SettingsCard } from '../forms/SettingsCard'
import { SettingsFormField } from '../forms/SettingsFormField'
import { StatusAlert } from '../forms/StatusAlert'
import type { PasswordUpdateData } from '../types'

interface PasswordStrengthResult {
  score: number
  strength: string
  errors: string[]
  suggestions: string[]
  is_valid: boolean
}

export interface PasswordInformationCardProps {
  theme?: any
  onUpdate?: (data: PasswordUpdateData) => Promise<void>
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  className?: string
}

export const PasswordInformationCard: React.FC<
  PasswordInformationCardProps
> = ({
  theme,
  onUpdate = undefined,
  onSuccess = undefined,
  onError = undefined,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [newPassword, setNewPassword] = useState('')
  const [passwordStrength, setPasswordStrength] =
    useState<PasswordStrengthResult | null>(null)
  const [checkingPassword, setCheckingPassword] = useState(false)
  const [pendingUpdate, setPendingUpdate] = useState<PasswordUpdateData | null>(
    null
  )
  const debounceRef = useRef<NodeJS.Timeout | null>(null)
  const formRef = useRef<HTMLFormElement>(null)
  const auth = useOptionalAuth()

  const checkPassword = useCallback(async (password: string) => {
    if (password.length < 4) {
      setPasswordStrength(null)
      return
    }
    setCheckingPassword(true)
    try {
      const response = await SDK.checkPasswordStrength({
        body: { password } as any,
      })
      const data = response.data as any
      setPasswordStrength({
        score: data?.score || 0,
        strength: data?.strength || 'very-weak',
        errors: data?.errors || [],
        suggestions: data?.suggestions || [],
        is_valid: data?.is_valid || false,
      })
    } catch {
      setPasswordStrength(null)
    } finally {
      setCheckingPassword(false)
    }
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (newPassword.length < 4) {
      setPasswordStrength(null)
      return
    }
    debounceRef.current = setTimeout(() => {
      checkPassword(newPassword)
    }, 400)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [newPassword, checkPassword])

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(event.currentTarget)
    const updateData: PasswordUpdateData = {
      currentPassword: formData.get('currentPassword') as string,
      newPassword: formData.get('newPassword') as string,
      confirmPassword: formData.get('confirmPassword') as string,
    }

    // Client-side validation
    if (updateData.newPassword !== updateData.confirmPassword) {
      const msg = 'New password and confirmation do not match'
      if (onError) {
        onError(msg)
      } else {
        setError(msg)
      }
      return
    }

    if (checkingPassword) {
      setError('Checking password strength, please wait...')
      return
    }

    if (passwordStrength && !passwordStrength.is_valid) {
      const msg =
        passwordStrength.errors.length > 0
          ? passwordStrength.errors.join('. ')
          : 'Password does not meet requirements'
      if (onError) {
        onError(msg)
      } else {
        setError(msg)
      }
      return
    }

    // A password change ends every session, this one included, so take an
    // explicit confirmation before doing something the user can't walk back.
    setPendingUpdate(updateData)
  }

  const handleConfirm = async () => {
    if (!pendingUpdate) return

    setIsLoading(true)

    try {
      if (onUpdate) {
        await onUpdate(pendingUpdate)
      } else {
        const response = await SDK.updateUserPassword({
          body: {
            current_password: pendingUpdate.currentPassword,
            new_password: pendingUpdate.newPassword,
            confirm_password: pendingUpdate.confirmPassword,
          },
        })
        if (response.error) {
          const detail =
            (response.error as any)?.detail?.detail ||
            (response.error as any)?.detail ||
            'Failed to update password.'
          throw new Error(
            typeof detail === 'string' ? detail : 'Failed to update password.'
          )
        }
      }

      setPendingUpdate(null)

      if (onSuccess) {
        onSuccess('Password updated successfully.')
      } else {
        setSuccess(true)
      }

      // The server invalidates every session on a password change, so the token
      // this app holds is already dead. Sign out deliberately instead of
      // letting it fail on the next request as an unexplained error.
      if (auth) {
        try {
          await auth.logout('password_changed')
          return // navigating away — leave the card as-is
        } catch {
          // The password did change; only the redirect failed. Fall through so
          // the card resets rather than sitting on a spinner.
        }
      }

      // Clear form fields and strength state
      formRef.current?.reset()
      setNewPassword('')
      setPasswordStrength(null)
      setTimeout(() => {
        setIsLoading(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to update password. Please try again.'
      if (onError) {
        onError(msg)
      } else {
        setError(msg)
      }
      setPendingUpdate(null)
      setIsLoading(false)
    }
  }

  const strengthBarColor = !passwordStrength
    ? ''
    : passwordStrength.score < 30
      ? 'bg-red-500'
      : passwordStrength.score < 60
        ? 'bg-yellow-500'
        : passwordStrength.score < 80
          ? 'bg-primary-400'
          : 'bg-green-500'

  const strengthTextColor = !passwordStrength
    ? ''
    : passwordStrength.score < 30
      ? 'text-red-400'
      : passwordStrength.score < 60
        ? 'text-yellow-400'
        : passwordStrength.score < 80
          ? 'text-primary-300'
          : 'text-green-400'

  return (
    <SettingsCard
      title="Password information"
      description="Update your password to keep your account secure"
      icon={HiLockClosed}
      theme={theme?.card}
      className={className}
    >
      <div className="space-y-4">
        {error && (
          <StatusAlert type="error" message={error} theme={theme?.alert} />
        )}

        {success && (
          <StatusAlert
            type="success"
            message="Password updated successfully."
            theme={theme?.alert}
          />
        )}
      </div>

      <form ref={formRef} onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsFormField
              id="currentPassword"
              label="Current password"
              type="password"
              placeholder="••••••••"
              theme={theme}
            />
          </div>

          <div className="grid items-start gap-4 md:grid-cols-2">
            <div>
              <SettingsFormField
                id="newPassword"
                label="New password"
                type="password"
                placeholder="••••••••"
                theme={theme}
                onChange={(e) => setNewPassword(e.target.value)}
              />
              <div className="mt-2 min-h-[2.75rem]">
                {passwordStrength && (
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-gray-700">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${strengthBarColor}`}
                          style={{ width: `${passwordStrength.score}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-medium capitalize ${strengthTextColor}`}
                      >
                        {passwordStrength.strength.replace('-', ' ')}
                      </span>
                    </div>
                    {passwordStrength.errors.length > 0 && (
                      <p className="text-xs text-red-400">
                        {passwordStrength.errors[0]}
                      </p>
                    )}
                    {passwordStrength.errors.length === 0 &&
                      passwordStrength.suggestions.length > 0 && (
                        <p className="text-xs text-gray-400">
                          {passwordStrength.suggestions[0]}
                        </p>
                      )}
                  </div>
                )}
              </div>
            </div>

            <SettingsFormField
              id="confirmPassword"
              label="Confirm password"
              type="password"
              placeholder="••••••••"
              theme={theme}
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button
              theme={theme?.button}
              color="blue"
              type="submit"
              disabled={isLoading || checkingPassword}
            >
              {isLoading ? (
                <Spinner size="sm" className="text-white" />
              ) : (
                'Update Password'
              )}
            </Button>
          </div>
        </div>
      </form>

      <ConfirmModal
        show={pendingUpdate !== null}
        onClose={() => setPendingUpdate(null)}
        onConfirm={handleConfirm}
        loading={isLoading}
        title="Change password"
        confirmLabel="Change password"
        loadingLabel="Changing…"
        confirmColor="blue"
        confirmIcon={HiLockClosed}
      >
        <p className="text-sm text-gray-300">
          Changing your password signs you out everywhere, including on this
          device. You'll need to sign in again with your new password.
        </p>
      </ConfirmModal>
    </SettingsCard>
  )
}
