import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { FollowButton } from '@/components/follow-button'
import { Avatar } from '@/components/avatar'

export const dynamic = 'force-dynamic'

export default async function FollowersPage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = await params
  const supabase = await createClient()

  const { data: { user: authUser } } = await supabase.auth.getUser()

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, username, display_name')
    .eq('username', username)
    .single()

  if (!profile) notFound()

  const { data: followerRows } = await supabase
    .from('follows')
    .select('follower_id, profiles!follows_follower_id_fkey(id, username, display_name, university, github_username)')
    .eq('following_id', profile.id)
    .order('created_at', { ascending: false })

  type FollowerRow = {
    follower_id: string
    profiles: { id: string; username: string; display_name: string | null; university: string | null; github_username: string | null } | null
  }
  const rows = (followerRows ?? []) as unknown as FollowerRow[]
  const followerProfiles = rows.map(r => r.profiles).filter(Boolean) as NonNullable<FollowerRow['profiles']>[]

  // Who the current user follows (for follow buttons)
  const myFollowingSet = new Set<string>()
  if (authUser) {
    const { data } = await supabase.from('follows').select('following_id').eq('follower_id', authUser.id)
    for (const r of data ?? []) myFollowingSet.add(r.following_id)
  }

  return (
    <div className="container mx-auto px-4 py-12 max-w-2xl">
      <div className="mb-8">
        <Link href={`/profile/${username}`}
          className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1 mb-4">
          ← {profile.display_name ?? profile.username}
        </Link>
        <h1 className="text-2xl font-semibold">
          Followers of @{username}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {followerProfiles.length} {followerProfiles.length === 1 ? 'person follows' : 'people follow'} this researcher
        </p>
      </div>

      {followerProfiles.length === 0 ? (
        <p className="text-sm text-muted-foreground py-8 text-center">No followers yet.</p>
      ) : (
        <div className="flex flex-col gap-3">
          {followerProfiles.map(p => (
            <UserRow
              key={p.id}
              profile={p}
              isCurrentUser={authUser?.id === p.id}
              showFollowButton={!!authUser && authUser.id !== p.id}
              isFollowing={myFollowingSet.has(p.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function UserRow({
  profile: p,
  isCurrentUser,
  showFollowButton,
  isFollowing,
}: {
  profile: { id: string; username: string; display_name: string | null; university: string | null; github_username: string | null }
  isCurrentUser: boolean
  showFollowButton: boolean
  isFollowing: boolean
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-xl border bg-card/40 hover:border-primary/30 transition-colors">
      <Link href={`/profile/${p.username}`} className="shrink-0">
        <Avatar username={p.username} displayName={p.display_name} githubUsername={p.github_username} size={40} />
      </Link>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <Link href={`/profile/${p.username}`}
            className="font-medium text-sm hover:text-primary transition-colors">
            {p.display_name ?? p.username}
          </Link>
          {isCurrentUser && (
            <span className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">you</span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">
          {p.university ? `${p.university} · ` : ''}@{p.username}
        </p>
      </div>
      {showFollowButton && (
        <FollowButton targetId={p.id} initialIsFollowing={isFollowing} initialFollowerCount={0} hideCount />
      )}
    </div>
  )
}
