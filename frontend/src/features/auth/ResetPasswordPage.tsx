import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { apiClient, apiError, tokenStore } from '@/lib/apiClient'
import { Button, Field, Input } from '@/components/ui'
import { AuthShell } from './AuthShell'

export function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = params.get('token') ?? ''
  const navigate = useNavigate()
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (password.length < 6) {
      setError('Password must be at least 6 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    setError('')
    setBusy(true)
    try {
      const { data } = await apiClient.post<{ access_token: string; refresh_token: string }>(
        '/auth/reset-password',
        { token, password },
      )
      tokenStore.set(data.access_token, data.refresh_token)
      // reload so AuthProvider picks up the new session, then land on the right home
      window.location.href = '/login'
    } catch (err) {
      setError(apiError(err, 'Could not reset password'))
    } finally {
      setBusy(false)
    }
  }

  if (!token) {
    return (
      <AuthShell>
        <h1 className="text-2xl font-bold text-primary">Reset link missing</h1>
        <p className="mt-2 text-sm text-gray-500">
          This page needs a valid reset link.{' '}
          <Link to="/forgot-password" className="text-ai">Request a new one</Link>.
        </p>
      </AuthShell>
    )
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-primary">Set a new password</h1>
      <p className="mt-1 text-sm text-gray-500">Choose a password you'll remember.</p>

      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="New password">
          <Input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        <Field label="Confirm new password">
          <Input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="••••••••"
          />
        </Field>
        {error && <p className="text-sm text-danger">{error}</p>}
        <Button type="submit" className="w-full" disabled={busy}>
          {busy ? 'Saving…' : 'Set new password'}
        </Button>
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="block w-full text-center text-sm text-gray-500"
        >
          Back to sign in
        </button>
      </form>
    </AuthShell>
  )
}
