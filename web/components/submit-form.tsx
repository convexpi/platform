'use client'

import dynamic from 'next/dynamic'
import { useEffect, useState } from 'react'
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

interface SubmitFormProps {
  cohortId: string
  cohortSlug: string
  cohortType: string
  pastSubmissions: Submission[]
}

export function SubmitForm({ cohortId, cohortSlug, cohortType, pastSubmissions }: SubmitFormProps) {
  const [code, setCode] = useState(STARTER_CODE)
  const [strategyName, setStrategyName] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitted, setSubmitted] = useState<Submission | null>(null)
  const [audit, setAudit] = useState<AuditResult | null>(null)
  const supabase = createClient()

  // Rerun audit 600ms after the user stops typing
  useEffect(() => {
    const id = setTimeout(() => setAudit(auditStrategy(code)), 600)
    return () => clearTimeout(id)
  }, [code])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    setError(null)

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setError('Please sign in'); setSubmitting(false); return }

    const res = await fetch('/api/submissions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cohortId, strategyName, code }),
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
          <Label>Strategy code</Label>
          <p className="text-xs text-muted-foreground">
            Subclass <code className="bg-muted px-1 rounded">Strategy</code> and implement{' '}
            <code className="bg-muted px-1 rounded">on_day</code>. Your class must be named{' '}
            <code className="bg-muted px-1 rounded">MyStrategy</code>.
          </p>
          <div className="border rounded-lg overflow-hidden">
            <MonacoEditor
              height="400px"
              language="python"
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
      {report && (
        <CardContent>
          <div className="grid grid-cols-3 gap-4 text-sm">
            <Metric label="IS Sharpe"  value={report.is_sharpe?.toFixed(3) ?? '—'} positive={report.is_sharpe != null && report.is_sharpe > 0} />
            <Metric label="OOS Sharpe" value={report.oos_sharpe?.toFixed(3) ?? '—'} positive={report.oos_sharpe != null && report.oos_sharpe > 0} />
            <Metric label="OvFit ratio" value={report.overfitting_ratio != null ? `${(report.overfitting_ratio * 100).toFixed(0)}%` : '—'}
              positive={report.overfitting_ratio != null && report.overfitting_ratio > 0.7} />
          </div>
          {report.alphas_discovered != null && (
            <p className="mt-2 text-xs text-muted-foreground">
              Alphas discovered: {report.alphas_discovered}/{report.total_alphas}
            </p>
          )}
          {s.error_message && <p className="mt-2 text-xs text-destructive">{s.error_message}</p>}
          {s.status === 'completed' && (
            <div className="flex items-center gap-3 mt-2">
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
