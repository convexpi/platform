-- Community project showcase (MVP): GitHub-sourced posts rendered into embeddable blog posts.
create table if not exists public.posts (
  id            uuid primary key default gen_random_uuid(),
  slug          text unique not null,
  author_id     uuid not null references auth.users(id) on delete cascade,
  repo_url      text not null,
  commit_sha    text,
  notebook_path text not null,
  format        text not null default 'ipynb',
  title         text not null default 'Untitled post',
  summary       text,
  tags          text[] not null default '{}',
  rendered_html text,                         -- sanitized HTML fragment from render_post.py
  status        text not null default 'building' check (status in ('building','published','failed')),
  build_log     text,
  has_strategy  boolean not null default false,
  forked_from   uuid references public.posts(id) on delete set null,
  license       text,
  submission_id uuid,                         -- links a graded strategy (leaderboard) later
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  published_at  timestamptz
);

create index if not exists posts_status_idx on public.posts(status, published_at desc);
create index if not exists posts_author_idx on public.posts(author_id);

alter table public.posts enable row level security;

drop policy if exists "posts public read" on public.posts;
drop policy if exists "posts insert own" on public.posts;
drop policy if exists "posts update own"  on public.posts;

-- Published posts are world-readable; authors can see their own while building/failed.
create policy "posts public read" on public.posts for select
  using (status = 'published' or author_id = auth.uid());
-- Authenticated users create their own posts; the build worker (service role) bypasses RLS.
create policy "posts insert own" on public.posts for insert
  with check (auth.uid() = author_id);
create policy "posts update own" on public.posts for update
  using (auth.uid() = author_id);
