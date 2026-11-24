import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { GraphStage } from '../GraphStage'
import { buildGraph, placeGraph, RADIUS } from '../graphStageGl'

describe('graph stage geometry', () => {
  it('builds the same graph every time', () => {
    expect(buildGraph().home).toEqual(buildGraph().home)
    expect(buildGraph().pairs).toEqual(buildGraph().pairs)
  })

  it('keeps every node inside the stage', () => {
    const { home, size } = buildGraph()
    for (let i = 0; i < size.length; i++) {
      const r = Math.hypot(home[i * 3], home[i * 3 + 1], home[i * 3 + 2])
      expect(r).toBeLessThan(RADIUS)
    }
  })

  it('joins only nodes that exist, and never a node to itself', () => {
    const { pairs, size } = buildGraph()
    expect(pairs.length % 2).toBe(0)
    for (let k = 0; k < pairs.length; k += 2) {
      expect(pairs[k]).not.toBe(pairs[k + 1])
      expect(Math.max(pairs[k], pairs[k + 1])).toBeLessThan(size.length)
      expect(Math.min(pairs[k], pairs[k + 1])).toBeGreaterThanOrEqual(0)
    }
  })

  it('leaves no cluster on its own: every hub is on a route to another', () => {
    const { routes, color, size } = buildGraph()
    const hubs = Array.from({ length: size.length }, (_, i) => i).filter(
      (i) => color[i * 3] === 1 && color[i * 3 + 1] === 1
    )
    expect(hubs.length).toBeGreaterThan(1)
    hubs.forEach((h) => expect(routes).toContain(h))
  })

  it('sets the graph to the right of the words only when they sit beside it', () => {
    const beside = placeGraph(1.6, true, 900)
    const above = placeGraph(1.6, false, 900)
    expect(beside.x).toBeGreaterThan(0)
    expect(above.x).toBe(0)
    expect(above.y).toBeGreaterThan(beside.y)
  })

  it('holds the graph level with the words however tall the window is', () => {
    const halfH = 14 * Math.tan((38 * Math.PI) / 360)
    const fromTop = (h: number) =>
      ((1 - placeGraph(1.3, true, h).y / halfH) / 2) * h
    expect(fromTop(1262)).toBeCloseTo(460, 5)
    expect(fromTop(1000)).toBeCloseTo(460, 5)
    expect(fromTop(700)).toBeCloseTo(350, 5)
  })

  it('keeps the graph inside a narrow stage', () => {
    const halfW = 14 * Math.tan((38 * Math.PI) / 360) * (390 / 844)
    expect(placeGraph(390 / 844, false, 844).scale * RADIUS).toBeLessThan(halfW)
  })
})

describe('GraphStage', () => {
  it('renders a decorative canvas and stands where WebGL is unavailable', () => {
    const { container } = render(<GraphStage />)
    const canvas = container.querySelector('canvas')
    expect(canvas).toHaveAttribute('aria-hidden', 'true')
    expect(canvas).toHaveClass('pointer-events-none')
  })
})
