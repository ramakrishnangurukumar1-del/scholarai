import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/mockApi'
import { Badge, Button, Card, StatusPill } from '@/components/ui'
import { Icon } from '@/components/ui/icons'

export function VerificationQueue() {
  const { data } = useQuery({
    queryKey: ['auth-apps', 'All', 'Flagged', ''],
    queryFn: () => api.authorityApplications('All', 'Flagged', ''),
  })
  const rows = data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Verification Queue</h1>
        <p className="mt-1 text-sm text-gray-500">
          Applications flagged by automated checks for manual verification. The final decision is yours.
        </p>
      </div>

      {rows.length === 0 && (
        <Card><p className="text-sm text-gray-400">No flagged applications right now.</p></Card>
      )}

      <div className="space-y-4">
        {rows.map((a) => (
          <Card key={a.id}>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-medium text-primary">{a.code} · {a.studentName}</p>
                <p className="text-sm text-gray-500">{a.scholarshipName}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge tone="warning">⚑ Flagged</Badge>
                <StatusPill status={a.status} />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <span className="text-xs text-gray-400">
                Eligibility {Math.round(a.eligibilityScore)}% · submitted {a.submittedAt}
              </span>
              <Link to={`/authority/applications/${a.id}`}>
                <Button size="sm">
                  Open review <Icon.arrowRight width={14} height={14} />
                </Button>
              </Link>
            </div>
          </Card>
        ))}
      </div>
    </div>
  )
}
