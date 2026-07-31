-- Turnover costs, benchmark-relative performance, and a selection-bias-corrected Sharpe.
--
-- Three gaps in how the S&P competition was scored:
--
-- 1. No transaction costs. PnL was sign(forecast) x next-day return, so flipping long/short every
--    session cost exactly as much as holding: nothing. That silently rewarded churn. The runner now
--    charges a round-trip cost on each position change; `gross_sharpe` and `cost_drag` keep the
--    effect visible rather than buried.
--
-- 2. No benchmark. "Always Up (buy & hold)" competed as a peer when it is really the null
--    hypothesis. `excess_return` and `info_ratio` answer the question a visitor actually has —
--    did this beat just holding the index?
--
-- 3. No correction for multiple testing. A leaderboard is a maximum, and the best of N models is
--    biased upward by exactly the luck it took to come first. `live_deflated_sharpe` is Bailey &
--    López de Prado's Deflated Sharpe Ratio: the probability the model's true Sharpe exceeds zero
--    once the size of the field, the length of the record, and the returns' skew and fat tails are
--    all accounted for. Read it as a confidence, not a score.
alter table public.sp500_scores
  -- Backtest track (252-day walk-forward)
  add column if not exists gross_sharpe   double precision,  -- before costs
  add column if not exists cost_drag      double precision,  -- cumulative return given up to costs
  add column if not exists turnover       double precision,  -- fraction of sessions with a change
  add column if not exists excess_return  double precision,  -- cumulative, over buy & hold
  add column if not exists info_ratio     double precision,  -- annualised Sharpe of the excess
  -- Live track (forward-only)
  add column if not exists live_info_ratio       double precision,
  add column if not exists live_turnover         double precision,
  add column if not exists live_deflated_sharpe  double precision;  -- probability in [0, 1]
