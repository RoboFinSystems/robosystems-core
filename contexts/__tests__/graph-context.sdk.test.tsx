// GraphProvider against the real @robosystems/client.
import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { json, stubFetch, type FetchStub } from '../../test/sdk-fetch'
import { GraphProvider, useGraphContext } from '../graph-context'

const graph = (graphId: string, isRepository = false) => ({
  graphId,
  graphName: graphId,
  role: 'owner',
  isSelected: false,
  isRepository,
  createdAt: '2026-01-01T00:00:00Z',
})

let net: FetchStub
let ctx: ReturnType<typeof useGraphContext>
const Probe = () => {
  ctx = useGraphContext()
  return null
}
const mount = () =>
  render(
    <GraphProvider
      initialGraphId="kg_prev"
      persistGraphSelection={vi.fn(async () => undefined)}
    >
      <Probe />
    </GraphProvider>
  )

beforeEach(() => {
  net = stubFetch()
  vi.spyOn(console, 'error').mockImplementation(() => undefined)
})

describe('loadGraphs', () => {
  it('a failed graph list ends loading and reports the error', async () => {
    net.setHandler(() => json(503, { detail: 'unavailable' }))
    mount()
    await waitFor(() => expect(ctx.state.isLoading).toBe(false))
    expect(ctx.state.error).toBe('Failed to load graphs')
  })
})

describe('setCurrentGraph', () => {
  it('selects a user graph on the server when clicked', async () => {
    net.setHandler((req) =>
      req.url.endsWith('/v1/graphs')
        ? json(200, {
            graphs: [graph('kg_a'), graph('kg_b'), graph('sec', true)],
            selectedGraphId: 'kg_a',
          })
        : json(200, {})
    )
    mount()
    await waitFor(() => expect(ctx.state.graphs).toHaveLength(3))

    await act(async () => {
      await ctx.setCurrentGraph('kg_b')
    })
    await act(async () => {
      await ctx.setCurrentGraph('kg_a')
    })
    await act(async () => {
      await ctx.setCurrentGraph('sec')
    })
    const selects = net.requests('POST', '/select').map((r) => r.url)
    expect(selects).toHaveLength(2)
    expect(selects[0]).toContain('/v1/graphs/kg_b/select')
    expect(selects[1]).toContain('/v1/graphs/kg_a/select')
    expect(ctx.state.currentGraphId).toBe('sec')
  })

  it('selects a graph created a moment ago (refresh, then select)', async () => {
    let graphs = [graph('kg_a')]
    net.setHandler((req) =>
      req.url.endsWith('/v1/graphs')
        ? json(200, { graphs, selectedGraphId: 'kg_a' })
        : json(200, {})
    )
    mount()
    await waitFor(() => expect(ctx.state.graphs).toHaveLength(1))

    graphs = [graph('kg_a'), graph('kg_new')]
    await act(async () => {
      await ctx.refreshGraphs()
      await ctx.setCurrentGraph('kg_new')
    })
    expect(net.requests('POST', '/v1/graphs/kg_new/select')).toHaveLength(1)
  })
})
