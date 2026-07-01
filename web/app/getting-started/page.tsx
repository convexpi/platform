import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

const DEMO_SLUG = 'demo-fall-2026'
const COLAB_URL =
  'https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_01_overfitting/notebook.ipynb'
const COLAB_URL_R = COLAB_URL.replace('/notebook.ipynb', '/notebook_r.ipynb')
const COLAB_URL_JULIA = COLAB_URL.replace('/notebook.ipynb', '/notebook_julia.ipynb')

function Step({ number, title, children }: { number: number; title: string; children: React.ReactNode }) {
  return (
    <div className="flex gap-5">
      <div className="flex-none">
        <div className="w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-bold">
          {number}
        </div>
      </div>
      <div className="pb-10 flex-1">
        <h2 className="text-lg font-semibold mb-2">{title}</h2>
        {children}
      </div>
    </div>
  )
}

export default function GettingStarted() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-2xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-3">Get started in 30 minutes</h1>
        <p className="text-muted-foreground text-lg">
          One path. No choices required. Follow these five steps.
        </p>
      </div>

      <div className="mb-10 grid sm:grid-cols-2 gap-3 text-sm">
        <Link href="/classroom/join" className="rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
          <div className="font-medium text-foreground">Have a class join code?</div>
          <div className="text-muted-foreground text-xs">Join your classroom →</div>
        </Link>
        <Link href="/teach" className="rounded-lg border px-4 py-3 hover:bg-muted/30 transition-colors">
          <div className="font-medium text-foreground">Teaching a course?</div>
          <div className="text-muted-foreground text-xs">See the instructor guide →</div>
        </Link>
      </div>

      <div className="flex flex-col">
        <Step number={1} title="Understand the core idea (2 minutes)">
          <p className="text-muted-foreground mb-3">
            ConvexPi has two things:
          </p>
          <ul className="space-y-2 text-sm text-muted-foreground mb-3">
            <li>
              <span className="text-foreground font-medium">The Lab</span> — write a Python strategy,
              submit it, and the grader measures how well it generalizes to hidden data.
              Your score is the OOS Sharpe ratio: positive means real alpha, negative means noise.
            </li>
            <li>
              <span className="text-foreground font-medium">The Arena</span> — write a trading agent
              that places orders on a live limit-order book. Compete against other agents in real time.
            </li>
          </ul>
          <p className="text-sm text-muted-foreground">Start with the Lab. The Arena comes later.</p>
        </Step>

        <Step number={2} title="Run Mission 1 in Colab (15 minutes)">
          <p className="text-muted-foreground text-sm mb-4">
            Mission 1 is the overfitting game. You will build a strategy, see it score well
            in-sample, then watch it fail out-of-sample. Then you will learn why, and fix it.
          </p>
          <a
            href={COLAB_URL}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(buttonVariants({ size: 'lg' }))}
          >
            Open Mission 1 in Colab
          </a>
          <p className="mt-3 text-sm text-muted-foreground">
            Prefer another language? Same mission, scored by the same engine:{' '}
            <a href={COLAB_URL_R} target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground">R</a>
            {' · '}
            <a href={COLAB_URL_JULIA} target="_blank" rel="noopener noreferrer"
              className="underline underline-offset-4 hover:text-foreground">Julia</a>
          </p>
          <p className="mt-2 text-xs text-muted-foreground">
            No local setup needed. Colab runs in your browser.{' '}
            <code className="bg-muted px-1 rounded">pip install convexpi-lab</code> (or the{' '}
            <code className="bg-muted px-1 rounded">convexpi</code> R / Julia package) is the only install.
          </p>
        </Step>

        <Step number={3} title="Create an account">
          <p className="text-muted-foreground text-sm mb-4">
            You need an account to submit strategies and appear on the leaderboard.
          </p>
          <Link href="/signup" className={cn(buttonVariants({ variant: 'outline' }))}>
            Create a free account
          </Link>
          <p className="mt-2 text-xs text-muted-foreground">
            Already have one?{' '}
            <Link href="/login" className="underline underline-offset-4">Log in</Link>
          </p>
        </Step>

        <Step number={4} title="Submit your strategy (5 minutes)">
          <p className="text-muted-foreground text-sm mb-3">
            The demo competition is always open. Paste the strategy you built in Mission 1 into
            the editor and submit. The grader runs in under 5 minutes.
          </p>
          <Card className="mb-4 bg-muted/40">
            <CardContent className="pt-4 pb-3">
              <pre className="text-xs overflow-x-auto">{`from convexpi.lab import Strategy
import numpy as np

class MyStrategy(Strategy):
    def on_day(self, day, features, prices, portfolio):
        sig = features.get('mom_1m', np.zeros(len(prices)))
        sig = np.nan_to_num(sig)
        total = np.abs(sig).sum()
        return sig / total if total > 0 else np.zeros(len(prices))`}</pre>
            </CardContent>
          </Card>
          <Link href={`/compete/${DEMO_SLUG}/submit`} className={cn(buttonVariants())}>
            Submit to demo competition
          </Link>
        </Step>

        <Step number={5} title="See your score on the leaderboard">
          <p className="text-muted-foreground text-sm mb-4">
            After grading completes, your OOS Sharpe appears on the public leaderboard ranked
            against all other submissions. Three reference baselines are always pinned so you
            know what &quot;beating random noise&quot; looks like.
          </p>
          <Link
            href={`/compete/${DEMO_SLUG}/leaderboard`}
            className={cn(buttonVariants({ variant: 'outline' }))}
          >
            View the leaderboard
          </Link>
          <p className="mt-3 text-sm text-muted-foreground">
            Your grade report (IS Sharpe, OOS Sharpe, overfitting ratio, alpha discovery) also
            appears in your submission history on the submit page.
          </p>
        </Step>
      </div>

      <div className="mt-4 pt-8 border-t">
        <h2 className="text-base font-semibold mb-3">What next?</h2>
        <div className="grid grid-cols-2 gap-3 text-sm">
          <Link href="/compete" className="p-3 rounded-lg border hover:bg-muted/30 transition-colors">
            <div className="font-medium mb-1">Browse competitions</div>
            <div className="text-muted-foreground text-xs">All active and past competitions</div>
          </Link>
          <a
            href="https://colab.research.google.com/github/convexpi/missions/blob/main/missions/mission_02_marketmaker/notebook.ipynb"
            target="_blank"
            rel="noopener noreferrer"
            className="p-3 rounded-lg border hover:bg-muted/30 transition-colors"
          >
            <div className="font-medium mb-1">Mission 2: Market maker</div>
            <div className="text-muted-foreground text-xs">Build an inventory-aware agent</div>
          </a>
        </div>
      </div>
    </div>
  )
}
