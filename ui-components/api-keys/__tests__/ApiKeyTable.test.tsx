import { render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'

import { ApiKeyTable } from '../ApiKeyTable'

describe('ApiKeyTable', () => {
  const baseKey = {
    id: 'key-1',
    name: 'My key',
    createdAt: '2026-01-01T00:00:00Z',
    lastUsedAt: null,
    expiresAt: null,
    isActive: true,
    isSystem: false,
  }

  it('renders a scope badge for graph-scoped keys', () => {
    render(
      <ApiKeyTable
        apiKeys={[{ ...baseKey, graphId: 'kg1a2b3c4d5e6f7a8b9c' }]}
        onRevokeKey={vi.fn()}
      />
    )

    const badge = screen.getByText('kg1a2b3c4d5e6f7a8b9c')
    expect(badge).toBeInTheDocument()
    expect(badge).toHaveAttribute(
      'title',
      expect.stringContaining('Scoped to graph kg1a2b3c4d5e6f7a8b9c')
    )
  })

  it('renders no scope badge for account-wide keys', () => {
    render(<ApiKeyTable apiKeys={[baseKey]} onRevokeKey={vi.fn()} />)

    expect(screen.getByText('My key')).toBeInTheDocument()
    expect(screen.queryByText(/kg1a2b/)).not.toBeInTheDocument()
    expect(screen.queryByTitle(/Scoped to graph/)).not.toBeInTheDocument()
  })
})
