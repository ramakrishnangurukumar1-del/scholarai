import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HOME_FOR, useAuth } from '@/lib/auth'
import { apiError } from '@/lib/apiClient'
import { Button, Field, Input } from '@/components/ui'
import type { Role } from '@/lib/types'
import { AuthShell } from './AuthShell'

type Portal = 'student' | 'authority' | 'admin'

const PORTALS: Record<
  Portal,
  {
    title: string
    subtitle: string
    demoEmail: string
    otherPortals: { label: string; to: string }[]
  }
> = {
  student: {
    title: 'Student sign in',
    subtitle: 'Discover, apply for and track scholarships.',
    demoEmail: 'student@scholarai.dev',
    otherPortals: [
      { label: 'Officer portal', to: '/officer/login' },
      { label: 'Admin portal', to: '/admin/login' },
    ],
  },
  authority: {
    title: 'Officer sign in',
    subtitle: 'Scholarship officers — review applications and make decisions.',
    demoEmail: 'authority@scholarai.dev',
    otherPortals: [
      { label: 'Student portal', to: '/login' },
      { label: 'Admin portal', to: '/admin/login' },
    ],
  },
  admin: {
    title: 'Administrator sign in',
    subtitle: 'Platform administration — scholarships, users and analytics.',
    demoEmail: 'admin@scholarai.dev',
    otherPortals: [
      { label: 'Student portal', to: '/login' },
      { label: 'Officer portal', to: '/officer/login' },
    ],
  },
}

const ROLE_LABEL: Record<Role, string> = {
  student: 'a student',
  authority: 'an officer',
  admin: 'an administrator',
}
const PORTAL_FOR_ROLE: Record<Role, string> = {
  student: '/login',
  authority: '/officer/login',
  admin: '/admin/login',
}

export function LoginPage({ portal }: { portal: Portal }) {
  const cfg = PORTALS[portal]
  const { login, logout } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [wrongRole, setWrongRole] = useState<Role | null>(null)
  const [busy, setBusy] = useState(false)

  const doLogin = async (mail: string, pw: string) => {
    setError('')
    setWrongRole(null)
    setBusy(true)
    try {
      const user = await login(mail, pw)
      if (user.role !== portal) {
        logout()
        setWrongRole(user.role)
        return
      }
      navigate(HOME_FOR[user.role])
    } catch (err) {
      setError(apiError(err, 'Could not sign in'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-primary">{cfg.title}</h1>
      <p className="mt-1 text-sm text-gray-500">{cfg.subtitle}</p>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          if (!email.trim() || !password) {
            setError('Enter your email and password.')
            return
          }
          doLogin(email, password)
        }}
        className="mt-6 space-y-4"
      >
        <Field label="Email">
          <Input
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </Field>
        <Field label="Password">
          <Input
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <div className="flex items-center justify-between text-sm">
          <label className="flex items-center gap-2 text-gray-500">
            <input type="checkbox" className="rounded border-gray-300" /> Remember me
          </label>
          <Link to="/forgot-password" className="font-medium text-ai">Forgot password?</Link>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        {wrongRole && (
          <p className="rounded-lg bg-warning-soft p-3 text-sm text-warning">
            That account is {ROLE_LABEL[wrongRole]} account.{' '}
            <Link to={PORTAL_FOR_ROLE[wrongRole]} className="font-semibold underline">
              Use the correct portal →
            </Link>
          </p>
        )}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      {portal === 'student' && (
        <p className="mt-6 text-center text-sm text-gray-500">
          New to ScholarAI?{' '}
          <Link to="/register" className="font-medium text-ai">Create an account</Link>
        </p>
      )}
      {portal !== 'student' && (
        <p className="mt-6 text-center text-xs text-gray-400">
          {portal === 'authority'
            ? 'Officer accounts are created by an administrator.'
            : 'Administrator accounts are provisioned during setup.'}
        </p>
      )}

      <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">Demo account</p>
        <button
          type="button"
          disabled={busy}
          onClick={() => {
            setEmail(cfg.demoEmail)
            setPassword('password123')
            doLogin(cfg.demoEmail, 'password123')
          }}
          className="mt-2 rounded-md border border-gray-200 px-3 py-1 text-xs font-medium text-gray-600 hover:border-ai hover:text-ai disabled:opacity-50"
        >
          Sign in as demo {portal} ({cfg.demoEmail})
        </button>
      </div>

      <div className="mt-6 flex justify-center gap-4 text-xs text-gray-400">
        {cfg.otherPortals.map((p) => (
          <Link key={p.to} to={p.to} className="hover:text-primary">{p.label}</Link>
        ))}
      </div>
    </AuthShell>
  )
}
