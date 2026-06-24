'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdmin } from '@/lib/supabase/admin'

// Server actions are public endpoints, so re-check admin on every call (the layout only gates rendering).
async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) throw new Error('unauthorized')
}

export async function addTask(formData: FormData) {
  await requireAdmin()
  const title = String(formData.get('title') ?? '').trim()
  if (!title) return
  const detail = String(formData.get('detail') ?? '').trim() || null
  const area = String(formData.get('area') ?? '').trim() || null
  const priority = Number(formData.get('priority') ?? 2) || 2
  await createAdminClient().from('agent_tasks').insert({ title, detail, area, priority })
  revalidatePath('/admin/tasks')
}

export async function setStatus(formData: FormData) {
  await requireAdmin()
  const id = String(formData.get('id'))
  const status = String(formData.get('status'))
  await createAdminClient().from('agent_tasks')
    .update({ status, updated_at: new Date().toISOString() }).eq('id', id)
  revalidatePath('/admin/tasks')
}

export async function deleteTask(formData: FormData) {
  await requireAdmin()
  await createAdminClient().from('agent_tasks').delete().eq('id', String(formData.get('id')))
  revalidatePath('/admin/tasks')
}
