'use client'

import { useActionState } from 'react'
import Link from 'next/link'
import { publishPost, type PublishState } from '../actions'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'

export default function NewProjectPage() {
  const [state, action, pending] = useActionState<PublishState, FormData>(publishPost, {})

  return (
    <div className="container mx-auto px-4 py-16 max-w-xl">
      <h1 className="font-serif text-3xl text-foreground mb-2">Publish a post</h1>
      <p className="text-muted-foreground mb-8 leading-relaxed">
        Paste a link to a Jupyter notebook in your GitHub repo. We pin it to the current commit, run
        it in a sandbox, render it, and add it to the{' '}
        <Link href="/projects" className="underline underline-offset-4">showcase</Link>. Start from the{' '}
        <a href="https://github.com/convexpi/lab/tree/main/posts/template" target="_blank" rel="noopener noreferrer"
          className="underline underline-offset-4 hover:text-foreground">template</a>.
      </p>

      <form action={action} className="space-y-5">
        <div>
          <Label htmlFor="url" className="text-sm">GitHub notebook URL</Label>
          <Input id="url" name="url" required placeholder="https://github.com/you/repo/blob/main/post.ipynb"
            className="mt-1 font-mono text-sm" />
          <p className="text-xs text-muted-foreground mt-1">A <code>.ipynb</code> file URL on a public repo.</p>
        </div>
        <div>
          <Label htmlFor="license" className="text-sm">License (optional)</Label>
          <Input id="license" name="license" placeholder="MIT" className="mt-1 text-sm" />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <Button type="submit" disabled={pending}>{pending ? 'Publishing…' : 'Publish'}</Button>
      </form>

      <div className="mt-8 text-xs text-muted-foreground leading-relaxed">
        Your notebook runs top-to-bottom in a clean environment (numpy, pandas, matplotlib, the
        ConvexPi SDK). Use <code>%matplotlib inline</code> for charts, keep front-matter
        (<code>title</code>, <code>summary</code>, <code>tags</code>) in the first markdown cell, and
        define a <code>MyStrategy</code> class to qualify for the out-of-sample leaderboard.
      </div>
    </div>
  )
}
