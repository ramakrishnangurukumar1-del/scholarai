import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/mockApi'
import { inr } from '@/lib/cn'
import { Badge, Button, Card, CardTitle, ProgressBar, Ring, StatusPill } from '@/components/ui'
import { Icon } from '@/components/ui/icons'
import { useAuth } from '@/lib/auth'

export function StudentDashboard() {
  const { user } = useAuth()
  const firstName = user?.fullName.split(' ')[0] ?? 'there'
  const apps = useQuery({ queryKey: ['my-apps'], queryFn: api.listMyApplications })
  const recs = useQuery({ queryKey: ['recs'], queryFn: api.getRecommendations })
  const notifs = useQuery({ queryKey: ['notifs'], queryFn: api.listNotifications })
  const list = apps.data ?? []

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Welcome back, {firstName}! 👋</h1>
        <p className="mt-1 text-sm text-gray-500">
          Track your scholarship applications and discover new opportunities.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* left column */}
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardTitle
              action={
                <Link to="/app/applications">
                  <Button size="sm" variant="secondary">View All</Button>
                </Link>
              }
            >
              My Applications
            </CardTitle>
            <div className="space-y-5">
              {list.map((a) => (
                <Link key={a.id} to={`/app/applications/${a.id}`} className="block">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-primary">{a.scholarshipName}</span>
                    <StatusPill status={a.status} />
                  </div>
                  <div className="mt-2 flex items-center gap-3">
                    <ProgressBar
                      value={a.progress}
                      tone={a.status === 'approved' ? 'success' : a.aiFlagged ? 'warning' : 'ai'}
                    />
                    <span className="w-10 shrink-0 text-right text-xs font-medium text-gray-500">
                      {a.progress}%
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-gray-400">Updated {a.updatedAt}</p>
                </Link>
              ))}
            </div>
          </Card>

          <Card>
            <CardTitle action={<Link to="/app/notifications" className="text-sm font-medium text-ai">View All</Link>}>
              Notifications
            </CardTitle>
            <ul className="space-y-3">
              {(notifs.data ?? []).slice(0, 4).map((n) => (
                <li key={n.id} className="flex items-start gap-3">
                  <span className="mt-0.5 grid h-6 w-6 shrink-0 place-items-center rounded-full bg-success-soft text-success">
                    <Icon.check width={13} height={13} />
                  </span>
                  <div className="min-w-0">
                    <p className="truncate text-sm text-gray-700">{n.body}</p>
                    <p className="text-xs text-gray-400">{n.at}</p>
                  </div>
                </li>
              ))}
            </ul>
          </Card>
        </div>

        {/* right column */}
        <div className="space-y-6">
          <Card>
            <CardTitle>Profile Completion</CardTitle>
            <div className="flex items-center gap-4">
              <Ring value={85} size={72} stroke={7} />
              <div>
                <p className="text-sm font-semibold text-primary">Almost there!</p>
                <p className="mt-0.5 text-xs text-gray-500">
                  Complete your profile to increase your scholarship matches.
                </p>
              </div>
            </div>
            <Link to="/app/profile" className="mt-4 inline-block text-sm font-medium text-ai">
              Complete Now →
            </Link>
          </Card>

          <Card>
            <CardTitle>Recommended for you</CardTitle>
            <div className="space-y-4">
              {(recs.data ?? []).slice(0, 2).map((s) => (
                <Link key={s.id} to={`/app/scholarships/${s.id}`} className="block">
                  <p className="text-sm font-semibold text-primary">{s.name}</p>
                  <p className="text-xs text-gray-500">Up to {inr(s.amountMax)}</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Badge tone="success">
                      <Icon.check width={11} height={11} /> Profile Match {Math.round(s.aiMatch ?? 0)}%
                    </Badge>
                  </div>
                  <span className="mt-2 inline-block text-sm font-medium text-ai">View Details →</span>
                </Link>
              ))}
            </div>
          </Card>
        </div>
      </div>
    </div>
  )
}
