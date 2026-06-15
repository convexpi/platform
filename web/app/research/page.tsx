import Link from 'next/link'
import type { Metadata } from 'next'
import { FACTORS, CATEGORY_LABELS, OOS_SURVIVAL_LABELS, type Factor } from '@/lib/research-data'

export const metadata: Metadata = {
  title: 'Research Library — ConvexPi',
  description: 'A guide to major equity risk factors: economic intuition, key literature, and out-of-sample survival evidence.',
}

function FactorCard({ factor }: { factor: Factor }) {
  const survival = OOS_SURVIVAL_LABELS[factor.oasSurvival]
  const turnoverLabel = { low: 'Low', medium: 'Medium', high: 'High', 'very-high': 'Very high' }[factor.characteristics.turnover]
  const capacityLabel = { large: 'Large-cap', medium: 'Mid-cap', small: 'Small-cap' }[factor.characteristics.capacity]

  return (
    <Link href={`/research/${factor.slug}`}
      className="group block rounded-xl border bg-card hover:border-primary/40 hover:shadow-sm transition-all p-5">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="font-semibold text-foreground group-hover:text-primary transition-colors">
            {factor.name}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">{CATEGORY_LABELS[factor.category]}</p>
        </div>
        <span className={`shrink-0 text-xs font-medium px-2 py-0.5 rounded-full border ${survival.color}`}>
          {survival.label.replace(' OOS survival', '').replace(' OOS evidence', '')}
        </span>
      </div>

      <p className="text-sm text-muted-foreground leading-relaxed mb-4 line-clamp-2">
        {factor.tagline}
      </p>

      <div className="flex flex-wrap gap-3 text-xs text-muted-foreground border-t pt-3">
        <span>
          <span className="text-foreground font-medium">IS Sharpe</span>{' '}
          {factor.characteristics.typicalISSharpe}
        </span>
        <span>
          <span className="text-foreground font-medium">OOS Sharpe</span>{' '}
          {factor.characteristics.typicalOOSSharpe}
        </span>
        <span>
          <span className="text-foreground font-medium">Turnover</span>{' '}
          {turnoverLabel}
        </span>
        <span>
          <span className="text-foreground font-medium">Capacity</span>{' '}
          {capacityLabel}
        </span>
      </div>
    </Link>
  )
}

export default function ResearchPage() {
  const categories = [...new Set(FACTORS.map(f => f.category))]

  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">

      {/* Header */}
      <div className="mb-12 max-w-2xl">
        <p className="text-xs font-medium tracking-widest text-primary uppercase mb-3">Research Library</p>
        <h1 className="text-4xl font-serif mb-4">Equity Factor Research</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          A guided tour through the empirical asset pricing literature — from classic factors
          to the replication crisis. Each entry covers economic intuition, key papers, and
          honest out-of-sample survival evidence.
        </p>
      </div>

      {/* OOS survival key */}
      <div className="flex flex-wrap gap-2 mb-10">
        {Object.entries(OOS_SURVIVAL_LABELS).map(([key, { label, color }]) => (
          <span key={key} className={`text-xs font-medium px-2.5 py-1 rounded-full border ${color}`}>
            {label}
          </span>
        ))}
      </div>

      {/* Factor grid by category */}
      {categories.map(cat => {
        const catFactors = FACTORS.filter(f => f.category === cat)
        return (
          <section key={cat} className="mb-12">
            <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-4">
              {CATEGORY_LABELS[cat]}
            </h2>
            <div className="grid md:grid-cols-2 gap-4">
              {catFactors.map(f => <FactorCard key={f.slug} factor={f} />)}
            </div>
          </section>
        )
      })}

      {/* Reading list intro */}
      <section className="border-t pt-10 mt-4">
        <h2 className="text-lg font-semibold mb-2">Where to go next</h2>
        <div className="grid md:grid-cols-3 gap-4 text-sm">
          <div className="p-4 rounded-lg bg-muted/40 border">
            <p className="font-medium mb-1">Anomaly Graveyard</p>
            <p className="text-muted-foreground text-xs mb-3">
              Pre- and post-publication Sharpe ratios for canonical anomalies, with live sparklines.
            </p>
            <Link href="/anomalies" className="text-xs text-primary underline underline-offset-4">
              Browse anomalies →
            </Link>
          </div>
          <div className="p-4 rounded-lg bg-muted/40 border">
            <p className="font-medium mb-1">Run Mission 1</p>
            <p className="text-muted-foreground text-xs mb-3">
              Build a momentum strategy, watch it overfit in-sample, then fix it out-of-sample.
            </p>
            <Link href="/getting-started" className="text-xs text-primary underline underline-offset-4">
              Get started →
            </Link>
          </div>
          <div className="p-4 rounded-lg bg-muted/40 border">
            <p className="font-medium mb-1">Compete</p>
            <p className="text-muted-foreground text-xs mb-3">
              Submit a strategy and measure its OOS Sharpe against a held-out market.
            </p>
            <Link href="/compete" className="text-xs text-primary underline underline-offset-4">
              View competitions →
            </Link>
          </div>
        </div>
      </section>
    </div>
  )
}
