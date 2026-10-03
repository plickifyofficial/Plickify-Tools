import type { ReactNode } from 'react'
import { Navigate } from 'react-router-dom'
import { useSession } from '../hooks/useSession'
import { Spinner } from './ui'

export function RequireAuth({ children }: { children: ReactNode }): JSX.Element {
  const { session, loading } = useSession()
  if (loading) return <Spinner label="Checking your session…" />
  if (!session) return <Navigate to="/login" replace />
  return <>{children}</>
}

export function RequireAdmin({ children }: { children: ReactNode }): JSX.Element {
  const { session, loading, isAdmin } = useSession()
  if (loading) return <Spinner label="Checking your session…" />
  if (!session) return <Navigate to="/login" replace />
  if (!isAdmin) return <Navigate to="/dashboard" replace />
  return <>{children}</>
}
