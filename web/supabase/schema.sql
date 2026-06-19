-- ConvexPi Platform schema
-- Run this in your Supabase SQL editor (Dashboard → SQL Editor → New query)

-- ── Profiles (extends auth.users) ───────────────────────────────────────────
create table public.profiles (
  id            uuid primary key references auth.users on delete cascade,
  username      text unique not null,
  display_name  text,
  university    text,
  bio           text,
  created_at    timestamptz default now()
);

create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, username, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ── Cohorts (classrooms + competitions) ─────────────────────────────────────
create table public.cohorts (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  name          text not null,
  description   text,
  type          text not null check (type in ('classroom', 'competition')),
  visibility    text not null default 'private' check (visibility in ('private', 'public')),
  owner_id      uuid references auth.users on delete cascade not null,
  join_code     text unique,                  -- classroom invite code
  start_date    timestamptz,
  end_date      timestamptz,
  status        text default 'upcoming' check (status in ('upcoming', 'active', 'ended')),
  arena_config  jsonb default '{}',           -- tick_interval, n_ticks, seed, etc.
  market_config jsonb default '{}',           -- n_stocks, n_days, seed for Lab grading
  created_at    timestamptz default now()
);

-- ── Cohort members ───────────────────────────────────────────────────────────
create table public.cohort_members (
  cohort_id   uuid references public.cohorts on delete cascade,
  user_id     uuid references auth.users on delete cascade,
  role        text default 'member' check (role in ('owner', 'admin', 'member')),
  joined_at   timestamptz default now(),
  primary key (cohort_id, user_id)
);

-- Auto-add owner as member
create or replace function public.add_owner_as_member()
returns trigger language plpgsql security definer as $$
begin
  insert into public.cohort_members (cohort_id, user_id, role)
  values (new.id, new.owner_id, 'owner');
  return new;
end;
$$;

create trigger on_cohort_created
  after insert on public.cohorts
  for each row execute procedure public.add_owner_as_member();

-- ── Strategy submissions ─────────────────────────────────────────────────────
create table public.submissions (
  id              uuid primary key default gen_random_uuid(),
  cohort_id       uuid references public.cohorts on delete cascade not null,
  user_id         uuid references auth.users on delete cascade not null,
  strategy_name   text not null,
  code            text not null,
  submitted_at    timestamptz default now(),
  status          text default 'pending'
                    check (status in ('pending', 'running', 'completed', 'failed')),
  error_message   text
);

-- ── Grade reports ────────────────────────────────────────────────────────────
create table public.grade_reports (
  id                  uuid primary key default gen_random_uuid(),
  submission_id       uuid references public.submissions on delete cascade unique,
  is_sharpe           float,
  oos_sharpe          float,
  overfitting_ratio   float,
  is_max_dd           float,
  oos_max_dd          float,
  is_annual_return    float,
  oos_annual_return   float,
  is_turnover         float,
  oos_turnover        float,
  alphas_discovered   int,
  total_alphas        int,
  alpha_details       jsonb,    -- [{feature, planted_bps, corr, discovered, signal_ir}]
  noise_loadings      jsonb,    -- {noise_1: 0.002, ...}
  graded_at           timestamptz default now()
);

-- ── Forward paper-trading scores ────────────────────────────────────────────
-- Nightly runner re-evaluates each completed submission on a fresh market window
-- and appends one row per day. The leaderboard shows the rolling forward track record.
create table public.forward_scores (
  id             uuid primary key default gen_random_uuid(),
  submission_id  uuid references public.submissions on delete cascade not null,
  run_date       date not null,
  forward_sharpe float,     -- annualized Sharpe on that day's eval window
  forward_return float,     -- annualized return
  forward_max_dd float,     -- max drawdown
  market_seed    int,       -- seed used (deterministic per run_date)
  window_days    int,       -- number of trading days evaluated
  created_at     timestamptz default now(),
  unique (submission_id, run_date)
);

create index on public.forward_scores (submission_id, run_date desc);

create policy "forward_scores_read" on public.forward_scores for select using (
  exists (
    select 1 from public.submissions s
    where s.id = forward_scores.submission_id
      and (
        s.user_id = auth.uid()
        or exists (
          select 1 from public.cohorts c
          join public.cohort_members m on m.cohort_id = c.id
          where c.id = s.cohort_id and m.user_id = auth.uid()
            and (c.visibility = 'public' or m.role in ('owner', 'admin'))
        )
      )
  )
);

alter table public.forward_scores enable row level security;

-- ── Arena sessions (one per cohort run) ─────────────────────────────────────
create table public.arena_sessions (
  id          uuid primary key default gen_random_uuid(),
  cohort_id   uuid references public.cohorts,
  season_name text,
  description text,
  status      text default 'active' check (status in ('active', 'ended')),
  config      jsonb default '{}',
  started_at  timestamptz default now(),
  ended_at    timestamptz
);

-- ── Arena rankings (upserted each broadcast tick) ───────────────────────────
create table public.arena_rankings (
  session_id      uuid references public.arena_sessions on delete cascade,
  agent_id        text not null,
  user_id         uuid references auth.users,   -- null = background agent
  tick            int default 0,
  pnl_cents       bigint default 0,
  position        int default 0,
  survival_score  float,
  eliminated      boolean default false,
  updated_at      timestamptz default now(),
  primary key (session_id, agent_id)
);

-- ── Row-level security ───────────────────────────────────────────────────────
alter table public.profiles       enable row level security;
alter table public.cohorts        enable row level security;
alter table public.cohort_members enable row level security;
alter table public.submissions    enable row level security;
alter table public.grade_reports  enable row level security;
alter table public.arena_sessions enable row level security;
alter table public.arena_rankings enable row level security;

-- profiles: public read, own write
create policy "profiles_public_read"  on public.profiles for select using (true);
create policy "profiles_own_write"    on public.profiles for update using (auth.uid() = id);

-- Security-definer helpers break the circular RLS dependency between cohorts ↔ cohort_members.
-- Each function runs as the DB owner (bypassing RLS) so policies can call them safely.
create or replace function public.is_cohort_member(p_cohort_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.cohort_members where cohort_id = p_cohort_id and user_id = auth.uid());
$$;

create or replace function public.is_cohort_public(p_cohort_id uuid)
returns boolean language sql security definer stable set search_path = public as $$
  select exists (select 1 from public.cohorts where id = p_cohort_id and visibility = 'public');
$$;

-- cohorts: visible when public, owned, or the caller is a member
create policy "cohorts_public_read" on public.cohorts for select using (
  visibility = 'public'
  or owner_id = auth.uid()
  or public.is_cohort_member(id)
);
create policy "cohorts_owner_write" on public.cohorts for all using (owner_id = auth.uid());
create policy "cohorts_insert"      on public.cohorts for insert with check (owner_id = auth.uid());

-- cohort_members: visible to members of the same cohort, or if the cohort is public
create policy "members_visible_to_cohort" on public.cohort_members for select using (
  public.is_cohort_member(cohort_id)
  or public.is_cohort_public(cohort_id)
);
create policy "members_self_join" on public.cohort_members for insert
  with check (user_id = auth.uid());

-- submissions: own always visible; public cohort = all members can see
create policy "submissions_read" on public.submissions for select using (
  user_id = auth.uid()
  or exists (
    select 1 from public.cohorts c
    join public.cohort_members m on m.cohort_id = c.id
    where c.id = submissions.cohort_id
      and m.user_id = auth.uid()
      and (c.visibility = 'public' or m.role in ('owner', 'admin'))
  )
);
create policy "submissions_own_insert" on public.submissions for insert
  with check (user_id = auth.uid());

-- grade_reports: same visibility as their submission
create policy "grade_reports_read" on public.grade_reports for select using (
  exists (
    select 1 from public.submissions s
    where s.id = grade_reports.submission_id
      and (
        s.user_id = auth.uid()
        or exists (
          select 1 from public.cohorts c
          join public.cohort_members m on m.cohort_id = c.id
          where c.id = s.cohort_id and m.user_id = auth.uid()
            and (c.visibility = 'public' or m.role in ('owner', 'admin'))
        )
      )
  )
);

-- arena sessions + rankings: public cohort = world-readable; private = members only
create policy "arena_sessions_read" on public.arena_sessions for select using (
  exists (
    select 1 from public.cohorts c
    where c.id = arena_sessions.cohort_id
      and (
        c.visibility = 'public'
        or c.owner_id = auth.uid()
        or exists (
          select 1 from public.cohort_members m
          where m.cohort_id = c.id and m.user_id = auth.uid()
        )
      )
  )
);

create policy "arena_rankings_read" on public.arena_rankings for select using (
  exists (
    select 1 from public.arena_sessions s
    join public.cohorts c on c.id = s.cohort_id
    where s.id = arena_rankings.session_id
      and (
        c.visibility = 'public'
        or c.owner_id = auth.uid()
        or exists (
          select 1 from public.cohort_members m
          where m.cohort_id = c.id and m.user_id = auth.uid()
        )
      )
  )
);

-- Cohort owners/admins can create and end Arena sessions for their cohort
create policy "arena_sessions_owner_write" on public.arena_sessions for all using (
  exists (
    select 1 from public.cohort_members m
    where m.cohort_id = arena_sessions.cohort_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
) with check (
  exists (
    select 1 from public.cohort_members m
    where m.cohort_id = arena_sessions.cohort_id
      and m.user_id = auth.uid()
      and m.role in ('owner', 'admin')
  )
);

-- Service role (used by Arena server + Grader worker) bypasses RLS automatically.
-- Create a service role key in Supabase dashboard and store it in Railway/env.

-- ── Leaderboard view (convenient query for the web app) ─────────────────────
create or replace view public.leaderboard as
select
  r.session_id,
  r.agent_id,
  r.user_id,
  p.username,
  p.display_name,
  p.university,
  r.tick,
  round(r.pnl_cents / 100.0, 2) as pnl_dollars,
  r.position,
  r.survival_score,
  r.eliminated,
  r.updated_at,
  s.cohort_id,
  c.name as cohort_name,
  c.type as cohort_type,
  c.visibility
from public.arena_rankings r
join public.arena_sessions s on s.id = r.session_id
join public.cohorts c on c.id = s.cohort_id
left join public.profiles p on p.id = r.user_id
order by r.pnl_cents desc;

-- Enable Realtime on rankings table (Dashboard → Database → Replication → add arena_rankings)
-- Or run:  alter publication supabase_realtime add table public.arena_rankings;
alter publication supabase_realtime add table public.arena_rankings;
