import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Link, useParams } from 'react-router-dom'
import { api } from '@/lib/mockApi'
import { openDocument } from '@/lib/applicationApi'
import { inr } from '@/lib/cn'
import {
  Badge,
  Card,
  CardTitle,
  CheckPill,
  ProgressBar,
  Ring,
  RiskPill,
  StatusPill,
  Timeline,
} from '@/components/ui'
import { Icon } from '@/components/ui/icons'
import type { ApplicationDocument } from '@/lib/types'

const worstOf = (d: ApplicationDocument) =>
  d.checks.some((c) => c.result === 'fail')
    ? 'fail'
    : d.checks.some((c) => c.result === 'warn')
      ? 'warn'
      : 'pass'

export function ApplicationDetail() {
  const { id = '' } = useParams()
  const { data: app } = useQuery({ queryKey: ['app', id], queryFn: () => api.getApplication(id) })
  const [openDoc, setOpenDoc] = useState<string | null>(null)

  if (!app) return <p className="text-sm text-gray-500">Loading…</p>

  const mismatchDoc = app.documents.find((d) => worstOf(d) === 'warn')
  const income = mismatchDoc?.checks.find((c) => c.checkName === 'income_match')

  return (
    <div className="space-y-6">
      <Link to="/app/applications" className="inline-flex items-center gap-1 text-sm text-ai">
        ← Back to applications
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-primary">{app.scholarshipName}</h1>
          <p className="text-sm text-gray-400">{app.code} · submitted {app.submittedAt}</p>
        </div>
        <StatusPill status={app.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardTitle>Document Verification</CardTitle>
          <div className="flex flex-wrap items-center gap-6 rounded-xl bg-bg-subtle p-5">
            <Ring
              value={app.eligibilityScore}
              size={104}
              tone={app.ai?.risk === 'HIGH' ? 'warning' : 'success'}
            />
            <div>
              <p className="text-lg font-semibold text-primary">
                {app.ai?.risk === 'HIGH' ? 'Manual verification required' : 'High Confidence'}
              </p>
              <p className="mt-0.5 max-w-md text-sm text-gray-500">
                {app.ai?.recommendation ?? 'Awaiting verification.'}
              </p>
              {app.ai && <div className="mt-2"><RiskPill risk={app.ai.risk} /></div>}
            </div>
          </div>

          <div className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-100">
            {app.documents.map((d) => (
              <DocRow
                key={d.id}
                doc={d}
                open={openDoc === d.id}
                onToggle={() => setOpenDoc((cur) => (cur === d.id ? null : d.id))}
              />
            ))}
          </div>

          {mismatchDoc && income?.detail && (
            <div className="mt-5 rounded-xl border border-warning/30 bg-warning-soft/60 p-5">
              <p className="flex items-center gap-2 font-semibold text-warning">
                <Icon.alert width={16} height={16} /> Income Certificate Mismatch
              </p>
              <div className="mt-4 grid gap-4 sm:grid-cols-3">
                <div>
                  <p className="text-xs text-gray-500">Declared Income</p>
                  <p className="text-lg font-bold text-primary">
                    {inr(Number(income.detail.declared))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Document Income</p>
                  <p className="text-lg font-bold text-primary">
                    {inr(Number(income.detail.document))}
                  </p>
                </div>
                <div>
                  <p className="text-xs text-gray-500">Recommendation</p>
                  <p className="text-sm font-medium text-warning">Manual verification required.</p>
                </div>
              </div>
            </div>
          )}
        </Card>

        <Card className="h-fit">
          <CardTitle>Application timeline</CardTitle>
          <Timeline steps={app.timeline} />
          <div className="mt-6">
            <div className="mb-1 flex justify-between text-sm">
              <span className="text-gray-500">Progress</span>
              <span className="font-semibold text-primary">{app.progress}%</span>
            </div>
            <ProgressBar value={app.progress} />
          </div>
        </Card>
      </div>
    </div>
  )
}

function DocRow({
  doc,
  open,
  onToggle,
}: {
  doc: ApplicationDocument
  open: boolean
  onToggle: () => void
}) {
  const worst = worstOf(doc)
  return (
    <div>
      <button onClick={onToggle} className="flex w-full items-center justify-between px-4 py-3 text-sm">
        <span className="flex items-center gap-2 capitalize text-gray-700">
          <Icon.file width={15} height={15} className="text-gray-400" />
          {doc.docType.replace('_', ' ')}
        </span>
        <CheckPill result={worst} />
      </button>
      {open && (
        <div className="border-t border-gray-100 bg-bg-subtle px-4 py-3 text-sm">
          <div className="mb-2 flex items-center justify-between">
            <p className="font-medium text-primary">Extracted from document (OCR)</p>
            <button
              type="button"
              onClick={() => openDocument(doc.id).catch(() => alert('Could not open the document.'))}
              className="font-medium text-ai hover:underline"
            >
              View file
            </button>
          </div>
          <div className="flex flex-wrap gap-2">
            {Object.entries(doc.extractedFields).map(([k, v]) => (
              <Badge key={k}>
                {k}: {String(v)}
              </Badge>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
