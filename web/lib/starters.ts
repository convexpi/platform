// Per-competition-type starter notebooks (Colab), showing how to fit a model and submit.
const BASE = 'https://colab.research.google.com/github/convexpi/missions/blob/main/starters'

export type CompetitionKind = 'Lab' | 'Arena' | 'Forecast'

export const STARTERS: Record<CompetitionKind, { url: string; blurb: string }> = {
  Lab: {
    url: `${BASE}/lab_starter.ipynb`,
    blurb: 'Get the in-sample synthetic data, explore which features predict, fit a strategy, and check it out-of-sample before submitting.',
  },
  Arena: {
    url: `${BASE}/arena_starter.ipynb`,
    blurb: 'Connect a trading agent to the live order book and quote a market — a baseline to build on.',
  },
  Forecast: {
    url: `${BASE}/sp500_starter.ipynb`,
    blurb: "Pull the real index history, write predict(history), and backtest it walk-forward the way it's scored.",
  },
}

export function competitionKind(cohort: { slug: string; arena_config?: unknown }): CompetitionKind {
  if (cohort.slug === 'sp500-nextday') return 'Forecast'
  const ac = cohort.arena_config as Record<string, unknown> | null | undefined
  return ac && Object.keys(ac).length > 0 ? 'Arena' : 'Lab'
}
