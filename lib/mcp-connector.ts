export interface McpConnectorUrl {
  /** Pasteable connector URL with the graph-scoped key embedded as `?token=` */
  url: string
  /** Bare MCP endpoint URL (no credential) — for header-capable clients */
  endpoint: string
  /** The plaintext graph-scoped API key (returned once at mint) */
  apiKey: string
  /** Name the key was created under (visible in Settings → API Keys) */
  keyName: string
  graphId: string
}

const DEFAULT_API_URL = 'https://api.robosystems.ai'

/**
 * Mint a graph-scoped API key and assemble the MCP connector URL for it.
 *
 * The URL is for clients that cannot send custom headers (claude.ai /
 * Claude Desktop custom connectors): the scoped key travels as a `token`
 * query parameter, which the server honors only on the MCP endpoint and
 * only for keys scoped to that URL's graph — account-wide keys are
 * rejected there. The key works for exactly this graph (and its
 * subgraphs), is rejected on every account-level surface, and can be
 * revoked from Settings → API Keys like any other key.
 *
 * Header-capable clients (Claude Code, Cursor, VS Code) should use the
 * bare `endpoint` with the key in an `X-API-Key` header instead.
 */
export async function createMcpConnectorUrl(
  graphId: string,
  options: { apiUrl?: string; name?: string } = {}
): Promise<McpConnectorUrl> {
  const { createUserApiKey } = await import('@robosystems/client/sdk')

  const apiUrl = (options.apiUrl ?? DEFAULT_API_URL).replace(/\/$/, '')
  const keyName =
    options.name ??
    `MCP Connector - ${graphId} - ${new Date().toLocaleDateString()}`

  const response = await createUserApiKey({
    body: { name: keyName, graph_id: graphId },
  })

  if (!response.data) {
    throw new Error('Failed to create connector API key')
  }

  const endpoint = `${apiUrl}/v1/graphs/${graphId}/mcp`
  return {
    url: `${endpoint}?token=${response.data.key}`,
    endpoint,
    apiKey: response.data.key,
    keyName,
    graphId,
  }
}
