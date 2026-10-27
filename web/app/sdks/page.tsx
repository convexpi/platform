import Link from 'next/link'
import type { Metadata } from 'next'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const metadata: Metadata = {
  title: 'SDKs — Python, R & Julia — ConvexPi',
  description:
    'Write quant strategies and live trading agents in Python, R, or Julia. The same hidden-holdout ' +
    'engine scores all three, so the same idea earns the same out-of-sample result in any language.',
}

const ORG = 'https://github.com/convexpi'

function Code({ children }: { children: string }) {
  return (
    <pre className="overflow-x-auto rounded-lg border bg-muted/30 p-4 text-xs leading-relaxed">
      <code>{children}</code>
    </pre>
  )
}

const PYTHON = `pip install convexpi-lab

from convexpi.lab import SyntheticMarket, Strategy, submit
import numpy as np

m = SyntheticMarket(seed=42)              # the exact market the grader uses
X = m.features("train"); px = m.prices("train")

class MyStrategy(Strategy):
    def on_day(self, day, features, prices, portfolio):
        s = np.nan_to_num(features["mom_1m"])
        g = np.abs(s).sum()
        return s / g if g > 0 else s      # target weights, gross 1

submit(MyStrategy, competition="demo-fall-2026", name="my-momentum")`

const R = `# install.packages("remotes"); remotes::install_github("convexpi/convexpi-r")
library(convexpi)

m <- synthetic_market("train")            # the exact market the grader uses

code <- 'on_day <- function(day, features, prices, portfolio) {
  s <- features[["mom_1m"]]; s[!is.finite(s)] <- 0
  g <- sum(abs(s)); if (g > 0) s / g else s   # target weights, gross 1
}'

Sys.setenv(CONVEXPI_API_KEY = "cpk_...")   # from /settings/api-keys
submit("my-momentum", code)`

const JULIA = `using Pkg; Pkg.add(url = "https://github.com/convexpi/ConvexPi.jl")
using ConvexPi

m = synthetic_market("train")             # the exact market the grader uses

code = """
function on_day(day, features, prices, portfolio)
    s = copy(features["mom_1m"]); s[.!isfinite.(s)] .= 0.0
    g = sum(abs.(s)); return g > 0 ? s ./ g : s   # target weights, gross 1
end
"""

ENV["CONVEXPI_API_KEY"] = "cpk_..."       # from /settings/api-keys
submit("my-momentum", code)`

const LANGS = [
  { name: 'Python', code: PYTHON, install: 'PyPI', installCmd: 'pip install convexpi-lab' },
  { name: 'R', code: R, install: 'GitHub', installCmd: 'remotes::install_github("convexpi/convexpi-r")' },
  { name: 'Julia', code: JULIA, install: 'Git URL', installCmd: 'Pkg.add(url="…/ConvexPi.jl")' },
]

function Check({ v }: { v: boolean | string }) {
  if (v === true) return <span className="text-emerald-600">✓</span>
  if (v === false) return <span className="text-muted-foreground/50">—</span>
  return <span className="text-muted-foreground">{v}</span>
}

const MATRIX: { row: string; py: boolean | string; r: boolean | string; jl: boolean | string }[] = [
  { row: 'Market data — synthetic_market()', py: true, r: 'via reticulate', jl: 'via PyCall' },
  { row: 'Lab strategies (on_day, graded)', py: true, r: true, jl: true },
  { row: 'Live Arena agents (WebSocket)', py: true, r: true, jl: true },
  { row: 'Simulators — finmlsim', py: true, r: 'bridge', jl: 'bridge' },
  { row: 'Install from', py: 'PyPI', r: 'GitHub (R-universe soon)', jl: 'Git URL (General soon)' },
]

export default function SdksPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">SDKs — Python, R &amp; Julia</h1>
      <p className="text-muted-foreground leading-relaxed max-w-2xl mb-6">
        Write quant strategies and live trading agents in the language you think in. The same
        hidden-holdout engine scores all three, so the same idea earns the same out-of-sample result
        in any language — you never lose points for your choice of tongue.
      </p>

      {/* The shared contract */}
      <div className="rounded-lg border bg-muted/20 p-5 mb-10">
        <p className="text-sm font-semibold mb-1">One contract, everywhere</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          A Lab strategy is a function
          <code className="bg-muted px-1 rounded mx-1">on_day(day, features, prices, portfolio)</code>
          that returns a vector of target weights (one per stock). Python wraps it in a
          <code className="bg-muted px-1 rounded mx-1">MyStrategy(Strategy)</code> class; R and Julia
          define the function directly. The grader runs it over a hidden holdout and ranks you by
          out-of-sample Sharpe.
        </p>
      </div>

      {/* Quickstarts */}
      <h2 className="text-xl font-semibold mb-4">Fit and submit — in each language</h2>
      <div className="flex flex-col gap-6 mb-12">
        {LANGS.map((l) => (
          <div key={l.name}>
            <div className="flex items-center gap-2 mb-2">
              <h3 className="text-lg font-semibold">{l.name}</h3>
              <span className="text-xs text-muted-foreground">· install from {l.install}</span>
            </div>
            <Code>{l.code}</Code>
          </div>
        ))}
      </div>

      {/* Arena */}
      <h2 className="text-xl font-semibold mb-3">Live Arena agents</h2>
      <p className="text-sm text-muted-foreground leading-relaxed mb-3 max-w-2xl">
        The same three languages trade the live limit-order book. Your agent is a function
        <code className="bg-muted px-1 rounded mx-1">on_tick(state)</code> returning orders; in Python
        it&apos;s a <code className="bg-muted px-1 rounded mx-1">RemoteAgent</code> subclass, in R and Julia
        a function passed to <code className="bg-muted px-1 rounded mx-1">run_agent()</code>.
      </p>
      <Code>{`# R
naive_mm <- function(state) {
  if (is.null(state$best_bid)) return(list())
  mid <- (state$best_bid + state$best_ask) %/% 2
  list(arena_limit("buy", mid - 5, 10), arena_limit("sell", mid + 5, 10))
}
run_agent(naive_mm, agent_id = "mm_demo", max_ticks = 200)

# Julia
naive_mm(state) = state.best_bid === nothing ? Dict[] :
    [arena_limit("buy", (state.best_bid + state.best_ask) ÷ 2 - 5, 10),
     arena_limit("sell", (state.best_bid + state.best_ask) ÷ 2 + 5, 10)]
run_agent(naive_mm; agent_id = "mm_demo", max_ticks = 200)`}</Code>

      {/* Capability matrix */}
      <h2 className="text-xl font-semibold mt-12 mb-3">What each SDK gives you</h2>
      <div className="rounded-xl border overflow-hidden mb-10">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/30 text-left">
              <th className="px-4 py-2 font-medium"> </th>
              <th className="px-4 py-2 font-medium text-center">Python</th>
              <th className="px-4 py-2 font-medium text-center">R</th>
              <th className="px-4 py-2 font-medium text-center">Julia</th>
            </tr>
          </thead>
          <tbody>
            {MATRIX.map((m) => (
              <tr key={m.row} className="border-b last:border-0">
                <td className="px-4 py-2 text-muted-foreground">{m.row}</td>
                <td className="px-4 py-2 text-center"><Check v={m.py} /></td>
                <td className="px-4 py-2 text-center"><Check v={m.r} /></td>
                <td className="px-4 py-2 text-center"><Check v={m.jl} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground max-w-2xl leading-relaxed mb-10">
        R and Julia get the market and simulators by bridging the published Python engine
        (<code className="bg-muted px-1 rounded">reticulate</code> / <code className="bg-muted px-1 rounded">PyCall</code>),
        so the data is byte-identical to what the grader uses. Your strategy and agent code runs
        <em> natively</em> in your language.
      </p>

      {/* Repos */}
      <h2 className="text-xl font-semibold mb-3">Source</h2>
      <div className="grid sm:grid-cols-2 gap-3 mb-10">
        {[
          ['convexpi-lab', 'Python — market, backtester, grader (PyPI)'],
          ['convexpi-r', 'R client — strategies + Arena agents'],
          ['ConvexPi.jl', 'Julia client — strategies + Arena agents'],
          ['arena', 'Limit-order-book simulator + Arena server'],
          ['finmlsim', 'Scholarly market / microstructure / execution simulators'],
          ['lab', 'The scoring engine behind convexpi-lab'],
        ].map(([repo, desc]) => (
          <a key={repo} href={`${ORG}/${repo}`} target="_blank" rel="noopener noreferrer"
            className="flex flex-col gap-0.5 rounded-lg border p-3 hover:bg-muted/40 transition-colors">
            <code className="text-sm font-mono">convexpi/{repo}</code>
            <span className="text-xs text-muted-foreground">{desc}</span>
          </a>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/curriculum" className={cn(buttonVariants())}>Start the missions</Link>
        <Link href="/settings/api-keys" className={cn(buttonVariants({ variant: 'outline' }))}>Get an API key</Link>
        <Link href="/agents" className={cn(buttonVariants({ variant: 'ghost' }))}>Agents guide →</Link>
      </div>
    </div>
  )
}
