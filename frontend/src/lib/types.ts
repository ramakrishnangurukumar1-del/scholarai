export type Role = 'student' | 'authority' | 'admin'

export type ApplicationStatus =
  | 'draft'
  | 'submitted'
  | 'ai_verification'
  | 'under_review'
  | 'correction_requested'
  | 'approved'
  | 'rejected'

export type CheckResult = 'pass' | 'warn' | 'fail'
export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH'
export type DocType = 'identity' | 'income_certificate' | 'marksheet' | 'bank' | 'other'

export interface User {
  id: string
  email: string
  role: Role
  fullName: string
}

export interface StudentProfile {
  fullName: string
  email: string
  phone: string
  dateOfBirth: string
  college: string
  course: string
  year: number
  cgpa: number
  annualIncome: number
  familyMembers: number
  incomeSource: string
  profileComplete: boolean
}

export interface Scholarship {
  id: string
  name: string
  slug: string
  category: string
  provider: string
  description: string
  amountMax: number
  courseFilter: string[]
  criteria: { label: string; value: string }[]
  aiMatch?: number
  verdict?: string
  closeOn: string
}

export interface DocVerification {
  checkName: string
  result: CheckResult
  detail?: Record<string, string | number>
}

export interface ApplicationDocument {
  id: string
  docType: DocType
  fileName: string
  verificationStatus: 'pending' | 'scanned' | 'verified' | 'mismatch' | 'failed'
  extractedFields: Record<string, string | number>
  checks: DocVerification[]
}

export interface AiAnalysis {
  summaryPoints: string[]
  issues: { type: string; severity: RiskLevel; detail: string }[]
  risk: RiskLevel
  confidence: number
  recommendation: string
}

export interface EligibilityResult {
  academicScore: number
  incomeEligible: boolean
  documentsOk: boolean
  otherCriteriaOk: boolean
  overallScore: number
  verdict: 'likely_eligible' | 'borderline' | 'unlikely'
}

export interface TimelineStep {
  label: string
  state: 'done' | 'current' | 'todo'
  at?: string
}

export interface Application {
  id: string
  code: string
  studentName: string
  scholarshipId: string
  scholarshipName: string
  category: Scholarship['category']
  status: ApplicationStatus
  progress: number
  eligibilityScore: number
  riskScore: number
  aiFlagged: boolean
  submittedAt?: string
  updatedAt: string
  formData: Record<string, unknown>
  documents: ApplicationDocument[]
  ai?: AiAnalysis
  eligibility?: EligibilityResult
  timeline: TimelineStep[]
  history: { actor: string; action: string; remark?: string; at: string }[]
}

export interface Notification {
  id: string
  title: string
  body: string
  at: string
  isRead: boolean
}
