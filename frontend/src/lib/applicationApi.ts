import { apiClient } from './apiClient'
import type { Application, ApplicationStatus, TimelineStep } from './types'

interface ApiDoc {
  id: string
  doc_type: string
  file_name: string | null
  verification_status: Application['documents'][number]['verificationStatus']
  extracted_fields: Record<string, string | number> | null
  checks: { check_name: string; result: 'pass' | 'warn' | 'fail'; detail: Record<string, number> | null }[]
}

interface ApiApplication {
  id: string
  code: string
  status: ApplicationStatus
  current_step: number
  eligibility_score: number | null
  risk_score: number | null
  ai_flagged: boolean
  submitted_at: string | null
  updated_at: string
  scholarship: { id: string; name: string; slug: string }
  form_data?: Record<string, unknown> | null
  student_name?: string | null
  documents?: ApiDoc[]
  eligibility_result?: {
    academic_score: number | null
    income_eligible: boolean | null
    documents_ok: boolean | null
    overall_score: number | null
    verdict: string | null
  } | null
  ai_analysis?: {
    summary_points: string[] | null
    issues: { type: string; severity: string; detail: string }[] | null
    risk: string | null
    confidence: number | null
    recommendation: string | null
  } | null
  history?: {
    action: string
    remark: string | null
    to_status: string | null
    created_at: string
  }[]
  timeline?: TimelineStep[]
}

const PROGRESS: Record<ApplicationStatus, number> = {
  draft: 20,
  submitted: 40,
  ai_verification: 55,
  under_review: 78,
  correction_requested: 60,
  approved: 100,
  rejected: 100,
}

function mapApp(a: ApiApplication): Application {
  return {
    id: a.id,
    code: a.code,
    studentName: a.student_name ?? '',
    scholarshipId: a.scholarship.id,
    scholarshipName: a.scholarship.name,
    category: 'Other',
    status: a.status,
    progress: PROGRESS[a.status] ?? 20,
    eligibilityScore: a.eligibility_score ?? 0,
    riskScore: a.risk_score ?? 0,
    aiFlagged: a.ai_flagged,
    submittedAt: a.submitted_at ?? undefined,
    updatedAt: (a.updated_at ?? '').slice(0, 10),
    formData: a.form_data ?? {},
    documents: (a.documents ?? []).map((d) => ({
      id: d.id,
      docType: d.doc_type as Application['documents'][number]['docType'],
      fileName: d.file_name ?? '',
      verificationStatus: d.verification_status,
      extractedFields: d.extracted_fields ?? {},
      checks: d.checks.map((c) => ({
        checkName: c.check_name,
        result: c.result,
        detail: c.detail ?? undefined,
      })),
    })),
    ai: a.ai_analysis
      ? {
          summaryPoints: a.ai_analysis.summary_points ?? [],
          issues: (a.ai_analysis.issues ?? []).map((i) => ({
            type: i.type,
            severity: (i.severity as 'LOW' | 'MEDIUM' | 'HIGH') ?? 'MEDIUM',
            detail: i.detail,
          })),
          risk: (a.ai_analysis.risk as 'LOW' | 'MEDIUM' | 'HIGH') ?? 'LOW',
          confidence: a.ai_analysis.confidence ?? 0,
          recommendation: a.ai_analysis.recommendation ?? '',
        }
      : undefined,
    eligibility: a.eligibility_result
      ? {
          academicScore: a.eligibility_result.academic_score ?? 0,
          incomeEligible: !!a.eligibility_result.income_eligible,
          documentsOk: !!a.eligibility_result.documents_ok,
          otherCriteriaOk: true,
          overallScore: a.eligibility_result.overall_score ?? 0,
          verdict:
            (a.eligibility_result.verdict as 'likely_eligible' | 'borderline' | 'unlikely') ??
            'borderline',
        }
      : undefined,
    timeline: a.timeline ?? [],
    history: (a.history ?? []).map((h) => ({
      actor: 'System',
      action: h.action + (h.remark ? ` — ${h.remark}` : ''),
      at: h.created_at.slice(0, 10),
    })),
  }
}

export const applicationApi = {
  async listMine(): Promise<Application[]> {
    const { data } = await apiClient.get<ApiApplication[]>('/students/me/applications')
    return data.map(mapApp)
  },
  async get(id: string): Promise<Application | null> {
    try {
      const { data } = await apiClient.get<ApiApplication>(`/applications/${id}`)
      return mapApp(data)
    } catch {
      return null
    }
  },
  async create(scholarshipId: string): Promise<Application> {
    const { data } = await apiClient.post<ApiApplication>('/applications', {
      scholarship_id: scholarshipId,
    })
    return mapApp(data)
  },
  async saveStep(
    id: string,
    body: { current_step?: number; form_data?: Record<string, unknown> },
  ): Promise<Application> {
    const { data } = await apiClient.put<ApiApplication>(`/applications/${id}`, body)
    return mapApp(data)
  },
  async uploadDocument(
    id: string,
    docType: string,
    file: File | Blob,
    extractedIncome?: number,
  ): Promise<{ verificationStatus: string; extractedFields: Record<string, string | number> }> {
    const fd = new FormData()
    fd.append('doc_type', docType)
    fd.append('file', file, file instanceof File ? file.name : `${docType}.txt`)
    if (extractedIncome !== undefined) fd.append('extracted_income', String(extractedIncome))
    const { data } = await apiClient.post<{
      verification_status: string
      extracted_fields: Record<string, string | number>
    }>(`/applications/${id}/documents`, fd)
    return { verificationStatus: data.verification_status, extractedFields: data.extracted_fields ?? {} }
  },
  async submit(id: string): Promise<Application> {
    const { data } = await apiClient.post<ApiApplication>(`/applications/${id}/submit`)
    return mapApp(data)
  },
}
