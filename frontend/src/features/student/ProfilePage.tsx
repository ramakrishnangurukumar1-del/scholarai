import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/mockApi'
import { apiError } from '@/lib/apiClient'
import { useAuth } from '@/lib/auth'
import { Button, Card, CardTitle, Field, Input, Ring } from '@/components/ui'
import type { StudentProfile } from '@/lib/types'

const FIELDS: { key: keyof StudentProfile; label: string; type?: string }[] = [
  { key: 'fullName', label: 'Full name' },
  { key: 'phone', label: 'Phone' },
  { key: 'dateOfBirth', label: 'Date of birth', type: 'date' },
  { key: 'college', label: 'College / University' },
  { key: 'course', label: 'Course' },
  { key: 'year', label: 'Year of study', type: 'number' },
  { key: 'cgpa', label: 'CGPA', type: 'number' },
  { key: 'annualIncome', label: 'Annual family income (₹)', type: 'number' },
  { key: 'familyMembers', label: 'Family members', type: 'number' },
  { key: 'incomeSource', label: 'Income source' },
]

const REQUIRED: (keyof StudentProfile)[] = [
  'fullName', 'phone', 'college', 'course', 'year', 'cgpa', 'annualIncome',
]

export function ProfilePage() {
  const { user } = useAuth()
  const qc = useQueryClient()
  const { data } = useQuery({ queryKey: ['profile'], queryFn: () => api.getProfile(user?.email) })
  const [form, setForm] = useState<StudentProfile | null>(null)
  const [msg, setMsg] = useState('')

  useEffect(() => {
    if (data) setForm(data)
  }, [data])

  const save = useMutation({
    mutationFn: (p: StudentProfile) => api.updateProfile(p, user?.email),
    onSuccess: (updated) => {
      setForm(updated)
      setMsg('Profile saved.')
      qc.invalidateQueries({ queryKey: ['profile'] })
      qc.invalidateQueries({ queryKey: ['recs'] })
      qc.invalidateQueries({ queryKey: ['scholarships'] })
    },
    onError: (e) => setMsg(apiError(e, 'Could not save')),
  })

  if (!form) return <p className="text-sm text-gray-500">Loading…</p>

  const filled = REQUIRED.filter((k) => form[k] !== '' && form[k] !== 0 && form[k] != null).length
  const completion = Math.round((filled / REQUIRED.length) * 100)

  const set = (k: keyof StudentProfile, type?: string) => (e: React.ChangeEvent<HTMLInputElement>) => {
    const v = type === 'number' ? Number(e.target.value) : e.target.value
    setForm((f) => (f ? { ...f, [k]: v } : f))
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">My Profile</h1>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="flex h-fit flex-col items-center text-center">
          <CardTitle>Completion</CardTitle>
          <Ring value={completion} size={120} tone={completion === 100 ? 'success' : 'ai'} />
          <p className="mt-3 text-sm text-gray-500">
            A complete profile improves your scholarship match accuracy.
          </p>
        </Card>

        <Card className="lg:col-span-2">
          <CardTitle>Personal &amp; academic details</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Email">
              <Input value={form.email} disabled className="bg-gray-50" />
            </Field>
            {FIELDS.map((f) => (
              <Field key={f.key} label={f.label}>
                <Input
                  type={f.type ?? 'text'}
                  value={
                    form[f.key] === 0 && f.type === 'number' ? '' : String(form[f.key] ?? '')
                  }
                  onChange={set(f.key, f.type)}
                />
              </Field>
            ))}
          </div>
          <div className="mt-5 flex items-center gap-3">
            <Button onClick={() => form && save.mutate(form)} disabled={save.isPending}>
              {save.isPending ? 'Saving…' : 'Save changes'}
            </Button>
            {msg && <span className="text-sm text-gray-500">{msg}</span>}
          </div>
        </Card>
      </div>
    </div>
  )
}
