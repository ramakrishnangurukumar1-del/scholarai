import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/mockApi'
import { cn } from '@/lib/cn'
import { Badge, Card, Input, StatusPill } from '@/components/ui'

const STATUS = ['All', 'submitted', 'ai_verification', 'under_review', 'approved', 'rejected']
const AI = ['All', 'Flagged', 'Clean']

export function ApplicationsTable() {
  const [status, setStatus] = useState('All')
  const [ai, setAi] = useState('All')
  const [q, setQ] = useState('')
  const { data } = useQuery({
    queryKey: ['auth-apps', status, ai, q],
    queryFn: () => api.authorityApplications(status, ai, q),
  })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Applications</h1>

      <div className="flex flex-wrap items-center gap-3">
        <div className="w-56">
          <Input placeholder="Search code or student…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <Select value={status} onChange={setStatus} options={STATUS} />
        <Select value={ai} onChange={setAi} options={AI} />
      </div>

      <Card>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
                <th className="py-2">Application</th>
                <th>Student</th>
                <th>Scholarship</th>
                <th>Status</th>
                <th>Verification</th>
                <th>Eligibility</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(data ?? []).map((a) => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="py-3 font-medium text-primary">{a.code}</td>
                  <td>{a.studentName}</td>
                  <td>{a.scholarshipName}</td>
                  <td><StatusPill status={a.status} /></td>
                  <td>
                    {a.aiFlagged ? (
                      <Badge tone="warning">⚠ Flagged</Badge>
                    ) : (
                      <Badge tone="success">✓ Verified</Badge>
                    )}
                  </td>
                  <td>{a.eligibilityScore || '—'}%</td>
                  <td>
                    <Link to={`/authority/applications/${a.id}`} className="text-ai">Review →</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  )
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string
  onChange: (v: string) => void
  options: string[]
}) {
  return (
    <div className="flex gap-1">
      {options.map((o) => (
        <button
          key={o}
          onClick={() => onChange(o)}
          className={cn(
            'rounded-full px-3 py-1.5 text-xs font-medium capitalize',
            value === o ? 'bg-primary text-white' : 'border border-gray-300 bg-white text-gray-600',
          )}
        >
          {o.replace('_', ' ')}
        </button>
      ))}
    </div>
  )
}
