// Canonical, Kaggle-style spec for a competition — the same sections for every type so a
// first-time visitor always knows where to look: what you submit, how you're scored, the data,
// the timeline/rules. Content varies by kind (Lab / Forecast / Arena); structure does not.
import { competitionKind, type CompetitionKind } from '@/lib/starters'

export type SpecFact = { label: string; value: string }
export type SpecField = { name: string; desc: string }

export type CompetitionSpec = {
  kind: CompetitionKind
  kindLabel: string
  /** At-a-glance facts for the header strip. */
  facts: SpecFact[]
  /** What you submit: the exact contract + a copyable minimal example. */
  submit: { language: string; prose: string; example: string; note?: string }
  /** How you're scored: the metric, its precise definition, and the public/private framing. */
  scoring: { metric: string; definition: string[]; publicLabel: string; public: string; privateLabel: string; private: string }
  /** The data you work with, and how to load the part you may fit on. */
  data: { summary: string; fields?: SpecField[]; howToLoad?: string }
  /** "How to read your score" — score ranges → meaning, so a newcomer knows what's good. */
  scoreGuide?: { bands: { range: string; meaning: string }[]; note: string }
  /** Quick pre-submission checklist. */
  checklist: string[]
  timeline: string[]
  rules: string[]
}

export function competitionSpec(cohort: { slug: string; arena_config?: unknown }): CompetitionSpec {
  const kind = competitionKind(cohort)
  if (kind === 'Forecast') return FORECAST
  if (kind === 'Arena') return ARENA
  return LAB
}

const LAB: CompetitionSpec = {
  kind: 'Lab',
  kindLabel: 'Lab strategy',
  facts: [
    { label: 'Metric', value: 'Out-of-sample Sharpe' },
    { label: 'Data', value: 'Synthetic equity panel' },
    { label: 'Cadence', value: 'Always open · graded < 5 min' },
    { label: 'Level', value: 'Beginner' },
  ],
  submit: {
    language: 'python',
    prose:
      'A Python file defining `class MyStrategy(Strategy)` with one method, `on_day`, called once per ' +
      'trading day. It receives that day’s data and your current book, and returns target portfolio ' +
      'weights — one number per stock (positive = long, negative = short). The grader normalises your ' +
      'weights to gross leverage 1 and rebalances toward them.',
    example: `from convexpi.lab import Strategy
import numpy as np

class MyStrategy(Strategy):
    def on_day(self, day, features, prices, portfolio):
        # features: dict of cross-sectional signals, each an array over stocks
        sig = np.nan_to_num(features.get("mom_1m", np.zeros(len(prices))))
        gross = np.abs(sig).sum()
        return sig / gross if gross > 0 else np.zeros(len(prices))`,
    note: 'features = dict of per-stock signal arrays · prices = today’s prices · portfolio = your current holdings · return = weights array (len = #stocks).',
  },
  scoring: {
    metric: 'Out-of-sample (OOS) Sharpe ratio',
    definition: [
      'The market is split into an in-sample window you may fit on and a hidden out-of-sample window you never see while building.',
      'Your strategy is run over the OOS window, rebalancing weekly toward your target weights.',
      'Transaction costs are charged on every rebalance (in basis points of turnover).',
      'Sharpe is the annualised mean/volatility of the resulting daily returns (× √252).',
      'You are ranked by OOS Sharpe. We also report the overfitting ratio (OOS ÷ in-sample Sharpe) — aim for ≥ 0.7.',
    ],
    publicLabel: 'In-sample Sharpe (the “public” score)',
    public:
      'Your score on the window you fit on. You can push it arbitrarily high by curve-fitting, so it does NOT determine your rank — exactly like a Kaggle public leaderboard.',
    privateLabel: 'Out-of-sample Sharpe (the “private” score)',
    private:
      'Your score on the hidden holdout. This is your rank — like a Kaggle private leaderboard — plus a nightly forward Sharpe on fresh synthetic data that tracks whether your edge keeps generalising.',
  },
  data: {
    summary:
      'A simulated cross-section of stocks over a multi-year daily horizon, with a few planted alpha signals hidden among many noise features. Split into an in-sample window (fit here) and a hidden out-of-sample window (scored here).',
    fields: [
      { name: 'features', desc: 'dict of cross-sectional signals (momentum, value, volatility, …) — a few predict returns, most are noise you must filter out.' },
      { name: 'prices', desc: 'array of each day’s prices, one per stock.' },
      { name: 'portfolio', desc: 'your current holdings going into the day.' },
    ],
    howToLoad:
      'In the starter notebook, `market.features("train")` and `market.prices("train")` give you the in-sample data to fit and validate on; the test window is held out for scoring.',
  },
  scoreGuide: {
    bands: [
      { range: '< 0', meaning: 'Noise or overfit — your in-sample edge didn’t survive. Normal at first; this is the lesson.' },
      { range: '0 – 0.5', meaning: 'A weak but real edge that generalised a little.' },
      { range: '0.5 – 1.0', meaning: 'Solid — a genuine, tradeable signal.' },
      { range: '1.0 – 2.0', meaning: 'Strong — top of the class.' },
      { range: '> 2.0', meaning: 'Suspiciously high — check for look-ahead or leakage before celebrating.' },
    ],
    note: 'A negative score isn’t failure — it’s the overfitting lesson made concrete. Iterate: simpler models usually generalise better.',
  },
  checklist: [
    '`on_day` returns an array with one weight per stock.',
    'No NaNs or infinities in your weights.',
    'You checked it out-of-sample, not just in-sample, before submitting.',
    'Your strategy never peeks at future days.',
  ],
  timeline: [
    'Always open — submit any time; no entry deadline.',
    'Graded in under 5 minutes; your OOS Sharpe posts to the leaderboard automatically.',
    'Re-scored nightly on fresh synthetic data (the forward Sharpe).',
  ],
  rules: [
    'Submissions run sandboxed: no network, with time and memory limits.',
    'No look-ahead — your strategy only sees data up to the current day.',
    'Resubmit as often as you like; your best OOS Sharpe stands.',
    'Standard scientific Python is available (numpy, pandas, scikit-learn).',
  ],
}

const FORECAST: CompetitionSpec = {
  kind: 'Forecast',
  kindLabel: 'Live forecast',
  facts: [
    { label: 'Metric', value: 'Sharpe of directional bets' },
    { label: 'Data', value: 'Real S&P 500 closes' },
    { label: 'Cadence', value: 'Re-scored daily on live prices' },
    { label: 'Level', value: 'Beginner' },
  ],
  submit: {
    language: 'python',
    prose:
      'A Python file defining `predict(history)` that returns your forecast of tomorrow’s S&P 500 return. ' +
      '`history` is a pandas DataFrame of daily closes (column `close`) up to and including today. The ' +
      'sign of your forecast is your bet: positive = long tomorrow, negative = short.',
    example: `def predict(history):
    # history: daily S&P 500 closes (column 'close') up to today.
    # Return your forecast of TOMORROW's return; the sign is your bet.
    c = history["close"]
    return float(c.iloc[-1] / c.iloc[-6] - 1)   # 5-day momentum (replace me)`,
    note: 'Must define predict(history) -> float. Runs sandboxed; scored on the next daily run.',
  },
  scoring: {
    metric: 'Sharpe ratio of your forecast-sign bets',
    definition: [
      'Each day, the sign of your forecast sets your position (+1 long / −1 short).',
      'Daily PnL = your position × the index’s actual next-day return.',
      'Scored walk-forward on real closes and re-scored daily as new sessions arrive.',
      'Ranked by the annualised Sharpe of those daily PnLs; hit rate and cumulative PnL are also shown.',
    ],
    publicLabel: 'Your backtest (the “public” score)',
    public:
      'However well your function looks on past data — you can’t be ranked on that, because the past is overfittable.',
    privateLabel: 'Live forward score (the “private” score)',
    private:
      'You are scored purely on prices that did not exist when you submitted. There is no in-sample to game — it is all out-of-sample.',
  },
  data: {
    summary:
      'Real daily S&P 500 closing prices. Your function is replayed walk-forward: on each day it sees history up to that day and forecasts the next.',
    fields: [
      { name: 'history', desc: 'pandas DataFrame of daily closes (column `close`) up to and including the current day.' },
    ],
    howToLoad:
      'The starter notebook pulls the real index history (e.g. via yfinance) so you can write and backtest predict(history) exactly the way it is scored.',
  },
  scoreGuide: {
    bands: [
      { range: '< 0', meaning: 'Worse than a coin flip — your bets were backwards, or pure noise.' },
      { range: '0 – 0.5', meaning: 'A marginal edge over random timing.' },
      { range: '0.5 – 1.0', meaning: 'A real, persistent directional edge.' },
      { range: '> 1.0', meaning: 'Excellent — rare for daily index timing.' },
    ],
    note: 'Daily index timing is brutally hard; even a small positive Sharpe is meaningful. Don’t be discouraged by scores near zero.',
  },
  checklist: [
    '`predict(history)` returns a single float.',
    'It only uses `history` — no future data, no network calls.',
    'You backtested it walk-forward, not just fit it to the whole series.',
  ],
  timeline: [
    'Always open — submit a model any time.',
    'Re-scored every day after the close on the latest real prices.',
    'Your model keeps trading forward until you replace it.',
  ],
  rules: [
    'Submissions run sandboxed: no network, with time and memory limits.',
    'No look-ahead — predict(history) only ever sees data up to “today”.',
    'One active model per participant; resubmit to replace it.',
  ],
}

const ARENA: CompetitionSpec = {
  kind: 'Arena',
  kindLabel: 'Live exchange',
  facts: [
    { label: 'Metric', value: 'Realized PnL' },
    { label: 'Data', value: 'Live limit-order book' },
    { label: 'Cadence', value: 'Real-time' },
    { label: 'Level', value: 'Intermediate' },
  ],
  submit: {
    language: 'python',
    prose:
      'A Python agent: `class MyAgent(RemoteAgent)` with `on_tick(state)`, called every tick. Return a list ' +
      'of orders to place or cancel. You connect over WebSocket and trade in real time against the ' +
      'background market and other players — there is no file to upload.',
    example: `pip install convexpi-arena

from convexpi.arena import RemoteAgent, MarketState

class MyAgent(RemoteAgent):
    def on_tick(self, state: MarketState):
        if state.mid:
            return [self.limit("buy", round(state.mid) - 5, 10)]
        return []

MyAgent("your-handle", server="wss://…").run()`,
    note: 'state carries the mid, the order book, and your position/PnL. Return limit/market orders or cancels each tick.',
  },
  scoring: {
    metric: 'Realized profit and loss (PnL)',
    definition: [
      'Your agent posts and takes orders on a real order-by-order (L3) book; queue position and fills are genuine.',
      'You trade against background agents and other players; maker/taker fees apply.',
      'You are ranked by realised PnL, updated live every few ticks.',
    ],
    publicLabel: 'There is no holdout',
    public:
      'The Arena is scored live — your PnL is real and immediate, so there is no public/private split to overfit.',
    privateLabel: 'Real-time PnL',
    private:
      'Every fill is a live decision under latency and adverse selection; your rank moves tick by tick.',
  },
  data: {
    summary:
      'A live limit-order book — for the realistic exchange, replayed order-by-order from real recorded crypto market data, so the queue you join and the trades that fill you are real.',
    howToLoad:
      'The starter notebook connects a baseline RemoteAgent to the live book so you can watch the state and build from a working quote.',
  },
  // No fixed score table: PnL is session-relative — the goal is to stay positive against the field.
  checklist: [
    'Your agent handles ticks with no mid (return [] safely).',
    'Orders respect any position / drawdown limits.',
    '`on_tick` returns quickly — a slow tick simply doesn’t trade.',
  ],
  timeline: [
    'Live whenever the season is active — connect any time.',
    'Your PnL appears on the rankings within a few ticks of connecting.',
  ],
  rules: [
    'Connect over WebSocket with the convexpi-arena client; one handle per participant.',
    'Risk limits (max drawdown / position) may eliminate a blown-up agent.',
    'Be responsive: agents that miss the per-tick deadline simply don’t trade that tick.',
  ],
}
