export interface McpConnectorUrl {
  /** Bare per-graph MCP endpoint URL (no credential) */
  endpoint: string
  /** The plaintext graph-scoped API key (returned once at mint) */
  apiKey: string
  /** Name the key was created under (visible in Settings → API Keys) */
  keyName: string
  graphId: string
}

const DEFAULT_API_URL = 'https://api.robosystems.ai'

/**
 * Mint a graph-scoped API key for the per-graph MCP endpoint.
 *
 * For clients that cannot sign in (scripts, CI, editors without OAuth):
 * the key goes in an `X-API-Key` header on `endpoint`. It works for
 * exactly this graph (and its subgraphs), is rejected on every
 * account-level surface, and can be revoked from Settings → API Keys like
 * any other key. Credentials never travel in the URL — the `?token=`
 * connector URL was the bridge to OAuth and the server no longer honors
 * it. OAuth-capable clients need no key at all: they add `endpoint` (or
 * the graph-agnostic `/v1/mcp`) and sign in.
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
    endpoint,
    apiKey: response.data.key,
    keyName,
    graphId,
  }
}
