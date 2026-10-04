import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { backendConfigured } from '../lib/firebase'
import { insert, list, newest, nowIso, where } from '../lib/db'
import { taka } from '../lib/format'
import type { PaymentMethod, Product } from '../lib/types'
import { Badge, Modal, PageTitle, Spinner } from '../components/ui'
import { useSession } from '../hooks/useSession'

export function Tools(): JSX.Element {
  const { session } = useSession()
  const navigate = useNavigate()
  const [products, setProducts] = useState<Product[]>([])
  const [settings, setSettings] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(true)
  const [buying, setBuying] = useState<Product | null>(null)

  const load = useCallback(async () => {
    if (!backendConfigured) {
      setLoading(false)
      return
    }
    try {
      const [productRows, settingRows] = await Promise.all([
        list<Product>('products', where('is_active', '==', true)),
        list<{ key: string; value: string }>('site_settings')
      ])
      setProducts(newest(productRows))
      const map: Record<string, string> = {}
      for (const row of settingRows) map[row.key] = row.value
      setSettings(map)
    } catch (err) {
      console.error('store load failed', err)
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6">
      <PageTitle title="Premium Tools" subtitle="Buy once — download from your dashboard forever." />

      {loading ? (
        <Spinner label="Loading tools…" />
      ) : products.length === 0 ? (
        <div className="card p-10 text-center text-slate-500">
          <i className="fa-solid fa-box-open mb-3 text-4xl text-slate-300" aria-hidden="true" />
          <p>
            {backendConfigured
              ? 'No tools published yet — new releases will appear here.'
              : 'Backend not configured yet (see site/.env.example).'}
          </p>
        </div>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {products.map((p) => (
            <div key={p.id} className="card flex flex-col p-6">
              <div className="flex items-start justify-between">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-600 to-violet-600 text-xl text-white">
                  <i className="fa-solid fa-toolbox" aria-hidden="true" />
                </div>
                <div className="flex gap-2">
                  {p.category && <Badge tone="brand">{p.category}</Badge>}
                  {p.version && <Badge>v{p.version}</Badge>}
                </div>
              </div>
              <h3 className="mt-4 font-bold text-slate-900">{p.name}</h3>
              <p className="mt-1 line-clamp-3 flex-1 text-sm text-slate-500">{p.description}</p>
              <div className="mt-4 flex items-center justify-between">
                <div>
                  {p.original_price && (
                    <span className="mr-2 text-xs text-slate-400 line-through">{taka(p.original_price)}</span>
                  )}
                  <span className="text-xl font-extrabold text-slate-900">{taka(p.price)}</span>
                </div>
                <button
                  className="btn-primary"
                  onClick={() => {
                    if (!session) {
                      navigate('/login')
                      return
                    }
                    setBuying(p)
                  }}
                >
                  <i className="fa-solid fa-cart-plus" aria-hidden="true" />
                  Buy Now
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <BuyModal
        product={buying}
        settings={settings}
        onClose={() => setBuying(null)}
        onOrdered={() => {
          setBuying(null)
          navigate('/dashboard/orders')
        }}
      />
    </div>
  )
}

function BuyModal({
  product,
  settings,
  onClose,
  onOrdered
}: {
  product: Product | null
  settings: Record<string, string>
  onClose: () => void
  onOrdered: () => void
}): JSX.Element | null {
  const { session } = useSession()
  const [method, setMethod] = useState<PaymentMethod>('bkash')
  const [trxId, setTrxId] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!product) return null

  const number = method === 'bkash' ? settings['bkash_number'] : settings['nagad_number']

  async function submit(): Promise<void> {
    if (!session || !product) return
    if (trxId.trim().length < 6) {
      setError('Enter the TrxID from your payment confirmation SMS.')
      return
    }
    setBusy(true)
    setError(null)
    try {
      await insert('orders', {
        user_id: session.user.id,
        product_id: product.id,
        product_name: product.name,
        amount: product.price,
        method,
        trx_id: trxId.trim(),
        status: 'pending',
        created_at: nowIso()
      })
    } catch (err) {
      setBusy(false)
      setError(err instanceof Error ? err.message : 'Could not submit the order.')
      return
    }
    setBusy(false)
    setTrxId('')
    onOrdered()
  }

  return (
    <Modal open title={`Buy — ${product.name}`} onClose={onClose}>
      <div className="rounded-xl bg-slate-50 p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="flex items-center gap-2 text-slate-500">
            <i className="fa-solid fa-tags text-brand-500" aria-hidden="true" />
            Price
          </span>
          <span className="text-lg font-extrabold text-slate-900">{taka(product.price)}</span>
        </div>
      </div>

      <div className="mt-5">
        <span className="label">
          <i className="fa-solid fa-wallet mr-1" aria-hidden="true" />
          Pay with
        </span>
        <div className="grid grid-cols-2 gap-3">
          <button
            className={`rounded-xl border px-4 py-3 text-sm font-bold ${
              method === 'bkash'
                ? 'border-pink-500 bg-pink-50 text-pink-700'
                : 'border-slate-200 text-slate-600'
            }`}
            onClick={() => setMethod('bkash')}
          >
            <i className="fa-solid fa-mobile-screen-button mr-1.5" aria-hidden="true" />
            bKash
          </button>
          <button
            className={`rounded-xl border px-4 py-3 text-sm font-bold ${
              method === 'nagad'
                ? 'border-orange-500 bg-orange-50 text-orange-700'
                : 'border-slate-200 text-slate-600'
            }`}
            onClick={() => setMethod('nagad')}
          >
            <i className="fa-solid fa-mobile-screen-button mr-1.5" aria-hidden="true" />
            Nagad
          </button>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-dashed border-slate-300 p-4 text-sm">
        <div className="flex justify-between py-1">
          <span className="text-slate-500">Send Money to</span>
          <span className="font-bold text-slate-900">{number || '— (number not configured)'}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500">Amount</span>
          <span className="font-bold text-slate-900">{taka(product.price)}</span>
        </div>
        <div className="flex justify-between py-1">
          <span className="text-slate-500">Reference</span>
          <span className="font-bold text-slate-900">Your email</span>
        </div>
        <p className="mt-2 text-xs text-slate-400">
          <i className="fa-solid fa-circle-info mr-1" aria-hidden="true" />
          Use “Send Money” (not Payment). Approval usually takes 5–30 minutes.
        </p>
      </div>

      <div className="mt-4">
        <label className="label" htmlFor="trx-id">
          <i className="fa-solid fa-receipt mr-1" aria-hidden="true" />
          TrxID
        </label>
        <input
          id="trx-id"
          className="input font-mono"
          placeholder="e.g. 9F7A2K1XYZ"
          value={trxId}
          onChange={(e) => setTrxId(e.target.value)}
        />
      </div>

      {error && (
        <div className="mt-3 rounded-xl bg-red-50 px-3 py-2.5 text-sm text-red-600" role="alert">
          <i className="fa-solid fa-triangle-exclamation mr-1.5" aria-hidden="true" />
          {error}
        </div>
      )}

      <div className="mt-5 flex justify-end gap-3">
        <button className="btn-secondary" onClick={onClose} disabled={busy}>
          Cancel
        </button>
        <button className="btn-primary" onClick={() => void submit()} disabled={busy}>
          <i className={busy ? 'fa-solid fa-spinner fa-spin' : 'fa-solid fa-circle-check'} aria-hidden="true" />
          {busy ? 'Submitting…' : 'I have paid — Submit'}
        </button>
      </div>
    </Modal>
  )
}
