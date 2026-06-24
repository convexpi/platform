'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdmin } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) throw new Error('unauthorized')
}

// Approve / reject a paper. Rejected papers drop out of the public library (it shows
// candidate/approved only); approved are protected from the automated relevance sweep.
export async function setCuration(fd: FormData) {
  await requireAdmin()
  const status = String(fd.get('status'))
  if (!['approved', 'candidate', 'rejected'].includes(status)) return
  await createAdminClient().from('papers').update({ curation_status: status }).eq('id', String(fd.get('id')))
  revalidatePath('/admin/papers')
}
