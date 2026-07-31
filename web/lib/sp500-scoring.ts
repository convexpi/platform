/**
 * Shared scoring conventions for the S&P next-day competition.
 *
 * Two tracks live side by side on `sp500_scores` and must never be mixed in one row of numbers:
 *   - live  (live_sharpe / live_days / live_hit_rate / live_cum_return) — forward-only, since the
 *     model went active. Short, honest, and noisy.
 *   - backtest (sharpe / hit_rate / cum_return / n_days) — rolling 252-day walk-forward, recomputed
 *     daily. Comparable from day one, but not out-of-sample in the way the live track is.
 */

/**
 * Sessions of forward track required before a model ranks on its live Sharpe.
 *
 * An annualised Sharpe estimated from n daily observations carries a standard error of roughly
 * sqrt(252 / n). At n = 21 that is ±3.5 — wide enough that the entire board sits inside one standard
 * error of zero and the ordering is noise. At n = 60 it is ±2.0: still wide, but a live Sharpe above
 * ~2 has started to mean something. Models below the threshold still display their live Sharpe (marked
 * provisional); they just don't get ranked on it.
 */
export const LIVE_MIN_DAYS = 60

export type Sp500Score = {
  sharpe: number | null
  hit_rate: number | null
  cum_return: number | null
  n_days?: number | null
  live_sharpe: number | null
  live_days: number | null
  live_hit_rate: number | null
  live_cum_return: number | null
  // Added by 20260731_sp500_costs_and_deflation.sql. Optional so the page renders either side of
  // that migration — the queries select '*' rather than naming columns for the same reason.
  gross_sharpe?: number | null
  cost_drag?: number | null
  turnover?: number | null
  excess_return?: number | null
  info_ratio?: number | null
  live_info_ratio?: number | null
  live_turnover?: number | null
  live_deflated_sharpe?: number | null
}

/**
 * How much confidence the deflated Sharpe warrants, as a label rather than a bare number.
 *
 * The DSR is the probability a model's true Sharpe beats zero *after* accounting for the whole
 * field having been tried. Bands keep readers from over-reading a third decimal place on what is
 * fundamentally a "is this real?" question.
 */
export function confidenceBand(dsr: number | null | undefined) {
  if (dsr == null) return { label: '—', tone: 'muted', hint: 'Not enough live history yet.' }
  if (dsr >= 0.95) return { label: 'Strong', tone: 'good', hint: 'Survives the multiple-testing correction.' }
  if (dsr >= 0.75) return { label: 'Promising', tone: 'ok', hint: 'Suggestive, not yet conclusive.' }
  if (dsr >= 0.5) return { label: 'Coin flip', tone: 'weak', hint: 'About as likely as not to be luck.' }
  return { label: 'Likely luck', tone: 'bad', hint: 'Below what the best of this field would post by chance.' }
}

/** Has this model accumulated enough forward sessions for its live Sharpe to carry the ranking? */
export function liveQualified(s: Pick<Sp500Score, 'live_days' | 'live_sharpe'> | null | undefined) {
  return !!s && s.live_sharpe != null && (s.live_days ?? 0) >= LIVE_MIN_DAYS
}

/** Approximate standard error of an annualised Sharpe estimated from `days` daily observations. */
export function liveSharpeStdError(days: number | null | undefined) {
  return days && days > 0 ? Math.sqrt(252 / days) : null
}

/**
 * Board order: qualified models lead, ranked on the live track; everyone else follows, ranked on the
 * backtest. Without the gate a model with three lucky forward sessions outranks a year of evidence.
 */
export function compareSp500<T extends { s?: Sp500Score | null }>(a: T, b: T) {
  const aq = liveQualified(a.s)
  const bq = liveQualified(b.s)
  if (aq !== bq) return aq ? -1 : 1
  if (aq && bq) {
    const d = (b.s!.live_sharpe ?? -Infinity) - (a.s!.live_sharpe ?? -Infinity)
    if (d) return d
  }
  return (b.s?.sharpe ?? -Infinity) - (a.s?.sharpe ?? -Infinity)
}
