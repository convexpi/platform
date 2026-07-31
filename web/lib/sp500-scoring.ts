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
