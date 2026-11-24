/**
 * A grid floor running away to a horizon, for the foot of a section. It is one plane tilted
 * in perspective: the horizon sits perspective / tan(tilt) above the section's foot, about
 * 480px here. The lines that run across are drawn thicker, because the tilt thins them and
 * they would vanish. Drawn in the first brand colour (`--graph-1`). Decorative; it fills
 * the width of its positioned parent, which should hide its overflow.
 */
export function GridFloor({ className = '' }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`graph-floor pointer-events-none absolute -inset-x-[150%] bottom-0 h-[600%] origin-bottom ${className}`}
    />
  )
}
