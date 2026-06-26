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

export async function deleteComment(fd: FormData) {
  const id = String(fd.get('comment_id') ?? '')
  const slug = String(fd.get('slug') ?? '')
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !id) return
  await supabase.from('post_comments').delete().eq('id', id).eq('user_id', user.id)
  if (slug) revalidatePath(`/projects/${slug}`)
}
