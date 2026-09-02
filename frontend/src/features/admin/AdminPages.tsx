import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/mockApi'
import { scholarshipApi } from '@/lib/scholarshipApi'
import { apiError } from '@/lib/apiClient'
import { inr } from '@/lib/cn'
import { Badge, Button, Card, CardTitle, Field, Input, Select } from '@/components/ui'

const slugify = (s: string) =>
  s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

export function AdminScholarships() {
  const qc = useQueryClient()
  const { data } = useQuery({
    queryKey: ['scholarships', '', 'All'],
    queryFn: () => api.listScholarships(),
  })
  const { data: cats } = useQuery({ queryKey: ['categories'], queryFn: scholarshipApi.categories })

  const [open, setOpen] = useState(false)
  const [error, setError] = useState('')
  const [form, setForm] = useState({ name: '', provider: '', amount_max: '', category_id: '', close_on: '' })

  const create = useMutation({
    mutationFn: () =>
      scholarshipApi.create({
        name: form.name,
        slug: slugify(form.name),
        provider: form.provider || undefined,
        amount_max: form.amount_max ? Number(form.amount_max) : undefined,
        category_id: form.category_id || undefined,
        close_on: form.close_on || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['scholarships'] })
      setOpen(false)
      setForm({ name: '', provider: '', amount_max: '', category_id: '', close_on: '' })
      setError('')
    },
    onError: (e) => setError(apiError(e, 'Could not create scholarship')),
  })

  const remove = useMutation({
    mutationFn: (id: string) => scholarshipApi.remove(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['scholarships'] }),
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-primary">Scholarships</h1>
        <Button size="sm" onClick={() => setOpen((o) => !o)}>
          {open ? 'Cancel' : 'New scholarship'}
        </Button>
      </div>

      {open && (
        <Card>
          <CardTitle>New scholarship</CardTitle>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Name">
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </Field>
            <Field label="Provider">
              <Input value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} />
            </Field>
            <Field label="Max amount (₹)">
              <Input
                type="number"
                value={form.amount_max}
                onChange={(e) => setForm({ ...form, amount_max: e.target.value })}
              />
            </Field>
            <Field label="Category">
              <Select
                value={form.category_id}
                onChange={(e) => setForm({ ...form, category_id: e.target.value })}
              >
                <option value="">— none —</option>
                {(cats ?? []).map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </Select>
            </Field>
            <Field label="Closes on">
              <Input
                type="date"
                value={form.close_on}
                onChange={(e) => setForm({ ...form, close_on: e.target.value })}
              />
            </Field>
          </div>
          {error && <p className="mt-3 text-sm text-danger">{error}</p>}
          <Button
            className="mt-4"
            disabled={!form.name || create.isPending}
            onClick={() => create.mutate()}
          >
            {create.isPending ? 'Creating…' : 'Create scholarship'}
          </Button>
        </Card>
      )}

      <Card>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
              <th className="py-2">Name</th>
              <th>Category</th>
              <th>Max amount</th>
              <th>Closes</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {(data ?? []).map((s) => (
              <tr key={s.id} className="border-b border-gray-100">
                <td className="py-3 font-medium text-primary">{s.name}</td>
                <td><Badge>{s.category}</Badge></td>
                <td>{inr(s.amountMax)}</td>
                <td>{s.closeOn || '—'}</td>
                <td className="text-right">
                  <button
                    className="text-danger hover:underline disabled:opacity-40"
                    disabled={remove.isPending}
                    onClick={() => {
                      if (confirm(`Delete "${s.name}"?`)) remove.mutate(s.id)
                    }}
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}

const USERS = [
  { name: 'Ramakrishnan G', email: 'student@scholarai.dev', role: 'student', active: true },
  { name: 'Anitha R', email: 'authority@scholarai.dev', role: 'authority', active: true },
  { name: 'Karthik V', email: 'karthik@scholarai.dev', role: 'student', active: true },
  { name: 'Admin User', email: 'admin@scholarai.dev', role: 'admin', active: true },
]

export function AdminUsers() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Users</h1>
      <Card>
        <CardTitle>All users</CardTitle>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
              <th className="py-2">Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
            </tr>
          </thead>
          <tbody>
            {USERS.map((u) => (
              <tr key={u.email} className="border-b border-gray-100">
                <td className="py-3 font-medium text-primary">{u.name}</td>
                <td>{u.email}</td>
                <td className="capitalize">{u.role}</td>
                <td>
                  <Badge tone={u.active ? 'success' : 'neutral'}>
                    {u.active ? 'Active' : 'Disabled'}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </Card>
    </div>
  )
}
