import { Link } from 'react-router-dom'
import { PublicNav } from '@/components/layout/PublicNav'
import { Badge, Button, Card, Ring } from '@/components/ui'
import { Icon } from '@/components/ui/icons'
import heroBg from '@/assets/hero-bg.svg'

const problemFlow = ['Manual Applications', 'Paperwork', 'Manual Verification', 'Long Approval Time', 'No Transparency']
const solutionFlow = [
  'Online Application',
  'Document Upload',
  'Automated Verification',
  'Authority Review',
  'Approval',
  'Real-Time Tracking',
]

const aiFeatures = [
  {
    tag: 'AI',
    title: 'Document Verification',
    body: 'An OCR model reads certificates and marksheets and pulls out the key fields — name, income, dates — so they can be checked against the form.',
  },
  {
    tag: 'Rules',
    title: 'Eligibility Scoring',
    body: 'A transparent rules engine scores each application against the scholarship’s criteria and weights. No black box — every point is explainable.',
  },
  {
    tag: 'AI',
    title: 'Review Assistant',
    body: 'An assistant summarises what looks inconsistent and answers the reviewer’s questions in plain language. It never decides — the officer does.',
  },
]

export function LandingPage() {
  return (
    <div className="bg-bg-subtle">
      <div
        className="relative bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url("${heroBg}")` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-bg-subtle" />
        <div className="relative">
          <PublicNav />

          {/* Hero */}
          <section className="mx-auto grid max-w-7xl items-center gap-12 px-6 py-20 lg:grid-cols-2">
        <div>
          <Badge tone="ai">AI-assisted scholarship management</Badge>
          <h1 className="mt-5 text-5xl font-extrabold leading-tight tracking-tight text-primary">
            Scholarships, made <span className="text-ai">intelligent</span>.
          </h1>
          <p className="mt-5 max-w-md text-lg text-gray-600">
            Apply, verify and track scholarships through one intelligent platform designed for
            students and institutions.
          </p>
          <div className="mt-8 flex gap-4">
            <Link to="/register">
              <Button>Find Scholarships</Button>
            </Link>
            <Link to="/officer/login">
              <Button variant="secondary">For Institutions</Button>
            </Link>
          </div>
          <div className="mt-10 grid max-w-md grid-cols-3 gap-4 text-center">
            {[
              ['10K+', 'Applications processed'],
              ['98%', 'Verification accuracy'],
              ['40%', 'Less manual processing'],
            ].map(([v, l]) => (
              <div key={l}>
                <p className="text-2xl font-bold text-primary">{v}</p>
                <p className="text-xs text-gray-500">{l}</p>
              </div>
            ))}
          </div>
        </div>

        {/* Product mockup — styled as a real app screenshot */}
        <div className="relative mx-auto w-full max-w-md">
          <div className="absolute -inset-6 -z-10 rounded-[2rem] bg-ai/20 blur-3xl" />

          {/* back card peeking out */}
          <div className="absolute -right-5 -top-5 hidden h-40 w-64 rotate-6 rounded-xl border border-gray-200 bg-white/70 shadow-sm backdrop-blur sm:block" />

          <div className="relative rotate-[-1.5deg] overflow-hidden rounded-xl border border-gray-200 bg-white shadow-2xl shadow-primary/10">
            {/* window chrome */}
            <div className="flex items-center gap-2 border-b border-gray-100 bg-bg-subtle px-4 py-2.5">
              <span className="h-2.5 w-2.5 rounded-full bg-danger/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-warning/60" />
              <span className="h-2.5 w-2.5 rounded-full bg-success/60" />
              <span className="ml-3 text-xs text-gray-400">scholarai.app · Application SCH-10248</span>
            </div>

            <div className="p-5">
              <div className="flex items-center gap-4">
                <Ring value={92} size={72} stroke={7} tone="success" />
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                    Eligibility Score
                  </p>
                  <p className="text-sm font-semibold text-primary">Documents verified</p>
                  <p className="text-xs text-success">● Ready for review</p>
                </div>
              </div>

              <div className="mt-5 divide-y divide-gray-100 rounded-lg border border-gray-100">
                {['Identity Proof', 'Income Certificate', 'Academic Record'].map((label) => (
                  <div key={label} className="flex items-center justify-between px-3 py-2.5 text-sm">
                    <span className="flex items-center gap-2 text-gray-700">
                      <Icon.file width={14} height={14} className="text-gray-400" />
                      {label}
                    </span>
                    <span className="flex items-center gap-1 text-xs font-medium text-success">
                      <Icon.check width={13} height={13} /> Verified
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* floating extraction chip */}
          <div className="absolute -bottom-4 -left-4 hidden items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs shadow-lg sm:flex">
            <span className="grid h-6 w-6 place-items-center rounded-md bg-ai-soft text-ai">
              <Icon.sparkles width={12} height={12} />
            </span>
            <span className="text-gray-600">
              Income extracted: <span className="font-semibold text-primary">₹1,80,000</span>
            </span>
          </div>
        </div>
          </section>
        </div>
      </div>

      {/* Problem / solution */}
      <section id="how" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold text-primary">From paperwork to a verified pipeline</h2>
        <div className="mt-10 grid gap-8 lg:grid-cols-2">
          <Card>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-danger">Today</h3>
            <FlowList items={problemFlow} tone="muted" />
          </Card>
          <Card>
            <h3 className="mb-4 text-sm font-semibold uppercase tracking-wide text-success">With ScholarAI</h3>
            <FlowList items={solutionFlow} tone="active" />
          </Card>
        </div>
      </section>

      {/* How the automation helps */}
      <section id="ai" className="mx-auto max-w-7xl px-6 py-16">
        <h2 className="text-center text-3xl font-bold text-primary">What the automation actually does</h2>
        <div className="mt-10 grid gap-6 md:grid-cols-3">
          {aiFeatures.map((f) => (
            <Card key={f.title}>
              <Badge tone={f.tag === 'AI' ? 'ai' : 'neutral'}>{f.tag}</Badge>
              <h3 className="mt-3 font-semibold text-primary">{f.title}</h3>
              <p className="mt-2 text-sm text-gray-600">{f.body}</p>
            </Card>
          ))}
        </div>
        <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-gray-500">
          The system extracts documents, flags inconsistencies, and prioritises applications for
          review. It does not approve or reject anyone — the authorised officer makes every decision.
        </p>
      </section>

      <footer className="border-t border-gray-200 bg-white py-10 text-center text-sm text-gray-500">
        ScholarAI — Scholarships, made intelligent.
      </footer>
    </div>
  )
}

function FlowList({ items, tone }: { items: string[]; tone: 'muted' | 'active' }) {
  return (
    <ol className="space-y-2">
      {items.map((it, i) => (
        <li key={it} className="flex items-center gap-3">
          <span
            className={
              tone === 'active'
                ? 'grid h-6 w-6 place-items-center rounded-full bg-ai-soft text-xs font-semibold text-ai'
                : 'grid h-6 w-6 place-items-center rounded-full bg-gray-100 text-xs font-semibold text-gray-400'
            }
          >
            {i + 1}
          </span>
          <span className="text-sm text-gray-700">{it}</span>
        </li>
      ))}
    </ol>
  )
}
