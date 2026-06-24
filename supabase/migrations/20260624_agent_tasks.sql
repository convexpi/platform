-- Agent task queue: a shared work board between the admin and the agent.
-- The admin adds tasks on /admin/tasks; the agent reads/updates via the service key.
-- Service-role only (admin pages + agent); no client-facing policies.

create table if not exists public.agent_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  detail      text,
  area        text,                            -- optional tag: replications | wikis | platform | data | ...
  priority    int  not null default 2,         -- 1 high, 2 normal, 3 low
  status      text not null default 'todo',    -- todo | in_progress | done | cancelled
  result      text,                            -- outcome / notes (the agent writes here)
  created_by  text default 'admin',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

alter table public.agent_tasks enable row level security;
-- No policy granted to anon/authenticated: reads and writes go through the service role only.
