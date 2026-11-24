/**
 * One galaxy: a small knowledge graph in clusters, like the hero's, but drawn from whatever
 * random source it is given, so no two are alike. Built in three dimensions, turned to a
 * random angle and flattened onto the page; a node's depth decides how bright it is.
 */

export interface Galaxy {
  /** x, y in -1..1, radius, brightness 0..1, and a palette colour (`HUB` for a hub). */
  nodes: Array<{ x: number; y: number; r: number; lit: number; hue: number }>
  links: Array<{ a: number; b: number; lit: number; hue: number }>
}

/** A hub's colour: not one of the palette's, it is drawn white. */
export const HUB = -1
// the three brand colours, in two shades each
const HUES = 6

export function buildGalaxy(rnd: () => number): Galaxy {
  const between = (lo: number, hi: number) => lo + rnd() * (hi - lo)
  const clusters = Math.round(between(3, 8))
  // the shape it is spread over: anything from a ball to a flat, stretched disc
  const shape = [between(0.6, 1), between(0.35, 1), between(0.25, 0.9)]
  const turn = between(0, Math.PI * 2)
  const pts: number[][] = []
  const hue: number[] = []
  const hubs: number[] = []
  const links: Array<[number, number]> = []
  const d2 = (i: number, j: number) =>
    pts[i].reduce((sum, v, k) => sum + (v - pts[j][k]) ** 2, 0)
  const nearest = (i: number, among: number[], n: number) =>
    among
      .filter((j) => j !== i)
      .sort((p, q) => d2(i, p) - d2(i, q))
      .slice(0, n)

  for (let c = 0; c < clusters; c++) {
    const y = 1 - ((c + 0.5) / clusters) * 2
    const r = Math.sqrt(1 - y * y)
    const a = c * 2.39996 + turn
    const centre = [
      Math.cos(a) * r * shape[0],
      y * shape[1],
      Math.sin(a) * r * shape[2],
    ]
    const count = Math.round(between(8, 30))
    const spread = between(0.1, 0.24)
    const tint = Math.floor(rnd() * HUES)
    const members: number[] = []
    for (let m = 0; m < count; m++) {
      const off = () => (m === 0 ? 0 : (rnd() + rnd() + rnd() - 1.5) * spread)
      pts.push([centre[0] + off(), centre[1] + off(), centre[2] + off()])
      hue.push(m === 0 ? HUB : tint)
      members.push(pts.length - 1)
    }
    hubs.push(members[0])
    members.slice(1).forEach((n) => {
      if (rnd() < 0.62 || members.length < 3) links.push([members[0], n])
      else links.push([n, nearest(n, members.slice(1), 1)[0]])
    })
  }
  hubs.forEach((h) =>
    nearest(h, hubs, 2).forEach((o) => {
      if (!links.some(([p, q]) => p === o && q === h)) links.push([h, o])
    })
  )

  // a random turn about two axes, then fitted inside the unit circle
  const [ay, ax] = [between(0, Math.PI * 2), between(-0.9, 0.9)]
  const turned = pts.map(([x, y, z]) => {
    const [x1, z1] = [
      x * Math.cos(ay) + z * Math.sin(ay),
      z * Math.cos(ay) - x * Math.sin(ay),
    ]
    return [
      x1,
      y * Math.cos(ax) - z1 * Math.sin(ax),
      y * Math.sin(ax) + z1 * Math.cos(ax),
    ]
  })
  const reach = Math.max(...turned.map(([x, y]) => Math.hypot(x, y)))
  const lit = (z: number) => 0.3 + 0.7 * Math.max(0, Math.min(1, z / 1.6 + 0.5))
  const nodes = turned.map(([x, y, z], i) => ({
    x: (x / reach) * 0.97,
    y: (y / reach) * 0.97,
    r: hubs.includes(i) ? 0.026 : between(0.007, 0.014),
    lit: lit(z),
    hue: hue[i],
  }))
  return {
    nodes,
    links: links.map(([a, b]) => ({
      a,
      b,
      lit: (nodes[a].lit + nodes[b].lit) / 2,
      hue: hue[a] === HUB ? hue[b] : hue[a],
    })),
  }
}
