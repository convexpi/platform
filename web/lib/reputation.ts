/**
 * reputation.ts — community reputation + badges.
 *
 * Reputation is a persistent points ledger (public.contributions) aggregated by the
 * contributor_reputation view. Badges are derived from the per-kind counts. The ethos: reward
 * intellectual honesty (finding a dead factor counts), not just activity.
 */

export interface RepRow {
  contributor: string
  github_username: string | null
  user_id: string | null
  reputation: number
  n_contributions: number
  n_replications: number
  n_wiki: number
  n_submissions: number
  n_survivor: number
  n_ghost: number
  n_podium: number
}

export type BadgeTier = 'bronze' | 'silver' | 'gold' | 'special'

export interface Badge {
  key: string
  label: string
  tier: BadgeTier
  desc: string
}

const TIER_RANK: Record<BadgeTier, number> = { special: 0, gold: 1, silver: 2, bronze: 3 }

export function badgesFor(r: RepRow): Badge[] {
  const b: Badge[] = []
  const add = (key: string, label: string, tier: BadgeTier, desc: string) =>
    b.push({ key, label, tier, desc })

  // Replications
  if (r.n_replications >= 15) add('cartographer', 'Cartographer', 'gold', '15+ strategy replications contributed')
  else if (r.n_replications >= 5) add('anomaly-hunter', 'Anomaly Hunter', 'silver', '5+ strategy replications contributed')
  else if (r.n_replications >= 1) add('replicator', 'Replicator', 'bronze', 'Contributed a reference replication')

  // Wikis
  if (r.n_wiki >= 10) add('librarian-ii', 'Librarian II', 'silver', '10+ paper wikis written or improved')
  else if (r.n_wiki >= 1) add('librarian', 'Librarian', 'bronze', 'Wrote or improved a paper wiki')

  // Submissions / OOS
  if (r.n_submissions >= 1) add('contender', 'Contender', 'bronze', 'Submitted a graded strategy')
  if (r.n_survivor >= 1) add('survivor', 'Survivor', 'silver', 'A strategy posted a positive out-of-sample Sharpe')
  if (r.n_podium >= 1) add('oos-champion', 'OOS Champion', 'gold', 'Finished on a competition-season podium')

  // The fun, on-theme one: you found a dead/fading factor.
  if (r.n_ghost >= 1) add('ghostbuster', 'Ghostbuster', 'special', 'Replicated a factor that turned out dead or fading')

  return b.sort((x, y) => TIER_RANK[x.tier] - TIER_RANK[y.tier])
}

export const TIER_STYLE: Record<BadgeTier, string> = {
  special: 'bg-violet-100 text-violet-700 ring-violet-200',
  gold: 'bg-amber-100 text-amber-700 ring-amber-200',
  silver: 'bg-slate-200 text-slate-700 ring-slate-300',
  bronze: 'bg-orange-100 text-orange-700 ring-orange-200',
}

/** How reputation is earned — shown on the contributors page. */
export const POINT_RULES: { action: string; points: string }[] = [
  { action: 'Merge a strategy replication', points: '+50' },
  { action: 'Replicate a factor that turns out dead/fading (Ghostbuster)', points: '+10' },
  { action: 'Write or improve a paper wiki', points: '+10' },
  { action: 'A strategy survives out-of-sample', points: '+15' },
  { action: 'Submit a graded strategy', points: '+2' },
]
