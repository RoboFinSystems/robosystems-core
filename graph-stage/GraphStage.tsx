'use client'

import { useEffect, useRef } from 'react'
import { mountGraphStage } from './graphStageGl'

/**
 * A knowledge graph in the brand film's look, as a live backdrop, in the colours the app
 * sets (see palette.ts). Decorative: it fills its positioned parent, takes no pointer events
 * and is hidden from screen readers.
 */
export function GraphStage({
  besideFrom = 1280,
  className = '',
}: {
  /** The width from which the page sets its words beside the graph (Tailwind's xl). */
  besideFrom?: number
  className?: string
}) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    if (!canvas.current) return
    try {
      return mountGraphStage(canvas.current, besideFrom)
    } catch (err) {
      // The page stands without the backdrop, but a broken shader should still show up.
      console.error('GraphStage failed to start', err)
    }
  }, [besideFrom])

  return (
    <canvas
      ref={canvas}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 h-full w-full ${className}`}
    />
  )
}
