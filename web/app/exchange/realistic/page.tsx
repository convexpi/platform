import Link from 'next/link'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'The realistic exchange (L3) — ConvexPi',
  description:
    'How a real exchange behaves: order-by-order (L3) matching with FIFO queue position, latency, and the cancel race that decides adverse selection — and how it differs from the L2 snapshot model.',
}

const REPO = 'https://github.com/convexpi/arena/blob/main/src/convexpi/arena/mbo.py'

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

export default function RealisticExchange() {
  return (
    <div className="container mx-auto px-4 py-16 max-w-3xl">
      <div className="mb-12">
        <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">
          Arena documentation · advanced
        </p>
        <h1 className="text-4xl font-bold mb-4 text-foreground leading-tight">The realistic exchange (L3)</h1>
        <p className="text-lg text-muted-foreground leading-relaxed">
          The <Link href="/exchange" className="underline underline-offset-4 hover:text-foreground">main exchange explainer</Link>{' '}
          covers a teaching-grade matching engine driven by <Term>L2</Term> data — aggregated size per
          price level, snapshotted once a second. That&apos;s perfect for learning the rules, but it
          can&apos;t represent the three things that actually make market making hard: <Term>queue
          position</Term>, <Term>latency</Term>, and the <Term>cancel race</Term>. Those need{' '}
          <Term>L3</Term> — the order-by-order feed.
        </p>
      </div>

      <Section id="levels" title="L1 → L2 → L3">
        <ul className="space-y-2">
          <li><Term>L1</Term> — just the best bid and ask. The top of the book.</li>
          <li><Term>L2</Term> — total size at each price level (what most &ldquo;depth&rdquo; charts show). Our snapshot Arena uses this.</li>
          <li><Term>L3 / market-by-order</Term> — <em>every individual order</em>: each add, change, cancel, and execution, with its own id and microsecond timestamp. This is the real message stream a matching engine processes.</li>
        </ul>
        <p>
          Only L3 tells you <em>how many orders, and whose, are ahead of yours</em> at a price — which
          is the whole game for a passive trader.
        </p>
      </Section>

      <Section id="queue" title="Queue position — the thing L2 can't show">
        <p>
          When you post a limit order, you join the <Term>back of a FIFO queue</Term> at your price.
          You only get filled once everything ahead of you is gone — either cancelled or traded
          through. With L2 snapshots, the &ldquo;5 BTC at the bid&rdquo; is an anonymous blob that
          gets re-drawn each second; you have no idea if you&apos;re first in line or last.
        </p>
        <p>
          With L3 you know exactly: when you join behind, say, <Term>0.42 BTC</Term>, you can watch
          that queue <em>drain order by order</em> as the orders ahead cancel and trade — and only
          when it hits zero does the next incoming market order start filling <em>you</em>. Good queue
          position is often worth more than a slightly better price.
        </p>
      </Section>

      <Section id="latency" title="Latency and the cancel race">
        <p>There are two clocks a real trader fights:</p>
        <ul className="space-y-2">
          <li><Term>Market-data latency</Term> — the book you see is already a little stale.</li>
          <li><Term>Order-entry latency</Term> — your order (or cancel) takes time to reach the matching engine.</li>
        </ul>
        <p>
          Put them together and you get the defining moment of market making: you&apos;re resting a bid,
          the tape suddenly looks toxic (informed selling), and you fire a cancel. Does your cancel reach
          the engine <em>before</em> the incoming market sell trades against you? If yes, you dodged it.
          If the cancel is even tens of milliseconds too slow, you&apos;re <Term>adversely selected</Term> —
          filled right as the price moves against you. The L2 snapshot model has no time and no queue, so
          this race simply doesn&apos;t exist in it.
        </p>
      </Section>

      <Section id="compare" title="L2 snapshot vs L3 order-by-order">
        <div className="rounded-lg border border-border overflow-hidden text-sm">
          <table className="w-full">
            <thead><tr className="bg-secondary text-xs uppercase tracking-wider text-muted-foreground">
              <th className="text-left px-4 py-2"></th><th className="text-left px-4 py-2">L2 snapshot (the teaching Arena)</th><th className="text-left px-4 py-2">L3 order-by-order (the realistic one)</th>
            </tr></thead>
            <tbody className="divide-y divide-border">
              {[
                ['Data', 'Aggregated size per level, ~1/sec', 'Every order add / cancel / trade, microsecond stamped'],
                ['Queue position', 'Not modelled', 'Exact FIFO position; drains order by order'],
                ['Time', 'Discrete ticks', 'Continuous, event-driven'],
                ['Latency', 'None', 'Market-data + order-entry latency'],
                ['Cancel race / adverse selection', 'Absent', 'Modelled — the core risk of market making'],
                ['Best for', 'Learning the mechanics fast', 'Realistic market making & microstructure research'],
              ].map(([k, l2, l3]) => (
                <tr key={k}>
                  <td className="px-4 py-2 font-medium text-foreground align-top">{k}</td>
                  <td className="px-4 py-2 text-muted-foreground align-top">{l2}</td>
                  <td className="px-4 py-2 text-muted-foreground align-top">{l3}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-sm">
          They&apos;re <Term>separate instances</Term> on purpose — start on the L2 Arena to learn the
          rules, then graduate to the L3 exchange where queue and latency decide everything.
        </p>
      </Section>

      <Section id="status" title="Where this stands">
        <p>
          The L3 engine exists as a <Term>reference implementation in Python</Term> — it defines the
          semantics (per-price FIFO queues, order-by-order drain, fills, and the latency/cancel race)
          and is the teaching artifact. It runs against <Term>real recorded order-by-order data</Term>
          (Bitstamp&apos;s public order feed). You can read it in the open:
        </p>
        <ul className="space-y-1 text-sm">
          <li>• <a href={REPO} target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground"><code>mbo.py</code></a> — the reference L3 book + queue simulator</li>
          <li>• <a href="https://github.com/convexpi/arena/blob/main/deploy/fetch_crypto_l3.py" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground"><code>fetch_crypto_l3.py</code></a> — the real L3 recorder</li>
          <li>• <a href="https://github.com/convexpi/arena/blob/main/deploy/mbo_demo.py" target="_blank" rel="noopener noreferrer" className="underline underline-offset-4 hover:text-foreground"><code>mbo_demo.py</code></a> — queue-drain + cancel-race demonstration</li>
        </ul>
        <p>
          Next: a live, playable L3 instance with its own competition, where your agent&apos;s fills
          depend on the queue it&apos;s sitting in and how fast it can cancel. The reference stays the
          source of truth; a compiled (Rust) core can later run it at research scale behind the same
          interface.
        </p>
      </Section>

      <div className="mt-4 rounded-lg border border-border bg-secondary/40 px-6 py-6">
        <h2 className="text-xl font-bold text-foreground mb-2">Look at both</h2>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4 max-w-2xl">
          Learn the mechanics on the snapshot Arena, then see why the real thing is harder.
        </p>
        <div className="flex flex-wrap gap-4 text-sm">
          <Link href="/exchange" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">← The L2 exchange</Link>
          <Link href="/compete/arena-book" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Real-book competition →</Link>
          <Link href="/lessons/market-making" className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Market-making lesson →</Link>
        </div>
      </div>
    </div>
  )
}
