'use client'

import * as SDK from '@robosystems/client'
import React, { useState } from 'react'
import { HiUser } from 'react-icons/hi'
import { Button } from '../../ui'
import { Spinner } from '../Spinner'
import { SettingsCard } from '../forms/SettingsCard'
import { SettingsFormField } from '../forms/SettingsFormField'
import { StatusAlert } from '../forms/StatusAlert'
import type { AuthUser, UserUpdateData } from '../types'

export interface GeneralInformationCardProps {
  user: AuthUser
  onUpdate?: (data: UserUpdateData) => Promise<void>
  onRefresh?: () => Promise<void>
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
  className?: string
}

export const GeneralInformationCard: React.FC<GeneralInformationCardProps> = ({
  user,
  onUpdate = undefined,
  onRefresh = undefined,
  onSuccess = undefined,
  onError = undefined,
  className = '',
}) => {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError(null)
    setSuccess(false)

    const formData = new FormData(event.currentTarget)
    const updateData: UserUpdateData = {
      username: formData.get('username') as string,
      email: formData.get('email') as string,
    }

    setIsLoading(true)

    try {
      if (onUpdate) {
        await onUpdate(updateData)
      } else {
        const response = await SDK.updateUser({
          body: {
            name: updateData.username,
            email: updateData.email,
          },
        })
        if (response.error) {
          const detail =
            (response.error as any)?.detail?.detail ||
            (response.error as any)?.detail ||
            'Failed to update profile.'
          throw new Error(
            typeof detail === 'string' ? detail : 'Failed to update profile.'
          )
        }
      }

      if (onSuccess) {
        onSuccess('Profile updated successfully.')
      } else {
        setSuccess(true)
      }
      if (onRefresh) {
        await onRefresh()
      }
      setTimeout(() => {
        setIsLoading(false)
        setSuccess(false)
      }, 2000)
    } catch (err) {
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Failed to update profile. Please try again.'
      if (onError) {
        onError(msg)
      } else {
        setError(msg)
      }
      setIsLoading(false)
    }
  }

  return (
    <SettingsCard
      title="General information"
      description="Update your account details"
      icon={HiUser}
      className={className}
    >
      <div className="space-y-4">
        {error && <StatusAlert type="error" message={error} />}

        {success && (
          <StatusAlert type="success" message="Profile updated successfully." />
        )}
      </div>

      <form onSubmit={handleSubmit}>
        <div className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <SettingsFormField
              id="username"
              label="Username"
              placeholder="Username"
              defaultValue={user.name}
              required
            />

            <SettingsFormField
              id="email"
              label="Email"
              type="email"
              placeholder="Email"
              defaultValue={user.email}
              required
            />
          </div>

          <div className="flex justify-end pt-2">
            <Button color="blue" type="submit" disabled={isLoading}>
              {isLoading ? (
                <Spinner size="sm" className="text-white" />
              ) : (
                'Save Changes'
              )}
            </Button>
          </div>
        </div>
      </form>
    </SettingsCard>
  )
}
