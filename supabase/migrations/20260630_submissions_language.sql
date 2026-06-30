-- Multi-language submissions: the language the strategy is written in (graded by the same engine).
alter table public.submissions
  add column if not exists language text not null default 'python'
  check (language in ('python', 'r', 'julia'));
