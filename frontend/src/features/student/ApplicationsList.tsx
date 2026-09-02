import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/mockApi'
import { Card, ProgressBar, StatusPill } from '@/components/ui'

export function ApplicationsList() {
  const { data } = useQuery({ queryKey: ['my-apps'], queryFn: api.listMyApplications })

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-primary">My Applications</h1>
      <div className="space-y-4">
        {(data ?? []).map((a) => (
          <Link key={a.id} to={`/app/applications/${a.id}`}>
            <Card className="hover:border-ai/40">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-primary">{a.scholarshipName}</p>
                  <p className="text-xs text-gray-400">{a.code} · updated {a.updatedAt}</p>
                </div>
                <StatusPill status={a.status} />
              </div>
              <div className="mt-4">
                <ProgressBar
                  value={a.progress}
                  tone={a.status === 'approved' ? 'success' : a.aiFlagged ? 'warning' : 'ai'}
                />
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  )
}
