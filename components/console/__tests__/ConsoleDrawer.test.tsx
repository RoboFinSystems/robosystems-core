import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../ConsoleContent', () => ({
  ConsoleContent: ({ variant }: { variant?: string }) => (
    <div data-testid="console-content">{variant}</div>
  ),
}))

import { ConsoleDrawer } from '../ConsoleDrawer'
import type { ConsoleConfig } from '../types'

const CONFIG = {} as ConsoleConfig
const KEY = 'robosystems:console-drawer'

const toggleButton = () => screen.getByRole('button', { name: /console/i })

describe('ConsoleDrawer', () => {
  beforeEach(() => window.localStorage.clear())

  it('starts as a closed bar without mounting the console', () => {
    render(<ConsoleDrawer config={CONFIG} />)
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.queryByTestId('console-content')).not.toBeInTheDocument()
  })

  it('opens the console in its panel variant', () => {
    render(<ConsoleDrawer config={CONFIG} />)
    fireEvent.click(toggleButton())
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('console-content')).toHaveTextContent('panel')
    expect(
      screen.getByRole('separator', { name: 'Resize console' })
    ).toBeInTheDocument()
  })

  it('keeps the console mounted when closed, so the conversation survives', () => {
    render(<ConsoleDrawer config={CONFIG} />)
    fireEvent.click(toggleButton())
    fireEvent.click(toggleButton())
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByTestId('console-content')).toBeInTheDocument()
  })

  it('toggles with Ctrl+`', () => {
    render(<ConsoleDrawer config={CONFIG} />)
    act(() => {
      window.dispatchEvent(
        new KeyboardEvent('keydown', { key: '`', ctrlKey: true })
      )
    })
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true')
  })

  it('remembers being open and its height', () => {
    render(<ConsoleDrawer config={CONFIG} />)
    fireEvent.click(toggleButton())
    expect(JSON.parse(window.localStorage.getItem(KEY)!)).toEqual({
      open: true,
      height: 320,
    })
  })

  it('restores an open drawer', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ open: true, height: 400 })
    )
    render(<ConsoleDrawer config={CONFIG} />)
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('console-drawer').style.height).toBe('400px')
  })

  it('ignores corrupt storage', () => {
    window.localStorage.setItem(KEY, '{not json')
    render(<ConsoleDrawer config={CONFIG} />)
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false')
  })
})
