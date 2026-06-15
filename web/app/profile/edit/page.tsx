import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ProfileEditForm } from './form'

export const dynamic = 'force-dynamic'

export default async function ProfileEditPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, university, bio')
    .eq('id', user.id)
    .single()

  if (!profile) redirect('/dashboard')

  return (
    <div className="container mx-auto px-4 py-12 max-w-xl">
      <div className="mb-8">
        <h1 className="text-2xl font-semibold text-foreground">Edit profile</h1>
        <p className="text-sm text-muted-foreground mt-1">@{profile.username}</p>
      </div>
      <ProfileEditForm profile={profile} />
    </div>
  )
}
