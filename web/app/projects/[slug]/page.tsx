import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export const dynamic = 'force-dynamic'

type Post = {
  slug: string; title: string; summary: string | null; tags: string[]
  rendered_html: string | null; status: string; build_log: string | null
  has_strategy: boolean; repo_url: string; commit_sha: string | null; license: string | null
  profiles: { username: string | null; display_name: string | null } | { username: string | null; display_name: string | null }[] | null
}

const first = <T,>(e: T | T[] | null): T | null => (Array.isArray(e) ? (e[0] ?? null) : e)

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('posts').select('title, summary').eq('slug', slug).maybeSingle()
  return { title: data?.title ? `${data.title} — ConvexPi` : 'Project — ConvexPi', description: data?.summary ?? undefined }
}

export default async function PostPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('posts')
    .select('slug, title, summary, tags, rendered_html, status, build_log, has_strategy, repo_url, commit_sha, license, profiles(username, display_name)')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) notFound()
  const post = data as Post
  const author = first(post.profiles)
  const forkUrl = `${post.repo_url}/fork`
  const sourceUrl = post.commit_sha
    ? `${post.repo_url}/blob/${post.commit_sha}`
    : post.repo_url

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-6">
        <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground">← Projects</Link>
      </div>

      <h1 className="font-serif text-4xl text-foreground leading-tight mb-2">{post.title}</h1>
      <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground mb-6">
        <span>{author?.display_name || (author?.username ? `@${author.username}` : 'anon')}</span>
        {post.has_strategy && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">strategy</span>}
        {post.tags?.map(t => <span key={t} className="px-1.5 py-0.5 rounded-full bg-secondary text-xs">{t}</span>)}
      </div>

      {post.status === 'building' && (
        <div className="rounded-lg border border-border bg-muted/30 px-6 py-10 text-center text-sm text-muted-foreground">
          ⏳ Building this post — we&apos;re running your notebook and rendering it. Refresh in a minute.
        </div>
      )}
      {post.status === 'failed' && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-6 py-6 text-sm text-red-700">
          The build failed. {post.build_log}{' '}
          Check that your notebook runs top-to-bottom from a clean kernel, then re-publish.
        </div>
      )}
      {post.status === 'published' && post.rendered_html && (
        <article className="post-body" dangerouslySetInnerHTML={{ __html: post.rendered_html }} />
      )}

      <div className="mt-10 flex flex-wrap gap-3 border-t border-border pt-6 text-sm">
        <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>View source ↗</a>
        <a href={forkUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>Fork on GitHub ↗</a>
        {post.license && <span className="self-center text-xs text-muted-foreground">License: {post.license}</span>}
      </div>
    </div>
  )
}
