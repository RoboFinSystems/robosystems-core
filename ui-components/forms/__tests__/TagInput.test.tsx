import { fireEvent, render, screen } from '@testing-library/react'
import { useState } from 'react'
import { describe, expect, it, vi } from 'vitest'
import type { TagInputProps } from '../TagInput'
import { TagInput } from '../TagInput'

/** Controlled harness so multi-step interactions see updated tags. */
function Harness(props: Partial<TagInputProps> & { initial?: string[] }) {
  const { initial = [], onChange, ...rest } = props
  const [tags, setTags] = useState<string[]>(initial)
  return (
    <TagInput
      tags={tags}
      onChange={(next) => {
        setTags(next)
        onChange?.(next)
      }}
      {...rest}
    />
  )
}

const input = () => screen.getByRole('combobox')

describe('TagInput', () => {
  it('adds a tag on Enter, trimmed and lowercased', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(input(), { target: { value: '  Finance ' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith(['finance'])
    expect(input()).toHaveValue('')
  })

  it('adds a tag on comma', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(input(), { target: { value: 'alpha' } })
    fireEvent.keyDown(input(), { key: ',' })
    expect(onChange).toHaveBeenLastCalledWith(['alpha'])
  })

  it('splits pasted comma-separated text into tags', () => {
    const onChange = vi.fn()
    render(<Harness onChange={onChange} />)
    fireEvent.change(input(), { target: { value: 'a, b, c' } })
    expect(onChange).toHaveBeenLastCalledWith(['a', 'b'])
    expect(input()).toHaveValue(' c')
  })

  it('dedupes against existing tags and ignores empty drafts', () => {
    const onChange = vi.fn()
    render(<Harness initial={['alpha']} onChange={onChange} />)
    fireEvent.change(input(), { target: { value: 'ALPHA' } })
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
    fireEvent.keyDown(input(), { key: 'Enter' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes the last tag on Backspace with an empty draft', () => {
    const onChange = vi.fn()
    render(<Harness initial={['alpha', 'beta']} onChange={onChange} />)
    fireEvent.keyDown(input(), { key: 'Backspace' })
    expect(onChange).toHaveBeenLastCalledWith(['alpha'])
  })

  it('does not remove tags on Backspace while a draft is present', () => {
    const onChange = vi.fn()
    render(<Harness initial={['alpha']} onChange={onChange} />)
    fireEvent.change(input(), { target: { value: 'x' } })
    fireEvent.keyDown(input(), { key: 'Backspace' })
    expect(onChange).not.toHaveBeenCalled()
  })

  it('removes a tag via its chip remove button', () => {
    const onChange = vi.fn()
    render(<Harness initial={['alpha', 'beta']} onChange={onChange} />)
    fireEvent.click(screen.getByLabelText('Remove tag alpha'))
    expect(onChange).toHaveBeenLastCalledWith(['beta'])
  })

  it('shows focused suggestions minus existing tags and filters by draft', () => {
    render(
      <Harness
        initial={['alpha']}
        suggestions={['alpha', 'beta', 'gamma']}
        onChange={vi.fn()}
      />
    )
    fireEvent.focus(input())
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    expect(screen.queryByRole('option', { name: 'alpha' })).toBeNull()
    expect(screen.getByRole('option', { name: 'beta' })).toBeInTheDocument()

    fireEvent.change(input(), { target: { value: 'gam' } })
    expect(screen.queryByRole('option', { name: 'beta' })).toBeNull()
    expect(screen.getByRole('option', { name: 'gamma' })).toBeInTheDocument()
  })

  it('commits a suggestion on mousedown and clears the draft', () => {
    const onChange = vi.fn()
    render(<Harness suggestions={['beta']} onChange={onChange} />)
    fireEvent.focus(input())
    fireEvent.mouseDown(screen.getByText('beta'))
    expect(onChange).toHaveBeenLastCalledWith(['beta'])
    expect(input()).toHaveValue('')
  })

  it('hides suggestions on Escape and on blur', () => {
    render(<Harness suggestions={['beta']} onChange={vi.fn()} />)
    fireEvent.focus(input())
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.keyDown(input(), { key: 'Escape' })
    expect(screen.queryByRole('listbox')).toBeNull()

    fireEvent.focus(input())
    expect(screen.getByRole('listbox')).toBeInTheDocument()
    fireEvent.blur(input())
    expect(screen.queryByRole('listbox')).toBeNull()
  })

  it('renders chips for every tag', () => {
    render(<Harness initial={['alpha', 'beta']} onChange={vi.fn()} />)
    expect(screen.getByText('alpha')).toBeInTheDocument()
    expect(screen.getByText('beta')).toBeInTheDocument()
  })
})
