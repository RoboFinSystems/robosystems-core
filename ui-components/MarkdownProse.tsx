import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { twMerge } from 'tailwind-merge'

export interface MarkdownProseProps {
  /** Markdown source. */
  children: string
  /** Typography scale. */
  size?: 'sm' | 'base'
  /** Merged over the prose classes — scroll containers, padding, etc. */
  className?: string
}

/**
 * The shared GitHub-flavored-markdown prose renderer (documents, memories,
 * search results). Theme-aware via `dark:prose-dark` — the consuming apps
 * define the `typography.dark` variant in their Tailwind configs; do NOT
 * switch to `dark:prose-invert`, which doesn't resolve under their
 * Tailwind v4 + typography-plugin setup (see research/ResearchArticle.tsx).
 * Works in server and client components alike.
 */
export function MarkdownProse({
  children,
  size = 'base',
  className,
}: MarkdownProseProps) {
  return (
    <div
      className={twMerge(
        'prose dark:prose-dark max-w-none',
        size === 'sm' ? 'prose-sm' : 'prose-base',
        className
      )}
    >
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          table: ({ children: tableChildren }) => (
            <div className="overflow-x-auto">
              <table>{tableChildren}</table>
            </div>
          ),
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  )
}
