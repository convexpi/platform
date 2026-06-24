'use server'

import { createAdminClient } from '@/lib/supabase/admin'
import { sendEmail } from '@/lib/email'

export type ContactState = { ok?: boolean; error?: string }

export async function submitContact(_prev: ContactState, fd: FormData): Promise<ContactState> {
  // Honeypot — bots fill hidden fields; treat as a silent success.
  if (String(fd.get('company') ?? '')) return { ok: true }

  const name = String(fd.get('name') ?? '').trim().slice(0, 200)
  const email = String(fd.get('email') ?? '').trim().slice(0, 200)
  const message = String(fd.get('message') ?? '').trim()
  if (message.length < 5) return { error: 'Please enter a message.' }
  if (message.length > 5000) return { error: 'Message is too long.' }
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: 'Please enter a valid email (or leave it blank).' }

  // Durable store first, so nothing is lost even if email isn't configured.
  try {
    await createAdminClient().from('contact_messages').insert({
      name: name || null, email: email || null, message,
    })
  } catch {
    return { error: 'Something went wrong — please email hello@convexpi.ai directly.' }
  }

  // Best-effort email (no-op unless RESEND_API_KEY is set).
  await sendEmail({
    to: 'hello@convexpi.ai',
    subject: `ConvexPi contact — ${name || email || 'new message'}`,
    text: `From: ${name || '(no name)'} <${email || 'no email'}>\n\n${message}`,
    replyTo: email || undefined,
  })

  return { ok: true }
}
