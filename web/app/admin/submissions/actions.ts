'use server'

import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdmin } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) throw new Error('unauthorized')
}

// Re-queue a failed (or stuck) submission so the grader worker picks it up again.
export async function retrySubmission(fd: FormData) {
  await requireAdmin()
  const id = String(fd.get('id'))
  await createAdminClient().from('submissions')
    .update({ status: 'pending', error_message: null }).eq('id', id)
  revalidatePath('/admin/submissions')
}
