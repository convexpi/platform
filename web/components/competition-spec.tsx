import { Card, CardContent } from '@/components/ui/card'
import type { CompetitionSpec } from '@/lib/competition-spec'

// Render inline `code` spans in otherwise-plain spec text.
function Prose({ text }: { text: string }) {
  const parts = text.split(/`([^`]+)`/g)
  return (
    <>
      {parts.map((p, i) =>
        i % 2 === 1
          ? <code key={i} className="rounded bg-muted px-1 py-0.5 text-[0.85em]">{p}</code>
          : <span key={i}>{p}</span>,
      )}
    </>
  )
}

export function SpecHeader({ name, status, description, facts }: {
  name: string
  status: React.ReactNode
  description?: string | null
  facts: { label: string; value: string }[]
}) {
  return (
    <div className="mb-8">
      <div className="flex items-center gap-3 mb-2 flex-wrap">
        <h1 className="text-3xl font-bold">{name}</h1>
        {status}
      </div>
      {description && <p className="text-muted-foreground text-lg">{description}</p>}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-4 gap-px rounded-xl border border-border bg-border overflow-hidden">
        {facts.map((f) => (
          <div key={f.label} className="bg-background px-4 py-3">
            <div className="text-[11px] uppercase tracking-wide text-muted-foreground">{f.label}</div>
            <div className="text-sm font-medium text-foreground mt-0.5">{f.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export function SpecSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-10">
      <h2 className="text-lg font-semibold mb-3">{title}</h2>
      {children}
    </section>
  )
}

// The canonical, type-agnostic spec block: what you submit, how you're scored, the data,
// timeline & rules — in the same order for every competition.
export function CanonicalSpecSections({ spec, dataSummary }: { spec: CompetitionSpec; dataSummary?: string }) {
  return (
    <>
      <SpecSection title="What you submit">
        <p className="text-sm text-muted-foreground mb-3"><Prose text={spec.submit.prose} /></p>
        <pre className="rounded-md bg-muted p-3 text-xs overflow-x-auto">{spec.submit.example}</pre>
        {spec.submit.note && <p className="text-xs text-muted-foreground mt-2"><Prose text={spec.submit.note} /></p>}
        {spec.checklist.length > 0 && (
          <div className="mt-4">
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1.5">Before you submit</p>
            <ul className="space-y-1 text-sm text-muted-foreground">
              {spec.checklist.map((c, i) => (
                <li key={i} className="flex gap-2"><span className="text-emerald-600">✓</span><span><Prose text={c} /></span></li>
              ))}
            </ul>
          </div>
        )}
      </SpecSection>

      <SpecSection title="How you’re scored">
        <p className="text-sm mb-3">Ranked by <span className="font-medium text-foreground">{spec.scoring.metric}</span>.</p>
        <ul className="space-y-1.5 text-sm text-muted-foreground mb-5 list-disc list-inside">
          {spec.scoring.definition.map((d, i) => <li key={i}><Prose text={d} /></li>)}
        </ul>
        <div className="grid sm:grid-cols-2 gap-3">
          <Card className="bg-muted/20">
            <CardContent className="pt-4">
              <p className="font-semibold text-sm mb-1">{spec.scoring.publicLabel}</p>
              <p className="text-xs text-muted-foreground"><Prose text={spec.scoring.public} /></p>
            </CardContent>
          </Card>
          <Card className="border-[#C9A34E]/40 bg-[#C9A34E]/5">
            <CardContent className="pt-4">
              <p className="font-semibold text-sm mb-1">{spec.scoring.privateLabel}</p>
              <p className="text-xs text-muted-foreground"><Prose text={spec.scoring.private} /></p>
            </CardContent>
          </Card>
        </div>

        {spec.scoreGuide && (
          <div className="mt-5">
            <p className="text-sm font-medium text-foreground mb-2">How to read your score</p>
            <div className="rounded-lg border overflow-hidden">
              <table className="w-full text-sm">
                <tbody className="divide-y">
                  {spec.scoreGuide.bands.map((b) => (
                    <tr key={b.range}>
                      <td className="px-3 py-2 font-mono text-xs whitespace-nowrap align-top text-foreground w-20">{b.range}</td>
                      <td className="px-3 py-2 text-muted-foreground"><Prose text={b.meaning} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="text-xs text-muted-foreground mt-2"><Prose text={spec.scoreGuide.note} /></p>
          </div>
        )}
      </SpecSection>

      <SpecSection title="The data">
        <p className="text-sm text-muted-foreground mb-3"><Prose text={dataSummary ?? spec.data.summary} /></p>
        {spec.data.fields && (
          <dl className="space-y-1.5 mb-3">
            {spec.data.fields.map((f) => (
              <div key={f.name} className="text-sm">
                <code className="rounded bg-muted px-1 py-0.5 text-xs">{f.name}</code>{' '}
                <span className="text-muted-foreground"><Prose text={f.desc} /></span>
              </div>
            ))}
          </dl>
        )}
        {spec.data.howToLoad && (
          <p className="text-sm text-muted-foreground rounded-lg border bg-secondary/30 px-4 py-3">
            <span className="font-medium text-foreground">Getting the data you fit on: </span>
            <Prose text={spec.data.howToLoad} />
          </p>
        )}
      </SpecSection>

      <SpecSection title="Timeline &amp; rules">
        <div className="grid sm:grid-cols-2 gap-6">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Timeline</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
              {spec.timeline.map((t, i) => <li key={i}><Prose text={t} /></li>)}
            </ul>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2">Rules</p>
            <ul className="space-y-1.5 text-sm text-muted-foreground list-disc list-inside">
              {spec.rules.map((t, i) => <li key={i}><Prose text={t} /></li>)}
            </ul>
          </div>
        </div>
      </SpecSection>
    </>
  )
}
