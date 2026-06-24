'use server'
import { revalidatePath } from 'next/cache'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient, isAdmin } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user || !isAdmin(user.id)) throw new Error('unauthorized')
}

export async function setMessageStatus(fd: FormData) {
  await requireAdmin()
  await createAdminClient().from('contact_messages')
    .update({ status: String(fd.get('status')) }).eq('id', String(fd.get('id')))
  revalidatePath('/admin/messages')
}

export async function deleteMessage(fd: FormData) {
  await requireAdmin()
  await createAdminClient().from('contact_messages').delete().eq('id', String(fd.get('id')))
  revalidatePath('/admin/messages')
}
