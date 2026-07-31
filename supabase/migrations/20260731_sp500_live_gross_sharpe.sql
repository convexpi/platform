-- Gross (pre-cost) figures for the live track, so both tracks report gross and net side by side.
--
-- 20260731_sp500_costs_and_deflation.sql gave the backtest a gross_sharpe and cost_drag but left
-- the live track reporting net only, so there was no way to see what turnover was costing a model
-- on its forward record — the number that actually ranks it. The gap between gross and net is the
-- cost of trading, and it belongs next to the figure it explains rather than inferred.
alter table public.sp500_scores
  add column if not exists live_gross_sharpe double precision,
  add column if not exists live_cost_drag    double precision;
