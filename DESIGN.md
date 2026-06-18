# ConvexPi Platform — Design Document

> Architecture reference and strategic context for the ConvexPi platform.
> The guiding principle: **build what a serious academic institution would trust,
> ship what a student can use in 30 minutes.**

---

## Table of Contents

1. [Mission](#1-mission)
2. [Competitive Landscape](#2-competitive-landscape)
3. [Repository Layout](#3-repository-layout)
4. [Platform Architecture](#4-platform-architecture)
5. [Anomaly Research Expansion](#5-anomaly-research-expansion)
6. [Data Sources](#6-data-sources)
7. [Environment Variables](#7-environment-variables)
8. [Decision Log](#8-decision-log)

---

## 1. Mission

ConvexPi is a quantitative finance education platform built around a single conviction:
**the only honest measure of a strategy is out-of-sample performance on data the
researcher never saw.**

The platform combines:
- **Missions** — Colab notebooks that teach quant concepts by doing (build, test, submit)
- **Grader** — a hidden OOS evaluation period that grades every submission on data the student cannot access
- **Research library** — factor pages with economic intuition, key papers, and replication evidence
- **Anomaly tracker** — empirical pre- vs. post-publication Sharpe for canonical equity anomalies
- **Classroom cohorts** — private leaderboards for university courses, graded on OOS Sharpe

The target audience is advanced undergraduates and graduate students in finance, economics,
and computer science. The secondary audience is practitioners who want to sharpen their
factor-research skills on a rigorous public benchmark.

---

## 2. Competitive Landscape

### Direct competitors

| Platform | Core offering | Key differentiator | Where we differ |
|---|---|---|---|
| **Quantpedia** | Encyclopedia of 1,200+ trading strategies extracted from academic papers. Premium tiers; Python code for top tier. | Breadth — most comprehensive strategy database available. Institutional clients. | We emphasize *replication* and *OOS grading*, not just cataloguing. Students test strategies; they don't just read about them. |
| **Quantopian** *(defunct 2020)* | Cloud backtesting IDE with US equity data, community competitions. Had $50M AUM. | First mover in cloud quant research; strong community. | Died because the business model (AUM allocation) required strategies that actually worked. We are educational-first — no AUM, no conflict. |
| **QuantConnect** | Open-source backtesting engine ([LEAN](https://www.lean.io/), [github.com/QuantConnect/Lean](https://github.com/QuantConnect/Lean)) + cloud IDE, live trading brokerage. Most of the platform is now open-source. Large community (506k+ users). | Full production pipeline from research to live trading; LEAN is the most mature open-source quant engine available. | We deliberately stop at research. No live trading, no brokerage integration — keeps focus on the learning objective. LEAN's open-source status means infrastructure parity is achievable if we ever need production backtesting. |
| **Kaggle** | ML competition platform with cash prizes, public notebooks, datasets. | Enormous community, network effects, Google resources. | Kaggle competitions are typically i.i.d. ML problems; they do not enforce the IS/OOS discipline that is the core lesson in quant finance. Anyone can see the OOS data. |
| **WorldQuant Brain** | Alpha submission platform for WorldQuant's internal use. Free data access in exchange for alpha ideas. | Real data, real money, real feedback. | Proprietary — strategies become WorldQuant's IP. No classroom tools, no curriculum. |
| **Numerai** | Weekly ML tournament on encrypted financial data. Staking mechanism (NMR token). | Novel data structure (PCA-encrypted) forces generalization. Strong community. | Numerai's encrypted data makes it hard to teach *why* a factor works. We want students to understand the economics, not just optimize a score. |
| **Alpha Vantage / Tiingo** | Data providers with free tiers. | Cheap/free market data access. | We are a platform, not a data provider. |

### Adjacent platforms (research infrastructure)

| Platform | What it does | Relevance to us |
|---|---|---|
| **SSRN** | Preprint server for finance/econ papers. | Primary source for new factor papers; integrate into literature pipeline. |
| **OpenAlex** | Open bibliographic database, 250M+ papers, free API. | Backbone of our paper ingestion pipeline. |
| **Semantic Scholar** | AI-powered paper search, citation graph, free API. | Secondary source; good for citation counts and OA PDF discovery. |
| **Kenneth French Data Library** | Monthly factor return series, publicly available. | Primary data source for existing anomaly tracker. |
| **Open Source Asset Pricing (OSAP)** | 212 pre-computed anomaly return series, peer-reviewed. | Backbone of the expanded anomaly tracker (Phase 1). |
| **AQR Data Library** | Value, momentum, carry, defensive factor returns. | Supplement to OSAP for asset-class coverage. |

### Our positioning

ConvexPi occupies a specific gap that none of these fill:

> **Rigorous academic curriculum + honest OOS grading + open-source tooling + classroom management.**

Quantpedia catalogues factors but doesn't test students. Kaggle tests students but doesn't
teach finance. QuantConnect teaches trading but doesn't enforce the IS/OOS discipline.
ConvexPi does all three, for the specific context of university finance courses.

---

## 3. Repository Layout

```
convexpi/
├── platform/           # This repo — Next.js web platform
│   ├── web/
│   │   ├── app/        # Next.js App Router pages
│   │   ├── components/ # React components
│   │   ├── lib/        # Supabase client, research data, types
│   │   └── public/     # anomaly-stats.json (generated), images
│   ├── DESIGN.md       # This file
│   └── README.md
│
├── lab/                # Python library + grader worker
│   ├── src/convexpi/lab/   # convexpi-lab package (pip install convexpi-lab)
│   ├── deploy/             # Dockerfile.grader, grader_worker.py, forward_runner.py
│   ├── tests/
│   └── .github/workflows/  # CI, forward.yml (daily), anomalies.yml (monthly)
│
├── missions/           # Colab notebooks (public)
│   ├── missions/       # mission_01_overfitting/ … mission_06_advanced_agents/
│   └── docs/           # MkDocs site, instructor guide
│
└── arena/              # Exchange simulator (market-making missions)
```

---

## 4. Platform Architecture

### Stack

| Layer | Technology | Hosting |
|---|---|---|
| Frontend | Next.js 15 (App Router), Tailwind, shadcn/ui | Vercel |
| Database + Auth | Supabase (PostgreSQL + Auth + Realtime) | Supabase cloud |
| Grader worker | Python (convexpi-lab), Docker | Railway |
| CI | GitHub Actions | GitHub |
| Missions | Jupyter / Google Colab | GitHub Pages (docs) |

### Data flow for a submission

```
Student writes strategy in Colab
        │
        ▼
pip install convexpi-lab → lab.submit(code, cohort_id)
        │
        ▼
POST /api/submissions (Next.js route)
        │  inserts row, status = 'pending'
        ▼
Supabase: submissions table
        │  grader worker polls every 5 seconds
        ▼
Railway: grader_worker.py
  1. Pull submission code
  2. Run in Docker sandbox (no network, memory-limited)
  3. Evaluate on IS window (student can see this period)
  4. Evaluate on hidden OOS window (MARKET_SEED determines dates)
  5. Write grade_reports row: is_sharpe, oos_sharpe, overfitting_ratio
        │
        ▼
Supabase: grade_reports table → status = 'completed'
        │  Next.js polls / Supabase Realtime
        ▼
Student sees OOS Sharpe on leaderboard
```

### Key security constraint

`MARKET_SEED` is a secret integer that determines which date range is the hidden OOS
evaluation period. It must never be exposed to students, committed to any repo, or
logged. Rotating it invalidates all historical OOS scores (do not rotate mid-cohort).

### Supabase schema (core tables)

```
profiles          — username, display_name, github_username, bio
cohorts           — name, slug, type, status, join_code, visibility
cohort_members    — user_id, cohort_id, role (owner/admin/member)
submissions       — user_id, cohort_id, strategy_name, code, status
grade_reports     — submission_id, is_sharpe, oos_sharpe, overfitting_ratio,
                    alphas_discovered, alpha_details
forward_scores    — submission_id, run_date, forward_sharpe
arena_sessions    — cohort_id, season_name, status
follows           — follower_id, following_id
notifications     — user_id, type, payload, read_at
```

---

## 5. Anomaly Research Expansion

### 5.1 Current state

The anomaly tracker (`/anomalies`) loads `public/anomaly-stats.json`, a static file
generated monthly by `.github/workflows/anomalies.yml` in `convexpi/lab`. It currently
covers ~10–20 factors from the Kenneth French Data Library, with IS/OOS Sharpe, decay,
and a cumulative return sparkline per factor.

The research library (`/research`, `/research/[factor]`) is static TypeScript: 5–8
hand-authored factor pages with prose, economic intuition, key papers, and characteristics.

**Goal:** expand to 200+ factors with automatically generated content, paper citations,
and wikis — similar to what is done on dooperator.ai.

### 5.2 Architecture overview

The pipeline has three layers that can be built and deployed independently:

```
┌─────────────────────────────────────────────────────────┐
│  Layer 1: Return data (OSAP / French / AQR)             │
│  Output: 200+ anomaly IS/OOS Sharpe series              │
│  Effort: ~1 week  |  Infrastructure: existing Railway   │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│  Layer 2: Literature pipeline                           │
│  Output: paper metadata, abstracts, full text           │
│  Sources: OpenAlex, arxiv (q-fin.*), Semantic Scholar   │
│  Effort: ~2 weeks  |  Infrastructure: new Railway svc   │
└─────────────────────────┬───────────────────────────────┘
                          │
┌─────────────────────────▼───────────────────────────────┐
│  Layer 3: LLM generation                                │
│  Output: factor wikis, surveys, research claims         │
│  Models: Claude Haiku (draft) → Claude Sonnet (review)  │
│  Effort: ~1 week  |  Infrastructure: same Railway svc   │
└─────────────────────────────────────────────────────────┘
```

### 5.3 Layer 1 — Return data expansion

**Primary source: Open Source Asset Pricing (OSAP)**
Chen & Zimmermann (2022), *Critical Finance Review*. 212 pre-computed long-short anomaly
return series from 1968 to present, released annually as public CSV files.
URL: `https://www.openassetpricing.com/`

Each OSAP anomaly has:
- `signalname` — unique identifier (e.g. `Mom12m`, `BookToMarket`)
- `pubDate` — year the strategy was published
- `cat.signal` — category (Price, Fundamental, Trading, etc.)
- Monthly long-short returns for the full sample

**What to build:**

1. New Python script in `convexpi/lab/deploy/`: `expand_anomalies.py`
   - Download OSAP CSVs (annual release, ~10 MB)
   - For each signal: compute IS Sharpe (pre-pub period), OOS Sharpe (post-pub period),
     decay %, classify status (alive/weakened/faded/dead)
   - Write expanded `anomaly-stats.json` with 200+ entries

2. Expand `anomaly-stats.json` schema:
   ```json
   {
     "id": "Mom12m",
     "name": "12-month Momentum",
     "factor": "mom_12m",
     "category": "price",
     "asset_class": "us_equity",
     "rebalance_freq": "monthly",
     "paper": "Jegadeesh & Titman (1993)",
     "doi": "10.1111/j.1540-6261.1993.tb04702.x",
     "pub_year": 1993,
     "osap_signal": "Mom12m",
     "description": "...",
     "is_period": "1927–1992",
     "oos_period": "1993–present",
     "is_sharpe": 0.82,
     "oos_sharpe": 0.51,
     "decay_pct": 38.0,
     "status": "alive",
     "monthly_returns": [...]
   }
   ```

3. Expand `/anomalies` page with filters:
   - Category (Price, Fundamental, Trading, Risk)
   - Status (alive/weakened/faded/dead)
   - Decade of publication
   - Asset class (when multi-asset data is added)
   - Sort by: OOS Sharpe, decay, year

4. Add individual anomaly pages: `/anomalies/[slug]`
   - Full sparkline + decade breakdown
   - Publication context
   - Link to key paper (via DOI)
   - Link to related research library factor page (when one exists)
   - Related anomalies (by category)

**Timeline:** 1 week.

### 5.4 Layer 2 — Literature pipeline

This pipeline is largely a port of the dooperator.ai pipeline in `causal/scripts/`.
The following scripts exist there and can be adapted:

| dooperator script | What it does | Adaptation for ConvexPi |
|---|---|---|
| `ingest_arxiv_categories.py` | Fetches arxiv papers by category + keyword classifier | Change categories to `q-fin.PM`, `q-fin.ST`, `econ.GN`; change topic taxonomy to factor categories |
| `fetch_full_text.py` | Downloads PDFs via arXiv, PMC, Europe PMC, OpenAlex, Semantic Scholar, Unpaywall | Reuse as-is; finance papers are often on SSRN (no OA) so Unpaywall coverage lower |
| `generate_wiki.py` | LLM wiki from full text | Adapt prompt template for factor wikis (see §5.5) |
| `import_wikis.py` | Writes generated wikis to DB | Reuse with different DB target (Supabase instead of PostgreSQL) |
| `generate_research_claims.py` | Extracts structured claims from papers | Adapt for finance claims: `factor_return`, `decay_rate`, `replication_status` |
| `extract_effect_sizes.py` | Extracts quantitative effect sizes | Adapt to extract IS Sharpe, OOS Sharpe, t-statistic |
| `backfill_citations.py` | Enriches papers with citation counts | Reuse as-is |
| `backfill_dois.py` | Resolves DOIs from titles | Reuse as-is |

**Key difference from dooperator:** The health/causal literature lives on PubMed + arxiv
(stat.ME, cs.LG). Finance papers are concentrated in journals (Journal of Finance, Review
of Financial Studies, Journal of Financial Economics) and SSRN preprints. OpenAlex covers
the journals well; SSRN requires either their API (restricted) or title-based lookup.

**Ingestion target topics (taxonomy):**

```python
TOPIC_QUERIES = {
    "momentum": [
        ("cat:q-fin.PM AND all:momentum equity", ["momentum"]),
        ("cat:q-fin.ST AND ti:momentum return", ["momentum"]),
    ],
    "value": [
        ("cat:q-fin.PM AND all:value factor book-to-market", ["value"]),
    ],
    "quality": [
        ("cat:q-fin.PM AND all:quality factor profitability", ["quality"]),
    ],
    "low_volatility": [
        ("cat:q-fin.PM AND all:low volatility anomaly", ["low_volatility"]),
    ],
    "short_term_reversal": [
        ("cat:q-fin.ST AND all:short-term reversal microstructure", ["reversal"]),
    ],
    "factor_zoo": [
        ("cat:econ.GN AND all:factor zoo multiple testing", ["meta"]),
        ("cat:econ.GN AND all:anomaly replication out-of-sample", ["meta"]),
    ],
    "market_microstructure": [
        ("cat:q-fin.TR AND all:limit order book market maker", ["microstructure"]),
        ("cat:q-fin.TR AND all:adverse selection inventory risk", ["microstructure"]),
    ],
}
```

**New Supabase tables required:**

```sql
-- Papers (canonical bibliographic records)
CREATE TABLE papers (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doi             TEXT UNIQUE,
    arxiv_id        TEXT UNIQUE,
    ssrn_id         TEXT,
    title           TEXT NOT NULL,
    authors         JSONB NOT NULL,   -- [{name, orcid?}]
    year            INT,
    journal         TEXT,
    abstract        TEXT,
    full_text_md    TEXT,             -- extracted, markdown-formatted
    citation_count  INT,
    is_open_access  BOOLEAN,
    oa_pdf_url      TEXT,
    topics          TEXT[],           -- e.g. ['momentum', 'factor_zoo']
    wiki_markdown   TEXT,             -- LLM-generated wiki page
    importance_score FLOAT,           -- 0–1, based on citation count + journal tier
    curation_status TEXT DEFAULT 'candidate',  -- candidate/supporting/canonical/excluded
    ingested_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
    wiki_generated_at TIMESTAMPTZ
);

-- Links between papers and anomalies
CREATE TABLE anomaly_papers (
    anomaly_id  TEXT NOT NULL,    -- references anomaly-stats.json id field
    paper_id    UUID NOT NULL REFERENCES papers(id),
    relationship TEXT NOT NULL,   -- 'discovers', 'replicates', 'refutes', 'extends'
    PRIMARY KEY (anomaly_id, paper_id)
);

-- Structured claims extracted from papers (IS/OOS performance claims)
CREATE TABLE research_claims (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    paper_id        UUID NOT NULL REFERENCES papers(id),
    claim_type      TEXT NOT NULL,  -- 'factor_return', 'replication', 'decay', 'capacity'
    factor_name     TEXT,
    is_sharpe       FLOAT,
    oos_sharpe      FLOAT,
    is_period       TEXT,
    oos_period      TEXT,
    t_statistic     FLOAT,
    sample_countries TEXT[],
    confidence      TEXT,           -- 'high', 'moderate', 'low'
    extracted_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Survey / review pages (aggregated across multiple papers on one topic)
CREATE TABLE surveys (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug        TEXT UNIQUE NOT NULL,
    topic       TEXT NOT NULL,
    title       TEXT NOT NULL,
    content_md  TEXT NOT NULL,
    paper_ids   UUID[],
    generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    model       TEXT NOT NULL
);
```

**Infrastructure:** A new `research_worker` service on Railway (separate from grader
worker). Runs on a schedule (weekly ingestion, nightly wiki generation for new papers).
Shares the existing `NEXT_PUBLIC_SUPABASE_URL` + `SUPABASE_SERVICE_KEY` env vars.

**Timeline:** 2–3 weeks.

### 5.5 Layer 3 — LLM generation

**Wiki prompt (finance adaptation):**

The dooperator wiki prompt extracts intervention, outcome, and actionability from health
papers. The finance adaptation extracts:

```
For each paper, generate a structured wiki in this format:

## [Factor Name]

**One-line summary:** What anomaly does this paper document?

### Trading rule
Plain-language description of the factor construction: how to sort stocks,
what the long and short legs are, rebalancing frequency.

### In-sample evidence
Reported IS Sharpe ratio, return spread, t-statistic, sample period, markets.
Call out any known data-mining concerns.

### Out-of-sample evidence
What happened after publication? Does the paper include OOS tests?
Does this anomaly appear in replication studies (McLean & Pontiff, Hou et al.,
Chen & Zimmermann)?

### Economic intuition
The authors' claimed explanation. Note the main competing explanations.

### Implementation considerations
Turnover, capacity, transaction costs, data requirements.
Can this be implemented with freely available data?

### See also
Related factors, parent papers, follow-up replication studies.
```

**Cost estimates (per wiki, using Claude Haiku for drafts):**
- Abstract only (no full text): ~800 tokens → ~$0.001
- Full text (typical finance paper ~8,000 tokens): ~$0.005
- With Claude Sonnet for final review: ~$0.025

At 500 papers: $2.50–$12.50 total. Negligible.

**Survey generation:**

After ≥5 papers are ingested on a topic, generate a survey page:

```
You are writing an academic survey for graduate students in finance.
Topic: [momentum / value / factor zoo / etc.]
Papers available: [titles, abstracts, claim extracts]

Write a 600–900 word survey covering:
1. The core empirical claim and its origins
2. The proposed economic mechanisms (behavioral vs. risk-based)
3. OOS replication evidence — what survived, what didn't
4. Practical implementation: capacity, turnover, data requirements
5. Open questions and current research frontier

Cite papers as Author (Year) in the text. Be honest about failures to replicate.
Do not overstate confidence.
```

### 5.6 Frontend pages to build

| Page | Status | Notes |
|---|---|---|
| `/anomalies` | Exists | Expand with filters, 200+ factors |
| `/anomalies/[slug]` | **Build** | Individual factor page (auto-generated) |
| `/papers` | **Build** | Searchable paper database |
| `/papers/[id]` | **Build** | Individual paper page with wiki |
| `/surveys` | **Build** | List of LLM-generated topic surveys |
| `/surveys/[slug]` | **Build** | Individual survey page |
| `/research/[factor]` | Exists | 5–8 hand-authored; link to auto-generated anomaly page |

### 5.7 Build sequence

```
Week 1:  expand_anomalies.py → OSAP integration → 200+ factor anomaly-stats.json
         → expand /anomalies page with filters
         → build /anomalies/[slug] individual pages

Week 2:  Adapt ingest_arxiv_categories.py for q-fin.* + OpenAlex finance journals
         → fetch_full_text.py (reuse from causal/)
         → Supabase schema migration (papers, anomaly_papers, research_claims)

Week 3:  generate_wiki.py (finance prompt) → import_wikis.py → Supabase
         → /papers page
         → /papers/[id] page with wiki

Week 4+: generate_synthesis_posts.py → surveys table
          → /surveys pages
          → link anomaly pages to their papers
          → extract_effect_sizes.py → research_claims table
          → set up Railway research_worker on weekly schedule
```

### 5.8 What NOT to build (yet)

- **Semantic search** over papers (embedding-based). dooperator.ai has this via pgvector;
  add it when the paper corpus exceeds ~500 papers and text search is clearly insufficient.
- **Live paper feeds** (daily arxiv ingestion). Start weekly. Move to daily when the
  corpus is stable and the pipeline is battle-tested.
- **SSRN integration**. SSRN has no public API; scraping is fragile. Wait for OpenAlex
  to improve SSRN coverage (they are working on it) or until the benefit justifies the
  maintenance cost.
- **User-contributed paper submissions**. Add after the automated pipeline is solid.

---

## 6. Data Sources

| Source | Type | Free | Coverage | API docs |
|---|---|---|---|---|
| Kenneth French Data Library | Factor returns | Yes | ~30 US equity factors | Manual download |
| Open Source Asset Pricing (OSAP) | Factor returns | Yes | 212 US equity anomalies | CSV files |
| AQR Data Library | Factor returns | Yes | Value, momentum, carry, defensive | Manual download |
| OpenAlex | Paper metadata + abstracts | Yes | 250M+ papers | `api.openalex.org` |
| arxiv | Preprints + PDFs | Yes | q-fin.*, econ.* | `export.arxiv.org/api` |
| Semantic Scholar | Paper metadata + OA PDFs | Yes (1 req/s free) | 200M+ papers | `api.semanticscholar.org` |
| Unpaywall | OA PDF URLs | Yes (email required) | ~50% of DOIs | `api.unpaywall.org` |
| SSRN | Finance preprints | No public API | Finance-heavy | N/A |

**Data we do NOT use (licensing constraints):**
- CRSP (expensive, university license required)
- Compustat (expensive, university license required)
- Bloomberg / Refinitiv (very expensive)

ConvexPi is deliberately built on freely available data so that any university or
student can replicate results without institutional data subscriptions.

---

## 7. Environment Variables

### Vercel (web platform)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key (public) |
| `SUPABASE_SERVICE_KEY` | Supabase service role key (server-only) |
| `ADMIN_USER_IDS` | Comma-separated Supabase UUIDs for admin panel access |
| `SENTRY_DSN` | Sentry error tracking |
| `SENTRY_PROJECT` | `convexpi-web` |

### Railway (grader worker)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as Vercel |
| `SUPABASE_SERVICE_KEY` | Same as Vercel |
| `MARKET_SEED` | Secret integer — determines hidden OOS evaluation period. **Never expose.** |

### Railway (research worker — future)

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Same as above |
| `SUPABASE_SERVICE_KEY` | Same as above |
| `ANTHROPIC_API_KEY` | For wiki and survey generation |
| `SEMANTIC_SCHOLAR_API_KEY` | Raises rate limit from 1 req/s to 100 req/s |
| `OPENALEX_EMAIL` | Required for polite pool (faster rate limit) |
| `UNPAYWALL_EMAIL` | Required for Unpaywall OA PDF lookup |

### GitHub Actions (convexpi/lab)

| Secret | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Supabase service role key |
| `MARKET_SEED` | Same as Railway |
| `PLATFORM_REPO_TOKEN` | Fine-grained PAT; write access to `convexpi/platform` (for anomaly-stats.json commit) |

---

## 8. Decision Log

| # | Decision | Rationale | Revisit if |
|---|---|---|---|
| 1 | Supabase instead of custom PostgreSQL | Gives auth, realtime, and storage without running infra. Free tier is generous for academic use. | Moving to self-hosted if Supabase pricing becomes prohibitive at scale. |
| 2 | Static `anomaly-stats.json` (not a DB table) | Simplest approach; the anomaly page is server-rendered and the file is small enough to read at build time. | When the file exceeds ~5 MB or we need user-specific filtering. At that point, migrate to a Supabase table. |
| 3 | `research-data.ts` as static TypeScript | Hand-authored prose quality is higher than LLM-generated for the 5–8 flagship factor pages. | When the LLM-generated factor wikis reach quality parity, migrate to DB-driven rendering. |
| 4 | Railway for grader (not Vercel Functions) | Grading requires a long-running Docker sandbox (>60s timeout). Vercel functions have a 60s hard limit. | If Railway pricing increases significantly; evaluate Modal or Fly.io. |
| 5 | No live trading integration | Keeps the educational focus clear. Live trading adds regulatory complexity and conflicts of interest. | Never — this is a deliberate product boundary. |
| 6 | OSAP as primary anomaly data source (not CRSP) | OSAP is free, peer-reviewed, and covers 212 anomalies. CRSP requires expensive university license. | If OSAP coverage gaps become a problem (e.g., international equities). |
| 7 | Adapt dooperator.ai pipeline (not rebuild) | The arxiv ingestion, full-text fetch, and wiki generation scripts in `causal/scripts/` are battle-tested. Adapting is ~20% of the work of rebuilding. | Never — reuse is always the right call here. |
| 8 | Claude Haiku for draft wikis, Sonnet for review | Haiku is 5× cheaper at near-equivalent quality for structured extraction. Sonnet adds value for synthesis and survey writing. | If Haiku quality drops on nuanced finance content. |
| 9 | No Quantpedia API / data licensing | Quantpedia is a competitor. We build on open data (OSAP, French, AQR) to maintain independence and reproducibility. | Never. |
| 10 | `MARKET_SEED` never rotated mid-cohort | Rotating invalidates all historical OOS scores, breaking academic fairness. | Rotate only between academic semesters, with advance notice to instructors. |

---

*Update this document when architectural decisions change or new phases begin.*
