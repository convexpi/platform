import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'How the exchange works — ConvexPi',
  description:
    'A plain-English walkthrough of the Arena matching engine: the limit order book, price-time priority, how a market order walks the book, discrete-tick processing, and the real-vs-replayed market data that drives it.',
}

const REPO = 'https://github.com/convexpi/arena'

function Section({ id, title, children }: { id: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="scroll-mt-20 mb-14">
      <h2 className="text-2xl font-bold mb-4 text-foreground">{title}</h2>
      <div className="space-y-4 text-muted-foreground leading-relaxed">{children}</div>
    </section>
  )
}

function Term({ children }: { children: React.ReactNode }) {
  return <span className="text-foreground font-medium">{children}</span>
}

// A small rendered order book.
function BookExample() {
  const asks = [
    { px: '100.30', sz: 4, who: 'resting sell orders' },
    { px: '100.20', sz: 2, who: '' },
    { px: '100.10', sz: 3, who: 'best ask' },
  ]
  const bids = [
    { px: '100.00', sz: 5, who: 'best bid' },
    { px: '99.90', sz: 2, who: '' },
    { px: '99.80', sz: 6, who: 'resting buy orders' },
  ]
  return (
    <div className="my-6 rounded-lg border border-border overflow-hidden font-mono text-sm">
      <div className="grid grid-cols-[1fr_1fr_2fr]">
        <div className="px-4 py-1.5 bg-secondary text-xs font-semibold tracking-wider uppercase text-muted-foreground">Price</div>
        <div className="px-4 py-1.5 bg-secondary text-xs font-semibold tracking-wider uppercase text-muted-foreground text-right">Size</div>
        <div className="px-4 py-1.5 bg-secondary text-xs font-semibold tracking-wider uppercase text-muted-foreground"></div>
        {asks.map(r => (
          <div key={r.px} className="contents">
            <div className="px-4 py-1.5 text-red-500 border-t border-border">{r.px}</div>
            <div className="px-4 py-1.5 text-right border-t border-border">{r.sz}</div>
            <div className="px-4 py-1.5 text-xs text-muted-foreground border-t border-border self-center not-italic">{r.who}</div>
          </div>
        ))}
        <div className="col-span-3 px-4 py-1.5 bg-muted/40 text-xs text-muted-foreground border-t border-border">
          ← spread: 100.10 − 100.00 = <Term>0.10</Term> →
        </div>
        {bids.map(r => (
          <div key={r.px} className="contents">
            <div className="px-4 py-1.5 text-emerald-600 border-t border-border">{r.px}</div>
            <div className="px-4 py-1.5 text-right border-t border-border">{r.sz}</div>
            <div className="px-4 py-1.5 text-xs text-muted-foreground border-t border-border self-center">{r.who}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function ExchangePage() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="mb-12">
        <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">
          Arena documentation
        </p>
        <h1 className="text-4xl font-bold mb-4 text-foreground leading-tight">
          How the exchange works
        </h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          The Arena is a real <Term>limit-order-book exchange</Term> with a matching engine, just like
          a stock or crypto exchange — only small enough to read in one sitting. This page explains
          exactly how your orders are matched, so nothing about your fills is a mystery.
        </p>
      </div>

      {/* TOC */}
      <nav className="mb-14 rounded-lg border border-border bg-secondary/30 px-5 py-4 text-sm">
        <p className="text-xs font-semibold tracking-wider uppercase text-muted-foreground mb-2">On this page</p>
        <ol className="grid sm:grid-cols-2 gap-x-6 gap-y-1 text-muted-foreground list-decimal list-inside">
          <li><a href="#book" className="hover:text-foreground underline underline-offset-2">The order book</a></li>
          <li><a href="#orders" className="hover:text-foreground underline underline-offset-2">Order types</a></li>
          <li><a href="#matching" className="hover:text-foreground underline underline-offset-2">Price-time priority</a></li>
          <li><a href="#walk" className="hover:text-foreground underline underline-offset-2">Walking the book</a></li>
          <li><a href="#ticks" className="hover:text-foreground underline underline-offset-2">Discrete ticks</a></li>
          <li><a href="#data" className="hover:text-foreground underline underline-offset-2">Where the prices come from</a></li>
          <li><a href="#see" className="hover:text-foreground underline underline-offset-2">What your agent sees</a></li>
          <li><a href="#concepts" className="hover:text-foreground underline underline-offset-2">Concepts you&apos;ll feel</a></li>
        </ol>
      </nav>

      <Section id="book" title="1. The order book">
        <p>
          Every tradable instrument has one <Term>order book</Term>: the list of all resting orders
          nobody has matched yet. Buy orders (<Term>bids</Term>) sit on one side, sell orders
          (<Term>asks</Term>, or offers) on the other, sorted by price.
        </p>
        <BookExample />
        <p>
          The highest bid (<Term>best bid</Term>) and lowest ask (<Term>best ask</Term>) are the
          touch. The gap between them is the <Term>spread</Term>. The book never &ldquo;crosses&rdquo;
          — if a buyer is ever willing to pay what a seller will accept, they trade immediately and
          the matched quantity leaves the book. Prices are stored as <Term>integer cents</Term>, not
          floats, so two orders at the same price are always exactly equal (a real exchange-engineering
          lesson hiding in plain sight).
        </p>
      </Section>

      <Section id="orders" title="2. Order types">
        <ul className="space-y-3">
          <li>
            <Term>Limit order</Term> — &ldquo;buy up to 5 at 100.00 or better.&rdquo; If part of it
            can&apos;t fill right now, the remainder <em>rests</em> in the book at your price and waits.
            This is how you <em>provide</em> liquidity.
          </li>
          <li>
            <Term>Market order</Term> — &ldquo;buy 5 right now, at whatever it costs.&rdquo; It takes
            the best available prices until filled. This is how you <em>take</em> liquidity — fast, but
            you pay the spread and any slippage.
          </li>
          <li>
            <Term>Cancel</Term> — pull one of your own resting orders out of the book.
          </li>
        </ul>
        <p>
          Whoever was already resting in the book is the <Term>maker</Term>; whoever crosses the spread
          to hit them is the <Term>taker</Term> (the aggressor). Real exchanges price these differently;
          the Arena records which side you were on so you can study the difference.
        </p>
      </Section>

      <Section id="matching" title="3. Price-time priority">
        <p>
          When an incoming order can match, the engine decides <em>who</em> it trades with using{' '}
          <Term>price-time priority</Term> — the worldwide standard:
        </p>
        <ol className="list-decimal list-inside space-y-1 pl-1">
          <li><Term>Price first.</Term> The best-priced resting order always trades first (highest bid for a seller, lowest ask for a buyer).</li>
          <li><Term>Then time.</Term> Among orders at the same price, whoever got there first is filled first — a first-in, first-out queue.</li>
        </ol>
        <p>
          That second rule is why <Term>queue position</Term> matters: post a limit order early and you
          sit at the front of your price level; arrive late and you wait behind everyone ahead of you.
        </p>
      </Section>

      <Section id="walk" title="4. Walking the book: a worked example">
        <p>
          Suppose you send a <Term>market buy for 6</Term> into the book above. The engine fills you
          against the asks, cheapest first, until your 6 is done:
        </p>
        <div className="my-6 rounded-lg border border-border overflow-hidden text-sm">
          <div className="px-4 py-2 bg-secondary font-mono text-xs text-muted-foreground">market buy 6 →</div>
          <ul className="divide-y divide-border font-mono text-sm">
            <li className="px-4 py-2">fill <Term>3 @ 100.10</Term> &nbsp;(takes all of the best ask)</li>
            <li className="px-4 py-2">fill <Term>2 @ 100.20</Term> &nbsp;(next level)</li>
            <li className="px-4 py-2">fill <Term>1 @ 100.30</Term> &nbsp;(1 of the 4 resting here; 3 remain)</li>
          </ul>
          <div className="px-4 py-2 bg-muted/40 text-sm">
            You bought 6 at an average of <Term>100.18</Term>, not 100.10. That 0.08 above the best ask
            is <Term>slippage</Term> — the cost of demanding immediacy from a finite book.
          </div>
        </div>
        <p>
          The deeper the book, the less a large order moves the price. A thin book means the same order
          walks further up the ladder — this is <Term>market impact</Term>, and feeling it directly is
          the whole point of trading on a real book instead of a single price.
        </p>
      </Section>

      <Section id="ticks" title="5. Discrete ticks and fair ordering">
        <p>
          The Arena runs in discrete <Term>ticks</Term>. Within a tick, every agent submits its orders;
          the engine then <Term>shuffles</Term> them with a seeded random order and processes them one
          by one. The shuffle is deliberate fairness: no agent systematically gets to act first because
          of where it sits in a list. Given the same seed, a whole session replays identically — so
          results are reproducible and debuggable.
        </p>
      </Section>

      <Section id="data" title="6. Where the prices come from">
        <p>The same engine can be driven by three different sources of market reality:</p>
        <div className="my-4 space-y-4">
          <div className="rounded-lg border border-border px-5 py-4">
            <p className="font-medium text-foreground mb-1">Synthetic</p>
            <p className="text-sm">
              A hidden &ldquo;fundamental value&rdquo; follows a jump-diffusion; informed and noise
              traders trade around it, manufacturing a living book. Fully controllable — great for
              scenarios like a vol shock or a liquidity pull.
            </p>
          </div>
          <div className="rounded-lg border border-border px-5 py-4">
            <p className="font-medium text-foreground mb-1">Real price replay</p>
            <p className="text-sm">
              Recorded <Term>OHLCV bars</Term> from Binance or Coinbase drive the price level, and the
              background agents build depth around those real prices. You trade against authentic price
              <em> movement</em>.
            </p>
          </div>
          <div className="rounded-lg border border-border px-5 py-4 ring-1 ring-[#C9A34E]/40">
            <p className="font-medium text-foreground mb-1">
              Real order-book replay <span className="text-[10px] align-middle font-semibold px-1.5 py-0.5 rounded-full bg-[#C9A34E]/15 text-[#b8922d]">new</span>
            </p>
            <p className="text-sm">
              Recorded <Term>L2 depth snapshots</Term> — the exchange&apos;s actual bids and asks —
              become the resting liquidity. Now a market order walks the <em>real</em> ladder and pays
              <em> real</em> slippage; a limit order queues against real depth. This is as close to a
              live exchange as a teaching simulator gets.
            </p>
          </div>
        </div>
        <p className="text-sm">
          In every mode you are a <Term>marginal participant</Term>: your own orders genuinely affect
          the book, but the bulk of the liquidity is real or realistically modelled, so you can&apos;t
          single-handedly move the market unless it&apos;s thin.
        </p>
      </Section>

      <Section id="see" title="7. What your agent sees each tick">
        <p>Before you act, the engine hands your agent a snapshot of the market:</p>
        <ul className="space-y-1.5 text-sm">
          <li>• <Term>best bid / best ask</Term> and the <Term>last traded price</Term></li>
          <li>• <Term>depth</Term> — several price levels of bids and asks, with sizes</li>
          <li>• the <Term>recent trades</Term> from the previous tick (the tape)</li>
          <li>• your own <Term>position, cash</Term>, and <Term>open orders</Term></li>
        </ul>
        <p>
          From that view your agent returns a list of orders. That&apos;s the entire contract — the
          rest is strategy.
        </p>
      </Section>

      <Section id="concepts" title="8. Concepts you'll feel, not just read">
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {[
            ['Spread', 'Crossing it costs money; earning it is a strategy (market making).'],
            ['Slippage & impact', 'Big orders into thin books move the price against you.'],
            ['Queue position', 'Post early to get filled first at your price level.'],
            ['Maker vs taker', 'Provide liquidity patiently, or pay to take it now.'],
            ['Adverse selection', 'Your resting order fills exactly when the market moves against it.'],
            ['Inventory risk', 'Holding a position exposes you to the next price move.'],
          ].map(([t, d]) => (
            <div key={t} className="rounded-lg border border-border px-4 py-3">
              <p className="font-medium text-foreground mb-0.5">{t}</p>
              <p className="text-muted-foreground">{d}</p>
            </div>
          ))}
        </div>
      </Section>

      {/* CTA */}
      <div className="mt-4 rounded-lg border border-border bg-secondary/40 px-6 py-6">
        <h2 className="text-xl font-bold text-foreground mb-2">Now go trade on it</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl">
          Reading about a matching engine only gets you so far. Write an agent, watch your orders hit
          the book, and see your fills land exactly where this page says they will.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/exchange/realistic" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">The realistic exchange (L3) →</Link>
          <Link href="/lessons/market-making" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Market-making lesson →</Link>
          <Link href="/agents" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Agent arena →</Link>
          <Link href="/compete" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Competitions →</Link>
          <a href={REPO} target="_blank" rel="noopener noreferrer"
            className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Read the engine (open source) ↗</a>
        </div>
      </div>
    </div>
  )
}
