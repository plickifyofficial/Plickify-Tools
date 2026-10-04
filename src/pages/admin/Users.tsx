import { useCallback, useEffect, useState } from 'react'
import { list, newest, update } from '../../lib/db'
import { formatDate } from '../../lib/format'
import type { Profile, Role } from '../../lib/types'
import { Badge, PageTitle, Spinner } from '../../components/ui'

const ROLE_TONE: Record<Role, 'brand' | 'green' | 'slate'> = {
  admin: 'brand',
  staff: 'green',
  user: 'slate'
}

export function AdminUsers(): JSX.Element {
  const [users, setUsers] = useState<Profile[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const rows = await list<Profile>('profiles')
      setUsers(newest(rows).slice(0, 500))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load users.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function setRole(id: string, role: Role): Promise<void> {
    if (!window.confirm(`Set role of this user to "${role}"?`)) return
    setBusyId(id)
    setError(null)
    try {
      await update('profiles', id, { role })
    } catch (err) {
      setBusyId(null)
      setError(err instanceof Error ? err.message : 'Update failed.')
      return
    }
    setBusyId(null)
    setUsers((prev) => prev.map((u) => (u.id === id ? { ...u, role } : u)))
  }

  const filtered = users.filter((u) => {
    const q = search.trim().toLowerCase()
    if (!q) return true
    return u.email.toLowerCase().includes(q) || (u.full_name ?? '').toLowerCase().includes(q)
  })

  if (loading) return <Spinner label="Loading users…" />

  return (
    <div>
      <PageTitle title="Users" subtitle="Everyone who signed in — and who runs the show." />

      <div className="relative mb-4 max-w-md">
        <i
          className="fa-solid fa-magnifying-glass pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-sm text-slate-400"
          aria-hidden="true"
        />
        <input
          className="input pl-10"
          placeholder="Search by name or email…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {error && (
        <div className="mb-4 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600" role="alert">
          {error}
        </div>
      )}

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[680px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3.5">User</th>
              <th className="px-5 py-3.5">Role</th>
              <th className="px-5 py-3.5">Joined</th>
              <th className="px-5 py-3.5">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {filtered.map((u) => (
              <tr key={u.id} className="hover:bg-slate-50/60">
                <td className="px-5 py-3.5">
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-brand-500 to-violet-500 text-sm font-extrabold text-white">
                      {(u.full_name || u.email).charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <div className="font-semibold text-slate-800">{u.full_name || '—'}</div>
                      <div className="text-xs text-slate-400">{u.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-5 py-3.5">
                  <Badge tone={ROLE_TONE[u.role]}>{u.role}</Badge>
                </td>
                <td className="px-5 py-3.5 text-slate-500">{formatDate(u.created_at)}</td>
                <td className="px-5 py-3.5">
                  <select
                    className="input py-1.5 text-xs"
                    value={u.role}
                    disabled={busyId === u.id}
                    onChange={(e) => void setRole(u.id, e.target.value as Role)}
                  >
                    <option value="user">user</option>
                    <option value="staff">staff</option>
                    <option value="admin">admin</option>
                  </select>
                </td>
              </tr>
            ))}
            {filtered.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={4}>
                  No users match “{search}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <p className="mt-4 text-xs text-slate-400">
        Only admins can access this panel (enforced by Firestore security rules). Promote yourself from the Firebase
        console if you locked yourself out.
      </p>
    </div>
  )
}
