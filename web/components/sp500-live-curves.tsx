'use client'

import { useState } from 'react'

/**
 * Vol-scaled live equity curves for the S&P next-day competition.
 *
 * Every model is rescaled to the same target volatility before compounding, so the lines compare
 * skill rather than leverage: a model that simply bets harder no longer looks better than one that
 * bets well. Raw cumulative PnL — which the table shows — conflates the two.
 */

export type Curve = {
  id: string
  name: string
  author: string
  /** Vol-scaled cumulative return, aligned to `dates` by index. null before the model went live. */
  points: (number | null)[]
  /** Scale factor applied (target vol / realised vol) — surfaced so the leverage isn't hidden. */
  scale: number
  /**
   * Palette slot, from `colorSlots()`. Supplied by the caller and tied to model identity, so a
   * series keeps its colour when the standings reorder. Falls back to array position if absent.
   */
  slot?: number
}

// Categorical slots 1–7, validated for adjacent-pair CVD separation on both surfaces.
const LIGHT = ['#2a78d6', '#eb6834', '#1baf7a', '#eda100', '#e87ba4', '#008300', '#4a3aa7']
const DARK = ['#3987e5', '#d95926', '#199e70', '#c98500', '#d55181', '#008300', '#9085e9']

const W = 720, H = 260, PAD = { t: 12, r: 12, b: 24, l: 44 }
const PW = W - PAD.l - PAD.r, PH = H - PAD.t - PAD.b

export function Sp500LiveCurves({ dates, curves, targetVol }:
  { dates: string[]; curves: Curve[]; targetVol: number }) {
  const [hover, setHover] = useState<number | null>(null)
  // Seven lines overlap heavily. Hovering a legend entry isolates its curve — the legend is the
  // relief the light-mode contrast warning requires, and this makes it a lookup rather than a key.
  const [focus, setFocus] = useState<string | null>(null)

  if (dates.length < 2 || curves.length === 0) return null

  const all = curves.flatMap((c) => c.points.filter((p): p is number => p != null))
  const lo = Math.min(0, ...all), hi = Math.max(0, ...all)
  const pad = (hi - lo) * 0.08 || 0.01
  const y0 = lo - pad, y1 = hi + pad
  const x = (i: number) => PAD.l + (dates.length === 1 ? 0 : (i / (dates.length - 1)) * PW)
  const y = (v: number) => PAD.t + PH - ((v - y0) / (y1 - y0)) * PH

  const step = niceStep(y1 - y0)
  const ticks: number[] = []
  for (let t = Math.ceil(y0 / step) * step; t <= y1 + 1e-9; t += step) ticks.push(t)
  const tickDecimals = Math.abs((step * 100) % 1) > 1e-9 ? 1 : 0

  const path = (pts: (number | null)[]) => {
    let d = '', pen = false
    pts.forEach((p, i) => {
      if (p == null) { pen = false; return }
      d += `${pen ? 'L' : 'M'}${x(i).toFixed(1)},${y(p).toFixed(1)} `
      pen = true
    })
    return d.trim()
  }

  // Resolve each series' palette slot once. `slot` is supplied by the caller and tied to model
  // identity; the index fallback only applies when a caller hasn't assigned slots.
  const series = curves.map((c, i) => ({ c, slot: (c.slot ?? i) % 7 }))
  const bySlot = [...series].sort((a, b) => a.slot - b.slot)
  const hoverIdx = hover
  const fmt = (v: number) => `${v >= 0 ? '+' : ''}${(v * 100).toFixed(1)}%`

  return (
    <figure className="sp500-curves m-0">
      {/* Chart chrome rides the app's own tokens, and the series steps swap on the app's `.dark`
          class — the same signal globals.css uses. Keying off prefers-color-scheme instead would
          darken the chart on a page that stayed light. */}
      <style>{`
        .sp500-curves { --grid:var(--border); --axis-ink:var(--muted-foreground); --crosshair:var(--muted-foreground); --surface:var(--background); }
        .sp500-curves .s-line { stroke-width:2; fill:none; stroke-linejoin:round; stroke-linecap:round; }
        .sp500-curves .s-dot { r:4; stroke:var(--surface); stroke-width:2; }
        .sp500-curves .s-line, .sp500-curves .s-dot { transition:opacity .12s ease; }
        .sp500-curves .dim { opacity:.18; }
        ${LIGHT.map((c, i) => `.sp500-curves .c${i}{stroke:${c};}.sp500-curves .f${i}{fill:${c};}`).join('')}
        .dark .sp500-curves { ${DARK.map((c, i) => `.c${i}{stroke:${c};}.f${i}{fill:${c};}`).join('')} }
      `}</style>

      <div className="overflow-x-auto">
        <svg viewBox={`0 0 ${W} ${H}`} width="100%" role="img" className="min-w-[560px]"
             aria-label={`Vol-scaled cumulative live return for ${curves.length} models, ${dates[0]} to ${dates[dates.length - 1]}`}>
          {ticks.map((t) => (
            <g key={t}>
              <line x1={PAD.l} x2={W - PAD.r} y1={y(t)} y2={y(t)}
                    stroke={t === 0 ? 'var(--crosshair)' : 'var(--grid)'} strokeWidth={t === 0 ? 1 : 1}
                    strokeDasharray={t === 0 ? undefined : '2 3'} />
              <text x={PAD.l - 6} y={y(t) + 3.5} textAnchor="end" fontSize={10} fill="var(--axis-ink)" fontFamily="ui-monospace, monospace">
                {`${(t * 100).toFixed(tickDecimals)}%`}
              </text>
            </g>
          ))}

          <text x={PAD.l} y={H - 8} fontSize={10} fill="var(--axis-ink)">{dates[0]}</text>
          <text x={W - PAD.r} y={H - 8} fontSize={10} fill="var(--axis-ink)" textAnchor="end">{dates[dates.length - 1]}</text>

          {series.map(({ c, slot }) => (
            <path key={c.id} d={path(c.points)} className={`s-line c${slot}${focus && focus !== c.id ? ' dim' : ''}`} />
          ))}

          {hoverIdx != null && (
            <>
              <line x1={x(hoverIdx)} x2={x(hoverIdx)} y1={PAD.t} y2={PAD.t + PH} stroke="var(--crosshair)" strokeWidth={1} />
              {series.map(({ c, slot }) => {
                const v = c.points[hoverIdx]
                return v == null ? null : (
                  <circle key={c.id} cx={x(hoverIdx)} cy={y(v)} className={`s-dot f${slot}${focus && focus !== c.id ? ' dim' : ''}`} />
                )
              })}
            </>
          )}

          {/* Hit targets: a full-height band per session, wider than the marks. */}
          {dates.map((d, i) => (
            <rect key={d} x={x(i) - PW / (2 * Math.max(1, dates.length - 1))} y={PAD.t}
                  width={Math.max(6, PW / Math.max(1, dates.length - 1))} height={PH} fill="transparent"
                  onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} />
          ))}
        </svg>
      </div>

      {/* Legend — identity is never colour alone; the name is text ink beside a swatch.
          Doubles as the relief for the light-mode contrast warning on slots 3–5.

          Ordered by palette slot, not by rank. The palette's colourblind separation is validated
          on *adjacent* pairs in slot order; listing by rank puts arbitrary pairs side by side, and
          the standings order happened to land orange beside magenta — ΔE 12.9, under the
          normal-vision floor of 15. Slot order keeps the validated adjacency no matter how the
          board moves. */}
      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1 list-none p-0 text-xs">
        {bySlot.map(({ c, slot }) => {
          const v = hoverIdx != null ? c.points[hoverIdx] : c.points.filter((p) => p != null).slice(-1)[0]
          return (
            <li key={c.id}>
              <button type="button"
                      className={`flex items-center gap-1.5 cursor-default ${focus && focus !== c.id ? 'opacity-45' : ''}`}
                      onMouseEnter={() => setFocus(c.id)} onMouseLeave={() => setFocus(null)}
                      onFocus={() => setFocus(c.id)} onBlur={() => setFocus(null)}>
                <svg aria-hidden width="12" height="3" className="shrink-0"><rect width="12" height="3" rx="1.5" className={`f${slot}`} /></svg>
                <span className="text-foreground">{c.name}</span>
                <span className="font-mono text-muted-foreground">{v == null ? '—' : fmt(v)}</span>
              </button>
            </li>
          )
        })}
      </ul>

      <figcaption className="mt-2 text-xs text-muted-foreground">
        Live daily PnL, each model rescaled to {(targetVol * 100).toFixed(0)}% annualised volatility and then compounded
        {hoverIdx != null ? <> · <span className="font-mono text-foreground">{dates[hoverIdx]}</span></> : null}.
        Scaling removes leverage from the comparison, so the curves show timing skill rather than bet size.
        A line starts on the model&apos;s first live session, so shorter lines are newer models, not flat ones.
      </figcaption>
    </figure>
  )
}

/**
 * Smallest round step (1 / 2 / 2.5 / 5 × 10^k) that divides `range` into at most 6 intervals.
 *
 * Rounding a target step up — the usual one-liner — is what leaves a plot with two gridlines: a 9%
 * range wants ~2.2% and gets rounded to 5%. Selecting on the resulting interval count instead keeps
 * the grid honest at any range.
 */
function niceStep(range: number) {
  const r = Math.abs(range) || 1
  const mag = Math.pow(10, Math.floor(Math.log10(r)) - 1)
  for (const m of [1, 2, 2.5, 5, 10, 20, 25, 50, 100]) {
    const step = m * mag
    if (r / step <= 6) return step
  }
  return r / 5
}
