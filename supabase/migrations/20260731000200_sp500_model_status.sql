-- Tell submitters why their model isn't scoring.
--
-- A model that fails validation or crashes simply produced no row in sp500_scores, so its author
-- saw an empty line on the standings and no explanation. On a competition site that is close to a
-- correctness bug: the feedback loop the whole thing depends on is silently broken.
--
-- The runner sets last_error on every pass — a string when the model didn't score, null when it
-- did — so a stale error can never linger after a fix.
alter table public.sp500_models
  add column if not exists last_error  text,
  add column if not exists last_run_at timestamptz;

-- Authors read their own errors, and the standings show a neutral "not scoring" marker to everyone.
-- The existing select policy already governs read access to this table.
