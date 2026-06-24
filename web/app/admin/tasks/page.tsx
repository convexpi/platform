import type { Metadata } from 'next'
import { createAdminClient } from '@/lib/supabase/admin'
import { addTask, setStatus, deleteTask } from './actions'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Task queue — Admin' }

interface Task {
  id: string
  title: string
  detail: string | null
  area: string | null
  priority: number
  status: string
  result: string | null
  created_at: string
  updated_at: string
}

const PRIORITY = { 1: 'High', 2: 'Normal', 3: 'Low' } as const
const PRIORITY_STYLE: Record<number, string> = {
  1: 'bg-red-100 text-red-700',
  2: 'bg-slate-100 text-slate-600',
  3: 'bg-slate-50 text-slate-400',
}
const COLUMNS: { key: string; label: string }[] = [
  { key: 'todo', label: 'To do' },
  { key: 'in_progress', label: 'In progress' },
  { key: 'done', label: 'Done' },
]

export default async function TasksPage() {
  const db = createAdminClient()
  const { data } = await db
    .from('agent_tasks')
    .select('*')
    .neq('status', 'cancelled')
    .order('priority', { ascending: true })
    .order('created_at', { ascending: false })
  const tasks = (data ?? []) as Task[]
  const byStatus = (s: string) => tasks.filter(t => t.status === s)

  return (
    <div className="p-8 max-w-6xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold mb-1">Task queue</h1>
        <p className="text-sm text-muted-foreground max-w-2xl">
          A shared work board between you and the agent. Add what you want worked on; the agent reads
          this queue (via the Supabase service key), picks up tasks, moves them to <em>in&nbsp;progress</em>,
          and writes the outcome into each task&apos;s result when done.
        </p>
      </div>

      {/* Add task */}
      <form action={addTask} className="mb-8 rounded-xl border bg-card p-4 grid gap-3 sm:grid-cols-[1fr_auto_auto_auto] items-end">
        <div className="sm:col-span-4 grid gap-2">
          <input name="title" required placeholder="Task title (what to do)"
            className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
          <textarea name="detail" rows={2} placeholder="Detail / context (optional)"
            className="w-full text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring" />
        </div>
        <input name="area" placeholder="area (optional)"
          className="text-sm border rounded-md px-3 py-2 bg-background w-36 focus:outline-none focus:ring-2 focus:ring-ring" />
        <select name="priority" defaultValue="2"
          className="text-sm border rounded-md px-3 py-2 bg-background focus:outline-none focus:ring-2 focus:ring-ring">
          <option value="1">High</option>
          <option value="2">Normal</option>
          <option value="3">Low</option>
        </select>
        <button type="submit"
          className="text-sm font-medium rounded-md px-4 py-2 bg-[#0B1F3A] text-white hover:bg-[#0B1F3A]/90 transition-colors">
          Add task
        </button>
      </form>

      {/* Board */}
      <div className="grid md:grid-cols-3 gap-4">
        {COLUMNS.map(col => {
          const items = byStatus(col.key)
          return (
            <div key={col.key} className="rounded-xl border bg-secondary/30 p-3">
              <div className="flex items-center justify-between mb-3 px-1">
                <h2 className="text-xs font-semibold tracking-widest uppercase text-muted-foreground">{col.label}</h2>
                <span className="text-xs text-muted-foreground tabular-nums">{items.length}</span>
              </div>
              <div className="flex flex-col gap-2">
                {items.length === 0 && <p className="text-xs text-muted-foreground/60 px-1 py-3">Nothing here.</p>}
                {items.map(t => (
                  <div key={t.id} className="rounded-lg border bg-card p-3">
                    <div className="flex items-start gap-2">
                      <span className={`shrink-0 text-[10px] font-medium px-1.5 py-0.5 rounded-full ${PRIORITY_STYLE[t.priority] ?? PRIORITY_STYLE[2]}`}>
                        {PRIORITY[t.priority as 1 | 2 | 3] ?? 'Normal'}
                      </span>
                      <p className="text-sm font-medium text-foreground leading-snug flex-1">{t.title}</p>
                    </div>
                    {t.detail && <p className="text-xs text-muted-foreground mt-1.5 leading-relaxed whitespace-pre-wrap">{t.detail}</p>}
                    {t.area && <span className="inline-block mt-2 text-[10px] font-mono text-muted-foreground bg-muted px-1.5 py-0.5 rounded">{t.area}</span>}
                    {t.result && (
                      <p className="text-xs text-emerald-700 bg-emerald-50 rounded px-2 py-1.5 mt-2 leading-relaxed whitespace-pre-wrap">
                        {t.result}
                      </p>
                    )}
                    <div className="flex items-center gap-2 mt-2.5 pt-2 border-t border-border/60">
                      {col.key !== 'in_progress' && (
                        <StatusButton id={t.id} status="in_progress" label="Start" />
                      )}
                      {col.key !== 'done' && (
                        <StatusButton id={t.id} status="done" label="Done" />
                      )}
                      {col.key === 'done' && (
                        <StatusButton id={t.id} status="todo" label="Reopen" />
                      )}
                      <form action={deleteTask} className="ml-auto">
                        <input type="hidden" name="id" value={t.id} />
                        <button type="submit" className="text-[11px] text-muted-foreground hover:text-red-600 transition-colors">delete</button>
                      </form>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <p className="mt-6 text-xs text-muted-foreground">
        Tip: keep titles imperative and specific (&ldquo;Add BAB replication&rdquo;, &ldquo;Fix nav on mobile&rdquo;).
        Use the <span className="font-mono">area</span> tag to group (replications, wikis, platform, data).
      </p>
    </div>
  )
}

function StatusButton({ id, status, label }: { id: string; status: string; label: string }) {
  return (
    <form action={setStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button type="submit" className="text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors">
        {label}
      </button>
    </form>
  )
}
