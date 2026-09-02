import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/mockApi'
import { inr } from '@/lib/cn'
import { Badge, Button, Card, CardTitle } from '@/components/ui'

export function ScholarshipDetail() {
  const { id = '' } = useParams()
  const { data: s } = useQuery({ queryKey: ['scholarship', id], queryFn: () => api.getScholarship(id) })

  if (!s) return <p className="text-sm text-gray-500">Loading…</p>

  return (
    <div className="space-y-6">
      <Link to="/app/scholarships" className="text-sm text-ai">← Back to scholarships</Link>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="flex flex-wrap items-center gap-2">
              <Badge>{s.category}</Badge>
              <Badge tone="ai">Profile Match {s.aiMatch}%</Badge>
            </div>
            <h1 className="mt-3 text-2xl font-bold text-primary">{s.name}</h1>
            <p className="mt-1 text-sm text-gray-500">Provided by {s.provider}</p>
            <p className="mt-4 text-gray-700">{s.description}</p>
            <p className="mt-4 text-xl font-bold text-primary">Award up to {inr(s.amountMax)}</p>
          </Card>

          <Card>
            <CardTitle>Eligibility criteria</CardTitle>
            <ul className="space-y-2">
              {s.criteria.map((c) => (
                <li key={c.label} className="flex justify-between text-sm">
                  <span className="text-gray-600">{c.label}</span>
                  <span className="font-medium text-primary">{c.value}</span>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        <Card className="h-fit">
          <CardTitle>Your eligibility (estimate)</CardTitle>
          {s.aiMatch === undefined ? (
            <p className="text-sm text-gray-500">
              Complete your <Link to="/app/profile" className="text-ai">profile</Link> to see your
              eligibility estimate.
            </p>
          ) : (
            <>
              <p className="text-3xl font-bold text-ai">{Math.round(s.aiMatch)}%</p>
              <p className="mt-1 text-sm capitalize text-gray-500">
                {(s.verdict ?? '').replace('_', ' ') || 'Based on your profile'}
              </p>
            </>
          )}
          <Link to={`/app/apply/${s.id}`}>
            <Button className="mt-5 w-full">Apply now</Button>
          </Link>
          {s.closeOn && <p className="mt-3 text-xs text-gray-400">Closes on {s.closeOn}</p>}
        </Card>
      </div>
    </div>
  )
}
