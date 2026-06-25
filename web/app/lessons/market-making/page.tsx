import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Market making — ConvexPi',
  description:
    'Build a market-making agent for the Arena: quote both sides, earn the spread and the maker rebate, and manage inventory risk and adverse selection on a real recorded order book.',
}

const AGENT_URL = 'https://github.com/convexpi/arena/blob/main/examples/market_maker.py'
const BOOK_WSS = 'wss://arena-production-e3f1.up.railway.app'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 mb-12">
      <h2 className="text-2xl font-bold mb-4 text-foreground">{title}</h2>
      <div className="space-y-4 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  )
}

function Term({ children }: { children: React.ReactNode }) {
  return <span className="text-foreground font-medium">{children}</span>
}

function Code({ children }: { children: string }) {
  return (
    <pre className="rounded-lg bg-muted p-4 text-xs sm:text-sm overflow-x-auto leading-relaxed">
      <code>{children}</code>
    </pre>
  )
}

export default function MarketMakingLesson() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="mb-12">
        <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">
          Arena lesson
        </p>
        <h1 className="text-4xl font-bold mb-4 text-foreground leading-tight">Market making</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          Most strategies bet on <em>direction</em>. A market maker doesn&apos;t — it quotes both sides
          of the book and earns the <Term>spread</Term> as others trade against it. It&apos;s the
          perfect first agent for the Arena: you&apos;ll feel spread capture, the maker rebate, and the
          two risks that make it hard — inventory and adverse selection — all measurable on a{' '}
          <Link href="/compete/arena-book" className="underline underline-offset-4 hover:text-foreground">
            real recorded order book</Link>.
        </p>
      </div>

      <Section id="idea" title="The idea">
        <p>
          Post a <Term>bid</Term> a little below the mid and an <Term>ask</Term> a little above it. If
          a seller hits your bid and, later, a buyer lifts your ask, you&apos;ve bought low and sold
          high — pocketing the spread without ever predicting the price. Do this thousands of times and
          the edge compounds. On exchanges with a <Term>maker rebate</Term> (you get paid for providing
          liquidity), you earn that on top. The Arena&apos;s real-book season uses a maker rebate and a
          taker fee, so providing liquidity is rewarded and crossing the spread costs you — exactly
          like a real venue.
        </p>
      </Section>

      <Section id="risks" title="Why it's hard: two risks">
        <ul className="space-y-3">
          <li>
            <Term>Inventory risk.</Term> Every fill leaves you holding a position. If your bid keeps
            getting hit, you accumulate a long inventory right as the price may be falling — your spread
            profits get swamped by a directional loss. You must lean against inventory.
          </li>
          <li>
            <Term>Adverse selection.</Term> Your quote gets filled precisely when someone knows
            something you don&apos;t — the market is about to move <em>through</em> your price. Makers
            are systematically picked off by informed flow; the spread you earn has to compensate for it.
          </li>
          <li>
            <Term>Queue position.</Term> At a given price, fills go first-in-first-out. Re-quoting every
            tick is simple but sends you to the back of the line; quoting patiently keeps your place.
            (See <Link href="/exchange" className="underline underline-offset-4 hover:text-foreground">how matching works</Link>.)
          </li>
        </ul>
      </Section>

      <Section id="agent" title="The starter agent">
        <p>
          Here&apos;s the core of a working market maker (full file{' '}
          <a href={AGENT_URL} target="_blank" rel="noopener noreferrer"
            className="underline underline-offset-4 hover:text-foreground">on GitHub</a>). It cancels
          its old quotes, recomputes a bid and ask around the mid, and <Term>skews</Term> both quotes
          against its current inventory so fills naturally pull it back toward flat:
        </p>
        <Code>{`from convexpi.arena.client import RemoteAgent, MarketState

class MarketMaker(RemoteAgent):
    half_spread_bps = 8.0   # how far each quote sits from the mid
    size = 5                # quote size per side
    max_pos = 40            # hard inventory cap
    max_skew_bps = 8.0      # max quote shift at full inventory

    def on_tick(self, state: MarketState) -> list[dict]:
        if state.mid is None:
            return []
        orders = [self.cancel(o["order_id"]) for o in state.my_open_orders]

        mid  = state.mid
        half = mid * self.half_spread_bps / 1e4
        # lean against inventory: long -> shift quotes down (sell more, buy less)
        skew = (state.position / self.max_pos) * (mid * self.max_skew_bps / 1e4)

        if state.position < self.max_pos:
            orders.append(self.limit("buy",  round(mid - half - skew), self.size))
        if state.position > -self.max_pos:
            orders.append(self.limit("sell", round(mid + half - skew), self.size))
        return orders`}</Code>
        <p>
          That&apos;s the whole strategy. When flat, the quotes are symmetric around the mid; as
          inventory grows, the skew shifts both quotes to unload it, and the position cap stops either
          side from running away.
        </p>
      </Section>

      <Section id="run" title="Run it">
        <p>Install the SDK, then point the agent at the real-order-book competition:</p>
        <Code>{`pip install convexpi-arena

python examples/market_maker.py my-handle \\
    --server ${BOOK_WSS}`}</Code>
        <p>
          Watch your fills print, and your PnL and <Term>maker %</Term> climb the board on{' '}
          <Link href="/compete/arena-book" className="underline underline-offset-4 hover:text-foreground">
            /compete/arena-book</Link> — where you can also see the live depth ladder you&apos;re
          quoting into.
        </p>
      </Section>

      <Section id="improve" title="Now make it better">
        <p>The starter is deliberately naive. Ideas that move the needle:</p>
        <ul className="space-y-2">
          <li>• <Term>Keep queue priority:</Term> only re-quote when the mid moves enough to matter, instead of cancelling every tick.</li>
          <li>• <Term>Widen in fast markets:</Term> scale your half-spread with recent volatility so you&apos;re not picked off during moves.</li>
          <li>• <Term>Smarter skew:</Term> make the inventory penalty non-linear, or quote different sizes on each side.</li>
          <li>• <Term>Respect the fees:</Term> your spread must clear the round-trip cost after the maker rebate — quote too tight and you pay to trade.</li>
          <li>• <Term>Read the tape:</Term> back off when recent trades show one-sided, informed flow.</li>
        </ul>
      </Section>

      <div className="mt-4 rounded-lg border border-border bg-secondary/40 px-6 py-6">
        <h2 className="text-xl font-bold text-foreground mb-2">Go quote the book</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl">
          Clone the starter, run it against the live book, and tune it. The spread is there to be
          earned — if your quotes are smart enough to survive the inventory and the informed flow.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/compete/arena-book" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Real-book competition →</Link>
          <Link href="/exchange" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">How matching works →</Link>
          <a href={AGENT_URL} target="_blank" rel="noopener noreferrer"
            className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Starter agent (GitHub) ↗</a>
        </div>
      </div>
    </div>
  )
}
