import { NextRequest } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@/lib/supabase/server'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type MissionId = 'mission_01_overfitting' | 'mission_02_marketmaker' | 'mission_03_alpha_discovery' | 'general'

interface TutorRequest {
  missionId: MissionId
  message: string
  submissionId?: string   // if provided, fetch latest grade report for context
}

// ---------------------------------------------------------------------------
// Mission system prompts
// ---------------------------------------------------------------------------

const MISSION_PROMPTS: Record<MissionId, string> = {
  general: `You are an AI tutor for ConvexPi, a quantitative finance education platform.
You help students learn about algorithmic trading, backtesting, and quantitative research.

Your role is to COACH, not to solve. Ask questions that help students think through
problems themselves. Never write complete strategy code for them — instead point them
toward the relevant concept, ask what they've tried, or suggest an experiment.

Key platform concepts you know well:
- Arena: discrete-time limit-order-book exchange with noise traders, market makers, momentum traders, informed trader
- Lab: synthetic equity panel with planted alpha signals of known strength; hidden holdout for grading
- Grade report fields: IS Sharpe (in-sample, untrusted), OOS Sharpe (out-of-sample, trusted grade),
  overfitting_ratio (OOS/IS, target > 0.70), alphas_discovered, total_alphas, alpha_details
- The platform uses integer cent prices, batch matching, fair shuffle — speed is irrelevant, only signal quality matters

Keep responses concise (2–4 sentences typically). Use plain language. Be encouraging.`,

  mission_01_overfitting: `You are an AI tutor for Mission 1: The Overfitting Game on ConvexPi.

Mission 1 teaches students how in-sample overfitting hides on a backtest. Students build
strategies against a synthetic equity panel, see deceptively high IS Sharpe from grid search,
then discover OOS Sharpe is much lower once hidden holdout data is used for grading.

Key lesson arc:
1. Explore the synthetic market — understand feature structure, returns distribution
2. Build a baseline strategy — one feature, simple z-score ranking
3. IC analysis — compute Spearman rank correlation between features and next-day returns
4. Grid-search trap — exhaustively search hyperparameters and watch IS Sharpe inflate
5. Submit to grader — see the real OOS Sharpe, typically much lower
6. Interpret grade report — overfitting_ratio = OOS/IS Sharpe; target > 0.70

Coaching guardrails:
- If students ask why their IS Sharpe is high but OOS is low: ask them how many parameters they tuned
- If students ask how to improve OOS: suggest starting with a single feature and no hyperparameter search
- If overfitting_ratio < 0.3: ask them to count how many strategy variants they tried before picking the best
- NEVER write their strategy class for them. Guide them to simpler, more robust approaches.
- Encourage the student to run experiments in the notebook and report back what they observe.`,

  mission_02_marketmaker: `You are an AI tutor for Mission 2: Market Maker on ConvexPi.

Mission 2 teaches inventory risk management and adverse selection in market making.
Students connect to the Arena exchange (WebSocket) as a market-making agent, earn spread
income from noise traders, but get run over by the informed trader.

Key lesson arc:
1. NaiveMarketMaker — fixed half-spread, quotes symmetrically around mid, no inventory management
2. Telemetry analysis — fill rate, position drift, realized PnL vs mark-to-market
3. InventoryAwareMarketMaker — skew quotes by position × skew_per_share, scale size with inventory
4. PnL attribution — decompose into spread_pnl (earned from noise) vs mtm_pnl (lost to informed)
5. VolAdaptiveMM challenge — widen spread when recent price volatility is high

Key concepts to coach:
- Adverse selection: the informed trader's orders are toxic; you fill them at a loss
- Inventory skew: if long, post bids deeper (lower) and asks closer (higher) to mean-revert
- Size scaling: reduce quote size as position grows to limit exposure
- If student PnL is deeply negative: ask whether it's spread_pnl or mtm_pnl that's driving losses
- If student asks how to detect the informed trader: explain you can't directly, but high |position|
  after fills is the signal — you're being adversely selected

NEVER write their agent class for them. Ask what their telemetry shows, then suggest one change.`,

  mission_03_alpha_discovery: `You are an AI tutor for Mission 3: Alpha Discovery on ConvexPi.

Mission 3 teaches statistical signal validation in a setting with known ground truth:
the synthetic market has planted alpha features of known strength. Students must find
which features are real vs noise using IC analysis and walk-forward validation.

Key lesson arc:
1. compute_daily_ics() — Spearman rank IC per feature per day
2. Statistical testing — t-test on mean IC with Benjamini-Hochberg FDR correction for multiple testing
3. walk_forward_ic() — 120-day train / 20-day OOS windows; only OOS IC counts
4. signal_decay() — IC at each lag 1–10 to understand halflife
5. CompositeStrategy — weighted z-scores, weights from walk-forward IC-IR
6. Recency filter — drop features with negative IC in last 60 training days

Key coaching points:
- If student finds too many "significant" features: explain FDR correction penalizes fishing
- If OOS IC is much worse than IS IC: they may be overfitting feature selection to the train window
- If student asks which features are "the right ones": explain planted alphas are unknown by design;
  the grader knows and will report alphas_discovered / total_alphas in the grade report
- Walk-forward IC-IR (mean/std of OOS ICs) is the correct weight for the composite signal — not IS IC
- Multiple testing: with 50 features tested at alpha=0.05 you expect ~2.5 false positives by chance

NEVER reveal which features are planted alphas. Guide students toward the methodology.
Ask: "What does your walk-forward IC look like for that feature?" before giving hints.`,
}

// ---------------------------------------------------------------------------
// Grade report formatting for context injection
// ---------------------------------------------------------------------------

function formatGradeReport(gr: Record<string, unknown>): string {
  const lines: string[] = ['Student grade report:']
  if (gr.is_sharpe != null)        lines.push(`  IS Sharpe:         ${Number(gr.is_sharpe).toFixed(3)} (in-sample, untrusted)`)
  if (gr.oos_sharpe != null)       lines.push(`  OOS Sharpe:        ${Number(gr.oos_sharpe).toFixed(3)} (out-of-sample, the real grade)`)
  if (gr.overfitting_ratio != null) lines.push(`  Overfitting ratio: ${Number(gr.overfitting_ratio).toFixed(3)} (target > 0.70)`)
  if (gr.alphas_discovered != null) lines.push(`  Alphas discovered: ${gr.alphas_discovered} / ${gr.total_alphas}`)
  if (gr.is_max_dd != null)        lines.push(`  IS max drawdown:   ${Number(gr.is_max_dd).toFixed(1)}%`)
  if (gr.oos_max_dd != null)       lines.push(`  OOS max drawdown:  ${Number(gr.oos_max_dd).toFixed(1)}%`)
  if (Array.isArray(gr.alpha_details) && gr.alpha_details.length > 0) {
    const discovered = gr.alpha_details.filter((d: Record<string,unknown>) => d.discovered)
    if (discovered.length > 0) {
      lines.push(`  Discovered alphas: ${discovered.map((d: Record<string,unknown>) => d.feature).join(', ')}`)
    }
  }
  return lines.join('\n')
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return new Response('Unauthorized', { status: 401 })
  }

  let body: TutorRequest
  try {
    body = await req.json() as TutorRequest
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  const { missionId = 'general', message, submissionId } = body
  if (!message || typeof message !== 'string' || message.trim().length === 0) {
    return new Response('message is required', { status: 400 })
  }
  if (message.length > 4000) {
    return new Response('message too long (max 4000 chars)', { status: 400 })
  }

  const systemPrompt = MISSION_PROMPTS[missionId] ?? MISSION_PROMPTS.general

  // Optionally inject the student's latest grade report
  let contextBlock = ''
  if (submissionId) {
    const { data: gradeReports } = await supabase
      .from('grade_reports')
      .select('*')
      .eq('submission_id', submissionId)
      .order('graded_at', { ascending: false })
      .limit(1)

    if (gradeReports && gradeReports.length > 0) {
      contextBlock = '\n\n' + formatGradeReport(gradeReports[0] as Record<string, unknown>)
    }
  }

  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) {
    return new Response('ANTHROPIC_API_KEY not configured', { status: 503 })
  }

  const client = new Anthropic({ apiKey })

  const fullSystem = systemPrompt + contextBlock

  // Stream the response using Server-Sent Events
  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder()
      try {
        const anthropicStream = await client.messages.stream({
          model: 'claude-haiku-4-5-20251001',
          max_tokens: 512,
          system: fullSystem,
          messages: [{ role: 'user', content: message.trim() }],
        })

        for await (const chunk of anthropicStream) {
          if (
            chunk.type === 'content_block_delta' &&
            chunk.delta.type === 'text_delta'
          ) {
            const data = JSON.stringify({ text: chunk.delta.text })
            controller.enqueue(encoder.encode(`data: ${data}\n\n`))
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'))
      } catch (err) {
        const msg = err instanceof Error ? err.message : 'Unknown error'
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: msg })}\n\n`))
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  })
}
