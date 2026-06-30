-- Store each model's latest live forecast (its call for the next, unrealized session) so the
-- admin can see what every model is actually predicting, not just its aggregate score.
alter table public.sp500_scores
  add column if not exists last_forecast      double precision,   -- predict(full history) -> next-day return
  add column if not exists last_forecast_as_of date;              -- the latest close it forecast from
