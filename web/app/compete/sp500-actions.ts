'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

export async function submitSp500Model(fd: FormData) {
  const name = String(fd.get('name') ?? '').trim().slice(0, 80)
  const code = String(fd.get('code') ?? '').trim()
  if (!name || !code) return
  if (!code.includes('def predict')) return            // must define predict(history)
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return
  await supabase.from('sp500_models').insert({ user_id: user.id, name, code: code.slice(0, 20000), status: 'active' })
  revalidatePath('/compete/sp500-nextday')
}
