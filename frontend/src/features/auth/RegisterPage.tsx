import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { HOME_FOR, useAuth } from '@/lib/auth'
import { apiError } from '@/lib/apiClient'
import { Button, Field, Input } from '@/components/ui'
import { AuthShell } from './AuthShell'

export function RegisterPage() {
  const { register } = useAuth()
  const navigate = useNavigate()
  const [form, setForm] = useState({
    fullName: '',
    email: '',
    college: '',
    password: '',
    confirm: '',
  })
  const [agree, setAgree] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.fullName.trim() || !form.email.trim() || !form.password) {
      setError('Fill in your name, email and a password.')
      return
    }
    if (form.password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (form.password !== form.confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!agree) {
      setError('Please accept the terms to continue.')
      return
    }
    setError('')
    setBusy(true)
    try {
      await register({
        fullName: form.fullName,
        email: form.email,
        password: form.password,
        college: form.college,
      })
      navigate(HOME_FOR.student)
    } catch (err) {
      setError(apiError(err, 'Could not create account'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-primary">Create your account</h1>
      <p className="mt-1 text-sm text-gray-500">
        Students sign up here. Institutions are onboarded by an administrator.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Full name">
          <Input value={form.fullName} onChange={set('fullName')} placeholder="Ramakrishnan G" />
        </Field>
        <Field label="Email">
          <Input type="email" autoComplete="email" value={form.email} onChange={set('email')} placeholder="you@example.com" />
        </Field>
        <Field label="College / University">
          <Input value={form.college} onChange={set('college')} placeholder="Eeswari Engineering College" />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Password">
            <Input type="password" autoComplete="new-password" value={form.password} onChange={set('password')} placeholder="••••••••" />
          </Field>
          <Field label="Confirm">
            <Input type="password" autoComplete="new-password" value={form.confirm} onChange={set('confirm')} placeholder="••••••••" />
          </Field>
        </div>
        <label className="flex items-start gap-2 text-sm text-gray-500">
          <input
            type="checkbox"
            checked={agree}
            onChange={(e) => setAgree(e.target.checked)}
            className="mt-0.5 rounded border-gray-300"
          />
          I agree to the Terms of Service and Privacy Policy.
        </label>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Creating account…' : 'Create account'}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link to="/login" className="font-medium text-ai">Sign in</Link>
      </p>
    </AuthShell>
  )
}
