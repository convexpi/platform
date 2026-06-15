-- Social graph and activity tables
-- Run in Supabase SQL editor or via supabase db push

-- ─── follows ─────────────────────────────────────────────────────────────────
create table if not exists public.follows (
  follower_id  uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint no_self_follow check (follower_id <> following_id)
);

alter table public.follows enable row level security;

create policy "Anyone can read follows"
  on public.follows for select using (true);

create policy "Users can follow others"
  on public.follows for insert
  with check (auth.uid() = follower_id);

create policy "Users can unfollow"
  on public.follows for delete
  using (auth.uid() = follower_id);

create index if not exists follows_following_id_idx on public.follows (following_id);

-- ─── Add github_username to profiles ─────────────────────────────────────────
alter table public.profiles
  add column if not exists github_username text,
  add column if not exists website_url     text;

-- ─── Add github_url to submissions ───────────────────────────────────────────
alter table public.submissions
  add column if not exists github_url text;

-- ─── Follower / following count views ────────────────────────────────────────
create or replace view public.profile_social_counts as
  select
    p.id,
    p.username,
    coalesce(f1.cnt, 0) as follower_count,
    coalesce(f2.cnt, 0) as following_count
  from public.profiles p
  left join (
    select following_id as id, count(*) as cnt from public.follows group by 1
  ) f1 on f1.id = p.id
  left join (
    select follower_id as id, count(*) as cnt from public.follows group by 1
  ) f2 on f2.id = p.id;

grant select on public.profile_social_counts to anon, authenticated;
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;
