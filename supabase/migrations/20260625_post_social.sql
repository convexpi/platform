-- Social layer for the project showcase: upvotes + comments.

create table if not exists public.post_votes (
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.post_votes enable row level security;
drop policy if exists "votes read"   on public.post_votes;
drop policy if exists "votes insert" on public.post_votes;
drop policy if exists "votes delete" on public.post_votes;
create policy "votes read"   on public.post_votes for select using (true);
create policy "votes insert" on public.post_votes for insert with check (auth.uid() = user_id);
create policy "votes delete" on public.post_votes for delete using (auth.uid() = user_id);
grant select, insert, delete on public.post_votes to authenticated;
grant select on public.post_votes to anon;

create table if not exists public.post_comments (
  id         uuid primary key default gen_random_uuid(),
  post_id    uuid not null references public.posts(id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  body       text not null check (char_length(body) between 1 and 4000),
  created_at timestamptz not null default now()
);
create index if not exists post_comments_post_idx on public.post_comments(post_id, created_at);
alter table public.post_comments enable row level security;
drop policy if exists "comments read"   on public.post_comments;
drop policy if exists "comments insert" on public.post_comments;
drop policy if exists "comments delete" on public.post_comments;
create policy "comments read"   on public.post_comments for select using (true);
create policy "comments insert" on public.post_comments for insert with check (auth.uid() = user_id);
create policy "comments delete" on public.post_comments for delete using (auth.uid() = user_id);
grant select, insert, delete on public.post_comments to authenticated;
grant select on public.post_comments to anon;
