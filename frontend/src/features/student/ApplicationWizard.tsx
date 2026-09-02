import { useEffect, useRef, useState } from 'react'
import { useMutation, useQuery } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import { api } from '@/lib/mockApi'
import { apiError } from '@/lib/apiClient'
import { cn, inr } from '@/lib/cn'
import { Badge, Button, Field, Input, Ring, Select } from '@/components/ui'
import { Icon } from '@/components/ui/icons'

const STEPS = ['Personal Details', 'Academic Details', 'Financial Details', 'Documents', 'Review', 'Submit']

type Form = {
  fullName: string; email: string; phone: string; dob: string
  gender: string; category: string; college: string; course: string; year: string
  cgpa: string; marks12: string; attendance: string
  annualIncome: string; familyMembers: string; incomeSource: string
}

const DOC_UPLOADS = [
  { type: 'identity', label: 'Aadhaar Card', file: 'aadhaar.pdf' },
  { type: 'income_certificate', label: 'Income Certificate', file: 'income.pdf' },
  { type: 'marksheet', label: 'Marksheet 12th', file: '12th_marksheet.pdf' },
  { type: 'bank', label: 'Bank Passbook', file: 'bank.pdf' },
]

function toFormData(f: Form): Record<string, unknown> {
  return {
    full_name: f.fullName,
    phone: f.phone,
    dob: f.dob || null,
    gender: f.gender,
    category: f.category,
    college: f.college,
    course: f.course,
    year: f.year ? Number(f.year) : null,
    cgpa: f.cgpa ? Number(f.cgpa) : null,
    marks12: f.marks12,
    attendance: f.attendance,
    annual_income: f.annualIncome ? Number(f.annualIncome) : null,
    family_members: f.familyMembers ? Number(f.familyMembers) : null,
    income_source: f.incomeSource,
  }
}

export function ApplicationWizard() {
  const { scholarshipId = '' } = useParams()
  const navigate = useNavigate()
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: () => api.getProfile() })
  const { data: scholarship } = useQuery({
    queryKey: ['scholarship', scholarshipId],
    queryFn: () => api.getScholarship(scholarshipId),
  })

  const [appId, setAppId] = useState<string | null>(null)
  const [step, setStep] = useState(0)
  const [docsSubView, setDocsSubView] = useState<'upload' | 'verify'>('upload')
  const [mismatch, setMismatch] = useState(false)
  const [error, setError] = useState('')
  const [docState, setDocState] = useState<
    Record<string, { name: string; status: string; fields: Record<string, string | number> }>
  >({})
  const [uploading, setUploading] = useState<string | null>(null)
  const uploaded = ['identity', 'income_certificate', 'marksheet'].every((t) => docState[t])
  const [form, setForm] = useState<Form>({
    fullName: '', email: '', phone: '', dob: '', gender: 'Male', category: 'General',
    college: '', course: '', year: '', cgpa: '', marks12: '', attendance: '',
    annualIncome: '', familyMembers: '', incomeSource: '',
  })

  // create / resume the draft once
  const created = useRef(false)
  useEffect(() => {
    if (created.current || !scholarshipId) return
    created.current = true
    api
      .createApplication(scholarshipId)
      .then((a) => setAppId(a.id))
      .catch((e) => setError(apiError(e, 'Could not start application')))
  }, [scholarshipId])

  useEffect(() => {
    if (profile && !form.fullName) {
      setForm((f) => ({
        ...f,
        fullName: profile.fullName, email: profile.email, phone: profile.phone,
        dob: profile.dateOfBirth, college: profile.college, course: profile.course,
        year: String(profile.year || ''), cgpa: String(profile.cgpa || ''),
        annualIncome: String(profile.annualIncome || ''),
        familyMembers: String(profile.familyMembers || ''),
        incomeSource: profile.incomeSource,
      }))
    }
  }, [profile]) // eslint-disable-line react-hooks/exhaustive-deps

  const setF = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const declared = Number(form.annualIncome || 0)

  const saveStep = useMutation({
    mutationFn: (nextStep: number) =>
      api.saveApplicationStep(appId!, { current_step: nextStep + 1, form_data: toFormData(form) }),
  })

  const uploadOne = async (docType: string, file: File | Blob, name: string) => {
    if (!appId) return
    setError('')
    setUploading(docType)
    try {
      const inc =
        docType === 'income_certificate' && !(file instanceof File) && mismatch ? 240000 : undefined
      const res = await api.uploadApplicationDoc(appId, docType, file, inc)
      setDocState((s) => ({
        ...s,
        [docType]: { name, status: res.verificationStatus, fields: res.extractedFields },
      }))
    } catch (e) {
      setError(apiError(e, 'Upload failed'))
    } finally {
      setUploading(null)
    }
  }

  const fillDemoDocs = async () => {
    for (const d of DOC_UPLOADS) {
      const income = d.type === 'income_certificate' ? (mismatch ? 240000 : declared) : null
      const body =
        d.type === 'income_certificate'
          ? `INCOME CERTIFICATE\nName: ${form.fullName}\nAnnual Income: Rs ${income}\nCertificate No: TN${Math.floor(Math.random() * 900000)}`
          : `ScholarAI demo document — ${d.label}\nName: ${form.fullName}`
      await uploadOne(d.type, new Blob([body], { type: 'text/plain' }), d.file)
    }
  }

  const submit = useMutation({
    mutationFn: () => api.submitApplication(appId!),
    onSuccess: (a) => navigate(`/app/applications/${a.id}`),
    onError: (e) => setError(apiError(e, 'Could not submit')),
  })

  const next = async () => {
    setError('')
    if (step === 3 && docsSubView === 'upload') {
      if (uploaded) setDocsSubView('verify')
      return
    }
    if (step === 5) {
      submit.mutate()
      return
    }
    if (appId && step <= 2) await saveStep.mutateAsync(step).catch(() => {})
    setStep((s) => Math.min(STEPS.length - 1, s + 1))
  }
  const prev = () => {
    if (step === 3 && docsSubView === 'verify') {
      setDocsSubView('upload')
      return
    }
    setStep((s) => Math.max(0, s - 1))
  }

  const heading = step === 3 && docsSubView === 'verify' ? 'Verification Result (preview)' : STEPS[step]
  const busy = saveStep.isPending || submit.isPending || uploading !== null

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-primary">
        Apply for {scholarship?.name ?? 'Scholarship'}
      </h1>

      <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
        <div className="grid lg:grid-cols-[240px_1fr]">
          <ol className="space-y-1 border-b border-gray-200 bg-bg-subtle p-5 lg:border-b-0 lg:border-r">
            {STEPS.map((s, i) => {
              const state = i < step ? 'done' : i === step ? 'current' : 'todo'
              return (
                <li key={s} className="flex items-center gap-3 py-2">
                  <span
                    className={cn(
                      'grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-semibold',
                      state === 'done' && 'bg-ai text-white',
                      state === 'current' && 'bg-ai text-white ring-4 ring-ai/20',
                      state === 'todo' && 'border border-gray-300 bg-white text-gray-400',
                    )}
                  >
                    {state === 'done' ? <Icon.check width={13} height={13} /> : String(i + 1).padStart(2, '0')}
                  </span>
                  <span className={cn('text-sm', state === 'todo' ? 'text-gray-400' : 'font-medium text-primary')}>
                    {s}
                  </span>
                </li>
              )
            })}
          </ol>

          <div className="p-6">
            <div className="mb-5 flex items-start justify-between">
              <h2 className="text-lg font-semibold text-primary">{heading}</h2>
              <span className="text-sm text-gray-400">Step {Math.min(step + 1, 6)} of 6</span>
            </div>

            {step === 0 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Full Name"><Input value={form.fullName} onChange={setF('fullName')} /></Field>
                <Field label="Email"><Input value={form.email} onChange={setF('email')} /></Field>
                <Field label="Phone Number"><Input value={form.phone} onChange={setF('phone')} /></Field>
                <Field label="Date of Birth"><Input type="date" value={form.dob} onChange={setF('dob')} /></Field>
                <Field label="Gender">
                  <Select value={form.gender} onChange={setF('gender')}>
                    <option>Male</option><option>Female</option><option>Other</option>
                  </Select>
                </Field>
                <Field label="Category">
                  <Select value={form.category} onChange={setF('category')}>
                    <option>General</option><option>OBC</option><option>SC</option><option>ST</option>
                  </Select>
                </Field>
                <Field label="College / University"><Input value={form.college} onChange={setF('college')} /></Field>
                <Field label="Course"><Input value={form.course} onChange={setF('course')} /></Field>
              </div>
            )}

            {step === 1 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Current CGPA"><Input value={form.cgpa} onChange={setF('cgpa')} /></Field>
                <Field label="12th Percentage"><Input value={form.marks12} onChange={setF('marks12')} /></Field>
                <Field label="Attendance %"><Input value={form.attendance} onChange={setF('attendance')} /></Field>
                <Field label="Year of Study"><Input value={form.year} onChange={setF('year')} /></Field>
              </div>
            )}

            {step === 2 && (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Annual Family Income (₹)"><Input value={form.annualIncome} onChange={setF('annualIncome')} /></Field>
                <Field label="Family Members"><Input value={form.familyMembers} onChange={setF('familyMembers')} /></Field>
                <Field label="Income Source"><Input value={form.incomeSource} onChange={setF('incomeSource')} /></Field>
              </div>
            )}

            {step === 3 && docsSubView === 'upload' && (
              <div className="space-y-4">
                <p className="text-sm text-gray-500">
                  Upload each document (PDF, JPG or PNG). Uploaded files are scanned with OCR and the
                  key details are extracted automatically.
                </p>

                <div className="divide-y divide-gray-100 rounded-lg border border-gray-200">
                  {DOC_UPLOADS.map((d) => {
                    const st = docState[d.type]
                    const income = st?.fields?.income
                    return (
                      <div key={d.type} className="px-4 py-3">
                        <div className="flex items-center gap-3 text-sm">
                          <Icon.file width={16} height={16} className="text-ai" />
                          <span className="font-medium text-gray-700">{d.label}</span>
                          {d.type === 'bank' && (
                            <span className="text-xs text-gray-400">(optional)</span>
                          )}
                          <div className="ml-auto flex items-center gap-2">
                            {st ? (
                              <span className="text-xs font-medium text-success">✓ {st.name}</span>
                            ) : (
                              <label className="cursor-pointer rounded-md border border-gray-300 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-ai hover:text-ai">
                                {uploading === d.type ? 'Reading…' : 'Choose file'}
                                <input
                                  type="file"
                                  accept="image/png,image/jpeg,application/pdf,text/plain"
                                  className="hidden"
                                  disabled={!appId || uploading !== null}
                                  onChange={(e) => {
                                    const f = e.target.files?.[0]
                                    if (f) uploadOne(d.type, f, f.name)
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
                        {st && Object.keys(st.fields).length > 0 && (
                          <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                            {Object.entries(st.fields)
                              .filter(([k]) => k !== 'income_source')
                              .map(([k, v]) => (
                                <Badge key={k} tone={k === 'income' ? 'ai' : 'neutral'}>
                                  {k}: {k === 'income' ? inr(Number(v)) : String(v)}
                                </Badge>
                              ))}
                            {income != null && (
                              <span className="text-xs text-gray-400">
                                {st.fields.income_source === 'ocr' ? 'read by OCR' : 'from your form'}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                </div>

                <div className="rounded-lg bg-bg-subtle p-3">
                  <label className="flex items-center gap-2 text-xs text-gray-500">
                    <input
                      type="checkbox"
                      checked={mismatch}
                      onChange={(e) => setMismatch(e.target.checked)}
                    />
                    Demo mode: fill with sample documents (income certificate reads {inr(240000)} to
                    trigger a mismatch)
                  </label>
                  <Button
                    variant="secondary"
                    size="sm"
                    className="mt-2"
                    disabled={!appId || uploading !== null}
                    onClick={fillDemoDocs}
                  >
                    {uploading ? 'Uploading…' : 'Fill with demo documents'}
                  </Button>
                </div>
              </div>
            )}

            {step === 3 && docsSubView === 'verify' && (() => {
              const docIncome = Number(docState.income_certificate?.fields?.income ?? declared)
              const willFlag = Math.abs(docIncome - declared) >= 1
              return (
                <div className="space-y-5">
                  <div className="rounded-lg bg-ai-soft/50 p-3 text-xs text-ai">
                    This is a preview. The authoritative verification runs when you submit.
                  </div>
                  <div className="grid gap-6 rounded-xl bg-bg-subtle p-5 sm:grid-cols-[auto_1fr]">
                    <Ring value={92} size={96} tone={willFlag ? 'warning' : 'success'} />
                    <div className="self-center">
                      <p className="text-xs font-medium uppercase text-gray-500">Overall Verification Score</p>
                      <p className="mt-1 text-lg font-semibold text-primary">
                        {willFlag ? 'Needs Attention' : 'High Confidence'}
                      </p>
                      <p className="text-sm text-gray-500">
                        {willFlag
                          ? 'One document needs manual verification.'
                          : 'Your application looks good!'}
                      </p>
                    </div>
                  </div>

                  {willFlag && (
                    <div className="rounded-xl border border-warning/30 bg-warning-soft/60 p-5">
                      <p className="flex items-center gap-2 font-semibold text-warning">
                        <Icon.alert width={16} height={16} /> Income Certificate Mismatch
                      </p>
                      <div className="mt-4 grid gap-4 sm:grid-cols-3">
                        <div>
                          <p className="text-xs text-gray-500">Declared Income</p>
                          <p className="text-lg font-bold text-primary">{inr(declared)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Document Income (OCR)</p>
                          <p className="text-lg font-bold text-primary">{inr(docIncome)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Recommendation</p>
                          <p className="text-sm font-medium text-warning">Manual verification required.</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )
            })()}

            {step === 4 && (
              <div className="space-y-3 text-sm">
                <RevRow label="Name" value={form.fullName} />
                <RevRow label="Course / Year" value={`${form.course} · Year ${form.year}`} />
                <RevRow label="CGPA" value={form.cgpa} />
                <RevRow label="Declared annual income" value={inr(declared)} />
                <RevRow label="Documents uploaded" value={String(Object.keys(docState).length)} />
              </div>
            )}

            {step === 5 && (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">
                  By submitting you confirm the information is accurate. Documents are verified
                  automatically, then an authority reviews your application.
                </p>
                <Badge tone="ai">Verification runs on submit</Badge>
              </div>
            )}

            {error && <p className="mt-4 text-sm text-danger">{error}</p>}

            <div className="mt-8 flex items-center justify-between border-t border-gray-100 pt-4">
              {step === 0 && docsSubView === 'upload' ? (
                <Button variant="secondary" onClick={() => navigate('/app/applications')}>Save &amp; Exit</Button>
              ) : (
                <Button variant="ghost" onClick={prev}>← Previous</Button>
              )}
              <Button
                onClick={next}
                disabled={busy || !appId || (step === 3 && docsSubView === 'upload' && !uploaded)}
              >
                {submit.isPending
                  ? 'Submitting…'
                  : step === 5
                    ? 'Submit Application'
                    : 'Next Step →'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function RevRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-gray-100 pb-2">
      <span className="text-gray-500">{label}</span>
      <span className="font-medium text-primary">{value}</span>
    </div>
  )
}
