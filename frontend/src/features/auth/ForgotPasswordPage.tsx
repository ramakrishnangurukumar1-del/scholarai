import { useState } from 'react'
import { Link } from 'react-router-dom'
import { apiClient, apiError } from '@/lib/apiClient'
import { Button, Field, Input } from '@/components/ui'
import { AuthShell } from './AuthShell'

export function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [resetUrl, setResetUrl] = useState('')
  const [error, setError] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email.trim()) return
    setError('')
    setBusy(true)
    try {
      const { data } = await apiClient.post<{ message: string; reset_url: string | null }>(
        '/auth/forgot-password',
        { email },
      )
      setMessage(data.message)
      setResetUrl(data.reset_url ?? '')
    } catch (err) {
      setError(apiError(err, 'Something went wrong'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <AuthShell>
      <h1 className="text-2xl font-bold text-primary">Reset your password</h1>
      <p className="mt-1 text-sm text-gray-500">
        Enter your account email and we'll send you a link to set a new password.
      </p>

      {message ? (
        <div className="mt-6 space-y-4">
          <p className="rounded-lg bg-success-soft p-3 text-sm text-success">{message}</p>
          {resetUrl && (
            <div className="rounded-lg border border-gray-200 bg-white p-3">
              <p className="text-xs text-gray-500">Reset link (valid 30 minutes):</p>
              <Link
                to={resetUrl.replace(/^https?:\/\/[^/]+/, '')}
                className="mt-1 block break-all text-sm font-medium text-ai underline"
              >
                Open reset page →
              </Link>
            </div>
          )}
          <Link to="/login" className="block text-center text-sm text-ai">Back to sign in</Link>
        </div>
      ) : (
        <form onSubmit={submit} className="mt-6 space-y-4">
          <Field label="Email">
            <Input
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </Field>
          {error && <p className="text-sm text-danger">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? 'Sending…' : 'Send reset link'}
          </Button>
          <Link to="/login" className="block text-center text-sm text-gray-500">
            Back to sign in
          </Link>
        </form>
      )}
    </AuthShell>
  )
}
