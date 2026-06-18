import Link from 'next/link'
import type { Metadata } from 'next'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Curriculum — ConvexPi',
  description: 'A six-mission course in quantitative equity research. Each mission builds the next, culminating in a generalising alpha strategy.',
}

type Mission = {
  number: number
  title: string
  subtitle: string
  duration: string
  colab: string
  objectives: string[]
  concepts: string[]
  prereqs: string | null
}

const MISSIONS: Mission[] = [
  {
    number: 1,
    title: 'The overfitting trap',
    subtitle: 'Why in-sample performance is not evidence',
    duration: '60–90 min',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_01_overfitting/notebook.ipynb',
    objectives: [
      'Explain the difference between in-sample and out-of-sample performance',
      'Construct a cross-sectional signal from synthetic factor data',
      'Measure information coefficient (IC) and its decay',
      'Submit a strategy and interpret your OOS Sharpe score',
    ],
    concepts: ['Information coefficient', 'Rolling IC', 'OOS Sharpe ratio', 'Overfitting ratio', 'Cross-sectional ranking'],
    prereqs: 'Basic Python and NumPy. No finance background required.',
  },
  {
    number: 2,
    title: 'The limit-order book',
    subtitle: 'Market microstructure and adversarial trading',
    duration: '60–90 min',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_02_marketmaker/notebook.ipynb',
    objectives: [
      'Describe how a limit-order book operates',
      'Implement a simple market-making agent',
      'Measure adverse selection and inventory risk',
      'Compete against other agents in the Arena',
    ],
    concepts: ['Bid-ask spread', 'Adverse selection', 'Inventory risk', 'Market impact', 'PnL attribution'],
    prereqs: 'Mission 1 or familiarity with financial returns.',
  },
  {
    number: 3,
    title: 'Alpha discovery',
    subtitle: 'Systematic search under the multiple-testing burden',
    duration: '90–120 min',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_03_alpha_discovery/notebook.ipynb',
    objectives: [
      'Apply walk-forward validation to avoid look-ahead bias',
      'Control for the multiple-testing problem when scanning features',
      'Measure signal decay and distinguish structural from incidental alpha',
      'Build a composite signal from uncorrelated sub-signals',
    ],
    concepts: ['Walk-forward validation', 'Multiple testing / p-hacking', 'Signal decay', 'Sharpe ratio additivity', 'IC correlation'],
    prereqs: 'Mission 1. Basic statistics (t-tests, correlation).',
  },
  {
    number: 4,
    title: 'Strategy library',
    subtitle: 'Replication, combination, and the factor zoo',
    duration: '90–120 min',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_04_strategy_library/notebook.ipynb',
    objectives: [
      'Replicate canonical factor strategies (momentum, value, quality)',
      'Measure pairwise correlation and diversification benefit',
      'Combine strategies using equal weighting and minimum-variance',
      'Diagnose over-fitting vs. genuine factor exposure',
    ],
    concepts: ['Factor zoo', 'Portfolio diversification', 'Minimum-variance weighting', 'Factor correlation', 'OOS replication'],
    prereqs: 'Mission 3. Familiarity with the research library.',
  },
  {
    number: 5,
    title: 'Real data',
    subtitle: 'From synthetic markets to live equity panels',
    duration: '90–120 min',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_05_real_data/notebook.ipynb',
    objectives: [
      'Fetch and clean a real equity panel using yfinance',
      'Identify data quality issues (survivorship bias, stale prices)',
      'Adapt synthetic strategies to real market conditions',
      'Compare real vs. synthetic factor behaviour',
    ],
    concepts: ['Survivorship bias', 'Look-ahead bias', 'Price adjustment', 'Factor seasonality', 'Universe construction'],
    prereqs: 'Missions 1–3. Recommended: review the anomaly tracker.',
  },
  {
    number: 6,
    title: 'Advanced agents',
    subtitle: 'Reinforcement learning meets market microstructure',
    duration: '2–3 hours',
    colab: 'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_06_advanced_agents/notebook.ipynb',
    objectives: [
      'Implement a basic RL agent for order execution',
      'Measure and minimise market impact',
      'Combine a alpha signal with an execution layer',
      'Evaluate end-to-end strategy performance',
    ],
    concepts: ['Reinforcement learning', 'Execution optimisation', 'TWAP / VWAP benchmarks', 'Market impact models', 'Slippage'],
    prereqs: 'Missions 1–5. Familiarity with basic RL concepts helpful.',
  },
]

function MissionCard({ m }: { m: Mission }) {
  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      <div className="border-b bg-muted/30 px-6 py-4 flex items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <span className="text-xs font-mono font-semibold text-muted-foreground">
              MISSION {m.number}
            </span>
            <span className="text-xs text-muted-foreground">·</span>
            <span className="text-xs text-muted-foreground">{m.duration}</span>
          </div>
          <h2 className="text-lg font-semibold">{m.title}</h2>
          <p className="text-sm text-muted-foreground mt-0.5">{m.subtitle}</p>
        </div>
        <a href={m.colab} target="_blank" rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0 text-xs')}>
          Open in Colab
        </a>
      </div>

      <div className="grid sm:grid-cols-3 gap-0 divide-y sm:divide-y-0 sm:divide-x">
        <div className="px-6 py-5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
            Learning objectives
          </p>
          <ol className="space-y-2">
            {m.objectives.map((o, i) => (
              <li key={i} className="text-sm text-muted-foreground flex gap-2">
                <span className="font-mono text-xs text-muted-foreground/50 shrink-0 mt-0.5">{i + 1}.</span>
                {o}
              </li>
            ))}
          </ol>
        </div>

        <div className="px-6 py-5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
            Key concepts
          </p>
          <div className="flex flex-wrap gap-1.5">
            {m.concepts.map(c => (
              <span key={c}
                className="text-xs px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border">
                {c}
              </span>
            ))}
          </div>
        </div>

        <div className="px-6 py-5">
          <p className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
            Prerequisites
          </p>
          <p className="text-sm text-muted-foreground">{m.prereqs}</p>
        </div>
      </div>
    </div>
  )
}

export default function CurriculumPage() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-5xl">
      <div className="mb-12 max-w-2xl">
        <h1 className="text-3xl font-bold mb-3">Curriculum</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Six missions in quantitative equity research. Each builds on the last —
          from the basic overfitting problem through to real data and execution.
          All missions run in Google Colab. No local installation required.
        </p>
        <div className="flex gap-3 mt-6">
          <Link href="/getting-started" className={cn(buttonVariants())}>
            Start Mission 1
          </Link>
          <Link href="/classroom/new" className={cn(buttonVariants({ variant: 'outline' }))}>
            Run as a course
          </Link>
        </div>
      </div>

      {/* Course at a glance */}
      <div className="grid sm:grid-cols-4 gap-4 mb-12 rounded-xl border bg-muted/20 p-6">
        {[
          { label: 'Missions',        value: '6' },
          { label: 'Total time',      value: '8–12 hrs' },
          { label: 'Format',          value: 'Colab notebooks' },
          { label: 'Assessment',      value: 'OOS Sharpe ratio' },
        ].map(({ label, value }) => (
          <div key={label}>
            <p className="text-2xl font-mono font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </div>
        ))}
      </div>

      {/* Mission cards */}
      <div className="flex flex-col gap-6">
        {MISSIONS.map(m => <MissionCard key={m.number} m={m} />)}
      </div>

      {/* Instructor note */}
      <div className="mt-12 rounded-xl border bg-muted/20 p-6">
        <h2 className="text-base font-semibold mb-2">Using this as a course</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          Each mission is designed to stand alone as a 1–2 hour lab session.
          For a semester course, Missions 1–3 work well as the first half with
          Missions 4–6 as the research project phase. Classroom cohorts give
          students a private leaderboard graded on OOS Sharpe — not in-sample
          performance.
        </p>
        <div className="flex gap-3">
          <Link href="/classroom/new" className={cn(buttonVariants({ size: 'sm' }))}>
            Create a classroom cohort
          </Link>
          <Link href="/getting-started" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Instructor getting-started guide
          </Link>
        </div>
      </div>
    </div>
  )
}
