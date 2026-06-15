'use client'

// Wireframe paraboloid — the convex bowl
// Represents the convex landscape students search over.
// The gold dot is the out-of-sample minimum they cannot see directly.

export function HeroViz() {
  const cx = 240
  const cy = 180
  const scale = 68
  const cos30 = Math.cos(Math.PI / 6)
  const sin30 = Math.sin(Math.PI / 6)

  // Isometric projection: 3D (x, y, z) → 2D screen
  function iso(x: number, y: number, z: number): [number, number] {
    return [
      cx + scale * (x - y) * cos30,
      cy + scale * ((x + y) * sin30 - z),
    ]
  }

  // Paraboloid: z = (x² + y²) / 4
  const zOf = (x: number, y: number) => (x * x + y * y) / 4

  function polyPath(pts: [number, number][]): string {
    return pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p[0].toFixed(1)} ${p[1].toFixed(1)}`).join(' ')
  }

  const steps = 32

  // Horizontal cross-sections at different z levels
  const zLevels = [0.25, 0.75, 1.5, zOf(2, 0)]
  const crossSections = zLevels.map((z) => {
    const r = Math.sqrt(z * 4)
    const pts: [number, number][] = []
    for (let i = 0; i <= steps; i++) {
      const theta = (i / steps) * 2 * Math.PI
      pts.push(iso(r * Math.cos(theta), r * Math.sin(theta), z))
    }
    return pts
  })

  // Radial ribs (parabolas from rim to minimum)
  const nRibs = 12
  const radialRibs = Array.from({ length: nRibs }, (_, k) => {
    const theta = (k / nRibs) * 2 * Math.PI
    const pts: [number, number][] = []
    for (let i = 0; i <= 18; i++) {
      const r = (i / 18) * 2
      const x = r * Math.cos(theta)
      const y = r * Math.sin(theta)
      pts.push(iso(x, y, zOf(x, y)))
    }
    return pts
  })

  // Minimum point
  const [mx, my] = iso(0, 0, 0)

  // Dashed gold search trajectory converging toward minimum
  const searchPath: [number, number][] = [
    iso(-1.6, 1.2, zOf(-1.6, 1.2)),
    iso(-0.9, 0.8, zOf(-0.9, 0.8)),
    iso(-0.4, 0.3, zOf(-0.4, 0.3)),
    iso(0.1, -0.1, zOf(0.1, -0.1)),
    iso(0.0, 0.0, 0),
  ]

  const navy = '#0B1F3A'
  const gold  = '#C9A34E'

  return (
    <svg
      viewBox="0 0 480 360"
      className="w-full h-full"
      aria-label="Wireframe convex bowl — the optimization landscape"
    >
      <defs>
        <radialGradient id="bowlGlow" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor={gold} stopOpacity="0.10" />
          <stop offset="100%" stopColor={gold} stopOpacity="0" />
        </radialGradient>
      </defs>

      <ellipse cx={mx} cy={my} rx="65" ry="24" fill="url(#bowlGlow)" />

      {radialRibs.map((pts, i) => (
        <path key={`rib-${i}`} d={polyPath(pts)} fill="none"
          stroke={navy} strokeWidth="0.65"
          opacity={0.12 + (i % 3 === 0 ? 0.07 : 0)} />
      ))}

      {crossSections.map((pts, i) => (
        <path key={`cs-${i}`} d={polyPath(pts)} fill="none"
          stroke={navy}
          strokeWidth={i === crossSections.length - 1 ? 1.1 : 0.75}
          opacity={i === crossSections.length - 1 ? 0.45 : 0.18 + i * 0.04} />
      ))}

      {/* Gold search path */}
      <path d={polyPath(searchPath)} fill="none"
        stroke={gold} strokeWidth="1.5" strokeDasharray="4 3" opacity="0.5" />
      {searchPath.slice(0, -1).map(([sx, sy], i) => (
        <circle key={`sp-${i}`} cx={sx} cy={sy} r="2.2" fill={gold} opacity="0.4" />
      ))}

      {/* Minimum */}
      <circle cx={mx} cy={my} r="18" fill="none" stroke={gold} strokeWidth="0.7" opacity="0.2" />
      <circle cx={mx} cy={my} r="9"  fill="none" stroke={gold} strokeWidth="0.8" opacity="0.4" />
      <circle cx={mx} cy={my} r="4"  fill={gold} />
      <text x={mx + 12} y={my - 10} fill={gold} fontSize="9" fontFamily="monospace" opacity="0.65">
        OOS minimum
      </text>
    </svg>
  )
}
