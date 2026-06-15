import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/notifications — recent notifications + unread count
export async function GET() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ notifications: [], unread: 0 })

  const { data } = await supabase
    .from('notifications')
    .select('id, type, payload, read, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(20)

  const notifications = data ?? []
  const unread = notifications.filter(n => !n.read).length
  return NextResponse.json({ notifications, unread })
}

// POST /api/notifications/read — mark all as read
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const id = body.id as string | undefined

  if (id) {
    await supabase.from('notifications').update({ read: true }).eq('id', id).eq('user_id', user.id)
  } else {
    await supabase.from('notifications').update({ read: true }).eq('user_id', user.id).eq('read', false)
  }
  return NextResponse.json({ ok: true })
}
