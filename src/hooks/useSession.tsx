import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import {
  getRedirectResult,
  onAuthStateChanged,
  signInWithPopup,
  signInWithRedirect,
  signOut as firebaseSignOut,
  type User
} from 'firebase/auth'
import { auth, googleProvider } from '../lib/firebase'
import { nowIso, put, row } from '../lib/db'
import type { Profile } from '../lib/types'

/** Minimal session shape the pages consume (mirrors the old Supabase one). */
interface SessionLike {
  user: { id: string; email: string | null }
}

interface SessionValue {
  session: SessionLike | null
  profile: Profile | null
  loading: boolean
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signOut: () => Promise<void>
  refreshProfile: () => Promise<void>
  /** Firebase ID token for authenticated API calls (/api/download). */
  getIdToken: () => Promise<string | null>
}

const SessionContext = createContext<SessionValue | null>(null)

function toSession(user: User | null): SessionLike | null {
  return user ? { user: { id: user.uid, email: user.email } } : null
}

export function SessionProvider({ children }: { children: ReactNode }): JSX.Element {
  const [user, setUser] = useState<User | null>(auth.currentUser)
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  /** Load the profile doc, creating it on first sign-in (role locked to 'user'). */
  const loadProfile = useCallback(async (firebaseUser: User | null) => {
    if (!firebaseUser) {
      setProfile(null)
      return
    }
    try {
      let profileRow = await row<Profile>('profiles', firebaseUser.uid)
      if (!profileRow) {
        const fresh: Profile = {
          id: firebaseUser.uid,
          email: firebaseUser.email ?? '',
          full_name: firebaseUser.displayName,
          avatar_url: firebaseUser.photoURL,
          role: 'user',
          created_at: nowIso()
        }
        await put('profiles', firebaseUser.uid, fresh)
        profileRow = fresh
      }
      setProfile(profileRow)
    } catch (err) {
      console.error('profile load failed', err)
      setProfile(null)
    }
  }, [])

  const refreshProfile = useCallback(async () => {
    await loadProfile(auth.currentUser)
  }, [loadProfile])

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (next) => {
      setUser(next)
      void loadProfile(next).finally(() => setLoading(false))
    })
    // A popup sign-in can land back on a redirect flow — resolve it once.
    void getRedirectResult(auth).catch(() => undefined)
    return unsub
  }, [loadProfile])

  const signInWithGoogle = useCallback(async () => {
    try {
      await signInWithPopup(auth, googleProvider)
    } catch (err) {
      // Popup blocked → fall back to the redirect flow.
      if ((err as { code?: string }).code === 'auth/popup-blocked') {
        await signInWithRedirect(auth, googleProvider)
        return
      }
      throw err
    }
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
    setProfile(null)
  }, [])

  const getIdToken = useCallback(async () => {
    return auth.currentUser ? auth.currentUser.getIdToken() : null
  }, [])

  const session = toSession(user)

  const value = useMemo<SessionValue>(
    () => ({
      session,
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      signInWithGoogle,
      signOut,
      refreshProfile,
      getIdToken
    }),
    [session, profile, loading, signInWithGoogle, signOut, refreshProfile, getIdToken]
  )

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>
}

export function useSession(): SessionValue {
  const ctx = useContext(SessionContext)
  if (!ctx) throw new Error('useSession must be used inside SessionProvider')
  return ctx
}
