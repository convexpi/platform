import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { LECTURES, getLecture, colabForLecture } from '@/lib/lectures'

export function generateStaticParams() {
  return LECTURES.map((l) => ({ slug: l.slug }))
}

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const lec = getLecture(slug)
  if (!lec) return { title: 'Lecture — ConvexPi' }
  return { title: `${lec.title} — ConvexPi`, description: lec.summary }
}

export default async function LecturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const lec = getLecture(slug)
  if (!lec) notFound()

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      <Link href="/lectures" className="text-sm text-muted-foreground hover:text-foreground">← All lectures</Link>

      <div className="mt-3 flex items-start justify-between gap-4">
        <div>
          <span className="text-xs text-muted-foreground">Lecture · {lec.duration}</span>
          <h1 className="text-3xl font-bold mt-1">{lec.title}</h1>
        </div>
        <a
          href={colabForLecture(lec.notebook)}
          target="_blank"
          rel="noopener noreferrer"
          className={cn(buttonVariants({ size: 'sm' }), 'shrink-0 text-xs')}
        >
          Open in Colab
        </a>
      </div>

      <p className="text-muted-foreground leading-relaxed mt-4">{lec.summary}</p>

      <div className="flex flex-wrap gap-1.5 mt-4">
        {lec.topics.map((t) => (
          <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">{t}</span>
        ))}
      </div>

      <h2 className="text-sm font-semibold tracking-widest text-muted-foreground uppercase mt-8 mb-3">
        Key takeaways
      </h2>
      <ol className="space-y-2">
        {lec.takeaways.map((t, i) => (
          <li key={i} className="text-sm text-muted-foreground flex gap-2">
            <span className="font-mono text-xs text-muted-foreground/50 shrink-0 mt-0.5">{i + 1}.</span>
            {t}
          </li>
        ))}
      </ol>

      <div className="mt-8 rounded-lg border bg-muted/20 p-5">
        <p className="text-sm font-semibold mb-1">Put it into practice</p>
        <p className="text-sm text-muted-foreground">
          This lecture underpins{' '}
          {lec.relatedMissions.map((n, i) => (
            <span key={n}>
              {i > 0 && (i === lec.relatedMissions.length - 1 ? ' and ' : ', ')}
              <Link href="/curriculum" className="underline underline-offset-4 hover:text-foreground">
                Mission {n}
              </Link>
            </span>
          ))}
          . Read it, then go earn (or fail to earn) an out-of-sample Sharpe on the leaderboard.
        </p>
      </div>

      <div className="mt-8 flex items-center gap-3">
        <a href={colabForLecture(lec.notebook)} target="_blank" rel="noopener noreferrer"
          className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
          Run the notebook
        </a>
        <Link href="/curriculum" className={cn(buttonVariants({ variant: 'ghost', size: 'sm' }))}>
          Go to the missions →
        </Link>
      </div>
    </div>
  )
}
