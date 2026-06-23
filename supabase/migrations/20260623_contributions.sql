-- Community reputation: a persistent points ledger + an aggregation view.
-- Powers the /contributors leaderboard and the reputation/badges on profiles.
-- Points are awarded server-side (service role); reading is public.

create table if not exists public.contributions (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid references auth.users(id) on delete set null,  -- platform user, when known
  github_username text,                                               -- attribution before/without an account
  kind            text not null,        -- 'replication' | 'ghost' | 'wiki' | 'submission' | 'oos_survivor' | 'season_podium'
  points          integer not null default 0,
  ref             text,                 -- e.g. replication name, paper id, submission id
  detail          text,                 -- human-readable description
  source_key      text unique,          -- idempotency key for upserts (e.g. 'replication:momentum:convexpi')
  created_at      timestamptz not null default now()
);

alter table public.contributions enable row level security;
drop policy if exists "public read contributions" on public.contributions;
create policy "public read contributions" on public.contributions for select using (true);
-- writes happen only via the service role (which bypasses RLS); no insert/update policy for clients.
grant select on public.contributions to anon, authenticated;

-- Aggregate reputation + per-kind counts per contributor (for badges).
create or replace view public.contributor_reputation with (security_invoker = true) as
select
  coalesce(c.github_username, c.user_id::text)         as contributor,
  c.github_username,
  c.user_id,
  sum(c.points)::int                                   as reputation,
  count(*)::int                                        as n_contributions,
  count(*) filter (where c.kind = 'replication')::int  as n_replications,
  count(*) filter (where c.kind = 'wiki')::int         as n_wiki,
  count(*) filter (where c.kind = 'submission')::int   as n_submissions,
  count(*) filter (where c.kind = 'oos_survivor')::int as n_survivor,
  count(*) filter (where c.kind = 'ghost')::int        as n_ghost,
  count(*) filter (where c.kind = 'season_podium')::int as n_podium,
  max(c.created_at)                                    as last_at
from public.contributions c
group by 1, 2, 3;

grant select on public.contributor_reputation to anon, authenticated;
