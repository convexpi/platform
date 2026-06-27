// Pure inline-SVG sparkline (usable server- or client-side; renders from props).
export function Sparkline({ points, width = 68, height = 18, className }:
  { points: number[]; width?: number; height?: number; className?: string }) {
  if (!points || points.length < 2) return null
  const min = Math.min(...points)
  const max = Math.max(...points)
  const rng = max - min || 1
  const coords = points
    .map((p, i) => `${((i / (points.length - 1)) * width).toFixed(1)},${(height - ((p - min) / rng) * height).toFixed(1)}`)
    .join(' ')
  const up = points[points.length - 1] >= points[0]
  return (
    <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} className={className} aria-hidden="true">
      <polyline points={coords} fill="none" stroke={up ? '#16a34a' : '#dc2626'} strokeWidth={1.25}
        strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  )
}
