import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.user) {
      // Auto-populate github_username on first OAuth sign-in
      const githubUsername = data.user.user_metadata?.user_name as string | undefined
      if (githubUsername) {
        await supabase
          .from('profiles')
          .update({ github_username: githubUsername })
          .eq('id', data.user.id)
          .is('github_username', null)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_callback_failed`)
}
