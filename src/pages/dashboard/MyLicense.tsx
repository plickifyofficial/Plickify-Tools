import { useCallback, useEffect, useState } from 'react'
import { list, newest, where } from '../../lib/db'
import { copyText, formatDate } from '../../lib/format'
import type { License, LicenseDevice } from '../../lib/types'
import { Badge, EmptyState, PageTitle, Spinner } from '../../components/ui'
import { useSession } from '../../hooks/useSession'

export function MyLicense(): JSX.Element {
  const { session } = useSession()
  const [licenses, setLicenses] = useState<License[]>([])
  const [devices, setDevices] = useState<Record<string, LicenseDevice[]>>({})
  const [loading, setLoading] = useState(true)
  const [copiedId, setCopiedId] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    try {
      const [licRows, devRows] = await Promise.all([
        list<License>('licenses', where('user_id', '==', session.user.id)),
        list<LicenseDevice>('license_devices', where('user_id', '==', session.user.id))
      ])
      setLicenses(newest(licRows))
      const map: Record<string, LicenseDevice[]> = {}
      for (const d of devRows) (map[d.license_id] ??= []).push(d)
      setDevices(map)
    } catch (err) {
      console.error('license load failed', err)
    }
    setLoading(false)
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  async function copy(license: License): Promise<void> {
    const ok = await copyText(license.key)
    setCopiedId(ok ? license.id : null)
    setTimeout(() => setCopiedId(null), 2000)
  }

  if (loading) return <Spinner label="Loading licenses…" />

  return (
    <div>
      <PageTitle
        title="My License"
        subtitle="Paste the key into your app once — it stays activated until you revoke it."
      />

      <div className="card mb-6 border-brand-100 bg-brand-50/50 p-5">
        <h2 className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <i className="fa-solid fa-circle-question text-brand-600" aria-hidden="true" />
          How to activate
        </h2>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-600">
          <li>Open the app (e.g. Firefox Automation Manager) on your device.</li>
          <li>Paste your license key on the activation screen.</li>
          <li>Done — the app verifies online and remembers your device.</li>
          <li>Moving to a new PC? Press “Deactivate” in the app’s Settings first.</li>
        </ol>
      </div>

      {licenses.length === 0 ? (
        <EmptyState
          title="No licenses yet"
          detail="Licenses are issued when you buy a licensed tool. Contact support if you expect one."
        />
      ) : (
        <div className="space-y-6">
          {licenses.map((l) => (
            <div key={l.id} className="card p-6">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-slate-900">{l.label}</h3>
                    <Badge tone={l.status === 'active' ? 'green' : 'red'}>
                      {l.status === 'active' ? 'Active' : 'Revoked'}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">
                    Issued {formatDate(l.created_at)} · {l.max_devices} device{l.max_devices > 1 ? 's' : ''} allowed
                    {l.expires_at ? ` · expires ${formatDate(l.expires_at)}` : ''}
                  </p>
                </div>
              </div>

              <div className="mt-4 flex items-center gap-3 rounded-xl bg-slate-900 px-4 py-3">
                <code className="flex-1 overflow-x-auto whitespace-nowrap font-mono text-sm text-emerald-400">
                  {l.key}
                </code>
                <button
                  className="btn bg-white/10 text-white hover:bg-white/20"
                  onClick={() => void copy(l)}
                  disabled={l.status !== 'active'}
                >
                  <i className={copiedId === l.id ? 'fa-solid fa-check' : 'fa-solid fa-copy'} aria-hidden="true" />
                  {copiedId === l.id ? 'Copied' : 'Copy'}
                </button>
              </div>

              <div className="mt-4">
                <h4 className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  <i className="fa-solid fa-desktop mr-1.5" aria-hidden="true" />
                  Activated devices ({(devices[l.id] ?? []).filter((d) => !d.revoked).length}/{l.max_devices})
                </h4>
                {(devices[l.id] ?? []).length === 0 ? (
                  <p className="mt-2 text-sm text-slate-400">
                    No device activated yet — open the app and paste this key.
                  </p>
                ) : (
                  <div className="mt-2 space-y-2">
                    {(devices[l.id] ?? []).map((d) => (
                      <div
                        key={d.id}
                        className="flex items-center justify-between rounded-xl border border-slate-100 px-4 py-2.5 text-sm"
                      >
                        <div className="font-mono text-slate-700">
                          <i className="fa-solid fa-desktop mr-1.5 text-slate-400" aria-hidden="true" />
                          {d.device_id.replace(/^dev_/, '').slice(0, 16)}…
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-slate-400">seen {formatDate(d.last_seen_at)}</span>
                          <Badge tone={d.revoked ? 'red' : 'green'}>{d.revoked ? 'Revoked' : 'Online'}</Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
