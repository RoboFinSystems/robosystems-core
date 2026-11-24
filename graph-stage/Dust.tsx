/**
 * The dust of the brand film's stage as a section backdrop: faint points drifting
 * slowly upward, in two layers at different speeds. It is two repeating tiles moved by CSS,
 * so it costs no script and carries on below the hero's live graph without a second WebGL
 * canvas. Each tile is a mask over the first brand colour (`--graph-1`), so the dust takes
 * the app's colour. Decorative, and still for a visitor who asks for reduced motion.
 */

/** One square tile of seeded points, as a CSS mask image. */
function tile(seed: number, size: number, count: number): string {
  let s = seed
  const rnd = () => ((s = (s * 16807) % 2147483647), s / 2147483647)
  const dots = Array.from({ length: count }, (_, i) => {
    // every eighth point is large and soft, out of the lens's focus
    const soft = i % 8 === 0
    const r = soft ? 3 + rnd() * 3 : 0.6 + rnd() * 1.3
    const o = soft ? 0.05 + rnd() * 0.06 : 0.14 + rnd() * 0.34
    const [x, y] = [rnd() * size, rnd() * size]
    return `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="${r.toFixed(1)}" opacity="${o.toFixed(2)}"/>`
  })
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" fill="#000">${dots.join('')}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

const NEAR = tile(11, 900, 46)
const FAR = tile(29, 620, 40)

export function Dust({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className}`}
    >
      <div
        className="graph-dust graph-dust-far absolute inset-x-0 top-0 h-[calc(100%+620px)] opacity-60"
        style={{ maskImage: FAR, WebkitMaskImage: FAR }}
      />
      <div
        className="graph-dust graph-dust-near absolute inset-x-0 top-0 h-[calc(100%+900px)]"
        style={{ maskImage: NEAR, WebkitMaskImage: NEAR }}
      />
    </div>
  )
}
