import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('@robosystems/client/clients', () => ({
  clients: {
    operator: {
      executeQuery: vi.fn(),
    },
  },
}))

import { clients } from '@robosystems/client/clients'
import { anchoredMessage, errorDetail } from '../anchor'
import { ReportChat } from '../ReportChat'

const executeQuery = vi.mocked(clients.operator.executeQuery)

// A fictional filer's report.
const NOTE =
  'REPORT IN CONTEXT: Halvorsen Instruments Corp (HVI), 10-Q for Q2 2026, accession 0001234567-26-000060.'
const FOCUS = { cik: '0001234567', accession: '0001234567-26-000060' }

function renderChat(props: Partial<Parameters<typeof ReportChat>[0]> = {}) {
  return render(
    <ReportChat
      graphId="sec"
      anchorNote={NOTE}
      focus={FOCUS}
      title="Ask about this filing"
      hint="Uses credits."
      intro="Ask anything about the filing."
      examples={['Summarize this filing']}
      defaultOpen
      {...props}
    />
  )
}

describe('anchoredMessage and errorDetail', () => {
  it('puts the note ahead of the trimmed question, or sends the question alone', () => {
    expect(anchoredMessage(NOTE, '  What was revenue? ')).toBe(
      `${NOTE}\n\nQuestion: What was revenue?`
    )
    expect(anchoredMessage('  ', 'What was revenue?')).toBe('What was revenue?')
  })

  it('picks the first useful field of an operator failure', () => {
    expect(errorDetail({ message: '', error: 'Not enough credits' }, 'x')).toBe(
      'Not enough credits'
    )
    expect(errorDetail(undefined, 'fallback')).toBe('fallback')
  })
})

describe('ReportChat', () => {
  // Block body on purpose: `mockClear()` returns the spy, and a hook that
  // returns a function hands vitest a cleanup to call — which would call the
  // spy with no arguments after each test, outside the component's try.
  beforeEach(() => {
    executeQuery.mockClear()
  })

  it('starts collapsed unless told otherwise, and opens on the header', () => {
    renderChat({ defaultOpen: false })
    expect(screen.queryByText('Ask anything about the filing.')).toBeNull()
    fireEvent.click(
      screen.getByRole('button', { name: /ask about this filing/i })
    )
    expect(screen.getByText('Ask anything about the filing.')).toBeTruthy()
  })

  it('shows the host’s unavailable state instead of the chat', () => {
    renderChat({ available: false, unavailable: 'Connect the SEC repository.' })
    expect(screen.getByText('Connect the SEC repository.')).toBeTruthy()
    expect(screen.queryByLabelText('Ask about this filing')).toBeNull()
  })

  it('sends an example question anchored on the report, with the focus, and renders the answer and its credits', async () => {
    executeQuery.mockResolvedValue({
      content: 'Revenue was **$255M** for the quarter.',
      metadata: { credits_consumed: 2.5 },
    } as never)
    renderChat()
    fireEvent.click(screen.getByText('Summarize this filing'))
    await waitFor(() => expect(executeQuery).toHaveBeenCalledTimes(1))
    const [graphId, request, options] = executeQuery.mock.calls[0]
    expect(graphId).toBe('sec')
    expect(request).toMatchObject({
      message: `${NOTE}\n\nQuestion: Summarize this filing`,
      mode: 'standard',
      context: { focus: FOCUS },
    })
    expect(request).not.toHaveProperty('history')
    expect(options).toMatchObject({ mode: 'auto' })
    await waitFor(() => expect(screen.getByText(/Revenue was/)).toBeTruthy())
    expect(screen.getByText('2.5 credits')).toBeTruthy()
  })

  it('carries prior turns as history on the next question', async () => {
    executeQuery.mockResolvedValue({ content: 'First answer.' } as never)
    renderChat()
    fireEvent.click(screen.getByText('Summarize this filing'))
    await waitFor(() => expect(screen.getByText('First answer.')).toBeTruthy())
    fireEvent.change(screen.getByLabelText('Ask about this filing'), {
      target: { value: 'And net income?' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Ask' }))
    await waitFor(() => expect(executeQuery).toHaveBeenCalledTimes(2))
    expect(executeQuery.mock.calls[1][1]).toMatchObject({
      history: [
        { role: 'user', content: 'Summarize this filing' },
        { role: 'assistant', content: 'First answer.' },
      ],
    })
  })

  it('renders an operator failure reported as error_details as an error', async () => {
    executeQuery.mockResolvedValue({
      content: 'Not enough credits to perform AI analysis',
      error_details: { error: 'insufficient_credits' },
    } as never)
    renderChat()
    fireEvent.click(screen.getByText('Summarize this filing'))
    await waitFor(() =>
      expect(screen.getByText('insufficient_credits')).toBeTruthy()
    )
  })

  it('renders a thrown failure as an error', async () => {
    executeQuery.mockImplementation(() => {
      throw new Error('Network down')
    })
    renderChat()
    fireEvent.click(screen.getByText('Summarize this filing'))
    await waitFor(() => screen.getByText('Error: Network down'))
    expect(executeQuery.mock.results[0]?.type).toBe('throw')
  })
})
