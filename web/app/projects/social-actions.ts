'use server'

import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { revalidatePath } from 'next/cache'

const UPVOTE_POINTS = 2   // reputation awarded to a post's author per upvote received

export async function toggleVote(fd: FormData) {
  const postId = String(fd.get('post_id') ?? '')
  const slug = String(fd.get('slug') ?? '')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !postId) return

  const { data: post } = await supabase.from('posts').select('author_id').eq('id', postId).maybeSingle()
  if (!post || post.author_id === user.id) return   // no self-votes

  const admin = createAdminClient()
  const sourceKey = `post_upvote:${postId}:${user.id}`
  const { data: existing } = await supabase
    .from('post_votes').select('post_id').eq('post_id', postId).eq('user_id', user.id).maybeSingle()

  if (existing) {
    await supabase.from('post_votes').delete().eq('post_id', postId).eq('user_id', user.id)
    await admin.from('contributions').delete().eq('source_key', sourceKey)
  } else {
    await supabase.from('post_votes').insert({ post_id: postId, user_id: user.id })
    await admin.from('contributions').upsert({
      user_id: post.author_id, kind: 'post_upvote', points: UPVOTE_POINTS,
      ref: postId, detail: 'Upvote on a project post', source_key: sourceKey,
    }, { onConflict: 'source_key' })
  }
  if (slug) revalidatePath(`/projects/${slug}`)
  revalidatePath('/contributors')
}

export async function addComment(fd: FormData) {
  const postId = String(fd.get('post_id') ?? '')
  const slug = String(fd.get('slug') ?? '')
  const body = String(fd.get('body') ?? '').trim()
  if (!postId || !body) return
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('post_comments').insert({ post_id: postId, user_id: user.id, body: body.slice(0, 4000) })
  if (slug) revalidatePath(`/projects/${slug}`)
}

const OPEN_LEADERBOARD = '99d6c14a-ea75-4781-b56f-3dabad6c8849'   // cohorts.slug = 'open-leaderboard'
const STRATEGY_HEADER =
  'import numpy as np\ntry:\n    from convexpi.lab import Strategy\nexcept Exception:\n    pass\n\n'

function cellSource(cell: { source?: string | string[] }): string {
  return Array.isArray(cell.source) ? cell.source.join('') : (cell.source ?? '')
}

export async function submitToLeaderboard(fd: FormData) {
  const postId = String(fd.get('post_id') ?? '')
  const slug = String(fd.get('slug') ?? '')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !postId) return

  const { data: post } = await supabase.from('posts')
    .select('author_id, repo_url, commit_sha, notebook_path, title, has_strategy, submission_id')
    .eq('id', postId).maybeSingle()
  if (!post || post.author_id !== user.id || !post.has_strategy || post.submission_id) return

  // Fetch the notebook at the pinned commit and extract the cell defining MyStrategy.
  const [, owner, repo] = post.repo_url.match(/github\.com\/([^/]+)\/([^/]+)/) ?? []
  const ref = post.commit_sha ?? 'HEAD'
  const rawUrl = `https://raw.githubusercontent.com/${owner}/${repo}/${ref}/${post.notebook_path}`
  let code = ''
  try {
    const nb = JSON.parse(await (await fetch(rawUrl)).text()) as { cells: { cell_type: string; source?: string | string[] }[] }
    const cell = nb.cells.find(c => c.cell_type === 'code' && cellSource(c).includes('class MyStrategy'))
    if (!cell) return
    code = STRATEGY_HEADER + cellSource(cell)
  } catch {
    return
  }

  const admin = createAdminClient()
  const { data: sub } = await admin.from('submissions').insert({
    cohort_id: OPEN_LEADERBOARD, user_id: user.id, code,
    strategy_name: (post.title || 'post strategy').slice(0, 80),
    status: 'pending', submitted_via: 'post',
    github_url: post.commit_sha ? `${post.repo_url}/blob/${post.commit_sha}` : post.repo_url,
  }).select('id').single()

  if (sub) await supabase.from('posts').update({ submission_id: sub.id }).eq('id', postId)
  if (slug) revalidatePath(`/projects/${slug}`)
}

export async function deleteComment(fd: FormData) {
  const id = String(fd.get('comment_id') ?? '')
  const slug = String(fd.get('slug') ?? '')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !id) return
  await supabase.from('post_comments').delete().eq('id', id).eq('user_id', user.id)
  if (slug) revalidatePath(`/projects/${slug}`)
}
