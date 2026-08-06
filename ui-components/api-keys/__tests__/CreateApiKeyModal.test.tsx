import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { CreateApiKeyModal } from '../CreateApiKeyModal'

const GRAPHS = [
  { graphId: 'kg1a2b3c', graphName: 'Acme Ledger' },
  { graphId: 'sec', graphName: 'SEC Repository' },
]

const createdKey = (graphId?: string) => ({
  id: 'key-1',
  name: 'Test key',
  key: 'rfsc' + 'a'.repeat(64),
  graphId,
  createdAt: '2026-01-01T00:00:00Z',
  lastUsedAt: null,
  expiresAt: null,
  isActive: true,
  isSystem: false,
})

describe('CreateApiKeyModal', () => {
  it('offers a scope selector when graphs are provided, defaulting to account-wide', () => {
    render(
      <CreateApiKeyModal
        isOpen
        onClose={vi.fn()}
        onCreateKey={vi.fn()}
        graphs={GRAPHS}
      />
    )

    const select = screen.getByLabelText('Scope') as HTMLSelectElement
    expect(select.value).toBe('')
    expect(screen.getByText('Account-wide (all graphs)')).toBeInTheDocument()
    expect(screen.getByText('Acme Ledger (kg1a2b3c)')).toBeInTheDocument()
    // The default copy explains the URL restriction, so the "my key won't
    // connect" confusion is answered at mint time.
    expect(
      screen.getByText(/Not accepted inside MCP connector URLs/)
    ).toBeInTheDocument()
  })

  it('renders no scope selector without graphs (legacy standalone contract)', () => {
    render(<CreateApiKeyModal isOpen onClose={vi.fn()} onCreateKey={vi.fn()} />)

    expect(screen.queryByLabelText('Scope')).not.toBeInTheDocument()
  })

  it('passes the selected graph scope to onCreateKey', async () => {
    const onCreateKey = vi.fn().mockResolvedValue(createdKey('kg1a2b3c'))
    render(
      <CreateApiKeyModal
        isOpen
        onClose={vi.fn()}
        onCreateKey={onCreateKey}
        graphs={GRAPHS}
      />
    )

    fireEvent.change(screen.getByLabelText('API Key Name'), {
      target: { value: 'Scoped key' },
    })
    fireEvent.change(screen.getByLabelText('Scope'), {
      target: { value: 'kg1a2b3c' },
    })
    expect(
      screen.getByText(/only kind of key accepted inside an MCP connector URL/)
    ).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Create API Key' }))

    await waitFor(() => {
      expect(onCreateKey).toHaveBeenCalledWith({
        name: 'Scoped key',
        graphId: 'kg1a2b3c',
      })
    })
    expect(screen.getByText('kg1a2b3c')).toBeInTheDocument()
  })

  it('creates an account-wide key when no scope is picked', async () => {
    const onCreateKey = vi.fn().mockResolvedValue(createdKey(undefined))
    render(
      <CreateApiKeyModal
        isOpen
        onClose={vi.fn()}
        onCreateKey={onCreateKey}
        graphs={GRAPHS}
      />
    )

    fireEvent.change(screen.getByLabelText('API Key Name'), {
      target: { value: 'Account key' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Create API Key' }))

    await waitFor(() => {
      expect(onCreateKey).toHaveBeenCalledWith({
        name: 'Account key',
        graphId: undefined,
      })
    })
    expect(screen.getByText('Account-wide')).toBeInTheDocument()
  })
})
