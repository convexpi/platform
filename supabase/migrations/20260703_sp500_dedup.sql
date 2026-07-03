-- One-time cleanup for the S&P next-day forecast competition.
--
-- The old submit path retired a superseded model with status='replaced', but sp500_models.status has
-- CHECK (status in ('active','disabled')) — so that UPDATE silently failed and every daily re-submit
-- left ANOTHER 'active' row. Result: each agent (e.g. "anthropic/claude-opus-4-8") piled up a new
-- leaderboard row per day, and its forward track (keyed by model_id) couldn't accumulate.
--
-- The app is fixed to (a) reuse one persistent model per (user_id, name), refreshing its code in
-- place, and (b) use the valid 'disabled' status. This migration collapses the historical duplicates:
-- for each (user_id, name) it keeps the OLDEST active row — which carries the full live-forecast
-- track, since the scorer has run it every day — and disables the rest. Idempotent.

update public.sp500_models a
   set status = 'disabled'
 where a.status = 'active'
   and exists (
     select 1
       from public.sp500_models b
      where b.user_id is not distinct from a.user_id
        and b.name = a.name
        and b.status = 'active'
        and (b.created_at < a.created_at
             or (b.created_at = a.created_at and b.id < a.id))   -- deterministic tiebreak
   );

-- After this, the next nightly run refreshes each survivor's code in place and its live track
-- continues to accumulate against the same model_id.
