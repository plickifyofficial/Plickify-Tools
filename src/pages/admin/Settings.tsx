import { useCallback, useEffect, useState } from 'react'
import { backendConfigured } from '../../lib/firebase'
import { list, put } from '../../lib/db'
import { PageTitle, Spinner } from '../../components/ui'

interface SettingField {
  key: string
  label: string
  hint?: string
  placeholder?: string
  multiline?: boolean
}

const FIELDS: SettingField[] = [
  { key: 'bkash_number', label: 'bKash number', placeholder: '01XXXXXXXXX' },
  { key: 'nagad_number', label: 'Nagad number', placeholder: '01XXXXXXXXX' },
  { key: 'payment_note', label: 'Payment note', hint: 'Shown under the payment instructions', multiline: true },
  { key: 'support_email', label: 'Support email', placeholder: 'support@example.com' },
  { key: 'support_whatsapp', label: 'Support WhatsApp', placeholder: '01XXXXXXXXX' },
  { key: 'announcement', label: 'Announcement banner', hint: 'Leave empty to hide', multiline: true }
]

export function AdminSettings(): JSX.Element {
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    if (!backendConfigured) {
      setLoading(false)
      return
    }
    try {
      const rows = await list<{ key: string; value: string }>('site_settings')
      const map: Record<string, string> = {}
      for (const row of rows) map[row.key] = row.value
      setValues(map)
    } catch (err) {
      console.error('settings load failed', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(): Promise<void> {
    setSaving(true)
    setSaved(false)
    setError(null)
    try {
      // One doc per key (doc id = key).
      await Promise.all(FIELDS.map((f) => put('site_settings', f.key, { key: f.key, value: values[f.key] ?? '' })))
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save settings.')
    }
    setSaving(false)
  }

  if (loading) return <Spinner label="Loading settings…" />

  return (
    <div>
      <PageTitle title="Site Settings" subtitle="Payment numbers, support info and banners." />

      <div className="card max-w-2xl p-6">
        <div className="space-y-5">
          {FIELDS.map((f) => (
            <div key={f.key}>
              <label className="label">{f.label}</label>
              {f.multiline ? (
                <textarea
                  className="input min-h-[80px]"
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              ) : (
                <input
                  className="input"
                  placeholder={f.placeholder}
                  value={values[f.key] ?? ''}
                  onChange={(e) => setValues({ ...values, [f.key]: e.target.value })}
                />
              )}
              {f.hint && <p className="mt-1 text-xs text-slate-400">{f.hint}</p>}
            </div>
          ))}
        </div>

        {error && (
          <div className="mt-4 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
            {error}
          </div>
        )}

        <div className="mt-6 flex items-center gap-4">
          <button className="btn-primary" onClick={() => void save()} disabled={saving}>
            <i className={saving ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-floppy-disk'} aria-hidden="true" />
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
          {saved && (
            <span className="text-sm font-semibold text-emerald-600">
              <i className="fa-solid fa-circle-check mr-1" aria-hidden="true" />
              Saved
            </span>
          )}
        </div>
      </div>

      <div className="card mt-6 max-w-2xl border-slate-100 p-6">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <i className="fa-solid fa-money-bill-transfer text-brand-600" aria-hidden="true" />
          Payment flow reminder
        </h2>
        <ol className="mt-2 list-inside list-decimal space-y-1 text-sm text-slate-600">
          <li>Buyer pays via bKash/Nagad “Send Money” to your number above.</li>
          <li>They submit the TrxID on the Buy modal → order status “pending”.</li>
          <li>You verify the TrxID in <strong>Admin → Orders</strong> → Approve.</li>
          <li>Download unlocks on their dashboard; issue a license from <strong>Licenses</strong> if needed.</li>
        </ol>
      </div>
    </div>
  )
}
