import type { Metadata } from 'next'
import { Playground } from './playground-client'

export const metadata: Metadata = {
  title: 'Playground — ConvexPi',
  description:
    'Run real factor strategies in your browser on Ken-French data, and test out of sample whether the published edge survived.',
}

export default function PlaygroundPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Playground</h1>
        <p className="text-muted-foreground leading-relaxed">
          Real strategy replications, executed in your browser. Each example <em>recomputes</em> the
          strategy from its building blocks — reconstructing the Fama-French factors from the
          underlying size/value/momentum portfolios, or forming a long-short book by ranking
          industries each month — rather than reading a finished factor off the shelf. It checks the
          reconstruction against the published series, then splits at the paper&apos;s publication
          year (the McLean &amp; Pontiff test) to ask: <em>did the edge survive out of sample?</em>
        </p>
      </div>
      <Playground />
      <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
        Everything runs client-side via Pyodide on real Ken-French data — edit the code and re-run.
        For a full end-to-end replication on freshly downloaded data (including true single-name
        cross-sectional strategies), use the <strong>Open in Colab</strong> link on each example.
      </p>
    </div>
  )
}
