export type CohortType = 'classroom' | 'competition'
export type CohortVisibility = 'private' | 'public'
export type CohortStatus = 'upcoming' | 'active' | 'ended'
export type MemberRole = 'owner' | 'admin' | 'member'
export type SubmissionStatus = 'pending' | 'running' | 'completed' | 'failed'

export interface Profile {
  id: string
  username: string
  display_name: string | null
  university: string | null
  bio: string | null
  created_at: string
}

export interface Cohort {
  id: string
  slug: string
  name: string
  description: string | null
  type: CohortType
  visibility: CohortVisibility
  owner_id: string
  join_code: string | null
  start_date: string | null
  end_date: string | null
  status: CohortStatus
  arena_config: Record<string, unknown>
  market_config: Record<string, unknown>
  created_at: string
}

export interface CohortMember {
  cohort_id: string
  user_id: string
  role: MemberRole
  joined_at: string
  profiles?: Profile
}

export interface Submission {
  id: string
  cohort_id: string
  user_id: string
  strategy_name: string
  code: string
  submitted_at: string
  status: SubmissionStatus
  error_message: string | null
  profiles?: Profile
  grade_reports?: GradeReport[]
}

export interface AlphaDetail {
  feature: string
  planted_bps: number
  corr: number
  discovered: boolean
  signal_ir: number
}

export interface GradeReport {
  id: string
  submission_id: string
  is_sharpe: number | null
  oos_sharpe: number | null
  overfitting_ratio: number | null
  is_max_dd: number | null
  oos_max_dd: number | null
  is_annual_return: number | null
  oos_annual_return: number | null
  is_turnover: number | null
  oos_turnover: number | null
  alphas_discovered: number | null
  total_alphas: number | null
  alpha_details: AlphaDetail[] | null
  noise_loadings: Record<string, number> | null
  graded_at: string
}

export interface ArenaSession {
  id: string
  cohort_id: string | null
  season_name: string | null
  config: Record<string, unknown>
  started_at: string
  ended_at: string | null
}

export interface ArenaRanking {
  session_id: string
  agent_id: string
  user_id: string | null
  tick: number
  pnl_dollars: number
  position: number
  survival_score: number | null
  eliminated: boolean
  updated_at: string
  username?: string
  display_name?: string
  university?: string
  cohort_id?: string
  cohort_name?: string
}
