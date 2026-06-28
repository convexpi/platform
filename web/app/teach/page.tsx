import Link from 'next/link'
import type { Metadata } from 'next'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'Teach with ConvexPi',
  description: 'Run a simulation-first quantitative finance course: a private classroom, an auto-graded curriculum, and a live instructor dashboard — free and open-source.',
}

function Step({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="flex-none">
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">{n}</div>
      </div>
      <div className="pb-9 flex-1">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function TeachPage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="mb-10">
        <p className="text-xs font-semibold tracking-widest text-primary uppercase mb-3">For instructors</p>
        <h1 className="text-3xl font-bold mb-3">Teach with ConvexPi</h1>
        <p className="text-muted-foreground text-lg leading-relaxed">
          Run a simulation-first quantitative-finance course with <strong className="text-foreground font-medium">zero setup and zero manual grading</strong>.
          Students work in Colab, submit strategies, and are scored automatically on a hidden
          out-of-sample market — so there are no answer keys to leak and no curve-fitting to reward.
          Everything is free and open-source.
        </p>
      </div>

      <div className="flex flex-col">
        <Step n={1} title="Create your classroom">
          <p className="text-muted-foreground text-sm mb-4">
            A classroom is a private cohort with its own roster, join code, and leaderboard. Name it for
            your course (e.g. “FINA 6090 — Fall 2026”) and set the dates.
          </p>
          <Link href="/classroom/new" className={cn(buttonVariants())}>Create a classroom</Link>
        </Step>

        <Step n={2} title="Share the join code">
          <p className="text-muted-foreground text-sm">
            Each classroom gets a 6-character join code. Share it (or the join link) with your students;
            they create a free account and enroll themselves at{' '}
            <Link href="/classroom/join" className="underline underline-offset-4">/classroom/join</Link>.
            Private classrooms are visible only to enrolled members.
          </p>
        </Step>

        <Step n={3} title="Assign the curriculum">
          <p className="text-muted-foreground text-sm mb-3">
            The <Link href="/curriculum" className="underline underline-offset-4">9-mission curriculum</Link> is
            your ready-made syllabus — from the overfitting trap through alpha discovery, real data, and
            market microstructure. Missions 1–3 work well as a first half; 4–6 as a research-project phase;
            7–9 are advanced electives. Each runs in Colab with no install.
          </p>
          <p className="text-muted-foreground text-sm">
            For reading, point students at the <Link href="/surveys" className="underline underline-offset-4">topic surveys</Link>{' '}
            (momentum, value, quality, low-vol, the factor zoo) and the{' '}
            <Link href="/papers" className="underline underline-offset-4">paper wikis</Link> they synthesize.
          </p>
        </Step>

        <Step n={4} title="Students submit — graded automatically">
          <p className="text-muted-foreground text-sm">
            Students build a strategy (each competition has a{' '}
            <Link href="/compete" className="underline underline-offset-4">Colab starter</Link>) and submit code.
            The grader runs it on a <strong className="text-foreground font-medium">hidden out-of-sample market</strong>{' '}
            and returns an OOS Sharpe, overfitting ratio, and alpha-discovery report — no manual grading, and
            in-sample curve-fitting earns nothing. Run the class against your classroom cohort or the always-open
            public leaderboard.
          </p>
        </Step>

        <Step n={5} title="Monitor on your dashboard">
          <p className="text-muted-foreground text-sm mb-4">
            Your instructor dashboard shows the roster, each student’s submissions and grades, the class’s
            average overfitting ratio, and who hasn’t submitted yet — a live view of who’s actually learning
            the out-of-sample lesson.
          </p>
          <Link href="/dashboard" className={cn(buttonVariants({ variant: 'outline' }))}>Go to your dashboard</Link>
        </Step>
      </div>

      <div className="mt-4 pt-8 border-t">
        <h2 className="text-base font-semibold mb-2">Why it works for a course</h2>
        <ul className="text-sm text-muted-foreground space-y-1.5 list-disc ml-5">
          <li><strong className="text-foreground font-medium">No setup:</strong> everything runs in Colab; the only install is <code className="bg-muted px-1 rounded text-xs">pip install convexpi-lab</code>.</li>
          <li><strong className="text-foreground font-medium">Cheat-resistant:</strong> grading is on a hidden holdout with a private seed — no answer key, and overfitting is visible, not rewarded.</li>
          <li><strong className="text-foreground font-medium">Open-source:</strong> the curriculum, grader, and replications are all public; adapt them freely.</li>
        </ul>
        <div className="mt-6 flex gap-3">
          <Link href="/classroom/new" className={cn(buttonVariants())}>Create a classroom</Link>
          <Link href="/curriculum" className={cn(buttonVariants({ variant: 'outline' }))}>See the curriculum</Link>
        </div>
      </div>
    </div>
  )
}
