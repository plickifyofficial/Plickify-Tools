import { useCallback, useEffect, useState } from 'react'
import { list, newest, nowIso, put, remove, update } from '../../lib/db'
import { formatDate, taka } from '../../lib/format'
import type { Coupon } from '../../lib/types'
import { Badge, PageTitle, Spinner } from '../../components/ui'

interface CouponForm {
  code: string
  type: 'percent' | 'fixed'
  value: string
  max_uses: string
  expires_at: string
  active: boolean
}

const EMPTY: CouponForm = { code: '', type: 'percent', value: '', max_uses: '0', expires_at: '', active: true }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomCouponCode(): string {
  const bytes = new Uint8Array(12)
  crypto.getRandomValues(bytes)
  const groups: string[] = []
  for (let g = 0; g < 3; g++) {
    let s = ''
    for (let i = 0; i < 4; i++) s += ALPHABET[bytes[g * 4 + i] % ALPHABET.length]
    groups.push(s)
  }
  return groups.join('-')
}

function statusOf(c: Coupon): { tone: 'green' | 'amber' | 'red'; label: string } {
  if (!c.active) return { tone: 'red', label: 'disabled' }
  if (c.expires_at && Date.parse(c.expires_at) < Date.now()) return { tone: 'amber', label: 'expired' }
  if (c.max_uses > 0 && c.used_count >= c.max_uses) return { tone: 'amber', label: 'used up' }
  return { tone: 'green', label: 'active' }
}

export function AdminCoupons(): JSX.Element {
  const [coupons, setCoupons] = useState<Coupon[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<CouponForm>(EMPTY)
  const [editing, setEditing] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      setCoupons(newest(await list<Coupon>('coupons')))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load coupons.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(): Promise<void> {
    const code = form.code.trim().toUpperCase().replace(/\s+/g, '')
    if (!/^[A-Z0-9-]{3,32}$/.test(code)) {
      setError('Code: 3–32 letters/numbers/dashes (e.g. SAVE50 or GIFT-ABCD-2345).')
      return
    }
    const value = Number(form.value)
    if (!Number.isFinite(value) || value <= 0) {
      setError('Discount value must be above 0.')
      return
    }
    if (form.type === 'percent' && value > 100) {
      setError('Percent discount cannot exceed 100.')
      return
    }
    const maxUses = Math.max(0, Math.floor(Number(form.max_uses) || 0))

    const clash = coupons.find((c) => c.id === code && editing !== code)
    if (clash && !window.confirm(`Coupon ${code} already exists — overwrite it?`)) return

    setBusy(true)
    setError(null)
    try {
      const existing = coupons.find((c) => c.id === (editing ?? code))
      const expiresAt = form.expires_at ? new Date(`${form.expires_at}T23:59:59+06:00`).toISOString() : null
      if (editing && editing !== code) await remove('coupons', editing)
      await put('coupons', code, {
        code,
        type: form.type,
        value,
        max_uses: maxUses,
        used_count: clash ? clash.used_count : existing?.used_count ?? 0,
        expires_at: expiresAt,
        active: form.active,
        created_at: clash ? clash.created_at : existing?.created_at ?? nowIso()
      })
      setForm(EMPTY)
      setEditing(null)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the coupon.')
    }
    setBusy(false)
  }

  function edit(c: Coupon): void {
    setForm({
      code: c.id,
      type: c.type,
      value: String(c.value),
      max_uses: String(c.max_uses),
      expires_at: c.expires_at ? c.expires_at.slice(0, 10) : '',
      active: c.active
    })
    setEditing(c.id)
    setError(null)
  }

  async function toggle(c: Coupon): Promise<void> {
    try {
      await update('coupons', c.id, { active: !c.active })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  async function del(c: Coupon): Promise<void> {
    if (!window.confirm(`Delete coupon ${c.id}? Existing orders keep their discount.`)) return
    try {
      await remove('coupons', c.id)
      if (editing === c.id) {
        setForm(EMPTY)
        setEditing(null)
      }
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  if (loading) return <Spinner label="Loading coupons…" />

  return (
    <div>
      <PageTitle title="Coupons" subtitle="Discount codes — checkout-e apply korle price komay." />

      <div className="card mb-6 p-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <i className={`fa-solid ${editing ? 'fa-pen' : 'fa-plus'} text-brand-600`} aria-hidden="true" />
          {editing ? `Edit coupon — ${editing}` : 'Create a coupon'}
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-5">
          <div>
            <label className="label">Code *</label>
            <div className="flex gap-2">
              <input
                className="input font-mono uppercase"
                placeholder="SAVE50"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              <button
                className="btn-secondary shrink-0 px-3"
                title="Generate a random code"
                onClick={() => setForm({ ...form, code: randomCouponCode() })}
                type="button"
              >
                <i className="fa-solid fa-dice" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div>
            <label className="label">Type *</label>
            <select
              className="input"
              value={form.type}
              onChange={(e) => setForm({ ...form, type: e.target.value as CouponForm['type'] })}
            >
              <option value="percent">Percent (%)</option>
              <option value="fixed">Fixed (৳)</option>
            </select>
          </div>
          <div>
            <label className="label">{form.type === 'percent' ? 'Percent *' : 'Amount (৳) *'}</label>
            <input
              className="input"
              type="number"
              min={1}
              max={form.type === 'percent' ? 100 : undefined}
              placeholder={form.type === 'percent' ? '20' : '100'}
              value={form.value}
              onChange={(e) => setForm({ ...form, value: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Max uses (0 = ∞)</label>
            <input
              className="input"
              type="number"
              min={0}
              value={form.max_uses}
              onChange={(e) => setForm({ ...form, max_uses: e.target.value })}
            />
          </div>
          <div>
            <label className="label">Expires (blank = never)</label>
            <input
              className="input"
              type="date"
              value={form.expires_at}
              onChange={(e) => setForm({ ...form, expires_at: e.target.value })}
            />
          </div>
        </div>
        <label className="mt-3 flex cursor-pointer items-center gap-2 text-sm font-semibold text-slate-600">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(e) => setForm({ ...form, active: e.target.checked })}
            className="h-4 w-4 rounded border-slate-300 text-brand-600 focus:ring-brand-500"
          />
          Active (uncheck to disable without deleting)
        </label>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
            {error}
          </div>
        )}

        <div className="mt-4 flex gap-3">
          <button className="btn-primary" onClick={() => void save()} disabled={busy}>
            <i className={busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-circle-check'} aria-hidden="true" />
            {busy ? 'Saving…' : editing ? 'Save changes' : 'Create coupon'}
          </button>
          {editing && (
            <button
              className="btn-secondary"
              onClick={() => {
                setForm(EMPTY)
                setEditing(null)
                setError(null)
              }}
              disabled={busy}
            >
              Cancel edit
            </button>
          )}
        </div>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Code</th>
              <th className="px-5 py-3.5">Discount</th>
              <th className="px-5 py-3.5">Uses</th>
              <th className="px-5 py-3.5">Expires</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {coupons.map((c) => {
              const st = statusOf(c)
              return (
                <tr key={c.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <code className="font-mono text-sm font-bold text-slate-800">{c.id}</code>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-800">
                    {c.type === 'percent' ? `${c.value}%` : taka(c.value)}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {c.used_count} / {c.max_uses === 0 ? '∞' : c.max_uses}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {c.expires_at ? formatDate(c.expires_at) : 'Never'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button className="btn-secondary px-3 py-1.5 text-xs" onClick={() => edit(c)}>
                        <i className="fa-solid fa-pen" aria-hidden="true" />
                        Edit
                      </button>
                      <button
                        className={`px-3 py-1.5 text-xs font-semibold ${
                          c.active ? 'btn-danger' : 'btn bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                        onClick={() => void toggle(c)}
                      >
                        <i className={`fa-solid ${c.active ? 'fa-ban' : 'fa-circle-check'}`} aria-hidden="true" />
                        {c.active ? 'Disable' : 'Enable'}
                      </button>
                      <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => void del(c)}>
                        <i className="fa-solid fa-trash" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {coupons.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                  No coupons yet — create the first one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
