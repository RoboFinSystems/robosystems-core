import { describe, expect, it } from 'vitest'
import { buildGalaxy } from '../graphGalaxy'

const seeded = (seed: number) => {
  let s = seed
  return () => ((s = (s * 16807) % 2147483647), s / 2147483647)
}

describe('buildGalaxy', () => {
  it('draws the same galaxy from the same random source, and another from another', () => {
    expect(buildGalaxy(seeded(7))).toEqual(buildGalaxy(seeded(7)))
    expect(buildGalaxy(seeded(7))).not.toEqual(buildGalaxy(seeded(8)))
  })

  it('keeps every node inside its frame, whatever it is given', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { nodes } = buildGalaxy(seeded(seed))
      expect(nodes.length).toBeGreaterThan(20)
      nodes.forEach(({ x, y, lit }) => {
        expect(Math.hypot(x, y)).toBeLessThanOrEqual(0.9701)
        expect(lit).toBeGreaterThan(0)
        expect(lit).toBeLessThanOrEqual(1)
      })
    }
  })

  it('links only nodes that exist, and never a node to itself', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const { nodes, links } = buildGalaxy(seeded(seed))
      links.forEach(({ a, b }) => {
        expect(a).not.toBe(b)
        expect(nodes[a]).toBeDefined()
        expect(nodes[b]).toBeDefined()
      })
    }
  })
})
