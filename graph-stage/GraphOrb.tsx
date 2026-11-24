'use client'

import { type CSSProperties, useState, useSyncExternalStore } from 'react'
import { ink as tint } from './palette'

/**
 * The brand film's sphere as a section backdrop: balls of linked points, each with a soft
 * glow for its body, hanging off one edge of the section, floating and turning slowly. One
 * alone is large and close; two or three are smaller, and the smaller a ball the dimmer it
 * is, as if further off. Each is a node of the galaxies seen near: a graph inside a node.
 * Sizes, places and angles are drawn at random in the browser, so they differ on every
 * visit. Inline SVG moved by CSS: no canvas. Decorative.
 */

const COUNT = 150

// The film's sphere: points spread evenly over a ball, each joined to its three nearest.
const BALL = Array.from({ length: COUNT }, (_, i) => {
  const y = 1 - (i / (COUNT - 1)) * 2
  const r = Math.sqrt(1 - y * y)
  const a = i * 2.39996
  return [Math.cos(a) * r, y, Math.sin(a) * r]
})
const LINKS = BALL.flatMap((p, i) =>
  BALL.map((q, j) => ({
    j,
    d: Math.hypot(p[0] - q[0], p[1] - q[1], p[2] - q[2]),
  }))
    .sort((m, n) => m.d - n.d)
    .slice(1, 4)
    .filter(({ j }) => i < j)
    .map(({ j }) => [i, j])
)
const lit = (z: number) => 0.14 + 0.86 * Math.max(0, Math.min(1, z + 0.4))

/** The ball turned to an angle and flattened onto the page; depth decides brightness. */
function turned(ay: number, ax: number) {
  const [cy, sy, cx, sx] = [
    Math.cos(ay),
    Math.sin(ay),
    Math.cos(ax),
    Math.sin(ax),
  ]
  return BALL.map(([x, y, z]) => {
    const [x1, z1] = [x * cy + z * sy, z * cy - x * sy]
    return { x: x1, y: y * cx - z1 * sx, z: y * sx + z1 * cx }
  })
}

// each ball's lines in one brand colour's lighter shade, its glow in that colour and the next
const TINTS = [
  [tint(1), `${tint(0, 0.16)}, ${tint(2, 0.08)}`],
  [tint(3), `${tint(2, 0.18)}, ${tint(4, 0.08)}`],
  [tint(5), `${tint(4, 0.18)}, ${tint(0, 0.07)}`],
]
// how large a ball may be, by how many share the section: [smallest, largest] in px
const SIZES: Record<number, [number, number]> = {
  1: [560, 720],
  2: [300, 580],
  3: [220, 480],
}

interface Orb {
  points: ReturnType<typeof turned>
  ink: string
  glow: string
  box: CSSProperties
  near: number
  spin: CSSProperties
  float: string
}

function scatter(count: number, side: 'left' | 'right'): Orb[] {
  const rnd = Math.random
  const [lo, hi] = SIZES[count]
  return Array.from({ length: count }, (_, i) => {
    // 0 = the furthest a ball gets here, 1 = the nearest
    const near = count === 1 ? rnd() : (i + rnd()) / count
    const size = lo + (hi - lo) * near
    const [ink, glow] = TINTS[Math.floor(rnd() * TINTS.length)]
    return {
      points: turned(rnd() * Math.PI * 2, (rnd() - 0.5) * 1.2),
      ink,
      glow,
      near,
      // a near ball hangs well off the edge; a far one sits just inside it
      box: {
        width: size,
        height: size,
        [side]: -size * (0.05 + 0.38 * near),
      },
      spin: {
        animationDuration: `${(200 + rnd() * 200).toFixed(0)}s`,
        animationDirection: rnd() < 0.5 ? 'normal' : 'reverse',
      },
      float: i % 2 ? 'graph-float-b' : 'graph-float-a',
    }
  })
    .sort(() => rnd() - 0.5)
    .map((orb, slot) => ({
      ...orb,
      box: {
        ...orb.box,
        top: `${(6 + ((slot + rnd() * 0.5) / count) * 72).toFixed(1)}%`,
      },
    }))
}

const subscribeNever = () => () => {}
const n = (v: number) => v.toFixed(3)

export function GraphOrb({
  side,
  count = 1,
}: {
  /** The edge of the section the balls hang off. */
  side: 'left' | 'right'
  /** How many balls: one large and close, or two or three smaller at different distances. */
  count?: 1 | 2 | 3
}) {
  const inBrowser = useSyncExternalStore(
    subscribeNever,
    () => true,
    () => false
  )
  const [orbs] = useState(() => scatter(count, side))
  if (!inBrowser) return null

  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute inset-0 overflow-hidden"
    >
      {orbs.map(({ points, ink, glow, box, near, spin, float }, i) => (
        <div
          key={i}
          className={`absolute ${float}`}
          style={{ ...box, opacity: 0.45 + 0.55 * near }}
        >
          <div
            className="absolute inset-0 rounded-full blur-2xl"
            style={{
              backgroundImage: `radial-gradient(circle at 38% 32%, ${glow} 48%, transparent 70%)`,
            }}
          />
          <svg
            viewBox="-1.06 -1.06 2.12 2.12"
            className="graph-turn absolute inset-0 h-full w-full opacity-60"
            style={spin}
          >
            <g style={{ stroke: ink }} strokeWidth="0.004">
              {LINKS.map(([a, b]) => (
                <line
                  key={`${a}-${b}`}
                  x1={n(points[a].x)}
                  y1={n(points[a].y)}
                  x2={n(points[b].x)}
                  y2={n(points[b].y)}
                  opacity={n(lit((points[a].z + points[b].z) / 2) * 0.6)}
                />
              ))}
            </g>
            <g fill="#fff">
              {points.map((p, k) => (
                <circle
                  key={k}
                  cx={n(p.x)}
                  cy={n(p.y)}
                  r={k % 6 === 0 ? 0.02 : 0.012}
                  opacity={n(lit(p.z))}
                />
              ))}
            </g>
          </svg>
        </div>
      ))}
    </div>
  )
}
