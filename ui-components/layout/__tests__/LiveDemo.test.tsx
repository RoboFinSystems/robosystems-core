import { render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { LiveDemo } from '../LiveDemo'

describe('LiveDemo', () => {
  afterEach(() => vi.restoreAllMocks())

  it('reserves the stage aspect ratios before the demo loads', async () => {
    // there is no /demos in the test environment: the load fails, and says so
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(
      <LiveDemo
        name="hero"
        aspect={16 / 9}
        phoneAspect={2 / 3}
        label="A demo of the product"
      />
    )
    const frame = screen.getByRole('img', { name: 'A demo of the product' })
    expect(frame.style.getPropertyValue('--aspect')).toBe(String(16 / 9))
    expect(frame.style.getPropertyValue('--phone-aspect')).toBe(String(2 / 3))
    await waitFor(() =>
      expect(error).toHaveBeenCalledWith(
        'LiveDemo "hero" failed to load',
        expect.anything()
      )
    )
  })

  it('uses the desktop ratio on phones when no phone layout is given', async () => {
    const error = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<LiveDemo name="hero" aspect={1.6} label="Demo" />)
    const frame = screen.getByRole('img', { name: 'Demo' })
    expect(frame.style.getPropertyValue('--phone-aspect')).toBe('1.6')
    await waitFor(() => expect(error).toHaveBeenCalled())
  })
})
