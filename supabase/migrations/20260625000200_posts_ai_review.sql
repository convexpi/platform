-- AI first-pass review of a post (constructive feedback generated on demand).
alter table public.posts add column if not exists ai_review text;
alter table public.posts add column if not exists ai_reviewed_at timestamptz;
