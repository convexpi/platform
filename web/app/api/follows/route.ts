import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// GET /api/follows?target=<profile_id>
// Returns { followerCount, followingCount, isFollowing } for the target profile
export async function GET(req: NextRequest) {
  const targetId = req.nextUrl.searchParams.get('target')
  if (!targetId) return NextResponse.json({ error: 'Missing target' }, { status: 400 })

  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const [followerRes, followingRes, isFollowingRes] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', targetId),
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', targetId),
    user
      ? supabase.from('follows').select('*', { count: 'exact', head: true })
          .eq('follower_id', user.id).eq('following_id', targetId)
      : Promise.resolve({ count: 0 }),
  ])

  return NextResponse.json({
    followerCount:  followerRes.count  ?? 0,
    followingCount: followingRes.count ?? 0,
    isFollowing:    (isFollowingRes.count ?? 0) > 0,
  })
}

// POST /api/follows  body: { targetId, action: 'follow' | 'unfollow' }
export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { targetId, action } = await req.json() as { targetId: string; action: 'follow' | 'unfollow' }
  if (!targetId || !action) return NextResponse.json({ error: 'Missing fields' }, { status: 400 })
  if (targetId === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

  if (action === 'follow') {
    const { error } = await supabase.from('follows')
      .upsert({ follower_id: user.id, following_id: targetId }, { onConflict: 'follower_id,following_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await supabase.from('follows')
      .delete().eq('follower_id', user.id).eq('following_id', targetId)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
