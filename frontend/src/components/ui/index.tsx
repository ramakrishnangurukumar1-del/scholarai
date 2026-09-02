import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react'
import { cn } from '@/lib/cn'
import type { ApplicationStatus, CheckResult, RiskLevel } from '@/lib/types'

/* ---------- Button ---------- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success'
  size?: 'sm' | 'md'
}
export function Button({ variant = 'primary', size = 'md', className, ...props }: ButtonProps) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition disabled:opacity-50 disabled:pointer-events-none'
  const sizes = { sm: 'px-3 py-1.5 text-sm', md: 'px-4 py-2.5 text-sm' }
  const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover',
    secondary: 'border border-gray-300 bg-white text-primary hover:bg-gray-50',
    ghost: 'text-primary hover:bg-gray-100',
    danger: 'bg-danger text-white hover:brightness-95',
    success: 'bg-success text-white hover:brightness-95',
  }
  return <button className={cn(base, sizes[size], variants[variant], className)} {...props} />
}

/* ---------- Card ---------- */
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn('rounded-xl border border-gray-200 bg-white p-6 shadow-sm', className)}
      {...props}
    />
  )
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-center justify-between">
      <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">{children}</h3>
      {action}
    </div>
  )
}

/* ---------- Badge / status pills ---------- */
const tone = {
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  ai: 'bg-ai-soft text-ai',
  neutral: 'bg-gray-100 text-gray-600',
}
export function Badge({
  children,
  tone: t = 'neutral',
  className,
}: {
  children: ReactNode
  tone?: keyof typeof tone
  className?: string
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium',
        tone[t],
        className,
      )}
    >
      {children}
    </span>
  )
}

const STATUS_META: Record<ApplicationStatus, { label: string; tone: keyof typeof tone }> = {
  draft: { label: 'Draft', tone: 'neutral' },
  submitted: { label: 'Submitted', tone: 'neutral' },
  ai_verification: { label: 'Verifying documents', tone: 'ai' },
  under_review: { label: 'Under Review', tone: 'warning' },
  correction_requested: { label: 'Correction Requested', tone: 'warning' },
  approved: { label: 'Approved', tone: 'success' },
  rejected: { label: 'Rejected', tone: 'danger' },
}
export function StatusPill({ status }: { status: ApplicationStatus }) {
  const m = STATUS_META[status]
  return <Badge tone={m.tone}>{m.label}</Badge>
}

export function CheckPill({ result }: { result: CheckResult }) {
  if (result === 'pass') return <Badge tone="success">✓ Verified</Badge>
  if (result === 'warn') return <Badge tone="warning">⚠ Mismatch</Badge>
  return <Badge tone="danger">✕ Failed</Badge>
}

export function RiskPill({ risk }: { risk: RiskLevel }) {
  const map = { LOW: 'success', MEDIUM: 'warning', HIGH: 'danger' } as const
  return <Badge tone={map[risk]}>{risk} RISK</Badge>
}

/* ---------- StatCard ---------- */
export function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: ReactNode
  hint?: string
}) {
  return (
    <Card className="p-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">{label}</p>
      <p className="mt-2 text-2xl font-bold text-primary">{value}</p>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </Card>
  )
}

/* ---------- ProgressBar ---------- */
export function ProgressBar({ value, tone: t = 'ai' }: { value: number; tone?: 'ai' | 'success' | 'warning' }) {
  const color = { ai: 'bg-ai', success: 'bg-success', warning: 'bg-warning' }[t]
  return (
    <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
      <div className={cn('h-full rounded-full', color)} style={{ width: `${Math.min(100, value)}%` }} />
    </div>
  )
}

/* ---------- Stepper ---------- */
export function Stepper({
  steps,
  current,
}: {
  steps: string[]
  current: number
}) {
  return (
    <ol className="space-y-3">
      {steps.map((s, i) => {
        const state = i < current ? 'done' : i === current ? 'current' : 'todo'
        return (
          <li key={s} className="flex items-center gap-3">
            <span
              className={cn(
                'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
                state === 'done' && 'bg-success text-white',
                state === 'current' && 'bg-ai text-white',
                state === 'todo' && 'border border-gray-300 text-gray-400',
              )}
            >
              {state === 'done' ? '✓' : String(i + 1).padStart(2, '0')}
            </span>
            <span
              className={cn(
                'text-sm',
                state === 'todo' ? 'text-gray-400' : 'font-medium text-primary',
              )}
            >
              {s}
            </span>
          </li>
        )
      })}
    </ol>
  )
}

/* ---------- Timeline ---------- */
export function Timeline({
  steps,
}: {
  steps: { label: string; state: 'done' | 'current' | 'todo'; at?: string }[]
}) {
  return (
    <ol className="relative ml-3 space-y-6 border-l border-gray-200 pl-6">
      {steps.map((s) => (
        <li key={s.label} className="relative">
          <span
            className={cn(
              'absolute -left-[31px] flex h-4 w-4 items-center justify-center rounded-full ring-4 ring-white',
              s.state === 'done' && 'bg-success',
              s.state === 'current' && 'bg-ai',
              s.state === 'todo' && 'bg-gray-300',
            )}
          />
          <p
            className={cn(
              'text-sm font-medium',
              s.state === 'todo' ? 'text-gray-400' : 'text-primary',
            )}
          >
            {s.label}
          </p>
          {s.at && <p className="text-xs text-gray-400">{s.at}</p>}
        </li>
      ))}
    </ol>
  )
}

/* ---------- Field ---------- */
export function Field({
  label,
  children,
}: {
  label: string
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-gray-700">{label}</span>
      {children}
    </label>
  )
}

/* ---------- Ring (circular progress) ---------- */
export function Ring({
  value,
  size = 96,
  stroke = 9,
  tone: t = 'ai',
  label,
}: {
  value: number
  size?: number
  stroke?: number
  tone?: 'ai' | 'success' | 'warning' | 'danger'
  label?: ReactNode
}) {
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  const color = {
    ai: 'var(--color-ai)',
    success: 'var(--color-success)',
    warning: 'var(--color-warning)',
    danger: 'var(--color-danger)',
  }[t]
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#eef0f4" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (Math.min(100, value) / 100) * c}
        />
      </svg>
      <span className="absolute text-lg font-bold text-primary">{label ?? `${value}%`}</span>
    </div>
  )
}

/* ---------- Donut (multi-segment) ---------- */
export function Donut({
  data,
  size = 160,
}: {
  data: { label: string; pct: number; color: string }[]
  size?: number
}) {
  const stroke = 22
  const r = (size - stroke) / 2
  const c = 2 * Math.PI * r
  let acc = 0
  return (
    <div className="flex items-center gap-6">
      <svg width={size} height={size} className="-rotate-90 shrink-0">
        {data.map((d) => {
          const seg = (d.pct / 100) * c
          const el = (
            <circle
              key={d.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={d.color}
              strokeWidth={stroke}
              strokeDasharray={`${seg} ${c - seg}`}
              strokeDashoffset={-acc}
            />
          )
          acc += seg
          return el
        })}
      </svg>
      <ul className="space-y-2 text-sm">
        {data.map((d) => (
          <li key={d.label} className="flex items-center gap-2">
            <span className="h-3 w-3 rounded-sm" style={{ background: d.color }} />
            <span className="text-gray-600">{d.label}</span>
            <span className="ml-auto font-medium text-primary">{d.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

/* ---------- Sparkline / line chart ---------- */
export function LineChart({ points, height = 140 }: { points: number[]; height?: number }) {
  const w = 320
  const max = Math.max(...points)
  const min = Math.min(...points)
  const span = max - min || 1
  const step = w / (points.length - 1)
  const d = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${i * step} ${height - ((p - min) / span) * (height - 20) - 10}`)
    .join(' ')
  return (
    <svg viewBox={`0 0 ${w} ${height}`} className="w-full" preserveAspectRatio="none">
      <path d={`${d} L ${w} ${height} L 0 ${height} Z`} fill="var(--color-ai)" opacity="0.08" />
      <path d={d} fill="none" stroke="var(--color-ai)" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  )
}

export function Input(props: React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm outline-none focus:border-ai focus:ring-2 focus:ring-ai/20"
      {...props}
    />
  )
}

export function Select({
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className="w-full appearance-none rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm outline-none focus:border-ai focus:ring-2 focus:ring-ai/20"
      {...props}
    >
      {children}
    </select>
  )
}

/* ---------- Chevron pipeline ---------- */
export function Pipeline({
  stages,
}: {
  stages: { label: string; count: number; done?: boolean }[]
}) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {stages.map((s, i) => (
        <div
          key={s.label}
          className={cn(
            'relative flex-1 min-w-36 px-5 py-4 text-center',
            s.done ? 'bg-success-soft' : 'bg-bg-subtle',
            i === 0 ? 'rounded-l-lg' : '',
            i === stages.length - 1 ? 'rounded-r-lg' : '',
          )}
          style={
            i < stages.length - 1
              ? { clipPath: 'polygon(0 0, calc(100% - 14px) 0, 100% 50%, calc(100% - 14px) 100%, 0 100%)' }
              : undefined
          }
        >
          <p className="text-xs font-medium text-gray-500">{s.label}</p>
          <p className="mt-1 text-lg font-bold text-primary">{s.count}</p>
        </div>
      ))}
    </div>
  )
}
