import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/mockApi'
import { Badge, Button, Card, CardTitle, Pipeline, StatCard } from '@/components/ui'

export function AuthorityDashboard() {
  const dash = useQuery({ queryKey: ['auth-dash'], queryFn: api.authorityDashboard })
  const apps = useQuery({ queryKey: ['auth-apps', 'recent'], queryFn: () => api.authorityApplications() })
  const t = dash.data?.totals

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">Authority Dashboard</h1>

      <div className="grid gap-4 sm:grid-cols-3 lg:grid-cols-5">
        <StatCard label="Total Applications" value={t ? t.total.toLocaleString() : '—'} />
        <StatCard label="Pending Review" value={t?.pending ?? '—'} />
        <StatCard label="Flagged" value={t?.flagged ?? '—'} />
        <StatCard label="Approved" value={t?.approved ?? '—'} />
        <StatCard label="Rejected" value={t?.rejected ?? '—'} />
      </div>

      <Card>
        <CardTitle>Application Pipeline</CardTitle>
        <Pipeline
          stages={(dash.data?.pipeline ?? []).map((p, i, arr) => ({
            label: p.label,
            count: p.count,
            done: i === arr.length - 1,
          }))}
        />
      </Card>

      <Card>
        <CardTitle>Recent Applications</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs font-medium uppercase tracking-wide text-gray-400">
                <th className="pb-2">Application ID</th>
                <th>Student</th>
                <th>Scholarship</th>
                <th>Verification</th>
                <th>Submitted On</th>
                <th className="text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {(apps.data ?? []).slice(0, 5).map((a) => (
                <tr key={a.id} className="border-b border-gray-100">
                  <td className="py-3 font-medium text-ai">{a.code}</td>
                  <td>{a.studentName}</td>
                  <td>{a.scholarshipName}</td>
                  <td>
                    {a.aiFlagged ? (
                      <Badge tone="danger">⚑ Flagged</Badge>
                    ) : (
                      <Badge tone="success">✓ Verified</Badge>
                    )}
                  </td>
                  <td className="text-gray-500">{a.submittedAt}</td>
                  <td className="text-right">
                    <Link to={`/authority/applications/${a.id}`}>
                      <Button size="sm" variant="secondary">Review</Button>
                    </Link>
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
