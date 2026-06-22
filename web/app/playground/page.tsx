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
          Published anomalies as runnable code — executed in your browser, on real Ken-French factor
          data. Each example splits the return stream at the paper&apos;s publication year (the
          McLean &amp; Pontiff test) and asks the only honest question: <em>did the edge survive?</em>{' '}
          Change the year, swap the factor, or rewrite it entirely, then hit Run.
        </p>
      </div>
      <Playground />
      <p className="mt-6 text-xs text-muted-foreground leading-relaxed">
        These mirror the executable replications in the course&apos;s benchmark — momentum and trend
        survive out of sample, value decayed through the 2007–2020 drought, and size went dormant.
        Don&apos;t take our word for it; the data is right there.
      </p>
    </div>
  )
}
