'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState, useRef } from 'react'
import { ChevronDown } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { auditStrategy, type AuditResult } from '@/lib/auditor'
import { ForwardTrackRecord } from '@/components/forward-track-record'
import type { Submission, GradeReport } from '@/lib/types'

const MonacoEditor = dynamic(() => import('@monaco-editor/react'), { ssr: false })

const STARTER_CODE = `from convexpi.lab import Strategy
import numpy as np

class MyStrategy(Strategy):
    """
    Replace this with your strategy.
    on_day is called once per trading day.
    Return an array of weights: positive=long, negative=short.
    Weights are normalized if |sum| > 1.
    """

    def on_day(self, day, features, prices, portfolio):
        # Available features: mom_1m, mom_3m, mom_12m, val_bm,
        #   qual_roe, size_cap, vol_1m, reversal_1w, noise_1/2/3
        signal = features["mom_1m"]   # cross-sectional z-score

        n = len(signal)
        weights = np.zeros(n)
        lo = np.nanpercentile(signal, 20)
        hi = np.nanpercentile(signal, 80)
        weights[signal >= hi] =  1.0
        weights[signal <= lo] = -1.0
        total = np.abs(weights).sum()
        return weights / total if total > 0 else weights
`

const STARTER_R = `# Define on_day; return target weights (one per stock). The grader runs this natively in R.
on_day <- function(day, features, prices, portfolio) {
  sig <- features[["mom_1m"]]      # a cross-sectional z-score; features is a named list
  sig[!is.finite(sig)] <- 0
  s <- sum(abs(sig))
  if (s > 0) sig / s else sig      # long winners / short losers, gross leverage 1
}`

const STARTER_JULIA = `# Define on_day; return target weights (one per stock). The grader runs this natively in Julia.
function on_day(day, features, prices, portfolio)
    sig = copy(features["mom_1m"])   # a cross-sectional z-score; features is a Dict
    sig[.!isfinite.(sig)] .= 0.0
    s = sum(abs.(sig))
    return s > 0 ? sig ./ s : sig    # long winners / short losers, gross leverage 1
end`

const STARTERS: Record<string, string> = { python: STARTER_CODE, r: STARTER_R, julia: STARTER_JULIA }
const MONACO_LANG: Record<string, string> = { python: 'python', r: 'r', julia: 'julia' }
const LANGUAGES = [
  { id: 'python', label: 'Python' },
  { id: 'r', label: 'R' },
  { id: 'julia', label: 'Julia' },
]

interface SubmitFormProps {
  cohortId: string
  cohortSlug: string
  cohortType: string
  pastSubmissions: Submission[]
}

export function SubmitForm({ cohortId, cohortSlug, cohortType, pastSubmissions }: SubmitFormProps) {
  const [code, setCode] = useState(STARTER_CODE)
  const [language, setLanguage] = useState('python')
  const [strategyName, setStrategyName] = useState('')
  const [githubUrl, setGithubUrl] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<Submission | null>(null)
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const supabase = createClient()

  // Rerun audit 600ms after the user stops typing (Python-only — the auditor parses Python).
  useEffect(() => {
    if (language !== 'python') { setAudit(null); return }
    const id = setTimeout(() => setAudit(auditStrategy(code)), 600)
    return () => clearTimeout(id)
  }, [code, language])

  // Swap the starter when the language changes (only if the editor still holds a starter).
  function changeLanguage(lang: string) {
    setLanguage(lang)
    if (Object.values(STARTERS).includes(code)) setCode(STARTERS[lang])
  }

  // Poll for grade results after submission
  useEffect(() => {
    if (!submitted || submitted.status === 'completed' || submitted.status === 'failed') return
    const interval = setInterval(async () => {
      const { data } = await supabase
        .from('submissions')
        .select('*, grade_reports(*)')
        .eq('id', submitted.id)
        .single()
      if (data && (data.status === 'completed' || data.status === 'failed')) {
        setSubmitted(data as Submission)
        clearInterval(interval)
      }
    }, 3000)
    return () => clearInterval(interval)
  }, [submitted?.id, submitted?.status])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Please sign in'); setSubmitting(false); return }

    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohortId, strategyName, code, language, githubUrl: githubUrl.trim() || null }),
    })

    const body = await res.json()
    if (!res.ok) {
      setError(body.error ?? 'Submission failed')
      setSubmitting(false)
      return
    }

    setSubmitted(body.submission)
    setSubmitting(false)
  }

  return (
    <div className="flex flex-col gap-8">
      <OOSExplainer />
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name">Strategy name</Label>
          <Input
            id="name"
            value={strategyName}
            onChange={e => setStrategyName(e.target.value)}
            placeholder="My momentum strategy"
            required
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="github_url">GitHub repository (optional)</Label>
          <Input
            id="github_url"
            type="url"
            value={githubUrl}
            onChange={e => setGithubUrl(e.target.value)}
            placeholder="https://github.com/you/my-strategy"
          />
          <p className="text-xs text-muted-foreground">
            Link your code so others can learn from your approach. Visible on the leaderboard.
          </p>
        </div>

        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-3">
            <Label>Strategy code</Label>
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-muted-foreground">Language</span>
              <select
                value={language}
                onChange={e => changeLanguage(e.target.value)}
                className="text-sm border rounded-md px-2 py-1 bg-background"
                aria-label="Strategy language"
              >
                {LANGUAGES.map(l => <option key={l.id} value={l.id}>{l.label}</option>)}
              </select>
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {language === 'python' ? (
              <>Subclass <code className="bg-muted px-1 rounded">Strategy</code> and implement{' '}
                <code className="bg-muted px-1 rounded">on_day</code>; your class must be named{' '}
                <code className="bg-muted px-1 rounded">MyStrategy</code>.</>
            ) : (
              <>Define <code className="bg-muted px-1 rounded">on_day(day, features, prices, portfolio)</code>{' '}
                returning target weights. Graded by the same engine as Python — same idea, same OOS score.</>
            )}
          </p>
          <div className="border rounded-lg overflow-hidden">
            <MonacoEditor
              height="400px"
              language={MONACO_LANG[language]}
              value={code}
              onChange={v => setCode(v ?? '')}
              theme="vs-dark"
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                tabSize: 4,
              }}
            />
          </div>
        </div>

        {/* Audit panel */}
        {audit && audit.flags.length > 0 && (
          <div className="rounded-lg border bg-muted/40 p-4 space-y-2">
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
              Pre-submission audit
            </p>
            {audit.flags.map(flag => (
              <div key={flag.code} className="flex gap-2 text-sm">
                <span className={
                  flag.severity === 'error'   ? 'text-destructive font-medium shrink-0' :
                  flag.severity === 'warning' ? 'text-yellow-600 font-medium shrink-0' :
                                                'text-muted-foreground shrink-0'
                }>
                  {flag.severity === 'error' ? '✗' : flag.severity === 'warning' ? '⚠' : 'ℹ'}{' '}
                  {flag.message}
                </span>
                <span className="text-muted-foreground text-xs leading-snug pt-px">{flag.detail}</span>
              </div>
            ))}
          </div>
        )}

        {error && <p className="text-sm text-destructive">{error}</p>}

        {submitted ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
            Submitted! Your strategy is queued for grading. Results will appear below — refresh in ~30 seconds.
          </div>
        ) : (
          <Button type="submit" disabled={submitting} className="self-start">
            {submitting ? 'Submitting…' : 'Submit for grading'}
          </Button>
        )}
      </form>

      {pastSubmissions.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">My submissions</h2>
          <div className="flex flex-col gap-3">
            {pastSubmissions.map(s => <SubmissionRow key={s.id} submission={s} />)}
          </div>
        </div>
      )}
    </div>
  )
}

function SubmissionRow({ submission: s }: { submission: Submission }) {
  const statusColor = {
    pending: 'secondary',
    running: 'default',
    completed: 'outline',
    failed: 'destructive',
  } as const

  const report = s.grade_reports?.[0] as GradeReport | undefined

  return (
    <Card>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm">{s.strategy_name}</CardTitle>
          <div className="flex items-center gap-2">
            <span className="text-xs text-muted-foreground">
              {new Date(s.submitted_at).toLocaleDateString()}
            </span>
            <Badge variant={statusColor[s.status]}>{s.status}</Badge>
          </div>
        </div>
      </CardHeader>
      {(s.status === 'pending' || s.status === 'running') && (
        <CardContent>
          <div className="flex items-center gap-3 text-sm text-muted-foreground py-2">
            <span className="inline-block w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
            Grader is running… results appear automatically (usually under 2 minutes).
          </div>
        </CardContent>
      )}
      {report && (
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <Metric label="IS Sharpe"  value={report.is_sharpe?.toFixed(3) ?? '—'} positive={report.is_sharpe != null && report.is_sharpe > 0} />
            <Metric label="OOS Sharpe" value={report.oos_sharpe?.toFixed(3) ?? '—'} positive={report.oos_sharpe != null && report.oos_sharpe > 0} />
            <Metric label="OvFit ratio" value={report.overfitting_ratio != null ? `${(report.overfitting_ratio * 100).toFixed(0)}%` : '—'}
              positive={report.overfitting_ratio != null && report.overfitting_ratio > 0.7} />
          </div>
          {/* Alpha details breakdown */}
          {report.alpha_details && report.alpha_details.length > 0 && (
            <div className="mt-4 pt-4 border-t">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Alpha discovery ({report.alphas_discovered}/{report.total_alphas} found)
              </p>
              <div className="flex flex-col gap-1.5">
                {report.alpha_details.map((alpha) => (
                  <div key={alpha.feature} className="flex items-center gap-2">
                    <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${alpha.discovered ? 'bg-green-500' : 'bg-muted-foreground/30'}`} />
                    <span className="text-xs font-mono text-foreground w-24 shrink-0">{alpha.feature}</span>
                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${alpha.discovered ? 'bg-green-500' : 'bg-muted-foreground/30'}`}
                        style={{ width: `${Math.min(100, Math.abs(alpha.corr ?? 0) * 100)}%` }}
                      />
                    </div>
                    <span className={`text-xs font-mono w-12 text-right shrink-0 ${alpha.discovered ? 'text-green-600' : 'text-muted-foreground'}`}>
                      {alpha.corr != null ? (alpha.corr > 0 ? '+' : '') + alpha.corr.toFixed(3) : '—'}
                    </span>
                    <span className={`text-xs shrink-0 ${alpha.discovered ? 'text-green-600' : 'text-muted-foreground/60'}`}>
                      {alpha.discovered ? '✓' : '○'}
                    </span>
                  </div>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-2">
                Correlation between your signal and each planted alpha. ✓ = discovered (|corr| above threshold).
              </p>
            </div>
          )}

          {s.error_message && <p className="mt-2 text-xs text-destructive">{s.error_message}</p>}
          {s.status === 'completed' && (
            <div className="flex items-center gap-3 mt-3 pt-3 border-t">
              {report?.id && (
                <a
                  href={`/api/grade-reports/${report.id}`}
                  download
                  className="text-xs text-muted-foreground underline underline-offset-4 hover:text-foreground"
                >
                  Download grade report (JSON)
                </a>
              )}
            </div>
          )}
          {s.status === 'completed' && <ForwardTrackRecord submissionId={s.id} />}
        </CardContent>
      )}
    </Card>
  )
}

function Metric({ label, value, positive }: { label: string; value: string; positive: boolean }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`font-mono font-semibold ${positive ? 'text-green-600' : 'text-red-600'}`}>{value}</p>
    </div>
  )
}

function OOSExplainer() {
  const [open, setOpen] = useState(false)
  const contentRef = useRef<HTMLDivElement>(null)

  return (
    <div className="rounded-xl border bg-primary/5 border-primary/20 overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="w-full flex items-center justify-between px-4 py-3 text-left"
      >
        <div>
          <p className="text-xs font-semibold text-primary/80">
            How are submissions graded?
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Your strategy is evaluated on data it has never seen.
          </p>
        </div>
        <ChevronDown className={`w-4 h-4 text-muted-foreground shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div ref={contentRef} className="px-4 pb-4 space-y-3">
          <div className="h-px bg-primary/10" />

          <p className="text-sm text-muted-foreground leading-relaxed">
            Submissions are graded in two steps using the{' '}
            <strong className="text-foreground">walk-forward protocol</strong>:
          </p>

          {/* IS vs OOS diagram */}
          <div className="rounded-lg bg-background border p-4 font-mono text-xs space-y-2">
            <div className="flex items-center gap-1">
              <div className="flex-1 rounded bg-blue-100 text-blue-700 px-2 py-1.5 text-center text-[11px] font-semibold">
                Training window (visible to you)
              </div>
              <div className="w-px h-8 bg-border mx-1" />
              <div className="w-36 rounded bg-amber-100 text-amber-700 px-2 py-1.5 text-center text-[11px] font-semibold">
                Hidden OOS period
              </div>
            </div>
            <div className="flex items-center gap-1 text-[10px] text-muted-foreground">
              <div className="flex-1 text-center">IS Sharpe — computed here</div>
              <div className="w-px mx-1" />
              <div className="w-36 text-center">OOS Sharpe — your actual score</div>
            </div>
          </div>

          <div className="space-y-2">
            {[
              {
                metric: 'IS Sharpe',
                desc: 'Performance on the data you could see. High IS is easy — just overfit. This metric alone tells you nothing.',
              },
              {
                metric: 'OOS Sharpe',
                desc: 'Performance on the hidden period. This is your real score. A positive OOS Sharpe is evidence your signal generalises.',
              },
              {
                metric: 'Overfitting ratio',
                desc: 'OOS ÷ IS Sharpe. A ratio near 1.0 means your strategy didn\'t overfit. Target ≥ 0.7.',
              },
            ].map(({ metric, desc }) => (
              <div key={metric} className="flex gap-2">
                <span className="font-mono text-xs font-semibold text-foreground shrink-0 w-28 mt-px">{metric}</span>
                <span className="text-xs text-muted-foreground leading-relaxed">{desc}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
