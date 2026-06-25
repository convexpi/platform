'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export type PublishState = { error?: string }

const GH_BLOB = /github\.com\/([^/]+)\/([^/]+)\/blob\/([^/]+)\/(.+\.ipynb)$/i

function slugify(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 50)
}

export async function publishPost(_prev: PublishState, fd: FormData): Promise<PublishState> {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { error: 'Please sign in to publish a post.' }

  const url = String(fd.get('url') ?? '').trim()
  const license = String(fd.get('license') ?? '').trim() || null
  const m = url.match(GH_BLOB)
  if (!m) {
    return { error: 'Paste a link to a notebook file on GitHub, e.g. https://github.com/you/repo/blob/main/post.ipynb' }
  }
  const [, owner, repo, refRaw, path] = m
  const repoUrl = `https://github.com/${owner}/${repo}`

  // Resolve the ref (branch or SHA) to an immutable commit SHA so the post is pinned. The author's
  // repo can be any public repo, so this lookup is UNauthenticated (a lab-scoped token couldn't read
  // it). The dispatch token is used only for the call to convexpi/lab below.
  const token = process.env.GITHUB_DISPATCH_TOKEN
  let sha = refRaw
  if (!/^[0-9a-f]{40}$/i.test(refRaw)) {
    const r = await fetch(`https://api.github.com/repos/${owner}/${repo}/commits/${refRaw}`,
      { headers: { Accept: 'application/vnd.github+json' } })
    if (!r.ok) return { error: `Couldn't reach that repo/branch on GitHub (${r.status}). Is it public?` }
    sha = (await r.json()).sha
  }

  const base = slugify(path.split('/').pop()!.replace(/\.ipynb$/i, '')) || 'post'
  const slug = `${base}-${Math.random().toString(36).slice(2, 8)}`

  const { error: insErr } = await supabase.from('posts').insert({
    slug, author_id: user.id, repo_url: repoUrl, commit_sha: sha,
    notebook_path: path, format: 'ipynb', status: 'building', license,
    title: base.replace(/-/g, ' '),
  })
  if (insErr) return { error: `Could not create the post: ${insErr.message}` }

  const { data: row } = await supabase.from('posts').select('id').eq('slug', slug).single()

  // Dispatch the central build worker. If no token is configured, the post stays 'building'
  // and a maintainer can run the workflow manually with the post id.
  if (token && row) {
    await fetch('https://api.github.com/repos/convexpi/lab/actions/workflows/build_post.yml/dispatches', {
      method: 'POST',
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ ref: 'main', inputs: { post_id: row.id, repo_url: repoUrl, ref: sha, notebook_path: path } }),
    }).catch(() => {})
  }

  redirect(`/projects/${slug}`)
}
