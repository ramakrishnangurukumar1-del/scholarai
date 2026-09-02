import { apiClient } from './apiClient'
import type { Scholarship, StudentProfile } from './types'

interface ApiCategory {
  id: string
  name: string
}
interface ApiCriteria {
  id: string
  field: string
  operator: string
  value: unknown
  weight: number
  required: boolean
}
interface ApiScholarship {
  id: string
  name: string
  slug: string
  description: string | null
  amount_max: number | null
  provider: string | null
  course_filter: string[] | null
  is_active: boolean
  open_from: string | null
  close_on: string | null
  category: ApiCategory | null
  criteria?: ApiCriteria[]
}

const OP_LABEL: Record<string, string> = {
  gte: 'at least',
  lte: 'at most',
  eq: 'equal to',
  in: 'one of',
  between: 'between',
}
const FIELD_LABEL: Record<string, string> = {
  cgpa: 'Minimum CGPA',
  annual_income: 'Annual family income',
  year: 'Year of study',
  course: 'Course',
  attendance: 'Attendance',
}

function criteriaLabel(c: ApiCriteria): { label: string; value: string } {
  const label = FIELD_LABEL[c.field] ?? c.field
  const val = Array.isArray(c.value) ? c.value.join(', ') : String(c.value)
  const prefix =
    c.field === 'annual_income'
      ? c.operator === 'lte'
        ? '≤ ₹'
        : '₹'
      : ''
  const opWord = c.field === 'annual_income' ? '' : `${OP_LABEL[c.operator] ?? c.operator} `
  return { label, value: `${opWord}${prefix}${val}`.trim() }
}

export function mapScholarship(s: ApiScholarship): Scholarship {
  return {
    id: s.id,
    name: s.name,
    slug: s.slug,
    category: s.category?.name ?? 'Other',
    provider: s.provider ?? '',
    description: s.description ?? '',
    amountMax: s.amount_max ?? 0,
    courseFilter: s.course_filter ?? [],
    criteria: (s.criteria ?? []).map(criteriaLabel),
    closeOn: s.close_on ?? '',
  }
}

export interface RecommendationApi {
  id: string
  name: string
  slug: string
  category: string | null
  amount_max: number | null
  match: number
  verdict: string
}

export interface NewScholarship {
  name: string
  slug: string
  category_id?: string
  provider?: string
  description?: string
  amount_max?: number
  course_filter?: string[]
  close_on?: string
}

export const scholarshipApi = {
  async categories(): Promise<ApiCategory[]> {
    const { data } = await apiClient.get<ApiCategory[]>('/scholarship-categories')
    return data
  },

  async create(payload: NewScholarship): Promise<Scholarship> {
    const { data } = await apiClient.post<ApiScholarship>('/scholarships', payload)
    return mapScholarship(data)
  },

  async remove(id: string): Promise<void> {
    await apiClient.delete(`/scholarships/${id}`)
  },

  async list(q = '', category = 'All'): Promise<Scholarship[]> {
    const params: Record<string, string> = {}
    if (q) params.q = q
    if (category && category !== 'All') params.category = category
    const [list, recs] = await Promise.all([
      apiClient.get<ApiScholarship[]>('/scholarships', { params }),
      apiClient
        .get<RecommendationApi[]>('/students/me/recommendations', { params: { limit: 100 } })
        .catch(() => ({ data: [] as RecommendationApi[] })),
    ])
    const matchById = new Map(recs.data.map((r) => [r.id, r.match]))
    return list.data.map((s) => ({ ...mapScholarship(s), aiMatch: matchById.get(s.id) }))
  },

  async get(id: string): Promise<Scholarship | null> {
    try {
      const { data } = await apiClient.get<ApiScholarship>(`/scholarships/${id}`)
      const mapped = mapScholarship(data)
      try {
        const check = await apiClient.post<{ score: number; verdict: string }>(
          `/scholarships/${id}/eligibility-check`,
        )
        mapped.aiMatch = check.data.score
        mapped.verdict = check.data.verdict
      } catch {
        /* profile incomplete or not a student — leave match undefined */
      }
      return mapped
    } catch {
      return null
    }
  },

  async recommendations(limit = 3): Promise<Scholarship[]> {
    const { data } = await apiClient.get<RecommendationApi[]>('/students/me/recommendations', {
      params: { limit },
    })
    return data.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      category: r.category ?? 'Other',
      provider: '',
      description: '',
      amountMax: r.amount_max ?? 0,
      courseFilter: [],
      criteria: [],
      aiMatch: r.match,
      verdict: r.verdict,
      closeOn: '',
    }))
  },
}

interface ApiProfile {
  full_name: string | null
  phone: string | null
  date_of_birth: string | null
  college: string | null
  course: string | null
  year: number | null
  cgpa: number | null
  annual_income: number | null
  family_members: number | null
  income_source: string | null
  profile_complete: boolean
}

function mapProfile(p: ApiProfile, email: string): StudentProfile {
  return {
    fullName: p.full_name ?? '',
    email,
    phone: p.phone ?? '',
    dateOfBirth: p.date_of_birth ?? '',
    college: p.college ?? '',
    course: p.course ?? '',
    year: p.year ?? 0,
    cgpa: p.cgpa ?? 0,
    annualIncome: p.annual_income ?? 0,
    familyMembers: p.family_members ?? 0,
    incomeSource: p.income_source ?? '',
    profileComplete: p.profile_complete,
  }
}

export const profileApi = {
  async get(email = ''): Promise<StudentProfile> {
    const { data } = await apiClient.get<ApiProfile>('/students/me/profile')
    return mapProfile(data, email)
  },
  async update(patch: Partial<StudentProfile>, email = ''): Promise<StudentProfile> {
    const body: Record<string, unknown> = {}
    if (patch.fullName !== undefined) body.full_name = patch.fullName
    if (patch.phone !== undefined) body.phone = patch.phone
    if (patch.dateOfBirth !== undefined) body.date_of_birth = patch.dateOfBirth || null
    if (patch.college !== undefined) body.college = patch.college
    if (patch.course !== undefined) body.course = patch.course
    if (patch.year !== undefined) body.year = patch.year || null
    if (patch.cgpa !== undefined) body.cgpa = patch.cgpa || null
    if (patch.annualIncome !== undefined) body.annual_income = patch.annualIncome || null
    if (patch.familyMembers !== undefined) body.family_members = patch.familyMembers || null
    if (patch.incomeSource !== undefined) body.income_source = patch.incomeSource
    const { data } = await apiClient.put<ApiProfile>('/students/me/profile', body)
    return mapProfile(data, email)
  },
}
