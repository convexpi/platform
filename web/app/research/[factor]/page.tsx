import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { FACTORS, FACTOR_BY_SLUG, CATEGORY_LABELS, OOS_SURVIVAL_LABELS, type Paper } from '@/lib/research-data'
import { CopyBibTeX } from '@/components/copy-bibtex'

export async function generateStaticParams() {
  return FACTORS.map(f => ({ factor: f.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ factor: string }> }): Promise<Metadata> {
  const { factor: slug } = await params
  const f = FACTOR_BY_SLUG[slug]
  if (!f) return {}
  return {
    title: `${f.name} — ConvexPi Research`,
    description: f.tagline,
  }
}

function PaperCard({ paper }: { paper: Paper }) {
  return (
    <div className="py-3 border-b last:border-b-0">
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {paper.url ? (
            <a href={paper.url} target="_blank" rel="noopener noreferrer"
              className="text-sm font-medium text-foreground hover:text-primary underline underline-offset-4 transition-colors">
              {paper.title}
            </a>
          ) : (
            <p className="text-sm font-medium text-foreground">{paper.title}</p>
          )}
          <p className="text-xs text-muted-foreground mt-0.5">{paper.authors}</p>
        </div>
        <div className="shrink-0 flex flex-col items-end gap-1">
          <p className="text-xs font-mono text-muted-foreground">{paper.year}</p>
          <p className="text-xs text-muted-foreground italic">{paper.journal}</p>
          <CopyBibTeX
            title={paper.title}
            authors={paper.authors}
            year={paper.year}
            journal={paper.journal}
            url={paper.url}
          />
        </div>
      </div>
    </div>
  )
}

function TurnoverBadge({ level }: { level: string }) {
  const styles: Record<string, string> = {
    low:       'bg-green-50 text-green-700 border-green-200',
    medium:    'bg-amber-50 text-amber-700 border-amber-200',
    high:      'bg-orange-50 text-orange-700 border-orange-200',
    'very-high': 'bg-red-50 text-red-700 border-red-200',
  }
  const labels: Record<string, string> = { low: 'Low', medium: 'Medium', high: 'High', 'very-high': 'Very high' }
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded border ${styles[level] ?? ''}`}>
      {labels[level] ?? level} turnover
    </span>
  )
}

export default async function FactorPage({ params }: { params: Promise<{ factor: string }> }) {
  const { factor: slug } = await params
  const factor = FACTOR_BY_SLUG[slug]
  if (!factor) notFound()

  const survival = OOS_SURVIVAL_LABELS[factor.oasSurvival]
  const otherFactors = FACTORS.filter(f => f.slug !== slug).slice(0, 4)

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">

      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-muted-foreground mb-8">
        <Link href="/research" className="hover:text-foreground transition-colors">Research Library</Link>
        <span>/</span>
        <span className="text-foreground">{factor.name}</span>
      </div>

      {/* Header */}
      <div className="mb-10">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <span className="text-xs font-medium tracking-widest text-muted-foreground uppercase">
            {CATEGORY_LABELS[factor.category]}
          </span>
          <span className="text-muted-foreground/40">·</span>
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${survival.color}`}>
            {survival.label}
          </span>
        </div>
        <h1 className="text-4xl font-serif mb-3">{factor.name}</h1>
        <p className="text-xl text-muted-foreground leading-relaxed">{factor.tagline}</p>

        {/* Also known as */}
        {factor.alsoKnownAs.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {factor.alsoKnownAs.map(alias => (
              <span key={alias}
                className="text-xs bg-muted text-muted-foreground px-2 py-0.5 rounded-full border border-border">
                {alias}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Characteristics bar */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-5 rounded-xl bg-muted/30 border mb-10">
        {[
          { label: 'Typical IS Sharpe', value: factor.characteristics.typicalISSharpe },
          { label: 'Typical OOS Sharpe', value: factor.characteristics.typicalOOSSharpe },
          { label: 'Capacity', value: { large: 'Large-cap', medium: 'Mid-cap', small: 'Small-cap' }[factor.characteristics.capacity] },
          {
            label: 'Signal decay',
            value: factor.characteristics.decayHalfLifeMonths
              ? `~${factor.characteristics.decayHalfLifeMonths}m half-life`
              : 'Persistent',
          },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-xs text-muted-foreground mb-1">{label}</p>
            <p className="font-mono font-semibold text-sm text-foreground">{value}</p>
          </div>
        ))}
        <div className="col-span-2 md:col-span-4 flex items-center gap-2 pt-3 border-t">
          <TurnoverBadge level={factor.characteristics.turnover} />
          {factor.characteristics.longOnly && (
            <span className="text-xs font-medium px-2 py-0.5 rounded border bg-blue-50 text-blue-700 border-blue-200">
              Long-only viable
            </span>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_280px] gap-10">
        <div className="space-y-10">

          {/* Overview */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Overview</h2>
            <p className="text-muted-foreground leading-relaxed">{factor.overview}</p>
          </section>

          {/* Economic Intuition */}
          <section>
            <h2 className="text-lg font-semibold mb-3">Economic Intuition</h2>
            <p className="text-muted-foreground leading-relaxed">{factor.economicIntuition}</p>
          </section>

          {/* OOS / Overfitting */}
          <section>
            <div className="flex items-center gap-2 mb-3">
              <h2 className="text-lg font-semibold">Out-of-Sample Evidence</h2>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${survival.color}`}>
                {survival.label}
              </span>
            </div>
            <div className="p-4 rounded-lg border-l-2 border-primary bg-primary/5">
              <p className="text-sm text-foreground/80 leading-relaxed">{factor.overfittingNote}</p>
            </div>
          </section>

          {/* Key Papers */}
          <section>
            <h2 className="text-lg font-semibold mb-1">Key Papers</h2>
            <p className="text-xs text-muted-foreground mb-4">
              Foundational research on this factor — start here.
            </p>
            <div className="rounded-xl border divide-y-0">
              {factor.keyPapers.map((p, i) => <PaperCard key={i} paper={p} />)}
            </div>
          </section>

          {/* Further Reading */}
          {factor.furtherReading.length > 0 && (
            <section>
              <h2 className="text-lg font-semibold mb-1">Further Reading</h2>
              <div className="rounded-xl border">
                {factor.furtherReading.map((p, i) => <PaperCard key={i} paper={p} />)}
              </div>
            </section>
          )}
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">

          {/* On this platform */}
          {(factor.relatedMissions.length > 0 || factor.relatedAnomalies.length > 0) && (
            <div className="rounded-xl border p-4">
              <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
                On this platform
              </p>
              {factor.relatedMissions.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-foreground mb-2">Missions</p>
                  <div className="space-y-1">
                    {factor.relatedMissions.map(m => (
                      <Link key={m.href + m.label} href={m.href}
                        className="block text-xs text-primary hover:underline underline-offset-4">
                        {m.label}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
              {factor.relatedAnomalies.length > 0 && (
                <div>
                  <p className="text-xs font-medium text-foreground mb-2">Related anomalies</p>
                  <div className="flex flex-wrap gap-1.5">
                    {factor.relatedAnomalies.map(a => (
                      <Link key={a} href="/anomalies"
                        className="text-xs bg-muted hover:bg-muted/70 px-2 py-0.5 rounded border border-border transition-colors">
                        {a}
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Navigation */}
          <div className="rounded-xl border p-4">
            <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
              More factors
            </p>
            <div className="space-y-2">
              {otherFactors.map(f => {
                const s = OOS_SURVIVAL_LABELS[f.oasSurvival]
                return (
                  <Link key={f.slug} href={`/research/${f.slug}`}
                    className="flex items-center justify-between gap-2 py-1.5 group">
                    <span className="text-sm text-muted-foreground group-hover:text-foreground transition-colors">
                      {f.name}
                    </span>
                    <span className={`shrink-0 text-xs font-medium px-1.5 py-0.5 rounded-full border ${s.color}`}>
                      {f.oasSurvival}
                    </span>
                  </Link>
                )
              })}
              <Link href="/research"
                className="block text-xs text-primary hover:underline underline-offset-4 pt-2 border-t">
                View all factors →
              </Link>
            </div>
          </div>

        </aside>
      </div>
    </div>
  )
}
