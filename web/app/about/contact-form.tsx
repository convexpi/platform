'use client'

import { useActionState } from 'react'
import { submitContact, type ContactState } from './actions'

export function ContactForm() {
  const [state, action, pending] = useActionState<ContactState, FormData>(submitContact, {})

  if (state.ok) {
    return (
      <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-5 py-6 text-sm text-emerald-800">
        Thanks — your message is in. We&apos;ll get back to you, usually within a day or two. You can
        also reach us any time at{' '}
        <a href="mailto:hello@convexpi.ai" className="underline underline-offset-4">hello@convexpi.ai</a>.
      </div>
    )
  }

  return (
    <form action={action} className="grid gap-3">
      {/* honeypot */}
      <input type="text" name="company" tabIndex={-1} autoComplete="off"
        className="hidden" aria-hidden="true" />
      <div className="grid sm:grid-cols-2 gap-3">
        <input name="name" placeholder="Name (optional)"
          className="text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        <input name="email" type="email" placeholder="Email (so we can reply)"
          className="text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      </div>
      <textarea name="message" required rows={5} placeholder="What's on your mind? Questions, ideas, ways you'd like to get involved…"
        className="text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <div className="flex items-center gap-3">
        <button type="submit" disabled={pending}
          className="text-sm font-medium rounded-md px-5 py-2 bg-[#0B1F3A] text-white hover:bg-[#0B1F3A]/90 transition-colors disabled:opacity-60">
          {pending ? 'Sending…' : 'Send message'}
        </button>
        <span className="text-xs text-muted-foreground">or email{' '}
          <a href="mailto:hello@convexpi.ai" className="underline underline-offset-4 hover:text-foreground">hello@convexpi.ai</a>
        </span>
      </div>
    </form>
  )
}
