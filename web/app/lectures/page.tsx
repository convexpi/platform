import Link from 'next/link'
import type { Metadata } from 'next'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LECTURES, colabForLecture } from '@/lib/lectures'

export const metadata: Metadata = {
  title: 'Lectures — ConvexPi',
  description:
    'Short, self-contained explainers behind the missions: the Information Coefficient and the ' +
    'p-hacking / multiple-comparisons trap. The concepts the out-of-sample grader is built around.',
}

export default function LecturesPage() {
  return (
    <div className="container mx-auto px-4 py-10 max-w-4xl">
      <h1 className="text-3xl font-bold mb-2">Lectures</h1>
      <p className="text-muted-foreground mb-8 leading-relaxed max-w-2xl">
        Short, self-contained explainers behind the missions. Each one builds a single idea from
        scratch in a notebook you can run — the concepts the Lab’s out-of-sample grader is built
        around. Read one before (or alongside) the mission it supports.
      </p>

      <div className="flex flex-col gap-4">
        {LECTURES.map((lec) => (
          <div key={lec.slug} className="rounded-xl border overflow-hidden">
            <div className="border-b bg-muted/30 px-6 py-4 flex items-start justify-between gap-4">
              <div>
                <span className="text-xs text-muted-foreground">{lec.duration}</span>
                <h2 className="text-lg font-semibold mt-0.5">
                  <Link href={`/lectures/${lec.slug}`} className="hover:text-primary">{lec.title}</Link>
                </h2>
              </div>
              <Link
                href={`/lectures/${lec.slug}`}
                className={cn(buttonVariants({ variant: 'outline', size: 'sm' }), 'shrink-0 text-xs')}
              >
                Read
              </Link>
            </div>
            <div className="px-6 py-5">
              <p className="text-sm text-muted-foreground leading-relaxed mb-4">{lec.summary}</p>
              <div className="flex flex-wrap gap-1.5">
                {lec.topics.map((t) => (
                  <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                    {t}
                  </span>
                ))}
              </div>
              <p className="text-xs text-muted-foreground mt-4">
                Supports mission{lec.relatedMissions.length > 1 ? 's' : ''}{' '}
                {lec.relatedMissions.map((n, i) => (
                  <span key={n}>
                    {i > 0 && ', '}
                    <Link href="/curriculum" className="underline underline-offset-4 hover:text-foreground">{n}</Link>
                  </span>
                ))}
                {'  ·  '}
                <a href={colabForLecture(lec.notebook)} target="_blank" rel="noopener noreferrer"
                  className="underline underline-offset-4 hover:text-foreground">Open in Colab</a>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
