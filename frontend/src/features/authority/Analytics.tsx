import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/mockApi'
import { Card, CardTitle, Donut, LineChart, StatCard } from '@/components/ui'

const COLORS = ['#6366f1', '#0ea5e9', '#22c55e', '#f59e0b', '#ec4899']

export function Analytics() {
  const { data, isLoading } = useQuery({ queryKey: ['analytics'], queryFn: api.analytics })
  if (isLoading || !data) return <p className="text-sm text-gray-500">Loading…</p>

  const empty = data.totals.total === 0

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-primary">Analytics Overview</h1>

      {empty && (
        <Card>
          <p className="text-sm text-gray-500">
            No submitted applications yet. Numbers appear here once students start applying.
          </p>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Applications" value={data.totals.total} />
        <StatCard label="Approval Rate" value={`${data.totals.approvalRate}%`} />
        <StatCard
          label="Avg Processing Time"
          value={data.totals.avgDays ? `${data.totals.avgDays} days` : '—'}
        />
        <StatCard
          label="Verification Pass Rate"
          value={data.totals.accuracy ? `${data.totals.accuracy}%` : '—'}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <StatCard label="Approved" value={data.counts.approved} />
        <StatCard label="Rejected" value={data.counts.rejected} />
        <StatCard label="Flagged" value={data.counts.flagged} />
        <StatCard label="Pending" value={data.counts.pending} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardTitle>Applications Over Time (last 8 weeks)</CardTitle>
          <LineChart points={data.overTime.map((p) => p.count)} />
          <div className="mt-2 flex justify-between text-xs text-gray-400">
            {data.overTime
              .filter((_, i) => i % 2 === 0)
              .map((p) => (
                <span key={p.label}>{p.label}</span>
              ))}
          </div>
        </Card>

        <Card>
          <CardTitle>Applications by Scholarship Type</CardTitle>
          {data.byCategory.length ? (
            <Donut
              data={data.byCategory.map((c, i) => ({
                label: `${c.label} (${c.count})`,
                pct: c.pct,
                color: COLORS[i % COLORS.length],
              }))}
            />
          ) : (
            <p className="text-sm text-gray-400">No data yet.</p>
          )}
        </Card>
      </div>

      <Card>
        <CardTitle>Top Scholarships</CardTitle>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 text-left text-xs uppercase text-gray-400">
                <th className="py-2">Scholarship</th>
                <th>Applications</th>
                <th>Approved</th>
                <th>Approval Rate</th>
              </tr>
            </thead>
            <tbody>
              {data.topScholarships.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-3 text-gray-400">No applications yet.</td>
                </tr>
              )}
              {data.topScholarships.map((s) => (
                <tr key={s.name} className="border-b border-gray-100">
                  <td className="py-3 font-medium text-primary">{s.name}</td>
                  <td>{s.applications}</td>
                  <td>{s.approved}</td>
                  <td>
                    <span className="inline-flex items-center gap-2">
                      <span className="h-1.5 w-20 overflow-hidden rounded-full bg-gray-100">
                        <span
                          className="block h-full rounded-full bg-success"
                          style={{ width: `${s.rate}%` }}
                        />
                      </span>
                      {s.rate}%
                    </span>
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
