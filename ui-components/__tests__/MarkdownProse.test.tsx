import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { MarkdownProse } from '../MarkdownProse'

// react-markdown is aliased to a mock that renders children verbatim inside
// a div[data-testid="react-markdown"], so assertions target the source text.

describe('MarkdownProse', () => {
  it('passes the markdown source through to react-markdown', () => {
    render(<MarkdownProse># Hello world</MarkdownProse>)
    expect(screen.getByTestId('react-markdown')).toHaveTextContent(
      '# Hello world'
    )
  })

  it('applies the base prose classes by default', () => {
    const { container } = render(<MarkdownProse>text</MarkdownProse>)
    const wrapper = container.firstElementChild!
    expect(wrapper.className).toContain('prose')
    expect(wrapper.className).toContain('prose-base')
    expect(wrapper.className).toContain('dark:prose-dark')
    expect(wrapper.className).toContain('max-w-none')
  })

  it('applies prose-sm for size="sm"', () => {
    const { container } = render(<MarkdownProse size="sm">text</MarkdownProse>)
    const wrapper = container.firstElementChild!
    expect(wrapper.className).toContain('prose-sm')
    expect(wrapper.className).not.toContain('prose-base')
  })

  it('merges caller classes', () => {
    const { container } = render(
      <MarkdownProse className="px-6 py-4">text</MarkdownProse>
    )
    expect(container.firstElementChild!.className).toContain('px-6')
  })
})
