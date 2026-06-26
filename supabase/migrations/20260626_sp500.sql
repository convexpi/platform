-- Live S&P 500 next-day prediction competition (scored on real Yahoo prices, genuinely out-of-sample).
create table if not exists public.sp500_models (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete set null,   -- null = house baseline
  name       text not null,
  code       text not null,                                       -- defines predict(history)->float
  status     text not null default 'active' check (status in ('active','disabled')),
  created_at timestamptz not null default now()
);
alter table public.sp500_models enable row level security;
drop policy if exists "sp500_models read"   on public.sp500_models;
drop policy if exists "sp500_models insert"  on public.sp500_models;
create policy "sp500_models read"  on public.sp500_models for select using (true);
create policy "sp500_models insert" on public.sp500_models for insert with check (auth.uid() = user_id);
grant select on public.sp500_models to anon, authenticated;
grant insert on public.sp500_models to authenticated;

create table if not exists public.sp500_scores (
  model_id   uuid primary key references public.sp500_models(id) on delete cascade,
  n_days     int,
  hit_rate   double precision,
  cum_return double precision,
  sharpe     double precision,
  last_date  date,
  updated_at timestamptz not null default now()
);
alter table public.sp500_scores enable row level security;
drop policy if exists "sp500_scores read" on public.sp500_scores;
create policy "sp500_scores read" on public.sp500_scores for select using (true);
grant select on public.sp500_scores to anon, authenticated;
