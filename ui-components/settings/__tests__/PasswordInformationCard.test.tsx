import * as SDK from '@robosystems/client'
import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useOptionalAuth } from '../../../auth-components/AuthProvider'
import { PasswordInformationCard } from '../PasswordInformationCard'

vi.mock('../../../auth-components/AuthProvider', () => ({
  useOptionalAuth: vi.fn(),
}))

const mockUseOptionalAuth = vi.mocked(useOptionalAuth)
const mockUpdateUserPassword = vi.mocked(SDK.updateUserPassword)
const mockCheckPasswordStrength = vi.mocked(SDK.checkPasswordStrength)

const NEW_PASSWORD = 'N3wS3cur3P@ssw0rd!456'

/** Fill the three fields and submit — which opens the confirmation, not the request. */
function submitForm(newPassword = NEW_PASSWORD) {
  fireEvent.change(screen.getByLabelText(/current password/i), {
    target: { value: '0r1g1n@lP@ssw0rd!' },
  })
  fireEvent.change(screen.getByLabelText(/^new password/i), {
    target: { value: newPassword },
  })
  fireEvent.change(screen.getByLabelText(/confirm password/i), {
    target: { value: newPassword },
  })
  fireEvent.click(screen.getByRole('button', { name: /update password/i }))
}

const confirmButton = () =>
  screen.getByRole('button', { name: /^change password$/i })

describe('PasswordInformationCard', () => {
  const mockLogout = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    mockUseOptionalAuth.mockReturnValue({ logout: mockLogout } as any)
    mockUpdateUserPassword.mockResolvedValue({
      data: {},
      error: undefined,
    } as any)
    mockCheckPasswordStrength.mockResolvedValue({
      data: {
        score: 90,
        strength: 'strong',
        errors: [],
        suggestions: [],
        is_valid: true,
      },
      error: undefined,
    } as any)
  })

  it('does not submit until the change is confirmed', async () => {
    render(<PasswordInformationCard />)
    submitForm()

    // The confirmation is up and warns about the sign-out, but nothing was sent.
    expect(await screen.findByText(/signs you out everywhere/i)).toBeTruthy()
    expect(mockUpdateUserPassword).not.toHaveBeenCalled()
  })

  it('sends the change and signs the user out once confirmed', async () => {
    render(<PasswordInformationCard />)
    submitForm()
    fireEvent.click(
      await screen.findByRole('button', { name: /^change password$/i })
    )

    await waitFor(() => expect(mockUpdateUserPassword).toHaveBeenCalledTimes(1))
    expect(mockUpdateUserPassword.mock.calls[0][0]).toMatchObject({
      body: { new_password: NEW_PASSWORD, confirm_password: NEW_PASSWORD },
    })

    // The server kills every session, so the app must not keep the dead token.
    await waitFor(() =>
      expect(mockLogout).toHaveBeenCalledWith('password_changed')
    )
  })

  it('cancelling leaves the password unchanged', async () => {
    render(<PasswordInformationCard />)
    submitForm()

    fireEvent.click(await screen.findByRole('button', { name: /cancel/i }))

    await waitFor(() =>
      expect(screen.queryByText(/signs you out everywhere/i)).toBeNull()
    )
    expect(mockUpdateUserPassword).not.toHaveBeenCalled()
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('reports a failed change and does not sign the user out', async () => {
    mockUpdateUserPassword.mockResolvedValue({
      data: undefined,
      error: { detail: 'Current password is incorrect' },
    } as any)
    const onError = vi.fn()

    render(<PasswordInformationCard onError={onError} />)
    submitForm()
    fireEvent.click(
      await screen.findByRole('button', { name: /^change password$/i })
    )

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith('Current password is incorrect')
    )
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('never opens the confirmation when the passwords do not match', async () => {
    const onError = vi.fn()
    render(<PasswordInformationCard onError={onError} />)

    fireEvent.change(screen.getByLabelText(/current password/i), {
      target: { value: '0r1g1n@lP@ssw0rd!' },
    })
    fireEvent.change(screen.getByLabelText(/^new password/i), {
      target: { value: NEW_PASSWORD },
    })
    fireEvent.change(screen.getByLabelText(/confirm password/i), {
      target: { value: 'something-else' },
    })
    fireEvent.click(screen.getByRole('button', { name: /update password/i }))

    await waitFor(() =>
      expect(onError).toHaveBeenCalledWith(
        'New password and confirmation do not match'
      )
    )
    expect(screen.queryByText(/signs you out everywhere/i)).toBeNull()
    expect(mockUpdateUserPassword).not.toHaveBeenCalled()
  })

  it('still changes the password with no AuthProvider around it', async () => {
    // The design bundle and isolated tests render this card without a provider;
    // it must degrade to "no logout" rather than throwing.
    mockUseOptionalAuth.mockReturnValue(null)

    render(<PasswordInformationCard />)
    submitForm()
    fireEvent.click(
      await screen.findByRole('button', { name: /^change password$/i })
    )

    await waitFor(() => expect(mockUpdateUserPassword).toHaveBeenCalledTimes(1))
    expect(mockLogout).not.toHaveBeenCalled()
  })

  it('keeps the card usable when the sign-out redirect fails', async () => {
    mockLogout.mockRejectedValue(new Error('redirect blew up'))
    const onSuccess = vi.fn()

    render(<PasswordInformationCard onSuccess={onSuccess} />)
    submitForm()
    fireEvent.click(confirmButton())

    // The password did change — the card must not report an error for this.
    await waitFor(() =>
      expect(onSuccess).toHaveBeenCalledWith('Password updated successfully.')
    )
    await waitFor(() =>
      expect(screen.queryByText(/signs you out everywhere/i)).toBeNull()
    )
  })
})
