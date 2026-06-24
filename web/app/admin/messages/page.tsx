import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { setMessageStatus, deleteMessage } from './actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Messages — Admin' }

interface Msg { id: string; name: string | null; email: string | null; message: string; status: string; created_at: string }

const STATUS_STYLE: Record<string, string> = {
  new: 'bg-amber-100 text-amber-700', read: 'bg-slate-100 text-slate-600', replied: 'bg-emerald-100 text-emerald-700',
}

export default async function MessagesPage() {
  const db = createAdminClient()
  const { data } = await db.from('contact_messages').select('*').order('created_at', { ascending: false }).limit(200)
  const msgs = (data ?? []) as Msg[]
  const newCount = msgs.filter(m => m.status === 'new').length

  return (
    <div className="p-8 max-w-4xl">
      <div className="mb-6">
        <h1 className="text-2xl font-semibold">Messages</h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Contact-form submissions ({newCount} new). They also email hello@convexpi.ai when email delivery is configured.
        </p>
      </div>
      {msgs.length === 0 ? (
        <p className="text-sm text-muted-foreground">No messages yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {msgs.map(m => (
            <div key={m.id} className="rounded-xl border bg-card p-4">
              <div className="flex items-start justify-between gap-3 mb-2">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-foreground">
                    {m.name || 'Anonymous'}
                    {m.email && <> · <a href={`mailto:${m.email}`} className="text-muted-foreground hover:text-foreground underline underline-offset-4">{m.email}</a></>}
                  </p>
                  <p className="text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</p>
                </div>
                <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${STATUS_STYLE[m.status] ?? STATUS_STYLE.read}`}>{m.status}</span>
              </div>
              <p className="text-sm text-foreground/90 leading-relaxed whitespace-pre-wrap">{m.message}</p>
              <div className="flex items-center gap-3 mt-3 pt-2 border-t border-border/60 text-[11px]">
                {m.email && <a href={`mailto:${m.email}?subject=Re:%20ConvexPi`} className="font-medium text-[#C9A34E] hover:text-[#b8922d]">Reply</a>}
                <StatusBtn id={m.id} status="read" label="Mark read" />
                <StatusBtn id={m.id} status="replied" label="Mark replied" />
                <form action={deleteMessage} className="ml-auto">
                  <input type="hidden" name="id" value={m.id} />
                  <button type="submit" className="text-muted-foreground hover:text-red-600">delete</button>
                </form>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

function StatusBtn({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={setMessageStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className="text-muted-foreground hover:text-foreground">{label}</button>
    </form>
  )
}
