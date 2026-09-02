import { applicationApi } from './applicationApi'
import { apiClient } from './apiClient'
import { authorityApi } from './authorityApi'
import { profileApi, scholarshipApi } from './scholarshipApi'
import type { Application, StudentProfile } from './types'

/**
 * API layer — every method calls the real FastAPI backend.
 * (Filename kept for import stability; nothing here is mocked any more.)
 */
export const api = {
  // GET /scholarships  — REAL
  listScholarships: (q = '', category = 'All') => scholarshipApi.list(q, category),

  // GET /scholarships/{id}  — REAL
  getScholarship: (id: string) => scholarshipApi.get(id),

  // GET /students/me/profile  — REAL
  getProfile: (email = '') => profileApi.get(email),

  // PUT /students/me/profile  — REAL
  updateProfile: (patch: Partial<StudentProfile>, email = '') => profileApi.update(patch, email),

  // GET /students/me/applications  — REAL
  listMyApplications: () => applicationApi.listMine(),

  // GET /students/me/recommendations  — REAL
  getRecommendations: () => scholarshipApi.recommendations(3),

  // GET /students/me/notifications  — REAL
  listNotifications: async () => {
    const { data } = await apiClient.get<
      { id: string; title: string; body: string; created_at: string; is_read: boolean }[]
    >('/students/me/notifications')
    return data.map((n) => ({
      id: n.id,
      title: n.title,
      body: n.body,
      at: new Date(n.created_at).toLocaleString(),
      isRead: n.is_read,
    }))
  },

  // application lifecycle  — REAL
  getApplication: (id: string) => applicationApi.get(id),
  createApplication: (scholarshipId: string) => applicationApi.create(scholarshipId),
  saveApplicationStep: (
    id: string,
    body: { current_step?: number; form_data?: Record<string, unknown> },
  ) => applicationApi.saveStep(id, body),
  uploadApplicationDoc: (id: string, docType: string, file: File | Blob, extractedIncome?: number) =>
    applicationApi.uploadDocument(id, docType, file, extractedIncome),
  submitApplication: (id: string) => applicationApi.submit(id),

  // GET /applications/{id}/timeline
  getTimeline: async (id: string) => (await applicationApi.get(id))?.timeline ?? [],

  // GET /authority/dashboard  — REAL
  authorityDashboard: () => authorityApi.dashboard(),

  // GET /authority/applications  — REAL
  authorityApplications: (status = 'All', aiStatus = 'All', q = '') =>
    authorityApi.applications(status, aiStatus, q),

  // POST /authority/applications/{id}/decision  — REAL
  decide: (id: string, action: string, remark: string) =>
    authorityApi.decide(id, action, remark),

  // POST /authority/applications/{id}/assistant  — REAL (deterministic, grounded)
  askAssistant: (app: Application, question: string) =>
    authorityApi.askAssistant(app.id, question),

  // GET /analytics  — REAL
  analytics: async () => {
    const { data } = await apiClient.get('/analytics')
    return data as {
      totals: { total: number; approvalRate: number; avgDays: number; accuracy: number }
      counts: { approved: number; rejected: number; flagged: number; pending: number }
      overTime: { label: string; count: number }[]
      byCategory: { label: string; count: number; pct: number }[]
      topScholarships: { name: string; applications: number; approved: number; rate: number }[]
    }
  },
}
