import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link } from 'react-router-dom'
import { api } from '@/lib/mockApi'
import { cn, inr } from '@/lib/cn'
import { Badge, Card, ProgressBar } from '@/components/ui'
import { Icon } from '@/components/ui/icons'

const FILTERS = ['All', 'Merit', 'Need-Based', 'Government', 'Private'] as const

export function Scholarships() {
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<(typeof FILTERS)[number]>('All')
  const { data } = useQuery({
    queryKey: ['scholarships', q, cat],
    queryFn: () => api.listScholarships(q, cat),
  })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-primary">Find the right scholarship for you</h1>
        <p className="mt-1 text-sm text-gray-500">
          Explore scholarships that match your profile and eligibility.
        </p>
      </div>

      <div className="relative max-w-md">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
          <Icon.search />
        </span>
        <input
          placeholder="Search scholarships…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="w-full rounded-lg border border-gray-300 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-ai focus:ring-2 focus:ring-ai/20"
        />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <button
            key={f}
            onClick={() => setCat(f)}
            className={cn(
              'rounded-full px-3.5 py-1.5 text-sm font-medium transition',
              cat === f
                ? 'bg-primary text-white'
                : 'border border-gray-300 bg-white text-gray-600 hover:border-gray-400',
            )}
          >
            {f}
          </button>
        ))}
        <span className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-gray-300 bg-white px-3.5 py-1.5 text-sm text-gray-600">
          <Icon.settings width={14} height={14} /> Filters
        </span>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(data ?? []).map((s) => (
          <Card key={s.id} className="flex flex-col">
            <div className="flex items-start justify-between gap-2">
              <h3 className="font-semibold leading-snug text-primary">{s.name}</h3>
            </div>
            <p className="mt-2 text-lg font-bold text-primary">Up to {inr(s.amountMax)}</p>
            <div className="mt-3 flex flex-wrap gap-1.5">
              <Badge>{s.category}</Badge>
              {s.courseFilter.slice(0, 1).map((c) => (
                <Badge key={c}>{c}</Badge>
              ))}
            </div>
            <div className="mt-4">
              <div className="mb-1 flex items-center justify-between text-xs">
                <span className="inline-flex items-center gap-1 font-medium text-ai">
                  <Icon.sparkles width={12} height={12} /> Profile Match
                </span>
                <span className="font-semibold text-primary">{Math.round(s.aiMatch ?? 0)}%</span>
              </div>
              <ProgressBar value={s.aiMatch ?? 0} />
            </div>
            <Link
              to={`/app/scholarships/${s.id}`}
              className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-ai hover:gap-1.5"
            >
              View Details <Icon.arrowRight width={14} height={14} />
            </Link>
          </Card>
        ))}
      </div>
    </div>
  )
}
