import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeAll, beforeEach, describe, expect, it, vi } from 'vitest'

import type { ConsoleConfig } from '../types'

vi.mock('../../../contexts', () => ({
  useGraphContext: vi.fn(),
}))

vi.mock('../../../hooks', () => ({
  useStreamingQuery: vi.fn(),
}))

vi.mock('../../../theme', () => ({
  customTheme: {
    card: {},
  },
}))

vi.mock('@robosystems/client/clients', () => ({
  clients: {
    operator: {
      executeQuery: vi.fn(),
    },
  },
}))

// The component imports the root SDK namespace (`import * as SDK`) for the
// /search and /recall handlers; type-only imports are erased, so mocking the
// runtime functions is enough.
vi.mock('@robosystems/client', () => ({
  recallMemory: vi.fn(),
  searchDocuments: vi.fn(),
}))

// /mcp mints an API key before printing the connect instructions.
vi.mock('@robosystems/client/sdk', () => ({
  createUserApiKey: vi.fn(),
}))

// Import after mocks
import * as SDK from '@robosystems/client'
import { clients } from '@robosystems/client/clients'
import { createUserApiKey } from '@robosystems/client/sdk'
import { useGraphContext } from '../../../contexts'
import { useStreamingQuery } from '../../../hooks'
import { ConsoleContent } from '../ConsoleContent'

const mockUseGraphContext = vi.mocked(useGraphContext)
const mockUseStreamingQuery = vi.mocked(useStreamingQuery)
const mockOperatorExecuteQuery = vi.mocked(clients.operator.executeQuery)
const mockRecallMemory = vi.mocked(SDK.recallMemory)
const mockCreateUserApiKey = vi.mocked(createUserApiKey)

const TEST_CONFIG: ConsoleConfig = {
  header: {
    title: 'Test Console',
    subtitle: 'Test subtitle',
    gradientFrom: 'from-blue-500',
    gradientTo: 'to-purple-600',
  },
  welcome: {
    consoleName: 'Test Console',
    description: 'Test interactive console',
    contextLabel: 'Graph',
    naturalLanguageExamples: [
      'Show me all entities',
      'How many nodes are there?',
    ],
    directQueryExamples: [
      'MATCH (n) RETURN count(n)',
      'MATCH (e:Entity) RETURN e.name LIMIT 10',
    ],
    closingMessage: 'How can I help you today?',
  },
  mcp: {
    serverName: 'test-server',
    packageName: '@test/mcp',
    exampleQuestions: ['Query my graph', 'Get schema'],
    contextIdFallback: 'your_test_id',
  },
  sampleQueries: [
    { name: 'Count nodes', query: 'MATCH (n) RETURN count(n)' },
    { name: 'List entities', query: 'MATCH (e:Entity) RETURN e LIMIT 5' },
  ],
  examplesLabel: 'Test Example Queries:',
  noSelectionError: 'No graph selected. Please select a graph first.',
  extraCommands: [
    {
      command: '/custom',
      handler: (ctx) => {
        ctx.addSystemMessage('Custom command executed!', true)
      },
    },
  ],
}

type GraphContextMock = {
  state: {
    graphs: Array<{ graphId: string }>
    isLoading: boolean
    currentGraphId: string | null
  }
  loadGraphs: ReturnType<typeof vi.fn>
  setCurrentGraph: ReturnType<typeof vi.fn>
  refreshGraphs: ReturnType<typeof vi.fn>
}

const createGraphContext = (
  overrides: Partial<GraphContextMock> = {}
): GraphContextMock => {
  const baseState: GraphContextMock['state'] = {
    graphs: [{ graphId: 'test-graph-id' }],
    isLoading: false,
    currentGraphId: 'test-graph-id',
  }

  const context: GraphContextMock = {
    state: baseState,
    loadGraphs: vi.fn(),
    setCurrentGraph: vi.fn(),
    refreshGraphs: vi.fn(),
  }

  if (overrides.state) {
    context.state = { ...context.state, ...overrides.state }
  }

  return {
    ...context,
    ...overrides,
    state: { ...context.state },
  }
}

describe('ConsoleContent', () => {
  beforeAll(() => {
    Object.defineProperty(window.HTMLElement.prototype, 'scrollIntoView', {
      writable: true,
      value: vi.fn(),
    })

    global.fetch = vi.fn(() =>
      Promise.resolve({
        json: () => Promise.resolve({ details: { version: '1.0.0' } }),
      })
    ) as any
  })

  const mockStreamingQuery = {
    executeQuery: vi.fn(),
    cancelQuery: vi.fn(),
    reset: vi.fn(),
    isStreaming: false,
    status: 'idle',
    results: [],
    error: null,
    creditsUsed: null,
    cached: false,
    duration: null,
    progress: null,
    totalRows: null,
    currentRow: null,
  }

  let graphContext: GraphContextMock

  beforeEach(() => {
    vi.clearAllMocks()
    mockStreamingQuery.executeQuery.mockReset()
    mockStreamingQuery.cancelQuery.mockReset()
    mockStreamingQuery.reset.mockReset()
    mockOperatorExecuteQuery.mockReset()

    graphContext = createGraphContext()
    mockUseStreamingQuery.mockReturnValue(mockStreamingQuery)
    mockUseGraphContext.mockReturnValue(graphContext)
  })

  it('should render the console with config-driven header', async () => {
    render(<ConsoleContent config={TEST_CONFIG} />)

    expect(
      screen.getByRole('heading', { name: /test console/i })
    ).toBeInTheDocument()
    expect(screen.getByText('Test subtitle')).toBeInTheDocument()
    await waitFor(() => {
      expect(screen.getByText(/Graph: test-graph-id/i)).toBeInTheDocument()
    })
    expect(
      screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
    ).toBeInTheDocument()
  })

  it('should show "Not selected" when no graph is selected', async () => {
    graphContext = createGraphContext({
      state: { currentGraphId: null, graphs: [], isLoading: false },
    })
    mockUseGraphContext.mockReturnValue(graphContext)

    render(<ConsoleContent config={TEST_CONFIG} />)

    await waitFor(() => {
      expect(screen.getByText(/Graph:\s+Not selected/i)).toBeInTheDocument()
    })
  })

  it('should disable input when no graph is selected', () => {
    graphContext = createGraphContext({
      state: { currentGraphId: null, graphs: [] },
    })
    mockUseGraphContext.mockReturnValue(graphContext)

    render(<ConsoleContent config={TEST_CONFIG} />)

    const input = screen.getByPlaceholderText(
      'Type a question, /query <cypher>, or /help...'
    )
    expect(input).toBeDisabled()
  })

  it('should enable input when graph is selected', () => {
    render(<ConsoleContent config={TEST_CONFIG} />)

    const input = screen.getByPlaceholderText(
      'Type a question, /query <cypher>, or /help...'
    )
    expect(input).not.toBeDisabled()
  })

  describe('Command Handling', () => {
    it('should handle /help command', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '/help' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('/help')).toBeInTheDocument()
      })
    })

    it('should handle /clear command', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '/clear' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('Console cleared.')).toBeInTheDocument()
      })
    })

    it('/mcp leads with sign-in and mints nothing', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '/mcp' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      // The message animates in at a rate proportional to its length, so wait
      // on its closing line before asserting on the whole body.
      await waitFor(
        () => {
          expect(screen.getByText(/robosystems-mcp-client/)).toBeInTheDocument()
        },
        { timeout: 15000 }
      )

      const output = screen.getByText(/robosystems-mcp-client/)
      // The per-graph URL, credential-free — OAuth on it preselects the graph
      // at consent — plus the graph-agnostic address. No key is minted for a
      // user who is going to sign in, and nothing ever rides in the URL.
      expect(output.textContent).toContain(
        'https://api.robosystems.ai/v1/graphs/test-graph-id/mcp'
      )
      expect(output.textContent).toContain('https://api.robosystems.ai/v1/mcp')
      expect(output.textContent).toContain('/mcp key')
      expect(output.textContent).not.toContain('?token=')
      expect(mockCreateUserApiKey).not.toHaveBeenCalled()
    })

    it('/mcp key mints a graph-scoped key and puts it in a header', async () => {
      mockCreateUserApiKey.mockResolvedValue({
        data: { key: 'rfsc_test_key' },
      } as any)

      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '/mcp key' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(
        () => {
          expect(screen.getByText(/Shown once/)).toBeInTheDocument()
        },
        { timeout: 15000 }
      )

      // Graph-scoped: valid only for this graph, rejected on account surfaces.
      expect(mockCreateUserApiKey).toHaveBeenCalledWith(
        expect.objectContaining({
          body: expect.objectContaining({ graph_id: 'test-graph-id' }),
        })
      )

      const output = screen.getByText(/Shown once/)
      // Header carriage only — the ?token= connector URL is retired.
      expect(output.textContent).toContain('X-API-Key: rfsc_test_key')
      expect(output.textContent).toContain(
        'https://api.robosystems.ai/v1/graphs/test-graph-id/mcp'
      )
      expect(output.textContent).not.toContain('?token=')
    })
    it('should handle /examples command with config-driven label', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '/examples' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText(TEST_CONFIG.examplesLabel)).toBeInTheDocument()
      })
    })

    it('should handle /query command and call reset before executing', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, {
        target: { value: '/query MATCH (n) RETURN n LIMIT 5' },
      })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockStreamingQuery.reset).toHaveBeenCalled()
        expect(mockStreamingQuery.executeQuery).toHaveBeenCalledWith(
          'test-graph-id',
          'MATCH (n) RETURN n LIMIT 5'
        )
      })

      // Verify reset was called before executeQuery
      const resetOrder = mockStreamingQuery.reset.mock.invocationCallOrder[0]
      const execOrder =
        mockStreamingQuery.executeQuery.mock.invocationCallOrder[0]
      expect(resetOrder).toBeLessThan(execOrder)
    })

    it('should handle extra commands from config', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '/custom' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getByText('Custom command executed!')).toBeInTheDocument()
      })
    })

    it('should handle unknown commands', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '/unknown' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(
          screen.getByText((content) =>
            content.includes('Unknown command: /unknown')
          )
        ).toBeInTheDocument()
      })
    })

    it('should clear input after command execution', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '/help' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(input).toHaveValue('')
      })
    })

    it('should ignore empty commands', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '   ' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      expect(input).toHaveValue('   ')
      expect(mockStreamingQuery.executeQuery).not.toHaveBeenCalled()
    })
  })

  describe('Terminal Messages', () => {
    it('should display user messages with green styling', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: 'test query' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        const userMessage = screen.getByText('test query')
        expect(userMessage).toHaveClass('text-green-400')
      })
    })

    it('should display system messages with cyan styling', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '/help' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(screen.getAllByText(/system/i).length).toBeGreaterThan(0)
      })
    })

    it('should display error messages with red styling', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: '/unknown' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        const errorMessage = screen.getByText((content) =>
          content.includes('Unknown command: /unknown')
        )
        expect(errorMessage).toHaveClass('text-red-400')
      })
    })
  })

  describe('Cancel Button', () => {
    it('should show cancel button when streaming', () => {
      mockUseStreamingQuery.mockReturnValue({
        ...mockStreamingQuery,
        isStreaming: true,
      })

      render(<ConsoleContent config={TEST_CONFIG} />)

      expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument()
    })

    it('should not show cancel button when not streaming', () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      expect(
        screen.queryByRole('button', { name: 'Cancel' })
      ).not.toBeInTheDocument()
    })

    it('should call cancelQuery when cancel button is clicked', () => {
      mockUseStreamingQuery.mockReturnValue({
        ...mockStreamingQuery,
        isStreaming: true,
      })

      render(<ConsoleContent config={TEST_CONFIG} />)

      const cancelButton = screen.getByRole('button', { name: 'Cancel' })
      fireEvent.click(cancelButton)

      expect(mockStreamingQuery.cancelQuery).toHaveBeenCalledTimes(1)
    })
  })

  describe('Query Execution', () => {
    it('should execute natural language queries via operator', async () => {
      mockOperatorExecuteQuery.mockResolvedValue({
        query: 'MATCH (n) RETURN n',
        result: [],
      })

      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: 'Show me all nodes' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(mockOperatorExecuteQuery).toHaveBeenCalledWith(
          'test-graph-id',
          {
            message: 'Show me all nodes',
            mode: 'quick',
          },
          expect.any(Object)
        )
      })
    })

    it('should show config-driven error when no graph is selected for cypher query', async () => {
      graphContext = createGraphContext({
        state: { currentGraphId: null, graphs: [] },
      })
      mockUseGraphContext.mockReturnValue(graphContext)

      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, {
        target: { value: '/query MATCH (n) RETURN n' },
      })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(
          screen.getByText(TEST_CONFIG.noSelectionError)
        ).toBeInTheDocument()
      })
    })

    it('should show config-driven error when no graph is selected for operator query', async () => {
      graphContext = createGraphContext({
        state: { currentGraphId: null, graphs: [] },
      })
      mockUseGraphContext.mockReturnValue(graphContext)

      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value: 'Show me data' } })
      fireEvent.keyDown(input, { key: 'Enter' })

      await waitFor(() => {
        expect(
          screen.getByText(TEST_CONFIG.noSelectionError)
        ).toBeInTheDocument()
      })
    })
  })

  describe('/recall command', () => {
    const RECALL_CONFIG: ConsoleConfig = { ...TEST_CONFIG, enableRecall: true }

    const typeCommand = (value: string) => {
      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      fireEvent.change(input, { target: { value } })
      fireEvent.keyDown(input, { key: 'Enter' })
    }

    it('should call recallMemory and render scored hits', async () => {
      mockRecallMemory.mockResolvedValue({
        data: {
          total: 2,
          hits: [
            {
              document_id: 'mem_1',
              score: 0.87,
              source_type: 'memory',
              snippet: 'Acme pays invoices net 30',
              tags: ['billing'],
            },
            {
              document_id: 'mem_2',
              score: 0.61,
              source_type: 'memory',
              snippet: 'Quarter close starts on the 25th',
              tags: null,
            },
          ],
          query: 'payment terms',
          graph_id: 'test-graph-id',
        },
        error: undefined,
      } as any)

      render(<ConsoleContent config={RECALL_CONFIG} />)
      typeCommand('/recall payment terms')

      await waitFor(() => {
        expect(mockRecallMemory).toHaveBeenCalledWith({
          path: { graph_id: 'test-graph-id' },
          body: { query: 'payment terms', k: 10 },
        })
      })
      // The result message types in progressively (ProgressiveText), so give
      // the animation time to reach each fragment.
      await waitFor(
        () => {
          expect(
            screen.getByText((content) => content.includes('[0.87] [billing]'))
          ).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
      await waitFor(
        () => {
          expect(
            screen.getByText((content) =>
              content.includes('Acme pays invoices net 30')
            )
          ).toBeInTheDocument()
        },
        { timeout: 5000 }
      )
    })

    it('should show usage when called without a query', async () => {
      render(<ConsoleContent config={RECALL_CONFIG} />)
      typeCommand('/recall')

      await waitFor(() => {
        expect(
          screen.getByText((content) =>
            content.includes('Usage: /recall <query>')
          )
        ).toBeInTheDocument()
      })
      expect(mockRecallMemory).not.toHaveBeenCalled()
    })

    it('should show config-driven error when no graph is selected', async () => {
      graphContext = createGraphContext({
        state: { currentGraphId: null, graphs: [] },
      })
      mockUseGraphContext.mockReturnValue(graphContext)

      render(<ConsoleContent config={RECALL_CONFIG} />)
      typeCommand('/recall payment terms')

      await waitFor(() => {
        expect(
          screen.getByText(TEST_CONFIG.noSelectionError)
        ).toBeInTheDocument()
      })
      expect(mockRecallMemory).not.toHaveBeenCalled()
    })

    it('should report when no memories are found', async () => {
      mockRecallMemory.mockResolvedValue({
        data: {
          total: 0,
          hits: [],
          query: 'nothing here',
          graph_id: 'test-graph-id',
        },
        error: undefined,
      } as any)

      render(<ConsoleContent config={RECALL_CONFIG} />)
      typeCommand('/recall nothing here')

      await waitFor(() => {
        expect(
          screen.getByText('No memories found for "nothing here".')
        ).toBeInTheDocument()
      })
    })

    it('should explain when semantic memory is not enabled (503)', async () => {
      mockRecallMemory.mockResolvedValue({
        data: undefined,
        error: { detail: 'Semantic memory is not enabled' },
        response: { status: 503 },
      } as any)

      render(<ConsoleContent config={RECALL_CONFIG} />)
      typeCommand('/recall payment terms')

      await waitFor(() => {
        expect(
          screen.getByText(
            'Semantic memory is not enabled in this environment.'
          )
        ).toBeInTheDocument()
      })
    })

    it('should treat /recall as unknown when enableRecall is off', async () => {
      render(<ConsoleContent config={TEST_CONFIG} />)
      typeCommand('/recall payment terms')

      await waitFor(() => {
        expect(
          screen.getByText((content) =>
            content.includes('Unknown command: /recall')
          )
        ).toBeInTheDocument()
      })
      expect(mockRecallMemory).not.toHaveBeenCalled()
    })

    it('should list /recall in help only when enabled', async () => {
      // The welcome banner animates character by character; keep it short so
      // the COMMANDS block renders within the test timeout.
      const minimalWelcome: ConsoleConfig['welcome'] = {
        ...TEST_CONFIG.welcome,
        description: 'x',
        naturalLanguageExamples: ['hi'],
        directQueryExamples: ['RETURN 1'],
        closingMessage: 'ok',
      }
      const enabled: ConsoleConfig = {
        ...TEST_CONFIG,
        welcome: minimalWelcome,
        enableRecall: true,
      }
      const disabled: ConsoleConfig = {
        ...TEST_CONFIG,
        welcome: minimalWelcome,
      }

      const { unmount } = render(<ConsoleContent config={enabled} />)
      await waitFor(
        () => {
          expect(
            screen.getByText((content) =>
              // testing-library normalizes whitespace before matching
              content.includes('/recall - Recall semantic memories')
            )
          ).toBeInTheDocument()
        },
        { timeout: 10000 }
      )
      unmount()

      render(<ConsoleContent config={disabled} />)
      // /examples is the last line of the commands block — once it has typed
      // out, the (absent) /recall line would already have appeared.
      await waitFor(
        () => {
          expect(
            screen.getByText((content) =>
              content.includes('/examples - Show example queries')
            )
          ).toBeInTheDocument()
        },
        { timeout: 10000 }
      )
      expect(
        screen.queryByText((content) =>
          content.includes('/recall - Recall semantic memories')
        )
      ).not.toBeInTheDocument()
    }, 25000)
  })

  describe('Accessibility', () => {
    it('should have proper input type', () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )
      expect(input).toHaveAttribute('type', 'text')
    })

    it('should support keyboard navigation', () => {
      render(<ConsoleContent config={TEST_CONFIG} />)

      const input = screen.getByPlaceholderText(
        'Type a question, /query <cypher>, or /help...'
      )

      input.focus()
      expect(input).toHaveFocus()

      fireEvent.change(input, { target: { value: '/help' } })
      expect(input).toHaveValue('/help')

      fireEvent.keyDown(input, { key: 'Enter' })
      expect(input).toHaveValue('')
    })
  })
})
