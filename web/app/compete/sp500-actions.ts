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
  const trimmed = code.slice(0, 20000)

  // Stable identity per (user, name): refresh the code in place so the model keeps its accumulating
  // forward track instead of spawning a fresh row each time. Collapse any duplicate actives.
  const { data: actives } = await supabase.from('sp500_models')
    .select('id').eq('user_id', user.id).eq('name', name).eq('status', 'active')
    .order('created_at', { ascending: true })
  if (actives && actives.length > 0) {
    if (actives.length > 1) {
      await supabase.from('sp500_models').update({ status: 'replaced' })
        .in('id', actives.slice(1).map((a) => a.id))
    }
    await supabase.from('sp500_models').update({ code: trimmed }).eq('id', actives[0].id)
  } else {
    await supabase.from('sp500_models').insert({ user_id: user.id, name, code: trimmed, status: 'active' })
  }
  revalidatePath('/compete/sp500-nextday')
}
