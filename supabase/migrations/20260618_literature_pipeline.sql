-- ─────────────────────────────────────────────────────────────────────────────
-- Phase 2: Literature pipeline tables
--
-- papers         — canonical bibliographic records from arXiv / Semantic Scholar
-- anomaly_papers — junction: which papers document which OSAP anomalies
-- research_claims — structured quantitative claims extracted per paper
-- ─────────────────────────────────────────────────────────────────────────────

-- ── papers ───────────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.papers (
    id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    -- Source tracking (source + source_id must be unique together)
    source           TEXT NOT NULL,          -- 'arxiv' | 'semantic_scholar' | 'openalex' | 'manual'
    source_id        TEXT NOT NULL,          -- arXiv id, S2 paper id, OpenAlex id, etc.

    -- Canonical identifiers
    doi              TEXT,                   -- normalised, no "doi:" prefix
    arxiv_id         TEXT,                   -- e.g. '2309.12345'

    -- Bibliographic fields
    title            TEXT NOT NULL,
    authors          JSONB NOT NULL DEFAULT '[]'::jsonb,   -- [{name, orcid?}]
    year             INT,
    journal          TEXT,                   -- abbreviated (JF, JFE, RFS …) or venue name
    abstract         TEXT,
    open_access_url  TEXT,                   -- direct OA PDF URL when available
    citation_count   INT,

    -- Classification
    topics           JSONB NOT NULL DEFAULT '[]'::jsonb,   -- ["momentum","value","meta",…]
    factor_signals   JSONB NOT NULL DEFAULT '[]'::jsonb,   -- OSAP acronyms, e.g. ["Mom12m","BM"]
    is_preprint      BOOLEAN NOT NULL DEFAULT FALSE,
    is_open_access   BOOLEAN NOT NULL DEFAULT FALSE,
    is_oos_paper     BOOLEAN NOT NULL DEFAULT FALSE,       -- reports post-publication / OOS evidence?

    -- Quality & curation
    quality_score    FLOAT CHECK (quality_score BETWEEN 0 AND 1),
    curation_status  TEXT NOT NULL DEFAULT 'candidate'
                       CHECK (curation_status IN ('candidate', 'approved', 'rejected')),

    -- LLM-generated wiki
    wiki_markdown    TEXT,
    wiki_generated_at TIMESTAMPTZ,

    created_at       TIMESTAMPTZ NOT NULL DEFAULT now(),

    CONSTRAINT papers_source_unique UNIQUE (source, source_id)
);

-- Partial unique indexes on nullable canonical identifiers
CREATE UNIQUE INDEX IF NOT EXISTS papers_doi_idx
    ON public.papers (doi) WHERE doi IS NOT NULL;
CREATE UNIQUE INDEX IF NOT EXISTS papers_arxiv_idx
    ON public.papers (arxiv_id) WHERE arxiv_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS papers_year_idx    ON public.papers (year);
CREATE INDEX IF NOT EXISTS papers_topics_idx  ON public.papers USING gin (topics);
CREATE INDEX IF NOT EXISTS papers_signals_idx ON public.papers USING gin (factor_signals);

-- ── anomaly_papers ───────────────────────────────────────────────────────────
-- Junction: which papers document which anomalies.
-- anomaly_id matches the `id` field in anomaly-stats.json (e.g. "mom12m").
CREATE TABLE IF NOT EXISTS public.anomaly_papers (
    anomaly_id   TEXT NOT NULL,
    paper_id     UUID NOT NULL REFERENCES public.papers (id) ON DELETE CASCADE,
    is_primary   BOOLEAN NOT NULL DEFAULT FALSE,   -- TRUE = the defining paper for this anomaly
    added_by     TEXT NOT NULL DEFAULT 'pipeline', -- 'pipeline' | 'manual'

    PRIMARY KEY (anomaly_id, paper_id)
);

CREATE INDEX IF NOT EXISTS anomaly_papers_paper_idx ON public.anomaly_papers (paper_id);

-- ── research_claims ──────────────────────────────────────────────────────────
-- Structured quantitative claims extracted per paper (one row per claim).
CREATE TABLE IF NOT EXISTS public.research_claims (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id     UUID NOT NULL REFERENCES public.papers (id) ON DELETE CASCADE,
    anomaly_id   TEXT,                    -- which anomaly this claim is about (if applicable)
    claim_type   TEXT NOT NULL            -- 'is_sharpe' | 'oos_sharpe' | 'decay_rate'
                   CHECK (claim_type IN (
                       'is_sharpe', 'oos_sharpe', 't_stat', 'decay_rate',
                       'replication_status', 'sample_period', 'other'
                   )),
    value        FLOAT,                   -- numeric value (Sharpe, t-stat, %)
    period       TEXT,                    -- e.g. "1963–2013"
    context      TEXT,                    -- one-sentence description of the claim
    confidence   FLOAT CHECK (confidence BETWEEN 0 AND 1),  -- extraction confidence
    created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS claims_paper_idx   ON public.research_claims (paper_id);
CREATE INDEX IF NOT EXISTS claims_anomaly_idx ON public.research_claims (anomaly_id);

-- ── RLS ──────────────────────────────────────────────────────────────────────
ALTER TABLE public.papers          ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.anomaly_papers  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.research_claims ENABLE ROW LEVEL SECURITY;

-- All tables: public read (research content); writes only via service role (pipeline)
CREATE POLICY "papers_public_read"
    ON public.papers FOR SELECT USING (true);
CREATE POLICY "anomaly_papers_public_read"
    ON public.anomaly_papers FOR SELECT USING (true);
CREATE POLICY "claims_public_read"
    ON public.research_claims FOR SELECT USING (true);

-- ── Grants ───────────────────────────────────────────────────────────────────
GRANT SELECT ON public.papers          TO anon, authenticated;
GRANT SELECT ON public.anomaly_papers  TO anon, authenticated;
GRANT SELECT ON public.research_claims TO anon, authenticated;
