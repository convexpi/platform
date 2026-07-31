-- Attribute each live forecast to the exact code that produced it.
--
-- Submissions are edited in place (the model keeps its id so its forward track survives), but the
-- 252-day backtest is recomputed from whatever code is current. That left the live Sharpe averaging
-- over forecasts made by code that no longer exists while the backtest described only the new code —
-- the two standings columns could describe two different models. Stamping the producing code's hash
-- lets the runner scope the live aggregates to the current submission, so an edit restarts the live
-- track instead of blending it.
--
-- Nullable: existing rows predate the stamp. The runner backfills them with the model's current hash
-- on its next pass, which is the only attribution available for them.
alter table public.sp500_forecasts
  add column if not exists code_hash text;

-- The runner's hot query is (model_id, code_hash) with pnl present.
create index if not exists sp500_forecasts_model_code_idx
  on public.sp500_forecasts (model_id, code_hash);
