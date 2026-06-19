-- ─────────────────────────────────────────────────────────────────────────────
-- Programmatic submission: personal API keys + agent submission tracking
--
-- api_keys   — hashed personal/agent keys for the submission API
-- submissions.submitted_via / agent_name — distinguish web / api / agent entries
-- ─────────────────────────────────────────────────────────────────────────────

-- ── api_keys ─────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.api_keys (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID NOT NULL REFERENCES auth.users (id) ON DELETE CASCADE,

    name         TEXT NOT NULL,                 -- human label / agent name
    kind         TEXT NOT NULL DEFAULT 'user'   -- 'user' = personal, 'agent' = bot entrant
                   CHECK (kind IN ('user', 'agent')),

    -- Only the SHA-256 hash is stored; the full key is shown to the user once.
    key_hash     TEXT NOT NULL UNIQUE,
    key_prefix   TEXT NOT NULL,                 -- e.g. 'cpk_live_a1b2c3d4' for display

    scopes       TEXT[] NOT NULL DEFAULT '{submit}',

    created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
    last_used_at TIMESTAMPTZ,
    revoked_at   TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS api_keys_user_idx ON public.api_keys (user_id);
CREATE INDEX IF NOT EXISTS api_keys_hash_idx ON public.api_keys (key_hash) WHERE revoked_at IS NULL;

ALTER TABLE public.api_keys ENABLE ROW LEVEL SECURITY;

-- Owners manage their own keys from the browser (cookie session). The submission
-- API resolves keys by hash with the service role, which bypasses RLS.
CREATE POLICY "api_keys_select_own"
    ON public.api_keys FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "api_keys_insert_own"
    ON public.api_keys FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "api_keys_update_own"
    ON public.api_keys FOR UPDATE USING (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.api_keys TO authenticated;

-- ── submissions: track origin ────────────────────────────────────────────────
ALTER TABLE public.submissions
    ADD COLUMN IF NOT EXISTS submitted_via TEXT NOT NULL DEFAULT 'web'
        CHECK (submitted_via IN ('web', 'api', 'agent'));

ALTER TABLE public.submissions
    ADD COLUMN IF NOT EXISTS agent_name TEXT;

CREATE INDEX IF NOT EXISTS submissions_via_idx ON public.submissions (submitted_via);
