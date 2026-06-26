-- Curated/featured picks for the project showcase (admin-toggled).
alter table public.posts add column if not exists featured boolean not null default false;
