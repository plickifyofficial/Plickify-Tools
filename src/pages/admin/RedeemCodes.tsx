import { useCallback, useEffect, useState } from 'react'
import { list, newest, nowIso, put, remove, update } from '../../lib/db'
import { formatDate } from '../../lib/format'
import type { Product, RedeemCode } from '../../lib/types'
import { Badge, PageTitle, Spinner } from '../../components/ui'

interface RedeemForm {
  code: string
  product_id: string
  max_uses: string
  expires_at: string
  active: boolean
}

const EMPTY: RedeemForm = { code: '', product_id: '', max_uses: '1', expires_at: '', active: true }

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'

function randomRedeemCode(): string {
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

function statusOf(r: RedeemCode): { tone: 'green' | 'amber' | 'red'; label: string } {
  if (!r.active) return { tone: 'red', label: 'revoked' }
  if (r.expires_at && Date.parse(r.expires_at) < Date.now()) return { tone: 'amber', label: 'expired' }
  if (r.max_uses > 0 && r.used_count >= r.max_uses) return { tone: 'amber', label: 'used up' }
  return { tone: 'green', label: 'active' }
}

export function AdminRedeemCodes(): JSX.Element {
  const [codes, setCodes] = useState<RedeemCode[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [form, setForm] = useState<RedeemForm>(EMPTY)

  const load = useCallback(async () => {
    try {
      const [codeRows, productRows] = await Promise.all([
        list<RedeemCode>('redeem_codes'),
        list<Product>('products')
      ])
      setCodes(newest(codeRows))
      setProducts([...productRows].sort((a, b) => a.name.localeCompare(b.name)))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not load redeem codes.')
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  async function save(): Promise<void> {
    const code = form.code.trim().toUpperCase().replace(/\s+/g, '')
    if (!/^[A-Z0-9-]{3,32}$/.test(code)) {
      setError('Code: 3–32 letters/numbers/dashes (e.g. GIFT-ABCD-2345).')
      return
    }
    if (!form.product_id) {
      setError('Choose which tool this code unlocks.')
      return
    }
    const product = products.find((p) => p.id === form.product_id)
    if (!product) {
      setError('Selected tool no longer exists.')
      return
    }
    const maxUses = Math.max(1, Math.floor(Number(form.max_uses) || 1))

    const clash = codes.find((c) => c.id === code)
    if (clash && !window.confirm(`Code ${code} already exists — overwrite it? Its use count is kept.`)) return

    setBusy(true)
    setError(null)
    try {
      const expiresAt = form.expires_at ? new Date(`${form.expires_at}T23:59:59+06:00`).toISOString() : null
      await put('redeem_codes', code, {
        code,
        product_id: product.id,
        product_name: product.name,
        max_uses: maxUses,
        used_count: clash?.used_count ?? 0,
        expires_at: expiresAt,
        active: form.active,
        created_at: clash?.created_at ?? nowIso()
      })
      setForm(EMPTY)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the code.')
    }
    setBusy(false)
  }

  async function toggle(r: RedeemCode): Promise<void> {
    try {
      await update('redeem_codes', r.id, { active: !r.active })
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Update failed.')
    }
  }

  async function del(r: RedeemCode): Promise<void> {
    if (!window.confirm(`Delete redeem code ${r.id}? Licenses already issued stay.`)) return
    try {
      await remove('redeem_codes', r.id)
      await load()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Delete failed.')
    }
  }

  if (loading) return <Spinner label="Loading redeem codes…" />

  return (
    <div>
      <PageTitle title="Redeem Codes" subtitle="Free-access codes — user paste korlei license turanto issue hoy." />

      <div className="card mb-6 p-5">
        <h2 className="flex items-center gap-2 font-bold text-slate-900">
          <i className="fa-solid fa-gift text-brand-600" aria-hidden="true" />
          Generate a redeem code
        </h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-5">
          <div>
            <label className="label">Code *</label>
            <div className="flex gap-2">
              <input
                className="input font-mono uppercase"
                placeholder="GIFT-ABCD-2345"
                value={form.code}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
              />
              <button
                className="btn-secondary shrink-0 px-3"
                title="Generate a random code"
                onClick={() => setForm({ ...form, code: randomRedeemCode() })}
                type="button"
              >
                <i className="fa-solid fa-dice" aria-hidden="true" />
              </button>
            </div>
          </div>
          <div className="sm:col-span-2">
            <label className="label">Tool *</label>
            <select
              className="input"
              value={form.product_id}
              onChange={(e) => setForm({ ...form, product_id: e.target.value })}
            >
              <option value="">— choose a tool —</option>
              {products.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Max uses</label>
            <input
              className="input"
              type="number"
              min={1}
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
          Active (uncheck to revoke the code)
        </label>

        {error && (
          <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
            {error}
          </div>
        )}

        <button className="btn-primary mt-4" onClick={() => void save()} disabled={busy}>
          <i className={busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-gift'} aria-hidden="true" />
          {busy ? 'Saving…' : 'Create code'}
        </button>
      </div>

      <div className="card overflow-x-auto">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="border-b border-slate-100 bg-slate-50/60 text-xs uppercase tracking-wide text-slate-500">
            <tr>
              <th className="px-5 py-3.5">Code</th>
              <th className="px-5 py-3.5">Tool</th>
              <th className="px-5 py-3.5">Uses</th>
              <th className="px-5 py-3.5">Expires</th>
              <th className="px-5 py-3.5">Status</th>
              <th className="px-5 py-3.5">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {codes.map((r) => {
              const st = statusOf(r)
              return (
                <tr key={r.id} className="hover:bg-slate-50/60">
                  <td className="px-5 py-3.5">
                    <code className="font-mono text-sm font-bold text-slate-800">{r.id}</code>
                  </td>
                  <td className="px-5 py-3.5 font-semibold text-slate-800">{r.product_name ?? r.product_id}</td>
                  <td className="px-5 py-3.5 text-slate-600">
                    {r.used_count} / {r.max_uses === 0 ? '∞' : r.max_uses}
                  </td>
                  <td className="px-5 py-3.5 text-slate-500">
                    {r.expires_at ? formatDate(r.expires_at) : 'Never'}
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={st.tone}>{st.label}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex gap-2">
                      <button
                        className={`px-3 py-1.5 text-xs font-semibold ${
                          r.active ? 'btn-danger' : 'btn bg-emerald-600 text-white hover:bg-emerald-700'
                        }`}
                        onClick={() => void toggle(r)}
                      >
                        <i className={`fa-solid ${r.active ? 'fa-ban' : 'fa-circle-check'}`} aria-hidden="true" />
                        {r.active ? 'Revoke' : 'Restore'}
                      </button>
                      <button className="btn-danger px-3 py-1.5 text-xs" onClick={() => void del(r)}>
                        <i className="fa-solid fa-trash" aria-hidden="true" />
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
            {codes.length === 0 && (
              <tr>
                <td className="px-5 py-8 text-center text-slate-400" colSpan={6}>
                  No redeem codes yet — generate one above.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
