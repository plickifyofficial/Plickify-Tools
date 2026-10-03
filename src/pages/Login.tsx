import { useState } from 'react'
import { Link, Navigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'

export function Login(): JSX.Element {
  const { session, loading, signInWithGoogle } = useSession()
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!loading && session) return <Navigate to="/dashboard" replace />

  async function onGoogle(): Promise<void> {
    setBusy(true)
    setError(null)
    try {
      await signInWithGoogle()
    } catch (err) {
      setError((err as Error).message)
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-700 via-brand-600 to-violet-600 px-4">
      <div className="w-full max-w-md">
        <Link to="/" className="mb-6 flex items-center justify-center gap-2.5 text-white">
          <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15 text-xl font-extrabold">
            P
          </span>
          <span className="text-xl font-extrabold">Plickify Tools</span>
        </Link>

        <div className="rounded-3xl bg-white p-8 shadow-2xl">
          <h1 className="flex items-center gap-2.5 text-2xl font-extrabold text-slate-900">
            <i className="fa-solid fa-right-to-bracket text-brand-600" aria-hidden="true" />
            Welcome back
          </h1>
          <p className="mt-1.5 text-sm text-slate-500">
            Sign in to access your tools, downloads and license keys.
          </p>

          <button
            className="btn-secondary mt-8 w-full border-slate-300 py-3"
            onClick={() => void onGoogle()}
            disabled={busy || loading}
          >
            <i className="fa-brands fa-google text-[#4285F4]" aria-hidden="true" />
            {busy ? 'Redirecting…' : 'Continue with Google'}
          </button>

          {error && (
            <div className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
              {error}
            </div>
          )}

          <div className="mt-6 flex items-start gap-2 rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
            <i className="fa-solid fa-circle-info mt-0.5 text-brand-500" aria-hidden="true" />
            <span>
              Only Google sign-in is supported. By continuing you agree to our Terms and Privacy Policy.
            </span>
          </div>
        </div>

        <Link to="/" className="mt-6 block text-center text-sm font-semibold text-white/80 hover:text-white">
          <i className="fa-solid fa-arrow-left mr-1.5" aria-hidden="true" />
          Back to home
        </Link>
      </div>
    </div>
  )
}
