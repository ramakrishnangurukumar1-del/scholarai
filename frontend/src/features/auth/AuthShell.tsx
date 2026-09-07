import { Link } from 'react-router-dom'
import type { ReactNode } from 'react'
import { Icon } from '@/components/ui/icons'
import { Logo } from '@/components/ui/Logo'

const POINTS = [
  'Apply to every scholarship from one profile',
  'Documents scanned and checked automatically',
  'Track each application in real time',
]

export function AuthShell({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* brand panel */}
      <div className="relative hidden flex-col justify-between bg-primary p-12 text-white lg:flex">
        <Link to="/" className="w-fit">
          <Logo light />
        </Link>
        <div>
          <h2 className="text-3xl font-bold leading-tight">
            Scholarships, made <span className="text-white/70">intelligent</span>.
          </h2>
          <ul className="mt-8 space-y-3">
            {POINTS.map((p) => (
              <li key={p} className="flex items-center gap-3 text-sm text-white/80">
                <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-white/15">
                  <Icon.check width={13} height={13} />
                </span>
                {p}
              </li>
            ))}
          </ul>
        </div>
        <p className="text-xs text-white/50">
          The system assists officers — it never approves or rejects anyone automatically.
        </p>
      </div>

      {/* form panel */}
      <div className="relative flex items-center justify-center bg-bg-subtle px-6 py-12">
        <Link
          to="/"
          className="absolute left-6 top-6 inline-flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-primary"
        >
          <Icon.arrowRight width={15} height={15} className="rotate-180" />
          Back to home
        </Link>

        <div className="w-full max-w-sm">
          <Link to="/" className="mb-8 flex justify-center lg:hidden">
            <Logo />
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}
