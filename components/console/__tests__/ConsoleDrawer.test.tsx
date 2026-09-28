import { act, fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('../ConsoleContent', () => ({
  ConsoleContent: ({ variant }: { variant?: string }) => (
    <div data-testid="console-content">{variant}</div>
  ),
}))

import { openConsoleDrawer } from '../../../lib/console-drawer'
import { ConsoleDrawer } from '../ConsoleDrawer'
import type { ConsoleConfig } from '../types'

const CONFIG = {} as ConsoleConfig
const KEY = 'robosystems:console-drawer'

const toggleButton = () => screen.getByRole('button', { name: /^console/i })

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

  it('publishes the space it covers for page padding', () => {
    const covered = () =>
      document.documentElement.style.getPropertyValue('--console-drawer-height')
    const { unmount } = render(<ConsoleDrawer config={CONFIG} />)
    expect(covered()).toBe('32px')
    fireEvent.click(toggleButton())
    expect(covered()).toBe('320px')
    unmount()
    expect(covered()).toBe('')
  })

  it('maximizes and restores', () => {
    render(<ConsoleDrawer config={CONFIG} />)
    fireEvent.click(toggleButton())
    const drawer = screen.getByTestId('console-drawer')
    fireEvent.click(screen.getByRole('button', { name: 'Maximize console' }))
    expect(drawer.style.height).toBe(
      `${Math.floor(window.innerHeight * 0.8)}px`
    )
    fireEvent.click(
      screen.getByRole('button', { name: 'Restore console size' })
    )
    expect(drawer.style.height).toBe('320px')
  })

  it('resets its height on a double-click of the resize edge', () => {
    window.localStorage.setItem(
      KEY,
      JSON.stringify({ open: true, height: 500 })
    )
    render(<ConsoleDrawer config={CONFIG} />)
    fireEvent.doubleClick(screen.getByRole('separator'))
    expect(screen.getByTestId('console-drawer').style.height).toBe('320px')
  })

  it('opens when any page calls openConsoleDrawer', () => {
    render(<ConsoleDrawer config={CONFIG} />)
    act(() => openConsoleDrawer())
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByTestId('console-content')).toBeInTheDocument()
    expect(JSON.parse(window.localStorage.getItem(KEY)!).open).toBe(true)
  })

  it('stays open when asked again', () => {
    render(<ConsoleDrawer config={CONFIG} />)
    act(() => openConsoleDrawer())
    act(() => openConsoleDrawer())
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'true')
  })

  it('ignores corrupt storage', () => {
    window.localStorage.setItem(KEY, '{not json')
    render(<ConsoleDrawer config={CONFIG} />)
    expect(toggleButton()).toHaveAttribute('aria-expanded', 'false')
  })
})
