import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/mockApi'
import { cn, inr } from '@/lib/cn'
import { Badge, Button, Card, CardTitle, CheckPill, Ring, Timeline } from '@/components/ui'
import { Icon } from '@/components/ui/icons'
import type { Application } from '@/lib/types'

const TABS = ['Application', 'Documents', 'Analysis', 'History'] as const

export function ReviewPage() {
  const { id = '' } = useParams()
  const qc = useQueryClient()
  const { data: app } = useQuery({ queryKey: ['app', id], queryFn: () => api.getApplication(id) })
  const [tab, setTab] = useState<(typeof TABS)[number]>('Analysis')
  const [remark, setRemark] = useState('')
  const [decided, setDecided] = useState<string | null>(null)
  const decide = useMutation({
    mutationFn: (action: string) => api.decide(id, action, remark),
    onSuccess: (_d, action) => {
      setDecided(action)
      qc.invalidateQueries({ queryKey: ['app', id] })
      qc.invalidateQueries({ queryKey: ['auth-apps'] })
      qc.invalidateQueries({ queryKey: ['auth-dash'] })
    },
  })

  if (!app) return <p className="text-sm text-gray-500">Loading…</p>
  const incomeIssue = app.ai?.issues.find((i) => i.type.toLowerCase().includes('income'))

  return (
    <div className="space-y-5">
      <Link to="/authority/applications" className="inline-flex items-center gap-1 text-sm text-gray-500">
        ← Back to Applications
      </Link>
      <h1 className="text-2xl font-bold text-primary">Application Details — {app.code}</h1>

      {/* info strip */}
      <Card className="grid gap-4 py-4 sm:grid-cols-4">
        <Info label="Student Name" value={app.studentName} />
        <Info label="Scholarship" value={app.scholarshipName} />
        <Info label="Submitted On" value={app.submittedAt ?? '—'} />
        <div>
          <p className="text-xs text-gray-500">Verification</p>
          <p className={cn('text-sm font-semibold', app.aiFlagged ? 'text-danger' : 'text-success')}>
            {app.aiFlagged ? 'Flagged' : 'Verified'}
          </p>
        </div>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-4">
          <div className="flex gap-1 border-b border-gray-200">
            {TABS.map((t) => (
              <button
                key={t}
                onClick={() => setTab(t)}
                className={cn(
                  'px-4 py-2 text-sm font-medium',
                  tab === t ? 'border-b-2 border-ai text-ai' : 'text-gray-500 hover:text-primary',
                )}
              >
                {t}
              </button>
            ))}
          </div>

          {tab === 'Application' && (
            <Card>
              <CardTitle>Submitted information</CardTitle>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                {Object.entries(app.formData).map(([k, v]) => (
                  <div key={k}>
                    <dt className="capitalize text-gray-500">{k}</dt>
                    <dd className="font-medium text-primary">
                      {typeof v === 'number' && k.toLowerCase().includes('income') ? inr(v) : String(v)}
                    </dd>
                  </div>
                ))}
              </dl>
            </Card>
          )}

          {tab === 'Documents' && (
            <Card>
              <CardTitle>Uploaded documents</CardTitle>
              <div className="divide-y divide-gray-100 rounded-lg border border-gray-100">
                {app.documents.length === 0 && (
                  <p className="px-4 py-3 text-sm text-gray-400">No documents uploaded.</p>
                )}
                {app.documents.map((d) => {
                  const worst = d.checks.some((c) => c.result === 'fail')
                    ? 'fail'
                    : d.checks.some((c) => c.result === 'warn')
                      ? 'warn'
                      : 'pass'
                  return (
                    <div key={d.id} className="flex items-center gap-3 px-4 py-3 text-sm">
                      <Icon.file width={15} height={15} className="text-ai" />
                      <span className="capitalize text-gray-700">{d.docType.replace('_', ' ')}</span>
                      <span className="text-gray-400">{d.fileName}</span>
                      <span className="ml-auto"><CheckPill result={worst} /></span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          {tab === 'Analysis' && (
            <Card>
              <div className="grid gap-6 sm:grid-cols-[1fr_auto]">
                <div>
                  <CardTitle>Automated Checks</CardTitle>
                  <ul className="space-y-1.5 text-sm text-gray-700">
                    {(app.ai?.summaryPoints ?? ['No analysis yet.']).map((p) => (
                      <li key={p} className="flex gap-2">
                        <span className="text-ai">•</span> {p}
                      </li>
                    ))}
                  </ul>
                </div>
                {app.ai && (
                  <div className="flex flex-col items-center">
                    <p className="text-xs font-medium uppercase text-gray-500">Confidence</p>
                    <Ring value={app.ai.confidence} size={92} />
                  </div>
                )}
              </div>

              {incomeIssue && (
                <div className="mt-6">
                  <p className="mb-2 text-sm font-semibold text-primary">Detected Issues</p>
                  <div className="rounded-xl border border-danger/25 bg-danger-soft/50 p-4">
                    <div className="flex items-center justify-between">
                      <p className="font-semibold text-danger">Income Mismatch</p>
                      <Badge tone="danger">High Risk</Badge>
                    </div>
                    <div className="mt-3 space-y-1 text-sm text-gray-600">
                      <p>Declared: <span className="font-medium text-primary">{inr(180000)}</span></p>
                      <p>Document: <span className="font-medium text-primary">{inr(240000)}</span></p>
                    </div>
                  </div>
                </div>
              )}
            </Card>
          )}

          {tab === 'History' && (
            <Card>
              <CardTitle>Application history</CardTitle>
              <Timeline
                steps={app.history.map((h) => ({
                  label: `${h.action}${h.remark ? ` — ${h.remark}` : ''}`,
                  state: 'done' as const,
                  at: `${h.actor} · ${h.at}`,
                }))}
              />
            </Card>
          )}

          <Card>
            <CardTitle>Decision</CardTitle>
            {decided ? (
              <p className="rounded-lg bg-success-soft p-3 text-sm text-success">
                Recorded: <span className="font-semibold capitalize">{decided.replace('_', ' ')}</span>. Student notified.
              </p>
            ) : (
              <>
                <textarea
                  value={remark}
                  onChange={(e) => setRemark(e.target.value)}
                  placeholder="Add a remark for the student…"
                  className="mb-3 h-16 w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-ai"
                />
                <div className="flex flex-wrap gap-2">
                  <Button variant="success" size="sm" disabled={decide.isPending} onClick={() => decide.mutate('approve')}>
                    Approve
                  </Button>
                  <Button variant="danger" size="sm" disabled={decide.isPending} onClick={() => decide.mutate('reject')}>
                    Reject
                  </Button>
                  <Button variant="secondary" size="sm" disabled={decide.isPending} onClick={() => decide.mutate('request_correction')}>
                    Request Correction
                  </Button>
                </div>
                <p className="mt-3 text-xs text-gray-400">AI is advisory. The final decision is yours.</p>
              </>
            )}
          </Card>
        </div>

        <AssistantPanel app={app} />
      </div>
    </div>
  )
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500">{label}</p>
      <p className="text-sm font-semibold text-primary">{value}</p>
    </div>
  )
}

function AssistantPanel({ app }: { app: Application }) {
  const [q, setQ] = useState('')
  const [answer, setAnswer] = useState('')
  const ask = useMutation({
    mutationFn: (question: string) => api.askAssistant(app, question),
    onSuccess: (a) => setAnswer(a),
  })
  const run = () => ask.mutate(q || 'Why was this application flagged?')

  return (
    <Card className="h-fit lg:sticky lg:top-20">
      <div className="mb-3 flex items-center gap-2">
        <h3 className="text-sm font-semibold text-primary">AI Review Assistant</h3>
        <Badge tone="ai">BETA</Badge>
      </div>
      <textarea
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder="Ask anything about this application…"
        className="h-20 w-full rounded-lg border border-gray-300 p-2 text-sm outline-none focus:border-ai"
      />
      <Button className="mt-2 w-full" size="sm" disabled={ask.isPending} onClick={run}>
        {ask.isPending ? 'Thinking…' : 'Ask AI'}
      </Button>
      <button onClick={run} className="mt-3 block text-left text-sm text-ai">
        Why is this application flagged?
      </button>
      {answer && (
        <pre className="mt-3 whitespace-pre-wrap rounded-lg bg-bg-subtle p-3 text-xs leading-relaxed text-gray-700">
          {answer}
        </pre>
      )}
    </Card>
  )
}
