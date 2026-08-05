import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@robosystems/client/sdk', () => ({
  createUserApiKey: vi.fn(),
}))

import { createUserApiKey } from '@robosystems/client/sdk'
import { createMcpConnectorUrl } from '../mcp-connector'

const mockCreateUserApiKey = vi.mocked(createUserApiKey)

describe('createMcpConnectorUrl', () => {
  beforeEach(() => {
    mockCreateUserApiKey.mockReset()
  })

  it('mints a graph-scoped key and assembles the token URL', async () => {
    mockCreateUserApiKey.mockResolvedValue({
      data: { key: 'rfsc_abc123' },
    } as any)

    const result = await createMcpConnectorUrl('kg123', {
      apiUrl: 'https://api.example.com',
    })

    expect(mockCreateUserApiKey).toHaveBeenCalledWith({
      body: expect.objectContaining({ graph_id: 'kg123' }),
    })
    expect(result.url).toBe(
      'https://api.example.com/v1/graphs/kg123/mcp?token=rfsc_abc123'
    )
    expect(result.endpoint).toBe('https://api.example.com/v1/graphs/kg123/mcp')
    expect(result.apiKey).toBe('rfsc_abc123')
    expect(result.graphId).toBe('kg123')
    expect(result.keyName).toContain('kg123')
  })

  it('strips a trailing slash from the API URL', async () => {
    mockCreateUserApiKey.mockResolvedValue({
      data: { key: 'rfsc_abc123' },
    } as any)

    const result = await createMcpConnectorUrl('kg123', {
      apiUrl: 'https://api.example.com/',
    })

    expect(result.endpoint).toBe('https://api.example.com/v1/graphs/kg123/mcp')
  })

  it('uses a caller-provided key name verbatim', async () => {
    mockCreateUserApiKey.mockResolvedValue({
      data: { key: 'rfsc_abc123' },
    } as any)

    const result = await createMcpConnectorUrl('kg123', {
      name: 'Claude connector — Acme',
    })

    expect(mockCreateUserApiKey).toHaveBeenCalledWith({
      body: { name: 'Claude connector — Acme', graph_id: 'kg123' },
    })
    expect(result.keyName).toBe('Claude connector — Acme')
  })

  it('throws when the API returns no data', async () => {
    mockCreateUserApiKey.mockResolvedValue({ data: undefined } as any)

    await expect(createMcpConnectorUrl('kg123')).rejects.toThrow(
      'Failed to create connector API key'
    )
  })
})
