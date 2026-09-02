import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HOME_FOR, useAuth } from '@/lib/auth'
import { apiError } from '@/lib/apiClient'
import { Button, Field, Input } from '@/components/ui'
import { AuthShell } from './AuthShell'

const DEMO = [
  { label: 'Student', email: 'student@scholarai.dev' },
  { label: 'Authority', email: 'authority@scholarai.dev' },
  { label: 'Admin', email: 'admin@scholarai.dev' },
]

export function LoginPage() {
  const { login } = useAuth()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const doLogin = async (mail: string, pw: string) => {
    setError('')
    setBusy(true)
    try {
      const user = await login(mail, pw)
      navigate(HOME_FOR[user.role])
    } catch (err) {
      setError(apiError(err, 'Could not sign in'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-primary">Welcome back</h1>
      <p className="mt-1 text-sm text-gray-500">Sign in to your ScholarAI account.</p>

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
          <button type="button" className="font-medium text-ai">Forgot password?</button>
        </div>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        New to ScholarAI?{' '}
        <Link to="/register" className="font-medium text-ai">Create an account</Link>
      </p>

      <div className="mt-8 rounded-lg border border-dashed border-gray-300 bg-white p-4">
        <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
          Demo accounts (password: password123)
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          {DEMO.map((d) => (
            <button
              key={d.email}
              type="button"
              disabled={busy}
              onClick={() => {
                setEmail(d.email)
                setPassword('password123')
                doLogin(d.email, 'password123')
              }}
              className="rounded-md border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600 hover:border-ai hover:text-ai disabled:opacity-50"
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>
    </AuthShell>
  )
}
