import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { toggleVote, addComment, deleteComment, submitToLeaderboard, toggleFeatured } from '../social-actions'
import { isAdmin } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'

type Post = {
  id: string; slug: string; title: string; summary: string | null; tags: string[]
  notebook_path: string; rendered_html: string | null; status: string; build_log: string | null
  has_strategy: boolean; featured: boolean; repo_url: string; commit_sha: string | null; license: string | null
  author_id: string; submission_id: string | null; format: string
}

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
    .select('id, slug, title, summary, tags, notebook_path, rendered_html, status, build_log, has_strategy, featured, repo_url, commit_sha, license, author_id, submission_id, format')
    .eq('slug', slug)
    .maybeSingle()
  if (!data) notFound()
  const post = data as Post
  const { data: { user } } = await supabase.auth.getUser()
  const isAuthor = user?.id === post.author_id
  const admin = !!user && isAdmin(user.id)

  // Leaderboard tie-in: a graded OOS report, or a pending submission, or eligible to submit.
  let grade: { oos_sharpe: number | null; overfitting_ratio: number | null } | null = null
  let subStatus: string | null = null
  if (post.submission_id) {
    const { data: gr } = await supabase.from('grade_reports')
      .select('oos_sharpe, overfitting_ratio').eq('submission_id', post.submission_id).maybeSingle()
    grade = gr
    if (!gr) {
      const { data: s } = await supabase.from('submissions').select('status').eq('id', post.submission_id).maybeSingle()
      subStatus = s?.status ?? null
    }
  }

  // posts.author_id references auth.users, not profiles, so fetch the profile separately.
  const { data: author } = await supabase
    .from('profiles').select('username, display_name').eq('id', post.author_id).maybeSingle()

  // Social: vote count, whether the viewer voted, and comments (+ their authors).
  const [{ count: voteCount }, { data: myVote }, { data: commentRows }] = await Promise.all([
    supabase.from('post_votes').select('*', { count: 'exact', head: true }).eq('post_id', post.id),
    user ? supabase.from('post_votes').select('post_id').eq('post_id', post.id).eq('user_id', user.id).maybeSingle()
         : Promise.resolve({ data: null }),
    supabase.from('post_comments').select('id, body, created_at, user_id').eq('post_id', post.id).order('created_at'),
  ])
  const comments = commentRows ?? []
  const cIds = [...new Set(comments.map(c => c.user_id))]
  const { data: cProfs } = cIds.length
    ? await supabase.from('profiles').select('id, username, display_name').in('id', cIds)
    : { data: [] as { id: string; username: string | null; display_name: string | null }[] }
  const cBy = new Map((cProfs ?? []).map(p => [p.id, p]))
  const voted = !!myVote
  const canVote = !!user && user.id !== post.author_id
  const [, owner, repo] = post.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/) ?? []
  const ref = post.commit_sha ?? 'HEAD'
  const colabUrl = `https://colab.research.google.com/github/${owner}/${repo}/blob/${ref}/${post.notebook_path}`
  const downloadUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${post.notebook_path}`
  const sourceUrl = post.commit_sha ? `${post.repo_url}/blob/${post.commit_sha}` : post.repo_url

  return (
    <div className="container mx-auto px-4 py-12 max-w-3xl">
      <div className="mb-6">
        <Link href="/projects" className="text-sm text-muted-foreground hover:text-foreground">← Projects</Link>
      </div>

      <h1 className="font-serif text-4xl text-foreground leading-tight mb-2">
        {post.featured && <span title="Featured" className="text-[#C9A34E] mr-1">★</span>}{post.title}
      </h1>
      <div className="flex items-center gap-2 flex-wrap text-sm text-muted-foreground mb-6">
        <span>{author?.display_name || (author?.username ? `@${author.username}` : 'anon')}</span>
        {admin && (
          <form action={toggleFeatured} className="inline">
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="slug" value={post.slug} />
            <input type="hidden" name="featured" value={(!post.featured).toString()} />
            <button type="submit" className="text-xs underline underline-offset-2 hover:text-foreground">
              {post.featured ? 'unfeature' : 'feature'}
            </button>
          </form>
        )}
        {post.has_strategy && <span className="px-1.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs">strategy</span>}
        {post.tags?.map(t => <span key={t} className="px-1.5 py-0.5 rounded-full bg-secondary text-xs">{t}</span>)}
      </div>

      {/* Upvote */}
      <div className="mb-8">
        {canVote ? (
          <form action={toggleVote}>
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="slug" value={post.slug} />
            <button type="submit"
              className={cn('inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-sm transition-colors',
                voted ? 'border-[#C9A34E] bg-[#C9A34E]/10 text-[#b8922d]' : 'border-border hover:bg-muted')}>
              ▲ <span className="font-medium">{voteCount ?? 0}</span>
              <span className="text-xs text-muted-foreground">{voted ? 'upvoted' : 'upvote'}</span>
            </button>
          </form>
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-sm text-muted-foreground">
            ▲ <span className="font-medium text-foreground">{voteCount ?? 0}</span>
            <span className="text-xs">{user ? 'your post' : <Link href="/login" className="underline underline-offset-2">sign in to upvote</Link>}</span>
          </span>
        )}
      </div>

      {/* Leaderboard tie-in */}
      {post.has_strategy && (
        <div className="mb-8">
          {grade ? (
            <Link href="/compete/open-leaderboard/leaderboard"
              className="inline-flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-2 text-sm">
              <span className="text-emerald-700 font-medium">✓ Reproduced by ConvexPi</span>
              <span className="text-emerald-700">· OOS Sharpe <span className="font-mono font-semibold">{grade.oos_sharpe?.toFixed(2) ?? '—'}</span></span>
              <span className="text-xs text-emerald-600">on the permanent leaderboard ↗</span>
            </Link>
          ) : subStatus === 'failed' ? (
            <div className="text-sm">
              <span className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-4 py-2 text-amber-700">
                Grading failed — make sure <code>MyStrategy</code> subclasses the Lab <code>Strategy</code> and runs standalone.
              </span>
              {isAuthor && (
                <form action={submitToLeaderboard} className="mt-2">
                  <input type="hidden" name="post_id" value={post.id} />
                  <input type="hidden" name="slug" value={post.slug} />
                  <button type="submit" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>Re-submit</button>
                </form>
              )}
            </div>
          ) : post.submission_id ? (
            <span className="inline-flex items-center gap-2 rounded-lg border border-border bg-muted/40 px-4 py-2 text-sm text-muted-foreground">
              ⏳ Grading this strategy on hidden out-of-sample data…
            </span>
          ) : isAuthor ? (
            <form action={submitToLeaderboard}>
              <input type="hidden" name="post_id" value={post.id} />
              <input type="hidden" name="slug" value={post.slug} />
              <button type="submit" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
                Submit strategy to the leaderboard
              </button>
              <p className="mt-1 text-xs text-muted-foreground">We&apos;ll grade your <code>MyStrategy</code> on hidden out-of-sample data and post the score here.</p>
            </form>
          ) : null}
        </div>
      )}

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

      <div className="mt-10 border-t border-border pt-6">
        <div className="flex flex-wrap gap-3 text-sm">
          {post.format === 'ipynb' && (
            <a href={colabUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ size: 'sm' }))}>Open in Colab ↗</a>
          )}
          <a href={downloadUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>Download {post.format === 'qmd' ? '.qmd' : '.ipynb'} ↗</a>
          <a href={sourceUrl} target="_blank" rel="noopener noreferrer" className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>View source ↗</a>
          {post.license && <span className="self-center text-xs text-muted-foreground">License: {post.license}</span>}
        </div>
        {post.format === 'ipynb' && (
          <p className="mt-2 text-xs text-muted-foreground">
            Make it yours: open in Colab, then <em>File → Save a copy in Drive</em> (or <em>in GitHub</em>) to get your own editable copy.
          </p>
        )}
      </div>

      {/* Discussion */}
      <section className="mt-12 border-t border-border pt-8">
        <h2 className="text-lg font-semibold mb-1">Discussion <span className="text-muted-foreground font-normal">({comments.length})</span></h2>
        <p className="text-xs text-muted-foreground mb-5">
          Keep feedback constructive: what worked, what you&apos;d try next, or a specific question.
        </p>

        {user ? (
          <form action={addComment} className="mb-8">
            <input type="hidden" name="post_id" value={post.id} />
            <input type="hidden" name="slug" value={post.slug} />
            <textarea name="body" required maxLength={4000} rows={3}
              placeholder="What worked? What would you try next? A question for the author…"
              className="w-full text-sm border rounded-lg px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
            <button type="submit" className={cn(buttonVariants({ size: 'sm' }), 'mt-2')}>Post comment</button>
          </form>
        ) : (
          <p className="mb-8 text-sm text-muted-foreground">
            <Link href="/login" className="underline underline-offset-4">Sign in</Link> to join the discussion.
          </p>
        )}

        <div className="space-y-5">
          {comments.map(c => {
            const ca = cBy.get(c.user_id)
            return (
              <div key={c.id} className="text-sm">
                <div className="flex items-center gap-2 text-xs text-muted-foreground mb-1">
                  <span className="text-foreground font-medium">{ca?.display_name || (ca?.username ? `@${ca.username}` : 'anon')}</span>
                  <span>{new Date(c.created_at).toLocaleDateString('en-US', { dateStyle: 'medium' })}</span>
                  {user?.id === c.user_id && (
                    <form action={deleteComment} className="inline">
                      <input type="hidden" name="comment_id" value={c.id} />
                      <input type="hidden" name="slug" value={post.slug} />
                      <button type="submit" className="hover:text-foreground underline underline-offset-2">delete</button>
                    </form>
                  )}
                </div>
                <p className="text-foreground whitespace-pre-wrap leading-relaxed">{c.body}</p>
              </div>
            )
          })}
          {comments.length === 0 && <p className="text-sm text-muted-foreground/70">No comments yet — be the first.</p>}
        </div>
      </section>
    </div>
  )
}
