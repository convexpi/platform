'use server'
import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

// Enroll the current user into a classroom by its join code (no slug needed).
export async function joinByCode(fd: FormData) {
  const code = String(fd.get('code') || '').trim().toUpperCase()
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login?next=/classroom/join')
  if (!code) redirect('/classroom/join?err=' + encodeURIComponent('Enter a join code.'))

  const admin = createAdminClient()
  const { data: cohort } = await admin.from('cohorts')
    .select('id, slug').eq('join_code', code).eq('type', 'classroom').maybeSingle()
  if (!cohort) redirect('/classroom/join?err=' + encodeURIComponent('No classroom found for that code — check it with your instructor.'))

  const { error } = await admin.from('cohort_members')
    .insert({ cohort_id: cohort.id, user_id: user.id, role: 'member' })
  if (error && !error.message.toLowerCase().includes('duplicate')) {
    redirect('/classroom/join?err=' + encodeURIComponent(error.message))
  }
  redirect(`/classroom/${cohort.slug}`)
}
