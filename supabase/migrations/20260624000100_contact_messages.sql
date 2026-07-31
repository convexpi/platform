-- Contact-form submissions. Inserted by the /about contact server action (service role),
-- read in /admin/messages. Service-role only; no client policy.
create table if not exists public.contact_messages (
  id         uuid primary key default gen_random_uuid(),
  name       text,
  email      text,
  message    text not null,
  status     text not null default 'new',   -- new | read | replied
  created_at timestamptz not null default now()
);
alter table public.contact_messages enable row level security;
