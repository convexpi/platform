/**
 * email.ts — minimal transactional email via Resend, used by the contact form.
 *
 * Sends only when RESEND_API_KEY is configured; otherwise it's a no-op and the caller relies on the
 * durable contact_messages table. Set RESEND_API_KEY (and optionally CONTACT_FROM, a verified sender
 * on your domain) in the environment to enable delivery to hello@convexpi.ai.
 */
export async function sendEmail(opts: {
  to: string
  subject: string
  text: string
  replyTo?: string
}): Promise<boolean> {
  const key = process.env.RESEND_API_KEY
  if (!key) return false
  const from = process.env.CONTACT_FROM ?? 'ConvexPi <noreply@convexpi.ai>'
  try {
    const r = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from,
        to: [opts.to],
        subject: opts.subject,
        text: opts.text,
        ...(opts.replyTo ? { reply_to: opts.replyTo } : {}),
      }),
    })
    return r.ok
  } catch {
    return false
  }
}
