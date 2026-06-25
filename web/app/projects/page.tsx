import Link from 'next/link'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'Projects — ConvexPi',
  description: 'A community showcase of strategy write-ups — published from GitHub notebooks, run and rendered by ConvexPi. Read, fork, and discuss.',
}

type Row = {
  slug: string; title: string; summary: string | null; tags: string[]
  has_strategy: boolean; published_at: string | null
  profiles: { username: string | null; display_name: string | null } | { username: string | null; display_name: string | null }[] | null
}

const first = <T,>(e: T | T[] | null): T | null => (Array.isArray(e) ? (e[0] ?? null) : e)

export default async function ProjectsPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('slug, title, summary, tags, has_strategy, published_at, profiles(username, display_name)')
    .eq('status', 'published')
    .order('published_at', { ascending: false })
    .limit(60)
  const posts = (data ?? []) as Row[]

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <div className="flex items-start justify-between gap-4 mb-8">
        <div className="max-w-2xl">
          <p className="text-xs font-semibold tracking-[0.15em] text-muted-foreground uppercase mb-3">Community showcase</p>
          <h1 className="font-serif text-4xl text-foreground mb-3 leading-tight">Projects</h1>
          <p className="text-muted-foreground leading-relaxed">
            Strategy write-ups, published from a notebook in your own GitHub repo. We pin it to a
            commit, <em>run it</em>, and render it into a post others can read, upvote, and fork.
            Strategies can also land on the permanent out-of-sample leaderboard.
          </p>
        </div>
        <Link href="/projects/new" className={cn(buttonVariants(), 'shrink-0')}>Publish a post</Link>
      </div>

      {posts.length === 0 ? (
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-12 text-center text-sm text-muted-foreground">
          No posts yet — <Link href="/projects/new" className="underline underline-offset-4">be the first to publish one</Link>.
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 gap-4">
          {posts.map(p => {
            const author = first(p.profiles)
            return (
              <Link key={p.slug} href={`/projects/${p.slug}`}
                className="rounded-xl border border-border bg-card p-5 hover:bg-secondary/40 transition-colors flex flex-col">
                <h2 className="font-medium text-foreground leading-snug mb-1">{p.title}</h2>
                {p.summary && <p className="text-sm text-muted-foreground line-clamp-2 mb-3">{p.summary}</p>}
                <div className="mt-auto flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                  <span>{author?.display_name || (author?.username ? `@${author.username}` : 'anon')}</span>
                  {p.has_strategy && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700">strategy</span>}
                  {p.tags?.slice(0, 3).map(t => (
                    <span key={t} className="px-1.5 py-0.5 rounded-full bg-secondary">{t}</span>
                  ))}
                </div>
              </Link>
            )
          })}
        </div>
      )}

      <p className="mt-8 text-xs text-muted-foreground">
        New here? Start from the{' '}
        <a href="https://github.com/convexpi/lab/tree/main/posts/template" target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground">post template</a>.
      </p>
    </div>
  )
}
