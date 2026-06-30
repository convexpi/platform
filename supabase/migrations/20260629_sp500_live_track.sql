-- Forward-only "live" track for the S&P competition: persist each model's daily forecast and its
-- realized next-session outcome, so a genuine live Sharpe accumulates from when a model goes active
-- (alongside the existing rolling 252-day walk-forward backtest in sp500_scores).
create table if not exists public.sp500_forecasts (
  model_id   uuid not null references public.sp500_models(id) on delete cascade,
  as_of      date not null,                 -- latest close when the forecast was made
  forecast   double precision not null,     -- predict() output: the call for the next session
  realized   double precision,              -- realized next-session return (null until known)
  pnl        double precision,              -- sign(forecast) * realized
  created_at timestamptz not null default now(),
  primary key (model_id, as_of)
);
alter table public.sp500_forecasts enable row level security;
drop policy if exists "sp500_forecasts read" on public.sp500_forecasts;
create policy "sp500_forecasts read" on public.sp500_forecasts for select using (true);
grant select on public.sp500_forecasts to anon, authenticated;

-- Live aggregates on the scores row (the rolling backtest stays in the existing columns).
alter table public.sp500_scores
  add column if not exists live_days       int,
  add column if not exists live_sharpe     double precision,
  add column if not exists live_hit_rate   double precision,
  add column if not exists live_cum_return double precision;
