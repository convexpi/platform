import { notFound, redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Avatar } from '@/components/avatar'
import { buttonVariants } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import Link from 'next/link'
import type { Metadata } from 'next'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'Members — ConvexPi' }

export default async function ClassroomMembers({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect(`/login?next=/classroom/${slug}/members`)

  const { data: cohort } = await supabase
    .from('cohorts')
    .select('id, name, slug, join_code, owner_id, visibility, status')
    .eq('slug', slug)
    .eq('type', 'classroom')
    .single()

  if (!cohort) notFound()

  // Verify membership
  const { data: myMembership } = await supabase
    .from('cohort_members')
    .select('role')
    .eq('cohort_id', cohort.id)
    .eq('user_id', user.id)
    .single()

  if (!myMembership) redirect(`/classroom/${slug}`)

  const isOwner = cohort.owner_id === user.id || myMembership.role === 'instructor'

  // Fetch members with profiles
  const { data: memberRows } = await supabase
    .from('cohort_members')
    .select('role, joined_at, profiles(id, username, display_name, github_username, university)')
    .eq('cohort_id', cohort.id)
    .order('joined_at', { ascending: true })

  type MemberRow = {
    role: string
    joined_at: string
    profiles: {
      id: string
      username: string
      display_name: string | null
      github_username: string | null
      university: string | null
    } | null
  }

  const members = (memberRows ?? []) as unknown as MemberRow[]

  // Fetch best OOS Sharpe per user for this cohort
  const { data: bestScores } = await supabase
    .from('submissions')
    .select('user_id, grade_reports(oos_sharpe)')
    .eq('cohort_id', cohort.id)
    .eq('status', 'completed')

  type ScoreRow = { user_id: string; grade_reports: { oos_sharpe: number | null }[] | null }
  const scoreRows = (bestScores ?? []) as unknown as ScoreRow[]

  // Best OOS per user_id
  const bestOOS = new Map<string, number | null>()
  for (const row of scoreRows) {
    const sharpe = row.grade_reports?.[0]?.oos_sharpe ?? null
    const existing = bestOOS.get(row.user_id)
    if (sharpe != null && (existing == null || sharpe > existing)) {
      bestOOS.set(row.user_id, sharpe)
    }
  }

  const instructors = members.filter(m => m.role === 'instructor')
  const students    = members.filter(m => m.role !== 'instructor')

  return (
    <div className="container mx-auto px-4 py-10 max-w-3xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-6">
        <Link href={`/classroom/${slug}`} className="hover:text-foreground transition-colors">
          {cohort.name}
        </Link>
        <span>/</span>
        <span className="text-foreground">Members</span>
      </div>

      <div className="flex items-start justify-between mb-8 gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{cohort.name}</h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            {members.length} member{members.length !== 1 ? 's' : ''}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href={`/classroom/${slug}/leaderboard`}
            className={cn(buttonVariants({ variant: 'outline', size: 'sm' }))}>
            Leaderboard
          </Link>
          {cohort.status === 'active' && (
            <Link href={`/classroom/${slug}/submit`}
              className={cn(buttonVariants({ size: 'sm' }))}>
              Submit
            </Link>
          )}
        </div>
      </div>

      {/* Join code — shown only to instructors/owner */}
      {isOwner && cohort.join_code && (
        <div className="rounded-lg border bg-muted/30 p-4 mb-8 flex flex-col sm:flex-row sm:items-center gap-3 justify-between">
          <div>
            <p className="text-xs font-semibold text-muted-foreground uppercase tracking-widest mb-1">
              Join code
            </p>
            <p className="text-sm text-muted-foreground">
              Share this code with students so they can join at{' '}
              <span className="font-mono text-foreground">/classroom/{slug}/join</span>.
            </p>
          </div>
          <code className="font-mono text-xl font-bold tracking-widest px-4 py-2 bg-background rounded-lg border shrink-0">
            {cohort.join_code}
          </code>
        </div>
      )}

      {/* Instructors */}
      {instructors.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
            Instructors
          </h2>
          <div className="rounded-xl border overflow-hidden divide-y">
            {instructors.map(m => (
              <MemberRow key={m.profiles?.id} member={m} bestOOS={bestOOS} />
            ))}
          </div>
        </section>
      )}

      {/* Students */}
      <section>
        <h2 className="text-xs font-semibold tracking-widest text-muted-foreground uppercase mb-3">
          Students ({students.length})
        </h2>
        {students.length > 0 ? (
          <div className="rounded-xl border overflow-hidden divide-y">
            {students
              .sort((a, b) => {
                const oa = bestOOS.get(a.profiles?.id ?? '') ?? null
                const ob = bestOOS.get(b.profiles?.id ?? '') ?? null
                if (oa == null && ob == null) return 0
                if (oa == null) return 1
                if (ob == null) return -1
                return ob - oa
              })
              .map(m => (
                <MemberRow key={m.profiles?.id} member={m} bestOOS={bestOOS} />
              ))}
          </div>
        ) : (
          <div className="rounded-xl border p-8 text-center text-sm text-muted-foreground">
            No students yet.{isOwner && cohort.join_code && (
              <> Share the join code above to invite them.</>
            )}
          </div>
        )}
      </section>
    </div>
  )
}

type MemberRowProps = {
  member: {
    role: string
    joined_at: string
    profiles: {
      id: string
      username: string
      display_name: string | null
      github_username: string | null
      university: string | null
    } | null
  }
  bestOOS: Map<string, number | null>
}

function MemberRow({ member, bestOOS }: MemberRowProps) {
  const p = member.profiles
  if (!p) return null
  const oos = bestOOS.get(p.id) ?? null
  return (
    <div className="flex items-center gap-4 px-4 py-3 hover:bg-muted/30 transition-colors">
      <Avatar username={p.username} displayName={p.display_name} githubUsername={p.github_username} size={36} />
      <div className="flex-1 min-w-0">
        <Link href={`/profile/${p.username}`}
          className="text-sm font-medium hover:text-primary transition-colors">
          {p.display_name ?? p.username}
        </Link>
        <p className="text-xs text-muted-foreground">@{p.username}</p>
        {p.university && (
          <p className="text-xs text-muted-foreground truncate">{p.university}</p>
        )}
      </div>
      <div className="text-right shrink-0">
        {oos != null ? (
          <p className={`text-sm font-mono font-semibold ${oos > 0 ? 'text-emerald-600' : 'text-red-500'}`}>
            {oos > 0 ? '+' : ''}{oos.toFixed(3)}
          </p>
        ) : (
          <p className="text-xs text-muted-foreground">no submission</p>
        )}
        <p className="text-xs text-muted-foreground">OOS Sharpe</p>
      </div>
      <div className="text-right shrink-0 hidden sm:block">
        <p className="text-xs text-muted-foreground">
          {new Date(member.joined_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
        </p>
      </div>
    </div>
  )
}
