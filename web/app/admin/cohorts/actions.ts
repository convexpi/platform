'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdmin } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) throw new Error('unauthorized')
}

// Start/end a competition season (or any cohort).
export async function setCohortStatus(fd: FormData) {
  await requireAdmin()
  const status = String(fd.get('status'))
  if (!['upcoming', 'active', 'ended'].includes(status)) return
  await createAdminClient().from('cohorts').update({ status }).eq('id', String(fd.get('id')))
  revalidatePath('/admin/cohorts')
}

export async function setCohortVisibility(fd: FormData) {
  await requireAdmin()
  const visibility = String(fd.get('visibility'))
  if (!['public', 'private'].includes(visibility)) return
  await createAdminClient().from('cohorts').update({ visibility }).eq('id', String(fd.get('id')))
  revalidatePath('/admin/cohorts')
}
