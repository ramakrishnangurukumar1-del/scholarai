import { apiClient } from './apiClient'
import type { Application } from './types'

interface DashboardApi {
  totals: { total: number; pending: number; flagged: number; approved: number; rejected: number }
  pipeline: { label: string; count: number }[]
}

interface RowApi {
  id: string
  code: string
  status: Application['status']
  ai_flagged: boolean
  eligibility_score: number | null
  risk_score: number | null
  submitted_at: string | null
  student_name: string | null
  scholarship_name: string | null
}

/** Shape the authority table + dashboard rows expect (subset of Application). */
export interface AuthorityRow {
  id: string
  code: string
  status: Application['status']
  aiFlagged: boolean
  eligibilityScore: number
  studentName: string
  scholarshipName: string
  submittedAt: string
}

function mapRow(r: RowApi): AuthorityRow {
  return {
    id: r.id,
    code: r.code,
    status: r.status,
    aiFlagged: r.ai_flagged,
    eligibilityScore: r.eligibility_score ?? 0,
    studentName: r.student_name ?? '',
    scholarshipName: r.scholarship_name ?? '',
    submittedAt: (r.submitted_at ?? '').slice(0, 10),
  }
}

export const authorityApi = {
  async dashboard() {
    const { data } = await apiClient.get<DashboardApi>('/authority/dashboard')
    return { totals: data.totals, pipeline: data.pipeline }
  },
  async applications(status = 'All', aiStatus = 'All', q = ''): Promise<AuthorityRow[]> {
    const params: Record<string, string> = {}
    if (status !== 'All') params.status = status
    if (aiStatus !== 'All') params.ai_status = aiStatus
    if (q) params.q = q
    const { data } = await apiClient.get<RowApi[]>('/authority/applications', { params })
    return data.map(mapRow)
  },
  async decide(id: string, action: string, remark: string) {
    const { data } = await apiClient.post(`/authority/applications/${id}/decision`, {
      action,
      remark: remark || null,
    })
    return data
  },
  async askAssistant(id: string, question: string): Promise<string> {
    const { data } = await apiClient.post<{ answer: string; confidence: number | null }>(
      `/authority/applications/${id}/assistant`,
      { question },
    )
    return data.answer
  },
}
