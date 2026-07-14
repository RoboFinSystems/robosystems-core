import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { CategoryInputProps } from '../CategoryInput'
import { CategoryInput } from '../CategoryInput'

function Harness(props: Partial<CategoryInputProps> & { initial?: string }) {
  const { initial = '', onChange, ...rest } = props
  const [value, setValue] = useState(initial)
  return (
    <CategoryInput
      value={value}
      onChange={(next) => {
        setValue(next)
        onChange?.(next)
      }}
      {...rest}
    />
  )
}

const input = () => screen.getByRole('combobox')

describe('CategoryInput', () => {
  it('accepts freeform typing', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(input(), { target: { value: 'projects' } })
    expect(onChange).toHaveBeenLastCalledWith('projects')
  })

  it('opens all suggestions on focus and filters as the user types', () => {
    render(
      <Harness
        suggestions={['note', 'fact', 'preference']}
        onChange={vi.fn()}
      />
    )
    fireEvent.focus(input())
    expect(screen.getAllByRole('option')).toHaveLength(3)

    fireEvent.change(input(), { target: { value: 'fa' } })
    expect(screen.getAllByRole('option')).toHaveLength(1)
    expect(screen.getByRole('option', { name: 'fact' })).toBeInTheDocument()
  })

  it('selects a suggestion on mousedown', () => {
    const onChange = vi.fn()
    render(<Harness suggestions={['note', 'fact']} onChange={onChange} />)
    fireEvent.focus(input())
    fireEvent.mouseDown(screen.getByText('fact'))
    expect(onChange).toHaveBeenLastCalledWith('fact')
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('selects with ArrowDown + Enter', () => {
    const onChange = vi.fn()
    render(<Harness suggestions={['note', 'fact']} onChange={onChange} />)
    fireEvent.focus(input())
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'ArrowDown' })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('fact')
  })

  it('wraps keyboard navigation and supports ArrowUp', () => {
    const onChange = vi.fn()
    render(<Harness suggestions={['note', 'fact']} onChange={onChange} />)
    fireEvent.focus(input())
    fireEvent.keyDown(input(), { key: 'ArrowUp' })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith('fact')
  })

  it('Enter with no active item closes the list without changing the value', () => {
    const onChange = vi.fn()
    render(<Harness suggestions={['note']} onChange={onChange} />)
    fireEvent.focus(input())
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(screen.queryByRole('listbox')).toBeNull()
    expect(onChange).not.toHaveBeenCalled()
  })

  it('closes on Escape and on blur', () => {
    render(<Harness suggestions={['note']} onChange={vi.fn()} />)
    fireEvent.focus(input())
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()

    fireEvent.focus(input())
    fireEvent.blur(input())
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('shows no suggestions when disabled', () => {
    render(<Harness suggestions={['note']} disabled onChange={vi.fn()} />)
    fireEvent.focus(input())
    expect(screen.queryByRole('listbox')).toBeNull()
  })
})
