'use client'

import { useEffect } from 'react'

/**
 * Lights the cards marked `node-card` under the pointer. Mounted once on a page, it tells
 * whichever card the pointer is over where the pointer is (`--mx`, `--my`), and the
 * `node-card` styles in styles/graph-stage.css draw the glow and the lit edge from that. Renders nothing.
 */
export function NodeGlow() {
  useEffect(() => {
    const move = (e: PointerEvent) => {
      const card =
        e.target instanceof Element ? e.target.closest('.node-card') : null
      if (!(card instanceof HTMLElement)) return
      const box = card.getBoundingClientRect()
      card.style.setProperty('--mx', `${e.clientX - box.left}px`)
      card.style.setProperty('--my', `${e.clientY - box.top}px`)
    }
    document.addEventListener('pointermove', move, { passive: true })
    return () => document.removeEventListener('pointermove', move)
  }, [])
  return null
}
