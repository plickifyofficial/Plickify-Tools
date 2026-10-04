import { useCallback, useEffect, useState } from 'react'
import { first, insert, list, newest, nowIso, remove, update, where } from '../../lib/db'
import { copyText, formatDate, randomLicenseKey } from '../../lib/format'
import type { License, LicenseDevice, Product } from '../../lib/types'
import { Badge, PageTitle, Spinner } from '../../components/ui'

export function AdminLicenses(): JSX.Element {
  const [licenses, setLicenses] = useState<License[]>([])
  const [devices, setDevices] = useState<Record<string, LicenseDevice[]>>({})
  const [products, setProducts] = useState<Product[]>([])
  const [users, setUsers] = useState<Record<string, { email: string; full_name: string | null }>>({})
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copiedId, setCopiedId] = useState<string | null>(null)
  const [form, setForm] = useState({ user_email: '', product_id: '', label: '', max_devices: '2' })

  const load = useCallback(async () => {
    try {
      const [licRows, prodRows, userRows, devRows] = await Promise.all([
        list<License>('licenses'),
        list<Product>('products'),
        list<{ id: string; email: string; full_name: string | null }>('profiles'),
        list<LicenseDevice>('license_devices')
      ])
      setLicenses(newest(licRows).slice(0, 300))
      setProducts([...prodRows].sort((a, b) => a.name.localeCompare(b.name)))
      const deviceMap: Record<string, LicenseDevice[]> = {}
      for (const d of devRows) (deviceMap[d.license_id] ??= []).push(d)
      setDevices(deviceMap)
      const userMap: Record<string, { email: string; full_name: string | null }> = {}
      for (const u of userRows) userMap[u.id] = { email: u.email, full_name: u.full_name }
      setUsers(userMap)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load licenses.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function createLicense(): Promise<void> {
    const email = form.user_email.trim().toLowerCase()
    if (!email) {
      setError('Enter the buyer’s email.')
      return
    }
    const user = Object.entries(users).find(([, u]) => u.email.toLowerCase() === email)
    if (!user) {
      setError(`No user with email ${email} — they must login first.`)
      return
    }
    setCreating(true)
    setError(null)
    try {
      // Key generated client-side; loop until it is unique (chance ≈ 0).
      let key = randomLicenseKey('PFT')
      for (let attempt = 0; attempt < 5; attempt++) {
        const clash = await first<License>('licenses', where('key', '==', key))
        if (!clash) break
        key = randomLicenseKey('PFT')
      }
      await insert('licenses', {
        user_id: user[0],
        product_id: form.product_id || null,
        label: form.label.trim() || 'License',
        key,
        max_devices: Math.max(1, Number(form.max_devices) || 2),
        status: 'active',
        expires_at: null,
        created_at: nowIso()
      })
      setForm({ user_email: '', product_id: '', label: '', max_devices: '2' })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not create the license.')
    }
    setCreating(false)
  }

  async function setStatus(license: License, status: 'active' | 'revoked'): Promise<void> {
    const action = status === 'revoked' ? 'Revoke' : 'Reactivate'
    if (!window.confirm(`${action} "${license.label}"? Devices will ${status === 'revoked' ? 'be blocked' : ' work again'}.`))
      return
    try {
      await update('licenses', license.id, { status })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  async function revokeDevice(device: LicenseDevice): Promise<void> {
    if (!window.confirm(`Revoke this device? (${device.device_id.slice(0, 18)}…)`)) return
    try {
      await update('license_devices', device.id, { revoked: true })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  async function deleteLicense(license: License): Promise<void> {
    if (!window.confirm(`Delete "${license.label}" (${license.key.slice(0, 10)}…)? This cannot be undone.`)) return
    try {
      // Device docs live at `${licenseId}__${deviceId}` for API-created ones,
      // plus any legacy auto-id docs — remove by license_id match.
      const devRows = await list<LicenseDevice>('license_devices', where('license_id', '==', license.id))
      await Promise.all(devRows.map((d) => remove('license_devices', d.id)))
      await remove('licenses', license.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  async function copyKey(license: License): Promise<void> {
    const ok = await copyText(license.key)
    setCopiedId(ok ? license.id : null)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return <Spinner label="Loading licenses…" />

  return (
    <div>
      <PageTitle title="Licenses" subtitle="Issue activation keys and control devices." />

      <div className="card mb-6 p-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <i className="fa-solid fa-key text-brand-600" aria-hidden="true" />
          Issue a new license
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Buyer email *</label>
            <input
              className="input"
              placeholder="buyer@email.com"
              value={form.user_email}
              onChange={(e) => setForm({ ...form, user_email: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Tool</label>
            <select
              className="input"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            >
              <option value="">— General —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Label</label>
            <input
              className="input"
              placeholder="e.g. Firefox Automation Manager"
              value={form.label}
              onChange={(e) => setForm({ ...form, label: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Devices</label>
            <input
              className="input"
              type="number"
              min={1}
              value={form.max_devices}
              onChange={(e) => setForm({ ...form, max_devices: e.target.value })}
            />
          </div>
        </div>
        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
            {error}
          </div>
        )}
        <button className="btn-primary mt-4" onClick={() => void createLicense()} disabled={creating}>
          <i className={creating ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-key'} aria-hidden="true" />
          {creating ? 'Creating…' : 'Create License'}
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[820px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Key</th>
              <th className="px-5 py-3.5">Label</th>
              <th className="px-5 py-3.5">Owner</th>
              <th className="px-5 py-3.5">Devices</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Created</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {licenses.map((l) => {
              const devs = devices[l.id] ?? []
              const active = devs.filter((d) => !d.revoked)
              return (
                <tr key={l.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-xs text-slate-600">{l.key.slice(0, 18)}…</code>
                      <button
                        className="text-xs font-semibold text-brand-600 hover:underline"
                        onClick={() => void copyKey(l)}
                      >
                        <i className={copiedId === l.id ? 'fa-solid fa-check' : 'fa-solid fa-copy'} aria-hidden="true" />
                        {copiedId === l.id ? 'Copied' : 'Copy'}
                      </button>
                    </div>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{l.label}</td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs text-slate-500">{users[l.user_id]?.full_name ?? '—'}</div>
                    <div className="text-xs text-slate-400">{users[l.user_id]?.email}</div>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="text-xs font-bold text-slate-700">
                      {active.length}/{l.max_devices}
                    </div>
                    {devs.length > 0 && (
                      <details className="mt-1">
                        <summary className="cursor-pointer text-[11px] font-semibold text-brand-600">
                          View devices
                        </summary>
                        <div className="mt-1 space-y-1">
                          {devs.map((d) => (
                            <div
                              key={d.id}
                              className="flex items-center justify-between gap-2 rounded bg-slate-50 px-2 py-1 text-[10px]"
                            >
                              <span className="truncate font-mono">{d.device_id.replace(/^dev_/, '').slice(0, 12)}…</span>
                              <button
                                className="font-bold text-red-500 hover:underline"
                                disabled={d.revoked}
                                onClick={() => void revokeDevice(d)}
                              >
                                {d.revoked ? 'Revoked' : 'Revoke'}
                              </button>
                            </div>
                          ))}
                        </div>
                      </details>
                    )}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={l.status === 'active' ? 'green' : 'red'}>{l.status}</Badge>
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">{formatDate(l.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        className={l.status === 'active' ? 'btn-danger px-3 py-1.5 text-xs' : 'btn-primary px-3 py-1.5 text-xs'}
                        onClick={() => void setStatus(l, l.status === 'active' ? 'revoked' : 'active')}
                      >
                        <i
                          className={l.status === 'active' ? 'fa-solid fa-ban' : 'fa-solid fa-rotate-left'}
                          aria-hidden="true"
                        />
                        {l.status === 'active' ? 'Revoke' : 'Restore'}
                      </button>
                      <button
                        className="btn-danger px-3 py-1.5 text-xs"
                        onClick={() => void deleteLicense(l)}
                        title="Delete license permanently"
                      >
                        <i className="fa-solid fa-trash" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {licenses.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={7}>
                  No licenses issued yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
